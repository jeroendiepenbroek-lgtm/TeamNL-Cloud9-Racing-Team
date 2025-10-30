#!/usr/bin/env tsx

/**
 * Scrape rider events from ZwiftRacing.app website
 * 
 * De website gebruikt Next.js Server-Side Props (SSP) en embed alle data
 * als JSON in een <script id="__NEXT_DATA__"> tag. Dit is veel sneller
 * dan de API endpoint backward scanning!
 * 
 * Usage:
 *   npx tsx scripts/scrape-rider-events.ts <riderId>
 * 
 * Example:
 *   npx tsx scripts/scrape-rider-events.ts 150437
 */

import axios from 'axios';
import { prisma } from '../src/database/client.js';
import { logger } from '../src/utils/logger.js';

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
  // ... en veel meer velden
}

interface RiderPageData {
  props: {
    pageProps: {
      rider: {
        riderId: number;
        name: string;
        history: ScrapedEvent[];
        // ... veel meer velden
      };
    };
  };
}

/**
 * Scrape rider data van ZwiftRacing.app website
 */
async function scrapeRiderEvents(riderId: number): Promise<ScrapedEvent[]> {
  logger.info(`🌐 Scrape rider ${riderId} van https://www.zwiftracing.app/riders/${riderId}`);
  
  const url = `https://www.zwiftracing.app/riders/${riderId}`;
  
  try {
    // Haal HTML pagina op
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TeamNL-Cloud9/1.0)',
      },
      timeout: 30000,
    });
    
    const html = response.data as string;
    
    // Extract JSON data uit <script id="__NEXT_DATA__"> tag
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    
    if (!match) {
      throw new Error('Kon __NEXT_DATA__ script tag niet vinden in HTML');
    }
    
    const jsonData = JSON.parse(match[1]) as RiderPageData;
    
    // Extract rider history (alle events)
    const riderData = jsonData.props.pageProps.rider;
    
    if (!riderData) {
      throw new Error(`Rider ${riderId} niet gevonden op ZwiftRacing.app`);
    }
    
    logger.info(`  ✅ Rider gevonden: ${riderData.name}`);
    logger.info(`  📅 ${riderData.history.length} events gevonden in history`);
    
    return riderData.history;
    
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
 * Save event IDs naar database (events + race_results tabellen)
 */
async function saveEventsToDatabase(riderId: number, scrapedEvents: ScrapedEvent[]) {
  logger.info(`\n💾 Save ${scrapedEvents.length} events naar database...`);
  
  // Haal rider op uit database
  const rider = await prisma.rider.findUnique({
    where: { zwiftId: riderId },
  });
  
  if (!rider) {
    throw new Error(`Rider ${riderId} niet gevonden in database. Run eerst 'npm run sync' om rider toe te voegen.`);
  }
  
  let eventsCreated = 0;
  let resultsCreated = 0;
  let eventsSkipped = 0;
  
  for (const scraped of scrapedEvents) {
    const eventId = parseInt(scraped.event.id);
    const eventDate = new Date(scraped.event.time * 1000);
    
    // Check of event al bestaat (gebruik id = eventId)
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
        },
      });
      eventsCreated++;
      logger.debug(`  + Event ${eventId}: ${scraped.event.title}`);
    } else {
      eventsSkipped++;
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
        },
      });
      resultsCreated++;
    }
  }
  
  logger.info(`  ✅ ${eventsCreated} nieuwe events toegevoegd`);
  logger.info(`  ⏭️  ${eventsSkipped} events al in database`);
  logger.info(`  ✅ ${resultsCreated} nieuwe race results toegevoegd`);
}

/**
 * Main script
 */
async function main() {
  const riderIdArg = process.argv[2];
  
  if (!riderIdArg) {
    console.error('❌ Usage: npx tsx scripts/scrape-rider-events.ts <riderId>');
    console.error('   Example: npx tsx scripts/scrape-rider-events.ts 150437');
    process.exit(1);
  }
  
  const riderId = parseInt(riderIdArg);
  
  if (isNaN(riderId)) {
    console.error(`❌ Ongeldige rider ID: ${riderIdArg}`);
    process.exit(1);
  }
  
  try {
    logger.info(`\n🚀 START: Scrape events voor rider ${riderId}\n`);
    
    // Scrape events van website
    const scrapedEvents = await scrapeRiderEvents(riderId);
    
    if (scrapedEvents.length === 0) {
      logger.warn('⚠️  Geen events gevonden voor deze rider');
      return;
    }
    
    // Save naar database
    await saveEventsToDatabase(riderId, scrapedEvents);
    
    // Summary
    logger.info(`\n✅ KLAAR!`);
    logger.info(`   Rider ${riderId} heeft nu ${scrapedEvents.length} events in de database`);
    logger.info(`\n💡 Volgende stap: run US6 om event data op te halen:`);
    logger.info(`   curl -X POST http://localhost:3000/api/source-data/collect/events/${riderId}`);
    
  } catch (error) {
    logger.error('❌ Fout tijdens scraping:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
