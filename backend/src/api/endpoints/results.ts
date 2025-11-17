/**
 * Endpoint 4: Results - GET /api/results/:eventId
 */

import { Request, Response, Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
import { syncService } from '../../services/sync-v2.service.js';

const router = Router();

// GET /api/results/:eventId - Haal results voor event op
router.get('/:eventId', async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const results = await supabase.getEventResults(eventId);
    
    res.json({
      eventId,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Fout bij ophalen results' });
  }
});

// POST /api/results/:eventId/sync - Sync results vanaf ZwiftRacing API
router.post('/:eventId/sync', async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const results = await syncService.syncEventResults(eventId);
    
    res.json({
      success: true,
      eventId,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Error syncing results:', error);
    res.status(500).json({ error: 'Fout bij synchroniseren results' });
  }
});

export default router;
