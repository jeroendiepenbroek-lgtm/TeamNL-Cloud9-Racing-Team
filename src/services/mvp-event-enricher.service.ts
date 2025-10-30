/**
 * MVP Event Enricher Service
 * 
 * Verantwoordelijk voor het ophalen van event data via API en opslaan in brondatatabellen.
 * 
 * SCOPE:
 * - Fetch event data via ZwiftRacing.app API
 * - Save to event_results_source_data (rating data)
 * - Save to event_zp_source_data (power curves)
 * - Rate limit management (1 call per 61 seconds)
 */

import { ZwiftApiClient } from '../api/zwift-client.js';
import prisma from '../database/client.js';
import { EventResultsSourceRepository, EventZpSourceRepository } from '../database/source-repositories.js';
import { logger } from '../utils/logger.js';

export class MVPEventEnricherService {
  private apiClient: ZwiftApiClient;
  private resultsRepo: EventResultsSourceRepository;
  private zpRepo: EventZpSourceRepository;

  constructor() {
    this.apiClient = new ZwiftApiClient({
      baseUrl: 'https://zwift-ranking.herokuapp.com',
      apiKey: process.env.ZWIFT_API_KEY || '',
    });
    this.resultsRepo = new EventResultsSourceRepository();
    this.zpRepo = new EventZpSourceRepository();
  }

  /**
   * Enrich single event met beide API endpoints
   */
  async enrichEvent(eventId: number): Promise<{
    eventId: number;
    resultsDataSaved: boolean;
    zpDataSaved: boolean;
    skipped: boolean;
    error?: string;
  }> {
    logger.info(`🔍 Enrich event ${eventId}`);

    try {
      // Check of event bestaat
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        logger.warn(`  ⚠️  Event ${eventId} not found in database`);
        return {
          eventId,
          resultsDataSaved: false,
          zpDataSaved: false,
          skipped: true,
          error: 'Event not found',
        };
      }

      // Check of we al data hebben
      const hasResults = await this.resultsRepo.hasEventData(eventId);
      const hasZp = await this.zpRepo.hasEventZpData(eventId);

      if (hasResults && hasZp) {
        logger.info(`  ✓ Event ${eventId} already enriched`);
        return {
          eventId,
          resultsDataSaved: true,
          zpDataSaved: true,
          skipped: true,
        };
      }

      let resultsDataSaved = hasResults;
      let zpDataSaved = hasZp;

      // A. Fetch /public/results/:eventId
      if (!hasResults) {
        logger.info(`  📊 Fetch results data...`);
        const startTime = Date.now();
        const resultsData = await this.apiClient.getResults(eventId);
        const responseTime = Date.now() - startTime;

        await this.resultsRepo.saveEventResultsData({
          eventId,
          rawData: resultsData,
          eventName: event.name,
          eventDate: event.eventDate,
          responseTime,
        });

        resultsDataSaved = true;
        logger.info(`  ✅ Results data saved (${resultsData.length} riders, ${responseTime}ms)`);

        // Rate limit delay
        if (!hasZp) {
          logger.info(`  ⏳ Wait 61s for rate limit...`);
          await this.delay(61000);
        }
      }

      // B. Fetch /public/zp/:eventId/results
      if (!hasZp) {
        logger.info(`  🔷 Fetch ZwiftPower data...`);
        const startTime = Date.now();
        const zpData = await this.apiClient.getZwiftPowerResults(eventId);
        const responseTime = Date.now() - startTime;

        await this.zpRepo.saveEventZpData({
          eventId,
          rawData: zpData,
          eventName: event.name,
          eventDate: event.eventDate,
          responseTime,
        });

        zpDataSaved = true;
        logger.info(`  ✅ ZP data saved (${zpData.length} riders, ${responseTime}ms)`);
      }

      return {
        eventId,
        resultsDataSaved,
        zpDataSaved,
        skipped: false,
      };
    } catch (error: any) {
      logger.error(`  ❌ Error enriching event ${eventId}:`, error);
      return {
        eventId,
        resultsDataSaved: false,
        zpDataSaved: false,
        skipped: false,
        error: error.message,
      };
    }
  }

  /**
   * Enrich multiple events (batch)
   */
  async enrichEvents(eventIds: number[]): Promise<{
    total: number;
    enriched: number;
    skipped: number;
    failed: number;
    errors: string[];
  }> {
    logger.info(`🔄 Enrich ${eventIds.length} events`);

    const results = {
      total: eventIds.length,
      enriched: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const eventId of eventIds) {
      const result = await this.enrichEvent(eventId);

      if (result.error) {
        results.failed++;
        results.errors.push(`Event ${eventId}: ${result.error}`);
      } else if (result.skipped) {
        results.skipped++;
      } else {
        results.enriched++;
      }

      // Rate limit between events
      if (eventIds.indexOf(eventId) < eventIds.length - 1) {
        await this.delay(61000);
      }
    }

    logger.info(`✅ Enrichment complete: ${results.enriched} enriched, ${results.skipped} skipped, ${results.failed} failed`);

    return results;
  }

  /**
   * Get events die nog niet enriched zijn
   */
  async getUnenrichedEvents(limit: number = 50): Promise<number[]> {
    // Get all events
    const events = await prisma.event.findMany({
      select: { id: true },
      take: limit,
      orderBy: { eventDate: 'desc' },
    });

    const unenrichedEventIds: number[] = [];

    for (const event of events) {
      const hasResults = await this.resultsRepo.hasEventData(event.id);
      const hasZp = await this.zpRepo.hasEventZpData(event.id);

      if (!hasResults || !hasZp) {
        unenrichedEventIds.push(event.id);
      }
    }

    return unenrichedEventIds;
  }

  /**
   * Get enrichment statistics
   */
  async getEnrichmentStats(): Promise<{
    totalEvents: number;
    eventsWithResults: number;
    eventsWithZp: number;
    fullyEnriched: number;
    needsEnrichment: number;
    coverage: {
      results: string;
      zp: string;
      full: string;
    };
  }> {
    const totalEvents = await prisma.event.count();

    // Count events with source data (via raw SQL for performance)
    const eventsWithResultsRaw = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT eventId) as count FROM event_results_source_data
    `;
    const eventsWithResults = Number(eventsWithResultsRaw[0]?.count || 0);

    const eventsWithZpRaw = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT eventId) as count FROM event_zp_source_data
    `;
    const eventsWithZp = Number(eventsWithZpRaw[0]?.count || 0);

    // Count fully enriched (both results AND zp)
    const fullyEnrichedRaw = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM (
        SELECT eventId FROM event_results_source_data
        INTERSECT
        SELECT eventId FROM event_zp_source_data
      )
    `;
    const fullyEnriched = Number(fullyEnrichedRaw[0]?.count || 0);

    const needsEnrichment = totalEvents - fullyEnriched;

    return {
      totalEvents,
      eventsWithResults,
      eventsWithZp,
      fullyEnriched,
      needsEnrichment,
      coverage: {
        results: totalEvents > 0 ? `${((eventsWithResults / totalEvents) * 100).toFixed(1)}%` : '0%',
        zp: totalEvents > 0 ? `${((eventsWithZp / totalEvents) * 100).toFixed(1)}%` : '0%',
        full: totalEvents > 0 ? `${((fullyEnriched / totalEvents) * 100).toFixed(1)}%` : '0%',
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton
export const eventEnricherService = new MVPEventEnricherService();
