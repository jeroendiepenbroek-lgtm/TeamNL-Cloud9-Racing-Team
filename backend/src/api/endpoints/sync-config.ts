/**
 * Sync Configuration API Endpoints - DEPRECATED
 * Use unified endpoints instead
 */

import { Request, Response, Router } from 'express';

const router = Router();

const deprecatedResponse = {
  error: 'This endpoint is deprecated',
  message: 'Sync configuration is now automatic. Use /api/v2/* for data queries.',
  migration: 'No manual sync configuration needed'
};

// All sync config endpoints DEPRECATED
router.get('/config', async (req: Request, res: Response) => {
  res.status(410).json(deprecatedResponse);
});

router.put('/config', async (req: Request, res: Response) => {
  res.status(410).json(deprecatedResponse);
});

router.post('/config/reset', async (req: Request, res: Response) => {
  res.status(410).json(deprecatedResponse);
});

router.post('/riders/now', async (req: Request, res: Response) => {
  res.status(410).json(deprecatedResponse);
});

export default router;
