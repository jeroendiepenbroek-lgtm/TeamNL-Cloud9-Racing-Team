/**
 * Rider Sync Scheduler
 * Periodiek riders synchroniseren (configureerbaar interval)
 */

import { syncServiceV2 as syncService } from '../services/sync-v2.service.js';
import { syncConfigService } from '../services/sync-config.service.js';

const TEAM_CLUB_ID = 11818;

export class RiderSyncScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;

  start() {
    const config = syncConfigService.getConfig();
    
    if (!config.riderSyncEnabled) {
      console.log('[RiderSync] ⏸️  Rider sync is disabled in config');
      return;
    }

    console.log('[RiderSync] 🏃 Starting rider sync scheduler...');
    console.log('[RiderSync] Config:', {
      enabled: config.riderSyncEnabled,
      interval: `${config.riderSyncIntervalMinutes}min (${config.riderSyncIntervalMinutes / 60}h)`,
    });
    
    // Initial sync
    this.syncRiders();
    
    // Schedule periodic syncs
    this.intervalId = setInterval(() => {
      this.syncRiders();
    }, syncConfigService.getRiderSyncIntervalMs());
    
    console.log(`[RiderSync] ✅ Scheduler started (syncs every ${config.riderSyncIntervalMinutes} min)`);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[RiderSync] ⏹️  Scheduler stopped');
    }
  }
  
  restart() {
    console.log('[RiderSync] 🔄 Restarting with new configuration...');
    this.stop();
    this.start();
  }

  private async syncRiders() {
    if (this.isSyncing) {
      console.log('[RiderSync] ⏭️  Already syncing, skipping...');
      return;
    }

    try {
      this.isSyncing = true;
      console.log('[RiderSync] 🔄 Starting rider sync...');
      
      const metrics = await syncService.syncRiders({ intervalMinutes: 60, clubId: TEAM_CLUB_ID });
      
      console.log(`[RiderSync] ✅ Synced ${metrics.riders_processed} riders from club ${TEAM_CLUB_ID}`);
    } catch (error: any) {
      console.error('[RiderSync] ❌ Rider sync failed:', error.message);
    } finally {
      this.isSyncing = false;
    }
  }
  
  // Manual trigger
  async syncNow(): Promise<{ success: boolean; count?: number; error?: string }> {
    if (this.isSyncing) {
      return {
        success: false,
        error: 'Rider sync already in progress'
      };
    }

    try {
      this.isSyncing = true;
      const metrics = await syncService.syncRiders({ intervalMinutes: 60, clubId: TEAM_CLUB_ID });
      return {
        success: true,
        count: metrics.riders_processed
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const riderSyncScheduler = new RiderSyncScheduler();
