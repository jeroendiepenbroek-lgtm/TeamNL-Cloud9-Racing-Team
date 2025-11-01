import { ZwiftApiClient } from '../api/zwift-client.js';
import {
  clubSourceRepo,
  eventResultsSourceRepo,
  eventZpSourceRepo,
  riderSourceRepo,
  riderBulkSourceRepo,
  rateLimitRepo,
} from '../database/source-repositories.js';
import { logger } from '../utils/logger.js';
import { eventDiscoveryService } from './event-discovery.service.js';

/**
 * Source Data Collector Service
 * 
 * 🇳🇱 SERVICE BESCHRIJVING:
 * Deze service verzamelt data van de ZwiftRacing API en slaat deze op
 * in brondatatabellen (immutable source-of-truth).
 * 
 * ARCHITECTUUR PRINCIPES:
 * ✅ Immutable: Nooit updaten, alleen nieuwe snapshots toevoegen
 * ✅ Complete: Sla volledige API responses op als JSON
 * ✅ Traceable: Log elke fetch met metadata (responseTime, rateLimit)
 * ✅ Rate Limit Aware: Check voor elke call of endpoint beschikbaar is
 * 
 * USER STORIES GEÏMPLEMENTEERD:
 * - US5: fetchAllRiderData() - Haal rider + club data binnen
 * - US6: fetchRecentEvents() - Haal 90-dagen event history (beide endpoints)
 * - US7: scanForNewEvents() - Scan multiple riders op nieuwe events
 * 
 * RATE LIMITS:
 * - Rider data: 5 calls/min
 * - Club data: 1 call/60min
 * - Event results: 1 call/min (per endpoint)
 * - Events worden sequentieel gefetcht met 61s delays
 */

export class SourceDataCollector {
  constructor(private apiClient: ZwiftApiClient) {}

  // ============================================================================
  // US5: DATA FETCH VOOR SPECIFIC RIDER (RIDER + CLUB DATA)
  // ============================================================================

  /**
   * US5: Haal alle data binnen voor een specifieke rider
   * 
   * 🎯 DOEL:
   * Verzamel complete rider profiel + club data voor analyse/trending
   * 
   * WORKFLOW:
   * 1. Fetch rider data (GET /public/riders/:id) - Rate: 5/min
   * 2. Check of rider in club zit
   * 3. Indien ja: Fetch club data (GET /public/clubs/:id) - Rate: 1/60min
   * 4. Sla beide op in brondatatabellen met metadata
   * 
   * RATE LIMIT CHECKS:
   * - Controleer rate limit VÓÓr elke API call
   * - Skip call indien limit bereikt (wordt gelogd)
   * - Return partial data indien 1 van 2 calls mislukt
   * 
   * @param riderId - Zwift rider ID
   * @returns Object met riderData, clubData, errors array
   */
  async fetchAllRiderData(riderId: number) {
    logger.info(`🔍 Start US5: Fetch alle data voor rider ${riderId}`);
    const startTime = Date.now();
    
    const results = {
      riderData: null as any,
      clubData: null as any,
      errors: [] as string[],
    };

    try {
      // 1. Fetch rider data (/public/riders/:id)
      logger.info(`  📊 Haal rider data op...`);
      const canFetchRider = await rateLimitRepo.isWithinRateLimit('/public/riders/:id');
      
      if (canFetchRider) {
        try {
          const reqStart = Date.now();
          const riderData = await this.apiClient.getRider(riderId);
          const responseTime = Date.now() - reqStart;

          // Sla op in brondatatabellen
          results.riderData = await riderSourceRepo.saveRiderData({
            riderId,
            rawData: riderData,
            responseTime,
          });
          
          logger.info(`  ✅ Rider data opgeslagen (${responseTime}ms)`);

          // 2. Fetch club data (/public/clubs/:id/:riderId) - als rider in club zit
          if (riderData.club?.id) {
            logger.info(`  👥 Rider zit in club ${riderData.club.id}, haal club data op...`);
            
            // Wacht voor rate limit (clubs endpoint is streng: 1/60min)
            await this.delay(2000);
            
            const canFetchClub = await rateLimitRepo.isWithinRateLimit('/public/clubs/:id');
            
            if (canFetchClub) {
              try {
                const clubStart = Date.now();
                const clubData = await this.apiClient.getClubMembers(riderData.club.id);
                const clubResponseTime = Date.now() - clubStart;

                // Sla op in brondatatabellen
                results.clubData = await clubSourceRepo.saveClubData({
                  clubId: riderData.club.id,
                  rawData: clubData,
                  responseTime: clubResponseTime,
                });

                logger.info(`  ✅ Club data opgeslagen (${clubResponseTime}ms, ${clubData.riders?.length || 0} members)`);
              } catch (error: any) {
                const errorMsg = `Club data fetch gefaald: ${error.message}`;
                logger.error(`  ❌ ${errorMsg}`);
                results.errors.push(errorMsg);
              }
            } else {
              const msg = 'Rate limit bereikt voor clubs endpoint';
              logger.warn(`  ⚠️  ${msg}`);
              results.errors.push(msg);
            }
          }
        } catch (error: any) {
          const errorMsg = `Rider data fetch gefaald: ${error.message}`;
          logger.error(`  ❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      } else {
        const msg = 'Rate limit bereikt voor riders endpoint';
        logger.warn(`  ⚠️  ${msg}`);
        results.errors.push(msg);
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ US5 voltooid in ${duration}ms (${results.errors.length} errors)`);

      return results;
    } catch (error: any) {
      logger.error('❌ US5 gefaald:', error);
      throw error;
    }
  }

  // ============================================================================
  // US6: EVENTS LAATSTE 90 DAGEN (WEB SCRAPING + API ENRICHMENT)
  // ============================================================================

  /**
   * US6: Haal alle events van rider uit afgelopen N dagen
   * 
   * 🎯 NIEUWE ARCHITECTUUR (met web scraping):
   * 
   * STAP 1: EVENT DISCOVERY (scraping)
   * - Scrape https://www.zwiftracing.app/riders/:riderId
   * - Parse JSON uit HTML → alle events van laatste N dagen
   * - Save event IDs naar database
   * 
   * STAP 2: DATA ENRICHMENT (API)
   * - Voor elk event: fetch brondatatabellen data
   * - GET /public/results/:eventId → rating data
   * - GET /public/zp/:eventId/results → power curves
   * 
   * VOORDELEN:
   * ✅ Snelheid: 2 seconden scraping vs 3+ uur backward scan
   * ✅ Compleet: Alle rider events in 1 HTTP call
   * ✅ Geen rate limit issues bij event discovery
   * 
   * WAAROM BEIDE ENDPOINTS?
   * - /public/results/:eventId → Rating data (Zwift Racing League)
   * - /public/zp/:eventId/results → Power curves, FTP, heart rate (ZwiftPower)
   * - Combinatie geeft compleet beeld van race performance
   * 
   * WORKFLOW:
   * 1. Scrape rider events (US1 via eventDiscoveryService)
   * 2. Query database voor recent events
   * 3. Voor elk event:
   *    a. Check of results data al exists → Skip indien ja
   *    b. Fetch results data (1 call/min rate limit)
   *    c. Wait 61 seconden (rate limit respect)
   *    d. Check of ZP data al exists → Skip indien ja
   *    e. Fetch ZP data (1 call/min rate limit)
   *    f. Wait 61 seconden
   * 
   * RATE LIMITS:
   * - Results endpoint: 1 call/min (60s reset)
   * - ZP endpoint: 1 call/min (60s reset)
   * - Total per event: 2 calls × 61s = ~2 minuten
   * - 26 events = ~52+ minuten processing time
   * 
   * OPTIMIZATION:
   * - Skip events die al in database zitten
   * - Log rate limit status na elke call
   * - Continue bij errors (return partial data)
   * 
   * @param riderId - Zwift rider ID
   * @param days - Aantal dagen terug (default: 90)
   * @returns Object met counts (eventsProcessed, resultsDataSaved, zpDataSaved, errors)
   */
  async fetchRecentEvents(riderId: number, days: number = 90) {
    logger.info(`\n� US6: Fetch event data voor rider ${riderId} (laatste ${days} dagen)`);
    const startTime = Date.now();

    const results = {
      eventsProcessed: 0,
      resultsDataSaved: 0,
      zpDataSaved: 0,
      errors: [] as string[],
    };

    try {
      // ======================================================================
      // STAP 1: EVENT DISCOVERY via scraping (US1)
      // ======================================================================
      logger.info(`\n📋 STAP 1: Event Discovery (web scraping)`);
      const scrapeResult = await eventDiscoveryService.scrapeRiderEvents(riderId, days);
      
      logger.info(`  ✅ ${scrapeResult.totalEvents} events gevonden`);
      logger.info(`  ✅ ${scrapeResult.newEvents} nieuwe events toegevoegd`);
      logger.info(`  ✅ ${scrapeResult.newResults} nieuwe race results toegevoegd`);
      
      if (scrapeResult.totalEvents === 0) {
        logger.warn(`  ⚠️  Geen events gevonden voor rider ${riderId}`);
        return results;
      }
      
      // ======================================================================
      // STAP 2: QUERY DATABASE voor recent events
      // ======================================================================
      logger.info(`\n📊 STAP 2: Query database voor events`);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const raceResults = await (await import('../database/client.js')).default.raceResult.findMany({
        where: {
          rider: {
            zwiftId: riderId,
          },
          event: {
            eventDate: {
              gte: cutoffDate,
            },
          },
        },
        include: {
          event: true,
        },
        orderBy: {
          event: {
            eventDate: 'desc',
          },
        },
      });

      const recentEvents = raceResults.map(rr => ({
        eventId: rr.event.id,
        eventName: rr.event.name,
        eventDate: rr.event.eventDate,
      }));

      // Deduplicate events
      const uniqueEvents = Array.from(
        new Map(recentEvents.map(e => [e.eventId, e])).values()
      );

      logger.info(`  ✅ ${uniqueEvents.length} unieke events in database`);

      // ======================================================================
      // STAP 3: DATA ENRICHMENT - Fetch details van elk event (BEIDE endpoints)
      // ======================================================================
      logger.info(`\n🔄 STAP 3: Data Enrichment (API calls)`);
      
      for (let i = 0; i < uniqueEvents.length; i++) {
        const event = uniqueEvents[i];
        const eventId = event.eventId;
        
        logger.info(`  🏁 Event ${i + 1}/${uniqueEvents.length}: ${eventId} - ${event.eventName}`);
        results.eventsProcessed++;

        // Check of we al data hebben
        const hasResults = await eventResultsSourceRepo.hasEventData(eventId);
        const hasZp = await eventZpSourceRepo.hasEventZpData(eventId);

        // A. Fetch /public/results/:eventId
        if (!hasResults) {
          const canFetchResults = await rateLimitRepo.isWithinRateLimit('/public/results/:eventId');
          
          if (canFetchResults) {
            try {
              logger.info(`    📊 Haal results data op...`);
              const reqStart = Date.now();
              const resultsData = await this.apiClient.getResults(eventId);
              const responseTime = Date.now() - reqStart;

              // Sla op in brondatatabellen
              await eventResultsSourceRepo.saveEventResultsData({
                eventId,
                rawData: resultsData,
                eventName: event.eventName,
                eventDate: event.eventDate ? new Date(event.eventDate) : undefined,
                responseTime,
              });

              results.resultsDataSaved++;
              logger.info(`    ✅ Results data opgeslagen (${resultsData.length} participants, ${responseTime}ms)`);

              // Wacht voor rate limit (1/min)
              if (i < uniqueEvents.length - 1 || !hasZp) {
                logger.info(`    ⏳ Wacht 61s voor rate limit...`);
                await this.delay(61000);
              }
            } catch (error: any) {
              const errorMsg = `Results data fetch gefaald voor event ${eventId}: ${error.message}`;
              logger.error(`    ❌ ${errorMsg}`);
              results.errors.push(errorMsg);
            }
          } else {
            logger.warn(`    ⚠️  Rate limit bereikt voor results endpoint`);
          }
        } else {
          logger.info(`    ✓ Results data al aanwezig`);
        }

        // B. Fetch /public/zp/:eventId/results
        if (!hasZp) {
          const canFetchZp = await rateLimitRepo.isWithinRateLimit('/public/zp/:eventId/results');
          
          if (canFetchZp) {
            try {
              logger.info(`    🔷 Haal ZwiftPower data op...`);
              const reqStart = Date.now();
              const zpData = await this.apiClient.getZwiftPowerResults(eventId);
              const responseTime = Date.now() - reqStart;

              // Sla op in brondatatabellen
              await eventZpSourceRepo.saveEventZpData({
                eventId,
                rawData: zpData,
                eventName: event.eventName,
                eventDate: event.eventDate ? new Date(event.eventDate) : undefined,
                responseTime,
              });

              results.zpDataSaved++;
              logger.info(`    ✅ ZP data opgeslagen (${zpData.length} participants, ${responseTime}ms)`);

              // Wacht voor rate limit als er meer events zijn (1/min)
              if (i < uniqueEvents.length - 1) {
                logger.info(`    ⏳ Wacht 61s voor rate limit...`);
                await this.delay(61000);
              }
            } catch (error: any) {
              const errorMsg = `ZP data fetch gefaald voor event ${eventId}: ${error.message}`;
              logger.error(`    ❌ ${errorMsg}`);
              results.errors.push(errorMsg);
            }
          } else {
            logger.warn(`    ⚠️  Rate limit bereikt voor ZP endpoint`);
          }
        } else {
          logger.info(`    ✓ ZP data al aanwezig`);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ US6 voltooid in ${(duration / 1000).toFixed(1)}s`);
      logger.info(`   📊 ${results.eventsProcessed} events verwerkt`);
      logger.info(`   📊 ${results.resultsDataSaved} results data opgeslagen`);
      logger.info(`   🔷 ${results.zpDataSaved} ZP data opgeslagen`);
      logger.info(`   ❌ ${results.errors.length} errors`);

      return results;
    } catch (error: any) {
      logger.error('❌ US6 gefaald:', error);
      throw error;
    }
  }

  // ============================================================================
  // US7: HOURLY EVENT SCANNER (MULTIPLE RIDERS)
  // ============================================================================

  /**
   * US7: Scan elk uur op nieuwe events
   * 
   * 🎯 DOEL:
   * Automatische hourly scan van tracked riders voor nieuwe race results
   * 
   * WORKFLOW:
   * 1. Voor elke rider:
   *    a. GET /public/riders/:id/results → Haal event lijst op
   *    b. Check welke events NIET in database zitten
   *    c. Voor nieuwe events: fetch data van beide endpoints
   *    d. Respecteer rate limits (61s delays)
   * 
   * USE CASE:
   * - Cron job: Elke uur top of the hour
   * - Input: Array van tracked rider IDs (favorites, team members)
   * - Output: Aantal nieuwe events gevonden en opgeslagen
   * 
   * RATE LIMIT MANAGEMENT:
   * - Check rate limits VÓÓ elke API call
   * - Bij limit bereikt: skip en log warning
   * - Continue met volgende rider bij errors
   * 
   * SCHEDULER INTEGRATIE:
   * ```typescript
   * scheduler.addJob({
   *   name: 'hourly-event-scan',
   *   schedule: '0 * * * *',  // Top of every hour
   *   handler: async () => {
   *     const trackedRiders = await getRiderRepository().getAllTrackedRiders();
   *     const riderIds = trackedRiders.map(r => r.zwiftId);
   *     await sourceDataCollector.scanForNewEvents(riderIds);
   *   }
   * });
   * ```
   * 
   * @param riderIds - Array van Zwift rider IDs om te scannen
   * @returns Object met ridersScanned, newEventsFound, errors array
   */
  async scanForNewEvents(riderIds: number[]) {
    logger.info(`🔍 Start US7: Hourly event scan voor ${riderIds.length} riders`);
    const startTime = Date.now();

    const results = {
      ridersScanned: 0,
      newEventsFound: 0,
      eventsProcessed: 0,
      resultsDataSaved: 0,
      zpDataSaved: 0,
      errors: [] as string[],
    };

    try {
      const prisma = (await import('../database/client.js')).default;
      
      // Haal recente events op uit database (laatste 7 dagen)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      for (const riderId of riderIds) {
        logger.info(`  👤 Scan rider ${riderId}...`);
        results.ridersScanned++;

        try {
          // Haal recente events uit database waar rider aan deelnam
          const raceResults = await prisma.raceResult.findMany({
            where: {
              rider: {
                zwiftId: riderId,
              },
              event: {
                eventDate: {
                  gte: sevenDaysAgo,
                },
              },
            },
            include: {
              event: true,
            },
            orderBy: {
              event: {
                eventDate: 'desc',
              },
            },
          });

          if (raceResults.length === 0) {
            logger.info(`  ℹ️  Geen recente events voor rider ${riderId}`);
            continue;
          }

          // Unieke events
          const events = Array.from(
            new Map(
              raceResults.map(rr => [
                rr.event.id,
                {
                  eventId: rr.event.id,
                  eventName: rr.event.name,
                  eventDate: rr.event.eventDate,
                },
              ])
            ).values()
          );

          logger.info(`  📊 ${events.length} recente events gevonden`);

          // Check welke events nog niet in brondatatabellen zitten
          for (const event of events) {
            const eventId = event.eventId;
            
            const hasResults = await eventResultsSourceRepo.hasEventData(eventId);
            const hasZp = await eventZpSourceRepo.hasEventZpData(eventId);

            if (!hasResults || !hasZp) {
              logger.info(`    🆕 Event ${eventId} mist data (results: ${!hasResults}, zp: ${!hasZp})`);
              results.newEventsFound++;
              results.eventsProcessed++;

              // Fetch missing results data
              if (!hasResults) {
                const canFetchResults = await rateLimitRepo.isWithinRateLimit('/public/results/:eventId');
                
                if (canFetchResults) {
                  try {
                    logger.info(`    📊 Fetch results data...`);
                    const reqStart = Date.now();
                    const resultsData = await this.apiClient.getResults(eventId);
                    const responseTime = Date.now() - reqStart;

                    await eventResultsSourceRepo.saveEventResultsData({
                      eventId,
                      rawData: resultsData,
                      eventName: event.eventName,
                      eventDate: event.eventDate,
                      responseTime,
                    });

                    results.resultsDataSaved++;
                    logger.info(`    ✅ Results data opgeslagen (${responseTime}ms)`);
                    
                    await this.delay(61000); // Rate limit
                  } catch (error: any) {
                    const errorMsg = `Results fetch gefaald voor event ${eventId}: ${error.message}`;
                    logger.error(`    ❌ ${errorMsg}`);
                    results.errors.push(errorMsg);
                  }
                } else {
                  logger.warn(`    ⚠️  Rate limit bereikt voor results endpoint`);
                }
              }

              // Fetch missing ZP data
              if (!hasZp) {
                const canFetchZp = await rateLimitRepo.isWithinRateLimit('/public/zp/:eventId/results');
                
                if (canFetchZp) {
                  try {
                    logger.info(`    🔷 Fetch ZwiftPower data...`);
                    const reqStart = Date.now();
                    const zpData = await this.apiClient.getZwiftPowerResults(eventId);
                    const responseTime = Date.now() - reqStart;

                    await eventZpSourceRepo.saveEventZpData({
                      eventId,
                      rawData: zpData,
                      eventName: event.eventName,
                      eventDate: event.eventDate,
                      responseTime,
                    });

                    results.zpDataSaved++;
                    logger.info(`    ✅ ZP data opgeslagen (${responseTime}ms)`);
                    
                    await this.delay(61000); // Rate limit
                  } catch (error: any) {
                    const errorMsg = `ZP fetch gefaald voor event ${eventId}: ${error.message}`;
                    logger.error(`    ❌ ${errorMsg}`);
                    results.errors.push(errorMsg);
                  }
                } else {
                  logger.warn(`    ⚠️  Rate limit bereikt voor ZP endpoint`);
                }
              }
            }
          }
        } catch (error: any) {
          const errorMsg = `Scan gefaald voor rider ${riderId}: ${error.message}`;
          logger.error(`  ❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ US7 voltooid in ${(duration / 1000).toFixed(1)}s`);
      logger.info(`   👥 ${results.ridersScanned} riders gescand`);
      logger.info(`   🆕 ${results.newEventsFound} nieuwe events gevonden`);
      logger.info(`   📊 ${results.eventsProcessed} events verwerkt`);
      logger.info(`   📊 ${results.resultsDataSaved} results data opgeslagen`);
      logger.info(`   🔷 ${results.zpDataSaved} ZP data opgeslagen`);
      logger.info(`   ❌ ${results.errors.length} errors`);

      return results;
    } catch (error: any) {
      logger.error('❌ US7 gefaald:', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance with configured API client
const apiClient = new ZwiftApiClient({
  baseUrl: 'https://zwift-ranking.herokuapp.com',
  apiKey: process.env.ZWIFT_API_KEY || '',
});

export const sourceDataCollectorService = new SourceDataCollector(apiClient);


