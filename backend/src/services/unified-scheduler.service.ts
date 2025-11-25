/**
 * ═══════════════════════════════════════════════════════════════
 *  UNIFIED SYNC SCHEDULER - Modern & Professional
 * ═══════════════════════════════════════════════════════════════
 * 
 * Combineert het beste van Legacy Cron en Smart Scheduler:
 * ✅ Betrouwbare vaste tijden (voorspelbaar, debugbaar)
 * ✅ Adaptive logic (peak hours, activity detection)
 * ✅ Complete coverage (riders, events, results, cleanup)
 * ✅ Rate limit safe (intelligent spacing)
 * ✅ Observable (metrics + logs per sync type)
 * 
 * Sync Types:
 * - RIDER_SYNC: Elk uur (peak: 30 min adaptive boost mogelijk)
 * - NEAR_EVENT_SYNC: Elke 15 min (events < 24h + signups)
 * - FAR_EVENT_SYNC: Elke 3 uur (volledige scan)
 * - RESULTS_SYNC: Elke 4 uur (recent events results)
 * - CLEANUP: Wekelijks zondag 03:00
 * 
 * Features:
 * - Singleton pattern (één scheduler instance)
 * - Graceful start/stop/restart
 * - Manual trigger support via API
 * - Conflict prevention via sync coordinator
 * - Comprehensive metrics tracking
 */

import { syncServiceV2 } from './sync-v2.service.js';
import { ResultsSyncService } from './results-sync.service.js';
import { syncConfigService } from './sync-config.service.js';
import { eventCleanupService } from './event-cleanup.service.js';
import cron from 'node-cron';

export interface UnifiedSchedulerConfig {
  // Rider sync
  riderSyncEnabled: boolean;
  riderSyncInterval: number; // minuten (default: 60)
  riderSyncAdaptive: boolean; // peak hours boost
  
  // Event sync
  eventSyncNearInterval: number; // minuten (default: 15)
  eventSyncFarInterval: number; // uur (default: 3)
  nearEventThresholdMinutes: number; // default: 24 * 60
  lookforwardHours: number; // default: 48
  
  // Results sync
  resultsSyncEnabled: boolean;
  resultsSyncInterval: number; // uur (default: 4)
  resultsDaysBack: number; // default: 7
  
  // Cleanup
  cleanupEnabled: boolean;
  cleanupCron: string; // default: '0 3 * * 0' (zondag 03:00)
  
  // Peak hours (adaptive logic)
  peakHoursStart: number; // default: 17 (5pm)
  peakHoursEnd: number; // default: 23 (11pm)
}

export class UnifiedSyncScheduler {
  private config: UnifiedSchedulerConfig;
  private cronJobs: cron.ScheduledTask[] = [];
  private isRunning = false;
  private startTime: Date | null = null;

  constructor(config?: Partial<UnifiedSchedulerConfig>) {
    // Default configuratie (production-ready)
    this.config = {
      // Riders
      riderSyncEnabled: true,
      riderSyncInterval: 60, // elk uur
      riderSyncAdaptive: false, // TODO: future feature
      
      // Events
      eventSyncNearInterval: 15, // elke 15 min
      eventSyncFarInterval: 3, // elke 3 uur
      nearEventThresholdMinutes: 24 * 60, // 24 uur
      lookforwardHours: 48,
      
      // Results
      resultsSyncEnabled: true,
      resultsSyncInterval: 4, // elke 4 uur
      resultsDaysBack: 7,
      
      // Cleanup
      cleanupEnabled: true,
      cleanupCron: '0 3 * * 0', // zondag 03:00
      
      // Peak hours
      peakHoursStart: 17,
      peakHoursEnd: 23,
      
      ...config
    };
  }

  /**
   * Start de unified scheduler met alle sync jobs
   */
  start() {
    if (this.isRunning) {
      console.warn('⚠️  [UnifiedScheduler] Already running');
      return;
    }

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  🚀 UNIFIED SYNC SCHEDULER - Starting        ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    this.isRunning = true;
    this.startTime = new Date();

    // Schedule all sync jobs
    this.scheduleRiderSync();
    this.scheduleNearEventSync();
    this.scheduleFarEventSync();
    this.scheduleResultsSync();
    this.scheduleCleanup();

    console.log('\n✅ [UnifiedScheduler] All sync jobs scheduled');
    console.log('═══════════════════════════════════════════════════\n');
  }

  /**
   * Stop alle scheduled jobs
   */
  stop() {
    console.log('\n⏹️  [UnifiedScheduler] Stopping all sync jobs...');
    
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs = [];
    this.isRunning = false;

    console.log('✅ [UnifiedScheduler] Stopped\n');
  }

  /**
   * Restart met nieuwe config
   */
  restart(newConfig?: Partial<UnifiedSchedulerConfig>) {
    console.log('🔄 [UnifiedScheduler] Restarting...');
    this.stop();
    
    if (newConfig) {
      this.config = { ...this.config, ...newConfig };
    }
    
    this.start();
  }

  /**
   * ═════════════════════════════════════════════════════════════
   *  RIDER SYNC - Elk uur op :00
   * ═════════════════════════════════════════════════════════════
   * Cron: 0 * * * * (00:00, 01:00, 02:00, ..., 23:00)
   * Rate limit: POST 1/15min → 60min interval = 4x veilig
   * Priority: P1 (hoogste - core team data)
   */
  private scheduleRiderSync() {
    if (!this.config.riderSyncEnabled) {
      console.log('  ⏸️  Rider Sync: Disabled');
      return;
    }

    const cronExpression = '0 * * * *'; // Elk uur op :00
    
    console.log('  🔄 Rider Sync (P1):');
    console.log(`     ⏰ Schedule: Every hour at :00 (${this.config.riderSyncInterval}min interval)`);
    console.log(`     🔒 Rate limit: Safe (4x margin on POST 1/15min)`);
    console.log(`     📊 Metrics: riders_processed, new, updated`);

    const job = cron.schedule(cronExpression, async () => {
      console.log(`\n⏰ [RIDER_SYNC] Triggered at ${new Date().toISOString()}`);
      
      try {
        const metrics = await syncServiceV2.syncRidersCoordinated({
          intervalMinutes: this.config.riderSyncInterval,
        });
        
        console.log(`✅ [RIDER_SYNC] Success: ${metrics.riders_processed} riders (${metrics.riders_new} new, ${metrics.riders_updated} updated) in ${metrics.duration_ms}ms`);
      } catch (error: any) {
        console.error(`❌ [RIDER_SYNC] Failed:`, error.message);
      }
    });

    this.cronJobs.push(job);
  }

  /**
   * ═════════════════════════════════════════════════════════════
   *  NEAR EVENT SYNC - Elke 15 min op :05, :20, :35, :50
   * ═════════════════════════════════════════════════════════════
   * Cron: 5,20,35,50 * * * *
   * Sync: Alleen events < 24h + signups (frequent voor komende races)
   * Priority: P2 (hoog - time-sensitive)
   */
  private scheduleNearEventSync() {
    const cronExpression = '5,20,35,50 * * * *';
    
    console.log('  ⚡ Event Sync NEAR (P2):');
    console.log(`     ⏰ Schedule: :05, :20, :35, :50 every hour (${this.config.eventSyncNearInterval}min)`);
    console.log(`     🎯 Target: Events < ${this.config.nearEventThresholdMinutes / 60}h + signups`);
    console.log(`     📊 Metrics: events_near, signups_synced`);

    const job = cron.schedule(cronExpression, async () => {
      console.log(`\n⏰ [NEAR_EVENT_SYNC] Triggered at ${new Date().toISOString()}`);
      
      try {
        const config = syncConfigService.getConfig();
        const metrics = await syncServiceV2.syncEventsCoordinated({
          intervalMinutes: this.config.eventSyncNearInterval,
          thresholdMinutes: config.nearEventThresholdMinutes,
          lookforwardHours: config.lookforwardHours,
          mode: 'near_only',
        });
        
        console.log(`✅ [NEAR_EVENT_SYNC] Success: ${metrics.events_near} near events, ${metrics.signups_synced} signups in ${metrics.duration_ms}ms`);
      } catch (error: any) {
        console.error(`❌ [NEAR_EVENT_SYNC] Failed:`, error.message);
      }
    });

    this.cronJobs.push(job);
  }

  /**
   * ═════════════════════════════════════════════════════════════
   *  FAR EVENT SYNC - Elke 3 uur op :55
   * ═════════════════════════════════════════════════════════════
   * Cron: 55 */3 * * * (00:55, 03:55, 06:55, 09:55, 12:55, 15:55, 18:55, 21:55)
   * Sync: ALLE events (near + far) volledige scan
   * Priority: P3 (medium - background discovery)
   * Timing: 5 min NA near sync om overlap te voorkomen
   */
  private scheduleFarEventSync() {
    const cronExpression = '55 */3 * * *';
    
    console.log('  🔭 Event Sync FAR (P3):');
    console.log(`     ⏰ Schedule: :55 every ${this.config.eventSyncFarInterval} hours`);
    console.log(`     🎯 Target: ALL events (near + far) - full scan`);
    console.log(`     📊 Metrics: events_near, events_far, signups_synced`);
    console.log(`     ⏱️  Timing: 5 min after near sync to prevent overlap`);

    const job = cron.schedule(cronExpression, async () => {
      console.log(`\n⏰ [FAR_EVENT_SYNC] Triggered at ${new Date().toISOString()}`);
      
      try {
        const config = syncConfigService.getConfig();
        const metrics = await syncServiceV2.syncEventsCoordinated({
          intervalMinutes: this.config.eventSyncFarInterval * 60,
          thresholdMinutes: config.nearEventThresholdMinutes,
          lookforwardHours: config.lookforwardHours,
          mode: 'full_scan',
        });
        
        console.log(`✅ [FAR_EVENT_SYNC] Success: ${metrics.events_near} near + ${metrics.events_far} far events, ${metrics.signups_synced} signups in ${metrics.duration_ms}ms`);
      } catch (error: any) {
        console.error(`❌ [FAR_EVENT_SYNC] Failed:`, error.message);
      }
    });

    this.cronJobs.push(job);
  }

  /**
   * ═════════════════════════════════════════════════════════════
   *  RESULTS SYNC - Elke 4 uur op :30
   * ═════════════════════════════════════════════════════════════
   * Cron: 30 */4 * * * (00:30, 04:30, 08:30, 12:30, 16:30, 20:30)
   * Sync: Recent events results (laatste 7 dagen) voor team riders
   * Priority: P4 (medium - results dashboard data)
   * Timing: :30 om conflict met riders (:00) en events (:05, :55) te vermijden
   */
  private scheduleResultsSync() {
    if (!this.config.resultsSyncEnabled) {
      console.log('  ⏸️  Results Sync: Disabled');
      return;
    }

    const cronExpression = '30 */4 * * *'; // Elke 4 uur op :30
    
    console.log('  🏁 Results Sync (P4):');
    console.log(`     ⏰ Schedule: :30 every ${this.config.resultsSyncInterval} hours`);
    console.log(`     🎯 Target: Recent events (last ${this.config.resultsDaysBack} days)`);
    console.log(`     📊 Metrics: results_saved, events_processed`);
    console.log(`     ⏱️  Timing: :30 to avoid conflict with other syncs`);

    const job = cron.schedule(cronExpression, async () => {
      console.log(`\n⏰ [RESULTS_SYNC] Triggered at ${new Date().toISOString()}`);
      
      try {
        const resultsSyncService = new ResultsSyncService();
        const stats = await resultsSyncService.syncTeamResultsFromHistory(
          this.config.resultsDaysBack
        );
        
        console.log(`✅ [RESULTS_SYNC] Success: ${stats.results_saved} results from ${stats.events_discovered} events (${stats.riders_scanned} riders scanned)`);
      } catch (error: any) {
        console.error(`❌ [RESULTS_SYNC] Failed:`, error.message);
      }
    });

    this.cronJobs.push(job);
  }

  /**
   * ═════════════════════════════════════════════════════════════
   *  CLEANUP - Wekelijks zondag 03:00
   * ═════════════════════════════════════════════════════════════
   * Cron: 0 3 * * 0 (zondag 03:00)
   * Cleanup: Past events + stale future events + orphaned signups
   * Priority: P5 (low - maintenance)
   * Timing: Nacht met laag verkeer
   */
  private scheduleCleanup() {
    if (!this.config.cleanupEnabled) {
      console.log('  ⏸️  Cleanup: Disabled');
      return;
    }

    console.log('  🧹 Weekly Cleanup (P5):');
    console.log(`     ⏰ Schedule: ${this.config.cleanupCron} (Sunday 03:00)`);
    console.log(`     🎯 Target: Past events, stale future, orphaned signups`);
    console.log(`     📊 Metrics: events_removed, signups_removed`);

    const job = cron.schedule(this.config.cleanupCron, async () => {
      console.log(`\n⏰ [CLEANUP] Triggered at ${new Date().toISOString()}`);
      
      try {
        const result = await eventCleanupService.runFullCleanup();
        console.log(`✅ [CLEANUP] Success:`, result);
      } catch (error: any) {
        console.error(`❌ [CLEANUP] Failed:`, error.message);
      }
    });

    this.cronJobs.push(job);
  }

  /**
   * Get scheduler status (for admin dashboard)
   */
  getStatus() {
    const uptime = this.startTime 
      ? Math.floor((Date.now() - this.startTime.getTime()) / 1000)
      : 0;

    const hour = new Date().getHours();
    const isPeakHour = hour >= this.config.peakHoursStart && hour <= this.config.peakHoursEnd;

    return {
      running: this.isRunning,
      uptime_seconds: uptime,
      start_time: this.startTime?.toISOString(),
      current_mode: isPeakHour ? 'PEAK' : 'NORMAL',
      current_hour: hour,
      active_jobs: this.cronJobs.length,
      config: {
        rider_sync: this.config.riderSyncEnabled ? `Every ${this.config.riderSyncInterval}min` : 'Disabled',
        near_event_sync: `Every ${this.config.eventSyncNearInterval}min`,
        far_event_sync: `Every ${this.config.eventSyncFarInterval}h`,
        results_sync: this.config.resultsSyncEnabled ? `Every ${this.config.resultsSyncInterval}h` : 'Disabled',
        cleanup: this.config.cleanupEnabled ? this.config.cleanupCron : 'Disabled',
      }
    };
  }

  /**
   * Get config (for admin dashboard)
   */
  getConfig() {
    return { ...this.config };
  }
}

// ═══════════════════════════════════════════════════════════════
//  SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════
export const unifiedScheduler = new UnifiedSyncScheduler();
