/**
 * Endpoint 2: Riders - GET /api/riders
 */

import { Request, Response, Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
import { simpleSyncService as syncService } from '../../services/simple-sync.service.js';

const router = Router();

// GET /api/riders - Haal alle riders op (optioneel gefilterd op club)
router.get('/', async (req: Request, res: Response) => {
  try {
    const clubId = req.query.clubId ? parseInt(req.query.clubId as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    let riders = await supabase.getRiders(clubId);
    
    // Apply limit if specified
    if (limit && limit > 0) {
      riders = riders.slice(0, limit);
    }
    
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

// GET /api/riders/team - Haal "Mijn Team" riders op via riders_unified
router.get('/team', async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching team members from riders_unified...');
    
    // Query riders_unified met is_team_member flag
    const riders = await supabase.getMyTeamMembers();
    
    // Map database fields naar frontend-expected fields
    const mappedRiders = riders.map(rider => ({
      ...rider,
      // Add aliases voor backwards compatibility
      weight: rider.weight_kg,    // Frontend expects 'weight'
      zp_ftp: rider.ftp,           // Frontend expects 'zp_ftp'
    }));
    
    console.log(`✅ Loaded ${riders.length} team members`);
    res.json(mappedRiders);
    
  } catch (error) {
    console.error('Error fetching team riders:', error);
    res.status(500).json({ 
      error: 'Fout bij ophalen team riders', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// GET /api/riders/search/:zwiftId - Zoek rider op ZwiftRacing API (voor add rider)
router.get('/search/:zwiftId', async (req: Request, res: Response) => {
  try {
    const zwiftId = parseInt(req.params.zwiftId);
    
    if (isNaN(zwiftId)) {
      return res.status(400).json({ error: 'Ongeldig Zwift ID' });
    }
    
    // Haal rider data op van ZwiftRacing API
    const { zwiftClient } = await import('../zwift-client.js');
    const zwiftData = await zwiftClient.getRider(zwiftId);
    
    // Return simplified data voor UI
    res.json({
      rider_id: zwiftData.riderId,
      name: zwiftData.name,
      country: zwiftData.country,
      weight: zwiftData.weight,
      zp_category: zwiftData.zpCategory,
      zp_ftp: zwiftData.zpFTP,
      club_name: zwiftData.club?.name,
      race_wins: zwiftData.race?.wins || 0,
      race_podiums: zwiftData.race?.podiums || 0,
    });
  } catch (error: any) {
    console.error('Error searching rider:', error);
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return res.status(404).json({ error: 'Rider niet gevonden op ZwiftRacing.app' });
    }
    res.status(500).json({ error: 'Fout bij zoeken rider' });
  }
});

// POST /api/riders/sync - Sync riders vanaf ZwiftRacing API
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const clubId = req.body.clubId || 11818;
    const metrics = await syncService.syncRiders({ intervalMinutes: 60, clubId });
    
    res.json({
      success: true,
      count: metrics.riders_processed,
      metrics,
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
        
        // Upsert met verse API data - PURE 1:1 MAPPING
        const upserted = await supabase.upsertRiders([{
          rider_id: zwiftData.riderId,
          name: zwiftData.name,
          gender: zwiftData.gender,
          country: zwiftData.country,
          age: zwiftData.age,
          height: zwiftData.height,
          weight: zwiftData.weight,
          zp_category: zwiftData.zpCategory,
          zp_ftp: zwiftData.zpFTP,
          
          // Power (14 velden)
          power_wkg5: zwiftData.power?.wkg5,
          power_wkg15: zwiftData.power?.wkg15,
          power_wkg30: zwiftData.power?.wkg30,
          power_wkg60: zwiftData.power?.wkg60,
          power_wkg120: zwiftData.power?.wkg120,
          power_wkg300: zwiftData.power?.wkg300,
          power_wkg1200: zwiftData.power?.wkg1200,
          power_w5: zwiftData.power?.w5,
          power_w15: zwiftData.power?.w15,
          power_w30: zwiftData.power?.w30,
          power_w60: zwiftData.power?.w60,
          power_w120: zwiftData.power?.w120,
          power_w300: zwiftData.power?.w300,
          power_w1200: zwiftData.power?.w1200,
          power_cp: zwiftData.power?.CP,
          power_awc: zwiftData.power?.AWC,
          power_compound_score: zwiftData.power?.compoundScore,
          power_rating: zwiftData.power?.powerRating,
          
          // Race (12 velden)
          race_last_rating: zwiftData.race?.last?.rating,
          race_last_date: zwiftData.race?.last?.date,
          race_last_category: zwiftData.race?.last?.mixed?.category,
          race_last_number: zwiftData.race?.last?.mixed?.number,
          race_current_rating: zwiftData.race?.current?.rating,
          race_current_date: zwiftData.race?.current?.date,
          race_max30_rating: zwiftData.race?.max30?.rating,
          race_max30_expires: zwiftData.race?.max30?.expires,
          race_max90_rating: zwiftData.race?.max90?.rating,
          race_max90_expires: zwiftData.race?.max90?.expires,
          race_finishes: zwiftData.race?.finishes,
          race_dnfs: zwiftData.race?.dnfs,
          race_wins: zwiftData.race?.wins,
          race_podiums: zwiftData.race?.podiums,
          
          // Handicaps (4 velden)
          handicap_flat: zwiftData.handicaps?.profile?.flat,
          handicap_rolling: zwiftData.handicaps?.profile?.rolling,
          handicap_hilly: zwiftData.handicaps?.profile?.hilly,
          handicap_mountainous: zwiftData.handicaps?.profile?.mountainous,
          
          // Phenotype (7 velden)
          phenotype_sprinter: zwiftData.phenotype?.scores?.sprinter,
          phenotype_puncheur: zwiftData.phenotype?.scores?.puncheur,
          phenotype_pursuiter: zwiftData.phenotype?.scores?.pursuiter,
          phenotype_climber: zwiftData.phenotype?.scores?.climber,
          phenotype_tt: zwiftData.phenotype?.scores?.tt,
          phenotype_value: zwiftData.phenotype?.value,
          phenotype_bias: zwiftData.phenotype?.bias,
          
          // Club
          club_id: zwiftData.club?.id,
          club_name: zwiftData.club?.name,
        }]);
        rider = upserted[0];
        syncedFromApi = true;
        console.log(`[Add Rider] ✅ Synced rider data from API`);
      } catch (apiError: any) {
        console.warn(`[Add Rider] ⚠️ API sync failed: ${apiError.message}`);
        
        // Fallback: gebruik manual name als opgegeven
        if (name) {
          const newRiders = await supabase.upsertRiders([{
            rider_id: zwiftId,
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
          console.error('[Bulk Import] ❌ POST bulk failed:', apiError.message);
          console.warn('[Bulk Import] ⚠️ Falling back to individual GET calls (this will take time)...');
          
          // Fallback: individual GET calls (5/min rate)
          // KRITIEK: Dit duurt lang voor > 10 riders (12 sec per rider)
          let successCount = 0;
          let errorCount = 0;
          
          for (let i = 0; i < newRiderIds.length; i++) {
            const zwiftId = newRiderIds[i];
            try {
              console.log(`[Bulk Import] Fetching rider ${i + 1}/${newRiderIds.length}: ${zwiftId}...`);
              const rider = await zwiftClient.getRider(zwiftId);
              zwiftRidersData.push(rider);
              successCount++;
              results.synced++;
              
              // Rate limit: 5/min = 12 sec between calls
              if (i < newRiderIds.length - 1) {
                console.log(`[Bulk Import] Rate limiting: waiting 12s before next rider...`);
                await new Promise(resolve => setTimeout(resolve, 12000));
              }
            } catch (err: any) {
              errorCount++;
              console.error(`[Bulk Import] ❌ Failed to fetch rider ${zwiftId}:`, err.message);
              results.errors.push({ zwiftId, error: err.message });
            }
          }
          console.log(`[Bulk Import] GET fallback complete: ${successCount} success, ${errorCount} errors`);
        }
      } else {
        // Voor kleine imports: gebruik GET (5/min rate, sneller dan POST voor < 10 riders)
        console.log(`[Bulk Import] Fetching ${newRiderIds.length} riders via individual GET calls (5/min rate)...`);
        
        for (let i = 0; i < newRiderIds.length; i++) {
          const zwiftId = newRiderIds[i];
          try {
            console.log(`[Bulk Import] Fetching rider ${i + 1}/${newRiderIds.length}: ${zwiftId}...`);
            const rider = await zwiftClient.getRider(zwiftId);
            zwiftRidersData.push(rider);
            results.synced++;
            
            // Rate limit: 5/min = 12 sec between calls
            if (i < newRiderIds.length - 1) {
              console.log(`[Bulk Import] Rate limiting: waiting 12s...`);
              await new Promise(resolve => setTimeout(resolve, 12000));
            }
          } catch (err: any) {
            console.error(`[Bulk Import] ❌ Failed to fetch rider ${zwiftId}:`, err.message);
            results.errors.push({ zwiftId, error: err.message });
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
          // US7: Upsert met verse ZwiftRacing data - PURE 1:1 MAPPING
          await supabase.upsertRiders([{
            rider_id: zwiftData.riderId,
            name: zwiftData.name,
            gender: zwiftData.gender,
            country: zwiftData.country,
            age: zwiftData.age,
            height: zwiftData.height,
            weight: zwiftData.weight,
            zp_category: zwiftData.zpCategory,
            zp_ftp: zwiftData.zpFTP,
            
            // Power
            power_wkg5: zwiftData.power?.wkg5,
            power_wkg15: zwiftData.power?.wkg15,
            power_wkg30: zwiftData.power?.wkg30,
            power_wkg60: zwiftData.power?.wkg60,
            power_wkg120: zwiftData.power?.wkg120,
            power_wkg300: zwiftData.power?.wkg300,
            power_wkg1200: zwiftData.power?.wkg1200,
            power_w5: zwiftData.power?.w5,
            power_w15: zwiftData.power?.w15,
            power_w30: zwiftData.power?.w30,
            power_w60: zwiftData.power?.w60,
            power_w120: zwiftData.power?.w120,
            power_w300: zwiftData.power?.w300,
            power_w1200: zwiftData.power?.w1200,
            power_cp: zwiftData.power?.CP,
            power_awc: zwiftData.power?.AWC,
            power_compound_score: zwiftData.power?.compoundScore,
            power_rating: zwiftData.power?.powerRating,
            
            // Race
            race_last_rating: zwiftData.race?.last?.rating,
            race_last_date: zwiftData.race?.last?.date,
            race_last_category: zwiftData.race?.last?.mixed?.category,
            race_last_number: zwiftData.race?.last?.mixed?.number,
            race_current_rating: zwiftData.race?.current?.rating,
            race_current_date: zwiftData.race?.current?.date,
            race_max30_rating: zwiftData.race?.max30?.rating,
            race_max30_expires: zwiftData.race?.max30?.expires,
            race_max90_rating: zwiftData.race?.max90?.rating,
            race_max90_expires: zwiftData.race?.max90?.expires,
            race_finishes: zwiftData.race?.finishes,
            race_dnfs: zwiftData.race?.dnfs,
            race_wins: zwiftData.race?.wins,
            race_podiums: zwiftData.race?.podiums,
            
            // Handicaps
            handicap_flat: zwiftData.handicaps?.profile?.flat,
            handicap_rolling: zwiftData.handicaps?.profile?.rolling,
            handicap_hilly: zwiftData.handicaps?.profile?.hilly,
            handicap_mountainous: zwiftData.handicaps?.profile?.mountainous,
            
            // Phenotype
            phenotype_sprinter: zwiftData.phenotype?.scores?.sprinter,
            phenotype_puncheur: zwiftData.phenotype?.scores?.puncheur,
            phenotype_pursuiter: zwiftData.phenotype?.scores?.pursuiter,
            phenotype_climber: zwiftData.phenotype?.scores?.climber,
            phenotype_tt: zwiftData.phenotype?.scores?.tt,
            phenotype_value: zwiftData.phenotype?.value,
            phenotype_bias: zwiftData.phenotype?.bias,
            
            // Club
            club_id: zwiftData.club?.id,
            club_name: zwiftData.club?.name,
          }]);
          results.created++;
        } else {
          // Geen ZwiftRacing data - voeg rider toe met minimale info
          // Dit kan gebeuren bij rate limiting of als rider niet in ZwiftRacing DB zit
          console.warn(`[Bulk Import] ⚠️ No Zwift data for rider ${zwiftId}, adding with minimal info`);
          await supabase.upsertRiders([{ 
            rider_id: zwiftId, 
            name: riderInput.name || `Rider ${zwiftId}` // Fallback naam
          }]);
          results.created++;
          results.errors.push({ 
            zwiftId, 
            error: 'Geen ZwiftRacing data beschikbaar - rider toegevoegd met minimale info' 
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
