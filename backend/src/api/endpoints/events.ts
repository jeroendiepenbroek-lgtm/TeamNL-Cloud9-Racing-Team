/**
 * Endpoint 3: Events - GET /api/events
 */

import { Request, Response, Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
import { syncService } from '../../services/sync.service.js';

const router = Router();

// GET /api/events - Haal alle events op (optioneel gefilterd op club)
router.get('/', async (req: Request, res: Response) => {
  try {
    const clubId = req.query.clubId ? parseInt(req.query.clubId as string) : undefined;
    const events = await supabase.getEvents(clubId);
    
    res.json({
      count: events.length,
      events,
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Fout bij ophalen events' });
  }
});

// POST /api/events/sync - Sync events vanaf ZwiftRacing API
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const clubId = req.body.clubId || 11818;
    const events = await syncService.syncEvents(clubId);
    
    res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error('Error syncing events:', error);
    res.status(500).json({ error: 'Fout bij synchroniseren events' });
  }
});

export default router;
