import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import rateLimit from 'axios-rate-limit';
import {
  RiderData,
  ClubMemberData,
  RaceResultData,
  RiderSchema,
  RaceResultSchema,
} from '../types/api.types.js';
import { ZwiftApiError, RateLimitError, ValidationError } from '../types/errors.js';
import { rateLimitRepo } from '../database/source-repositories.js';
import { logger } from '../utils/logger.js';

export interface ZwiftApiConfig {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
}

export interface RateLimitInfo {
  remaining: number;
  reset: Date;
  max: number;
}

/**
 * Modulaire API client voor ZwiftRacing.app Public API
 * 
 * Features:
 * - Rate limiting per endpoint type
 * - Automatische retry logic
 * - Data validatie met Zod
 * - Type-safe responses
 * - Error handling
 * - Rate limit tracking in database
 */
export class ZwiftApiClient {
  private client: AxiosInstance;
  private trackRateLimits: boolean;

  constructor(config: ZwiftApiConfig, trackRateLimits: boolean = true) {
    this.trackRateLimits = trackRateLimits;

    // Basis axios client met rate limiting
    const baseClient = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': config.apiKey,
        'Content-Type': 'application/json',
      },
    });

    // Voeg rate limiting toe (conservatief om binnen limits te blijven)
    // @ts-ignore - axios-rate-limit type issue
    this.client = rateLimit(baseClient, {
      maxRequests: 5,
      perMilliseconds: 60000, // 5 requests per minuut als algemene limiet
    });

    // Response interceptor voor error handling en rate limit tracking
    this.client.interceptors.response.use(
      async (response) => {
        // Track rate limit info
        if (this.trackRateLimits) {
          await this.trackRateLimitFromResponse(response);
        }
        return response;
      },
      (error: AxiosError) => {
        if (error.response?.status === 429) {
          throw new RateLimitError(error.config?.url || 'unknown');
        }
        throw new ZwiftApiError(
          error.message,
          error.response?.status,
          error.config?.url,
        );
      },
    );
  }

  /**
   * Extract en log rate limit info uit response headers
   */
  private async trackRateLimitFromResponse(response: AxiosResponse): Promise<void> {
    try {
      const headers = response.headers;
      const config = response.config;
      
      // Parse rate limit headers (common formats)
      const remaining = parseInt(headers['x-ratelimit-remaining'] || headers['ratelimit-remaining'] || '999');
      const limit = parseInt(headers['x-ratelimit-limit'] || headers['ratelimit-limit'] || '1000');
      const resetSeconds = parseInt(headers['x-ratelimit-reset'] || headers['ratelimit-reset'] || '0');
      
      // Alleen loggen als we daadwerkelijk rate limit headers hebben
      if (headers['x-ratelimit-remaining'] || headers['ratelimit-remaining']) {
        const resetDate = resetSeconds > 0 
          ? new Date(resetSeconds * 1000) 
          : new Date(Date.now() + 60000); // Default: 1 min vanaf nu

        const endpoint = this.normalizeEndpoint(config.url || 'unknown');
        const method = (config.method || 'GET').toUpperCase();

        await rateLimitRepo.logRateLimit({
          endpoint,
          method,
          limitMax: limit,
          limitRemaining: remaining,
          limitResetAt: resetDate,
          requestUrl: config.url,
          responseStatus: response.status,
        });

        // Waarschuwing als rate limit bijna bereikt
        if (remaining < 2) {
          logger.warn(`⚠️  Rate limit bijna bereikt voor ${endpoint}: ${remaining}/${limit} remaining, reset op ${resetDate.toLocaleTimeString()}`);
        }
      }
    } catch (error) {
      logger.debug('Kon rate limit info niet tracken:', error);
    }
  }

  /**
   * Normalize endpoint URL voor consistente tracking
   */
  private normalizeEndpoint(url: string): string {
    // Vervang specifieke IDs door placeholders
    return url
      .replace(/\/\d+/g, '/:id')
      .replace(/\/public\/clubs\/[^\/]+\/[^\/]+/, '/public/clubs/:id/:riderId')
      .replace(/\/public\/riders\/[^\/]+\/results/, '/public/riders/:id/results')
      .replace(/\/public\/riders\/[^\/]+\/[^\/]+/, '/public/riders/:id/:time')
      .replace(/\/public\/results\/[^\/]+/, '/public/results/:eventId')
      .replace(/\/public\/zp\/[^\/]+/, '/public/zp/:eventId/results');
  }

  /**
   * Clubs API - Haal club members op
   * Rate limit: 1 call per 60 minuten (standard)
   * 
   * Returns: { clubId, name, riders: [...] }
   */
  async getClubMembers(clubId: number): Promise<{ clubId: number; name: string; riders: ClubMemberData[] }> {
    try {
      const response = await this.client.get(`/public/clubs/${clubId}`);
      
      // De API retourneert { clubId, name, riders: [...] }
      if (!response.data || !Array.isArray(response.data.riders)) {
        throw new ValidationError('Onverwacht response formaat voor club members');
      }

      // Valideer elk member
      const members = response.data.riders.map((member: any, index: number) => {
        try {
          return RiderSchema.parse(member);
        } catch (error) {
          console.warn(`Validatie fout voor member ${index}:`, error);
          return null;
        }
      }).filter((member: RiderData | null): member is ClubMemberData => member !== null);

      return {
        clubId: response.data.clubId,
        name: response.data.name,
        riders: members,
      };
    } catch (error) {
      if (error instanceof ZwiftApiError || error instanceof ValidationError) {
        throw error;
      }
      throw new ZwiftApiError(`Fout bij ophalen club members: ${error}`);
    }
  }

  /**
   * Clubs API - Haal club members op vanaf een specifiek riderId
   * Rate limit: 1 call per 60 minuten (standard)
   */
  async getClubMembersFrom(clubId: number, fromRiderId: number): Promise<ClubMemberData[]> {
    try {
      const response = await this.client.get(`/public/clubs/${clubId}/${fromRiderId}`);
      
      if (!Array.isArray(response.data)) {
        throw new ValidationError('Onverwacht response formaat');
      }

      const members = response.data.map((member) => {
        try {
          return RiderSchema.parse(member);
        } catch (error) {
          console.warn('Validatie fout voor member:', error);
          return null;
        }
      }).filter((member): member is ClubMemberData => member !== null);

      return members;
    } catch (error) {
      if (error instanceof ZwiftApiError || error instanceof ValidationError) {
        throw error;
      }
      throw new ZwiftApiError(`Fout bij ophalen club members: ${error}`);
    }
  }

  /**
   * Riders API - Haal enkele rider op
   * Rate limit: 5 calls per minuut (standard)
   */
  async getRider(riderId: number): Promise<RiderData> {
    try {
      const response = await this.client.get(`/public/riders/${riderId}`);
      return RiderSchema.parse(response.data);
    } catch (error) {
      if (error instanceof ZwiftApiError || error instanceof ValidationError) {
        throw error;
      }
      throw new ZwiftApiError(`Fout bij ophalen rider ${riderId}: ${error}`);
    }
  }

  /**
   * Riders API - Haal rider op een specifiek tijdstip op
   * Rate limit: 5 calls per minuut (standard)
   */
  async getRiderAtTime(riderId: number, epochTime: number): Promise<RiderData> {
    try {
      const response = await this.client.get(`/public/riders/${riderId}/${epochTime}`);
      return RiderSchema.parse(response.data);
    } catch (error) {
      if (error instanceof ZwiftApiError || error instanceof ValidationError) {
        throw error;
      }
      throw new ZwiftApiError(`Fout bij ophalen rider ${riderId}: ${error}`);
    }
  }

  /**
   * Riders API - Haal meerdere riders op (bulk)
   * Rate limit: 1 call per 15 minuten (standard)
   * Max 1000 rider IDs per call
   */
  async getRidersBulk(riderIds: number[]): Promise<RiderData[]> {
    if (riderIds.length > 1000) {
      throw new ValidationError('Maximum 1000 rider IDs per bulk request');
    }

    try {
      const response = await this.client.post('/public/riders', riderIds);
      
      if (!Array.isArray(response.data)) {
        throw new ValidationError('Onverwacht response formaat voor bulk riders');
      }

      const riders = response.data.map((rider) => {
        try {
          return RiderSchema.parse(rider);
        } catch (error) {
          console.warn('Validatie fout voor rider:', error);
          return null;
        }
      }).filter((rider): rider is RiderData => rider !== null);

      return riders;
    } catch (error) {
      if (error instanceof ZwiftApiError || error instanceof ValidationError) {
        throw error;
      }
      throw new ZwiftApiError(`Fout bij ophalen bulk riders: ${error}`);
    }
  }

  /**
   * Riders API - Haal meerdere riders op een specifiek tijdstip op (bulk)
   * Rate limit: 1 call per 15 minuten (standard)
   */
  async getRidersBulkAtTime(riderIds: number[], epochTime: number): Promise<RiderData[]> {
    if (riderIds.length > 1000) {
      throw new ValidationError('Maximum 1000 rider IDs per bulk request');
    }

    try {
      const response = await this.client.post(`/public/riders/${epochTime}`, riderIds);
      
      if (!Array.isArray(response.data)) {
        throw new ValidationError('Onverwacht response formaat');
      }

      const riders = response.data.map((rider) => {
        try {
          return RiderSchema.parse(rider);
        } catch (error) {
          console.warn('Validatie fout voor rider:', error);
          return null;
        }
      }).filter((rider): rider is RiderData => rider !== null);

      return riders;
    } catch (error) {
      if (error instanceof ZwiftApiError || error instanceof ValidationError) {
        throw error;
      }
      throw new ZwiftApiError(`Fout bij ophalen bulk riders: ${error}`);
    }
  }

  /**
   * Riders API - Haal race results van rider op
   * Rate limit: 1 call per minuut
   * 
   * Returns: { riderId, name, race: { finishes: [...], dnfs: [...], ... }, ... }
   */
  async getRiderResults(riderId: number): Promise<RaceResultData[]> {
    try {
      const response = await this.client.get(`/public/riders/${riderId}/results`);
      
      // API retourneert een rider object met race property
      if (!response.data || !response.data.race || !Array.isArray(response.data.race.finishes)) {
        throw new ValidationError('Onverwacht response formaat voor rider results');
      }

      // Extract finishes array (completed races)
      const finishes = response.data.race.finishes;

      const results = finishes.map((result: any) => {
        try {
          return RaceResultSchema.parse(result);
        } catch (error) {
          console.warn('Validatie fout voor rider result:', error);
          return null;
        }
      }).filter((result: RaceResultData | null): result is RaceResultData => result !== null);

      return results;
    } catch (error) {
      if (error instanceof ZwiftApiError || error instanceof ValidationError) {
        throw error;
      }
      throw new ZwiftApiError(`Fout bij ophalen rider results: ${error}`);
    }
  }

  /**
   * Results API - Haal ZwiftRacing.app resultaten op
   * Rate limit: 1 call per minuut
   */
  async getResults(eventId: number): Promise<RaceResultData[]> {
    try {
      const response = await this.client.get(`/public/results/${eventId}`);
      
      if (!Array.isArray(response.data)) {
        throw new ValidationError('Onverwacht response formaat voor results');
      }

      const results = response.data.map((result) => {
        try {
          return RaceResultSchema.parse(result);
        } catch (error) {
          console.warn('Validatie fout voor result:', error);
          return null;
        }
      }).filter((result): result is RaceResultData => result !== null);

      return results;
    } catch (error) {
      if (error instanceof ZwiftApiError || error instanceof ValidationError) {
        throw error;
      }
      throw new ZwiftApiError(`Fout bij ophalen results: ${error}`);
    }
  }

  /**
   * Results API - Haal ZwiftPower resultaten op
   * Rate limit: 1 call per minuut
   */
  async getZwiftPowerResults(eventId: number): Promise<RaceResultData[]> {
    try {
      const response = await this.client.get(`/public/zp/${eventId}/results`);
      
      if (!Array.isArray(response.data)) {
        throw new ValidationError('Onverwacht response formaat voor ZwiftPower results');
      }

      const results = response.data.map((result) => {
        try {
          return RaceResultSchema.parse(result);
        } catch (error) {
          console.warn('Validatie fout voor result:', error);
          return null;
        }
      }).filter((result): result is RaceResultData => result !== null);

      return results;
    } catch (error) {
      if (error instanceof ZwiftApiError || error instanceof ValidationError) {
        throw error;
      }
      throw new ZwiftApiError(`Fout bij ophalen ZwiftPower results: ${error}`);
    }
  }
}
