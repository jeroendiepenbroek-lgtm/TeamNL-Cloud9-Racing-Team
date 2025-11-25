/**
 * Rider Sync Service
 * Handles synchronization of all club riders
 * 
 * Safe wrapper around existing sync services to prevent crashes
 */

import { SyncServiceV2 } from './sync-v2.service.js';

export class RiderSyncService {
  private syncService: SyncServiceV2;

  constructor() {
    this.syncService = new SyncServiceV2();
  }

  /**
   * Sync all riders from club
   * Uses existing sync-v2 service with error handling
   * 
   * NOTE: Uses DIRECT sync (not coordinated) for manual triggers
   * to bypass time slot restrictions. Rate limiting is still enforced
   * by the sync-control endpoint cooldown system.
   */
  async syncAllRiders(): Promise<void> {
    try {
      console.log('[RiderSync] 🚀 Starting riders sync (manual trigger - bypassing coordinator)...');
      
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
      // Don't re-throw - log error but don't crash
      console.error('[RiderSync] Error details:', error.stack);
    }
  }
}
