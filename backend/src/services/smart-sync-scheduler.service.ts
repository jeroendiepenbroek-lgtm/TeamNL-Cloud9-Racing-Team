/**
 * Smart Sync Scheduler
 * US4: Dynamische en efficiëntere sync scheduling
 * 
 * Features:
 * - Adaptive intervals gebaseerd op activity
 * - Prioriteit aan near-event periods
 * - Rate limit awareness
 * - Auto-scaling gebaseerd op load
 * - NIEUWE: Integrated batch sync mode
 */

import { syncServiceV2 } from './sync-v2.service.js';
import { supabase } from './supabase.service.js';
import { integratedSyncCoordinator } from './integrated-sync-coordinator.service.js';

interface SyncScheduleConfig {
  // Rider sync intervals (minuten)
  riderSyncBaseInterval: number;      // Default: 60min
  riderSyncPeakInterval: number;      // During peak: 30min
  
  // Event sync intervals
  eventSyncNearInterval: number;      // Near events (<24h): 10min
  eventSyncFarInterval: number;       // Far events (>24h): 120min
  
  // Results sync intervals
  resultsSyncInterval: number;        // Default: 180min (3h)
  resultsSyncPostEventInterval: number; // After event: 30min
  
  // Peak activity detection
  peakHoursStart: number;             // Default: 17 (5pm)
  peakHoursEnd: number;               // Default: 23 (11pm)
  
  // NIEUWE: Integrated batch mode
  useBatchMode: boolean;              // Use integrated batch sync instead of separate syncs
  batchSyncInterval: number;          // Interval for batch sync (default: 120min)
}

export class SmartSyncScheduler {
  private config: SyncScheduleConfig;
  private riderSyncTimer: NodeJS.Timeout | null = null;
  private eventSyncTimer: NodeJS.Timeout | null = null;
  private resultsSyncTimer: NodeJS.Timeout | null = null;
  private batchSyncTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config?: Partial<SyncScheduleConfig>) {
    this.config = {
      riderSyncBaseInterval: 60,
      riderSyncPeakInterval: 30,
      eventSyncNearInterval: 10,
      eventSyncFarInterval: 120,
      resultsSyncInterval: 180,
      resultsSyncPostEventInterval: 30,
      peakHoursStart: 17,
      peakHoursEnd: 23,
      useBatchMode: false, // Default: legacy mode
      batchSyncInterval: 120, // 2 hours
      ...config
    };
  }

  /**
   * Start alle schedulers met dynamische intervals
   */
  start() {
    if (this.isRunning) {
      console.log('[SmartSync] Already running');
      return;
    }

    console.log('\n🧠 [SmartSync] Starting intelligent sync scheduler...');
    
    if (this.config.useBatchMode) {
      // NIEUWE MODE: Integrated batch sync
      console.log(`   🚀 Mode: INTEGRATED BATCH SYNC`);
      console.log(`   📋 Config:`, {
        batchInterval: `${this.config.batchSyncInterval}min`,
        peakHours: `${this.config.peakHoursStart}:00 - ${this.config.peakHoursEnd}:00`
      });

      this.isRunning = true;
      this.scheduleBatchSync();
      console.log('✅ [SmartSync] Batch scheduler started\n');
    } else {
      // LEGACY MODE: Separate syncs
      console.log(`   📋 Mode: LEGACY (separate syncs)`);
      console.log(`   📋 Config:`, {
        riderSync: `${this.config.riderSyncBaseInterval}min (peak: ${this.config.riderSyncPeakInterval}min)`,
        eventSync: `near ${this.config.eventSyncNearInterval}min / far ${this.config.eventSyncFarInterval}min`,
        resultsSync: `${this.config.resultsSyncInterval}min`,
        peakHours: `${this.config.peakHoursStart}:00 - ${this.config.peakHoursEnd}:00`
      });

      this.isRunning = true;

      // Schedule rider sync (adaptive)
      this.scheduleRiderSync();

      // Schedule event sync (dual mode)
      this.scheduleEventSync();

      // Schedule results sync (post-event aware)
      this.scheduleResultsSync();

      console.log('✅ [SmartSync] All schedulers started\n');
    }
  }

  /**
   * Stop alle schedulers
   */
  stop() {
    console.log('⏹️  [SmartSync] Stopping all schedulers...');
    
    if (this.riderSyncTimer) clearInterval(this.riderSyncTimer);
    if (this.eventSyncTimer) clearInterval(this.eventSyncTimer);
    if (this.resultsSyncTimer) clearInterval(this.resultsSyncTimer);
    if (this.batchSyncTimer) clearInterval(this.batchSyncTimer);
    
    this.isRunning = false;
    console.log('✅ [SmartSync] Stopped');
  }

  /**
   * Restart met nieuwe config
   */
  restart(newConfig?: Partial<SyncScheduleConfig>) {
    console.log('🔄 [SmartSync] Restarting with new config...');
    this.stop();
    if (newConfig) {
      this.config = { ...this.config, ...newConfig };
    }
    this.start();
  }

  /**
   * RIDER SYNC - Adaptive interval gebaseerd op tijd van dag
   */
  private scheduleRiderSync() {
    const runSync = async () => {
      try {
        // Check of we in peak hours zitten
        const hour = new Date().getHours();
        const isPeak = hour >= this.config.peakHoursStart && hour <= this.config.peakHoursEnd;
        
        const interval = isPeak ? this.config.riderSyncPeakInterval : this.config.riderSyncBaseInterval;
        
        console.log(`\n⏰ [SmartSync] Rider Sync triggered (${isPeak ? 'PEAK' : 'normal'} mode)`);
        
        const metrics = await syncServiceV2.syncRidersCoordinated({
          intervalMinutes: interval
        });
        
        console.log(`✅ [SmartSync] Rider Sync complete: ${metrics.riders_processed} riders\n`);
        
      } catch (error: any) {
        console.error('❌ [SmartSync] Rider Sync failed:', error.message);
      }
    };

    // Initial sync
    runSync();

    // Re-schedule dynamisch
    this.riderSyncTimer = setInterval(() => {
      runSync();
    }, this.getCurrentRiderInterval() * 60 * 1000);
  }

  /**
   * EVENT SYNC - Dual mode (near/far) met intelligente switching
   */
  private scheduleEventSync() {
    const runSync = async () => {
      try {
        // Check of er near events zijn
        const upcomingEvents = await supabase.getUpcomingEventsRaw(24); // Next 24h
        const hasNearEvents = upcomingEvents.length > 0;
        
        const interval = hasNearEvents 
          ? this.config.eventSyncNearInterval 
          : this.config.eventSyncFarInterval;
        
        const mode = hasNearEvents ? 'NEAR' : 'FAR';
        console.log(`\n⏰ [SmartSync] Event Sync triggered (${mode} mode, ${upcomingEvents.length} events)`);
        
        // Use combined event sync (near + far scan)
        const metrics = await syncServiceV2.syncEventsCoordinated({
          intervalMinutes: interval,
          thresholdMinutes: 24 * 60, // 24 hours
          lookforwardHours: 48,
          mode: hasNearEvents ? 'near_only' : 'full_scan'
        });
        
        console.log(`✅ [SmartSync] Event Sync complete: ${metrics.events_scanned} events, ${metrics.signups_synced} signups\n`);
        
      } catch (error: any) {
        console.error('❌ [SmartSync] Event Sync failed:', error.message);
      }
    };

    // Initial sync
    runSync();

    // Re-schedule elke 10min (zal intern beslissen near/far)
    this.eventSyncTimer = setInterval(() => {
      runSync();
    }, this.config.eventSyncNearInterval * 60 * 1000);
  }

  /**
   * RESULTS SYNC - Post-event aware met batch processing
   */
  private scheduleResultsSync() {
    const runSync = async () => {
      try {
        console.log(`\n⏰ [SmartSync] Results Sync triggered`);
        
        // Check of er recent afgelopen events zijn (last 24h)
        const recentEvents = await supabase.getRecentEvents(1);
        
        if (recentEvents.length === 0) {
          console.log(`   ℹ️  No recent events to sync`);
          return;
        }
        
        console.log(`   📋 Found ${recentEvents.length} recent events`);
        
        // Extract event IDs (convert string to number)
        const eventIds = recentEvents
          .map(e => parseInt(e.event_id))
          .filter(id => !isNaN(id));
        
        if (eventIds.length === 0) {
          console.warn(`   ⚠️  No valid event IDs found`);
          return;
        }
        
        // Use ResultsSyncService batch processing
        const { ResultsSyncService } = await import('./results-sync.service.js');
        const resultsSyncService = new ResultsSyncService();
        
        const stats = await resultsSyncService.syncResultsBatch(eventIds);
        console.log(`✅ [SmartSync] Results Sync complete: ${stats.results_saved} results from ${stats.events_processed} events`);
        
      } catch (error: any) {
        console.error('❌ [SmartSync] Results Sync failed:', error.message);
      }
    };

    // Initial sync (delayed)
    setTimeout(() => runSync(), 5 * 60 * 1000); // Start na 5min

    // Schedule periodiek
    this.resultsSyncTimer = setInterval(() => {
      runSync();
    }, this.config.resultsSyncInterval * 60 * 1000);
  }

  /**
   * Get current rider sync interval (dynamic based on time)
   */
  private getCurrentRiderInterval(): number {
    const hour = new Date().getHours();
    const isPeak = hour >= this.config.peakHoursStart && hour <= this.config.peakHoursEnd;
    return isPeak ? this.config.riderSyncPeakInterval : this.config.riderSyncBaseInterval;
  }

  /**
   * NIEUWE: Batch sync scheduling
   */
  private scheduleBatchSync() {
    const runBatchSync = async () => {
      try {
        console.log('\n⏰ [SmartSync] Batch sync triggered (integrated mode)');
        
        const metrics = await integratedSyncCoordinator.executeSmartSync();
        
        console.log(`✅ [SmartSync] Batch complete: ${metrics.riders.processed}r, ${metrics.events.near_scanned + metrics.events.far_scanned}e, ${metrics.results.results_saved}res\n`);
        
      } catch (error: any) {
        console.error('❌ [SmartSync] Batch sync failed:', error.message);
      }
    };

    // Initial sync (delayed 30s om server startup te laten voltooien)
    setTimeout(() => runBatchSync(), 30000);

    // Schedule periodiek
    this.batchSyncTimer = setInterval(() => {
      runBatchSync();
    }, this.config.batchSyncInterval * 60 * 1000);
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    const hour = new Date().getHours();
    const isPeak = hour >= this.config.peakHoursStart && hour <= this.config.peakHoursEnd;
    
    if (this.config.useBatchMode) {
      return {
        running: this.isRunning,
        mode: 'BATCH',
        currentMode: isPeak ? 'PEAK' : 'NORMAL',
        currentHour: hour,
        intervals: {
          batchSync: `${this.config.batchSyncInterval}min (smart)`
        },
        config: this.config,
        batchStatus: integratedSyncCoordinator.getStatus()
      };
    }
    
    return {
      running: this.isRunning,
      mode: 'LEGACY',
      currentMode: isPeak ? 'PEAK' : 'NORMAL',
      currentHour: hour,
      intervals: {
        riderSync: `${this.getCurrentRiderInterval()}min`,
        eventSync: `${this.config.eventSyncNearInterval}min (adaptive)`,
        resultsSync: `${this.config.resultsSyncInterval}min`
      },
      config: this.config
    };
  }
}

// Singleton instance - DEFAULT: Batch mode enabled!
export const smartSyncScheduler = new SmartSyncScheduler({
  useBatchMode: true,  // Enable integrated batch sync
  batchSyncInterval: 120  // Batch sync elke 2 uur
});
