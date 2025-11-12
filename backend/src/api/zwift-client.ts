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

import axios, { AxiosInstance } from 'axios';
import { ZwiftClub, ZwiftRider, ZwiftEvent, ZwiftResult } from '../types/index.js';

const ZWIFT_API_BASE = 'https://zwift-ranking.herokuapp.com';
const ZWIFT_API_KEY = process.env.ZWIFT_API_KEY || '';
const TEAM_CLUB_ID = 11818;

export class ZwiftApiClient {
  private client: AxiosInstance;

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

    this.client.interceptors.response.use(
      (response) => {
        console.log(`[ZwiftAPI] ✅ ${response.config.url} → ${response.status}`);
        return response;
      },
      (error) => {
        console.error(`[ZwiftAPI] ❌ ${error.config?.url} → ${error.response?.status || 'TIMEOUT'}`);
        throw error;
      }
    );
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
  async getClubMembers(clubId: number = TEAM_CLUB_ID): Promise<ZwiftRider[]> {
    const response = await this.client.get(`/public/clubs/${clubId}`);
    return response.data;
  }

  /**
   * GET /public/clubs/<id>/<riderId>
   * Returns club members with riderId > <riderId> (pagination)
   * Limited to 1000 results per page
   * Rate limit: 1/60min (Standard)
   */
  async getClubMembersPaginated(clubId: number, afterRiderId: number): Promise<ZwiftRider[]> {
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
  async getEventResults(eventId: number): Promise<ZwiftResult[]> {
    const response = await this.client.get(`/public/results/${eventId}`);
    return response.data;
  }

  /**
   * GET /public/zp/<eventId>/results
   * Returns ZwiftPower results for eventId
   * Rate limit: 1/1min
   */
  async getEventResultsZwiftPower(eventId: number): Promise<any[]> {
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
  async getRider(riderId: number): Promise<ZwiftRider> {
    const response = await this.client.get(`/public/riders/${riderId}`);
    return response.data;
  }

  /**
   * GET /public/riders/<riderId>/<time>
   * Returns Rider data at given epoch timestamp (no milliseconds!)
   * Rate limit: 5/1min (Standard)
   * @param time - Unix epoch (seconds, not milliseconds)
   */
  async getRiderAtTime(riderId: number, time: number): Promise<ZwiftRider> {
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
  async getBulkRiders(riderIds: number[]): Promise<ZwiftRider[]> {
    if (riderIds.length > 1000) {
      throw new Error('Maximum 1000 rider IDs per bulk request');
    }
    const response = await this.client.post('/public/riders', riderIds);
    return response.data;
  }

  /**
   * POST /public/riders/<time>
   * Returns Rider data for array of riderIds at given epoch timestamp
   * Max 1000 riders per call
   * Rate limit: 1/15min (Standard)
   * @param time - Unix epoch (seconds, not milliseconds)
   */
  async getBulkRidersAtTime(riderIds: number[], time: number): Promise<ZwiftRider[]> {
    if (riderIds.length > 1000) {
      throw new Error('Maximum 1000 rider IDs per bulk request');
    }
    const response = await this.client.post(`/public/riders/${time}`, riderIds);
    return response.data;
  }

  // ============================================================================
  // EVENTS - Rate limit: Unknown (gebruik voorzichtig)
  // ============================================================================

  /**
   * GET /api/events
   * Returns list of upcoming events with pagination
   * Query params: from (unix timestamp), to (unix timestamp), limit, skip
   * Response: { events: ZwiftEvent[], totalResults: number }
   */
  async getUpcomingEvents(options?: {
    from?: number;
    to?: number;
    limit?: number;
    skip?: number;
  }): Promise<{ events: ZwiftEvent[]; totalResults: number }> {
    const params = new URLSearchParams();
    
    if (options?.from) params.append('from', options.from.toString());
    if (options?.to) params.append('to', options.to.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.skip) params.append('skip', options.skip.toString());

    const url = `/api/events${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.client.get(url);
    
    return response.data;
  }

  /**
   * GET /api/events (with 48h time window)
   * Convenience method voor Feature 1: upcoming events in volgende 48 uur
   */
  async getEvents48Hours(): Promise<ZwiftEvent[]> {
    const now = Math.floor(Date.now() / 1000);
    const in48Hours = now + (48 * 60 * 60);
    
    const result = await this.getUpcomingEvents({
      from: now,
      to: in48Hours,
      limit: 1000, // Haal maximaal 1000 events op
    });
    
    console.log(`[ZwiftAPI] ℹ️ Found ${result.events.length} events in next 48h (total: ${result.totalResults})`);
    return result.events;
  }

  /**
   * GET /api/events/{eventId}
   * Returns detailed event data including participants (pens)
   */
  async getEventDetails(eventId: number): Promise<ZwiftEvent> {
    const response = await this.client.get(`/api/events/${eventId}`);
    return response.data;
  }

  // ============================================================================
  // LEGACY / DEPRECATED METHODS (behouden voor backwards compatibility)
  // ============================================================================

  /**
   * @deprecated Use getClubMembers() instead
   */
  async getClub(clubId: number = TEAM_CLUB_ID): Promise<ZwiftClub> {
    console.warn('[ZwiftAPI] getClub() is deprecated, use getClubMembers()');
    const response = await this.client.get(`/public/clubs/${clubId}`);
    return response.data;
  }

  /**
   * @deprecated Use getClubMembers() instead
   */
  async getClubRiders(clubId: number = TEAM_CLUB_ID): Promise<ZwiftRider[]> {
    console.warn('[ZwiftAPI] getClubRiders() is deprecated, use getClubMembers()');
    return this.getClubMembers(clubId);
  }

  /**
   * @deprecated Endpoint doesn't exist - use getClubMembers()
   */
  async getClubEvents(clubId: number = TEAM_CLUB_ID): Promise<ZwiftEvent[]> {
    console.warn('[ZwiftAPI] getClubEvents() is niet beschikbaar in API');
    throw new Error('Endpoint /public/clubs/{id}/events does not exist');
  }

  /**
   * @deprecated Endpoint doesn't exist
   */
  async getRiderHistory(riderId: number): Promise<any[]> {
    console.warn('[ZwiftAPI] getRiderHistory() is niet beschikbaar in API');
    throw new Error('Endpoint /public/riders/{id}/history does not exist');
  }

  /**
   * @deprecated Use getEvents48Hours() instead - direct events API available!
   * Feature 1: Get rider upcoming events
   * NOTE: ZwiftRacing API now HAS a direct /api/events endpoint
   */
  async getRiderUpcomingEvents(riderId: number): Promise<any[]> {
    console.warn('[ZwiftAPI] getRiderUpcomingEvents() is deprecated - use getEvents48Hours() instead');
    return [];
  }
}

export const zwiftClient = new ZwiftApiClient();
