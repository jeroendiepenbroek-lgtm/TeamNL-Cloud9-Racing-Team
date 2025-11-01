import { ZwiftApiClient } from '../api/zwift-client.js';
import { RiderRepository, ResultRepository, EventRepository } from '../database/repositories-mvp.js';
import prisma from '../database/client.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

/**
 * Rider Data Synchronisatie Service
 * 
 * Verantwoordelijk voor het ophalen en opslaan van volledige rider data:
 * - US1: Actuele rider informatie
 * - US2: Historische rider snapshots (90 dagen rolling)
 * - US3: Rider events/results (90 dagen rolling)
 * - US4: Hourly scan voor nieuwe events
 * - US5/US6: Cascade deletes
 */
export class RiderSyncService {
  private apiClient: ZwiftApiClient;
  private riderRepo: RiderRepository;
  private resultRepo: ResultRepository;
  private eventRepo: EventRepository;

  constructor() {
    this.apiClient = new ZwiftApiClient({
      apiKey: config.zwiftApiKey,
      baseUrl: config.zwiftApiBaseUrl,
    });

    this.riderRepo = new RiderRepository();
    this.resultRepo = new ResultRepository();
    this.eventRepo = new EventRepository();
  }

  /**
   * US1: Actuele rijder informatie ophalen en opslaan
   * 
   * Haalt de meest recente data op voor een rider en slaat deze op.
   * Includes: profile, power curve, racing stats, phenotype, rating
   * 
   * @param riderId - Zwift rider ID
   * @param clubId - Optional club ID voor associatie
   * @returns Updated rider data
   */
  async syncRiderCurrent(riderId: number, clubId?: number) {
    const startTime = Date.now();
    logger.info(`🔄 US1: Start actuele rider sync voor ${riderId}`);

    try {
      // Haal actuele data op van API
      const riderData = await this.apiClient.getRider(riderId);
      logger.debug(`✓ Rider data opgehaald: ${riderData.name}`);

      // Sla op in database (upsert = insert or update)
      const savedRider = await this.riderRepo.upsertRider(riderData, clubId, {
        isFavorite: true,
        addedBy: 'manual',
        syncPriority: 1,
      });

      const duration = Date.now() - startTime;
      logger.info(`✅ US1: Rider ${riderId} gesynchroniseerd in ${duration}ms`);

      await this.syncLogRepo.logSync(
        'rider_current',
        'success',
        1,
        duration,
        undefined,
        {
          targetId: riderId.toString(),
          triggeredBy: 'api',
        }
      );

      return savedRider;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      
      logger.error(`❌ US1: Fout bij rider sync ${riderId}`, error);
      
      await this.syncLogRepo.logSync(
        'rider_current',
        'error',
        0,
        duration,
        errorMessage,
        {
          targetId: riderId.toString(),
        }
      );
      
      throw error;
    }
  }

  /**
   * US2: Historische rijder informatie ophalen (90 dagen rolling)
   * 
   * Haalt snapshots op van de afgelopen 90 dagen om trends te kunnen tracken.
   * Gebruikt getRiderAtTime() API endpoint voor historical data.
   * 
   * @param riderId - Zwift rider ID
   * @param days - Aantal dagen terug (default 90)
   */
  async syncRiderHistory(riderId: number, days: number = 90) {
    const startTime = Date.now();
    logger.info(`🔄 US2: Start historische sync voor rider ${riderId} (${days} dagen)`);

    try {
      // Check of rider bestaat in database
      const rider = await this.riderRepo.getRider(riderId);
      if (!rider) {
        throw new Error(`Rider ${riderId} niet gevonden in database. Voer eerst US1 uit.`);
      }

      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      let successCount = 0;
      let skipCount = 0;

      // Haal snapshots op voor elke week (13 snapshots voor 90 dagen)
      const interval = 7; // 1 snapshot per week
      const snapshots = Math.ceil(days / interval);

      logger.info(`📊 Ophalen van ${snapshots} snapshots (1 per ${interval} dagen)`);

      for (let i = 0; i < snapshots; i++) {
        const daysAgo = i * interval;
        const epochTime = Math.floor((now - (daysAgo * oneDayMs)) / 1000);

        try {
          // Haal historical snapshot op
          const historicalData = await this.apiClient.getRiderAtTime(riderId, epochTime);
          
          // Check of we al een snapshot hebben voor deze dag
          const existingSnapshot = await this.riderRepo.getRiderHistory(rider.id, 1);
          const snapshotDate = new Date(epochTime * 1000);
          
          const alreadyExists = existingSnapshot.some(s => {
            const existingDate = new Date(s.recordedAt);
            return Math.abs(existingDate.getTime() - snapshotDate.getTime()) < oneDayMs;
          });

          if (alreadyExists) {
            skipCount++;
            logger.debug(`⏭️  Snapshot voor ${daysAgo} dagen geleden bestaat al, skip`);
          } else {
            // Sla snapshot op in RiderHistory tabel via Prisma direct
            // (saveRiderHistory verwacht andere parameters)
            await prisma.riderHistory.create({
              data: {
                riderId: rider.id,
                ftp: historicalData.ftp,
                powerToWeight: historicalData.ftp && historicalData.weight 
                  ? historicalData.ftp / historicalData.weight 
                  : null,
                ranking: historicalData.ranking,
                rankingScore: historicalData.rankingScore,
                weight: historicalData.weight,
                categoryRacing: historicalData.zpCategory,
                zPoints: null, // Not in API response
                snapshotType: 'historical_sync',
                triggeredBy: `${daysAgo}d ago`,
                recordedAt: snapshotDate,
              },
            });

            successCount++;
            logger.debug(`✓ Snapshot ${i + 1}/${snapshots} opgeslagen (${daysAgo}d geleden)`);
          }

          // Rate limiting: 5 calls/min = 12s delay
          if (i < snapshots - 1) {
            await this.delay(12000);
          }
        } catch (error) {
          logger.warn(`⚠️  Kon snapshot niet ophalen voor ${daysAgo} dagen geleden`, error);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ US2: Historische sync voltooid: ${successCount} nieuw, ${skipCount} geskipt`);

      await this.syncLogRepo.logSync(
        'rider_history',
        'success',
        successCount,
        duration,
        undefined,
        { targetId: riderId.toString() }
      );

      return { successCount, skipCount, totalDays: days };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      
      logger.error(`❌ US2: Fout bij historische sync ${riderId}`, error);
      
      await this.syncLogRepo.logSync(
        'rider_history',
        'error',
        0,
        duration,
        errorMessage,
        { targetId: riderId.toString() }
      );
      
      throw error;
    }
  }

  /**
   * US3: Rider events ophalen (90 dagen rolling)
   * 
   * Haalt alle race results op voor een rider uit de afgelopen 90 dagen.
   * Gebruikt getRiderResults() API endpoint.
   * Triggered bij nieuwe rider toevoegen.
   * 
   * @param riderId - Zwift rider ID
   */
  async syncRiderEvents(riderId: number) {
    const startTime = Date.now();
    logger.info(`🔄 US3: Start events sync voor rider ${riderId}`);

    try {
      // Check of rider bestaat
      const rider = await this.riderRepo.getRider(riderId);
      if (!rider) {
        throw new Error(`Rider ${riderId} niet gevonden. Voer eerst US1 uit.`);
      }

      // Haal alle results op (API geeft automatisch laatste 90 dagen)
      const results = await this.apiClient.getRiderResults(riderId);
      logger.info(`✓ ${results.length} race results opgehaald voor ${rider.name}`);

      if (results.length === 0) {
        logger.info('ℹ️  Geen race results gevonden voor deze rider');
        return { eventsCount: 0, resultsCount: 0 };
      }

      // Filter op laatste 90 dagen (extra check)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const recentResults = results.filter(result => {
        if (!result.eventDate) return false;
        const eventDate = new Date(result.eventDate);
        return eventDate >= ninetyDaysAgo;
      });

      logger.info(`✓ ${recentResults.length} results binnen 90 dagen`);

      // Sla results op (upsert bulk)
      await this.resultRepo.upsertResultsBulk(recentResults, 'zwiftranking');

      // Update rider statistics
      const totalRaces = recentResults.length;
      const totalWins = recentResults.filter(r => r.position === 1).length;
      const totalPodiums = recentResults.filter(r => r.position && r.position <= 3).length;

      await prisma.rider.update({
        where: { zwiftId: riderId },
        data: {
          totalRaces,
          totalWins,
          totalPodiums,
          lastActive: new Date(Math.max(...recentResults.map(r => 
            r.eventDate ? new Date(r.eventDate).getTime() : 0
          ))),
        },
      });

      const duration = Date.now() - startTime;
      logger.info(`✅ US3: Events sync voltooid: ${recentResults.length} results opgeslagen`);

      await this.syncLogRepo.logSync(
        'rider_events',
        'success',
        recentResults.length,
        duration,
        undefined,
        { targetId: riderId.toString() }
      );

      // Count unique events
      const uniqueEvents = new Set(recentResults.map(r => r.eventId)).size;
      
      return {
        eventsCount: uniqueEvents,
        resultsCount: recentResults.length,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      
      logger.error(`❌ US3: Fout bij events sync ${riderId}`, error);
      
      await this.syncLogRepo.logSync(
        'rider_events',
        'error',
        0,
        duration,
        errorMessage,
        { targetId: riderId.toString() }
      );
      
      throw error;
    }
  }

  /**
   * US4: Scan alle active riders op nieuwe events (hourly)
   * 
   * Draait automatisch via cron job (elk uur).
   * Checkt voor elke active/favorite rider of er nieuwe results zijn.
   */
  async scanNewEvents() {
    const startTime = Date.now();
    logger.info('🔄 US4: Start hourly scan voor nieuwe events');

    try {
      // Haal alle active favorite riders op
      const riders = await this.riderRepo.getFavoriteRiders();
      logger.info(`✓ ${riders.length} active riders gevonden`);

      if (riders.length === 0) {
        logger.info('ℹ️  Geen active riders om te scannen');
        return { scannedCount: 0, newEventsCount: 0 };
      }

      let scannedCount = 0;
      let newEventsCount = 0;
      let errorCount = 0;

      for (const rider of riders) {
        try {
          // Haal laatste known event op voor deze rider
          const existingResults = await this.resultRepo.getRiderResults(rider.id, 1);
          const lastKnownEventDate = existingResults[0]?.event?.eventDate;

          // Haal verse results op van API
          const results = await this.apiClient.getRiderResults(rider.zwiftId);
          
          // Filter alleen nieuwe events (na laatst bekende event)
          const newResults = lastKnownEventDate
            ? results.filter(r => r.eventDate && new Date(r.eventDate) > new Date(lastKnownEventDate))
            : results.slice(0, 5); // Eerste sync: neem laatste 5 events

          if (newResults.length > 0) {
            await this.resultRepo.upsertResultsBulk(newResults, 'zwiftranking');
            newEventsCount += newResults.length;
            logger.info(`✓ ${newResults.length} nieuwe events voor ${rider.name}`);
          } else {
            logger.debug(`⏭️  Geen nieuwe events voor ${rider.name}`);
          }

          scannedCount++;

          // Rate limiting: 5 calls/min = 12s delay
          if (riders.indexOf(rider) < riders.length - 1) {
            await this.delay(12000);
          }
        } catch (error) {
          errorCount++;
          logger.warn(`⚠️  Fout bij scannen rider ${rider.zwiftId}`, error);
        }
      }

      const duration = Date.now() - startTime;
      const status = errorCount === 0 ? 'success' : errorCount < riders.length ? 'partial' : 'error';
      
      logger.info(`✅ US4: Event scan voltooid: ${scannedCount} riders, ${newEventsCount} nieuwe events`);

      await this.syncLogRepo.logSync(
        'event_scan',
        status,
        newEventsCount,
        duration
      );

      return { scannedCount, newEventsCount, errorCount };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      
      logger.error('❌ US4: Fout bij event scan', error);
      
      await this.syncLogRepo.logSync(
        'event_scan',
        'error',
        0,
        duration,
        errorMessage
      );
      
      throw error;
    }
  }

  /**
   * US5 + US6: Verwijder rider inclusief alle gekoppelde data
   * 
   * Cascade delete voor:
   * - RiderHistory (US5)
   * - RaceResults (US6)
   * - RiderStatistics, RiderRaceRating, RiderPhenotype (automatisch via Prisma)
   * 
   * @param riderId - Zwift rider ID
   */
  async deleteRiderComplete(riderId: number) {
    const startTime = Date.now();
    logger.info(`🗑️  US5/US6: Start volledige rider delete voor ${riderId}`);

    try {
      // Haal rider op (voor logging)
      const rider = await this.riderRepo.getRider(riderId);
      if (!rider) {
        throw new Error(`Rider ${riderId} niet gevonden`);
      }

      const riderName = rider.name;

      // Count data voordat we deleten (voor logging)
      const historyCount = await this.riderRepo.getRiderHistory(rider.id, 365);
      const resultsCount = await this.resultRepo.getRiderResults(rider.id, 1000);

      logger.info(`📊 Te verwijderen data voor ${riderName}:`);
      logger.info(`   - ${historyCount.length} historische snapshots`);
      logger.info(`   - ${resultsCount.length} race results`);

      // Delete rider (Prisma cascade delete regelt de rest)
      // Dit verwijdert automatisch:
      // - RiderHistory (onDelete: Cascade)
      // - RaceResult (onDelete: Cascade)
      // - RiderStatistics (onDelete: Cascade)
      // - RiderRaceRating (onDelete: Cascade)
      // - RiderPhenotype (onDelete: Cascade)
      await this.riderRepo.deleteRider(riderId);

      const duration = Date.now() - startTime;
      logger.info(`✅ US5/US6: Rider ${riderName} volledig verwijderd in ${duration}ms`);

      await this.syncLogRepo.logSync(
        'rider_delete',
        'success',
        1,
        duration,
        `Deleted ${riderName} with ${historyCount.length} history + ${resultsCount.length} results`,
        { targetId: riderId.toString() }
      );

      return {
        riderId,
        riderName,
        deletedHistory: historyCount.length,
        deletedResults: resultsCount.length,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      
      logger.error(`❌ US5/US6: Fout bij rider delete ${riderId}`, error);
      
      await this.syncLogRepo.logSync(
        'rider_delete',
        'error',
        0,
        duration,
        errorMessage,
        { targetId: riderId.toString() }
      );
      
      throw error;
    }
  }

  /**
   * Volledige initiële sync voor nieuwe rider (US1 + US2 + US3)
   * 
   * @param riderId - Zwift rider ID
   * @param clubId - Optional club ID
   */
  async fullRiderSync(riderId: number, clubId?: number) {
    logger.info(`🚀 Start volledige rider sync voor ${riderId}`);
    const startTime = Date.now();

    try {
      // US1: Actuele data
      logger.info('📍 Step 1/3: Actuele rider data...');
      const rider = await this.syncRiderCurrent(riderId, clubId);

      // Wacht voor rate limiting
      await this.delay(1000);

      // US3: Events (doe dit voor US2 want sneller en geen rate limit issues)
      logger.info('📍 Step 2/3: Race events (90d)...');
      const eventsResult = await this.syncRiderEvents(riderId);

      // Wacht voor rate limiting
      await this.delay(2000);

      // US2: Historische snapshots (dit duurt lang vanwege rate limits)
      logger.info('📍 Step 3/3: Historische snapshots (90d)...');
      const historyResult = await this.syncRiderHistory(riderId, 90);

      const duration = Date.now() - startTime;
      logger.info(`🎉 Volledige rider sync voltooid in ${(duration / 1000 / 60).toFixed(2)} minuten`);
      logger.info(`   - Rider: ${rider.name}`);
      logger.info(`   - Events: ${eventsResult.eventsCount} events, ${eventsResult.resultsCount} results`);
      logger.info(`   - History: ${historyResult.successCount} snapshots`);

      return {
        rider,
        events: eventsResult,
        history: historyResult,
        totalDuration: duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Fout bij volledige rider sync ${riderId}`, error);
      throw error;
    }
  }

  /**
   * Helper: delay functie
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default RiderSyncService;
