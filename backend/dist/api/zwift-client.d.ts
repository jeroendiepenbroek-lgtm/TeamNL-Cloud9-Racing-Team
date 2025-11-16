/**
 * ZwiftRacing API Client - Volledige endpoint coverage
 *
 * RATE LIMITS (Standard tier):
 * - Clubs: 1/60min
 * - Results: 1/1min
 * - Riders GET: 5/1min
 * - Riders POST: 1/15min
 *
 * Premium tier: 10x limiet voor clubs/riders, zelfde voor results
 */
import { ZwiftClub, ZwiftRider, ZwiftEvent, ZwiftResult } from '../types/index.js';
export declare class ZwiftApiClient {
    private client;
    private routesCache;
    private routesCacheExpiry;
    private readonly ROUTES_CACHE_TTL;
    constructor();
    /**
     * GET /public/clubs/<id>
     * Returns data for active members of the club sorted by riderId
     * Limited to 1000 results
     * Rate limit: 1/60min (Standard)
     */
    getClubMembers(clubId?: number): Promise<ZwiftRider[]>;
    /**
     * GET /public/clubs/<id>/<riderId>
     * Returns club members with riderId > <riderId> (pagination)
     * Limited to 1000 results per page
     * Rate limit: 1/60min (Standard)
     */
    getClubMembersPaginated(clubId: number, afterRiderId: number): Promise<ZwiftRider[]>;
    /**
     * GET /public/results/<eventId>
     * Returns ZwiftRacing.app results for eventId
     * Rate limit: 1/1min
     */
    getEventResults(eventId: number): Promise<ZwiftResult[]>;
    /**
     * GET /public/zp/<eventId>/results
     * Returns ZwiftPower results for eventId
     * Rate limit: 1/1min
     */
    getEventResultsZwiftPower(eventId: number): Promise<any[]>;
    /**
     * GET /public/riders/<riderId>
     * Returns current Rider data for riderId
     * Rate limit: 5/1min (Standard)
     */
    getRider(riderId: number): Promise<ZwiftRider>;
    /**
     * GET /public/riders/<riderId>/<time>
     * Returns Rider data at given epoch timestamp (no milliseconds!)
     * Rate limit: 5/1min (Standard)
     * @param time - Unix epoch (seconds, not milliseconds)
     */
    getRiderAtTime(riderId: number, time: number): Promise<ZwiftRider>;
    /**
     * POST /public/riders
     * Returns current Rider data for each riderId in array
     * Max 1000 riders per call
     * Rate limit: 1/15min (Standard) - VEEL EFFICIËNTER dan individuele GET!
     */
    getBulkRiders(riderIds: number[]): Promise<ZwiftRider[]>;
    /**
     * POST /public/riders/<time>
     * Returns Rider data for array of riderIds at given epoch timestamp
     * Max 1000 riders per call
     * Rate limit: 1/15min (Standard)
     * @param time - Unix epoch (seconds, not milliseconds)
     */
    getBulkRidersAtTime(riderIds: number[], time: number): Promise<ZwiftRider[]>;
    /**
     * GET /api/events/upcoming
     * Returns upcoming Zwift events (typically 800+ events)
     *
     * Response: ZwiftEvent[] (array, not wrapped in object!)
     * Each event has:
     * - eventId: string (e.g. "5144585")
     * - time: number (unix timestamp)
     * - title, routeId, distance, type, subType
     * - categories, signups (comma-separated strings)
     */
    getUpcomingEvents(): Promise<ZwiftEvent[]>;
    /**
     * Get upcoming events in next 48 hours
     * Filters events from /api/events/upcoming by time range
     */
    getEvents48Hours(): Promise<ZwiftEvent[]>;
    /**
     * GET /api/events/{eventId}
     * Returns detailed event data including participants (pens)
     */
    getEventDetails(eventId: number): Promise<ZwiftEvent>;
    /**
     * GET /api/events/{eventId}/signups
     * Returns signups per category (pen) with detailed rider data
     *
     * Response: EventSignups[]
     * Each pen (A/B/C/D/E) with array of riders including:
     * - riderId, name, weight, height
     * - club info
     * - power data (wkg curves, CP, AWC)
     * - race stats (rating, wins, podiums)
     * - phenotype (rider type)
     */
    getEventSignups(eventId: string): Promise<any[]>;
    /**
     * @deprecated Use getClubMembers() instead
     */
    getClub(clubId?: number): Promise<ZwiftClub>;
    /**
     * @deprecated Use getClubMembers() instead
     */
    getClubRiders(clubId?: number): Promise<ZwiftRider[]>;
    /**
     * @deprecated Endpoint doesn't exist - use getClubMembers()
     */
    getClubEvents(clubId?: number): Promise<ZwiftEvent[]>;
    /**
     * @deprecated Endpoint doesn't exist
     */
    getRiderHistory(riderId: number): Promise<any[]>;
    /**
     * @deprecated Use getEvents48Hours() instead - direct events API available!
     * Feature 1: Get rider upcoming events
     * NOTE: ZwiftRacing API now HAS a direct /api/events endpoint
     */
    getRiderUpcomingEvents(riderId: number): Promise<any[]>;
    /**
     * GET /api/routes
     * Returns all Zwift routes with profile information
     * Cached for 24 hours (routes change rarely)
     *
     * Route profiles: Flat, Rolling, Hilly, Mountainous
     */
    getAllRoutes(): Promise<any[]>;
    /**
     * Get route profile for a specific route
     * Returns: "Flat" | "Rolling" | "Hilly" | "Mountainous" | null
     */
    getRouteProfile(routeIdOrName: string): Promise<string | null>;
    /**
     * SYNC: Get cached route by ID without async call (PERFORMANCE)
     * Returns null if cache not loaded yet
     */
    getCachedRouteById(routeId: string | number): any | null;
    /**
     * US4: Get route details by route ID (most accurate)
     * Returns full route object with name, world, profile, laps etc
     */
    getRouteById(routeId: string | number): Promise<any | null>;
    /**
     * US4: Get route details by distance match
     * Returns full route object with name, world, profile, laps etc
     */
    getRouteByDistance(distanceKm: number, world?: string): Promise<any | null>;
    /**
     * US11: Find route profile by distance (km) and optional world
     * Matches routes within 0.5km tolerance
     */
    getRouteProfileByDistance(distanceKm: number, world?: string): Promise<string | null>;
}
export declare const zwiftClient: ZwiftApiClient;
//# sourceMappingURL=zwift-client.d.ts.map