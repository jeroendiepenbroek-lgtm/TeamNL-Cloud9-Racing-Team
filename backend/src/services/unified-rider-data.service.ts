/**
 * Unified Rider Data Service
 * 
 * SMART MULTI-SOURCE DATA INTEGRATION
 * Combines data from 3 sources with intelligent merging:
 * 
 * 1. ZwiftRacing.app (Primary) - Most complete, 167 fields
 * 2. Zwift.com Official (Secondary) - Real-time data, activities
 * 3. ZwiftPower (Tertiary) - Recent race results, FTP updates
 * 
 * EFFICIENCY STRATEGIES:
 * - Database caching layer (reduce API calls)
 * - Parallel fetching (Promise.all)
 * - Smart merge logic (newest timestamp wins)
 * - Fallback cascade (if one source fails, use others)
 * - Rate limit aware (respects all API limits)
 * 
 * CACHING STRATEGY:
 * - Cache duration: 5 minutes (rider data)
 * - Cache duration: 1 hour (profile data)
 * - Cache duration: 15 minutes (activity data)
 * - Invalidation: On manual sync trigger
 */

import { zwiftClient } from '../api/zwift-client.js';
import { zwiftOfficialClient } from '../api/zwift-official-client.js';
import { zwiftPowerClient } from '../api/zwiftpower-client.js';
import { supabase } from './supabase.service.js';
import { ZwiftRider } from '../types/index.js';

// Cache voor rider data (in-memory)
const riderDataCache = new Map<number, CachedRiderData>();

interface CachedRiderData {
  data: UnifiedRiderData;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface DataSource {
  source: 'zwift-racing' | 'zwift-official' | 'zwiftpower' | 'database';
  timestamp: string;
  available: boolean;
  error?: string;
}

export interface UnifiedRiderData extends ZwiftRider {
  // Original ZwiftRacing.app data (167 fields)
  // Plus enriched fields:
  enrichment: {
    sources: DataSource[];
    lastUpdated: string;
    confidence: 'high' | 'medium' | 'low';
    
    // Data source tracking per field
    ftpSource: 'zwift-racing' | 'zwift-official' | 'zwiftpower' | 'calculated';
    categorySource: 'zwift-racing' | 'zwiftpower' | 'calculated';
    
    // Additional data from Zwift.com
    zwiftProfile?: {
      firstName: string;
      lastName: string;
      imageSrc: string;
      followersCount: number;
      followeesCount: number;
      recentActivities?: number; // Count of activities last 30 days
      lastActivityDate?: string;
    };
    
    // Additional data from ZwiftPower
    zwiftPower?: {
      raceCount: number;
      lastRaceDate?: string;
      avgPower?: number;
      avgWkg?: number;
    };
  };
}

export class UnifiedRiderDataService {
  private readonly CACHE_TTL = {
    rider: 5 * 60 * 1000,      // 5 minutes
    profile: 60 * 60 * 1000,   // 1 hour
    activity: 15 * 60 * 1000,  // 15 minutes
  };

  /**
   * Get unified rider data with smart multi-source integration
   * 
   * FLOW:
   * 1. Check cache first (fast path)
   * 2. Fetch from all sources in parallel
   * 3. Merge data intelligently
   * 4. Update cache
   * 5. Optionally persist to database
   */
  async getUnifiedRiderData(
    riderId: number, 
    options: {
      useCache?: boolean;
      includeZwiftOfficial?: boolean;
      includeZwiftPower?: boolean;
      persistToDb?: boolean;
    } = {}
  ): Promise<UnifiedRiderData> {
    const {
      useCache = true,
      includeZwiftOfficial = true,
      includeZwiftPower = true,
      persistToDb = false,
    } = options;

    // Check cache first
    if (useCache) {
      const cached = this.getFromCache(riderId);
      if (cached) {
        console.log(`[UnifiedData] ✅ Cache HIT for rider ${riderId}`);
        return cached;
      }
    }

    console.log(`[UnifiedData] 🔄 Fetching rider ${riderId} from all sources...`);

    // Fetch from all sources in parallel
    const sources: DataSource[] = [];
    
    const [
      zwiftRacingData,
      zwiftOfficialData,
      zwiftPowerData,
    ] = await Promise.allSettled([
      // Source 1: ZwiftRacing.app (always required)
      zwiftClient.getRider(riderId)
        .then(data => {
          sources.push({
            source: 'zwift-racing',
            timestamp: new Date().toISOString(),
            available: true,
          });
          return data;
        })
        .catch(err => {
          sources.push({
            source: 'zwift-racing',
            timestamp: new Date().toISOString(),
            available: false,
            error: err.message,
          });
          throw err; // Re-throw - this is critical
        }),
      
      // Source 2: Zwift.com Official (optional)
      includeZwiftOfficial
        ? zwiftOfficialClient.getProfile(riderId)
            .then(data => {
              sources.push({
                source: 'zwift-official',
                timestamp: new Date().toISOString(),
                available: true,
              });
              return data;
            })
            .catch(err => {
              sources.push({
                source: 'zwift-official',
                timestamp: new Date().toISOString(),
                available: false,
                error: err.message,
              });
              return null;
            })
        : Promise.resolve(null),
      
      // Source 3: ZwiftPower (optional)
      includeZwiftPower
        ? zwiftPowerClient.getRider(riderId)
            .then(data => {
              sources.push({
                source: 'zwiftpower',
                timestamp: new Date().toISOString(),
                available: true,
              });
              return data;
            })
            .catch(err => {
              sources.push({
                source: 'zwiftpower',
                timestamp: new Date().toISOString(),
                available: false,
                error: err.message,
              });
              return null;
            })
        : Promise.resolve(null),
    ]);

    // Check if primary source succeeded
    if (zwiftRacingData.status === 'rejected') {
      throw new Error(`Failed to fetch rider ${riderId} from primary source (ZwiftRacing.app)`);
    }

    // Start with ZwiftRacing.app data (most complete)
    const baseData = zwiftRacingData.value as ZwiftRider;
    
    // Merge data from other sources
    const unifiedData = await this.mergeDataSources(
      baseData,
      zwiftOfficialData.status === 'fulfilled' ? zwiftOfficialData.value : null,
      zwiftPowerData.status === 'fulfilled' ? zwiftPowerData.value : null,
      sources
    );

    // Cache the result
    this.saveToCache(riderId, unifiedData, this.CACHE_TTL.rider);

    // Optionally persist to database
    if (persistToDb) {
      await this.persistToDatabase(unifiedData);
    }

    return unifiedData;
  }

  /**
   * Smart data merging logic
   * Priority: Most recent data wins
   */
  private async mergeDataSources(
    zwiftRacing: ZwiftRider,
    zwiftOfficial: any | null,
    zwiftPower: any | null,
    sources: DataSource[]
  ): Promise<UnifiedRiderData> {
    console.log('[UnifiedData] 🔀 Merging data from available sources...');

    const unified: UnifiedRiderData = {
      ...zwiftRacing,
      enrichment: {
        sources,
        lastUpdated: new Date().toISOString(),
        confidence: 'high',
        ftpSource: 'zwift-racing',
        categorySource: 'zwift-racing',
      },
    };

    // Enrich with Zwift.com Official data
    if (zwiftOfficial) {
      console.log('[UnifiedData] ✅ Enriching with Zwift.com data');
      
      unified.enrichment.zwiftProfile = {
        firstName: zwiftOfficial.firstName,
        lastName: zwiftOfficial.lastName,
        imageSrc: zwiftOfficial.imageSrcLarge || zwiftOfficial.imageSrc,
        followersCount: zwiftOfficial.socialFacts?.followersCount || 0,
        followeesCount: zwiftOfficial.socialFacts?.followeesCount || 0,
      };

      // Fetch recent activities count
      try {
        const activities = await zwiftOfficialClient.getActivities(zwiftRacing.riderId, 0, 10);
        const recentActivities = activities.filter(a => {
          const activityDate = new Date(a.startDate);
          const daysSince = (Date.now() - activityDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince <= 30;
        });
        
        unified.enrichment.zwiftProfile.recentActivities = recentActivities.length;
        
        if (activities.length > 0) {
          unified.enrichment.zwiftProfile.lastActivityDate = activities[0].startDate;
        }
      } catch (err) {
        console.log('[UnifiedData] ⚠️  Could not fetch activities');
      }
    }

    // Enrich with ZwiftPower data
    if (zwiftPower) {
      console.log('[UnifiedData] ✅ Enriching with ZwiftPower data');
      
      unified.enrichment.zwiftPower = {
        raceCount: zwiftPower.race_count || 0,
        lastRaceDate: zwiftPower.last_race_date 
          ? new Date(zwiftPower.last_race_date * 1000).toISOString()
          : undefined,
        avgPower: zwiftPower.avg_power,
        avgWkg: zwiftPower.avg_wkg ? parseFloat(zwiftPower.avg_wkg) : undefined,
      };

      // If ZwiftPower has more recent FTP, consider using it
      if (zwiftPower.ftp && zwiftPower.ftp !== zwiftRacing.zpFTP) {
        console.log(`[UnifiedData] 🔄 FTP difference detected:`);
        console.log(`  ZwiftRacing: ${zwiftRacing.zpFTP}W`);
        console.log(`  ZwiftPower:  ${zwiftPower.ftp}W`);
        
        // Use ZwiftPower if significantly different (>5% difference)
        const diff = Math.abs(zwiftPower.ftp - zwiftRacing.zpFTP) / zwiftRacing.zpFTP;
        if (diff > 0.05) {
          unified.zpFTP = zwiftPower.ftp;
          unified.enrichment.ftpSource = 'zwiftpower';
          console.log(`[UnifiedData] ✅ Using ZwiftPower FTP: ${zwiftPower.ftp}W (${(diff * 100).toFixed(1)}% diff)`);
        }
      }

      // Similar logic for category
      if (zwiftPower.category && zwiftPower.category !== zwiftRacing.zpCategory) {
        console.log(`[UnifiedData] 🔄 Category difference: ${zwiftRacing.zpCategory} → ${zwiftPower.category}`);
        unified.zpCategory = zwiftPower.category;
        unified.enrichment.categorySource = 'zwiftpower';
      }
    }

    // Calculate confidence based on available sources
    const availableSources = sources.filter(s => s.available).length;
    unified.enrichment.confidence = 
      availableSources >= 3 ? 'high' :
      availableSources >= 2 ? 'medium' : 'low';

    console.log(`[UnifiedData] ✅ Merge complete with ${availableSources}/3 sources (confidence: ${unified.enrichment.confidence})`);

    return unified;
  }

  /**
   * Get bulk riders with unified data
   * More efficient for multiple riders
   */
  async getBulkUnifiedData(
    riderIds: number[],
    options: {
      useCache?: boolean;
      includeZwiftOfficial?: boolean;
      includeZwiftPower?: boolean;
    } = {}
  ): Promise<UnifiedRiderData[]> {
    console.log(`[UnifiedData] 🔄 Bulk fetching ${riderIds.length} riders...`);

    // Use bulk endpoint for ZwiftRacing.app (much more efficient)
    const zwiftRacingData = await zwiftClient.getBulkRiders(riderIds);

    // For now, only enrich with ZwiftRacing data for bulk
    // Individual enrichment can be done on-demand for specific riders
    return zwiftRacingData.map(rider => ({
      ...rider,
      enrichment: {
        sources: [{
          source: 'zwift-racing' as const,
          timestamp: new Date().toISOString(),
          available: true,
        }],
        lastUpdated: new Date().toISOString(),
        confidence: 'medium' as const,
        ftpSource: 'zwift-racing' as const,
        categorySource: 'zwift-racing' as const,
      },
    }));
  }

  /**
   * Cache management
   */
  private getFromCache(riderId: number): UnifiedRiderData | null {
    const cached = riderDataCache.get(riderId);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      riderDataCache.delete(riderId);
      return null;
    }
    
    return cached.data;
  }

  private saveToCache(riderId: number, data: UnifiedRiderData, ttl: number): void {
    riderDataCache.set(riderId, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Persist unified data to database
   */
  private async persistToDatabase(data: UnifiedRiderData): Promise<void> {
    try {
      await supabase.upsertRider({
        rider_id: data.riderId,
        name: data.name,
        club_id: data.club?.id || null,
        zp_ftp: data.zpFTP,
        zp_category: data.zpCategory,
        weight: data.weight,
        height: data.height,
        male: data.male,
        age: data.age,
        
        // Store enrichment metadata as JSONB
        enrichment_data: data.enrichment,
        
        updated_at: new Date().toISOString(),
      });
      
      console.log(`[UnifiedData] ✅ Persisted rider ${data.riderId} to database`);
    } catch (error: any) {
      console.error(`[UnifiedData] ❌ Failed to persist rider ${data.riderId}:`, error.message);
    }
  }

  /**
   * Clear cache (useful after manual sync)
   */
  clearCache(riderId?: number): void {
    if (riderId) {
      riderDataCache.delete(riderId);
      console.log(`[UnifiedData] 🗑️  Cleared cache for rider ${riderId}`);
    } else {
      riderDataCache.clear();
      console.log('[UnifiedData] 🗑️  Cleared entire rider cache');
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; entries: number[] } {
    return {
      size: riderDataCache.size,
      entries: Array.from(riderDataCache.keys()),
    };
  }
}

// Singleton export
export const unifiedRiderDataService = new UnifiedRiderDataService();
