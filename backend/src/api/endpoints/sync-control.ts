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
 */

import { Router, Request, Response } from 'express';
import { syncServiceV2 } from '../../services/sync-v2.service.js';
import { resultsSyncService } from '../../services/results-sync.service.js';
import { supabase } from '../../services/supabase.service.js';
import { smartSyncScheduler } from '../../services/smart-sync-scheduler.service.js';

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
      if (!log || !log.synced_at) return true;
      const lastSync = new Date(log.synced_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSync.getTime()) / 60000;
      return diffMinutes >= cooldownMinutes;
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      rider_sync: {
        status: riderLog?.status || 'never_synced',
        last_synced: riderLog?.synced_at || null,
        items_synced: riderLog?.items_synced || 0,
        duration_ms: riderLog?.duration_ms || 0,
        can_trigger_now: canTrigger(riderLog, 15), // 15 min cooldown
      },
      results_sync: {
        status: resultsLog?.status || 'never_synced',
        last_synced: resultsLog?.synced_at || null,
        items_synced: resultsLog?.items_synced || 0,
        duration_ms: resultsLog?.duration_ms || 0,
        can_trigger_now: canTrigger(resultsLog, 10), // 10 min cooldown
      },
      near_event_sync: {
        status: nearLog?.status || 'never_synced',
        last_synced: nearLog?.synced_at || null,
        items_synced: nearLog?.items_synced || 0,
        duration_ms: nearLog?.duration_ms || 0,
        can_trigger_now: canTrigger(nearLog, 2), // 2 min cooldown
      },
      far_event_sync: {
        status: farLog?.status || 'never_synced',
        last_synced: farLog?.synced_at || null,
        items_synced: farLog?.items_synced || 0,
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
    // Check rate limit (15 min)
    const lastLog = await supabase.getLastSyncLog('/sync/riders');
    if (lastLog && lastLog.synced_at) {
      const lastSync = new Date(lastLog.synced_at);
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

    const startTime = Date.now();
    console.log('🔄 Manual rider sync triggered...');

    const result = await syncServiceV2.syncRidersCoordinated({
      intervalMinutes: 60,
      clubId: 11818,
    });

    const duration = Date.now() - startTime;

    // Log sync
    await supabase.logSync({
      endpoint: '/sync/riders',
      status: 'success',
      items_synced: result.ridersProcessed || 0,
      duration_ms: duration,
      synced_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Rider sync voltooid',
      items_synced: result.ridersProcessed,
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
      synced_at: new Date().toISOString(),
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
    // Check rate limit (10 min)
    const lastLog = await supabase.getLastSyncLog('/sync/results');
    if (lastLog && lastLog.synced_at) {
      const lastSync = new Date(lastLog.synced_at);
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

    const startTime = Date.now();
    console.log('🔄 Manual results sync triggered...');

    const result = await resultsSyncService.syncTeamResultsFromHistory(30);

    const duration = Date.now() - startTime;

    // Log sync
    await supabase.logSync({
      endpoint: '/sync/results',
      status: 'success',
      items_synced: result.totalResultsSynced || 0,
      duration_ms: duration,
      synced_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Results sync voltooid',
      items_synced: result.totalResultsSynced,
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
      synced_at: new Date().toISOString(),
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
    // Check rate limit (2 min)
    const lastLog = await supabase.getLastSyncLog('/sync/near-events');
    if (lastLog && lastLog.synced_at) {
      const lastSync = new Date(lastLog.synced_at);
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

    const startTime = Date.now();
    console.log('🔄 Manual near events sync triggered...');

    const result = await syncServiceV2.syncNearEventsCoordinated({
      intervalMinutes: 10,
      thresholdMinutes: 2160, // 36 hours
      lookforwardHours: 36,
    });

    const duration = Date.now() - startTime;

    // Log sync
    await supabase.logSync({
      endpoint: '/sync/near-events',
      status: 'success',
      items_synced: result.eventsProcessed || 0,
      duration_ms: duration,
      synced_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Near events sync voltooid',
      items_synced: result.eventsProcessed,
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
      synced_at: new Date().toISOString(),
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
    // Check rate limit (30 min)
    const lastLog = await supabase.getLastSyncLog('/sync/far-events');
    if (lastLog && lastLog.synced_at) {
      const lastSync = new Date(lastLog.synced_at);
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

    const startTime = Date.now();
    console.log('🔄 Manual far events sync triggered...');

    const result = await syncServiceV2.syncFarEventsCoordinated({
      intervalMinutes: 120,
      thresholdMinutes: 2160, // 36 hours
      lookforwardHours: 168, // 7 days
    });

    const duration = Date.now() - startTime;

    // Log sync
    await supabase.logSync({
      endpoint: '/sync/far-events',
      status: 'success',
      items_synced: result.eventsProcessed || 0,
      duration_ms: duration,
      synced_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Far events sync voltooid',
      items_synced: result.eventsProcessed,
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
      synced_at: new Date().toISOString(),
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

export default router;
