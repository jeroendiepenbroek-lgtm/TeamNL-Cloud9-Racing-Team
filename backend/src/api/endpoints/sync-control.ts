/**
 * Sync Control API - Modern Dashboard Backend
 * 
 * Provides unified control for all sync services:
 * - Riders Sync (hourly)
 * - Results Sync (4-hourly) 
 * - Near Events Sync (15min)
 * - Far Events Sync (3-hourly)
 * 
 * SAFE IMPLEMENTATION:
 * - No cron patterns in comments (ESBuild parser bug prevention)
 * - Manual triggers with rate limiting
 * - Comprehensive error handling
 * - Real-time status tracking
 */

import { Router, Request, Response } from 'express';
import { RiderSyncService } from '../../services/rider-sync.service.js';
import { ResultsSyncService } from '../../services/results-sync.service.js';
import { SmartEventSyncService } from '../../services/smart-event-sync.service.js';
import { supabase } from '../../services/supabase.service.js';

const router = Router();

// Service instances
const riderSync = new RiderSyncService();
const resultsSync = new ResultsSyncService();
const eventSync = new SmartEventSyncService();

// API Rate limits (based on ZwiftRacing API documentation)
const API_RATE_LIMITS = {
  riders: 15 * 60 * 1000,      // POST /public/riders = 1 call / 15 min
  results: 10 * 60 * 1000,     // Results sync = 10 min
  nearEvents: 2 * 60 * 1000,   // Near events = 2 min
  farEvents: 30 * 60 * 1000   // Far events = 30 min
};

/**
 * Get last successful sync time from database
 * Ensures accurate rate limiting across server restarts
 * Uses optimized single-query method
 */
async function getLastSuccessfulSync(syncType: string): Promise<Date | null> {
  try {
    return await supabase.getLastSuccessfulSync(syncType);
  } catch (error) {
    console.error('[SyncControl] Failed to get last sync for ' + syncType + ':', error);
    return null;
  }
}

/**
 * Calculate sync status (can trigger + cooldown remaining)
 */
function calculateStatus(lastSync: Date | null, rateLimit: number) {
  if (!lastSync) {
    return {
      canTrigger: true,
      cooldownRemaining: 0
    };
  }
  const now = Date.now();
  const timeSince = now - lastSync.getTime();
  return {
    canTrigger: timeSince >= rateLimit,
    cooldownRemaining: Math.max(0, rateLimit - timeSince)
  };
}

/**
 * GET /api/sync-control/status
 * Get current status of all sync services (database-based)
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Get last successful syncs from database
    const [ridersLastSync, resultsLastSync, nearEventsLastSync, farEventsLastSync] = await Promise.all([
      getLastSuccessfulSync('RIDER_SYNC'),
      getLastSuccessfulSync('RESULTS_SYNC'),
      getLastSuccessfulSync('NEAR_EVENT_SYNC'),
      getLastSuccessfulSync('FAR_EVENT_SYNC')
    ]);
    
    // Calculate status for each service
    const ridersStatus = calculateStatus(ridersLastSync, API_RATE_LIMITS.riders);
    const resultsStatus = calculateStatus(resultsLastSync, API_RATE_LIMITS.results);
    const nearEventsStatus = calculateStatus(nearEventsLastSync, API_RATE_LIMITS.nearEvents);
    const farEventsStatus = calculateStatus(farEventsLastSync, API_RATE_LIMITS.farEvents);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      services: {
        riders: {
          name: 'Riders Sync',
          description: 'Sync all club riders (bulk API call)',
          lastSync: ridersLastSync?.toISOString() || null,
          canTrigger: ridersStatus.canTrigger,
          cooldownRemaining: ridersStatus.cooldownRemaining,
          schedule: 'Every hour at :00',
          rateLimit: '15 minutes (API limit)'
        },
        results: {
          name: 'Results Sync',
          description: 'Sync race results (4-hourly)',
          lastSync: resultsLastSync?.toISOString() || null,
          canTrigger: resultsStatus.canTrigger,
          cooldownRemaining: resultsStatus.cooldownRemaining,
          schedule: 'Every 4 hours at :30',
          rateLimit: '10 minutes'
        },
        nearEvents: {
          name: 'Near Events Sync',
          description: 'Sync events starting within 7 days',
          lastSync: nearEventsLastSync?.toISOString() || null,
          canTrigger: nearEventsStatus.canTrigger,
          cooldownRemaining: nearEventsStatus.cooldownRemaining,
          schedule: 'Every 15 minutes at :05, :20, :35, :50',
          rateLimit: '2 minutes'
        },
        farEvents: {
          name: 'Far Events Sync',
          description: 'Sync events starting after 7 days',
          lastSync: farEventsLastSync?.toISOString() || null,
          canTrigger: farEventsStatus.canTrigger,
          cooldownRemaining: farEventsStatus.cooldownRemaining,
          schedule: 'Every 3 hours at :55',
          rateLimit: '30 minutes'
        }
      },
      health: 'ok'
    });
    
  } catch (error: any) {
    console.error('[SyncControl] Status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      message: error.message
    });
  }
});

/**
 * POST /api/sync-control/trigger/riders
 * Manually trigger riders sync with database-based rate limiting
 */
router.post('/trigger/riders', async (req: Request, res: Response) => {
  try {
    // Check last successful sync from DATABASE
    const lastSync = await getLastSuccessfulSync('RIDER_SYNC');
    const now = Date.now();
    
    if (lastSync) {
      const timeSinceLastSync = now - lastSync.getTime();
      const apiRateLimit = API_RATE_LIMITS.riders; // 15 minutes
      
      if (timeSinceLastSync < apiRateLimit) {
        const waitSeconds = Math.ceil((apiRateLimit - timeSinceLastSync) / 1000);
        const waitMinutes = Math.floor(waitSeconds / 60);
        const remainingSeconds = waitSeconds % 60;
        
        return res.status(429).json({
          success: false,
          error: 'API rate limit active',
          message: `ZwiftRacing API allows 1 bulk rider sync per 15 minutes. Last successful sync was ${Math.floor(timeSinceLastSync / 60000)}m ago. Please wait ${waitMinutes}m ${remainingSeconds}s.`,
          cooldownRemaining: apiRateLimit - timeSinceLastSync,
          lastSync: lastSync.toISOString(),
          nextAvailable: new Date(lastSync.getTime() + apiRateLimit).toISOString()
        });
      }
    }
    
    console.log('[SyncControl] Manual trigger: Riders sync (rate limit passed)');
    
    await riderSync.syncAllRiders();
    
    res.json({
      success: true,
      message: 'Riders sync completed successfully',
      triggeredAt: new Date(now).toISOString()
    });
    
  } catch (error: any) {
    console.error('[SyncControl] Riders trigger error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger riders sync',
      message: error.message
    });
  }
});

/**
 * POST /api/sync-control/trigger/results
 * Manually trigger results sync with database-based rate limiting
 */
router.post('/trigger/results', async (req: Request, res: Response) => {
  try {
    const lastSync = await getLastSuccessfulSync('RESULTS_SYNC');
    const now = Date.now();
    
    if (lastSync) {
      const timeSinceLastSync = now - lastSync.getTime();
      const rateLimit = API_RATE_LIMITS.results;
      
      if (timeSinceLastSync < rateLimit) {
        const waitSeconds = Math.ceil((rateLimit - timeSinceLastSync) / 1000);
        const waitMinutes = Math.floor(waitSeconds / 60);
        
        return res.status(429).json({
          success: false,
          error: 'Rate limit active',
          message: 'Please wait ' + waitMinutes + 'm ' + (waitSeconds % 60) + 's before triggering results sync.',
          cooldownRemaining: rateLimit - timeSinceLastSync,
          lastSync: lastSync.toISOString()
        });
      }
    }
    
    console.log('[SyncControl] Manual trigger: Results sync');
    
    resultsSync.syncAllResults().catch(error => {
      console.error('[SyncControl] Results sync error:', error);
    });
    
    res.json({
      success: true,
      message: 'Results sync triggered successfully',
      triggeredAt: new Date(now).toISOString()
    });
    
  } catch (error: any) {
    console.error('[SyncControl] Results trigger error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger results sync',
      message: error.message
    });
  }
});

/**
 * POST /api/sync-control/trigger/near-events
 * Manually trigger near events sync with database-based rate limiting
 */
router.post('/trigger/near-events', async (req: Request, res: Response) => {
  try {
    const lastSync = await getLastSuccessfulSync('NEAR_EVENT_SYNC');
    const now = Date.now();
    
    if (lastSync) {
      const timeSinceLastSync = now - lastSync.getTime();
      const rateLimit = API_RATE_LIMITS.nearEvents;
      
      if (timeSinceLastSync < rateLimit) {
        const waitSeconds = Math.ceil((rateLimit - timeSinceLastSync) / 1000);
        
        return res.status(429).json({
          success: false,
          error: 'Rate limit active',
          message: 'Please wait ' + waitSeconds + 's before triggering near events sync.',
          cooldownRemaining: rateLimit - timeSinceLastSync,
          lastSync: lastSync.toISOString()
        });
      }
    }
    
    console.log('[SyncControl] Manual trigger: Near events sync');
    
    eventSync.syncNearEvents().catch(error => {
      console.error('[SyncControl] Near events sync error:', error);
    });
    
    res.json({
      success: true,
      message: 'Near events sync triggered successfully',
      triggeredAt: new Date(now).toISOString()
    });
    
  } catch (error: any) {
    console.error('[SyncControl] Near events trigger error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger near events sync',
      message: error.message
    });
  }
});

/**
 * POST /api/sync-control/trigger/far-events
 * Manually trigger far events sync with database-based rate limiting
 */
router.post('/trigger/far-events', async (req: Request, res: Response) => {
  try {
    const lastSync = await getLastSuccessfulSync('FAR_EVENT_SYNC');
    const now = Date.now();
    
    if (lastSync) {
      const timeSinceLastSync = now - lastSync.getTime();
      const rateLimit = API_RATE_LIMITS.farEvents;
      
      if (timeSinceLastSync < rateLimit) {
        const waitSeconds = Math.ceil((rateLimit - timeSinceLastSync) / 1000);
        const waitMinutes = Math.floor(waitSeconds / 60);
        
        return res.status(429).json({
          success: false,
          error: 'Rate limit active',
          message: 'Please wait ' + waitMinutes + 'm ' + (waitSeconds % 60) + 's before triggering far events sync.',
          cooldownRemaining: rateLimit - timeSinceLastSync,
          lastSync: lastSync.toISOString()
        });
      }
    }
    
    console.log('[SyncControl] Manual trigger: Far events sync');
    
    eventSync.syncFarEvents().catch(error => {
      console.error('[SyncControl] Far events sync error:', error);
    });
    
    res.json({
      success: true,
      message: 'Far events sync triggered successfully',
      triggeredAt: new Date(now).toISOString()
    });
    
  } catch (error: any) {
    console.error('[SyncControl] Far events trigger error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger far events sync',
      message: error.message
    });
  }
});

/**
 * GET /api/sync-control/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
