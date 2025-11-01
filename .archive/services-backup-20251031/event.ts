/**
 * EventService - Forward event scanning met 100-day retention (Workflow Step 5)
 * 
 * Scant nieuwe events incrementeel en bewaart alleen relevante resultaten
 * (van tracked riders: favorites + club members)
 */

import { ZwiftApiClient } from '../api/zwift-client.js';
import { EventRepository, ResultRepository, RiderRepository } from '../database/repositories-mvp.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

// Note: ClubMemberRepository doesn't exist in MVP schema

export interface ForwardScanOptions {
  maxEvents?: number;
  startEventId?: number;
  retentionDays?: number;
}

export interface ForwardScanResult {
  scanned: number;
  found: number;
  saved: number;
  archived: number;
  duration: number;
  lastEventId: number;
}

export class EventService {
  private zwiftApi: ZwiftApiClient;
  private eventRepo: EventRepository;
  private resultRepo: ResultRepository;
  private clubMemberRepo: ClubMemberRepository;
  private riderRepo: RiderRepository;

  constructor() {
    this.zwiftApi = new ZwiftApiClient({
      apiKey: config.zwiftApiKey,
      baseUrl: config.zwiftApiBaseUrl,
    });
    this.eventRepo = new EventRepository();
    this.resultRepo = new ResultRepository();
    this.clubMemberRepo = new ClubMemberRepository();
    this.riderRepo = new RiderRepository();
  }

  /**
   * Forward scan: scan nieuwe events incrementeel
   */
  async forwardScan(options: ForwardScanOptions = {}): Promise<ForwardScanResult> {
    const startTime = Date.now();
    const maxEvents = options.maxEvents || 1000;
    const retentionDays = options.retentionDays || 100;

    logger.info('Starting forward event scan', {
      maxEvents,
      retentionDays,
      startEventId: options.startEventId,
    });

    // 1. Haal tracked riders op (favorites + club members)
    const trackedRiders = await this.getTrackedRiders();
    logger.info(`Tracking ${trackedRiders.size} riders`);

    if (trackedRiders.size === 0) {
      logger.warn('No tracked riders - skipping scan');
      return {
        scanned: 0,
        found: 0,
        saved: 0,
        archived: 0,
        duration: 0,
        lastEventId: 0,
      };
    }

    // 2. Bepaal start event ID
    const startEventId = options.startEventId || await this.eventRepo.getLastEventId();
    const endEventId = startEventId + maxEvents;

    logger.info(`Scanning events ${startEventId + 1} to ${endEventId}`);

    let scanned = 0;
    let found = 0;
    let saved = 0;

    // 3. Scan events
    for (let eventId = startEventId + 1; eventId <= endEventId; eventId++) {
      scanned++;

      try {
        // Rate limit: 1/min voor results endpoint
        if (scanned > 1) {
          await this.sleep(61 * 1000); // 61 sec
        }

        // Haal event results op
        const results: any = await this.zwiftApi.getResults(eventId);
        
        if (!results || results.length === 0) {
          // Event bestaat niet of heeft geen results
          continue;
        }

        // Filter: bevat tracked riders?
        const trackedResults = results.filter((result: any) => 
          trackedRiders.has(result.riderId)
        );

        if (trackedResults.length === 0) {
          // Geen tracked riders in dit event
          continue;
        }

        found++;
        logger.info(`Found relevant event ${eventId} (${trackedResults.length} tracked riders)`);

        // Save event
        await this.eventRepo.upsertEvent({
          id: eventId,
          name: `Event ${eventId}`,
          eventDate: new Date(),
          totalFinishers: results.length,
        });

        // Save tracked results
        for (const result of trackedResults) {
          await this.resultRepo.upsertResult({
            eventId: eventId,
            eventName: `Event ${eventId}`,
            riderId: result.riderId,
            name: result.name || 'Unknown',
            position: result.position,
            category: result.category,
            averagePower: result.averagePower,
            averageWkg: result.averageWkg,
            time: result.time,
            distance: result.distance,
          }, 'zwiftranking');
        }

        saved++;

        // Log progress
        if (scanned % 100 === 0) {
          logger.info(`Progress: ${scanned}/${maxEvents} scanned, ${found} relevant, ${saved} saved`);
        }

      } catch (error) {
        logger.error(`Error scanning event ${eventId}`, error);
        // Continue met volgende event
      }
    }

    // 4. Cleanup old data (100-day retention)
    const archived = await this.cleanup100Days(retentionDays);

    const duration = Date.now() - startTime;

    const result: ForwardScanResult = {
      scanned,
      found,
      saved,
      archived,
      duration,
      lastEventId: endEventId,
    };

    logger.info('Forward scan complete', result);

    return result;
  }

  /**
   * Haal alle tracked riders op (favorites + club members van favorite clubs)
   */
  private async getTrackedRiders(): Promise<Set<number>> {
    const [favoriteIds, clubMemberIds] = await Promise.all([
      this.riderRepo.getFavoriteZwiftIds(),
      this.clubMemberRepo.getAllTrackedRiders(),
    ]);

    return new Set([...favoriteIds, ...clubMemberIds]);
  }

  /**
   * 100-day retention cleanup
   */
  async cleanup100Days(retentionDays: number = 100): Promise<number> {
    logger.info(`Starting cleanup (${retentionDays} day retention)...`);

    // Soft delete events
    const softDeleted = await this.eventRepo.softDeleteOldEvents(retentionDays);
    logger.info(`Soft deleted ${softDeleted} events older than ${retentionDays} days`);

    // Hard delete results (7 day grace period)
    const hardDeleted = await this.eventRepo.deleteArchivedResults(7);
    logger.info(`Hard deleted ${hardDeleted} race results from archived events`);

    logger.info('Cleanup complete', {
      eventsArchived: softDeleted,
      resultsDeleted: hardDeleted,
    });

    return softDeleted;
  }

  /**
   * Haal events op met tracked rider deelname
   */
  async getTrackedEvents(limit: number = 50) {
    const trackedRiders = await this.getTrackedRiders();
    return await this.eventRepo.getEventsWithTrackedRiders(
      Array.from(trackedRiders),
      limit
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
