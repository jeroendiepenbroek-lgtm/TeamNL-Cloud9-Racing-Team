/**
 * Rider Sync Scheduler
 * Periodiek riders synchroniseren (configureerbaar interval)
 */

import { syncServiceV2 as syncService } from '../services/sync-v2.service.js';
import { syncConfigService } from '../services/sync-config.service.js';
import { RiderSyncService } from '../services/rider-sync.service.js';
import { supabase } from '../services/supabase.service.js';

const TEAM_CLUB_ID = 11818;

export class RiderSyncScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  // Note: isSyncing is now managed via RiderSyncService.isLocked() for shared state

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
    // Check shared lock (prevents conflicts with manual triggers)
    if (RiderSyncService.isLocked()) {
      console.log('[RiderSync Scheduler] ⏭️  Rider sync already in progress (manual trigger or previous run), skipping...');
      return;
    }

    try {
      RiderSyncService.setLock(true);
      console.log('[RiderSync Scheduler] 🔄 Checking database cooldown...');
      
      // ✅ CHECK DATABASE COOLDOWN (15 min API limit)
      const logs = await supabase.getSyncLogs(50);
      const lastSuccess = logs.find(l => l.endpoint === 'RIDER_SYNC' && l.status === 'success');
      
      if (lastSuccess) {
        const timeSince = Date.now() - new Date(lastSuccess.created_at).getTime();
        const minutesSince = Math.floor(timeSince / 60000);
        const cooldownMinutes = 15; // API rate limit
        
        if (timeSince < cooldownMinutes * 60 * 1000) {
          const waitMin = cooldownMinutes - minutesSince;
          console.log(`[RiderSync Scheduler] ⏰ Cooldown active: last sync ${minutesSince}min ago, waiting ${waitMin}min`);
          return;
        }
        
        console.log(`[RiderSync Scheduler] ✅ Cooldown OK: last sync ${minutesSince}min ago`);
      }
      
      console.log('[RiderSync Scheduler] 🔒 Lock acquired');
      
      // ✅ FIXED: Use DIRECT sync (no coordinator time slots)
      // Database cooldowns prevent rate limit violations
      const metrics = await syncService.syncRiders({ intervalMinutes: 60, clubId: TEAM_CLUB_ID });
      
      console.log(`[RiderSync Scheduler] ✅ Synced ${metrics.riders_processed} riders from club ${TEAM_CLUB_ID}`);
    } catch (error: any) {
      console.error('[RiderSync Scheduler] ❌ Rider sync failed:', error.message);
    } finally {
      RiderSyncService.setLock(false);
      console.log('[RiderSync Scheduler] 🔓 Lock released');
    }
  }
  
  // Manual trigger (uses DIRECT sync - bypasses coordinator)
  async syncNow(): Promise<{ success: boolean; count?: number; error?: string }> {
    if (RiderSyncService.isLocked()) {
      return {
        success: false,
        error: 'Rider sync already in progress'
      };
    }

    try {
      RiderSyncService.setLock(true);
      console.log('[RiderSync Scheduler] 🔄 Manual trigger via scheduler API (DIRECT)...');
      console.log('[RiderSync Scheduler] 🔒 Lock acquired');
      
      // Use DIRECT sync for manual triggers (no time slot restrictions)
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
      RiderSyncService.setLock(false);
      console.log('[RiderSync Scheduler] 🔓 Lock released');
    }
  }
}

export const riderSyncScheduler = new RiderSyncScheduler();
