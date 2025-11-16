/**
 * Rate Limiter Service
 * 
 * Voorkomt sync conflicts en respecteert ZwiftRacing API rate limits:
 * 
 * RATE LIMITS (Standard tier):
 * - GET /public/clubs/:id       → 1/60min  (club members)
 * - GET /public/riders/:id      → 5/1min   (individual riders)
 * - POST /public/riders         → 1/15min  (bulk riders)
 * - GET /public/events/:id      → 1/1min   (event details)
 * - GET /public/event_signups   → 1/1min   (event signups)
 * - GET /public/results/:id     → 1/1min   (event results)
 * - GET /api/events/upcoming    → Unknown  (assume 1/1min)
 */

type EndpointType = 
  | 'club_members'      // GET /public/clubs/:id - 1/60min
  | 'rider_individual'  // GET /public/riders/:id - 5/1min
  | 'rider_bulk'        // POST /public/riders - 1/15min
  | 'event_details'     // GET /public/events/:id - 1/1min
  | 'event_signups'     // GET /api/events/:id/signups - 1/1min
  | 'event_results'     // GET /public/results/:id - 1/1min
  | 'events_upcoming';  // GET /api/events/upcoming - 1/1min (assumed)

interface RateLimitConfig {
  maxCalls: number;        // Maximum aantal calls
  windowMs: number;        // Tijd window in milliseconds
  penaltyMs: number;       // Extra wachttijd na rate limit bereikt
}

interface CallRecord {
  timestamp: number;
  endpoint: EndpointType;
}

export class RateLimiter {
  private callHistory: Map<EndpointType, CallRecord[]> = new Map();
  private locks: Map<EndpointType, Promise<void>> = new Map();
  
  private readonly configs: Record<EndpointType, RateLimitConfig> = {
    club_members: {
      maxCalls: 1,
      windowMs: 60 * 60 * 1000,  // 60 minuten
      penaltyMs: 5 * 60 * 1000,  // 5 min extra bij overschrijding
    },
    rider_individual: {
      maxCalls: 5,
      windowMs: 60 * 1000,       // 1 minuut
      penaltyMs: 30 * 1000,      // 30 sec extra
    },
    rider_bulk: {
      maxCalls: 1,
      windowMs: 15 * 60 * 1000,  // 15 minuten
      penaltyMs: 2 * 60 * 1000,  // 2 min extra
    },
    event_details: {
      maxCalls: 1,
      windowMs: 60 * 1000,       // 1 minuut
      penaltyMs: 30 * 1000,      // 30 sec extra
    },
    event_signups: {
      maxCalls: 1,
      windowMs: 60 * 1000,       // 1 minuut
      penaltyMs: 30 * 1000,      // 30 sec extra
    },
    event_results: {
      maxCalls: 1,
      windowMs: 60 * 1000,       // 1 minuut
      penaltyMs: 30 * 1000,      // 30 sec extra
    },
    events_upcoming: {
      maxCalls: 1,
      windowMs: 60 * 1000,       // 1 minuut (conservatief)
      penaltyMs: 30 * 1000,      // 30 sec extra
    },
  };

  /**
   * Check of een endpoint call mag gebeuren binnen rate limits
   */
  canMakeCall(endpoint: EndpointType): boolean {
    const config = this.configs[endpoint];
    const history = this.callHistory.get(endpoint) || [];
    
    // Verwijder oude calls buiten het window
    const now = Date.now();
    const recentCalls = history.filter(
      call => now - call.timestamp < config.windowMs
    );
    
    return recentCalls.length < config.maxCalls;
  }

  /**
   * Bereken hoeveel milliseconds gewacht moet worden tot volgende call mag
   */
  getWaitTime(endpoint: EndpointType): number {
    const config = this.configs[endpoint];
    const history = this.callHistory.get(endpoint) || [];
    
    if (history.length === 0) return 0;
    
    const now = Date.now();
    const recentCalls = history.filter(
      call => now - call.timestamp < config.windowMs
    );
    
    if (recentCalls.length < config.maxCalls) return 0;
    
    // Bereken wanneer de oudste call in window expires
    const oldestCall = recentCalls[0];
    const timeSinceOldest = now - oldestCall.timestamp;
    const waitTime = config.windowMs - timeSinceOldest + config.penaltyMs;
    
    return Math.max(0, waitTime);
  }

  /**
   * Wacht tot een call mag worden gemaakt (met lock om conflicts te voorkomen)
   */
  async waitForSlot(endpoint: EndpointType): Promise<void> {
    // Check of er al een lock is voor dit endpoint
    const existingLock = this.locks.get(endpoint);
    if (existingLock) {
      console.log(`[RateLimiter] ⏳ Waiting for existing lock on ${endpoint}`);
      await existingLock;
    }

    // Maak nieuwe lock
    const lockPromise = this._waitForSlotInternal(endpoint);
    this.locks.set(endpoint, lockPromise);
    
    try {
      await lockPromise;
    } finally {
      this.locks.delete(endpoint);
    }
  }

  private async _waitForSlotInternal(endpoint: EndpointType): Promise<void> {
    const config = this.configs[endpoint];
    
    while (!this.canMakeCall(endpoint)) {
      const waitTime = this.getWaitTime(endpoint);
      
      if (waitTime > 0) {
        const waitMinutes = Math.ceil(waitTime / 60000);
        const friendlyName = this._getFriendlyName(endpoint);
        console.log(
          `[RateLimiter] 🚦 ${friendlyName}: ` +
          `wacht ${waitMinutes} min (limit: ${config.maxCalls}/${this._formatWindow(config.windowMs)})`
        );
        
        await this._sleep(waitTime);
      }
    }
  }

  /**
   * Registreer dat een call is gemaakt
   */
  recordCall(endpoint: EndpointType): void {
    const history = this.callHistory.get(endpoint) || [];
    const now = Date.now();
    
    history.push({
      timestamp: now,
      endpoint,
    });
    
    this.callHistory.set(endpoint, history);
    
    // Cleanup oude calls
    this._cleanupHistory(endpoint);
  }

  /**
   * Wrapper functie: wacht op slot en voer callback uit
   */
  async executeWithLimit<T>(
    endpoint: EndpointType,
    callback: () => Promise<T>
  ): Promise<T> {
    await this.waitForSlot(endpoint);
    
    try {
      const result = await callback();
      this.recordCall(endpoint);
      return result;
    } catch (error: any) {
      // Als we toch een 429 krijgen, registreer call + penalty
      if (error.response?.status === 429) {
        this.recordCall(endpoint);
        console.error(`[RateLimiter] ❌ 429 ondanks rate limiting voor ${endpoint}`);
      }
      throw error;
    }
  }

  /**
   * Verwijder calls ouder dan het window
   */
  private _cleanupHistory(endpoint: EndpointType): void {
    const config = this.configs[endpoint];
    const history = this.callHistory.get(endpoint) || [];
    const now = Date.now();
    
    const recentCalls = history.filter(
      call => now - call.timestamp < config.windowMs
    );
    
    this.callHistory.set(endpoint, recentCalls);
  }

  /**
   * Reset rate limiter (voor testing)
   */
  reset(): void {
    this.callHistory.clear();
    this.locks.clear();
  }

  /**
   * Get rate limiter status voor monitoring
   */
  getStatus(): Record<EndpointType, { 
    callsInWindow: number; 
    maxCalls: number; 
    canCall: boolean;
    waitTimeMs: number;
  }> {
    const status = {} as any;
    
    const endpoints: EndpointType[] = [
      'club_members',
      'rider_individual',
      'rider_bulk',
      'event_details',
      'event_signups',
      'event_results',
      'events_upcoming',
    ];
    
    for (const endpoint of endpoints) {
      const config = this.configs[endpoint];
      const history = this.callHistory.get(endpoint) || [];
      const now = Date.now();
      
      const recentCalls = history.filter(
        call => now - call.timestamp < config.windowMs
      );
      
      status[endpoint] = {
        callsInWindow: recentCalls.length,
        maxCalls: config.maxCalls,
        canCall: this.canMakeCall(endpoint),
        waitTimeMs: this.getWaitTime(endpoint),
      };
    }
    
    return status;
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private _formatWindow(ms: number): string {
    if (ms >= 60 * 60 * 1000) {
      return `${ms / (60 * 60 * 1000)}h`;
    } else if (ms >= 60 * 1000) {
      return `${ms / (60 * 1000)}min`;
    } else {
      return `${ms / 1000}s`;
    }
  }

  /**
   * User-friendly names voor endpoints
   */
  private _getFriendlyName(endpoint: EndpointType): string {
    const names: Record<EndpointType, string> = {
      club_members: 'Team members sync (rider IDs ophalen)',
      rider_individual: 'Individual rider sync',
      rider_bulk: 'Rider bulk sync (team data)',
      event_details: 'Event details sync',
      event_signups: 'Event signups sync',
      event_results: 'Event results sync',
      events_upcoming: 'Upcoming events sync',
    };
    return names[endpoint] || endpoint;
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
