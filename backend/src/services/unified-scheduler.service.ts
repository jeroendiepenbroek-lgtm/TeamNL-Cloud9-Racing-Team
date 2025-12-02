/**
 * Unified Scheduler Service - Manual sync triggers
 * Provides manual sync capabilities via API endpoints
 */

import { simpleSyncService } from './simple-sync.service.js';
import { supabase } from './supabase.service.js';

export interface SchedulerStatus {
  isRunning: boolean;
  lastRiderSync: string | null;
  lastEventSync: string | null;
  lastResultsSync: string | null;
  lastCleanup: string | null;
}

interface SyncTimestamps {
  lastRiderSync: Date | null;
  lastEventSync: Date | null;
  lastResultsSync: Date | null;
  lastCleanup: Date | null;
}

class UnifiedScheduler {
  private isRunning = false;
  private timestamps: SyncTimestamps = {
    lastRiderSync: null,
    lastEventSync: null,
    lastResultsSync: null,
    lastCleanup: null,
  };

  start(): void {
    console.log('✅ UnifiedScheduler: Started (manual triggers only)');
    this.isRunning = true;
  }

  stop(): void {
    console.log('⏸️  UnifiedScheduler: Stopped');
    this.isRunning = false;
  }

  restart(config?: any): void {
    console.log('🔄 UnifiedScheduler: Restarting...');
    this.stop();
    this.start();
  }

  getStatus(): SchedulerStatus {
    return {
      isRunning: this.isRunning,
      lastRiderSync: this.timestamps.lastRiderSync?.toISOString() || null,
      lastEventSync: this.timestamps.lastEventSync?.toISOString() || null,
      lastResultsSync: this.timestamps.lastResultsSync?.toISOString() || null,
      lastCleanup: this.timestamps.lastCleanup?.toISOString() || null,
    };
  }

  async triggerRiderSync(): Promise<void> {
    console.log('🚴 Triggering rider sync...');
    try {
      const result = await simpleSyncService.syncRiders(11818);
      this.timestamps.lastRiderSync = new Date();
      
      // Log to sync_logs table
      await supabase.logSync({
        endpoint: 'riders',
        status: result.success ? 'success' : 'error',
        records_processed: result.count,
        synced_at: new Date().toISOString(),
        error_message: result.error || null,
      });
      
      console.log(`✅ Rider sync complete: ${result.message}`);
    } catch (error: any) {
      console.error('❌ Rider sync failed:', error);
      throw error;
    }
  }

  async triggerEventSync(): Promise<void> {
    console.log('📅 Triggering event sync...');
    try {
      const result = await simpleSyncService.syncEvents(11818, 168);
      this.timestamps.lastEventSync = new Date();
      
      // Log to sync_logs table
      await supabase.logSync({
        endpoint: 'events',
        status: result.success ? 'success' : 'error',
        records_processed: result.count,
        synced_at: new Date().toISOString(),
        error_message: result.error || null,
      });
      
      console.log(`✅ Event sync complete: ${result.message}`);
    } catch (error: any) {
      console.error('❌ Event sync failed:', error);
      throw error;
    }
  }

  async triggerResultsSync(): Promise<void> {
    console.log('🏆 Triggering results sync...');
    try {
      // Get recent events that might need results synced
      const events = await supabase.getEvents(11818);
      const recentEvents = events.filter(e => {
        const eventDate = new Date(e.event_date);
        const now = new Date();
        const diffHours = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
        return diffHours <= 24; // Events from last 24 hours
      });
      
      let totalResults = 0;
      for (const event of recentEvents.slice(0, 5)) { // Max 5 events at once
        const result = await simpleSyncService.syncEventResults(event.event_id);
        if (result.success) {
          totalResults += result.count;
        }
      }
      
      this.timestamps.lastResultsSync = new Date();
      
      // Log to sync_logs table
      await supabase.logSync({
        endpoint: 'results',
        status: 'success',
        records_processed: totalResults,
        synced_at: new Date().toISOString(),
        error_message: null,
      });
      
      console.log(`✅ Results sync complete: ${totalResults} results from ${recentEvents.length} events`);
    } catch (error: any) {
      console.error('❌ Results sync failed:', error);
      throw error;
    }
  }

  async triggerCleanup(): Promise<void> {
    console.log('🗑️  Triggering cleanup...');
    try {
      // Clean up events older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const deleted = await supabase.deleteOldEvents(thirtyDaysAgo.toISOString());
      this.timestamps.lastCleanup = new Date();
      
      // Log to sync_logs table
      await supabase.logSync({
        endpoint: 'cleanup',
        status: 'success',
        records_processed: deleted,
        synced_at: new Date().toISOString(),
        error_message: null,
      });
      
      console.log(`✅ Cleanup complete: ${deleted} old events removed`);
    } catch (error: any) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }
}

export const unifiedScheduler = new UnifiedScheduler();
