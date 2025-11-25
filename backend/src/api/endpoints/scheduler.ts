/**
 * Scheduler API Endpoint - STUB
 * Unified scheduler temporarily disabled
 */

import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/scheduler/status - Get scheduler status
router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    running: false,
    message: 'Unified scheduler temporarily disabled - using separate sync services'
  });
});

// POST /api/scheduler/restart
router.post('/restart', (req: Request, res: Response) => {
  res.json({
    success: false,
    message: 'Unified scheduler temporarily disabled'
  });
});

// POST /api/scheduler/stop
router.post('/stop', (req: Request, res: Response) => {
  res.json({
    success: false,
    message: 'Unified scheduler temporarily disabled'
  });
});

// POST /api/scheduler/start
router.post('/start', (req: Request, res: Response) => {
  res.json({
    success: false,
    message: 'Unified scheduler temporarily disabled'
  });
});

// GET /api/scheduler/config
router.get('/config', (req: Request, res: Response) => {
  res.json({
    success: false,
    message: 'Unified scheduler temporarily disabled'
  });
});

export default router;
