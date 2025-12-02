/**
 * Endpoint 5: Rider History - GET /api/history/:riderId
 */

import { Request, Response, Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
import { simpleSyncService as syncService } from '../../services/simple-sync.service.js';

const router = Router();

// GET /api/history/:riderId - Haal rider history op
router.get('/:riderId', async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.riderId);
    const history = await supabase.getRiderHistory(riderId);
    
    res.json({
      riderId,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error('Error fetching rider history:', error);
    res.status(500).json({ error: 'Fout bij ophalen rider history' });
  }
});

// POST /api/history/:riderId/sync - Sync rider history vanaf ZwiftRacing API
router.post('/:riderId/sync', async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.riderId);
    await syncService.syncRiderHistory(riderId);
    
    const history = await supabase.getRiderHistory(riderId);
    
    res.json({
      success: true,
      riderId,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error('Error syncing rider history:', error);
    res.status(500).json({ error: 'Fout bij synchroniseren rider history' });
  }
});

export default router;
