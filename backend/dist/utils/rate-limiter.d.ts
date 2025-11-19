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
type EndpointType = 'club_members' | 'rider_individual' | 'rider_bulk' | 'event_details' | 'event_signups' | 'event_results' | 'events_upcoming';
export declare class RateLimiter {
    private callHistory;
    private locks;
    private readonly configs;
    /**
     * Check of een endpoint call mag gebeuren binnen rate limits
     */
    canMakeCall(endpoint: EndpointType): boolean;
    /**
     * Bereken hoeveel milliseconds gewacht moet worden tot volgende call mag
     */
    getWaitTime(endpoint: EndpointType): number;
    /**
     * Wacht tot een call mag worden gemaakt (met lock om conflicts te voorkomen)
     */
    waitForSlot(endpoint: EndpointType): Promise<void>;
    private _waitForSlotInternal;
    /**
     * Registreer dat een call is gemaakt
     */
    recordCall(endpoint: EndpointType): void;
    /**
     * Wrapper functie: wacht op slot en voer callback uit
     */
    executeWithLimit<T>(endpoint: EndpointType, callback: () => Promise<T>): Promise<T>;
    /**
     * Verwijder calls ouder dan het window
     */
    private _cleanupHistory;
    /**
     * Reset rate limiter (voor testing)
     */
    reset(): void;
    /**
     * Get rate limiter status voor monitoring
     */
    getStatus(): Record<EndpointType, {
        callsInWindow: number;
        maxCalls: number;
        canCall: boolean;
        waitTimeMs: number;
    }>;
    private _sleep;
    private _formatWindow;
    /**
     * User-friendly names voor endpoints
     */
    private _getFriendlyName;
}
export declare const rateLimiter: RateLimiter;
export {};
//# sourceMappingURL=rate-limiter.d.ts.map