/**
 * Smart Event Sync Scheduler
 * US3: Events >1h syncen elk uur
 * US4: Events <=1h syncen elke 10 min
 */

import { syncService } from '../services/sync.service.js';
import { supabase } from '../services/supabase.service.js';

export class SmartEventSync {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
  
  private lastSyncTimes: Map<string, number> = new Map();

  start() {
    console.log('[SmartEventSync] 🧠 Starting intelligent event sync scheduler...');
    
    // Initial sync
    this.syncEvents();
    
    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.syncEvents();
    }, this.CHECK_INTERVAL);
    
    console.log('[SmartEventSync] ✅ Scheduler started (checks every 5 min)');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[SmartEventSync] ⏹️  Scheduler stopped');
    }
  }

  private async syncEvents() {
    try {
      console.log('[SmartEventSync] 🔍 Analyzing upcoming events...');
      
      const now = Math.floor(Date.now() / 1000);
      const future36h = now + (36 * 60 * 60);
      
      // Get all upcoming events (next 36h)
      const { data: events, error } = await supabase.client
        .from('zwift_api_events')
        .select('event_id, title, time_unix')
        .gte('time_unix', now)
        .lte('time_unix', future36h)
        .order('time_unix', { ascending: true });

      if (error || !events) {
        console.error('[SmartEventSync] ❌ Failed to fetch events:', error);
        return;
      }

      console.log(`[SmartEventSync] Found ${events.length} upcoming events`);

      // Categorize events
      const nearEvents: string[] = []; // <= 1 hour
      const soonEvents: string[] = []; // > 1 hour

      for (const event of events) {
        const timeUntilStart = event.time_unix - now;
        const hoursUntilStart = timeUntilStart / 3600;
        
        if (hoursUntilStart <= 1) {
          nearEvents.push(event.event_id);
        } else {
          soonEvents.push(event.event_id);
        }
      }

      console.log(`[SmartEventSync] Categorized: ${nearEvents.length} near (<=1h), ${soonEvents.length} soon (>1h)`);

      // Sync near events (<=1h) if 10+ minutes passed since last sync
      for (const eventId of nearEvents) {
        const lastSync = this.lastSyncTimes.get(eventId) || 0;
        const minutesSinceSync = (Date.now() - lastSync) / 1000 / 60;
        
        if (minutesSinceSync >= 10 || lastSync === 0) {
          console.log(`[SmartEventSync] 🔥 Syncing NEAR event ${eventId} (${minutesSinceSync.toFixed(1)}min since last sync)`);
          await this.syncEventSignups(eventId);
          this.lastSyncTimes.set(eventId, Date.now());
        }
      }

      // Sync soon events (>1h) if 60+ minutes passed since last sync
      for (const eventId of soonEvents) {
        const lastSync = this.lastSyncTimes.get(eventId) || 0;
        const minutesSinceSync = (Date.now() - lastSync) / 1000 / 60;
        
        if (minutesSinceSync >= 60 || lastSync === 0) {
          console.log(`[SmartEventSync] 📅 Syncing SOON event ${eventId} (${minutesSinceSync.toFixed(1)}min since last sync)`);
          await this.syncEventSignups(eventId);
          this.lastSyncTimes.set(eventId, Date.now());
        }
      }

      // Cleanup old sync records (events that passed)
      const eventIdsSet = new Set(events.map(e => e.event_id));
      for (const [eventId] of this.lastSyncTimes) {
        if (!eventIdsSet.has(eventId)) {
          this.lastSyncTimes.delete(eventId);
        }
      }

      console.log(`[SmartEventSync] ✅ Sync check complete. Tracking ${this.lastSyncTimes.size} events.`);
      
    } catch (error) {
      console.error('[SmartEventSync] ❌ Error in sync cycle:', error);
    }
  }

  private async syncEventSignups(eventId: string): Promise<void> {
    try {
      const result = await syncService.syncEventSignups(eventId);
      console.log(`[SmartEventSync] ✅ Synced event ${eventId}: ${result.total} signups`);
    } catch (error: any) {
      console.error(`[SmartEventSync] ❌ Failed to sync event ${eventId}:`, error.message);
    }
  }
}

export const smartEventSync = new SmartEventSync();
