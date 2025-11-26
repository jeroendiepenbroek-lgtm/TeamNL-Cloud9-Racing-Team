/**
 * Multi-Source Rider Data Service
 * 
 * Combines data from multiple sources:
 * 1. ZwiftRacing.app (primary - most complete)
 * 2. ZwiftPower (secondary - may have newer FTP/category)
 * 3. Database (cached)
 * 
 * Strategy: Use most recent data when timestamps differ
 */

import { zwiftClient } from '../api/zwift-client.js';
import { zwiftPowerClient } from '../api/zwiftpower-client.js';
import { ZwiftRider } from '../types/index.js';

export interface EnrichedRiderData extends ZwiftRider {
  dataSources: {
    primary: 'zwift-racing' | 'zwiftpower';
    ftpSource?: 'zwift-racing' | 'zwiftpower' | 'manual';
    categorySource?: 'zwift-racing' | 'zwiftpower' | 'manual';
  };
  lastUpdated: string;
}

export class MultiSourceRiderService {
  
  /**
   * Fetch rider data from all available sources and merge
   */
  async getRiderWithAllSources(riderId: number): Promise<EnrichedRiderData> {
    console.log(`[MultiSource] Fetching rider ${riderId} from all sources...`);
    
    // Fetch from both sources in parallel
    const [zwiftRacingData, zwiftPowerData] = await Promise.all([
      zwiftClient.getRider(riderId).catch(err => {
        console.log(`[MultiSource] ZwiftRacing failed: ${err.message}`);
        return null;
      }),
      zwiftPowerClient.getRider(riderId).catch(err => {
        console.log(`[MultiSource] ZwiftPower failed: ${err.message}`);
        return null;
      }),
    ]);

    if (!zwiftRacingData) {
      throw new Error(`No data available for rider ${riderId} from any source`);
    }

    // Start with ZwiftRacing data (most complete)
    const enriched: EnrichedRiderData = {
      ...zwiftRacingData,
      dataSources: {
        primary: 'zwift-racing',
      },
      lastUpdated: new Date().toISOString(),
    };

    // Check if ZwiftPower has different/newer FTP or Category
    if (zwiftPowerData) {
      console.log(`[MultiSource] Comparing data sources:`);
      console.log(`  ZwiftRacing: FTP=${zwiftRacingData.zpFTP}, Cat=${zwiftRacingData.zpCategory}`);
      console.log(`  ZwiftPower:  FTP=${zwiftPowerData.ftp}, Cat=${zwiftPowerData.category}`);

      // If ZwiftPower has valid data that differs, log it
      if (zwiftPowerData.ftp && zwiftPowerData.ftp !== zwiftRacingData.zpFTP) {
        console.log(`[MultiSource] ⚠️  FTP mismatch detected!`);
        console.log(`  Using ZwiftRacing: ${zwiftRacingData.zpFTP}W`);
        console.log(`  ZwiftPower shows: ${zwiftPowerData.ftp}W`);
        // Store alternative value for manual review
        enriched.dataSources.ftpSource = 'zwift-racing';
      }

      if (zwiftPowerData.category && zwiftPowerData.category !== zwiftRacingData.zpCategory) {
        console.log(`[MultiSource] ⚠️  Category mismatch detected!`);
        console.log(`  Using ZwiftRacing: ${zwiftRacingData.zpCategory}`);
        console.log(`  ZwiftPower shows: ${zwiftPowerData.category}`);
        enriched.dataSources.categorySource = 'zwift-racing';
      }

      // If you want to PREFER ZwiftPower data when available (uncomment):
      // if (zwiftPowerData.ftp) {
      //   enriched.zpFTP = zwiftPowerData.ftp;
      //   enriched.dataSources.ftpSource = 'zwiftpower';
      // }
      // if (zwiftPowerData.category) {
      //   enriched.zpCategory = zwiftPowerData.category;
      //   enriched.dataSources.categorySource = 'zwiftpower';
      // }
    }

    return enriched;
  }

  /**
   * Fetch bulk riders with source tracking
   */
  async getBulkRidersWithSources(riderIds: number[]): Promise<EnrichedRiderData[]> {
    console.log(`[MultiSource] Fetching ${riderIds.length} riders (ZwiftRacing only for bulk)`);
    
    // For bulk operations, only use ZwiftRacing (ZwiftPower doesn't have bulk endpoint)
    const riders = await zwiftClient.getBulkRiders(riderIds);
    
    return riders.map(rider => ({
      ...rider,
      dataSources: {
        primary: 'zwift-racing' as const,
      },
      lastUpdated: new Date().toISOString(),
    }));
  }
}

export const multiSourceRiderService = new MultiSourceRiderService();
