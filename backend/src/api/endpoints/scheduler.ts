/**
 * Scheduler API Endpoint
 * Smart Sync Scheduler management
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
      running: status.running,
      config: status.config,
      currentMode: status.currentMode,
      intervals: status.intervals,
      message: status.running ? 'Smart Sync Scheduler is running' : 'Smart Sync Scheduler is stopped'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/scheduler/start
router.post('/start', (req: Request, res: Response) => {
  try {
    smartSyncScheduler.start();
    res.json({
      success: true,
      message: 'Smart Sync Scheduler started'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/scheduler/stop
router.post('/stop', (req: Request, res: Response) => {
  try {
    smartSyncScheduler.stop();
    res.json({
      success: true,
      message: 'Smart Sync Scheduler stopped'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/scheduler/restart
router.post('/restart', (req: Request, res: Response) => {
  try {
    smartSyncScheduler.restart(req.body.config);
    res.json({
      success: true,
      message: 'Smart Sync Scheduler restarted'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
