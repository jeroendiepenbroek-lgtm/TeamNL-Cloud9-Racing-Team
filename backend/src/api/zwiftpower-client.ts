/**
 * ZwiftPower API Client (Secondary Data Source)
 * 
 * Used as fallback/supplement to ZwiftRacing.app API
 * for more recent FTP/Category data
 * 
 * Requires authentication via credentials in .env
 */

import axios, { AxiosInstance } from 'axios';
import * as tough from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const ZWIFTPOWER_BASE = 'https://zwiftpower.com';
const ZWIFTPOWER_USERNAME = process.env.ZWIFTPOWER_USERNAME || '';
const ZWIFTPOWER_PASSWORD = process.env.ZWIFTPOWER_PASSWORD || '';

export interface ZwiftPowerRider {
  zwid: number;
  name: string;
  ftp: number;
  weight: number;
  category?: string; // A, B, C, D, E
  flag?: string; // Country code
}

export class ZwiftPowerClient {
  private client: AxiosInstance;
  private cookieJar: tough.CookieJar;
  private isAuthenticated: boolean = false;

  constructor() {
    this.cookieJar = new tough.CookieJar();
    
    this.client = wrapper(axios.create({
      baseURL: ZWIFTPOWER_BASE,
      timeout: 15000,
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }));

    if (ZWIFTPOWER_USERNAME && ZWIFTPOWER_PASSWORD) {
      console.log(`[ZwiftPower] ✅ Credentials configured for: ${ZWIFTPOWER_USERNAME}`);
    } else {
      console.log(`[ZwiftPower] ⚠️  No credentials configured (limited access)`);
    }
  }

  /**
   * Authenticate with ZwiftPower
   */
  async authenticate(): Promise<boolean> {
    if (this.isAuthenticated) return true;
    
    if (!ZWIFTPOWER_USERNAME || !ZWIFTPOWER_PASSWORD) {
      console.log(`[ZwiftPower] ⚠️  Cannot authenticate: missing credentials`);
      return false;
    }

    try {
      console.log(`[ZwiftPower] 🔐 Authenticating as ${ZWIFTPOWER_USERNAME}...`);
      
      // Step 1: Get login page to establish session
      await this.client.get('/');
      
      // Step 2: Post login credentials
      const loginResponse = await this.client.post('/ucp.php?mode=login', 
        new URLSearchParams({
          username: ZWIFTPOWER_USERNAME,
          password: ZWIFTPOWER_PASSWORD,
          login: 'Login',
          redirect: './',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Check if login was successful
      if (loginResponse.status === 200) {
        this.isAuthenticated = true;
        console.log(`[ZwiftPower] ✅ Authentication successful`);
        return true;
      }

      console.log(`[ZwiftPower] ❌ Authentication failed: ${loginResponse.status}`);
      return false;
      
    } catch (error: any) {
      console.log(`[ZwiftPower] ❌ Authentication error: ${error.message}`);
      return false;
    }
  }

  /**
   * Fetch rider data from ZwiftPower
   * Requires authentication for full access
   */
  async getRider(zwiftId: number): Promise<ZwiftPowerRider | null> {
    try {
      // Ensure we're authenticated
      await this.authenticate();
      
      console.log(`[ZwiftPower] Fetching rider ${zwiftId} from cache...`);
      
      // Try the cache API endpoint (often more reliable)
      const cacheResponse = await this.client.get(`/cache3/profile/${zwiftId}_all.json`);
      
      if (cacheResponse.data && cacheResponse.data.data && cacheResponse.data.data.length > 0) {
        // ZwiftPower _all.json returns: { data: [array of race results] }
        // Rider info is in each result object - take from most recent (first)
        const latestResult = cacheResponse.data.data[0];
        
        console.log(`[ZwiftPower] ✅ Profile from latest result:`, {
          name: latestResult.name,
          ftp: latestResult.ftp,
          weight: latestResult.weight,
          category: latestResult.category,
          date: latestResult.time_gun ? new Date(latestResult.time_gun * 1000).toISOString() : 'unknown'
        });
        
        // Parse weight (can be string or array)
        const weightStr = Array.isArray(latestResult.weight) 
          ? latestResult.weight[0] 
          : latestResult.weight;
        const weightKg = weightStr ? parseFloat(weightStr) : 0;
        
        // Parse height (can be number or array)
        const heightVal = Array.isArray(latestResult.height)
          ? latestResult.height[0]
          : latestResult.height;
        
        return {
          zwid: zwiftId,
          name: latestResult.name || '',
          ftp: parseInt(latestResult.ftp) || 0,
          weight: weightKg,
          height: heightVal || 0,
          category: latestResult.category || undefined,
          flag: latestResult.flag || undefined,
          position_in_category: latestResult.position_in_cat || undefined,
        };
      }

      console.log(`[ZwiftPower] ⚠️  No cache data found for rider ${zwiftId}`);
      return null;
      
    } catch (error: any) {
      console.log(`[ZwiftPower] ❌ Could not fetch rider ${zwiftId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get rider data from specific event (most accurate for recent races)
   */
  async getRiderFromEvent(eventId: number, zwiftId: number): Promise<ZwiftPowerRider | null> {
    try {
      await this.authenticate();
      
      console.log(`[ZwiftPower] Fetching rider ${zwiftId} from event ${eventId}...`);
      
      const response = await this.client.get(`/cache3/results/${eventId}_view.json`);
      
      if (response.data && response.data.data) {
        // Find rider in event results
        const riderResult = response.data.data.find((r: any) => r.zwid === zwiftId);
        
        if (riderResult) {
          console.log(`[ZwiftPower] ✅ Rider data from event ${eventId}:`, {
            name: riderResult.name,
            ftp: riderResult.ftp,
            weight: riderResult.weight,
            category: riderResult.category
          });
          
          // Parse weight (can be string or array)
          const weightStr = Array.isArray(riderResult.weight) 
            ? riderResult.weight[0] 
            : riderResult.weight;
          const weightKg = weightStr ? parseFloat(weightStr) : 0;
          
          // Parse height (can be number or array)
          const heightVal = Array.isArray(riderResult.height)
            ? riderResult.height[0]
            : riderResult.height;
          
          return {
            zwid: zwiftId,
            name: riderResult.name || '',
            ftp: parseInt(riderResult.ftp) || 0,
            weight: weightKg,
            height: heightVal || 0,
            category: riderResult.category || undefined,
            flag: riderResult.flag || undefined,
            position_in_category: riderResult.position_in_cat || undefined,
          };
        }
      }
      
      console.log(`[ZwiftPower] ⚠️  Rider ${zwiftId} not found in event ${eventId}`);
      return null;
      
    } catch (error: any) {
      console.log(`[ZwiftPower] ❌ Could not fetch event ${eventId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get rider's recent race results (may contain updated FTP/category)
   */
  async getRiderResults(zwiftId: number, limit: number = 10): Promise<any[]> {
    try {
      const response = await this.client.get(`/api3.php`, {
        params: {
          do: 'rider_results',
          zwift_id: zwiftId,
          limit: limit,
        },
      });

      return response.data?.data || [];
    } catch (error: any) {
      console.log(`[ZwiftPower] ⚠️  Could not fetch results for ${zwiftId}: ${error.message}`);
      return [];
    }
  }
}

export const zwiftPowerClient = new ZwiftPowerClient();
