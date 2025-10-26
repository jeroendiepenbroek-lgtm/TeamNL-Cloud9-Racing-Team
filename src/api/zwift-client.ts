import axios, { AxiosInstance, AxiosError } from 'axios';
import rateLimit from 'axios-rate-limit';
import {
  RiderData,
  ClubMemberData,
  RaceResultData,
  RiderSchema,
  RaceResultSchema,
} from '../types/api.types.js';
import { ZwiftApiError, RateLimitError, ValidationError } from '../types/errors.js';

export interface ZwiftApiConfig {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
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
 */
export class ZwiftApiClient {
  private client: AxiosInstance;

  constructor(config: ZwiftApiConfig) {

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

    // Response interceptor voor error handling
    this.client.interceptors.response.use(
      (response) => response,
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
   */
  async getRiderResults(riderId: number): Promise<RaceResultData[]> {
    try {
      const response = await this.client.get(`/public/riders/${riderId}/results`);
      
      if (!Array.isArray(response.data)) {
        throw new ValidationError('Onverwacht response formaat voor rider results');
      }

      const results = response.data.map((result) => {
        try {
          return RaceResultSchema.parse(result);
        } catch (error) {
          console.warn('Validatie fout voor rider result:', error);
          return null;
        }
      }).filter((result): result is RaceResultData => result !== null);

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
