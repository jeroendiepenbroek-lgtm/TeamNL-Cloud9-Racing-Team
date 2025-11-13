/**
 * Signups API Endpoints
 * Sync and query event signups
 */

import { Router, Request, Response } from 'express';
import { SyncService } from '../../services/sync.service.js';

const router = Router();
const syncService = new SyncService();

/**
 * POST /api/signups/sync/:eventId
 * Sync signups voor een specifiek event
 */
router.post('/sync/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    console.log(`📥 API Request: Sync signups for event ${eventId}`);

    const result = await syncService.syncEventSignups(eventId);

    res.status(200).json({
      success: true,
      eventId,
      totalSignups: result.total,
      byPen: result.byPen,
      message: `Synced ${result.total} signups for event ${eventId}`,
    });
  } catch (error) {
    console.error('Error syncing event signups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync event signups',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/signups/sync-batch
 * Sync signups voor meerdere events (max 50)
 */
router.post('/sync-batch', async (req: Request, res: Response) => {
  try {
    const { eventIds } = req.body as { eventIds: string[] };

    if (!eventIds || !Array.isArray(eventIds)) {
      return res.status(400).json({
        success: false,
        error: 'eventIds array is required',
      });
    }

    if (eventIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 events per batch',
      });
    }

    console.log(`📥 API Request: Sync signups for ${eventIds.length} events`);

    const results = [];
    let totalSignups = 0;
    let errors = 0;

    for (const eventId of eventIds) {
      try {
        const result = await syncService.syncEventSignups(eventId);
        results.push({ eventId, ...result, success: true });
        totalSignups += result.total;
      } catch (error) {
        errors++;
        results.push({
          eventId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.status(200).json({
      success: true,
      processed: eventIds.length,
      totalSignups,
      errors,
      results,
    });
  } catch (error) {
    console.error('Error in batch signup sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync batch signups',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
