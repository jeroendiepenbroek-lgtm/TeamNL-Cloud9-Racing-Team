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
   */
  async syncAllRiders(): Promise<void> {
    try {
      console.log('[RiderSync] 🚀 Starting club members sync...');
      
      // Use existing sync-v2 service for riders
      await this.syncService.syncClubMembers();
      
      console.log('[RiderSync] ✅ Sync completed successfully');
      
    } catch (error: any) {
      console.error('[RiderSync] ❌ Sync failed:', error.message);
      // Don't re-throw - log error but don't crash
      console.error('[RiderSync] Error details:', error.stack);
    }
  }
}
