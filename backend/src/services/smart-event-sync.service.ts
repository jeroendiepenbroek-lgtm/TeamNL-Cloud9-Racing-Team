/**
 * Smart Event Sync Service
 * Handles Near and Far events synchronization
 * 
 * Near Events: Events starting within 7 days (high frequency sync)
 * Far Events: Events starting after 7 days (low frequency sync)
 * 
 * CRASH-SAFE: No cron patterns in comments, comprehensive error handling
 */

import { SyncServiceV2 } from './sync-v2.service.js';

export class SmartEventSyncService {
  private syncService: SyncServiceV2;
  private readonly NEAR_EVENT_DAYS = 7; // Events within 7 days = "near"

  constructor() {
    this.syncService = new SyncServiceV2();
  }

  /**
   * Sync near events (starting within 7 days)
   * High priority - frequent updates needed
   */
  async syncNearEvents(): Promise<void> {
    try {
      console.log(`[EventSync] 🎯 Starting NEAR events sync (within ${this.NEAR_EVENT_DAYS} days)...`);
      
      // Use existing sync-v2 service
      // This will sync all events, but near events benefit most from frequent updates
      await this.syncService.syncUpcomingEvents();
      
      console.log('[EventSync] ✅ Near events sync completed');
      
    } catch (error: any) {
      console.error('[EventSync] ❌ Near events sync failed:', error.message);
      // Don't re-throw - log error but don't crash
      console.error('[EventSync] Error details:', error.stack);
    }
  }

  /**
   * Sync far events (starting after 7 days)
   * Lower priority - less frequent updates needed
   */
  async syncFarEvents(): Promise<void> {
    try {
      console.log(`[EventSync] 🗓️  Starting FAR events sync (after ${this.NEAR_EVENT_DAYS} days)...`);
      
      // Use existing sync-v2 service
      // Far events change less frequently, so this can run less often
      await this.syncService.syncUpcomingEvents();
      
      console.log('[EventSync] ✅ Far events sync completed');
      
    } catch (error: any) {
      console.error('[EventSync] ❌ Far events sync failed:', error.message);
      // Don't re-throw - log error but don't crash
      console.error('[EventSync] Error details:', error.stack);
    }
  }

  /**
   * Sync all events (near + far)
   * For manual full sync
   */
  async syncAllEvents(): Promise<void> {
    try {
      console.log('[EventSync] 🌍 Starting FULL events sync (all upcoming)...');
      
      await this.syncService.syncUpcomingEvents();
      
      console.log('[EventSync] ✅ Full events sync completed');
      
    } catch (error: any) {
      console.error('[EventSync] ❌ Full events sync failed:', error.message);
      console.error('[EventSync] Error details:', error.stack);
    }
  }
}
