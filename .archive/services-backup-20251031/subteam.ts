/**
 * SubteamService - Beheer favoriete riders (Workflow Steps 1-3)
 * 
 * Workflow:
 * 1. Add/remove favorite riders
 * 2. Sync volledige rider stats (66 attributen)
 * 3. Extracteer clubs en trigger club roster sync
 */

import { ZwiftApiClient } from '../api/zwift-client.js';
import { RiderRepository, ClubRepository } from '../database/repositories-mvp.js';
import { logger } from '../utils/logger.js';

// Note: ClubMemberRepository doesn't exist in MVP schema
import { config } from '../utils/config.js';

export interface AddFavoritesResult {
  added: number;
  updated: number;
  failed: number;
  alreadyExists: number;
  riders: Array<{
    zwiftId: number;
    name: string;
    status: 'added' | 'updated' | 'exists' | 'failed';
    error?: string;
    clubChanged?: boolean;
  }>;
}

export interface SyncStatsResult {
  synced: number;
  failed: number;
  clubsExtracted: number;
  riders: Array<{
    zwiftId: number;
    name: string;
    clubId?: number;
    clubName?: string;
  }>;
}

export class SubteamService {
  private zwiftApi: ZwiftApiClient;
  private riderRepo: RiderRepository;
  private clubRepo: ClubRepository;
  private clubMemberRepo: ClubMemberRepository;

  constructor() {
    this.zwiftApi = new ZwiftApiClient({
      apiKey: config.zwiftApiKey,
      baseUrl: config.zwiftApiBaseUrl,
    });
    this.riderRepo = new RiderRepository();
    this.clubRepo = new ClubRepository();
    this.clubMemberRepo = new ClubMemberRepository();
  }

  /**
   * Step 1: Voeg favorite riders toe
   * Bij re-upload: Update bestaande riders met nieuwe stats en clubIDs
   */
  async addFavorites(zwiftIds: number[]): Promise<AddFavoritesResult> {
    logger.info(`Processing ${zwiftIds.length} favorites...`);

    const result: AddFavoritesResult = {
      added: 0,
      updated: 0,
      failed: 0,
      alreadyExists: 0,
      riders: [],
    };

    for (const zwiftId of zwiftIds) {
      try {
        // Check of al bestaat
        const existingRider = await this.riderRepo.getRider(zwiftId);
        const alreadyFavorite = existingRider?.isFavorite || false;

        // Haal altijd verse data op via API (om stats en clubID te updaten)
        const riderData = await this.zwiftApi.getRider(zwiftId);
        
        // Check of club is gewijzigd
        const clubChanged = existingRider && existingRider.clubId !== riderData.club?.id;
        
        // Sla op als favorite (upsert)
        await this.riderRepo.upsertRider(
          riderData,
          riderData.club?.id,
          {
            isFavorite: true,
            addedBy: 'subteam_api',
            syncPriority: 1,
          }
        );

        if (alreadyFavorite) {
          result.updated++;
          result.riders.push({
            zwiftId,
            name: riderData.name,
            status: 'updated',
            clubChanged: clubChanged || undefined,
          });
          logger.info(`Updated favorite: ${riderData.name} (${zwiftId})${clubChanged ? ' - Club changed!' : ''}`);
        } else {
          result.added++;
          result.riders.push({
            zwiftId,
            name: riderData.name,
            status: 'added',
          });
          logger.info(`Added favorite: ${riderData.name} (${zwiftId})`);
        }

        // Trigger Step 3: Extract club (altijd, ook bij update)
        if (riderData.club?.id) {
          await this.extractClub(riderData.club.id, riderData.club.name);
        }

        // Rate limit: 5/min voor riders endpoint
        await this.sleep(12 * 1000); // 12 sec = 5/min

      } catch (error) {
        logger.error(`Failed to process favorite ${zwiftId}`, error);
        result.failed++;
        result.riders.push({
          zwiftId,
          name: '(failed)',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Process favorites complete', {
      added: result.added,
      updated: result.updated,
      failed: result.failed,
    });

    return result;
  }

  /**
   * Step 1: Verwijder favorite rider
   */
  async removeFavorite(zwiftId: number): Promise<void> {
    logger.info(`Removing favorite: ${zwiftId}`);

    // Verwijder rider (cascade delete)
    await this.riderRepo.deleteRider(zwiftId);

    // Update club_members.isFavorite = false
    const clubs = await this.clubRepo.getAllClubs();
    for (const club of clubs) {
      await this.clubMemberRepo.updateFavoriteStatus(
        club.id,
        await this.riderRepo.getFavoriteZwiftIds()
      );
    }

    // TODO: Check of club geen favorites meer heeft -> verwijder club?
    // Voor nu laten staan (manual cleanup)

    logger.info(`Favorite removed: ${zwiftId}`);
  }

  /**
   * Step 1: List all favorites
   */
  async listFavorites() {
    return await this.riderRepo.getAllFavorites();
  }

  /**
   * Step 2: Sync rider stats voor alle of specifieke favorite
   */
  async syncFavoriteStats(zwiftId?: number): Promise<SyncStatsResult> {
    logger.info(zwiftId 
      ? `Syncing stats for rider ${zwiftId}...`
      : 'Syncing stats for all favorites...'
    );

    const result: SyncStatsResult = {
      synced: 0,
      failed: 0,
      clubsExtracted: 0,
      riders: [],
    };

    // Haal riders op
    const riders = zwiftId
      ? [await this.riderRepo.getRider(zwiftId)].filter(Boolean)
      : await this.riderRepo.getAllFavorites();

    if (riders.length === 0) {
      logger.warn('No riders to sync');
      return result;
    }

    const clubsExtracted = new Set<number>();

    for (const rider of riders) {
      if (!rider) continue;

      try {
        // Haal verse data op
        const riderData = await this.zwiftApi.getRider(rider.zwiftId);

        // Update rider
        await this.riderRepo.upsertRider(
          riderData,
          riderData.club?.id,
          {
            isFavorite: true,
            addedBy: rider.addedBy,
            syncPriority: rider.syncPriority,
          }
        );

        result.synced++;
        result.riders.push({
          zwiftId: rider.zwiftId,
          name: riderData.name,
          clubId: riderData.club?.id,
          clubName: riderData.club?.name,
        });

        logger.info(`Synced: ${riderData.name} (${rider.zwiftId})`);

        // Step 3: Extract club
        if (riderData.club?.id && !clubsExtracted.has(riderData.club.id)) {
          await this.extractClub(riderData.club.id, riderData.club.name);
          clubsExtracted.add(riderData.club.id);
          result.clubsExtracted++;
        }

        // Rate limit: 5/min
        await this.sleep(12 * 1000);

      } catch (error) {
        logger.error(`Failed to sync rider ${rider.zwiftId}`, error);
        result.failed++;
      }
    }

    logger.info('Sync complete', {
      synced: result.synced,
      failed: result.failed,
      clubsExtracted: result.clubsExtracted,
    });

    return result;
  }

  /**
   * Step 3: Extracteer club van favorite rider
   */
  private async extractClub(clubId: number, clubName?: string): Promise<void> {
    logger.info(`Extracting club ${clubId} (${clubName})...`);

    try {
      // Voeg club toe met source tracking
      await this.clubRepo.upsertClub({
        id: clubId,
        name: clubName || `Club ${clubId}`,
      });

      // Update source als deze via favorite kwam
      await this.clubRepo.updateClubSource(clubId, 'favorite_rider');

      logger.info(`Club extracted: ${clubName} (${clubId})`);

      // TODO: Trigger Step 4 (club roster sync) via separate service
      // Dit wordt gedaan door ClubService.syncRoster() in cron job

    } catch (error) {
      logger.error(`Failed to extract club ${clubId}`, error);
      throw error;
    }
  }

  /**
   * Haal alle tracked riders op (favorites + club members)
   */
  async getAllTrackedRiders(): Promise<number[]> {
    const [favoriteIds, clubMemberIds] = await Promise.all([
      this.riderRepo.getFavoriteZwiftIds(),
      this.clubMemberRepo.getAllTrackedRiders(),
    ]);

    return [...new Set([...favoriteIds, ...clubMemberIds])];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
