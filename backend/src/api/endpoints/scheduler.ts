/**
 * Smart Sync Scheduler API Endpoint - DEPRECATED
 * Use unified-dashboard endpoints instead
 */

import { Router, Request, Response } from 'express';

const router = Router();

// All scheduler endpoints DEPRECATED
const deprecatedResponse = {
  error: 'This endpoint is deprecated',
  message: 'Manual sync control removed. Data syncs automatically via unified endpoints.',
  migration: 'Use /api/v2/* endpoints for data queries'
};

router.get('/status', (req: Request, res: Response) => {
  res.status(410).json(deprecatedResponse);
});

router.post('/restart', (req: Request, res: Response) => {
  res.status(410).json(deprecatedResponse);
});

router.post('/stop', (req: Request, res: Response) => {
  res.status(410).json(deprecatedResponse);
});

router.post('/start', (req: Request, res: Response) => {
  res.status(410).json(deprecatedResponse);
});

router.get('/config', (req: Request, res: Response) => {
  res.status(410).json(deprecatedResponse);
});

export default router;
