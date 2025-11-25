/**
 * Rider Delta API Endpoint
 * US2: Live Velo dashboard - rider changes tracking
 */

import { Router, Request, Response } from 'express';
import { riderDeltaService } from '../../services/rider-delta.service.js';

const router = Router();

// GET /api/riders/deltas - Recent rider changes (voor Live Velo dashboard)
router.get('/deltas', async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    
    console.log(`[Rider Deltas] Fetching changes from last ${hours} hours...`);
    const deltas = await riderDeltaService.getRecentChanges(hours);
    
    res.json({
      success: true,
      hours,
      changes: deltas.length,
      deltas
    });
    
  } catch (error: any) {
    console.error('[Rider Deltas] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rider deltas',
      message: error.message
    });
  }
});

// GET /api/riders/:riderId/trends - Rider trends over time
router.get('/:riderId/trends', async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.riderId);
    const days = parseInt(req.query.days as string) || 90;
    
    if (isNaN(riderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rider ID'
      });
    }
    
    console.log(`[Rider Trends] Fetching trends for rider ${riderId} (${days} days)...`);
    const trends = await riderDeltaService.getRiderTrends(riderId, days);
    
    res.json({
      success: true,
      ...trends
    });
    
  } catch (error: any) {
    console.error('[Rider Trends] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rider trends',
      message: error.message
    });
  }
});

export default router;
