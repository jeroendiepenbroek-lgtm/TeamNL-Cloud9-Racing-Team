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
import axios from 'axios';
import { rateLimiter } from '../utils/rate-limiter.js';
const ZWIFT_API_BASE = 'https://zwift-ranking.herokuapp.com';
const ZWIFT_API_KEY = process.env.ZWIFT_API_KEY || '';
const TEAM_CLUB_ID = 11818;
export class ZwiftApiClient {
    client;
    routesCache = null; // Cache voor route profiles
    routesCacheExpiry = 0;
    ROUTES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 uur
    constructor() {
        this.client = axios.create({
            baseURL: ZWIFT_API_BASE,
            headers: {
                'Authorization': ZWIFT_API_KEY,
            },
            timeout: 30000,
        });
        console.log(`[ZwiftAPI] ✅ Client initialized with header: Authorization: ${ZWIFT_API_KEY.substring(0, 10)}...`);
        // Axios interceptor voor logging
        this.client.interceptors.request.use((config) => {
            console.log(`[ZwiftAPI] ${config.method?.toUpperCase()} ${config.url} | Header: Authorization: ${config.headers['Authorization']?.toString().substring(0, 10)}...`);
            return config;
        });
        this.client.interceptors.response.use((response) => {
            console.log(`[ZwiftAPI] ✅ ${response.config.url} → ${response.status}`);
            return response;
        }, (error) => {
            const status = error.response?.status || 'TIMEOUT';
            const url = error.config?.url || 'unknown';
            if (status === 429) {
                // Parse endpoint voor user-friendly message
                const friendlyEndpoint = this._getFriendlyEndpointName(url);
                console.error(`[ZwiftAPI] 🚫 RATE LIMIT (429) ${url} - Too many requests`);
                error.message = `Rate limit exceeded: ${friendlyEndpoint}. Wait before retrying.`;
            }
            else if (status === 'TIMEOUT') {
                console.error(`[ZwiftAPI] ⏱️  TIMEOUT ${url}`);
                error.message = `Request timeout for ${url}`;
            }
            else {
                console.error(`[ZwiftAPI] ❌ ${url} → ${status}`);
            }
            throw error;
        });
    }
    // ============================================================================
    // CLUBS - Rate limit: 1/60min (Standard) | 10/60min (Premium)
    // ============================================================================
    /**
     * GET /public/clubs/<id>
     * Returns data for active members of the club sorted by riderId
     * Limited to 1000 results
     * Rate limit: 1/60min (Standard)
     */
    async getClubMembers(clubId = TEAM_CLUB_ID) {
        return await rateLimiter.executeWithLimit('club_members', async () => {
            const response = await this.client.get(`/public/clubs/${clubId}`);
            return response.data;
        });
    }
    /**
     * GET /public/clubs/<id>/<riderId>
     * Returns club members with riderId > <riderId> (pagination)
     * Limited to 1000 results per page
     * Rate limit: 1/60min (Standard)
     */
    async getClubMembersPaginated(clubId, afterRiderId) {
        const response = await this.client.get(`/public/clubs/${clubId}/${afterRiderId}`);
        return response.data;
    }
    // ============================================================================
    // RESULTS - Rate limit: 1/1min (beide tiers gelijk)
    // ============================================================================
    /**
     * GET /public/results/<eventId>
     * Returns ZwiftRacing.app results for eventId
     * Rate limit: 1/1min
     */
    async getEventResults(eventId) {
        return await rateLimiter.executeWithLimit('event_results', async () => {
            const response = await this.client.get(`/public/results/${eventId}`);
            return response.data;
        });
    }
    /**
     * GET /public/zp/<eventId>/results
     * Returns ZwiftPower results for eventId
     * Rate limit: 1/1min
     */
    async getEventResultsZwiftPower(eventId) {
        const response = await this.client.get(`/public/zp/${eventId}/results`);
        return response.data;
    }
    // ============================================================================
    // RIDERS (GET) - Rate limit: 5/1min (Standard) | 10/1min (Premium)
    // ============================================================================
    /**
     * GET /public/riders/<riderId>
     * Returns current Rider data for riderId
     * Rate limit: 5/1min (Standard)
     */
    async getRider(riderId) {
        return await rateLimiter.executeWithLimit('rider_individual', async () => {
            const response = await this.client.get(`/public/riders/${riderId}`);
            return response.data;
        });
    }
    /**
     * GET /public/riders/<riderId>/<time>
     * Returns Rider data at given epoch timestamp (no milliseconds!)
     * Rate limit: 5/1min (Standard)
     * @param time - Unix epoch (seconds, not milliseconds)
     */
    async getRiderAtTime(riderId, time) {
        const response = await this.client.get(`/public/riders/${riderId}/${time}`);
        return response.data;
    }
    // ============================================================================
    // RIDERS (POST) - Rate limit: 1/15min (Standard) | 10/15min (Premium)
    // ============================================================================
    /**
     * POST /public/riders
     * Returns current Rider data for each riderId in array
     * Max 1000 riders per call
     * Rate limit: 1/15min (Standard) - VEEL EFFICIËNTER dan individuele GET!
     */
    async getBulkRiders(riderIds) {
        if (riderIds.length > 1000) {
            throw new Error('Maximum 1000 rider IDs per bulk request');
        }
        return await rateLimiter.executeWithLimit('rider_bulk', async () => {
            const response = await this.client.post('/public/riders', riderIds);
            return response.data;
        });
    }
    /**
     * POST /public/riders/<time>
     * Returns Rider data for array of riderIds at given epoch timestamp
     * Max 1000 riders per call
     * Rate limit: 1/15min (Standard)
     * @param time - Unix epoch (seconds, not milliseconds)
     */
    async getBulkRidersAtTime(riderIds, time) {
        if (riderIds.length > 1000) {
            throw new Error('Maximum 1000 rider IDs per bulk request');
        }
        const response = await this.client.post(`/public/riders/${time}`, riderIds);
        return response.data;
    }
    // ============================================================================
    // EVENTS (UPCOMING) - Rate limit: Unknown
    // ============================================================================
    // ✅ CORRECT ENDPOINT: /api/events/upcoming returns future events!
    // - Retourneert 800+ upcoming events (sorted by time ascending)
    // - Simpele array response (geen wrapper object)
    // - Time range: vanaf NU tot meerdere dagen vooruit
    // ============================================================================
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
    async getUpcomingEvents() {
        return await rateLimiter.executeWithLimit('events_upcoming', async () => {
            const response = await this.client.get('/api/events/upcoming');
            // Response is direct array, not wrapped in { events: [] }
            const events = Array.isArray(response.data) ? response.data : [];
            console.log(`[ZwiftAPI] ✅ /api/events/upcoming returned ${events.length} upcoming events`);
            return events;
        });
    }
    /**
     * Get upcoming events in next 48 hours
     * Filters events from /api/events/upcoming by time range
     */
    async getEvents48Hours() {
        const allEvents = await this.getUpcomingEvents();
        const now = Math.floor(Date.now() / 1000);
        const in48Hours = now + (48 * 60 * 60);
        const filtered = allEvents.filter(event => event.time >= now && event.time <= in48Hours);
        console.log(`[ZwiftAPI] Filtered ${filtered.length}/${allEvents.length} events for next 48h`);
        return filtered;
    }
    /**
     * GET /api/events/{eventId}
     * Returns detailed event data including participants (pens)
     */
    async getEventDetails(eventId) {
        return await rateLimiter.executeWithLimit('event_details', async () => {
            const response = await this.client.get(`/api/events/${eventId}`);
            return response.data;
        });
    }
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
    async getEventSignups(eventId) {
        return await rateLimiter.executeWithLimit('event_signups', async () => {
            const response = await this.client.get(`/api/events/${eventId}/signups`);
            console.log(`[ZwiftAPI] ✅ /api/events/${eventId}/signups returned ${response.data.length} pens`);
            return response.data;
        });
    }
    // ============================================================================
    // LEGACY / DEPRECATED METHODS (behouden voor backwards compatibility)
    // ============================================================================
    /**
     * @deprecated Use getClubMembers() instead
     */
    async getClub(clubId = TEAM_CLUB_ID) {
        console.warn('[ZwiftAPI] getClub() is deprecated, use getClubMembers()');
        const response = await this.client.get(`/public/clubs/${clubId}`);
        return response.data;
    }
    /**
     * @deprecated Use getClubMembers() instead
     */
    async getClubRiders(clubId = TEAM_CLUB_ID) {
        console.warn('[ZwiftAPI] getClubRiders() is deprecated, use getClubMembers()');
        return this.getClubMembers(clubId);
    }
    /**
     * @deprecated Endpoint doesn't exist - use getClubMembers()
     */
    async getClubEvents(clubId = TEAM_CLUB_ID) {
        console.warn('[ZwiftAPI] getClubEvents() is niet beschikbaar in API');
        throw new Error('Endpoint /public/clubs/{id}/events does not exist');
    }
    /**
     * @deprecated Endpoint doesn't exist
     */
    async getRiderHistory(riderId) {
        console.warn('[ZwiftAPI] getRiderHistory() is niet beschikbaar in API');
        throw new Error('Endpoint /public/riders/{id}/history does not exist');
    }
    /**
     * @deprecated Use getEvents48Hours() instead - direct events API available!
     * Feature 1: Get rider upcoming events
     * NOTE: ZwiftRacing API now HAS a direct /api/events endpoint
     */
    async getRiderUpcomingEvents(riderId) {
        console.warn('[ZwiftAPI] getRiderUpcomingEvents() is deprecated - use getEvents48Hours() instead');
        return [];
    }
    // ============================================================================
    // ROUTES - US11: Route profile data (Flat/Rolling/Hilly/Mountainous)
    // ============================================================================
    /**
     * GET /api/routes
     * Returns all Zwift routes with profile information
     * Cached for 24 hours (routes change rarely)
     *
     * Route profiles: Flat, Rolling, Hilly, Mountainous
     */
    async getAllRoutes() {
        // Check cache
        if (this.routesCache && Date.now() < this.routesCacheExpiry) {
            console.log('[ZwiftAPI] Routes loaded from cache');
            return Array.from(this.routesCache.values());
        }
        console.log('[ZwiftAPI] Fetching routes from API...');
        const response = await this.client.get('/api/routes');
        const routes = response.data;
        // Build cache Map by routeId for O(1) lookup
        this.routesCache = new Map();
        routes.forEach((route) => {
            if (route.routeId) {
                this.routesCache.set(route.routeId, route);
            }
            // Also index by name for fallback
            if (route.name) {
                this.routesCache.set(route.name.toLowerCase(), route);
            }
        });
        this.routesCacheExpiry = Date.now() + this.ROUTES_CACHE_TTL;
        console.log(`[ZwiftAPI] Cached ${routes.length} routes (expires in 24h)`);
        return routes;
    }
    /**
     * Get route profile for a specific route
     * Returns: "Flat" | "Rolling" | "Hilly" | "Mountainous" | null
     */
    async getRouteProfile(routeIdOrName) {
        // Ensure cache is loaded
        if (!this.routesCache || Date.now() >= this.routesCacheExpiry) {
            await this.getAllRoutes();
        }
        if (!this.routesCache)
            return null;
        // Try by routeId first
        let route = this.routesCache.get(routeIdOrName);
        // Try by name (case-insensitive)
        if (!route && typeof routeIdOrName === 'string') {
            route = this.routesCache.get(routeIdOrName.toLowerCase());
        }
        return route?.profile || null;
    }
    /**
     * SYNC: Get cached route by ID without async call (PERFORMANCE)
     * Returns null if cache not loaded yet
     */
    getCachedRouteById(routeId) {
        if (!this.routesCache || Date.now() >= this.routesCacheExpiry) {
            return null; // Cache expired or not loaded
        }
        const routeIdStr = String(routeId);
        return this.routesCache.get(routeIdStr) || null;
    }
    /**
     * US4: Get route details by route ID (most accurate)
     * Returns full route object with name, world, profile, laps etc
     */
    async getRouteById(routeId) {
        // Ensure cache is loaded
        if (!this.routesCache || Date.now() >= this.routesCacheExpiry) {
            await this.getAllRoutes();
        }
        if (!this.routesCache)
            return null;
        // Direct lookup by route ID
        const routeIdStr = String(routeId);
        const route = this.routesCache.get(routeIdStr);
        return route || null;
    }
    /**
     * US4: Get route details by distance match
     * Returns full route object with name, world, profile, laps etc
     */
    async getRouteByDistance(distanceKm, world) {
        // Ensure cache is loaded
        if (!this.routesCache || Date.now() >= this.routesCacheExpiry) {
            await this.getAllRoutes();
        }
        if (!this.routesCache)
            return null;
        const routes = Array.from(this.routesCache.values());
        const tolerance = 0.5; // ±500 meters
        // Filter by distance match
        const matchingRoutes = routes.filter(route => {
            if (!route.distance)
                return false;
            const diff = Math.abs(route.distance - distanceKm);
            if (diff > tolerance)
                return false;
            // Prefer world match if provided
            if (world && route.world?.toLowerCase() !== world.toLowerCase()) {
                return false;
            }
            return true;
        });
        // Return first match with profile
        return matchingRoutes.find(r => r.profile) || matchingRoutes[0] || null;
    }
    /**
     * US11: Find route profile by distance (km) and optional world
     * Matches routes within 0.5km tolerance
     */
    async getRouteProfileByDistance(distanceKm, world) {
        // Ensure cache is loaded
        if (!this.routesCache || Date.now() >= this.routesCacheExpiry) {
            await this.getAllRoutes();
        }
        if (!this.routesCache)
            return null;
        const routes = Array.from(this.routesCache.values());
        const tolerance = 0.5; // 500m tolerance
        // Filter routes by distance match
        const matchingRoutes = routes.filter((route) => {
            if (!route.distance)
                return false;
            const diff = Math.abs(route.distance - distanceKm);
            if (diff > tolerance)
                return false;
            // If world provided, must match
            if (world && route.world && route.world.toLowerCase() !== world.toLowerCase()) {
                return false;
            }
            return true;
        });
        if (matchingRoutes.length === 0)
            return null;
        // If multiple matches, prefer exact world match or take first with profile
        if (world) {
            const exactMatch = matchingRoutes.find((r) => r.world && r.world.toLowerCase() === world.toLowerCase() && r.profile);
            if (exactMatch)
                return exactMatch.profile;
        }
        // Return first match with profile
        const withProfile = matchingRoutes.find((r) => r.profile);
        return withProfile?.profile || null;
    }
    /**
     * Convert raw API URL naar user-friendly endpoint naam
     */
    _getFriendlyEndpointName(url) {
        // Parse club endpoint
        if (url.includes('/public/clubs/')) {
            return 'Team members sync (club API)';
        }
        // Parse rider endpoints
        if (url.includes('/public/riders') && !url.includes('/public/riders/')) {
            return 'Rider bulk sync (POST)';
        }
        if (url.includes('/public/riders/')) {
            return 'Individual rider sync (GET)';
        }
        // Parse event endpoints
        if (url.includes('/api/events/upcoming')) {
            return 'Upcoming events sync';
        }
        if (url.includes('/api/events/') && url.includes('/signups')) {
            return 'Event signups sync';
        }
        if (url.includes('/api/events/')) {
            return 'Event details sync';
        }
        // Parse results
        if (url.includes('/public/results/')) {
            return 'Event results sync';
        }
        // Fallback: return URL
        return url;
    }
}
export const zwiftClient = new ZwiftApiClient();
//# sourceMappingURL=zwift-client.js.map