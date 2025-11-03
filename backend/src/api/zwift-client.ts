/**
 * ZwiftRacing API Client
 * Rate limits: Club sync 1/60min, Riders 5/min, Events 1/min
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
        'x-api-key': ZWIFT_API_KEY,
      },
      timeout: 30000,
    });
  }

  /**
   * Endpoint 1: Haal club informatie op
   */
  async getClub(clubId: number = TEAM_CLUB_ID): Promise<ZwiftClub> {
    const response = await this.client.get(`/public/clubs/${clubId}`);
    return response.data;
  }

  /**
   * Endpoint 2: Haal alle club members op
   */
  async getClubRiders(clubId: number = TEAM_CLUB_ID): Promise<ZwiftRider[]> {
    const response = await this.client.get(`/public/clubs/${clubId}/members`);
    return response.data;
  }

  /**
   * Endpoint 3: Haal events voor club op
   */
  async getClubEvents(clubId: number = TEAM_CLUB_ID): Promise<ZwiftEvent[]> {
    const response = await this.client.get(`/public/clubs/${clubId}/events`);
    return response.data;
  }

  /**
   * Endpoint 4: Haal results voor specifiek event op
   */
  async getEventResults(eventId: number): Promise<ZwiftResult[]> {
    const response = await this.client.get(`/public/events/${eventId}/results`);
    return response.data;
  }

  /**
   * Endpoint 5: Haal rider history op
   */
  async getRiderHistory(riderId: number): Promise<any[]> {
    const response = await this.client.get(`/public/riders/${riderId}/history`);
    return response.data;
  }

  /**
   * Endpoint 6: Haal bulk riders op (voor sync)
   */
  async getBulkRiders(riderIds: number[]): Promise<ZwiftRider[]> {
    const response = await this.client.post('/public/riders/bulk', {
      riderIds,
    });
    return response.data;
  }
}

export const zwiftClient = new ZwiftApiClient();
