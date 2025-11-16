/**
 * Sync V2 API Endpoints
 * Modern sync met separate flows en metrics
 */

import { Request, Response, Router } from 'express';
import { syncServiceV2 } from '../../services/sync-v2.service.js';
import { syncConfigService } from '../../services/sync-config.service.js';
import { syncCoordinator } from '../../services/sync-coordinator.service.js';

const router = Router();

// GET /api/sync/metrics - Haal laatste sync metrics op
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await syncServiceV2.getLatestMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching sync metrics:', error);
    res.status(500).json({ error: 'Failed to fetch sync metrics' });
  }
});

// POST /api/sync/riders - Trigger rider sync
router.post('/riders', async (req: Request, res: Response) => {
  try {
    const config = syncConfigService.getConfig();
    
    const metrics = await syncServiceV2.syncRiders({
      intervalMinutes: config.riderSyncIntervalMinutes,
    });
    
    res.json({
      message: 'Rider sync completed',
      metrics,
    });
  } catch (error) {
    console.error('Error in rider sync:', error);
    res.status(500).json({ 
      error: 'Rider sync failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/sync/events/near - Trigger near event sync
router.post('/events/near', async (req: Request, res: Response) => {
  try {
    const config = syncConfigService.getConfig();
    
    const metrics = await syncServiceV2.syncNearEvents({
      intervalMinutes: config.nearEventSyncIntervalMinutes,
      thresholdMinutes: config.nearEventThresholdMinutes,
      lookforwardHours: config.lookforwardHours,
    });
    
    res.json({
      message: 'Near event sync completed',
      metrics,
    });
  } catch (error) {
    console.error('Error in near event sync:', error);
    res.status(500).json({ 
      error: 'Near event sync failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/sync/events/far - Trigger far event sync
router.post('/events/far', async (req: Request, res: Response) => {
  try {
    const config = syncConfigService.getConfig();
    
    const metrics = await syncServiceV2.syncFarEvents({
      intervalMinutes: config.farEventSyncIntervalMinutes,
      thresholdMinutes: config.nearEventThresholdMinutes,
      lookforwardHours: config.lookforwardHours,
    });
    
    res.json({
      message: 'Far event sync completed',
      metrics,
    });
  } catch (error) {
    console.error('Error in far event sync:', error);
    res.status(500).json({ 
      error: 'Far event sync failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/sync/coordinator/status - Get sync coordinator status
router.get('/coordinator/status', (req: Request, res: Response) => {
  try {
    const status = syncCoordinator.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting coordinator status:', error);
    res.status(500).json({ error: 'Failed to get coordinator status' });
  }
});

export default router;
