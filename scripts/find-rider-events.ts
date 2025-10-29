#!/usr/bin/env tsx
/**
 * Find Events for Rider - Event Discovery via Result Scanning
 * 
 * Scant event IDs om te zoeken naar een specifieke rider.
 * Gebruikt "recent events" range scanning strategie.
 * 
 * Usage: npx tsx scripts/find-rider-events.ts <zwiftId> [startEventId] [count]
 * Example: npx tsx scripts/find-rider-events.ts 150437 4879000 100
 */

import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { logger } from '../src/utils/logger.js';
import { config } from '../src/utils/config.js';

interface RiderEvent {
  eventId: number;
  position: number;
  category: string;
  time: number;
  rating?: number;
  ratingDelta?: number;
}

async function findRiderEvents(
  zwiftId: number,
  startEventId: number = 5200000, // Recent events (adjust based on current date)
  eventCount: number = 100
) {
  logger.info('='.repeat(70));
  logger.info(`🔍 ZOEK EVENTS VOOR RIDER | Zwift ID: ${zwiftId}`);
  logger.info('='.repeat(70));
  logger.info(`Scan Range: Event ${startEventId} → ${startEventId + eventCount}`);
  logger.info(`Rate Limit: 1 event per minuut = ~${Math.ceil(eventCount / 60)} uur\n`);

  const apiClient = new ZwiftApiClient({
    apiKey: config.zwiftApiKey,
    baseUrl: config.zwiftApiBaseUrl,
  });

  const foundEvents: RiderEvent[] = [];
  let scannedEvents = 0;
  let eventsWithData = 0;
  let emptyEvents = 0;

  for (let eventId = startEventId; eventId < startEventId + eventCount; eventId++) {
    try {
      scannedEvents++;
      
      // Log progress elke 10 events
      if (scannedEvents % 10 === 0) {
        logger.info(`📊 Progress: ${scannedEvents}/${eventCount} | Found: ${foundEvents.length} | Empty: ${emptyEvents}`);
      }

      // Haal event results op
      const results = await apiClient.getResults(eventId);
      
      if (results.length === 0) {
        emptyEvents++;
        logger.debug(`Event ${eventId}: No results (empty/future event)`);
        continue;
      }

      eventsWithData++;
      
      // Zoek rider in results
      const riderResult = results.find((r: any) => r.riderId === zwiftId);
      
      if (riderResult) {
        const event: RiderEvent = {
          eventId,
          position: riderResult.position || 0,
          category: riderResult.category || 'Unknown',
          time: riderResult.time || 0,
          rating: riderResult.rating,
          ratingDelta: riderResult.ratingDelta,
        };
        
        foundEvents.push(event);
        
        logger.info(`✅ FOUND! Event ${eventId}:`);
        logger.info(`   Position: ${event.position} | Category: ${event.category} | Time: ${(event.time / 60).toFixed(1)} min`);
        if (event.rating && event.ratingDelta !== undefined) {
          logger.info(`   Rating: ${event.rating.toFixed(1)} (${event.ratingDelta > 0 ? '+' : ''}${event.ratingDelta.toFixed(1)})`);
        }
      } else {
        logger.debug(`Event ${eventId}: ${results.length} results, rider not found`);
      }

      // Rate limit: wacht 60 seconden tussen calls
      if (scannedEvents < eventCount) {
        logger.debug(`⏳ Wacht 60s voor rate limit...`);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }

    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        logger.warn(`⚠️  Rate limit hit bij event ${eventId}, wacht 2 minuten...`);
        await new Promise(resolve => setTimeout(resolve, 120000));
        eventId--; // Retry this event
      } else {
        logger.debug(`Event ${eventId}: Error - ${error.message}`);
      }
    }
  }

  // Summary
  logger.info('\n' + '='.repeat(70));
  logger.info('✅ SCAN COMPLEET');
  logger.info('='.repeat(70));
  logger.info(`Rider Zwift ID: ${zwiftId}`);
  logger.info(`Event Range: ${startEventId} → ${startEventId + eventCount}`);
  logger.info(`Scanned Events: ${scannedEvents}`);
  logger.info(`Events with Data: ${eventsWithData}`);
  logger.info(`Empty Events: ${emptyEvents}`);
  logger.info(`\n🏁 EVENTS GEVONDEN: ${foundEvents.length}\n`);

  if (foundEvents.length > 0) {
    logger.info('📋 Event Details:');
    foundEvents.forEach((event, index) => {
      logger.info(`\n${index + 1}. Event ID: ${event.eventId}`);
      logger.info(`   Position: ${event.position} | Category: ${event.category}`);
      logger.info(`   Time: ${(event.time / 60).toFixed(1)} min`);
      if (event.rating && event.ratingDelta !== undefined) {
        logger.info(`   Rating: ${event.rating.toFixed(1)} (${event.ratingDelta > 0 ? '+' : ''}${event.ratingDelta.toFixed(1)})`);
      }
      logger.info(`   Sync: npx tsx scripts/sync-event-results.ts ${event.eventId}`);
    });

    // Output for automation
    logger.info('\n📄 Event IDs (for bulk sync):');
    const eventIds = foundEvents.map(e => e.eventId).join(' ');
    logger.info(eventIds);

    logger.info('\n💾 Bulk Sync Command:');
    logger.info(`for id in ${eventIds}; do`);
    logger.info(`  npx tsx scripts/sync-event-results.ts $id`);
    logger.info(`  sleep 60`);
    logger.info(`done`);
  }

  logger.info('='.repeat(70));

  return foundEvents;
}

// ============================================
// CLI Execution
// ============================================
const zwiftId = process.argv[2] ? parseInt(process.argv[2]) : null;
const startEventId = process.argv[3] ? parseInt(process.argv[3]) : 5200000;
const eventCount = process.argv[4] ? parseInt(process.argv[4]) : 100;

if (!zwiftId || isNaN(zwiftId)) {
  logger.error('❌ Ongeldig of geen Zwift ID opgegeven!');
  logger.info('');
  logger.info('Usage: npx tsx scripts/find-rider-events.ts <zwiftId> [startEventId] [count]');
  logger.info('Example: npx tsx scripts/find-rider-events.ts 150437 5200000 50');
  logger.info('');
  logger.info('⚠️  WARNING: Dit script duurt lang vanwege rate limits!');
  logger.info('   50 events = ~50 minuten');
  logger.info('   100 events = ~100 minuten');
  logger.info('');
  logger.info('💡 TIP: Start met kleine range (10-20 events) om te testen');
  logger.info('   Recent events hebben vaak hogere IDs (~5.2M+)');
  process.exit(1);
}

logger.warn('\n⚠️  WAARSCHUWING:');
logger.warn(`Dit script zal ${eventCount} events scannen met 1 min tussen elke call.`);
logger.warn(`Geschatte tijd: ~${Math.ceil(eventCount / 60)} uur`);
logger.warn('');

// Ask for confirmation
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

readline.question('Doorgaan? (yes/no): ', (answer: string) => {
  readline.close();
  
  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    logger.info('Geannuleerd.');
    process.exit(0);
  }

  findRiderEvents(zwiftId, startEventId, eventCount)
    .then((events) => {
      logger.info(`\n✅ Script voltooid - ${events.length} events gevonden`);
      process.exit(0);
    })
    .catch((error) => {
      logger.error('\n❌ Script gefaald', error);
      process.exit(1);
    });
});
