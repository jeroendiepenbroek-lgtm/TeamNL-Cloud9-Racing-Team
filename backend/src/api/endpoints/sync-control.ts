/**
 * Unified Sync Control Center
 * US4: Centrale controle voor alle sync operaties
 * 
 * Endpoints:
 * - GET /metrics - Status van alle 4 sync types
 * - POST /trigger/riders - Handmatig rider sync triggeren
 * - POST /trigger/results - Handmatig results sync triggeren
 * - POST /trigger/near-events - Handmatig near events sync triggeren
 * - POST /trigger/far-events - Handmatig far events sync triggeren
 * - GET /scheduler/status - Smart scheduler status
 * 
 * NIEUWE BATCH ENDPOINTS:
 * - POST /batch - Geïntegreerde batch sync (alle 4 syncs in optimale volgorde)
 * - POST /smart - Smart sync (alleen wat nodig is gebaseerd op tijd + events)
 * - GET /batch/status - Status van batch coordinator
 */

import { Router, Request, Response } from 'express';
import { syncServiceV2 } from '../../services/sync-v2.service.js';
import { resultsSyncService } from '../../services/results-sync.service.js';
import { supabase } from '../../services/supabase.service.js';
import { smartSyncScheduler } from '../../services/smart-sync-scheduler.service.js';
import { integratedSyncCoordinator } from '../../services/integrated-sync-coordinator.service.js';

const router = Router();

/**
 * GET /api/sync-control/metrics
 * Haal status van alle 4 sync types op
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    // Haal laatste sync logs op voor elk type
    const riderLog = await supabase.getLastSyncLog('/sync/riders');
    const resultsLog = await supabase.getLastSyncLog('/sync/results');
    const nearLog = await supabase.getLastSyncLog('/sync/near-events');
    const farLog = await supabase.getLastSyncLog('/sync/far-events');

    // Helper functie voor rate limit check
    const canTrigger = (log: any, cooldownMinutes: number): boolean => {
      if (!log || !log.created_at) return true;
      const lastSync = new Date(log.created_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSync.getTime()) / 60000;
      return diffMinutes >= cooldownMinutes;
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      rider_sync: {
        status: riderLog?.status || 'never_synced',
        last_synced: riderLog?.created_at || null,
        items_synced: riderLog?.records_processed || 0,
        duration_ms: riderLog?.duration_ms || 0,
        can_trigger_now: canTrigger(riderLog, 15), // 15 min cooldown
      },
      results_sync: {
        status: resultsLog?.status || 'never_synced',
        last_synced: resultsLog?.created_at || null,
        items_synced: resultsLog?.records_processed || 0,
        duration_ms: resultsLog?.duration_ms || 0,
        can_trigger_now: canTrigger(resultsLog, 10), // 10 min cooldown
      },
      near_event_sync: {
        status: nearLog?.status || 'never_synced',
        last_synced: nearLog?.created_at || null,
        items_synced: nearLog?.records_processed || 0,
        duration_ms: nearLog?.duration_ms || 0,
        can_trigger_now: canTrigger(nearLog, 2), // 2 min cooldown
      },
      far_event_sync: {
        status: farLog?.status || 'never_synced',
        last_synced: farLog?.created_at || null,
        items_synced: farLog?.records_processed || 0,
        duration_ms: farLog?.duration_ms || 0,
        can_trigger_now: canTrigger(farLog, 30), // 30 min cooldown
      },
    });
  } catch (error: any) {
    console.error('Error fetching sync metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync metrics',
      message: error.message,
    });
  }
});

/**
 * POST /api/sync-control/trigger/riders
 * Trigger handmatige rider sync
 */
router.post('/trigger/riders', async (req: Request, res: Response) => {
  try {
    const forceSync = req.query.force === 'true';
    
    // Check rate limit (15 min) - skip if force=true
    if (!forceSync) {
      const lastLog = await supabase.getLastSyncLog('/sync/riders');
      if (lastLog && lastLog.created_at) {
        const lastSync = new Date(lastLog.created_at);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastSync.getTime()) / 60000;
        if (diffMinutes < 15) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit',
            message: `Wacht nog ${Math.ceil(15 - diffMinutes)} minuten voor volgende sync`,
            next_available: new Date(lastSync.getTime() + 15 * 60000).toISOString(),
          });
        }
      }
    }

    const startTime = Date.now();
    console.log('🔄 Manual rider sync triggered...');

    const result = await syncServiceV2.syncRidersCoordinated({
      intervalMinutes: 60,
      clubId: 11818,
      force: true, // Bypass time slot check
    });

    const duration = Date.now() - startTime;

    // Log sync
    await supabase.logSync({
      endpoint: '/sync/riders',
      status: 'success',
      items_synced: result.riders_processed || 0,
      duration_ms: duration,
      // created_at wordt automatisch gezet door database
    });

    res.json({
      success: true,
      message: 'Rider sync voltooid',
      items_synced: result.riders_processed,
      duration_ms: duration,
    });
  } catch (error: any) {
    console.error('Error triggering rider sync:', error);
    
    // Log error
    await supabase.logSync({
      endpoint: '/sync/riders',
      status: 'error',
      items_synced: 0,
      duration_ms: 0,
      error: error.message,
      // created_at wordt automatisch gezet door database
    });

    res.status(500).json({
      success: false,
      error: 'Rider sync failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/sync-control/trigger/results
 * Trigger handmatige results sync
 */
router.post('/trigger/results', async (req: Request, res: Response) => {
  try {
    const forceSync = req.query.force === 'true';
    
    // Check rate limit (10 min) - skip if force=true
    if (!forceSync) {
      const lastLog = await supabase.getLastSyncLog('/sync/results');
      if (lastLog && lastLog.created_at) {
        const lastSync = new Date(lastLog.created_at);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastSync.getTime()) / 60000;
        if (diffMinutes < 10) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit',
            message: `Wacht nog ${Math.ceil(10 - diffMinutes)} minuten voor volgende sync`,
            next_available: new Date(lastSync.getTime() + 10 * 60000).toISOString(),
          });
        }
      }
    }

    const startTime = Date.now();
    console.log('🔄 Manual results sync triggered...');

    const result = await resultsSyncService.syncTeamResultsFromHistory(30);

    const duration = Date.now() - startTime;

    // Log sync
    await supabase.logSync({
      endpoint: '/sync/results',
      status: 'success',
      items_synced: result.total_results_synced || 0,
      duration_ms: duration,
      // created_at wordt automatisch gezet door database
    });

    res.json({
      success: true,
      message: 'Results sync voltooid',
      items_synced: result.total_results_synced,
      duration_ms: duration,
      details: result,
    });
  } catch (error: any) {
    console.error('Error triggering results sync:', error);
    
    // Log error
    await supabase.logSync({
      endpoint: '/sync/results',
      status: 'error',
      items_synced: 0,
      duration_ms: 0,
      error: error.message,
      // created_at wordt automatisch gezet door database
    });

    res.status(500).json({
      success: false,
      error: 'Results sync failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/sync-control/trigger/near-events
 * Trigger handmatige near events sync
 */
router.post('/trigger/near-events', async (req: Request, res: Response) => {
  try {
    const forceSync = req.query.force === 'true';
    
    // Check rate limit (2 min) - skip if force=true
    if (!forceSync) {
      const lastLog = await supabase.getLastSyncLog('/sync/near-events');
      if (lastLog && lastLog.created_at) {
        const lastSync = new Date(lastLog.created_at);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastSync.getTime()) / 60000;
        if (diffMinutes < 2) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit',
            message: `Wacht nog ${Math.ceil(2 - diffMinutes)} minuten voor volgende sync`,
            next_available: new Date(lastSync.getTime() + 2 * 60000).toISOString(),
          });
        }
      }
    }

    const startTime = Date.now();
    console.log('🔄 Manual near events sync triggered...');

    const result = await syncServiceV2.syncNearEventsCoordinated({
      intervalMinutes: 10,
      thresholdMinutes: 2160, // 36 hours
      lookforwardHours: 36,
      force: true, // Bypass time slot check
    });

    const duration = Date.now() - startTime;

    // Log sync
    await supabase.logSync({
      endpoint: '/sync/near-events',
      status: 'success',
      items_synced: result.events_processed || 0,
      duration_ms: duration,
      // created_at wordt automatisch gezet door database
    });

    res.json({
      success: true,
      message: 'Near events sync voltooid',
      items_synced: result.events_processed,
      duration_ms: duration,
    });
  } catch (error: any) {
    console.error('Error triggering near events sync:', error);
    
    // Log error
    await supabase.logSync({
      endpoint: '/sync/near-events',
      status: 'error',
      items_synced: 0,
      duration_ms: 0,
      error: error.message,
      // created_at wordt automatisch gezet door database
    });

    res.status(500).json({
      success: false,
      error: 'Near events sync failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/sync-control/trigger/far-events
 * Trigger handmatige far events sync
 */
router.post('/trigger/far-events', async (req: Request, res: Response) => {
  try {
    const forceSync = req.query.force === 'true';
    
    // Check rate limit (30 min) - skip if force=true
    if (!forceSync) {
      const lastLog = await supabase.getLastSyncLog('/sync/far-events');
      if (lastLog && lastLog.created_at) {
        const lastSync = new Date(lastLog.created_at);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastSync.getTime()) / 60000;
        if (diffMinutes < 30) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit',
            message: `Wacht nog ${Math.ceil(30 - diffMinutes)} minuten voor volgende sync`,
            next_available: new Date(lastSync.getTime() + 30 * 60000).toISOString(),
          });
        }
      }
    }

    const startTime = Date.now();
    console.log('🔄 Manual far events sync triggered...');

    const result = await syncServiceV2.syncFarEventsCoordinated({
      intervalMinutes: 120,
      thresholdMinutes: 2160, // 36 hours
      lookforwardHours: 168, // 7 days
      force: true, // Bypass time slot check & sync all events
    });

    const duration = Date.now() - startTime;

    // Log sync
    await supabase.logSync({
      endpoint: '/sync/far-events',
      status: 'success',
      items_synced: result.events_processed || 0,
      duration_ms: duration,
      // created_at wordt automatisch gezet door database
    });

    res.json({
      success: true,
      message: 'Far events sync voltooid',
      items_synced: result.events_processed,
      duration_ms: duration,
    });
  } catch (error: any) {
    console.error('Error triggering far events sync:', error);
    
    // Log error
    await supabase.logSync({
      endpoint: '/sync/far-events',
      status: 'error',
      items_synced: 0,
      duration_ms: 0,
      error: error.message,
      // created_at wordt automatisch gezet door database
    });

    res.status(500).json({
      success: false,
      error: 'Far events sync failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/sync-control/scheduler/status
 * Haal smart scheduler status op
 */
router.get('/scheduler/status', (req: Request, res: Response) => {
  try {
    const status = smartSyncScheduler.getStatus();
    res.json({
      success: true,
      scheduler: status,
    });
  } catch (error: any) {
    console.error('Error fetching scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduler status',
      message: error.message,
    });
  }
});

/**
 * POST /api/sync-control/batch
 * NIEUWE: Voer alle 4 syncs uit in geïntegreerde batch
 * Query params:
 *   - force=true: Force sync (bypass rate limits)
 *   - skipRiders=true: Skip rider sync
 *   - skipEvents=true: Skip event sync
 *   - skipResults=true: Skip results sync
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const force = req.query.force === 'true';
    const skipRiders = req.query.skipRiders === 'true';
    const skipEvents = req.query.skipEvents === 'true';
    const skipResults = req.query.skipResults === 'true';

    console.log('🚀 Manual BATCH sync triggered...');
    console.log(`   Options: force=${force}, skipRiders=${skipRiders}, skipEvents=${skipEvents}, skipResults=${skipResults}`);

    const metrics = await integratedSyncCoordinator.executeBatchSync({
      force,
      skipRiders,
      skipEvents,
      skipResults
    });

    res.json({
      success: true,
      message: 'Batch sync completed',
      metrics,
      duration_minutes: (metrics.total_duration_ms / 1000 / 60).toFixed(2)
    });
  } catch (error: any) {
    console.error('Error triggering batch sync:', error);
    res.status(500).json({
      success: false,
      error: 'Batch sync failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/sync-control/smart
 * NIEUWE: Smart sync - alleen wat nodig is
 */
router.post('/smart', async (req: Request, res: Response) => {
  try {
    console.log('🧠 Manual SMART sync triggered...');

    const metrics = await integratedSyncCoordinator.executeSmartSync();

    res.json({
      success: true,
      message: 'Smart sync completed',
      metrics,
      duration_minutes: (metrics.total_duration_ms / 1000 / 60).toFixed(2)
    });
  } catch (error: any) {
    console.error('Error triggering smart sync:', error);
    res.status(500).json({
      success: false,
      error: 'Smart sync failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/sync-control/batch/status
 * Status van integrated sync coordinator
 */
router.get('/batch/status', (req: Request, res: Response) => {
  try {
    const status = integratedSyncCoordinator.getStatus();
    res.json({
      success: true,
      batch_sync: status,
    });
  } catch (error: any) {
    console.error('Error fetching batch status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch status',
      message: error.message,
    });
  }
});

export default router;
