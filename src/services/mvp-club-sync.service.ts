/**
 * MVP Club Sync Service
 * 
 * Implementeert source data architectuur voor club synchronisatie:
 * - US3: Sync club data naar club_source_data
 * - US4: Sync club roster naar club_roster_source_data
 * - Batch processing voor multiple clubs
 * 
 * Gebruikt complete-source-repositories voor raw API data opslag.
 */

import { ZwiftApiClient } from '../api/zwift-client.js';
import { ClubRepository, RiderRepository } from '../database/repositories-mvp.js';
import { firebaseSyncService } from './firebase-sync.service.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

// Mock source repos (legacy code - disabled for MVP)
const clubSourceRepo = {
  saveClubData: async (..._args: unknown[]) => ({ success: true }),
  getLatestClubData: async (..._args: unknown[]) => null,
  hasRecentData: async (..._args: unknown[]) => false,
};

const clubRosterSourceRepo = {
  saveClubRosterData: async (..._args: unknown[]) => ({ success: true }),
  hasRecentRoster: async (..._args: unknown[]) => false,
  getLatestRoster: async (..._args: unknown[]) => null,
  getRiderInClub: async (..._args: unknown[]) => null,
};

export interface ClubSyncResult {
  success: boolean;
  clubId: number;
  message: string;
  memberCount?: number;
  dataStored: boolean;
  error?: string;
}

export interface BulkClubSyncResult {
  total: number;
  successful: number;
  failed: number;
  clubIds: number[];
  errors: { clubId: number; error: string }[];
}

export class MVPClubSyncService {
  private apiClient: ZwiftApiClient;
  private clubRepo: ClubRepository;
  private riderRepo: RiderRepository;

  constructor() {
    this.apiClient = new ZwiftApiClient({
      apiKey: config.zwiftApiKey,
      baseUrl: config.zwiftApiBaseUrl,
    });
    this.clubRepo = new ClubRepository();
    this.riderRepo = new RiderRepository();
  }

  /**
   * US3: Sync club data
   * 
   * 1. Haalt club data op van ZwiftRacing API
   * 2. Slaat raw JSON op in club_source_data
   * 3. Update club tabel met processed data
   * 
   * @param clubId - Club ID
   * @returns Sync result met status
   */
  async syncClub(clubId: number): Promise<ClubSyncResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`🔄 Start club sync voor ${clubId}`);

      // Step 1: Fetch club data from API (includes member list)
      const clubData = await this.apiClient.getClubMembers(clubId);
      
      // Step 2: Save raw JSON to club_source_data
      await clubSourceRepo.saveClubData(clubId, clubData, {
        clubName: clubData.name,
        responseTime: Date.now() - startTime,
      });

      const memberCount = clubData.riders?.length || 0;

      // Step 3: Update club table
      await this.clubRepo.upsertClub({
        id: clubId,
        name: clubData.name,
        memberCount,
      });

      // Step 4: Sync to Firebase (if available)
      if (firebaseSyncService.isAvailable()) {
        await firebaseSyncService.syncClub({
          id: clubId,
          name: clubData.name,
          memberCount,
        });
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ Club ${clubId} synced - ${memberCount} members (${duration}ms)`);

      return {
        success: true,
        clubId,
        message: `Club synced successfully in ${duration}ms`,
        memberCount,
        dataStored: true,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ Club sync failed voor ${clubId}:`, error);

      return {
        success: false,
        clubId,
        message: 'Club sync failed',
        dataStored: false,
        error: errorMessage,
      };
    }
  }

  /**
   * US4: Sync club roster
   * 
   * Haalt alle club members op en slaat ze op in:
   * 1. club_roster_source_data (raw JSON per rider)
   * 2. rider tabel (processed data)
   * 
   * @param clubId - Club ID
   * @returns Sync result met member count
   */
  async syncClubRoster(clubId: number): Promise<ClubSyncResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`🔄 Start roster sync voor club ${clubId}`);

      // Check if we have recent roster data
      const hasRecent = await clubRosterSourceRepo.hasRecentRoster(clubId, 24);
      if (hasRecent) {
        logger.info(`⏭️  Skipping club ${clubId} - recent roster exists`);
        return { 
          success: true, 
          clubId, 
          message: 'Recent roster exists', 
          dataStored: false 
        };
      }

      // Fetch club data to get member list
      const clubData = await this.apiClient.getClubMembers(clubId);
      const members = clubData.riders || [];

      logger.info(`  📋 Processing ${members.length} club members`);

      // Save each member to club_roster_source_data and update rider table
      let savedCount = 0;
      for (const member of members) {
        try {
          // Save to club_roster_source_data
          await clubRosterSourceRepo.saveClubRosterData(
            clubId,
            member,
            { 
              clubName: clubData.name,
              riderId: member.riderId,
              responseTime: Date.now() - startTime,
            }
          );

          // Also upsert rider to rider table (pass full member data)
          await this.riderRepo.upsertRider(member, clubId);

          savedCount++;
        } catch (error) {
          logger.warn(`  ⚠️  Failed to save member ${member.riderId}:`, error);
        }

        // Small delay between members to avoid overwhelming the system
        if (savedCount % 10 === 0) {
          await this.delay(1000);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ Roster sync voor club ${clubId} voltooid - ${savedCount}/${members.length} members (${duration}ms)`);

      return {
        success: true,
        clubId,
        message: `Club roster synced: ${savedCount}/${members.length} members`,
        memberCount: savedCount,
        dataStored: true,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ Roster sync failed voor club ${clubId}:`, error);

      return {
        success: false,
        clubId,
        message: 'Roster sync failed',
        dataStored: false,
        error: errorMessage,
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sync alle tracked clubs
   * 
   * Haalt lijst van alle clubs op uit database en synct ze.
   * Gebruikt batch processing om rate limits te respecteren.
   * 
   * @param options - Opties voor bulk sync
   * @returns Bulk sync resultaat
   */
  async syncAllClubs(options?: {
    includeRoster?: boolean;
  }): Promise<BulkClubSyncResult> {
    const startTime = Date.now();
    
    try {
      logger.info('🔄 Start bulk club sync', options);

      // Get list of clubs to sync
      const clubs = await this.clubRepo.getAllClubs();

      logger.info(`  📋 Found ${clubs.length} clubs to sync`);

      // Sync each club with rate limiting
      const results = await Promise.allSettled(
        clubs.map(async (club) => {
          // Sync club data
          const clubResult = await this.syncClub(club.id);
          
          // Optionally sync roster (full member list)
          if (options?.includeRoster && clubResult.success) {
            await this.delay(60000); // 1 minute delay before roster sync
            await this.syncClubRoster(club.id);
          }
          
          return clubResult;
        })
      );

      // Process results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      const errors = results
        .map((r, index) => {
          if (r.status === 'rejected') {
            return { clubId: clubs[index].id, error: r.reason };
          } else if (r.status === 'fulfilled' && !r.value.success) {
            return { clubId: clubs[index].id, error: r.value.error || 'Unknown error' };
          }
          return null;
        })
        .filter((e): e is { clubId: number; error: string } => e !== null);

      const bulkResult: BulkClubSyncResult = {
        total: clubs.length,
        successful,
        failed,
        clubIds: clubs.map(c => c.id),
        errors,
      };

      logger.info(`✅ Bulk club sync voltooid: ${successful}/${clubs.length} clubs (${Date.now() - startTime}ms)`);

      return bulkResult;

    } catch (error) {
      logger.error('❌ Bulk club sync failed:', error);
      throw error;
    }
  }

  /**
   * Get latest club data from source_data table
   * 
   * @param clubId - Club ID
   * @returns Latest raw club data
   */
  async getLatestClubData(clubId: number) {
    try {
      return await clubSourceRepo.getLatestClubData(clubId);
    } catch (error) {
      logger.error(`❌ Failed to get latest club data for ${clubId}:`, error);
      throw error;
    }
  }

  /**
   * Get latest club roster from source_data table
   * 
   * @param clubId - Club ID
   * @returns Latest club roster data
   */
  async getLatestRoster(clubId: number) {
    try {
      return await clubRosterSourceRepo.getLatestRoster(clubId);
    } catch (error) {
      logger.error(`❌ Failed to get latest roster for club ${clubId}:`, error);
      throw error;
    }
  }

  /**
   * Check of club recent is gesynct
   * 
   * @param clubId - Club ID
   * @param hoursAgo - Hoe recent (in uren)
   * @returns True als recent data bestaat
   */
  async hasRecentSync(clubId: number, hoursAgo: number = 24): Promise<boolean> {
    try {
      return await clubSourceRepo.hasRecentData(clubId, hoursAgo);
    } catch (error) {
      logger.error(`❌ Failed to check recent sync for club ${clubId}:`, error);
      return false;
    }
  }

  /**
   * Get rider in club roster
   * 
   * @param clubId - Club ID
   * @param riderId - Rider ID
   * @returns Rider data from roster
   */
  async getRiderInClub(clubId: number, riderId: number) {
    try {
      return await clubRosterSourceRepo.getRiderInClub(clubId, riderId);
    } catch (error) {
      logger.error(`❌ Failed to get rider ${riderId} in club ${clubId}:`, error);
      throw error;
    }
  }
}

// Singleton export
export const mvpClubSyncService = new MVPClubSyncService();
