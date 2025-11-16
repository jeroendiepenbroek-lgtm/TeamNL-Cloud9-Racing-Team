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

type SyncType = 'RIDER_SYNC' | 'NEAR_EVENT_SYNC' | 'FAR_EVENT_SYNC';

interface SyncRequest {
  type: SyncType;
  priority: number;  // 1 = highest
  callback: () => Promise<any>;
  timestamp: number;
}

class SyncCoordinator {
  private queue: SyncRequest[] = [];
  private currentSync: SyncType | null = null;
  private isProcessing: boolean = false;
  
  // Time slots voor elke sync type (om overlaps te voorkomen)
  private readonly timeSlots = {
    RIDER_SYNC: {
      // Draait elke 6 uur op :00 minuten
      intervalMinutes: 360,
      offsetMinutes: 0,
    },
    NEAR_EVENT_SYNC: {
      // Draait elke 15 min op :05, :20, :35, :50
      intervalMinutes: 15,
      offsetMinutes: 5,
    },
    FAR_EVENT_SYNC: {
      // Draait elke 2 uur op :30 minuten
      intervalMinutes: 120,
      offsetMinutes: 30,
    },
  };
  
  /**
   * Check of een sync type nu mag draaien (binnen zijn time slot)
   */
  canRunNow(type: SyncType): boolean {
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
  getNextSlot(type: SyncType): Date {
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
  async queueSync(type: SyncType, callback: () => Promise<any>): Promise<any> {
    const priority = this._getPriority(type);
    
    const request: SyncRequest = {
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
  async forceSync(type: SyncType, callback: () => Promise<any>): Promise<any> {
    console.log(`[SyncCoordinator] 🚀 Force sync ${type}`);
    
    this.currentSync = type;
    try {
      const result = await callback();
      return result;
    } finally {
      this.currentSync = null;
    }
  }
  
  /**
   * Check rate limiter status voor endpoints die sync gebruikt
   */
  canSyncRun(type: SyncType): { canRun: boolean; blockedBy: string | null } {
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
  
  private _getPriority(type: SyncType): number {
    // NEAR_EVENT_SYNC = highest (events binnen 24u zijn urgent)
    // RIDER_SYNC = medium (team data)
    // FAR_EVENT_SYNC = lowest (events ver weg)
    switch (type) {
      case 'NEAR_EVENT_SYNC': return 1;
      case 'RIDER_SYNC': return 2;
      case 'FAR_EVENT_SYNC': return 3;
      default: return 99;
    }
  }
  
  private _sortQueue(): void {
    this.queue.sort((a, b) => {
      // Eerst op priority
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Dan op timestamp (FIFO binnen priority)
      return a.timestamp - b.timestamp;
    });
  }
  
  private async _processQueue(): Promise<any> {
    if (this.isProcessing) return;
    
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
          const waitTime = rateLimiter.getWaitTime(blockedBy as any);
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
        } catch (error) {
          console.error(`[SyncCoordinator] ❌ ${request.type} failed:`, error);
          
          // Remove failed request
          this.queue.shift();
          
          throw error;
        } finally {
          this.currentSync = null;
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
  
  private async _waitForRequest(request: SyncRequest): Promise<any> {
    // Poll queue tot deze request processed is
    while (this.queue.includes(request)) {
      await this._sleep(1000);
    }
    
    // Request is processed, maar we hebben geen result
    // Dit is een limitation van het queue systeem
    return null;
  }
  
  private _sleep(ms: number): Promise<void> {
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
        canRunNow: this.canRunNow(type as SyncType),
        nextSlot: this.getNextSlot(type as SyncType),
        interval: `${slot.intervalMinutes}min`,
        offset: `${slot.offsetMinutes}min`,
      })),
    };
  }
}

// Singleton export
export const syncCoordinator = new SyncCoordinator();
