import axios from 'axios';
import prisma from '../database/client.js';
import { ZwiftApiClient } from '../api/zwift-client.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

/**
 * Rider Events Service
 * 
 * Haalt echte event data op voor riders via ZwiftRacing.app website scraping.
 * ZwiftRacing.app API heeft geen direct endpoint voor rider events, maar de 
 * website bevat deze data in de __NEXT_DATA__ script tag.
 */
export class RiderEventsService {
  private apiClient: ZwiftApiClient;

  constructor() {
    this.apiClient = new ZwiftApiClient({
      apiKey: config.zwiftApiKey,
      baseUrl: config.zwiftApiBaseUrl,
    });
  }

  /**
   * US1: Haal events op voor een rider (laatste 90 dagen)
   * 
   * Scrapet ZwiftRacing.app website voor event history en slaat deze op.
   * 
   * @param riderId - Zwift rider ID
   * @returns Event IDs en count
   */
  async fetchRiderEvents(riderId: number): Promise<{
    eventIds: string[];
    eventsCount: number;
    savedCount: number;
  }> {
    const startTime = Date.now();
    logger.info(`🔍 US1: Fetching events voor rider ${riderId} van ZwiftRacing.app`);

    try {
      // Haal HTML op van ZwiftRacing.app
      const response = await axios.get(`https://www.zwiftracing.app/riders/${riderId}`, {
        timeout: 30000,
      });

      // Extract __NEXT_DATA__ JSON
      const html = response.data;
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
      
      if (!match) {
        throw new Error('Kon __NEXT_DATA__ niet vinden in HTML');
      }

      const nextData = JSON.parse(match[1]);
      const rider = nextData.props?.pageProps?.rider;
      
      if (!rider) {
        throw new Error('Rider data niet gevonden in __NEXT_DATA__');
      }

      const history = rider.history || [];
      logger.info(`✓ ${history.length} events gevonden in rider history`);

      // Filter op laatste 90 dagen
      const now = Date.now() / 1000; // Unix timestamp in seconds
      const days90Ago = now - (90 * 24 * 60 * 60);
      
      const recentEvents = history.filter((item: any) => {
        const eventTime = item.event?.time || 0;
        return eventTime >= days90Ago;
      });

      logger.info(`✓ ${recentEvents.length} events binnen 90 dagen`);

      // Extract event IDs
      const eventIds = recentEvents.map((item: any) => item.event?.id).filter(Boolean);

      // Check welke rider dit betreft (of bestaat al)
      const dbRider = await prisma.rider.findUnique({
        where: { zwiftId: riderId },
      });

      if (!dbRider) {
        throw new Error(`Rider ${riderId} niet gevonden in database. Voer eerst rider sync uit.`);
      }

      // Sla events op in database
      let savedCount = 0;
      for (const item of recentEvents) {
        const event = item.event;
        if (!event || !event.id) continue;

        try {
          // Upsert event
          await prisma.event.upsert({
            where: { id: parseInt(event.id) },
            create: {
              id: parseInt(event.id),
              name: event.title || 'Unknown Event',
              eventType: event.type?.toLowerCase() || 'race',
              eventDate: new Date(event.time * 1000),
              routeName: event.route?.name,
              worldName: event.route?.world,
              distance: event.distance ? event.distance * 1000 : null, // km to meters
              elevation: event.elevation,
              dataSource: 'zwiftracing_scrape',
              fetchedAt: new Date(),
            },
            update: {
              name: event.title || 'Unknown Event',
              eventDate: new Date(event.time * 1000),
              routeName: event.route?.name,
              worldName: event.route?.world,
              distance: event.distance ? event.distance * 1000 : null,
              elevation: event.elevation,
              fetchedAt: new Date(),
            },
          });

          // Upsert race result voor deze rider
          await prisma.raceResult.upsert({
            where: {
              // Unieke combinatie van riderId en eventId
              id: `${dbRider.id}-${event.id}`,
            },
            create: {
              id: `${dbRider.id}-${event.id}`,
              eventId: parseInt(event.id),
              riderId: dbRider.id,
              riderType: 'favorite',
              position: item.position || null,
              category: item.category || null,
              averagePower: item.power || null,
              averageWkg: item.weightedPower || null,
              time: item.time || null,
              didFinish: true,
              source: 'zwiftracing_scrape',
            },
            update: {
              position: item.position || null,
              category: item.category || null,
              averagePower: item.power || null,
              averageWkg: item.weightedPower || null,
              time: item.time || null,
            },
          });

          savedCount++;
          logger.debug(`✓ Event ${event.id} opgeslagen: ${event.title}`);
        } catch (error) {
          logger.warn(`⚠️ Fout bij opslaan event ${event.id}`, error);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ US1: ${savedCount} events opgeslagen in ${duration}ms`);

      return {
        eventIds,
        eventsCount: recentEvents.length,
        savedCount,
      };
    } catch (error) {
      logger.error(`❌ US1: Fout bij ophalen events voor rider ${riderId}`, error);
      throw error;
    }
  }

  /**
   * US2: Scan voor nieuwe events (wordt aangeroepen door cron)
   * 
   * Checkt alle active riders voor nieuwe events.
   */
  async scanNewEventsForAllRiders(): Promise<{
    ridersScanned: number;
    newEventsFound: number;
    errors: number;
  }> {
    const startTime = Date.now();
    logger.info('🔄 US2: Start nieuwe events scan voor alle active riders');

    try {
      // Haal alle favorite riders op
      const riders = await prisma.rider.findMany({
        where: {
          isFavorite: true,
          isActive: true,
        },
        select: { id: true, zwiftId: true, name: true },
      });

      logger.info(`✓ ${riders.length} active riders gevonden`);

      let totalNewEvents = 0;
      let errorCount = 0;

      for (const rider of riders) {
        try {
          // Haal laatste known event op
          const lastEvent = await prisma.raceResult.findFirst({
            where: { riderId: rider.id },
            include: { event: true },
            orderBy: { event: { eventDate: 'desc' } },
          });

          const lastEventDate = lastEvent?.event?.eventDate;
          logger.debug(`Laatste event voor ${rider.name}: ${lastEventDate?.toISOString() || 'geen'}`);

          // Fetch events
          const result = await this.fetchRiderEvents(rider.zwiftId);
          
          // Count nieuwe events (events na laatste bekende datum)
          let newCount = result.savedCount;
          if (lastEventDate) {
            const newEvents = await prisma.raceResult.count({
              where: {
                riderId: rider.id,
                event: {
                  eventDate: { gt: lastEventDate },
                },
              },
            });
            newCount = newEvents;
          }

          totalNewEvents += newCount;
          logger.info(`✓ Rider ${rider.name}: ${newCount} nieuwe events`);

          // Rate limiting: wacht tussen riders
          await this.delay(3000);
        } catch (error) {
          errorCount++;
          logger.warn(`⚠️ Fout bij scannen rider ${rider.zwiftId}`, error);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ US2: Scan voltooid in ${duration}ms: ${totalNewEvents} nieuwe events gevonden`);

      return {
        ridersScanned: riders.length,
        newEventsFound: totalNewEvents,
        errors: errorCount,
      };
    } catch (error) {
      logger.error('❌ US2: Fout bij events scan', error);
      throw error;
    }
  }

  /**
   * US3: Verwijder events ouder dan 90 dagen
   * 
   * Cleanup van oude event data om database lean te houden.
   */
  async cleanupOldEvents(): Promise<{
    eventsDeleted: number;
    resultsDeleted: number;
    cutoffDate: string;
  }> {
    const startTime = Date.now();
    logger.info('🗑️  US3: Start cleanup van events >90 dagen');

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      logger.info(`Cutoff date: ${cutoffDate.toISOString()}`);

      // Count eerst voor logging
      const oldEventsCount = await prisma.event.count({
        where: {
          eventDate: { lt: cutoffDate },
          dataSource: 'zwiftracing_scrape', // Alleen gescrape events verwijderen
        },
      });

      logger.info(`✓ ${oldEventsCount} oude events gevonden`);

      // Delete race results eerst (foreign key constraint)
      const resultsDeleted = await prisma.raceResult.deleteMany({
        where: {
          event: {
            eventDate: { lt: cutoffDate },
            dataSource: 'zwiftracing_scrape',
          },
        },
      });

      // Delete events
      const eventsDeleted = await prisma.event.deleteMany({
        where: {
          eventDate: { lt: cutoffDate },
          dataSource: 'zwiftracing_scrape',
        },
      });

      const duration = Date.now() - startTime;
      logger.info(
        `✅ US3: Cleanup voltooid in ${duration}ms: ${eventsDeleted.count} events, ${resultsDeleted.count} results verwijderd`
      );

      return {
        eventsDeleted: eventsDeleted.count,
        resultsDeleted: resultsDeleted.count,
        cutoffDate: cutoffDate.toISOString(),
      };
    } catch (error) {
      logger.error('❌ US3: Fout bij cleanup', error);
      throw error;
    }
  }

  /**
   * Helper: delay functie
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default RiderEventsService;
