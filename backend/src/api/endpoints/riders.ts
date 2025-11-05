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

// GET /api/riders/:zwiftId - Haal specifieke rider op
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

// ============================================================================
// TEAM MANAGEMENT - My Team (via view_my_team VIEW)
// ============================================================================

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
    
    res.json({
      count: riders.length,
      clubs: uniqueClubs,  // Alle clubs van je team members
      riders: riders.map(r => ({
        // Identifiers
        id: r.rider_id,
        zwiftId: r.zwift_id,
        name: r.name,
        
        // Club (extracted from rider)
        clubId: r.club_id,
        clubName: r.club_name,
        
        // Racing
        ranking: r.ranking,
        categoryRacing: r.category_racing,
        
        // Power
        ftp: r.ftp,
        weight: r.weight,
        wattsPerKg: r.watts_per_kg,  // Computed in VIEW!
        
        // Stats
        totalRaces: r.total_races,
        totalWins: r.total_wins,
        totalPodiums: r.total_podiums,
        
        // Meta
        lastSynced: r.rider_last_synced,
        addedAt: r.team_added_at,
        isFavorite: r.is_favorite,
      })),
    });
  } catch (error) {
    console.error('Error fetching my team riders:', error);
    res.status(500).json({ error: 'Fout bij ophalen team riders' });
  }
});

// POST /api/riders/team - Voeg rider toe aan "Mijn Team"
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
    
    // Check of rider bestaat in riders tabel
    let rider = await supabase.getRider(zwiftId);
    
    // Als rider niet bestaat EN name is gegeven, maak aan
    if (!rider && name) {
      const newRiders = await supabase.upsertRiders([{
        zwift_id: zwiftId,
        name,
      }]);
      rider = newRiders[0];
    }
    
    if (!rider) {
      return res.status(400).json({
        error: 'Rider niet gevonden in database. Voeg "name" parameter toe.',
        hint: 'Of sync eerst de rider data van ZwiftRacing API',
        example: { zwiftId: 150437, name: 'John Doe' }
      });
    }
    
    // Voeg toe aan my_team_members (alleen zwift_id!)
    await supabase.addMyTeamMember(zwiftId);
    
    res.status(201).json({
      success: true,
      message: `${rider.name} toegevoegd aan jouw team`,
      zwiftId,
    });
  } catch (error) {
    console.error('Error adding rider to team:', error);
    res.status(500).json({ error: 'Fout bij toevoegen rider' });
  }
});

// POST /api/riders/team/bulk - Bulk import riders
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
      errors: [] as Array<{ zwiftId: number; error: string }>,
    };
    
    // Haal bestaande team op
    const existingTeam = await supabase.getMyTeamMembers();
    const existingZwiftIds = new Set(existingTeam.map(m => m.zwift_id));
    
    for (const riderInput of riders) {
      try {
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
        
        // Check/create rider in riders tabel
        let rider = await supabase.getRider(zwiftId);
        if (!rider && name) {
          const newRiders = await supabase.upsertRiders([{ zwift_id: zwiftId, name }]);
          rider = newRiders[0];
          results.created++;
        }
        
        if (!rider) {
          results.errors.push({ 
            zwiftId, 
            error: 'Rider niet gevonden. Voeg "name" toe of sync eerst.' 
          });
          continue;
        }
        
        // Voeg toe aan team
        await supabase.addMyTeamMember(zwiftId);
        results.success++;
        
      } catch (error: any) {
        results.errors.push({ zwiftId: riderInput.zwiftId, error: error.message });
      }
    }
    
    res.json({
      message: 'Bulk import voltooid',
      total: riders.length,
      results,
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
