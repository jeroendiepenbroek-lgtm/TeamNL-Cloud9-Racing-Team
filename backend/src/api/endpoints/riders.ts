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

export default router;
