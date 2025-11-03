import { ZwiftApiClient } from '../api/zwift-client.js';
import {
  RiderRepository,
  ClubRepository,
  ResultRepository,
} from '../database/repositories-mvp.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

/**
 * Data Synchronisatie Service
 * 
 * Verantwoordelijk voor het periodiek ophalen en opslaan van data
 * van de Zwift API naar de lokale database.
 * 
 * Features:
 * - Respect voor API rate limits
 * - Error recovery
 * - Progress logging
 * - Sync statistieken
 */
export class SyncService {
  private apiClient: ZwiftApiClient;
  private riderRepo: RiderRepository;
  private clubRepo: ClubRepository;
  private resultRepo: ResultRepository;

  constructor() {
    this.apiClient = new ZwiftApiClient({
      apiKey: config.zwiftApiKey,
      baseUrl: config.zwiftApiBaseUrl,
    });

    this.riderRepo = new RiderRepository();
    this.clubRepo = new ClubRepository();
    this.resultRepo = new ResultRepository();
  }

    /**
   * Sync alle members van een club
   * Returns FULL rider data with power curves, race stats, phenotype, etc.
   * NOW SAVES TO club_members TABLE (lightweight roster snapshot)
   */
  async syncClubMembers(clubId: number = config.zwiftClubId): Promise<void> {
    const startTime = Date.now();
    logger.info(`🔄 Start club members sync voor club ${clubId}`);

    try {
      // Haal club members op van API - includes clubId, name, and riders array
      const clubData = await this.apiClient.getClubMembers(clubId);
      logger.info(`✓ ${clubData.riders.length} club members opgehaald van API voor ${clubData.name}`);

      // Update club record with actual name from API
      await this.clubRepo.upsertClub({
        id: clubId,
        name: clubData.name,
        memberCount: clubData.riders.length,
      });

      // Sla members op in club_members tabel (batches van 50 voor betere performance)
      const batchSize = 50;
      let processedCount = 0;

      for (let i = 0; i < clubData.riders.length; i += batchSize) {
        const batch = clubData.riders.slice(i, i + batchSize);
        await this.clubMemberRepo.upsertClubMembersBulk(batch, clubId);
        processedCount += batch.length;
        logger.debug(`Progress: ${processedCount}/${clubData.riders.length} club members opgeslagen`);
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ Club members sync voltooid in ${duration}ms`);

      // Log sync success
      await this.syncLogRepo.logSync('club', 'success', clubData.riders.length, duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      
      logger.error('❌ Fout bij club members sync', error);
      
      await this.syncLogRepo.logSync('club', 'error', 0, duration, errorMessage);
      throw error;
    }
  }

  /**
   * Update individuele riders met verse data
   * Rate limit: 5 calls per minuut
   */
  async syncIndividualRiders(riderIds: number[]): Promise<void> {
    const startTime = Date.now();
    logger.info(`🔄 Start individual riders sync voor ${riderIds.length} riders`);

    try {
      let successCount = 0;
      let errorCount = 0;

      // Process riders met delay voor rate limiting (5 per minuut = 1 per 12 seconden)
      for (const riderId of riderIds) {
        try {
          const riderData = await this.apiClient.getRider(riderId);
          await this.riderRepo.upsertRider(riderData);
          
          // Sla ook historische snapshot op voor trends
          await this.riderRepo.saveRiderHistory(riderId);
          
          successCount++;
          logger.debug(`✓ Rider ${riderId} gesynchroniseerd`);
          
          // Wacht 12 seconden tussen requests om rate limit te respecteren
          if (riderIds.indexOf(riderId) < riderIds.length - 1) {
            await this.delay(12000);
          }
        } catch (error) {
          errorCount++;
          logger.warn(`⚠️  Fout bij syncing rider ${riderId}`, error);
        }
      }

      const duration = Date.now() - startTime;
      const status = errorCount === 0 ? 'success' : errorCount < riderIds.length ? 'partial' : 'error';
      
      logger.info(`✅ Individual riders sync voltooid: ${successCount} success, ${errorCount} errors`);
      
      await this.syncLogRepo.logSync('riders', status, successCount, duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ Fout bij individual riders sync', error);
      
      await this.syncLogRepo.logSync(
        'riders',
        'error',
        0,
        duration,
        error instanceof Error ? error.message : 'Onbekende fout'
      );
      throw error;
    }
  }

  /**
   * Synchroniseer riders in bulk (efficiënter maar strengere rate limit)
   * Rate limit: 1 call per 15 minuten voor max 1000 riders
   */
  async syncRidersBulk(riderIds: number[]): Promise<void> {
    const startTime = Date.now();
    logger.info(`🔄 Start bulk riders sync voor ${riderIds.length} riders`);

    try {
      if (riderIds.length > 1000) {
        throw new Error('Maximum 1000 riders per bulk sync');
      }

      const riders = await this.apiClient.getRidersBulk(riderIds);
      logger.info(`✓ ${riders.length} riders opgehaald van API`);

      await this.riderRepo.upsertRidersBulk(riders);

      const duration = Date.now() - startTime;
      logger.info(`✅ Bulk riders sync voltooid in ${duration}ms`);

      await this.syncLogRepo.logSync('riders-bulk', 'success', riders.length, duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ Fout bij bulk riders sync', error);
      
      await this.syncLogRepo.logSync(
        'riders-bulk',
        'error',
        0,
        duration,
        error instanceof Error ? error.message : 'Onbekende fout'
      );
      throw error;
    }
  }

  /**
   * Synchroniseer race resultaten voor een event
   * Rate limit: 1 call per minuut
   */
  async syncEventResults(eventId: number, source: 'zwiftpower' | 'zwiftranking' = 'zwiftranking'): Promise<void> {
    const startTime = Date.now();
    logger.info(`🔄 Start event results sync voor event ${eventId} (${source})`);

    try {
      const results = source === 'zwiftpower' 
        ? await this.apiClient.getZwiftPowerResults(eventId)
        : await this.apiClient.getResults(eventId);

      logger.info(`✓ ${results.length} resultaten opgehaald van API`);

      if (results.length > 0) {
        await this.resultRepo.upsertResultsBulk(results, source);
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ Event results sync voltooid in ${duration}ms`);

      await this.syncLogRepo.logSync(`results-${source}`, 'success', results.length, duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ Fout bij event results sync', error);
      
      await this.syncLogRepo.logSync(
        `results-${source}`,
        'error',
        0,
        duration,
        error instanceof Error ? error.message : 'Onbekende fout'
      );
      throw error;
    }
  }

  /**
   * Sync alle favorite riders met full data
   * Rate limit: 5 calls/min (12s delay)
   * Inclusief race_ratings + phenotypes
   */
  async syncFavoriteRiders(): Promise<void> {
    const startTime = Date.now();
    logger.info('🔄 Start favorite riders sync');

    try {
      // Haal alle favorites op
      const favorites = await this.riderRepo.getFavoriteRiders();
      logger.info(`✓ ${favorites.length} favorite riders gevonden in database`);

      if (favorites.length === 0) {
        logger.info('ℹ️  Geen favorite riders om te syncen');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Process met rate limiting (12s delay = 5 calls/min)
      for (const favorite of favorites) {
        try {
          // Haal verse data op van API
          const riderData = await this.apiClient.getRider(favorite.zwiftId);
          
          // Update rider met full data (behoud favorite metadata)
          await this.riderRepo.upsertRider(riderData, favorite.clubId ?? undefined, {
            isFavorite: true,
            addedBy: favorite.addedBy ?? 'system',
            syncPriority: favorite.syncPriority ?? 1,
          });

          successCount++;
          logger.debug(`✓ Favorite ${favorite.name} (${favorite.zwiftId}) gesynchroniseerd`);

          // Wacht 12 seconden tussen requests (rate limit)
          if (favorites.indexOf(favorite) < favorites.length - 1) {
            await this.delay(12000);
          }
        } catch (error) {
          errorCount++;
          logger.warn(`⚠️  Fout bij syncing favorite ${favorite.zwiftId}`, error);
        }
      }

      const duration = Date.now() - startTime;
      const status = errorCount === 0 ? 'success' : errorCount < favorites.length ? 'partial' : 'error';

      logger.info(`✅ Favorite riders sync voltooid: ${successCount} success, ${errorCount} errors`);
      
      await this.syncLogRepo.logSync('favorites', status, successCount, duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ Fout bij favorite riders sync', error);
      
      await this.syncLogRepo.logSync(
        'favorites',
        'error',
        0,
        duration,
        error instanceof Error ? error.message : 'Onbekende fout'
      );
      throw error;
    }
  }

  /**
   * Volledige sync - alle data updaten
   * Let op: gebruikt veel API calls, voer spaarzaam uit
   */
  async fullSync(): Promise<void> {
    logger.info('🚀 Start volledige data synchronisatie');
    const startTime = Date.now();

    try {
      // 1. Sync club members (1 API call, 60 min rate limit)
      await this.syncClubMembers();
      
      logger.info('⏳ Wacht 60 seconden voor rate limit...');
      await this.delay(60000);

      // 2. Voor meer details kunnen we top riders individueel updaten
      // Dit is optioneel en moet zorgvuldig gebruikt worden vanwege rate limits
      
      const duration = Date.now() - startTime;
      logger.info(`🎉 Volledige sync voltooid in ${(duration / 1000 / 60).toFixed(2)} minuten`);

    } catch (error) {
      logger.error('❌ Fout bij volledige sync', error);
      throw error;
    }
  }

  /**
   * Helper functie voor delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Haal sync statistieken op
   */
  async getSyncStats() {
    const recentLogs = await this.syncLogRepo.getRecentLogs(20);
    const lastClubSync = await this.syncLogRepo.getLastSuccessfulSync('club');
    const lastRidersSync = await this.syncLogRepo.getLastSuccessfulSync('riders');

    return {
      recentLogs,
      lastClubSync,
      lastRidersSync,
    };
  }
}

export default SyncService;
