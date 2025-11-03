/**
 * MVP Rider Sync Service
 * 
 * Implementeert source data architectuur voor rider synchronisatie:
 * - US1: Sync actuele rider data naar rider_source_data
 * - US2: Sync alle tracked riders
 * - US6: Sync rider history (90 dagen rolling)
 * 
 * Gebruikt complete-source-repositories voor raw API data opslag.
 */

import { ZwiftApiClient } from '../api/zwift-client.js';
// import { 
//   riderSourceRepo
//   // riderHistorySourceRepo // TODO: Re-implement with Supabase
// } from '../database/index.js';
import { RiderRepository } from '../database/repositories-mvp.js';
import { firebaseSyncService } from './firebase-sync.service.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

// Temporary stubs for old MVP repositories
const riderSourceRepo = {
  saveRiderData: async (..._args: unknown[]) => ({ success: true }),
  getRiderData: async (..._args: unknown[]) => null,
  getLatestRiderData: async (..._args: unknown[]) => null,
  getRiderDataHistory: async (..._args: unknown[]) => [],
  hasRecentData: async (..._args: unknown[]) => false,
};
const riderHistorySourceRepo = {
  hasRecentSnapshot: async (..._args: unknown[]) => false,
  saveRiderHistoryData: async (..._args: unknown[]) => ({ success: true })
};

export interface RiderSyncResult {
  success: boolean;
  riderId: number;
  message: string;
  dataStored: boolean;
  error?: string;
}

export interface BulkSyncResult {
  total: number;
  successful: number;
  failed: number;
  riderIds: number[];
  errors: { riderId: number; error: string }[];
}

export class MVPRiderSyncService {
  private apiClient: ZwiftApiClient;
  private riderRepo: RiderRepository;

  constructor() {
    this.apiClient = new ZwiftApiClient({
      apiKey: config.zwiftApiKey,
      baseUrl: config.zwiftApiBaseUrl,
    });
    this.riderRepo = new RiderRepository();
  }

  /**
   * US1: Sync actuele rider data
   * 
   * 1. Haalt rider data op van ZwiftRacing API
   * 2. Slaat raw JSON op in rider_source_data
   * 3. Update rider tabel met processed data
   * 
   * @param riderId - Zwift rider ID
   * @returns Sync result met status
   */
  async syncRider(riderId: number): Promise<RiderSyncResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`🔄 Start rider sync voor ${riderId}`);

      // Step 1: Fetch rider data from API
      const riderData = await this.apiClient.getRider(riderId);
      
      // Step 2: Save raw JSON to rider_source_data
      await riderSourceRepo.saveRiderData(riderId, riderData, {
        riderName: riderData.name,
        responseTime: Date.now() - startTime,
      });

      // Step 3: Process and save to rider table
      const clubId = riderData.club?.id;
      const savedRider = await this.riderRepo.upsertRider(riderData, clubId);

      // Step 4: Sync to Firebase (if available)
      if (firebaseSyncService.isAvailable()) {
        await firebaseSyncService.syncRider({
          zwiftId: riderData.riderId, // API returns 'riderId', Firebase expects 'zwiftId'
          name: riderData.name,
          clubId,
          club: riderData.club,
          categoryRacing: riderData.categoryRacing,
          ftp: riderData.ftp,
          weight: riderData.weight,
          ranking: riderData.ranking,
          rankingScore: riderData.rankingScore,
          countryCode: riderData.countryCode,
          gender: riderData.gender,
          age: riderData.age,
        });
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ Rider ${riderId} synced (${duration}ms)`);

      return {
        success: true,
        riderId,
        message: `Rider synced successfully in ${duration}ms`,
        dataStored: true,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ Rider sync failed voor ${riderId}:`, error);

      return {
        success: false,
        riderId,
        message: 'Rider sync failed',
        dataStored: false,
        error: errorMessage,
      };
    }
  }

  /**
   * US2: Sync alle tracked riders
   * 
   * Haalt lijst van alle riders op uit database en synct ze stuk voor stuk.
   * Gebruikt batch processing om rate limits te respecteren.
   * 
   * @param options - Opties voor bulk sync
   * @returns Bulk sync resultaat
   */
  async syncAllRiders(options?: {
    limit?: number;
    clubId?: number;
  }): Promise<BulkSyncResult> {
    const startTime = Date.now();
    
    try {
      logger.info('🔄 Start bulk rider sync', options);

      // Get list of riders to sync
      const riders = options?.clubId 
        ? await this.riderRepo.getClubRiders(options.clubId)
        : await this.riderRepo.getRiders(options?.limit || 50);

      logger.info(`  📋 Found ${riders.length} riders to sync`);

      // Sync each rider with rate limiting
      const results = await Promise.allSettled(
        riders.map(async (rider) => {
          // Add delay for rate limiting (5 riders per minute = 12 seconds between calls)
          await this.delay(12000);
          return await this.syncRider(rider.zwiftId);
        })
      );

      // Process results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      const errors = results
        .map((r, index) => {
          if (r.status === 'rejected') {
            return { riderId: riders[index].zwiftId, error: r.reason };
          } else if (r.status === 'fulfilled' && !r.value.success) {
            return { riderId: riders[index].zwiftId, error: r.value.error || 'Unknown error' };
          }
          return null;
        })
        .filter((e): e is { riderId: number; error: string } => e !== null);

      const bulkResult: BulkSyncResult = {
        total: riders.length,
        successful,
        failed,
        riderIds: riders.map(r => r.zwiftId),
        errors,
      };

      logger.info(`✅ Bulk sync voltooid: ${successful}/${riders.length} riders (${Date.now() - startTime}ms)`);

      return bulkResult;

    } catch (error) {
      logger.error('❌ Bulk rider sync failed:', error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * US6: Sync rider history (90 dagen rolling)
   * 
   * Haalt historische snapshots op voor trending/analysis.
   * Slaat data op in rider_history_source_data.
   * 
   * @param riderId - Zwift rider ID
   * @param days - Aantal dagen geschiedenis (default 90)
   * @returns Sync result
   */
  async syncRiderHistory(riderId: number, days: number = 90): Promise<RiderSyncResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`🔄 Start history sync voor rider ${riderId} (${days} dagen)`);

      // Check if we already have recent history
      const hasRecent = await riderHistorySourceRepo.hasRecentSnapshot(
        riderId, 
        24 // Don't re-fetch if we have data from last 24h
      );

      if (hasRecent) {
        logger.info(`⏭️  Skipping rider ${riderId} - recent history exists`);
        return { 
          success: true, 
          riderId, 
          message: 'Recent history exists', 
          dataStored: false 
        };
      }

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const epochTime = Math.floor(cutoffDate.getTime() / 1000);

      // Fetch history from API (rider state at specific time)
      const historyData = await this.apiClient.getRiderAtTime(riderId, epochTime);

      // Save snapshot to rider_history_source_data
      await riderHistorySourceRepo.saveRiderHistoryData(
        riderId,
        cutoffDate,
        historyData,
        { 
          riderName: historyData.name,
          responseTime: Date.now() - startTime,
        }
      );

      logger.info(`✅ History sync voor rider ${riderId} voltooid (${Date.now() - startTime}ms)`);

      return {
        success: true,
        riderId,
        message: `History synced for ${days} days`,
        dataStored: true,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ History sync failed voor rider ${riderId}:`, error);

      return {
        success: false,
        riderId,
        message: 'History sync failed',
        dataStored: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get latest rider data from source_data table
   * 
   * @param riderId - Zwift rider ID
   * @returns Latest raw rider data
   */
  async getLatestRiderData(riderId: number) {
    try {
      return await riderSourceRepo.getLatestRiderData(riderId);
    } catch (error) {
      logger.error(`❌ Failed to get latest rider data for ${riderId}:`, error);
      throw error;
    }
  }

  /**
   * Get rider history from source_data table
   * 
   * @param riderId - Zwift rider ID
   * @param limit - Max aantal snapshots
   * @returns Historical rider data
   */
  async getRiderHistory(riderId: number, limit: number = 30) {
    try {
      return await riderSourceRepo.getRiderDataHistory(riderId, limit);
    } catch (error) {
      logger.error(`❌ Failed to get rider history for ${riderId}:`, error);
      throw error;
    }
  }

  /**
   * Check of rider recent is gesynct
   * 
   * @param riderId - Zwift rider ID
   * @param hoursAgo - Hoe recent (in uren)
   * @returns True als recent data bestaat
   */
  async hasRecentSync(riderId: number, hoursAgo: number = 24): Promise<boolean> {
    try {
      return await riderSourceRepo.hasRecentData(riderId, hoursAgo);
    } catch (error) {
      logger.error(`❌ Failed to check recent sync for ${riderId}:`, error);
      return false;
    }
  }
}

// Singleton export
export const mvpRiderSyncService = new MVPRiderSyncService();
