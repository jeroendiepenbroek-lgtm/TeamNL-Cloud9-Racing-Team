/**
 * Signups API Endpoints
 * Sync and query event signups
 */

import { Router, Request, Response } from 'express';
import { SimpleSyncService as SyncService } from '../../services/simple-sync.service.js';
import { SupabaseService } from '../../services/supabase.service.js';

const router = Router();
const syncService = new SyncService();
const supabaseService = new SupabaseService();

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

/**
 * GET /api/signups/debug/:eventId
 * Debug endpoint - check raw signup data voor event
 */
router.get('/debug/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    // Direct query via supabase service
    const allSignups = await supabaseService['client']
      .from('zwift_api_event_signups')
      .select('event_id, rider_name, pen_name')
      .limit(1000);

    if (allSignups.error) throw allSignups.error;

    // Filter voor dit event
    const forEvent = (allSignups.data || []).filter((s: any) => 
      String(s.event_id) === String(eventId)
    );

    res.json({
      eventId,
      totalInDb: allSignups.data?.length || 0,
      forThisEvent: forEvent.length,
      sampleAll: allSignups.data?.slice(0, 3).map((s: any) => ({
        event_id: s.event_id,
        event_id_type: typeof s.event_id,
        rider_name: s.rider_name,
        pen_name: s.pen_name,
      })),
      forEvent: forEvent.slice(0, 5),
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;
