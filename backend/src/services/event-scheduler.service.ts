/**
 * Smart Event Scheduler Service
 * 
 * US4: Events >1 uur van nu: update elk uur
 * US5: Events <=1 uur van nu: update elke 10 minuten
 * 
 * Intelligent scheduling voor event updates gebaseerd op afstand tot evenement
 */

import cron from 'node-cron';
import { unifiedSync } from './unified-sync.service.js';
import { supabase } from './supabase.service.js';

export class EventSchedulerService {
  private hourlyJob: cron.ScheduledTask | null = null;
  private tenMinuteJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  constructor() {
    console.log('[EventScheduler] 🕒 Scheduler service initialized');
  }

  /**
   * Start de scheduler met twee jobs:
   * - Elk uur: volledige event sync (48h window)
   * - Elke 10 min: update events die binnen 1 uur starten
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[EventScheduler] ⚠️  Scheduler is already running');
      return;
    }

    console.log('[EventScheduler] 🚀 Starting smart event scheduler...');

    // Job 1: Elk uur - volledige 48h sync
    // US4: Events >1h van nu
    this.hourlyJob = cron.schedule('0 * * * *', async () => {
      console.log('\n[EventScheduler] ⏰ HOURLY: Running full 48h event sync...');
      try {
        const result = await unifiedSync.syncEvents({ mode: 'all' });
        console.log(`[EventScheduler] ✅ HOURLY: ${result.events_synced} events, ${result.events_synced} team events`);
      } catch (error) {
        console.error('[EventScheduler] ❌ HOURLY: Sync failed:', error);
      }
    });

    // Job 2: Elke 10 minuten - urgent events update
    // US5: Events <=1h van nu
    this.tenMinuteJob = cron.schedule('*/10 * * * *', async () => {
      console.log('\n[EventScheduler] ⚡ URGENT: Updating events starting within 1 hour...');
      try {
        await this.updateUrgentEvents();
      } catch (error) {
        console.error('[EventScheduler] ❌ URGENT: Update failed:', error);
      }
    });

    this.isRunning = true;
    console.log('[EventScheduler] ✅ Scheduler started successfully');
    console.log('  📅 Hourly sync: Every hour (0 * * * *)');
    console.log('  ⚡ Urgent sync: Every 10 minutes (*/10 * * * *)');

    // Run initial sync onmiddellijk
    this.runInitialSync();
  }

  /**
   * Stop de scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('[EventScheduler] ⚠️  Scheduler is not running');
      return;
    }

    console.log('[EventScheduler] 🛑 Stopping scheduler...');
    
    if (this.hourlyJob) {
      this.hourlyJob.stop();
      this.hourlyJob = null;
    }

    if (this.tenMinuteJob) {
      this.tenMinuteJob.stop();
      this.tenMinuteJob = null;
    }

    this.isRunning = false;
    console.log('[EventScheduler] ✅ Scheduler stopped');
  }

  /**
   * Update alleen events die binnen 1 uur starten
   * US5: Hogere frequency voor imminent events
   */
  private async updateUrgentEvents(): Promise<void> {
    // 1. Query events die binnen 1 uur starten
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + (60 * 60 * 1000));

    // Use supabase service method
    const allUpcomingEvents = await supabase.getUpcomingEvents(48, false);
    
    // Filter voor events binnen 1 uur
    const urgentEvents = allUpcomingEvents.filter((event: any) => {
      const eventDate = new Date(event.time_unix * 1000);  // Unix timestamp to Date
      return eventDate >= now && eventDate <= oneHourFromNow;
    });

    if (!urgentEvents || urgentEvents.length === 0) {
      console.log('[EventScheduler] ℹ️  No urgent events found');
      return;
    }

    console.log(`[EventScheduler] ⚡ Found ${urgentEvents.length} urgent events`);

    // 2. Voor elk urgent event: update signups
    for (const event of urgentEvents) {
      try {
        // Haal verse signups op via external API indien beschikbaar
        // Voor nu: loggen we alleen
        const minutesUntilStart = Math.floor((new Date(event.time_unix * 1000).getTime() - now.getTime()) / 60000);
        console.log(`  📍 Event ${event.event_id} "${event.title}" starts in ${minutesUntilStart} minutes`);
      } catch (error) {
        console.error(`  ❌ Failed to update event ${event.event_id}:`, error);
      }
    }
  }

  /**
   * Run initial sync bij opstarten
   */
  private async runInitialSync(): Promise<void> {
    console.log('[EventScheduler] 🔄 Running initial sync...');
    
    try {
      const result = await unifiedSync.syncEvents({ mode: 'all' });
      console.log(`[EventScheduler] ✅ Initial sync complete: ${result.events_synced} events imported`);
    } catch (error) {
      console.error('[EventScheduler] ❌ Initial sync failed:', error);
    }
  }

  /**
   * Status check
   */
  getStatus(): { running: boolean; hourlyActive: boolean; urgentActive: boolean } {
    return {
      running: this.isRunning,
      hourlyActive: this.hourlyJob !== null,
      urgentActive: this.tenMinuteJob !== null,
    };
  }

  /**
   * Handmatige trigger voor testing
   */
  async triggerHourlySync(): Promise<void> {
    console.log('[EventScheduler] 🔄 Manual hourly sync triggered...');
    const result = await syncService.bulkImportUpcomingEvents();
    console.log(`[EventScheduler] ✅ Manual sync complete: ${result.events_synced} events`);
  }

  async triggerUrgentSync(): Promise<void> {
    console.log('[EventScheduler] ⚡ Manual urgent sync triggered...');
    await this.updateUrgentEvents();
  }
}

export const eventScheduler = new EventSchedulerService();

