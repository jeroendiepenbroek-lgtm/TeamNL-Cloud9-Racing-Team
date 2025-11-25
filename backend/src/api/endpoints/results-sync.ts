/**
 * Results Sync API Endpoint
 * POST /api/sync/results - Sync race results from rider history
 */

import { Router, Request, Response } from 'express';
import { ResultsSyncService } from '../../services/results-sync.service.js';

const router = Router();
const resultsSyncService = new ResultsSyncService();

// POST /api/sync/results - Sync all team results from rider history
router.post('/', async (req: Request, res: Response) => {
  const { daysBack = 30 } = req.body;

  try {
    console.log(`Starting results sync (${daysBack} days back)`);

    const stats = await resultsSyncService.syncTeamResultsFromHistory(daysBack);

    res.json({
      success: true,
      message: `Results sync completed successfully`,
      stats
    });

  } catch (error: any) {
    console.error('❌ Results sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Results sync failed',
      message: error.message
    });
  }
});

// POST /api/sync/results/rider/:riderId - Sync single rider results
router.post('/rider/:riderId', async (req: Request, res: Response) => {
  const riderId = parseInt(req.params.riderId);
  const { daysBack = 30 } = req.body;

  if (isNaN(riderId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid rider ID'
    });
  }

  try {
    console.info(`🏁 Syncing results for rider ${riderId}`);

    const resultCount = await resultsSyncService.syncSingleRiderResults(riderId, daysBack);

    res.json({
      success: true,
      message: `Synced ${resultCount} results for rider ${riderId}`,
      results_synced: resultCount
    });

  } catch (error: any) {
    console.error(`❌ Rider ${riderId} results sync failed:`, error);
    res.status(500).json({
      success: false,
      error: 'Rider results sync failed',
      message: error.message
    });
  }
});

export default router;
