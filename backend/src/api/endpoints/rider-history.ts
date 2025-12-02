/**
 * Endpoint 5: Rider History - GET /api/history/:riderId
 */

import { Request, Response, Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
// Sync deprecated - use unified endpoints at /api/v2/*

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

// POST /api/history/:riderId/sync - DEPRECATED
router.post('/:riderId/sync', async (req: Request, res: Response) => {
  res.status(410).json({
    error: 'This endpoint is deprecated',
    message: 'Use /api/v2/riders/:id/detailed for multi-source rider data',
    migration: 'GET /api/v2/riders/:id/detailed'
  });
});

export default router;
