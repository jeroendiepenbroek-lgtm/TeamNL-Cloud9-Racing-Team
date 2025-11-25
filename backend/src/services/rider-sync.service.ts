/**
 * Rider Sync Service
 * Handles synchronization of all club riders
 * 
 * Safe wrapper around existing sync services to prevent crashes
 * IMPORTANT: Shares lock with RiderSyncScheduler to prevent race conditions
 */

import { SyncServiceV2 } from './sync-v2.service.js';

// Shared lock tussen manual triggers en scheduled syncs
let globalRiderSyncLock = false;

export class RiderSyncService {
  private syncService: SyncServiceV2;

  constructor() {
    this.syncService = new SyncServiceV2();
  }

  /**
   * Check if rider sync is currently running
   */
  static isLocked(): boolean {
    return globalRiderSyncLock;
  }

  /**
   * Set global lock state (used by scheduler)
   */
  static setLock(locked: boolean): void {
    globalRiderSyncLock = locked;
  }

  /**
   * Sync all riders from club
   * Uses existing sync-v2 service with error handling
   * 
   * NOTE: Uses DIRECT sync (not coordinated) for manual triggers
   * to bypass time slot restrictions. Rate limiting is still enforced
   * by the sync-control endpoint cooldown system.
   * 
   * SAFETY: Checks global lock to prevent conflicts with scheduled syncs
   */
  async syncAllRiders(): Promise<void> {
    // Check if another sync is already running (manual OR scheduled)
    if (globalRiderSyncLock) {
      console.log('[RiderSync] ⏭️  Rider sync already in progress (by scheduler or another manual trigger), skipping...');
      throw new Error('Rider sync already in progress');
    }

    try {
      globalRiderSyncLock = true;
      console.log('[RiderSync] 🚀 Starting riders sync (manual trigger - bypassing coordinator)...');
      console.log('[RiderSync] 🔒 Lock acquired');
      
      // Use DIRECT sync method to bypass time slot restrictions
      // Rate limiting is handled by sync-control endpoint cooldown (5min)
      const metrics = await this.syncService.syncRiders({ 
        intervalMinutes: 60,
        clubId: 11818 
      });
      
      console.log('[RiderSync] ✅ Sync completed successfully');
      console.log(`[RiderSync] 📊 Processed: ${metrics.riders_processed} | New: ${metrics.riders_new} | Updated: ${metrics.riders_updated}`);
      
    } catch (error: any) {
      console.error('[RiderSync] ❌ Sync failed:', error.message);
      console.error('[RiderSync] Error details:', error.stack);
      throw error; // Re-throw voor sync-control error handling
    } finally {
      globalRiderSyncLock = false;
      console.log('[RiderSync] 🔓 Lock released');
    }
  }
}
