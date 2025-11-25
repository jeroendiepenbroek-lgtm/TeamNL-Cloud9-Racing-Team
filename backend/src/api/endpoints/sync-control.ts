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

const router = Router();

// Service instances
const riderSync = new RiderSyncService();
const resultsSync = new ResultsSyncService();
const eventSync = new SmartEventSyncService();

// Rate limiting: track last sync times (in-memory)
const lastSyncTimes = {
  riders: 0,
  results: 0,
  nearEvents: 0,
  farEvents: 0
};

// Cooldown periods (milliseconds)
const COOLDOWNS = {
  riders: 5 * 60 * 1000,      // 5 minutes
  results: 10 * 60 * 1000,    // 10 minutes
  nearEvents: 2 * 60 * 1000,  // 2 minutes
  farEvents: 30 * 60 * 1000   // 30 minutes
};

/**
 * GET /api/sync-control/status
 * Get current status of all sync services
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    
    const status = {
      timestamp: new Date().toISOString(),
      services: {
        riders: {
          name: 'Riders Sync',
          description: 'Sync all club riders (hourly)',
          lastSync: lastSyncTimes.riders ? new Date(lastSyncTimes.riders).toISOString() : null,
          canTrigger: now - lastSyncTimes.riders >= COOLDOWNS.riders,
          cooldownRemaining: Math.max(0, COOLDOWNS.riders - (now - lastSyncTimes.riders)),
          schedule: 'Every hour at :00'
        },
        results: {
          name: 'Results Sync',
          description: 'Sync race results (4-hourly)',
          lastSync: lastSyncTimes.results ? new Date(lastSyncTimes.results).toISOString() : null,
          canTrigger: now - lastSyncTimes.results >= COOLDOWNS.results,
          cooldownRemaining: Math.max(0, COOLDOWNS.results - (now - lastSyncTimes.results)),
          schedule: 'Every 4 hours at :30'
        },
        nearEvents: {
          name: 'Near Events Sync',
          description: 'Sync events starting within 7 days',
          lastSync: lastSyncTimes.nearEvents ? new Date(lastSyncTimes.nearEvents).toISOString() : null,
          canTrigger: now - lastSyncTimes.nearEvents >= COOLDOWNS.nearEvents,
          cooldownRemaining: Math.max(0, COOLDOWNS.nearEvents - (now - lastSyncTimes.nearEvents)),
          schedule: 'Every 15 minutes at :05, :20, :35, :50'
        },
        farEvents: {
          name: 'Far Events Sync',
          description: 'Sync events starting after 7 days',
          lastSync: lastSyncTimes.farEvents ? new Date(lastSyncTimes.farEvents).toISOString() : null,
          canTrigger: now - lastSyncTimes.farEvents >= COOLDOWNS.farEvents,
          cooldownRemaining: Math.max(0, COOLDOWNS.farEvents - (now - lastSyncTimes.farEvents)),
          schedule: 'Every 3 hours at :55'
        }
      },
      health: 'ok'
    };
    
    res.json({
      success: true,
      ...status
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
 * Manually trigger riders sync
 */
router.post('/trigger/riders', async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTimes.riders;
    
    // Rate limiting check
    if (timeSinceLastSync < COOLDOWNS.riders) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Please wait ${Math.ceil((COOLDOWNS.riders - timeSinceLastSync) / 1000)} seconds`,
        cooldownRemaining: COOLDOWNS.riders - timeSinceLastSync
      });
    }
    
    console.log('[SyncControl] Manual trigger: Riders sync');
    lastSyncTimes.riders = now;
    
    // Trigger sync (async, don't wait)
    riderSync.syncAllRiders().catch(error => {
      console.error('[SyncControl] Riders sync error:', error);
    });
    
    res.json({
      success: true,
      message: 'Riders sync triggered successfully',
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
 * Manually trigger results sync
 */
router.post('/trigger/results', async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTimes.results;
    
    if (timeSinceLastSync < COOLDOWNS.results) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Please wait ${Math.ceil((COOLDOWNS.results - timeSinceLastSync) / 1000)} seconds`,
        cooldownRemaining: COOLDOWNS.results - timeSinceLastSync
      });
    }
    
    console.log('[SyncControl] Manual trigger: Results sync');
    lastSyncTimes.results = now;
    
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
 * Manually trigger near events sync
 */
router.post('/trigger/near-events', async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTimes.nearEvents;
    
    if (timeSinceLastSync < COOLDOWNS.nearEvents) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Please wait ${Math.ceil((COOLDOWNS.nearEvents - timeSinceLastSync) / 1000)} seconds`,
        cooldownRemaining: COOLDOWNS.nearEvents - timeSinceLastSync
      });
    }
    
    console.log('[SyncControl] Manual trigger: Near events sync');
    lastSyncTimes.nearEvents = now;
    
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
 * Manually trigger far events sync
 */
router.post('/trigger/far-events', async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTimes.farEvents;
    
    if (timeSinceLastSync < COOLDOWNS.farEvents) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Please wait ${Math.ceil((COOLDOWNS.farEvents - timeSinceLastSync) / 1000)} seconds`,
        cooldownRemaining: COOLDOWNS.farEvents - timeSinceLastSync
      });
    }
    
    console.log('[SyncControl] Manual trigger: Far events sync');
    lastSyncTimes.farEvents = now;
    
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
