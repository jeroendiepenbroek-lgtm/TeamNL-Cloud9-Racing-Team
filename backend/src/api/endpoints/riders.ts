/**
 * Endpoint 2: Riders - GET /api/riders
 */

import { Request, Response, Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
import { syncService } from '../../services/sync.service.js';

const router = Router();

// GET /api/riders - Haal alle riders op (optioneel gefilterd op club)
router.get('/', async (req: Request, res: Response) => {
  try {
    const clubId = req.query.clubId ? parseInt(req.query.clubId as string) : undefined;
    const riders = await supabase.getRiders(clubId);
    
    res.json({
      count: riders.length,
      riders,
    });
  } catch (error) {
    console.error('Error fetching riders:', error);
    res.status(500).json({ error: 'Fout bij ophalen riders' });
  }
});

// ============================================================================
// TEAM MANAGEMENT - My Team (via view_my_team VIEW)
// ============================================================================
// IMPORTANT: These routes must be BEFORE /:zwiftId to avoid conflicts!

// GET /api/riders/team - Haal "Mijn Team" riders op via VIEW
router.get('/team', async (req: Request, res: Response) => {
  try {
    // Query via view_my_team (combineert my_team_members + riders + clubs)
    const riders = await supabase.getMyTeamMembers();
    
    // Extract unique clubs (automatisch uit riders.club_id)
    const uniqueClubs = [...new Set(
      riders
        .map(r => r.club_name)
        .filter(Boolean)
    )];
    
    res.json(riders);
  } catch (error) {
    console.error('Error fetching my team riders:', error);
    res.status(500).json({ error: 'Fout bij ophalen team riders' });
  }
});

// POST /api/riders/sync - Sync riders vanaf ZwiftRacing API
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const clubId = req.body.clubId || 11818;
    const riders = await syncService.syncRiders(clubId);
    
    res.json({
      success: true,
      count: riders.length,
      riders,
    });
  } catch (error) {
    console.error('Error syncing riders:', error);
    res.status(500).json({ error: 'Fout bij synchroniseren riders' });
  }
});

// GET /api/riders/:zwiftId - Haal specifieke rider op
// IMPORTANT: This must be AFTER all specific routes (/team, /sync, etc.)
router.get('/:zwiftId', async (req: Request, res: Response) => {
  try {
    const zwiftId = parseInt(req.params.zwiftId);
    const rider = await supabase.getRider(zwiftId);
    
    if (!rider) {
      return res.status(404).json({ error: 'Rider niet gevonden' });
    }
    
    res.json(rider);
  } catch (error) {
    console.error('Error fetching rider:', error);
    res.status(500).json({ error: 'Fout bij ophalen rider' });
  }
});

// POST /api/riders/team - Voeg rider toe aan "Mijn Team" met automatische sync (US7)
router.post('/team', async (req: Request, res: Response) => {
  try {
    const { zwiftId, name } = req.body;
    
    if (!zwiftId) {
      return res.status(400).json({ 
        error: 'zwiftId is verplicht',
        example: { zwiftId: 150437, name: 'John Doe (optioneel)' }
      });
    }
    
    // Check of rider al in team zit
    const existing = await supabase.getMyTeamMembers();
    if (existing.some(m => m.zwift_id === zwiftId)) {
      return res.status(409).json({ error: 'Rider zit al in jouw team' });
    }
    
    // US7: Probeer eerst data op te halen van ZwiftRacing API
    let rider = await supabase.getRider(zwiftId);
    let syncedFromApi = false;
    
    if (!rider) {
      try {
        console.log(`[Add Rider] Syncing rider ${zwiftId} from ZwiftRacing API...`);
        const { zwiftClient } = await import('../zwift-client.js');
        const zwiftData = await zwiftClient.getRider(zwiftId);
        
        // Upsert met verse API data
        // NOTE: watts_per_kg is GENERATED kolom - database berekent dit automatisch
        const upserted = await supabase.upsertRiders([{
          zwift_id: zwiftData.riderId,
          name: zwiftData.name,
          club_id: zwiftData.club?.id,
          category_racing: zwiftData.category?.racing,
          category_zftp: zwiftData.category?.zFTP,
          ranking: zwiftData.ranking ?? undefined,
          ranking_score: zwiftData.rankingScore,
          ftp: zwiftData.ftp,
          weight: zwiftData.weight,
          // watts_per_kg: VERWIJDERD - generated column!
          country: zwiftData.countryAlpha3,
          gender: zwiftData.gender,
          age: zwiftData.age,
        }]);
        rider = upserted[0];
        syncedFromApi = true;
        console.log(`[Add Rider] ✅ Synced rider data from API`);
      } catch (apiError: any) {
        console.warn(`[Add Rider] ⚠️ API sync failed: ${apiError.message}`);
        
        // Fallback: gebruik manual name als opgegeven
        if (name) {
          const newRiders = await supabase.upsertRiders([{
            zwift_id: zwiftId,
            name,
          }]);
          rider = newRiders[0];
        }
      }
    }
    
    if (!rider) {
      return res.status(400).json({
        error: 'Rider niet gevonden in ZwiftRacing API en geen "name" parameter opgegeven.',
        hint: 'Voeg "name" parameter toe of controleer het zwiftId',
        example: { zwiftId: 150437, name: 'John Doe' }
      });
    }
    
    // Voeg toe aan my_team_members (alleen zwift_id!)
    await supabase.addMyTeamMember(zwiftId);
    
    res.status(201).json({
      success: true,
      message: `${rider.name} toegevoegd aan jouw team`,
      zwiftId,
      synced: syncedFromApi ? '✅ Data synced from ZwiftRacing API' : '⚠️ Using manual/existing data',
    });
  } catch (error) {
    console.error('Error adding rider to team:', error);
    res.status(500).json({ error: 'Fout bij toevoegen rider' });
  }
});

// POST /api/riders/team/bulk - Bulk import riders met ZwiftRacing API sync (US6 + US7)
router.post('/team/bulk', async (req: Request, res: Response) => {
  try {
    const { riders } = req.body;
    
    if (!riders || !Array.isArray(riders)) {
      return res.status(400).json({ 
        error: 'riders array is verplicht',
        example: { 
          riders: [
            { zwiftId: 150437, name: 'John Doe' },
            { zwiftId: 123456 }  // zonder name = moet al bestaan in riders tabel
          ] 
        }
      });
    }
    
    const results = {
      success: 0,
      skipped: 0,
      created: 0,
      synced: 0,
      errors: [] as Array<{ zwiftId: number; error: string }>,
    };
    
    // Haal bestaande team op
    const existingTeam = await supabase.getMyTeamMembers();
    const existingZwiftIds = new Set(existingTeam.map(m => m.zwift_id));
    
    // US6: Collect nieuwe rider IDs voor bulk ZwiftRacing API call
    const newRiderIds: number[] = [];
    const riderInputMap = new Map<number, { zwiftId: number; name?: string }>();
    
    for (const riderInput of riders) {
      const { zwiftId, name } = riderInput;
      
      if (!zwiftId) {
        results.errors.push({ zwiftId: 0, error: 'zwiftId is verplicht' });
        continue;
      }
      
      // Skip als al in team
      if (existingZwiftIds.has(zwiftId)) {
        results.skipped++;
        continue;
      }
      
      newRiderIds.push(zwiftId);
      riderInputMap.set(zwiftId, { zwiftId, name });
    }
    
    // US6 + US7: Bulk fetch van ZwiftRacing API
    // Strategy: POST bulk voor grote imports (1/15min rate)
    //           GET individual voor kleine imports (5/min rate)
    let zwiftRidersData: any[] = [];
    if (newRiderIds.length > 0) {
      const { zwiftClient } = await import('../zwift-client.js');
      
      // Voor grote bulk import: gebruik POST (1/15min rate, max 1000)
      if (newRiderIds.length > 10) {
        try {
          console.log(`[Bulk Import] Fetching ${newRiderIds.length} riders via POST bulk API (1/15min rate)...`);
          zwiftRidersData = await zwiftClient.getBulkRiders(newRiderIds);
          results.synced = zwiftRidersData.length;
          console.log(`[Bulk Import] ✅ Synced ${zwiftRidersData.length} riders via POST`);
        } catch (apiError: any) {
          console.warn('[Bulk Import] ⚠️ POST bulk failed, falling back to GET calls:', apiError.message);
          
          // Fallback: individual GET calls (5/min rate)
          for (const zwiftId of newRiderIds) {
            try {
              const rider = await zwiftClient.getRider(zwiftId);
              zwiftRidersData.push(rider);
              results.synced++;
              
              // Rate limit: 5/min = 12 sec between calls
              if (newRiderIds.indexOf(zwiftId) < newRiderIds.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 12000));
              }
            } catch (err: any) {
              console.warn(`[Bulk Import] Failed to fetch rider ${zwiftId}:`, err.message);
            }
          }
        }
      } else {
        // Voor kleine imports: gebruik GET (5/min rate, sneller dan POST voor < 10 riders)
        console.log(`[Bulk Import] Fetching ${newRiderIds.length} riders via GET calls (5/min rate)...`);
        for (const zwiftId of newRiderIds) {
          try {
            const rider = await zwiftClient.getRider(zwiftId);
            zwiftRidersData.push(rider);
            results.synced++;
            
            // Rate limit: 5/min = 12 sec between calls
            if (newRiderIds.indexOf(zwiftId) < newRiderIds.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 12000));
            }
          } catch (err: any) {
            console.warn(`[Bulk Import] Failed to fetch rider ${zwiftId}:`, err.message);
          }
        }
        console.log(`[Bulk Import] ✅ Synced ${zwiftRidersData.length} riders via GET`);
      }
    }
    
    // Process riders
    for (const zwiftId of newRiderIds) {
      try {
        const riderInput = riderInputMap.get(zwiftId)!;
        
        // Check if we got data from ZwiftRacing API
        const zwiftData = zwiftRidersData.find(r => r.riderId === zwiftId);
        
        if (zwiftData) {
          // US7: Upsert met verse ZwiftRacing data
          // NOTE: watts_per_kg is GENERATED kolom - database berekent dit
          await supabase.upsertRiders([{
            zwift_id: zwiftData.riderId,
            name: zwiftData.name,
            club_id: zwiftData.club?.id,
            category_racing: zwiftData.category?.racing,
            category_zftp: zwiftData.category?.zFTP,
            ranking: zwiftData.ranking ?? undefined,
            ranking_score: zwiftData.rankingScore,
            ftp: zwiftData.ftp,
            weight: zwiftData.weight,
            // watts_per_kg: VERWIJDERD - generated column!
            country: zwiftData.countryAlpha3,
            gender: zwiftData.gender,
            age: zwiftData.age,
          }]);
          results.created++;
        } else if (riderInput.name) {
          // Fallback: manual name alleen
          await supabase.upsertRiders([{ zwift_id: zwiftId, name: riderInput.name }]);
          results.created++;
        } else {
          results.errors.push({ 
            zwiftId, 
            error: 'Rider niet gevonden in ZwiftRacing API en geen name opgegeven' 
          });
          continue;
        }
        
        // Voeg toe aan team
        await supabase.addMyTeamMember(zwiftId);
        results.success++;
        
      } catch (error: any) {
        results.errors.push({ zwiftId, error: error.message });
      }
    }
    
    res.json({
      message: 'Bulk import voltooid',
      total: riders.length,
      results,
      apiSync: results.synced > 0 ? `✅ Synced ${results.synced} riders from ZwiftRacing API` : '⚠️ API sync failed, used manual data',
    });
  } catch (error) {
    console.error('Error bulk importing riders:', error);
    res.status(500).json({ error: 'Fout bij bulk import' });
  }
});

// DELETE /api/riders/team/:zwiftId - Verwijder uit team
router.delete('/team/:zwiftId', async (req: Request, res: Response) => {
  try {
    const zwiftId = parseInt(req.params.zwiftId);
    await supabase.removeMyTeamMember(zwiftId);
    
    res.json({
      success: true,
      message: `Rider ${zwiftId} verwijderd uit jouw team`,
    });
  } catch (error) {
    console.error('Error removing rider from team:', error);
    res.status(500).json({ error: 'Fout bij verwijderen rider' });
  }
});

// PUT /api/riders/team/:zwiftId/favorite - Toggle favorite
router.put('/team/:zwiftId/favorite', async (req: Request, res: Response) => {
  try {
    const zwiftId = parseInt(req.params.zwiftId);
    const { isFavorite } = req.body;
    
    await supabase.toggleFavorite(zwiftId, isFavorite);
    
    res.json({
      success: true,
      message: `Favorite status updated`,
      zwiftId,
      isFavorite,
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Fout bij updaten favorite' });
  }
});

export default router;
