#!/usr/bin/env tsx
/**
 * Find Recent Rider Events - Slimme event discovery voor specifieke rider
 * 
 * Scant recente event IDs (afgelopen 90 dagen) om events te vinden waar een rider heeft gereden.
 * Gebruikt slimme heuristieken om het zoekbereik te beperken.
 * 
 * Usage:
 *   npx tsx scripts/find-recent-rider-events.ts <zwiftId> [maxEvents]
 * 
 * Example:
 *   npx tsx scripts/find-recent-rider-events.ts 150437 200
 *   # Scant maximaal 200 recente events voor rider 150437
 * 
 * Strategie:
 * 1. Start bij hoogste bekende event ID
 * 2. Scan terug in tijd (dekrementeel)
 * 3. Stop na X events zonder match (assume rider niet meer actief in periode)
 * 4. Output: lijst van event IDs met rider participation
 */

import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { logger } from '../src/utils/logger.js';
import readline from 'readline';

interface FoundEvent {
  eventId: number;
  position: number;
  category: string;
  time: number;
  rating?: number;
  ratingDelta?: number;
}

// CLI argumenten
const zwiftId = parseInt(process.argv[2]);
const maxEventsToScan = parseInt(process.argv[3]) || 200; // Default: scan 200 events

if (!zwiftId || isNaN(zwiftId)) {
  logger.error('Usage: npx tsx scripts/find-recent-rider-events.ts <zwiftId> [maxEvents]');
  logger.error('Example: npx tsx scripts/find-recent-rider-events.ts 150437 200');
  process.exit(1);
}

// Configuratie
const RATE_LIMIT_DELAY = 61000; // 61 seconden (veilig binnen 1/min limit)
const MAX_EMPTY_STREAK = 50; // Stop na 50 events zonder match
const ESTIMATED_EVENT_ID_NOW = 5110000; // Schatting huidige event ID (oktober 2025)

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question + ' (y/n): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function findRecentEvents(): Promise<void> {
  logger.info('=== Find Recent Rider Events ===');
  logger.info(`Zoeken naar events voor Rider ID: ${zwiftId}`);
  logger.info(`Max events te scannen: ${maxEventsToScan}`);
  logger.info(`Start event ID: ${ESTIMATED_EVENT_ID_NOW} (schatting huidig)`);
  logger.info(`Stop criteria: ${MAX_EMPTY_STREAK} events zonder match`);
  logger.info('');

  const estimatedDuration = Math.ceil((maxEventsToScan * RATE_LIMIT_DELAY) / 60000);
  logger.warn(`⚠️  Dit kan tot ${estimatedDuration} minuten duren (rate limit: 1 call/min)`);
  logger.info('');

  const confirmed = await askConfirmation('Doorgaan met scan?');
  if (!confirmed) {
    logger.info('Scan geannuleerd');
    process.exit(0);
  }

  const apiClient = new ZwiftApiClient({
    apiKey: '',
    baseUrl: 'https://zwift-ranking.herokuapp.com/api',
  });
  const foundEvents: FoundEvent[] = [];
  let currentEventId = ESTIMATED_EVENT_ID_NOW;
  let eventsScanned = 0;
  let emptyStreak = 0;
  const startTime = Date.now();

  logger.info('\n🔍 Start scanning (van nieuw naar oud)...\n');

  while (eventsScanned < maxEventsToScan && emptyStreak < MAX_EMPTY_STREAK) {
    try {
      eventsScanned++;
      
      // Progress indicator
      if (eventsScanned % 10 === 0) {
        const elapsed = Math.floor((Date.now() - startTime) / 60000);
        logger.info(`📊 Progress: ${eventsScanned}/${maxEventsToScan} events | ${foundEvents.length} found | ${emptyStreak} empty streak | ${elapsed} min`);
      }

      // Haal event results op
      const results = await apiClient.getResults(currentEventId);

      // Zoek naar rider in results
      const riderResult = results.find((r: any) => r.riderId === zwiftId);

      if (riderResult) {
        // Match gevonden!
        emptyStreak = 0; // Reset streak
        
        const event: FoundEvent = {
          eventId: currentEventId,
          position: riderResult.position || 0,
          category: riderResult.category || 'Unknown',
          time: riderResult.time || 0,
          rating: riderResult.rating,
          ratingDelta: riderResult.ratingDelta,
        };

        foundEvents.push(event);

        logger.info(`✅ FOUND! Event ${currentEventId}:`);
        logger.info(`   Position: ${event.position} | Category: ${event.category} | Time: ${(event.time / 60).toFixed(1)} min`);
        if (event.rating && event.ratingDelta !== undefined) {
          logger.info(`   Rating: ${event.rating.toFixed(1)} (${event.ratingDelta > 0 ? '+' : ''}${event.ratingDelta.toFixed(1)})`);
        }
        logger.info('');
      } else {
        // Geen match
        emptyStreak++;
      }

      // Ga naar vorig event ID
      currentEventId--;

      // Rate limiting
      if (eventsScanned < maxEventsToScan && emptyStreak < MAX_EMPTY_STREAK) {
        await sleep(RATE_LIMIT_DELAY);
      }

    } catch (error: any) {
      if (error.statusCode === 404) {
        // Event bestaat niet, ga door
        currentEventId--;
        emptyStreak++;
      } else if (error.message?.includes('Rate limit')) {
        logger.warn('⚠️  Rate limit bereikt, wacht 2 minuten...');
        await sleep(120000);
      } else {
        logger.error(`Error bij event ${currentEventId}:`, error.message);
        currentEventId--;
        emptyStreak++;
      }
    }
  }

  // Samenvatting
  const totalDuration = Math.floor((Date.now() - startTime) / 60000);
  logger.info('\n' + '='.repeat(60));
  logger.info('✅ SCAN VOLTOOID');
  logger.info('='.repeat(60));
  logger.info(`Rider ID: ${zwiftId}`);
  logger.info(`Events gescand: ${eventsScanned}`);
  logger.info(`Events gevonden: ${foundEvents.length}`);
  logger.info(`Scan duur: ${totalDuration} minuten`);
  logger.info(`Reden stop: ${emptyStreak >= MAX_EMPTY_STREAK ? 'Empty streak limiet' : 'Max events bereikt'}`);

  if (foundEvents.length === 0) {
    logger.warn('\n⚠️  Geen events gevonden voor deze rider in de gescande range.');
    logger.info('Probeer:');
    logger.info('1. Verhoog maxEvents parameter');
    logger.info('2. Check of rider ID correct is');
    logger.info('3. Start bij lager event ID als rider langer niet geraced heeft');
    return;
  }

  // Output gevonden events
  logger.info('\n' + '='.repeat(60));
  logger.info('📋 GEVONDEN EVENTS');
  logger.info('='.repeat(60));
  
  foundEvents
    .sort((a, b) => b.eventId - a.eventId) // Sorteer nieuw naar oud
    .forEach((event, index) => {
      logger.info(`\n${index + 1}. Event ID: ${event.eventId}`);
      logger.info(`   Position: ${event.position} | Category: ${event.category}`);
      logger.info(`   Time: ${(event.time / 60).toFixed(1)} min`);
      if (event.rating && event.ratingDelta !== undefined) {
        logger.info(`   Rating: ${event.rating.toFixed(1)} (${event.ratingDelta > 0 ? '+' : ''}${event.ratingDelta.toFixed(1)})`);
      }
      logger.info(`   Sync: npx tsx scripts/sync-event-results.ts ${event.eventId}`);
    });

  // Bulk sync script
  logger.info('\n' + '='.repeat(60));
  logger.info('🚀 BULK SYNC COMMANDS');
  logger.info('='.repeat(60));
  logger.info('\nKopieer en plak dit om alle events te syncen:\n');
  
  const eventIds = foundEvents.map(e => e.eventId).sort((a, b) => a - b);
  logger.info('# Sync alle gevonden events (1 per minuut)');
  eventIds.forEach(id => {
    logger.info(`npx tsx scripts/sync-event-results.ts ${id} && sleep 61`);
  });

  logger.info('\n# Of als one-liner:');
  logger.info(`for id in ${eventIds.join(' ')}; do npx tsx scripts/sync-event-results.ts $id && sleep 61; done`);
  
  logger.info('\n✅ Event discovery voltooid!');
}

// Run script
findRecentEvents().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
