/**
 * Smart Sync Scheduler API Endpoint
 * Manage sync scheduler (riders, events, results)
 */

import { Router, Request, Response } from 'express';
import { smartSyncScheduler } from '../../services/smart-sync-scheduler.service.js';

const router = Router();

// GET /api/scheduler/status - Get scheduler status
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = smartSyncScheduler.getStatus();
    
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
    smartSyncScheduler.updateConfig(newConfig);
    
    res.json({
      success: true,
      message: 'Scheduler config updated successfully',
      status: smartSyncScheduler.getStatus()
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
    smartSyncScheduler.stop();
    
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
    smartSyncScheduler.start();
    
    res.json({
      success: true,
      message: 'Scheduler started successfully',
      status: smartSyncScheduler.getStatus()
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

// GET /api/scheduler/config - Get current config
router.get('/config', (req: Request, res: Response) => {
  try {
    const status = smartSyncScheduler.getStatus();
    const config = status.config || {};
    
    res.json({
      success: true,
      config
    });
    
  } catch (error: any) {
    console.error('[Scheduler] Config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler config',
      message: error.message
    });
  }
});

export default router;
