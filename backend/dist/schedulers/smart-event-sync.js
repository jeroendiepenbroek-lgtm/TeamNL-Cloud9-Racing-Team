/**
 * Smart Event Sync Scheduler
 * US3: Events >1h syncen elk uur
 * US4: Events <=1h syncen elke 10 min
 * Configureerbaar via syncConfigService
 */
import { syncServiceV2 as syncService } from '../services/sync-v2.service.js';
import { supabase } from '../services/supabase.service.js';
import { syncConfigService } from '../services/sync-config.service.js';
export class SmartEventSync {
    intervalId = null;
    lastSyncTimes = new Map();
    start() {
        const config = syncConfigService.getConfig();
        console.log('[SmartEventSync] 🧠 Starting intelligent event sync scheduler...');
        console.log('[SmartEventSync] Config:', {
            nearThreshold: `${config.nearEventThresholdMinutes}min`,
            nearInterval: `${config.nearEventSyncIntervalMinutes}min`,
            farInterval: `${config.farEventSyncIntervalMinutes}min`,
            checkInterval: `${config.checkIntervalMinutes}min`,
            lookforward: `${config.lookforwardHours}h`
        });
        // Initial sync
        this.syncEvents();
        // Schedule periodic checks (using configurable interval)
        this.intervalId = setInterval(() => {
            this.syncEvents();
        }, syncConfigService.getCheckIntervalMs());
        console.log(`[SmartEventSync] ✅ Scheduler started (checks every ${config.checkIntervalMinutes} min)`);
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[SmartEventSync] ⏹️  Scheduler stopped');
        }
    }
    restart() {
        console.log('[SmartEventSync] 🔄 Restarting with new configuration...');
        this.stop();
        this.start();
    }
    async syncEvents() {
        try {
            const config = syncConfigService.getConfig();
            console.log('[SmartEventSync] 🔍 Analyzing upcoming events...');
            const now = Math.floor(Date.now() / 1000);
            const futureTime = now + syncConfigService.getLookforwardSeconds();
            // Get all upcoming events (using configurable lookforward)
            const events = await supabase.getUpcomingEventsRaw(config.lookforwardHours);
            console.log(`[SmartEventSync] Found ${events.length} upcoming events`);
            // Categorize events (using configurable threshold)
            const nearEvents = [];
            const soonEvents = [];
            const nearThresholdSeconds = syncConfigService.getNearEventThresholdSeconds();
            for (const event of events) {
                const timeUntilStart = event.time_unix - now;
                if (timeUntilStart <= nearThresholdSeconds) {
                    nearEvents.push(event.event_id);
                }
                else {
                    soonEvents.push(event.event_id);
                }
            }
            const thresholdMinutes = config.nearEventThresholdMinutes;
            console.log(`[SmartEventSync] Categorized: ${nearEvents.length} near (<=${thresholdMinutes}min), ${soonEvents.length} soon (>${thresholdMinutes}min)`);
            // Sync near events (using configurable interval)
            for (const eventId of nearEvents) {
                const lastSync = this.lastSyncTimes.get(eventId) || 0;
                const minutesSinceSync = (Date.now() - lastSync) / 1000 / 60;
                if (minutesSinceSync >= config.nearEventSyncIntervalMinutes || lastSync === 0) {
                    console.log(`[SmartEventSync] 🔥 Syncing NEAR event ${eventId} (${minutesSinceSync.toFixed(1)}min since last sync)`);
                    await this.syncEventSignups(eventId);
                    this.lastSyncTimes.set(eventId, Date.now());
                }
            }
            // Sync soon events (using configurable interval)
            for (const eventId of soonEvents) {
                const lastSync = this.lastSyncTimes.get(eventId) || 0;
                const minutesSinceSync = (Date.now() - lastSync) / 1000 / 60;
                if (minutesSinceSync >= config.farEventSyncIntervalMinutes || lastSync === 0) {
                    console.log(`[SmartEventSync] 📅 Syncing SOON event ${eventId} (${minutesSinceSync.toFixed(1)}min since last sync)`);
                    await this.syncEventSignups(eventId);
                    this.lastSyncTimes.set(eventId, Date.now());
                }
            }
            // Cleanup old sync records (events that passed)
            const eventIdsSet = new Set(events.map((e) => e.event_id));
            for (const [eventId] of this.lastSyncTimes) {
                if (!eventIdsSet.has(eventId)) {
                    this.lastSyncTimes.delete(eventId);
                }
            }
            console.log(`[SmartEventSync] ✅ Sync check complete. Tracking ${this.lastSyncTimes.size} events.`);
        }
        catch (error) {
            console.error('[SmartEventSync] ❌ Error in sync cycle:', error);
        }
    }
    async syncEventSignups(eventId) {
        try {
            const result = await syncService.syncEventSignups(eventId);
            console.log(`[SmartEventSync] ✅ Synced event ${eventId}: ${result.total} signups`);
        }
        catch (error) {
            console.error(`[SmartEventSync] ❌ Failed to sync event ${eventId}:`, error.message);
        }
    }
}
export const smartEventSync = new SmartEventSync();
//# sourceMappingURL=smart-event-sync.js.map