/**
 * Club Service - Step 4: Sync Club Rosters
 * 
 * Synchroniseert alle leden van clubs die zijn geëxtraheerd uit favorite riders.
 * Markeert welke club members ook favorites zijn voor filtering in forward scan.
 */

import { ZwiftApiClient } from '../api/zwift-client.js';
import { ClubRepository, RiderRepository } from '../database/repositories-mvp.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

// Note: ClubMemberRepository doesn't exist in MVP schema

export interface SyncClubRostersResult {
  synced: number;
  failed: number;
  totalMembers: number;
  clubs: Array<{
    clubId: number;
    clubName: string;
    memberCount: number;
    favoritesCount: number;
    success: boolean;
    error?: string;
  }>;
}

export class ClubService {
  private zwiftApi: ZwiftApiClient;
  private clubRepo: ClubRepository;
  private clubMemberRepo: ClubMemberRepository;
  private riderRepo: RiderRepository;

  constructor() {
    this.zwiftApi = new ZwiftApiClient({
      apiKey: config.zwiftApiKey,
      baseUrl: config.zwiftApiBaseUrl,
    });
    this.clubRepo = new ClubRepository();
    this.clubMemberRepo = new ClubMemberRepository();
    this.riderRepo = new RiderRepository();
  }

  /**
   * Sync rosters van alle favorite clubs
   * 
   * Workflow:
   * 1. Get alle clubs met source='favorite_rider'
   * 2. Voor elke club: fetch members via API
   * 3. Save members in club_members table
   * 4. Update isFavorite field voor linking
   * 
   * Rate limit: 1 club/60 min, dus we respecteren dit
   */
  async syncAllClubRosters(): Promise<SyncClubRostersResult> {
    logger.info('🏢 Start club rosters sync (Step 4)');

    const result: SyncClubRostersResult = {
      synced: 0,
      failed: 0,
      totalMembers: 0,
      clubs: [],
    };

    try {
      // 1. Get alle favorite clubs
      const allClubs = await this.clubRepo.getAllClubs();
      const favoriteClubs = allClubs.filter((c) => c.source === 'favorite_rider');

      if (favoriteClubs.length === 0) {
        logger.info('⏭️  Geen favorite clubs gevonden, skip roster sync');
        return result;
      }

      logger.info(`   Gevonden: ${favoriteClubs.length} favorite club(s)`);

      // 2. Get favorite ZwiftIDs voor isFavorite linking
      const favoriteZwiftIds = await this.riderRepo.getFavoriteZwiftIds();
      logger.info(`   Favorites: ${favoriteZwiftIds.length} rider(s)`);

      // 3. Sync elke club
      for (const club of favoriteClubs) {
        try {
          logger.info(`   📋 Syncing club: ${club.name || club.id}...`);

          const clubResult = await this.syncClubRoster(club.id, favoriteZwiftIds);

          result.clubs.push({
            clubId: club.id,
            clubName: club.name || `Club ${club.id}`,
            memberCount: clubResult.memberCount,
            favoritesCount: clubResult.favoritesCount,
            success: true,
          });

          result.synced++;
          result.totalMembers += clubResult.memberCount;

          logger.info(`      ✅ ${clubResult.memberCount} members, ${clubResult.favoritesCount} favorites`);

          // Rate limit: 1 club/60 min, wait als er meer clubs zijn
          if (favoriteClubs.indexOf(club) < favoriteClubs.length - 1) {
            const waitTime = 61 * 60 * 1000; // 61 minuten in ms
            logger.info(`      ⏳ Rate limit: wacht 61 min voor volgende club...`);
            await this.sleep(waitTime);
          }
        } catch (error: any) {
          logger.error(`      ❌ Fout bij syncing club ${club.id}:`, error);

          result.clubs.push({
            clubId: club.id,
            clubName: club.name || `Club ${club.id}`,
            memberCount: 0,
            favoritesCount: 0,
            success: false,
            error: error.message,
          });

          result.failed++;
        }
      }

      logger.info(`✅ Club rosters sync voltooid: ${result.synced} geslaagd, ${result.failed} gefaald`);
      logger.info(`   Totaal: ${result.totalMembers} club members`);

      return result;
    } catch (error) {
      logger.error('❌ Club rosters sync gefaald:', error);
      throw error;
    }
  }

  /**
   * Sync roster van een specifieke club
   */
  async syncClubRoster(
    clubId: number,
    favoriteZwiftIds?: number[]
  ): Promise<{ memberCount: number; favoritesCount: number }> {
    // 1. Fetch club data from API
    const clubData = await this.zwiftApi.getClubMembers(clubId);

    if (!clubData || !clubData.riders || clubData.riders.length === 0) {
      logger.warn(`   ⚠️  Club ${clubId} heeft geen members`);
      return { memberCount: 0, favoritesCount: 0 };
    }

    // 2. Save all members using bulk upsert
    await this.clubMemberRepo.upsertClubMembersBulk(clubData.riders, clubId);

    // 3. Update club info
    await this.clubRepo.upsertClub({
      id: clubId,
      name: clubData.name,
      memberCount: clubData.riders.length,
    });

    // 4. Update isFavorite field
    let favoritesCount = 0;
    if (favoriteZwiftIds && favoriteZwiftIds.length > 0) {
      await this.clubMemberRepo.updateFavoriteStatus(clubId, favoriteZwiftIds);
      
      // Count favorites in this club
      const members = await this.clubMemberRepo.getFavoriteClubMembers(clubId);
      favoritesCount = members.length;
    }

    return {
      memberCount: clubData.riders.length,
      favoritesCount,
    };
  }

  /**
   * Sync een specifieke club (via API call)
   */
  async syncSingleClub(clubId: number): Promise<SyncClubRostersResult> {
    logger.info(`🏢 Sync club ${clubId}`);

    const favoriteZwiftIds = await this.riderRepo.getFavoriteZwiftIds();

    try {
      const clubResult = await this.syncClubRoster(clubId, favoriteZwiftIds);

      const club = await this.clubRepo.getClub(clubId);

      return {
        synced: 1,
        failed: 0,
        totalMembers: clubResult.memberCount,
        clubs: [
          {
            clubId,
            clubName: club?.name || `Club ${clubId}`,
            memberCount: clubResult.memberCount,
            favoritesCount: clubResult.favoritesCount,
            success: true,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`❌ Fout bij syncing club ${clubId}:`, error);

      return {
        synced: 0,
        failed: 1,
        totalMembers: 0,
        clubs: [
          {
            clubId,
            clubName: `Club ${clubId}`,
            memberCount: 0,
            favoritesCount: 0,
            success: false,
            error: error.message,
          },
        ],
      };
    }
  }

  /**
   * Get alle club members van favorite clubs
   */
  async getAllTrackedClubMembers() {
    return await this.clubMemberRepo.getAllTrackedRiders();
  }

  /**
   * Get favorite club members
   */
  async getFavoriteClubMembers(clubId?: number) {
    return await this.clubMemberRepo.getFavoriteClubMembers(clubId);
  }

  /**
   * Sleep utility (voor rate limiting)
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
