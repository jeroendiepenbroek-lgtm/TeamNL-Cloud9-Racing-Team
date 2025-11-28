/**
 * Sync Control Center - Unified sync management
 * Manages all 4 sync types: Riders, Results, Near Events, Far Events
 */

import { Router, Request, Response } from 'express';
import { syncServiceV2 } from '../../services/sync-v2.service.js';
import { resultsSyncService } from '../../services/results-sync.service.js';
import { supabase } from '../../services/supabase.service.js';
import { smartSyncScheduler } from '../../services/smart-sync-scheduler.service.js';

const router = Router();

// Rate limit configuration (database-based)
const API_RATE_LIMITS = {
  RIDER_SYNC: 15 * 60 * 1000,        // 15 minutes
  RESULTS_SYNC: 10 * 60 * 1000,      // 10 minutes
  NEAR_EVENT_SYNC: 2 * 60 * 1000,    // 2 minutes
  FAR_EVENT_SYNC: 30 * 60 * 1000,    // 30 minutes
};

/**
 * GET /api/sync-control/metrics
 * Returns metrics for all 4 sync types
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const [riderSync, resultsSync, nearEventSync, farEventSync] = await Promise.all([
      supabase.getLastSyncLog('RIDER_SYNC'),
      supabase.getLastSyncLog('RESULTS_SYNC'),
      supabase.getLastSyncLog('NEAR_EVENT_SYNC'),
      supabase.getLastSyncLog('FAR_EVENT_SYNC'),
    ]);

    const formatMetric = (log: any, rateLimit: number) => {
      if (!log) {
        return {
          status: 'never_synced',
          last_sync: null,
          duration: null,
          items_synced: 0,
          can_sync: true,
          next_available: new Date().toISOString(),
        };
      }

      const lastSyncTime = new Date(log.synced_at).getTime();
      const now = Date.now();
      const timeSinceSync = now - lastSyncTime;
      const canSync = timeSinceSync >= rateLimit;
      const nextAvailable = canSync
        ? new Date().toISOString()
        : new Date(lastSyncTime + rateLimit).toISOString();

      return {
        status: log.status || 'unknown',
        last_sync: log.synced_at,
        duration: log.duration_ms || null,
        items_synced: log.items_synced || 0,
        can_sync: canSync,
        next_available: nextAvailable,
        error: log.error || null,
      };
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      rider_sync: formatMetric(riderSync, API_RATE_LIMITS.RIDER_SYNC),
      results_sync: formatMetric(resultsSync, API_RATE_LIMITS.RESULTS_SYNC),
      near_event_sync: formatMetric(nearEventSync, API_RATE_LIMITS.NEAR_EVENT_SYNC),
      far_event_sync: formatMetric(farEventSync, API_RATE_LIMITS.FAR_EVENT_SYNC),
    });
  } catch (error: any) {
    console.error('[Sync Control] Error fetching metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch sync metrics',
      details: error.message,
    });
  }
});

/**
 * POST /api/sync-control/trigger/riders
 * Manual trigger for rider sync
 */
router.post('/trigger/riders', async (req: Request, res: Response) => {
  try {
    // Check rate limit
    const lastSync = await supabase.getLastSyncLog('RIDER_SYNC');
    if (lastSync) {
      const timeSinceSync = Date.now() - new Date(lastSync.synced_at).getTime();
      if (timeSinceSync < API_RATE_LIMITS.RIDER_SYNC) {
        const waitTime = Math.ceil((API_RATE_LIMITS.RIDER_SYNC - timeSinceSync) / 1000);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Please wait ${Math.ceil(waitTime / 60)} more minutes`,
          next_available: new Date(new Date(lastSync.synced_at).getTime() + API_RATE_LIMITS.RIDER_SYNC).toISOString(),
        });
      }
    }

    console.log('[Sync Control] 🔄 Manual rider sync triggered');

    // Call coordinated rider sync
    const result = await syncServiceV2.syncRidersCoordinated({
      intervalMinutes: 60,
      clubId: 11818,
    });

    // Log to database
    await supabase.logSync({
      endpoint: 'RIDER_SYNC',
      status: result.status,
      items_synced: result.riders_processed || 0,
      duration_ms: result.duration_ms,
      synced_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Rider sync completed',
      riders_processed: result.riders_processed,
      riders_new: result.riders_new,
      riders_updated: result.riders_updated,
      duration_ms: result.duration_ms,
    });
  } catch (error: any) {
    console.error('[Sync Control] ❌ Rider sync failed:', error);
    
    // Log error to database
    await supabase.logSync({
      endpoint: 'RIDER_SYNC',
      status: 'error',
      items_synced: 0,
      duration_ms: 0,
      error: error.message,
      synced_at: new Date().toISOString(),
    });

    res.status(500).json({
      error: 'Rider sync failed',
      details: error.message,
    });
  }
});

/**
 * POST /api/sync-control/trigger/results
 * Manual trigger for results sync
 */
router.post('/trigger/results', async (req: Request, res: Response) => {
  try {
    // Check rate limit
    const lastSync = await supabase.getLastSyncLog('RESULTS_SYNC');
    if (lastSync) {
      const timeSinceSync = Date.now() - new Date(lastSync.synced_at).getTime();
      if (timeSinceSync < API_RATE_LIMITS.RESULTS_SYNC) {
        const waitTime = Math.ceil((API_RATE_LIMITS.RESULTS_SYNC - timeSinceSync) / 1000);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Please wait ${Math.ceil(waitTime / 60)} more minutes`,
          next_available: new Date(new Date(lastSync.synced_at).getTime() + API_RATE_LIMITS.RESULTS_SYNC).toISOString(),
        });
      }
    }

    console.log('[Sync Control] 🏁 Manual results sync triggered');
    const startTime = Date.now();

    // Call results sync service
    const result = await resultsSyncService.syncTeamResultsFromHistory(30);

    const duration = Date.now() - startTime;

    // Log to database
    await supabase.logSync({
      endpoint: 'RESULTS_SYNC',
      status: 'success',
      items_synced: result.results_saved || 0,
      duration_ms: duration,
      synced_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Results sync completed',
      results_saved: result.results_saved,
      events_processed: result.events_discovered,
      duration_ms: duration,
    });
  } catch (error: any) {
    console.error('[Sync Control] ❌ Results sync failed:', error);
    
    await supabase.logSync({
      endpoint: 'RESULTS_SYNC',
      status: 'error',
      items_synced: 0,
      duration_ms: 0,
      error: error.message,
      synced_at: new Date().toISOString(),
    });

    res.status(500).json({
      error: 'Results sync failed',
      details: error.message,
    });
  }
});

/**
 * POST /api/sync-control/trigger/near-events
 * Manual trigger for near events sync
 */
router.post('/trigger/near-events', async (req: Request, res: Response) => {
  try {
    // Check rate limit
    const lastSync = await supabase.getLastSyncLog('NEAR_EVENT_SYNC');
    if (lastSync) {
      const timeSinceSync = Date.now() - new Date(lastSync.synced_at).getTime();
      if (timeSinceSync < API_RATE_LIMITS.NEAR_EVENT_SYNC) {
        const waitTime = Math.ceil((API_RATE_LIMITS.NEAR_EVENT_SYNC - timeSinceSync) / 1000);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Please wait ${waitTime} more seconds`,
          next_available: new Date(new Date(lastSync.synced_at).getTime() + API_RATE_LIMITS.NEAR_EVENT_SYNC).toISOString(),
        });
      }
    }

    console.log('[Sync Control] 📅 Manual near events sync triggered');

    // Call coordinated near events sync
    const result = await syncServiceV2.syncNearEventsCoordinated({
      intervalMinutes: 10,
      thresholdMinutes: 60 * 36, // 36 hours
      lookforwardHours: 36,
    });

    await supabase.logSync({
      endpoint: 'NEAR_EVENT_SYNC',
      status: result.status,
      items_synced: result.events_near || 0,
      duration_ms: result.duration_ms,
      synced_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Near events sync completed',
      events_near: result.events_near,
      signups_synced: result.signups_synced,
      duration_ms: result.duration_ms,
    });
  } catch (error: any) {
    console.error('[Sync Control] ❌ Near events sync failed:', error);
    
    await supabase.logSync({
      endpoint: 'NEAR_EVENT_SYNC',
      status: 'error',
      items_synced: 0,
      duration_ms: 0,
      error: error.message,
      synced_at: new Date().toISOString(),
    });

    res.status(500).json({
      error: 'Near events sync failed',
      details: error.message,
    });
  }
});

/**
 * POST /api/sync-control/trigger/far-events
 * Manual trigger for far events sync
 */
router.post('/trigger/far-events', async (req: Request, res: Response) => {
  try {
    // Check rate limit
    const lastSync = await supabase.getLastSyncLog('FAR_EVENT_SYNC');
    if (lastSync) {
      const timeSinceSync = Date.now() - new Date(lastSync.synced_at).getTime();
      if (timeSinceSync < API_RATE_LIMITS.FAR_EVENT_SYNC) {
        const waitTime = Math.ceil((API_RATE_LIMITS.FAR_EVENT_SYNC - timeSinceSync) / 1000);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Please wait ${Math.ceil(waitTime / 60)} more minutes`,
          next_available: new Date(new Date(lastSync.synced_at).getTime() + API_RATE_LIMITS.FAR_EVENT_SYNC).toISOString(),
        });
      }
    }

    console.log('[Sync Control] 📆 Manual far events sync triggered');

    // Call coordinated far events sync
    const result = await syncServiceV2.syncFarEventsCoordinated({
      intervalMinutes: 120,
      thresholdMinutes: 60 * 36, // 36 hours threshold
      lookforwardHours: 168, // 7 days
    });

    await supabase.logSync({
      endpoint: 'FAR_EVENT_SYNC',
      status: result.status,
      items_synced: result.events_scanned || 0,
      duration_ms: result.duration_ms,
      synced_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Far events sync completed',
      events_scanned: result.events_scanned,
      events_far: result.events_far,
      duration_ms: result.duration_ms,
    });
  } catch (error: any) {
    console.error('[Sync Control] ❌ Far events sync failed:', error);
    
    await supabase.logSync({
      endpoint: 'FAR_EVENT_SYNC',
      status: 'error',
      items_synced: 0,
      duration_ms: 0,
      error: error.message,
      synced_at: new Date().toISOString(),
    });

    res.status(500).json({
      error: 'Far events sync failed',
      details: error.message,
    });
  }
});

/**
 * GET /api/sync-control/scheduler/status
 * Get Smart Scheduler status
 */
router.get('/scheduler/status', (req: Request, res: Response) => {
  const status = smartSyncScheduler.getStatus();
  res.json({
    success: true,
    scheduler: status,
  });
});

export default router;
