/**
 * Unified Sync Scheduler API Endpoint
 * Manage sync scheduler (riders, events, results, cleanup)
 */

import { Router, Request, Response } from 'express';
import { unifiedScheduler } from '../../services/unified-scheduler.service.js';

const router = Router();

// GET /api/scheduler/status - Get scheduler status
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = unifiedScheduler.getStatus();
    
    res.json({
      success: true,
      ...status
    });
    
  } catch (error: any) {
    console.error('[Scheduler] Status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler status',
      message: error.message
    });
  }
});

// POST /api/scheduler/restart - Restart scheduler with new config
router.post('/restart', (req: Request, res: Response) => {
  try {
    const newConfig = req.body;
    
    console.log('[Scheduler] Restarting with config:', newConfig);
    unifiedScheduler.restart(newConfig);
    
    res.json({
      success: true,
      message: 'Scheduler restarted successfully',
      status: unifiedScheduler.getStatus()
    });
    
  } catch (error: any) {
    console.error('[Scheduler] Restart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart scheduler',
      message: error.message
    });
  }
});

// POST /api/scheduler/stop - Stop scheduler
router.post('/stop', (req: Request, res: Response) => {
  try {
    console.log('[Scheduler] Stopping...');
    unifiedScheduler.stop();
    
    res.json({
      success: true,
      message: 'Scheduler stopped successfully'
    });
    
  } catch (error: any) {
    console.error('[Scheduler] Stop error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop scheduler',
      message: error.message
    });
  }
});

// POST /api/scheduler/start - Start scheduler
router.post('/start', (req: Request, res: Response) => {
  try {
    console.log('[Scheduler] Starting...');
    unifiedScheduler.start();
    
    res.json({
      success: true,
      message: 'Scheduler started successfully',
      status: unifiedScheduler.getStatus()
    });
    
  } catch (error: any) {
    console.error('[Scheduler] Start error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start scheduler',
      message: error.message
    });
  }
});

// POST /api/scheduler/trigger-rider - Manual rider sync
router.post('/trigger-rider', async (req: Request, res: Response) => {
  try {
    console.log('[Scheduler] Manual rider sync triggered');
    await unifiedScheduler.triggerRiderSync();
    
    res.json({
      success: true,
      message: 'Rider sync completed successfully',
      status: unifiedScheduler.getStatus()
    });
    
  } catch (error: any) {
    console.error('[Scheduler] Rider sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Rider sync failed',
      message: error.message
    });
  }
});

// POST /api/scheduler/trigger-event - Manual event sync
router.post('/trigger-event', async (req: Request, res: Response) => {
  try {
    console.log('[Scheduler] Manual event sync triggered');
    await unifiedScheduler.triggerEventSync();
    
    res.json({
      success: true,
      message: 'Event sync completed successfully',
      status: unifiedScheduler.getStatus()
    });
    
  } catch (error: any) {
    console.error('[Scheduler] Event sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Event sync failed',
      message: error.message
    });
  }
});

// POST /api/scheduler/trigger-results - Manual results sync
router.post('/trigger-results', async (req: Request, res: Response) => {
  try {
    console.log('[Scheduler] Manual results sync triggered');
    await unifiedScheduler.triggerResultsSync();
    
    res.json({
      success: true,
      message: 'Results sync completed successfully',
      status: unifiedScheduler.getStatus()
    });
    
  } catch (error: any) {
    console.error('[Scheduler] Results sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Results sync failed',
      message: error.message
    });
  }
});

// POST /api/scheduler/trigger-cleanup - Manual cleanup
router.post('/trigger-cleanup', async (req: Request, res: Response) => {
  try {
    console.log('[Scheduler] Manual cleanup triggered');
    await unifiedScheduler.triggerCleanup();
    
    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      status: unifiedScheduler.getStatus()
    });
    
  } catch (error: any) {
    console.error('[Scheduler] Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      message: error.message
    });
  }
});

export default router;
