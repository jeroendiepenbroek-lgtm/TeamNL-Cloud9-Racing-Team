/**
 * Sync Coordinator Service
 *
 * Coordineert de 3 sync types zonder rate limit conflicts:
 * - RIDER_SYNC (club members + bulk riders)
 * - NEAR_EVENT_SYNC (events < 24u + signups)
 * - FAR_EVENT_SYNC (events > 24u + signups)
 *
 * Strategy: Time slot allocation + priority queue
 */
import { rateLimiter } from '../utils/rate-limiter.js';
class SyncCoordinator {
    queue = [];
    currentSync = null;
    isProcessing = false;
    // Time slots voor elke sync type (om overlaps te voorkomen)
    timeSlots = {
        RIDER_SYNC: {
            // Draait elke 90 min op :00 en :30 (PRIORITY 1)
            // POST rate limit: 1/15min → 90min = 6x safety margin
            intervalMinutes: 90,
            offsetMinutes: 0,
        },
        NEAR_EVENT_SYNC: {
            // Legacy - draait elke 15 min op :05, :20, :35, :50
            intervalMinutes: 15,
            offsetMinutes: 5,
        },
        FAR_EVENT_SYNC: {
            // Legacy - draait elke 2 uur op :30 minuten
            intervalMinutes: 120,
            offsetMinutes: 30,
        },
        COMBINED_EVENT_SYNC: {
            // Draait elke 15 min op :05, :20, :35, :50 (NEAR)
            // + elke 3u op :50 (FULL) - veelvoud van NEAR interval!
            intervalMinutes: 15,
            offsetMinutes: 5,
        },
    };
    /**
     * Check of een sync type nu mag draaien (binnen zijn time slot)
     */
    canRunNow(type) {
        const now = new Date();
        const currentMinute = now.getMinutes();
        const slot = this.timeSlots[type];
        // Check of we binnen interval + offset window zitten
        const minutesSinceOffset = (currentMinute - slot.offsetMinutes + 60) % 60;
        const isInWindow = minutesSinceOffset % slot.intervalMinutes < 5; // 5 min window
        return isInWindow;
    }
    /**
     * Bereken wanneer volgende time slot is
     */
    getNextSlot(type) {
        const now = new Date();
        const slot = this.timeSlots[type];
        const currentMinute = now.getMinutes();
        const targetMinute = slot.offsetMinutes;
        let minutesToAdd = targetMinute - currentMinute;
        if (minutesToAdd <= 0) {
            minutesToAdd += slot.intervalMinutes;
        }
        const nextSlot = new Date(now.getTime() + minutesToAdd * 60000);
        return nextSlot;
    }
    /**
     * Queue een sync request met priority
     */
    async queueSync(type, callback) {
        const priority = this._getPriority(type);
        const request = {
            type,
            priority,
            callback,
            timestamp: Date.now(),
        };
        console.log(`[SyncCoordinator] 📥 Queued ${type} (priority ${priority})`);
        this.queue.push(request);
        this._sortQueue();
        // Start processing als we niet bezig zijn
        if (!this.isProcessing) {
            return await this._processQueue();
        }
        // Wacht tot deze request processed is
        return await this._waitForRequest(request);
    }
    /**
     * Direct sync zonder queue (force mode)
     */
    async forceSync(type, callback) {
        console.log(`[SyncCoordinator] 🚀 Force sync ${type}`);
        this.currentSync = type;
        try {
            const result = await callback();
            return result;
        }
        finally {
            this.currentSync = null;
        }
    }
    /**
     * Check rate limiter status voor endpoints die sync gebruikt
     */
    canSyncRun(type) {
        const status = rateLimiter.getStatus();
        switch (type) {
            case 'RIDER_SYNC':
                // Gebruikt: club_members + rider_bulk
                if (!status.club_members.canCall) {
                    return { canRun: false, blockedBy: 'club_members' };
                }
                if (!status.rider_bulk.canCall) {
                    return { canRun: false, blockedBy: 'rider_bulk' };
                }
                break;
            case 'NEAR_EVENT_SYNC':
            case 'FAR_EVENT_SYNC':
            case 'COMBINED_EVENT_SYNC':
                // Gebruikt: events_upcoming + event_signups
                if (!status.events_upcoming.canCall) {
                    return { canRun: false, blockedBy: 'events_upcoming' };
                }
                if (!status.event_signups.canCall) {
                    return { canRun: false, blockedBy: 'event_signups' };
                }
                break;
        }
        return { canRun: true, blockedBy: null };
    }
    _getPriority(type) {
        // RIDER_SYNC = highest (team member data is meest critical)
        // COMBINED_EVENT_SYNC = medium (event data + signups)
        // Legacy syncs = lowest
        switch (type) {
            case 'RIDER_SYNC': return 1; // PRIORITY 1 - Team data first!
            case 'COMBINED_EVENT_SYNC': return 2;
            case 'NEAR_EVENT_SYNC': return 2; // Legacy - zelfde als combined
            case 'FAR_EVENT_SYNC': return 3;
            default: return 99;
        }
    }
    _sortQueue() {
        this.queue.sort((a, b) => {
            // Eerst op priority
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            // Dan op timestamp (FIFO binnen priority)
            return a.timestamp - b.timestamp;
        });
    }
    async _processQueue() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        try {
            while (this.queue.length > 0) {
                const request = this.queue[0];
                console.log(`[SyncCoordinator] 🔄 Processing ${request.type} (${this.queue.length} in queue)`);
                // Check time slot
                if (!this.canRunNow(request.type)) {
                    const nextSlot = this.getNextSlot(request.type);
                    const waitMs = nextSlot.getTime() - Date.now();
                    const waitMin = Math.ceil(waitMs / 60000);
                    console.log(`[SyncCoordinator] ⏰ ${request.type} outside time slot, waiting ${waitMin}min`);
                    await this._sleep(waitMs);
                }
                // Check rate limits
                const { canRun, blockedBy } = this.canSyncRun(request.type);
                if (!canRun) {
                    const waitTime = rateLimiter.getWaitTime(blockedBy);
                    const waitMin = Math.ceil(waitTime / 60000);
                    console.log(`[SyncCoordinator] 🚦 ${request.type} blocked by ${blockedBy}, waiting ${waitMin}min`);
                    await this._sleep(waitTime);
                    // ✅ Re-sort queue om priority te behouden na wait
                    this._sortQueue();
                    console.log(`[SyncCoordinator] 🔄 Queue re-sorted after rate limit wait (${this.queue.length} items)`);
                    continue; // Re-check na wait
                }
                // Execute sync
                this.currentSync = request.type;
                try {
                    const result = await request.callback();
                    console.log(`[SyncCoordinator] ✅ ${request.type} completed`);
                    // Remove from queue
                    this.queue.shift();
                    return result;
                }
                catch (error) {
                    console.error(`[SyncCoordinator] ❌ ${request.type} failed:`, error);
                    // Remove failed request
                    this.queue.shift();
                    throw error;
                }
                finally {
                    this.currentSync = null;
                }
            }
        }
        finally {
            this.isProcessing = false;
        }
    }
    async _waitForRequest(request) {
        // Poll queue tot deze request processed is
        while (this.queue.includes(request)) {
            await this._sleep(1000);
        }
        // Request is processed, maar we hebben geen result
        // Dit is een limitation van het queue systeem
        return null;
    }
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get coordinator status
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            currentSync: this.currentSync,
            queueLength: this.queue.length,
            queue: this.queue.map(r => ({
                type: r.type,
                priority: r.priority,
                age: Date.now() - r.timestamp,
            })),
            timeSlots: Object.entries(this.timeSlots).map(([type, slot]) => ({
                type,
                canRunNow: this.canRunNow(type),
                nextSlot: this.getNextSlot(type),
                interval: `${slot.intervalMinutes}min`,
                offset: `${slot.offsetMinutes}min`,
            })),
        };
    }
}
// Singleton export
export const syncCoordinator = new SyncCoordinator();
//# sourceMappingURL=sync-coordinator.service.js.map