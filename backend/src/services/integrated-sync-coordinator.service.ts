/**
 * Integrated Sync Coordinator
 * 
 * Orchestreert alle 4 sync types in een intelligente flow:
 * 1. RIDER SYNC → Updates team members (dependency voor results)
 * 2. EVENT SYNC (Near + Far) → Updates events + signups (dependency voor results)
 * 3. RESULTS SYNC → Updates race results (needs riders + events)
 * 
 * Features:
 * - Dependency-aware ordering (riders → events → results)
 * - Shared rate limiting (geen conflicts tussen syncs)
 * - Batch execution (alle syncs in één flow)
 * - Smart scheduling (peak hours, event-aware)
 * - Progress tracking
 */

import { syncServiceV2 } from './sync-v2.service.js';
import { resultsSyncService } from './results-sync.service.js';
import { supabase } from './supabase.service.js';
import { syncCoordinator } from './sync-coordinator.service.js';

interface IntegratedSyncMetrics {
  started_at: string;
  completed_at: string;
  duration_ms: number;
  riders: {
    processed: number;
    new: number;
    updated: number;
    duration_ms: number;
  };
  events: {
    near_scanned: number;
    far_scanned: number;
    signups_synced: number;
    duration_ms: number;
  };
  results: {
    events_processed: number;
    results_found: number;
    results_saved: number;
    duration_ms: number;
  };
  total_duration_ms: number;
}

interface IntegratedSyncConfig {
  // Rider sync
  riderSyncInterval: number;
  
  // Event sync
  nearThresholdMinutes: number;
  farLookforwardHours: number;
  
  // Results sync
  resultsDaysBack: number;
  
  // Execution control
  skipIfRecentSync: boolean;  // Skip als < X min geleden
  recentSyncThreshold: number; // Min sinds laatste sync
}

export class IntegratedSyncCoordinator {
  private config: IntegratedSyncConfig;
  private isRunning = false;
  private lastSyncTime: Date | null = null;

  constructor(config?: Partial<IntegratedSyncConfig>) {
    this.config = {
      riderSyncInterval: 60,
      nearThresholdMinutes: 2160, // 36 hours
      farLookforwardHours: 168, // 7 days
      resultsDaysBack: 7, // Laatste week voor snellere sync
      skipIfRecentSync: true,
      recentSyncThreshold: 30, // 30 min
      ...config
    };
  }

  /**
   * FULL BATCH SYNC
   * Voert alle 4 syncs uit in optimale volgorde
   */
  async executeBatchSync(options?: {
    skipRiders?: boolean;
    skipEvents?: boolean;
    skipResults?: boolean;
    force?: boolean;
  }): Promise<IntegratedSyncMetrics> {
    if (this.isRunning) {
      throw new Error('Batch sync already running');
    }

    // Check recent sync
    if (this.config.skipIfRecentSync && !options?.force) {
      const minutesSinceLastSync = this.getMinutesSinceLastSync();
      if (minutesSinceLastSync < this.config.recentSyncThreshold) {
        throw new Error(`Batch sync ran ${minutesSinceLastSync} min ago. Wait ${this.config.recentSyncThreshold - minutesSinceLastSync} more minutes.`);
      }
    }

    this.isRunning = true;
    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  🚀 INTEGRATED BATCH SYNC - STARTING                  ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const metrics: IntegratedSyncMetrics = {
      started_at: startedAt,
      completed_at: '',
      duration_ms: 0,
      riders: { processed: 0, new: 0, updated: 0, duration_ms: 0 },
      events: { near_scanned: 0, far_scanned: 0, signups_synced: 0, duration_ms: 0 },
      results: { events_processed: 0, results_found: 0, results_saved: 0, duration_ms: 0 },
      total_duration_ms: 0
    };

    try {
      // ═══════════════════════════════════════════════════════════
      // PHASE 1: RIDER SYNC (Priority 1 - Foundation data)
      // ═══════════════════════════════════════════════════════════
      if (!options?.skipRiders) {
        console.log('┌─────────────────────────────────────────────────────┐');
        console.log('│  PHASE 1/3: RIDER SYNC (Team Members)              │');
        console.log('└─────────────────────────────────────────────────────┘');
        
        const riderStartTime = Date.now();
        try {
          const riderMetrics = await syncServiceV2.syncRidersCoordinated({
            intervalMinutes: this.config.riderSyncInterval,
            force: options?.force || false
          });
          
          metrics.riders = {
            processed: riderMetrics.riders_processed || 0,
            new: riderMetrics.riders_new || 0,
            updated: riderMetrics.riders_updated || 0,
            duration_ms: Date.now() - riderStartTime
          };
          
          console.log(`✅ Phase 1 complete: ${metrics.riders.processed} riders (${metrics.riders.new} new, ${metrics.riders.updated} updated)\n`);
        } catch (error: any) {
          console.error(`❌ Phase 1 failed:`, error.message);
          throw error;
        }
      } else {
        console.log('⏭️  Phase 1 skipped (riders)\n');
      }

      // ═══════════════════════════════════════════════════════════
      // PHASE 2: EVENT SYNC (Near + Far combined)
      // ═══════════════════════════════════════════════════════════
      if (!options?.skipEvents) {
        console.log('┌─────────────────────────────────────────────────────┐');
        console.log('│  PHASE 2/3: EVENT SYNC (Near + Far Events)         │');
        console.log('└─────────────────────────────────────────────────────┘');
        
        const eventStartTime = Date.now();
        try {
          // Near events sync
          console.log('   📍 Syncing NEAR events (next 36h)...');
          const nearMetrics = await syncServiceV2.syncNearEventsCoordinated({
            intervalMinutes: 10,
            thresholdMinutes: this.config.nearThresholdMinutes,
            lookforwardHours: 36,
            force: options?.force || false
          });
          
          // Far events sync
          console.log('   📍 Syncing FAR events (next 7 days)...');
          const farMetrics = await syncServiceV2.syncFarEventsCoordinated({
            intervalMinutes: 120,
            thresholdMinutes: this.config.nearThresholdMinutes,
            lookforwardHours: this.config.farLookforwardHours,
            force: options?.force || false
          });
          
          metrics.events = {
            near_scanned: nearMetrics.events_processed || 0,
            far_scanned: farMetrics.events_processed || 0,
            signups_synced: (nearMetrics.signups_synced || 0) + (farMetrics.signups_synced || 0),
            duration_ms: Date.now() - eventStartTime
          };
          
          console.log(`✅ Phase 2 complete: ${metrics.events.near_scanned + metrics.events.far_scanned} events, ${metrics.events.signups_synced} signups\n`);
        } catch (error: any) {
          console.error(`❌ Phase 2 failed:`, error.message);
          // Continue naar results (events zijn niet blocking)
        }
      } else {
        console.log('⏭️  Phase 2 skipped (events)\n');
      }

      // ═══════════════════════════════════════════════════════════
      // PHASE 3: RESULTS SYNC (Batch processing)
      // ═══════════════════════════════════════════════════════════
      if (!options?.skipResults) {
        console.log('┌─────────────────────────────────────────────────────┐');
        console.log('│  PHASE 3/3: RESULTS SYNC (Race Results)            │');
        console.log('└─────────────────────────────────────────────────────┘');
        
        const resultsStartTime = Date.now();
        try {
          const resultsMetrics = await resultsSyncService.syncTeamResultsFromHistory(
            this.config.resultsDaysBack
          );
          
          metrics.results = {
            events_processed: resultsMetrics.events_discovered,
            results_found: resultsMetrics.results_found,
            results_saved: resultsMetrics.results_saved,
            duration_ms: Date.now() - resultsStartTime
          };
          
          console.log(`✅ Phase 3 complete: ${metrics.results.results_saved} results from ${metrics.results.events_processed} events\n`);
        } catch (error: any) {
          console.error(`❌ Phase 3 failed:`, error.message);
          // Continue (niet blocking)
        }
      } else {
        console.log('⏭️  Phase 3 skipped (results)\n');
      }

      // ═══════════════════════════════════════════════════════════
      // COMPLETION
      // ═══════════════════════════════════════════════════════════
      const totalDuration = Date.now() - startTime;
      metrics.completed_at = new Date().toISOString();
      metrics.duration_ms = totalDuration;
      metrics.total_duration_ms = totalDuration;

      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║  ✅ INTEGRATED BATCH SYNC - COMPLETED                 ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  Duration: ${(totalDuration / 1000 / 60).toFixed(1)} minutes                              ║`);
      console.log(`║  Riders: ${metrics.riders.processed} processed (${metrics.riders.new} new)                    ║`);
      console.log(`║  Events: ${metrics.events.near_scanned + metrics.events.far_scanned} scanned, ${metrics.events.signups_synced} signups                   ║`);
      console.log(`║  Results: ${metrics.results.results_saved} saved from ${metrics.results.events_processed} events            ║`);
      console.log('╚════════════════════════════════════════════════════════╝\n');

      this.lastSyncTime = new Date();
      return metrics;

    } catch (error: any) {
      console.error('\n❌ Batch sync failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * SMART INCREMENTAL SYNC
   * Alleen wat nodig is, gebaseerd op tijd + event activity
   */
  async executeSmartSync(): Promise<IntegratedSyncMetrics> {
    console.log('\n🧠 [Smart Sync] Analyzing what needs syncing...');

    // Check wat moet syncen
    const hour = new Date().getHours();
    const isPeakHours = hour >= 17 && hour <= 23;
    const upcomingEvents = await supabase.getUpcomingEventsRaw(24);
    const hasNearEvents = upcomingEvents.length > 0;

    const shouldSyncRiders = isPeakHours || this.getMinutesSinceLastSync() > 60;
    const shouldSyncEvents = hasNearEvents || this.getMinutesSinceLastSync() > 120;
    const shouldSyncResults = this.getMinutesSinceLastSync() > 180;

    console.log('   📊 Analysis:');
    console.log(`      Peak hours: ${isPeakHours ? 'YES' : 'NO'} (${hour}:00)`);
    console.log(`      Near events: ${hasNearEvents ? 'YES' : 'NO'} (${upcomingEvents.length} upcoming)`);
    console.log(`      Minutes since last: ${this.getMinutesSinceLastSync()}`);
    console.log('   🎯 Plan:');
    console.log(`      Riders: ${shouldSyncRiders ? '✅ SYNC' : '⏭️  SKIP'}`);
    console.log(`      Events: ${shouldSyncEvents ? '✅ SYNC' : '⏭️  SKIP'}`);
    console.log(`      Results: ${shouldSyncResults ? '✅ SYNC' : '⏭️  SKIP'}\n`);

    return this.executeBatchSync({
      skipRiders: !shouldSyncRiders,
      skipEvents: !shouldSyncEvents,
      skipResults: !shouldSyncResults,
      force: true
    });
  }

  /**
   * Get minutes since last batch sync
   */
  private getMinutesSinceLastSync(): number {
    if (!this.lastSyncTime) return Infinity;
    return (Date.now() - this.lastSyncTime.getTime()) / 60000;
  }

  /**
   * Get coordinator status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime?.toISOString() || null,
      minutesSinceLastSync: this.lastSyncTime ? this.getMinutesSinceLastSync() : null,
      config: this.config
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<IntegratedSyncConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('✅ [Integrated Sync] Configuration updated:', this.config);
  }
}

// Singleton instance
export const integratedSyncCoordinator = new IntegratedSyncCoordinator();
