/**
 * Signup Scheduler Service
 * 
 * US6: Events 1-48h: refresh signups elk uur
 * US7: Events <=1h: refresh signups elke 10 minuten
 * 
 * Intelligent scheduling voor signup updates gebaseerd op event timing
 */

import cron from 'node-cron';
import { syncService } from './sync.service.js';
import { supabase } from './supabase.service.js';

export class SignupSchedulerService {
  private hourlyJob: cron.ScheduledTask | null = null;
  private tenMinuteJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  constructor() {
    console.log('[SignupScheduler] 🕒 Scheduler service initialized');
  }

  /**
   * Start de scheduler met twee jobs:
   * - Elk uur: sync signups voor events 1-48h
   * - Elke 10 min: sync signups voor events <=1h
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[SignupScheduler] ⚠️  Scheduler is already running');
      return;
    }

    console.log('[SignupScheduler] 🚀 Starting signup scheduler...');

    // Job 1: Elk uur - signups voor events 1-48h
    // US6: Events >1h en <=48h
    this.hourlyJob = cron.schedule('0 * * * *', async () => {
      console.log('\n[SignupScheduler] ⏰ HOURLY: Syncing signups for events 1-48h...');
      try {
        await this.syncNonUrgentSignups();
      } catch (error) {
        console.error('[SignupScheduler] ❌ HOURLY: Signup sync failed:', error);
      }
    });

    // Job 2: Elke 10 minuten - signups voor urgent events
    // US7: Events <=1h
    this.tenMinuteJob = cron.schedule('*/10 * * * *', async () => {
      console.log('\n[SignupScheduler] ⚡ URGENT: Syncing signups for events <=1h...');
      try {
        await this.syncUrgentSignups();
      } catch (error) {
        console.error('[SignupScheduler] ❌ URGENT: Signup sync failed:', error);
      }
    });

    this.isRunning = true;
    console.log('[SignupScheduler] ✅ Scheduler started successfully');
    console.log('  📅 Hourly: Events 1-48h (0 * * * *)');
    console.log('  ⚡ Urgent: Events <=1h (*/10 * * * *)');

    // Run initial sync
    this.runInitialSync();
  }

  /**
   * Stop de scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('[SignupScheduler] ⚠️  Scheduler is not running');
      return;
    }

    console.log('[SignupScheduler] 🛑 Stopping scheduler...');
    
    if (this.hourlyJob) {
      this.hourlyJob.stop();
      this.hourlyJob = null;
    }

    if (this.tenMinuteJob) {
      this.tenMinuteJob.stop();
      this.tenMinuteJob = null;
    }

    this.isRunning = false;
    console.log('[SignupScheduler] ✅ Scheduler stopped');
  }

  /**
   * US7: Sync signups voor events die binnen 1 uur starten
   */
  private async syncUrgentSignups(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const oneHourFromNow = now + (60 * 60);

    const { data: urgentEvents, error } = await supabase['client']
      .from('zwift_api_events')
      .select('event_id')
      .gte('time_unix', now)
      .lte('time_unix', oneHourFromNow);

    if (error) {
      console.error('[SignupScheduler] Error fetching urgent events:', error);
      return;
    }

    if (!urgentEvents || urgentEvents.length === 0) {
      console.log('[SignupScheduler] ℹ️  No urgent events found');
      return;
    }

    console.log(`[SignupScheduler] ⚡ Syncing ${urgentEvents.length} urgent events...`);
    
    // Sync in batches of 10 to avoid rate limits
    const batchSize = 10;
    let synced = 0;
    let failed = 0;

    for (let i = 0; i < urgentEvents.length; i += batchSize) {
      const batch = urgentEvents.slice(i, i + batchSize);
      
      for (const event of batch) {
        try {
          await syncService.syncEventSignups(event.event_id);
          synced++;
        } catch (error) {
          console.error(`[SignupScheduler] Failed to sync event ${event.event_id}:`, error);
          failed++;
        }
        
        // Rate limit: wait 200ms between calls (max 5/min)
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Wait 1 minute between batches
      if (i + batchSize < urgentEvents.length) {
        console.log(`[SignupScheduler] Batch complete (${synced}/${urgentEvents.length}), waiting 1 minute...`);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }

    console.log(`[SignupScheduler] ✅ URGENT sync complete: ${synced} synced, ${failed} failed`);
  }

  /**
   * US6: Sync signups voor events tussen 1h en 48h
   */
  private async syncNonUrgentSignups(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const oneHourFromNow = now + (60 * 60);
    const fortyEightHoursFromNow = now + (48 * 60 * 60);

    const { data: events, error } = await supabase['client']
      .from('zwift_api_events')
      .select('event_id')
      .gt('time_unix', oneHourFromNow)  // > 1h
      .lte('time_unix', fortyEightHoursFromNow);  // <= 48h

    if (error) {
      console.error('[SignupScheduler] Error fetching non-urgent events:', error);
      return;
    }

    if (!events || events.length === 0) {
      console.log('[SignupScheduler] ℹ️  No non-urgent events found');
      return;
    }

    console.log(`[SignupScheduler] 📅 Syncing ${events.length} non-urgent events...`);
    
    // Sync in batches of 10
    const batchSize = 10;
    let synced = 0;
    let failed = 0;

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      
      for (const event of batch) {
        try {
          await syncService.syncEventSignups(event.event_id);
          synced++;
        } catch (error) {
          console.error(`[SignupScheduler] Failed to sync event ${event.event_id}:`, error);
          failed++;
        }
        
        // Rate limit: wait 200ms between calls
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Wait 1 minute between batches
      if (i + batchSize < events.length) {
        console.log(`[SignupScheduler] Batch complete (${synced}/${events.length}), waiting 1 minute...`);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }

    console.log(`[SignupScheduler] ✅ HOURLY sync complete: ${synced} synced, ${failed} failed`);
  }

  /**
   * Run initial sync bij opstarten
   */
  private async runInitialSync(): Promise<void> {
    console.log('[SignupScheduler] 🔄 Running initial signup sync...');
    
    try {
      // Sync urgent events first
      await this.syncUrgentSignups();
      
      // Then non-urgent (limited to first 50 to avoid rate limits at startup)
      console.log('[SignupScheduler] Running limited non-urgent sync (first 50 events)...');
      const now = Math.floor(Date.now() / 1000);
      const oneHourFromNow = now + (60 * 60);
      const fortyEightHoursFromNow = now + (48 * 60 * 60);

      const { data: events } = await supabase['client']
        .from('zwift_api_events')
        .select('event_id')
        .gt('time_unix', oneHourFromNow)
        .lte('time_unix', fortyEightHoursFromNow)
        .limit(50);

      if (events && events.length > 0) {
        let synced = 0;
        for (const event of events) {
          try {
            await syncService.syncEventSignups(event.event_id);
            synced++;
          } catch (error) {
            console.error(`[SignupScheduler] Failed: ${event.event_id}`);
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        console.log(`[SignupScheduler] ✅ Initial sync: ${synced}/${events.length} events`);
      }
    } catch (error) {
      console.error('[SignupScheduler] ❌ Initial sync failed:', error);
    }
  }

  /**
   * Manual trigger voor testing
   */
  async manualSyncUrgent(): Promise<void> {
    console.log('[SignupScheduler] 🔄 Manual urgent sync triggered...');
    await this.syncUrgentSignups();
  }

  async manualSyncHourly(): Promise<void> {
    console.log('[SignupScheduler] 🔄 Manual hourly sync triggered...');
    await this.syncNonUrgentSignups();
  }
}

// Singleton instance
export const signupScheduler = new SignupSchedulerService();
