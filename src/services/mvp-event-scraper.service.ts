/**
 * MVP SERVICE: EVENT SCRAPER
 * 
 * US: Event data d.m.v. scraping https://www.zwiftracing.app/riders/RiderID ophalen
 * US: Event end-points aansturen door Scraped EventIDs
 * US: Ieder uur events scrapen voor alle RiderIDs in Rider database
 * 
 * WORKFLOW:
 * 1. Scrape ZwiftRacing.app website voor rider events
 * 2. Parse JSON from HTML <script id="__NEXT_DATA__">
 * 3. Save event IDs + basic info to events table
 * 4. Save race results to race_results table
 */

import axios from 'axios';
import prisma from '../database/client.js';
import { logger } from '../utils/logger.js';

interface ScrapedEvent {
  _id: string;
  event: {
    id: string;
    time: number;
    title: string;
    type: string;
    subType?: string;
    distance: number;
    elevation: number;
    route?: {
      world: string;
      name: string;
    };
  };
  riderId: number;
  position: number;
  positionInCategory?: number;
  time: number;
  rating?: number;
}

interface RiderPageData {
  props: {
    pageProps: {
      rider: {
        riderId: number;
        name: string;
        history: ScrapedEvent[];
      };
    };
  };
}

export class EventScraperService {
  /**
   * Scrape events voor single rider
   * 
   * @param riderId - Zwift rider ID
   * @param days - Dagen terug (default: 90)
   * @returns Scraped event statistics
   */
  async scrapeRiderEvents(riderId: number, days: number = 90): Promise<{
    riderId: number;
    riderName: string;
    totalEvents: number;
    newEvents: number;
    newResults: number;
    dateRange: { from: Date; to: Date };
  }> {
    logger.info(`🕷️  Scrape events voor rider ${riderId} (laatste ${days} dagen)`);

    // 1. HTTP GET to ZwiftRacing.app
    const url = `https://www.zwiftracing.app/riders/${riderId}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    // 2. Extract JSON from <script id="__NEXT_DATA__">
    const html = response.data;
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    
    if (!match) {
      throw new Error('Could not find __NEXT_DATA__ in HTML');
    }

    const jsonData = JSON.parse(match[1]) as RiderPageData;
    const rider = jsonData.props.pageProps.rider;
    
    if (!rider || !rider.history) {
      throw new Error('Invalid rider data structure');
    }

    // 3. Filter events from last N days
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    const recentEvents = rider.history.filter(event => {
      const eventDate = new Date(event.event.time * 1000);
      return eventDate >= cutoffDate;
    });

    logger.info(`  ✅ ${recentEvents.length} events gevonden in afgelopen ${days} dagen`);

    // 4. Save to database
    const { newEvents, newResults } = await this.saveEventsToDatabase(
      riderId,
      rider.name,
      recentEvents
    );

    return {
      riderId,
      riderName: rider.name,
      totalEvents: recentEvents.length,
      newEvents,
      newResults,
      dateRange: {
        from: cutoffDate,
        to: now,
      },
    };
  }

  /**
   * Scrape events voor alle riders in database
   * 
   * @returns Overall statistics
   */
  async scrapeAllRiders(): Promise<{
    totalRiders: number;
    successful: number;
    failed: number;
    totalNewEvents: number;
    totalNewResults: number;
    errors: string[];
  }> {
    logger.info('🕷️  Scrape events voor alle riders');

    const riders = await prisma.rider.findMany({
      select: { zwiftId: true, name: true },
    });

    logger.info(`  📊 ${riders.length} riders gevonden in database`);

    const results = {
      totalRiders: riders.length,
      successful: 0,
      failed: 0,
      totalNewEvents: 0,
      totalNewResults: 0,
      errors: [] as string[],
    };

    for (const rider of riders) {
      try {
        const scrapeResult = await this.scrapeRiderEvents(rider.zwiftId, 90);
        results.successful++;
        results.totalNewEvents += scrapeResult.newEvents;
        results.totalNewResults += scrapeResult.newResults;

        // Rate limit: small delay between requests
        await this.delay(2000);
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Rider ${rider.zwiftId}: ${error.message}`);
        logger.error(`  ❌ Rider ${rider.zwiftId}: ${error.message}`);
      }
    }

    logger.info(`✅ Scraping voltooid: ${results.successful}/${results.totalRiders} successful`);

    return results;
  }

  /**
   * Save scraped events to database
   */
  private async saveEventsToDatabase(
    riderId: number,
    riderName: string,
    scrapedEvents: ScrapedEvent[]
  ): Promise<{ newEvents: number; newResults: number }> {
    let newEvents = 0;
    let newResults = 0;

    // Get rider from database
    const rider = await prisma.rider.findUnique({
      where: { zwiftId: riderId },
    });

    if (!rider) {
      throw new Error(`Rider ${riderId} not found in database`);
    }

    for (const scrapedEvent of scrapedEvents) {
      const eventId = parseInt(scrapedEvent.event.id);
      const eventDate = new Date(scrapedEvent.event.time * 1000);

      // Upsert event
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!existingEvent) {
        await prisma.event.create({
          data: {
            id: eventId,
            name: scrapedEvent.event.title,
            eventDate,
            eventType: scrapedEvent.event.type,
            distance: scrapedEvent.event.distance ? scrapedEvent.event.distance * 1000 : null,
            elevation: scrapedEvent.event.elevation,
            routeName: scrapedEvent.event.route?.name,
          },
        });
        newEvents++;
      }

      // Upsert race result
      const existingResult = await prisma.raceResult.findFirst({
        where: {
          riderId: rider.id,
          eventId,
        },
      });

      if (!existingResult) {
        await prisma.raceResult.create({
          data: {
            riderId: rider.id,
            eventId,
            position: scrapedEvent.position,
            positionCategory: scrapedEvent.positionInCategory,
            time: scrapedEvent.time,
          },
        });
        newResults++;
      }
    }

    logger.info(`  💾 ${newEvents} nieuwe events, ${newResults} nieuwe results opgeslagen`);

    return { newEvents, newResults };
  }

  /**
   * Get all scraped events
   */
  async getScrapedEvents(limit: number = 100): Promise<Array<{
    id: number;
    name: string;
    eventDate: Date;
    totalRiders: number;
  }>> {
    const events = await prisma.event.findMany({
      include: {
        _count: {
          select: { results: true },
        },
      },
      orderBy: { eventDate: 'desc' },
      take: limit,
    });

    return events.map(e => ({
      id: e.id,
      name: e.name,
      eventDate: e.eventDate,
      totalRiders: e._count.results,
    }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton
export const eventScraperService = new EventScraperService();
