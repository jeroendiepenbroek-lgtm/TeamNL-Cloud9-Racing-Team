/**
 * Zwift.com Official API Client
 * 
 * Base URL: https://us-or-rly101.zwift.com/api
 * Auth: OAuth Bearer token (Password Grant Flow)
 * 
 * Features:
 * - Profile data (566 fields)
 * - Activities, Achievements, Goals
 * - Followers/Followees
 * - Real-time power data
 * 
 * Rate Limits: Conservative usage recommended (unknown limits)
 */

import axios, { AxiosInstance } from 'axios';

const ZWIFT_API_BASE = 'https://us-or-rly101.zwift.com/api';
const ZWIFT_USERNAME = process.env.ZWIFT_USERNAME || '';
const ZWIFT_PASSWORD = process.env.ZWIFT_PASSWORD || '';

// OAuth endpoints
const AUTH_URL = 'https://secure.zwift.com/auth/rb_bf';
const TOKEN_URL = 'https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token';

export interface ZwiftProfile {
  id: number;
  firstName: string;
  lastName: string;
  male: boolean;
  imageSrc: string;
  imageSrcLarge: string;
  playerType: string;
  countryAlpha3: string;
  countryCode: number;
  useMetric: boolean;
  riding: boolean;
  privacy: {
    approvalRequired: boolean;
    displayWeight: boolean;
    minor: boolean;
    privateMessaging: boolean;
    defaultFitnessDataPrivacy: boolean;
    suppressFollowerNotification: boolean;
    displayAge: boolean;
    defaultActivityPrivacy: string;
  };
  socialFacts: {
    profileId: number;
    followersCount: number;
    followeesCount: number;
    followeesInCommon: number;
    followerStatusOfLoggedInPlayer: string;
    followeeStatusOfLoggedInPlayer: string;
  };
  worldId: number | null;
  enrolledZwiftAcademy: boolean;
  playerTypeId: number;
  playerSubTypeId: number | null;
  currentActivityId: number | null;
}

export interface ZwiftActivity {
  id: number;
  profileId: number;
  worldId: number;
  name: string;
  description: string;
  privateActivity: boolean;
  sport: string;
  startDate: string;
  endDate: string;
  lastSaveDate: string;
  distanceInMeters: number;
  durationInSeconds: number;
  totalElevation: number;
  avgWatts: number;
  calories: number;
  avgHeartRate: number;
  maxHeartRate: number;
  avgSpeedInMetersPerSecond: number;
  maxSpeedInMetersPerSecond: number;
}

export class ZwiftOfficialClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.client = axios.create({
      baseURL: ZWIFT_API_BASE,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Zwift/1.0 (iPhone; iOS 14.0; Scale/2.00)',
      },
    });

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[Zwift.com] ✅ ${response.config.url} → ${response.status}`);
        return response;
      },
      (error) => {
        const status = error.response?.status || 'TIMEOUT';
        const url = error.config?.url || 'unknown';
        console.error(`[Zwift.com] ❌ ${url} → ${status}`);
        throw error;
      }
    );
  }

  /**
   * Authenticate with Zwift OAuth
   * Uses password grant flow with client_id: Zwift_Mobile_Link
   */
  private async authenticate(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return; // Token still valid
    }

    if (!ZWIFT_USERNAME || !ZWIFT_PASSWORD) {
      throw new Error('Zwift.com credentials not configured (ZWIFT_USERNAME/ZWIFT_PASSWORD)');
    }

    try {
      console.log('[Zwift.com] 🔐 Authenticating...');
      
      const params = new URLSearchParams({
        client_id: 'Zwift_Mobile_Link',
        username: ZWIFT_USERNAME,
        password: ZWIFT_PASSWORD,
        grant_type: 'password',
      });

      const response = await axios.post(TOKEN_URL, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 min buffer
      
      // Set auth header for all future requests
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
      
      console.log('[Zwift.com] ✅ Authentication successful');
    } catch (error: any) {
      console.error('[Zwift.com] ❌ Authentication failed:', error.message);
      throw new Error('Zwift.com authentication failed');
    }
  }

  /**
   * GET /profiles/{id}
   * Get complete profile data (566 fields)
   */
  async getProfile(profileId: number): Promise<ZwiftProfile> {
    await this.authenticate();
    const response = await this.client.get(`/profiles/${profileId}`);
    return response.data;
  }

  /**
   * GET /profiles/{id}/activities
   * Get all activities for a profile
   */
  async getActivities(profileId: number, start: number = 0, limit: number = 20): Promise<ZwiftActivity[]> {
    await this.authenticate();
    const response = await this.client.get(`/profiles/${profileId}/activities`, {
      params: { start, limit },
    });
    return response.data;
  }

  /**
   * GET /profiles/{id}/followers
   * Get followers list
   */
  async getFollowers(profileId: number, start: number = 0, limit: number = 20): Promise<any[]> {
    await this.authenticate();
    const response = await this.client.get(`/profiles/${profileId}/followers`, {
      params: { start, limit },
    });
    return response.data;
  }

  /**
   * GET /profiles/{id}/followees
   * Get following list
   */
  async getFollowees(profileId: number, start: number = 0, limit: number = 20): Promise<any[]> {
    await this.authenticate();
    const response = await this.client.get(`/profiles/${profileId}/followees`, {
      params: { start, limit },
    });
    return response.data;
  }

  /**
   * GET /profiles/{id}/goals
   * Get rider goals
   */
  async getGoals(profileId: number): Promise<any[]> {
    await this.authenticate();
    const response = await this.client.get(`/profiles/${profileId}/goals`);
    return response.data;
  }

  /**
   * Check if client is configured and authenticated
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton export
export const zwiftOfficialClient = new ZwiftOfficialClient();
