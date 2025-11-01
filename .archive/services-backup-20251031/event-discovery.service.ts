/**
 * Event Discovery Service - Web Scraping van ZwiftRacing.app
 * 
 * US1: Scrape rider event history van website (90 dagen)
 * US8: Onboard nieuwe riders met complete event history
 * 
 * Architectuur:
 * 1. Scrape HTML van https://www.zwiftracing.app/riders/:riderId
 * 2. Parse embedded JSON data uit <script id="__NEXT_DATA__">
 * 3. Extract events van laatste 90 dagen
 * 4. Save event IDs + basic info naar database
 * 
 * Voordelen vs API backward scanning:
 * - Snelheid: 2 seconden vs 3+ uur
 * - Compleetheid: Alle events in 1 call
 * - Geen rate limit issues
 */

import axios from 'axios';
import { prisma } from '../database/client.js';
import { logger } from '../utils/logger.js';

/**
 * Scraped event data structure van ZwiftRacing.app
 */
interface ScrapedEvent {
  _id: string;
  event: {
    id: string;
    time: number;
    title: string;
    type: string;
    subType: string;
    distance: number;
    elevation: number;
    resultsFinalized: boolean;
    route: {
      routeId: string;
      world: string;
      name: string;
      profile: string;
    };
  };
  riderId: number;
  position: number;
  positionInCategory: number;
  time: number;
  rating?: number;
  ratingDelta?: number;
  didNotFinish?: boolean;
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

/**
 * Event Discovery Service
 * 
 * Responsible voor het ontdekken van nieuwe events via web scraping
 */
export class EventDiscoveryService {
  private readonly baseUrl = 'https://www.zwiftracing.app';
  
  /**
   * US1: Scrape rider events van website (laatste 90 dagen)
   * 
   * @param riderId - Zwift rider ID
   * @param days - Aantal dagen terug (default 90)
   * @returns Aantal nieuwe events gevonden
   */
  async scrapeRiderEvents(riderId: number, days: number = 90): Promise<{
    riderId: number;
    riderName: string;
    totalEvents: number;
    newEvents: number;
    newResults: number;
    dateRange: { from: Date; to: Date };
  }> {
    logger.info(`🌐 US1: Scrape events voor rider ${riderId} (laatste ${days} dagen)`);
    
    try {
      // 1. Haal HTML pagina op
      const url = `${this.baseUrl}/riders/${riderId}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TeamNL-Cloud9/1.0)',
        },
        timeout: 30000,
      });
      
      const html = response.data as string;
      
      // 2. Extract JSON data uit <script id="__NEXT_DATA__"> tag
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
      
      if (!match) {
        throw new Error('Kon __NEXT_DATA__ script tag niet vinden in HTML');
      }
      
      const jsonData = JSON.parse(match[1]) as RiderPageData;
      const riderData = jsonData.props.pageProps.rider;
      
      if (!riderData) {
        throw new Error(`Rider ${riderId} niet gevonden op ZwiftRacing.app`);
      }
      
      logger.info(`  ✅ Rider: ${riderData.name}`);
      logger.info(`  📅 ${riderData.history.length} events in complete history`);
      
      // 3. Filter events van laatste N dagen
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const recentEvents = riderData.history.filter(event => {
        const eventDate = new Date(event.event.time * 1000);
        return eventDate >= cutoffDate;
      });
      
      logger.info(`  🎯 ${recentEvents.length} events in laatste ${days} dagen`);
      
      // 4. Save events naar database
      const { newEvents, newResults } = await this.saveEventsToDatabase(
        riderId,
        riderData.name,
        recentEvents
      );
      
      const dateRange = {
        from: cutoffDate,
        to: new Date(),
      };
      
      return {
        riderId,
        riderName: riderData.name,
        totalEvents: recentEvents.length,
        newEvents,
        newResults,
        dateRange,
      };
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Rider ${riderId} bestaat niet op ZwiftRacing.app`);
        }
        throw new Error(`HTTP ${error.response?.status}: ${error.message}`);
      }
      throw error;
    }
  }
  
  /**
   * US8: Onboard nieuwe rider met complete event history
   * 
   * 1. Check of rider bestaat in database
   * 2. Scrape 90 dagen event history
   * 3. Return event IDs voor US2 (data enrichment)
   * 
   * @param riderId - Zwift rider ID
   * @returns Event IDs die nog geen brondatatabellen data hebben
   */
  async onboardNewRider(riderId: number): Promise<{
    riderId: number;
    riderName: string;
    eventsDiscovered: number;
    eventIdsNeedingData: number[];
  }> {
    logger.info(`\n🚀 US8: Onboard nieuwe rider ${riderId}`);
    
    // 1. Check of rider al bestaat
    let rider = await prisma.rider.findUnique({
      where: { zwiftId: riderId },
    });
    
    if (!rider) {
      logger.info(`  ➕ Rider ${riderId} nog niet in database, aanmaken...`);
      // Note: In productie zou je hier eerst rider data ophalen van API
      throw new Error(
        `Rider ${riderId} niet gevonden in database. ` +
        `Run eerst 'npm run sync' om rider toe te voegen via club sync.`
      );
    }
    
    logger.info(`  ✅ Rider bestaat: ${rider.name}`);
    
    // 2. Scrape 90 dagen event history
    const scrapeResult = await this.scrapeRiderEvents(riderId, 90);
    
    // 3. Bepaal welke events nog geen brondatatabellen data hebben
    const eventIds = await prisma.event.findMany({
      where: {
        results: {
          some: {
            riderId: rider.id,
          },
        },
      },
      select: { id: true },
    });
    
    // Check welke events missing data hebben
    const eventIdsNeedingData: number[] = [];
    
    for (const event of eventIds) {
      const hasResultsData = await prisma.eventResultsSourceData.findFirst({
        where: { eventId: event.id },
      });
      
      const hasZpData = await prisma.eventZpSourceData.findFirst({
        where: { eventId: event.id },
      });
      
      if (!hasResultsData || !hasZpData) {
        eventIdsNeedingData.push(event.id);
      }
    }
    
    logger.info(`  📊 ${eventIdsNeedingData.length} events need brondatatabellen data`);
    
    return {
      riderId,
      riderName: rider.name,
      eventsDiscovered: scrapeResult.totalEvents,
      eventIdsNeedingData,
    };
  }
  
  /**
   * Detect nieuwe events sinds laatste scrape
   * 
   * @param riderId - Zwift rider ID
   * @param sinceDate - Check events sinds deze datum
   * @returns Nieuwe event IDs
   */
  async detectNewEvents(riderId: number, sinceDate: Date): Promise<number[]> {
    logger.debug(`🔍 Detect nieuwe events voor rider ${riderId} sinds ${sinceDate.toISOString()}`);
    
    try {
      // Scrape huidige event list
      const url = `${this.baseUrl}/riders/${riderId}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TeamNL-Cloud9/1.0)',
        },
        timeout: 30000,
      });
      
      const html = response.data as string;
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
      
      if (!match) {
        throw new Error('Kon __NEXT_DATA__ niet parsen');
      }
      
      const jsonData = JSON.parse(match[1]) as RiderPageData;
      const riderData = jsonData.props.pageProps.rider;
      
      // Filter events sinds datum
      const newEvents = riderData.history.filter(event => {
        const eventDate = new Date(event.event.time * 1000);
        return eventDate >= sinceDate;
      });
      
      // Check welke events nieuw zijn (nog niet in database)
      const newEventIds: number[] = [];
      
      for (const event of newEvents) {
        const eventId = parseInt(event.event.id);
        const exists = await prisma.event.findUnique({
          where: { id: eventId },
        });
        
        if (!exists) {
          newEventIds.push(eventId);
        }
      }
      
      if (newEventIds.length > 0) {
        logger.info(`  ✨ ${newEventIds.length} nieuwe events gevonden voor rider ${riderId}`);
      }
      
      return newEventIds;
      
    } catch (error) {
      logger.error(`Fout bij detecteren nieuwe events voor rider ${riderId}:`, error);
      return [];
    }
  }
  
  /**
   * Private helper: Save scraped events naar database
   */
  private async saveEventsToDatabase(
    riderId: number,
    riderName: string,
    scrapedEvents: ScrapedEvent[]
  ): Promise<{ newEvents: number; newResults: number }> {
    logger.info(`  💾 Save ${scrapedEvents.length} events naar database...`);
    
    // Haal rider op uit database
    let rider = await prisma.rider.findUnique({
      where: { zwiftId: riderId },
    });
    
    if (!rider) {
      // Rider bestaat nog niet, maak aan met minimale data
      rider = await prisma.rider.create({
        data: {
          zwiftId: riderId,
          name: riderName,
          isFavorite: true,
          addedBy: 'scraper',
        },
      });
      logger.info(`  ➕ Nieuwe rider aangemaakt: ${riderName}`);
    }
    
    let newEvents = 0;
    let newResults = 0;
    
    for (const scraped of scrapedEvents) {
      const eventId = parseInt(scraped.event.id);
      const eventDate = new Date(scraped.event.time * 1000);
      
      // Check of event al bestaat
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId },
      });
      
      if (!existingEvent) {
        // Creëer nieuw event
        await prisma.event.create({
          data: {
            id: eventId,
            name: scraped.event.title,
            eventType: scraped.event.type,
            eventDate,
            routeName: scraped.event.route.name,
            distance: scraped.event.distance,
            elevation: scraped.event.elevation,
            worldName: scraped.event.route.world,
            dataSource: 'scraper', // Mark als scraped
          },
        });
        newEvents++;
      }
      
      // Check of race result al bestaat
      const existingResult = await prisma.raceResult.findFirst({
        where: {
          riderId: rider.id,
          eventId: eventId,
        },
      });
      
      if (!existingResult) {
        // Creëer race result
        await prisma.raceResult.create({
          data: {
            riderId: rider.id,
            eventId: eventId,
            riderType: 'favorite',
            position: scraped.position,
            positionCategory: scraped.positionInCategory,
            time: scraped.time,
            didFinish: !scraped.didNotFinish,
            source: 'scraper',
          },
        });
        newResults++;
      }
    }
    
    logger.info(`  ✅ ${newEvents} nieuwe events toegevoegd`);
    logger.info(`  ✅ ${newResults} nieuwe race results toegevoegd`);
    logger.info(`  ⏭️  ${scrapedEvents.length - newEvents} events al in database`);
    
    return { newEvents, newResults };
  }
}

// Singleton instance
export const eventDiscoveryService = new EventDiscoveryService();
