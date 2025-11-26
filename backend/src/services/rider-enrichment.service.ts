/**
 * Rider Data Enrichment Service
 * 
 * Strategieën om meest actuele FTP/Category te krijgen:
 * 1. Check recente race results voor actuele category
 * 2. Gebruik ZwiftPower results endpoint voor FTP verification
 * 3. Fall back naar ZwiftRacing.app base data
 * 
 * STRUCTURELE OPLOSSING: Automatisch beste data kiezen
 */

import { zwiftClient } from '../api/zwift-client.js';
import { ZwiftRider, ZwiftResult } from '../types/index.js';

export interface EnrichedRiderData extends ZwiftRider {
  enrichmentSource: {
    ftpSource: 'profile' | 'recent_result' | 'calculated';
    categorySource: 'profile' | 'recent_result';
    lastResultDate?: string;
    confidence: 'high' | 'medium' | 'low';
  };
}

export class RiderDataEnrichmentService {
  
  /**
   * Enrich rider with most recent data from race results
   */
  async enrichRiderData(riderId: number): Promise<EnrichedRiderData> {
    console.log(`[Enrichment] Processing rider ${riderId}...`);
    
    // Step 1: Get base profile data
    const profileData = await zwiftClient.getRider(riderId);
    
    // Step 2: Try to get more recent data from latest race
    const recentData = await this.getDataFromRecentRaces(riderId);
    
    if (recentData) {
      console.log(`[Enrichment] ✅ Found recent race data:`);
      console.log(`  Profile shows: FTP=${profileData.zpFTP}, Cat=${profileData.zpCategory}`);
      console.log(`  Recent race shows: FTP=${recentData.ftp || 'N/A'}, Cat=${recentData.category || 'N/A'}`);
      
      // Use most recent data if available
      const enriched: EnrichedRiderData = {
        ...profileData,
        zpFTP: recentData.ftp || profileData.zpFTP,
        zpCategory: recentData.category || profileData.zpCategory,
        enrichmentSource: {
          ftpSource: recentData.ftp ? 'recent_result' : 'profile',
          categorySource: recentData.category ? 'recent_result' : 'profile',
          lastResultDate: recentData.date,
          confidence: recentData.ftp && recentData.category ? 'high' : 'medium',
        },
      };
      
      return enriched;
    }
    
    // No recent data, use profile
    console.log(`[Enrichment] Using profile data (no recent results)`);
    return {
      ...profileData,
      enrichmentSource: {
        ftpSource: 'profile',
        categorySource: 'profile',
        confidence: 'low',
      },
    };
  }
  
  /**
   * Extract FTP/Category from recent race results
   * Strategy: Use race.last data which contains most recent performance
   */
  private async getDataFromRecentRaces(riderId: number): Promise<{
    ftp?: number;
    category?: string;
    date?: string;
  } | null> {
    try {
      // Get rider data (already fetched in main function, but get again for race history)
      const riderData = await zwiftClient.getRider(riderId);
      
      // Check if rider has recent race data
      if (!riderData.race?.last) {
        console.log(`[Enrichment] No recent race data available`);
        return null;
      }
      
      const lastRace = riderData.race.last;
      if (!lastRace.date) return null;
      
      const lastRaceDate = new Date(lastRace.date * 1000); // Unix timestamp to date
      const daysSinceRace = (Date.now() - lastRaceDate.getTime()) / (1000 * 60 * 60 * 24);
      
      console.log(`[Enrichment] Last race was ${daysSinceRace.toFixed(1)} days ago`);
      console.log(`[Enrichment] Last race category: ${lastRace.mixed?.category}`);
      
      // If race is very recent (< 7 days), try to get ZP results for that event
      if (daysSinceRace < 7) {
        // The race.last object doesn't have eventId directly
        // We need to calculate FTP from power data instead
        
        const estimatedFTP = this.calculateFTPFromPowerData(riderData);
        const category = this.deriveCategoryFromMixedCategory(lastRace.mixed?.category);
        
        if (estimatedFTP || category) {
          console.log(`[Enrichment] ✅ Derived from recent performance:`);
          console.log(`  Estimated FTP: ${estimatedFTP || 'N/A'}W`);
          console.log(`  Derived Category: ${category || 'N/A'}`);
          
          return {
            ftp: estimatedFTP,
            category: category,
            date: lastRaceDate.toISOString(),
          };
        }
      }
      
      return null;
      
    } catch (error: any) {
      console.log(`[Enrichment] Error getting recent race data: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Calculate FTP from power data (use 20min power or CP)
   */
  private calculateFTPFromPowerData(rider: ZwiftRider): number | undefined {
    // Use 20min power (wkg1200) with weight
    if (rider.power?.wkg1200 && rider.weight) {
      const power20minWkg = Array.isArray(rider.power.wkg1200) 
        ? rider.power.wkg1200[0] 
        : rider.power.wkg1200;
      
      const ftp = Math.round(power20minWkg * rider.weight * 0.95); // 95% of 20min power
      console.log(`[Enrichment] Calculated FTP from 20min power: ${ftp}W`);
      return ftp;
    }
    
    // Use CP (Critical Power) as alternative
    if (rider.power?.CP) {
      console.log(`[Enrichment] Using CP as FTP: ${rider.power.CP}W`);
      return Math.round(rider.power.CP);
    }
    
    return undefined;
  }
  
  /**
   * Derive ZP category from mixed category name
   */
  private deriveCategoryFromMixedCategory(mixedCategory?: string): string | undefined {
    if (!mixedCategory) return undefined;
    
    // Mixed categories: Amethyst, Sapphire, Emerald, Ruby, Diamond
    // Map to approximate ZP categories
    const mapping: Record<string, string> = {
      'Diamond': 'A',
      'Ruby': 'B', 
      'Emerald': 'B',
      'Sapphire': 'C',
      'Amethyst': 'C',
    };
    
    return mapping[mixedCategory];
  }
  
  /**
   * Bulk enrich multiple riders (efficient)
   */
  async enrichBulkRiders(riderIds: number[]): Promise<EnrichedRiderData[]> {
    console.log(`[Enrichment] Bulk enriching ${riderIds.length} riders...`);
    
    // For bulk, just get base data (enrichment is expensive)
    // Individual riders can be enriched on-demand
    const riders = await zwiftClient.getBulkRiders(riderIds);
    
    return riders.map(rider => ({
      ...rider,
      enrichmentSource: {
        ftpSource: 'profile' as const,
        categorySource: 'profile' as const,
        confidence: 'low' as const,
      },
    }));
  }
}

export const riderEnrichmentService = new RiderDataEnrichmentService();
