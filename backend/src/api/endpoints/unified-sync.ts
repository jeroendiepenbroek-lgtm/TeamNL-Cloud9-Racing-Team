/**
 * Unified Sync API Endpoint
 * POST /api/sync - All sync operations through one endpoint
 */

import { Router, Request, Response } from 'express';
import { unifiedSync } from '../../services/unified-sync.service.js';

const router = Router();

// POST /api/sync - Universal sync endpoint
router.post('/', async (req: Request, res: Response) => {
  const { type, options } = req.body;

  try {
    let result;

    switch (type) {
      case 'riders':
        result = await unifiedSync.syncRiders(options || {});
        break;
      
      case 'events':
        result = await unifiedSync.syncEvents(options || {});
        break;
      
      case 'signups':
        const eventIds = options?.eventIds || [];
        if (eventIds.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'eventIds required for signup sync'
          });
        }
        result = await unifiedSync.syncSignups(eventIds, options);
        break;
      
      case 'results':
        result = await unifiedSync.syncResults(options || {});
        break;
      
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown sync type: ${type}`,
          validTypes: ['riders', 'events', 'signups', 'results']
        });
    }

    res.json(result);

  } catch (error: any) {
    console.error(`Sync failed (${type}):`, error);
    res.status(500).json({
      success: false,
      type,
      error: error.message
    });
  }
});

// POST /api/sync/bulk/riders
router.post('/bulk/riders', async (req: Request, res: Response) => {
  const { rider_ids } = req.body;

  if (!Array.isArray(rider_ids) || rider_ids.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'rider_ids array required'
    });
  }

  try {
    const result = await unifiedSync.bulkSyncRiders(rider_ids);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/sync/bulk/events
router.post('/bulk/events', async (req: Request, res: Response) => {
  const { event_ids } = req.body;

  if (!Array.isArray(event_ids) || event_ids.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'event_ids array required'
    });
  }

  try {
    const result = await unifiedSync.bulkSyncEvents(event_ids);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/sync/status
router.get('/status', async (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'Unified Sync Service',
    features: [
      'Smart scheduling (near/far events)',
      'Bulk operations (50 riders/batch)',
      'Rate limit optimization',
      'Built-in queue management'
    ],
    endpoints: {
      sync: 'POST /api/sync { type: "riders|events|signups|results", options: {...} }',
      bulkRiders: 'POST /api/sync/bulk/riders { rider_ids: [...] }',
      bulkEvents: 'POST /api/sync/bulk/events { event_ids: [...] }'
    }
  });
});

export default router;
