#!/usr/bin/env tsx

/**
 * Backfill Rider Events Script
 * 
 * Scant backwards door event IDs om alle events te vinden waar een specifieke rider aan heeft deelgenomen.
 * Stopt automatisch na het vinden van het verwachte aantal events (gebaseerd op rider.totalRaces).
 * 
 * Usage:
 *   npm run backfill-rider-events <riderId> [maxEvents]
 *   
 * Example:
 *   npm run backfill-rider-events 150437 300
 */

import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { EventRepository, ResultRepository, RiderRepository } from '../src/database/repositories.js';
import { logger } from '../src/utils/logger.js';
import { config } from '../src/utils/config.js';

const apiClient = new ZwiftApiClient({
  baseUrl: config.zwiftApiBaseUrl,
  apiKey: config.zwiftApiKey,
});
const eventRepo = new EventRepository();
const resultRepo = new ResultRepository();
const riderRepo = new RiderRepository();

interface ScanProgress {
  riderId: number;
  eventsFound: number;
  eventsScanned: number;
  startEventId: number;
  currentEventId: number;
  expectedEvents: number;
  startTime: Date;
  errors: number;
}

async function backfillRiderEvents(riderId: number, maxEventsToScan: number = 500) {
  logger.info('🔍 Start event backfill', { riderId, maxEventsToScan });

  // Get rider info
  const rider = await riderRepo.getRider(riderId);
  if (!rider) {
    throw new Error(`Rider ${riderId} not found in database`);
  }

  const expectedEvents = rider.totalRaces || 25; // Fallback to 25 if unknown
  logger.info('📊 Rider info', {
    name: rider.name,
    totalRaces: rider.totalRaces,
    expectedEvents,
  });

  // Determine start event ID (scan backwards from recent events)
  const startEventId = 5000000; // Start from a high event ID (adjust if needed)
  
  const progress: ScanProgress = {
    riderId,
    eventsFound: 0,
    eventsScanned: 0,
    startEventId,
    currentEventId: startEventId,
    expectedEvents,
    startTime: new Date(),
    errors: 0,
  };

  logger.info('🎯 Scan configuration', {
    startEventId,
    expectedEvents,
    maxEventsToScan,
    strategy: 'backward scan',
  });

  // Scan backwards
  for (let i = 0; i < maxEventsToScan; i++) {
    const eventId = startEventId - i;
    progress.currentEventId = eventId;
    progress.eventsScanned++;

    try {
      // Fetch event results
      const results = await apiClient.getResults(eventId);
      
      // Check if rider participated
      const riderResult = results.find((r: any) => r.riderId === riderId);
      
      if (riderResult) {
        progress.eventsFound++;
        
        logger.info('✅ Event found', {
          eventId,
          position: riderResult.position,
          totalRiders: results.length,
          eventsFound: progress.eventsFound,
          expectedEvents,
        });

        // Save event using upsert
        await eventRepo.upsertEvent({
          id: eventId,
          name: `Event ${eventId}`, // Basic name, can be updated later
          eventDate: new Date(riderResult.eventDate || Date.now()),
          totalFinishers: results.length,
        });

        // Save result using upsert
        await resultRepo.upsertResult({
          eventId,
          riderId: riderResult.riderId,
          name: riderResult.name || `Rider ${riderId}`,
          position: riderResult.position || 0,
          category: riderResult.category,
          time: riderResult.time || 0,
          averagePower: riderResult.averagePower,
          averageWkg: riderResult.averageWkg,
        }, 'zwiftranking');

        // Stop if we found all expected events
        if (progress.eventsFound >= expectedEvents) {
          logger.info('🎉 All expected events found!', {
            eventsFound: progress.eventsFound,
            eventsScanned: progress.eventsScanned,
            scanEfficiency: `${((progress.eventsFound / progress.eventsScanned) * 100).toFixed(1)}%`,
          });
          break;
        }
      }

      // Progress update every 50 events
      if (progress.eventsScanned % 50 === 0) {
        const elapsed = (Date.now() - progress.startTime.getTime()) / 1000;
        const eventsPerSecond = progress.eventsScanned / elapsed;
        const remaining = expectedEvents - progress.eventsFound;
        const estimatedTimeRemaining = remaining > 0 ? (remaining / eventsPerSecond) / 60 : 0;

        logger.info('📈 Progress update', {
          eventsScanned: progress.eventsScanned,
          eventsFound: progress.eventsFound,
          progress: `${((progress.eventsFound / expectedEvents) * 100).toFixed(1)}%`,
          elapsed: `${elapsed.toFixed(0)}s`,
          estimatedRemaining: `${estimatedTimeRemaining.toFixed(1)} min`,
        });
      }

      // Rate limit: 1 request per minute (ZwiftRacing API limit)
      // In practice, axios-rate-limit handles this, but add extra safety
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between requests

    } catch (error: any) {
      progress.errors++;
      
      if (error.response?.status === 404) {
        // Event not found, continue scanning
        logger.debug('Event not found', { eventId });
      } else if (error.response?.status === 429) {
        // Rate limited
        logger.warn('⏳ Rate limited, waiting 60s...', { eventId });
        await new Promise(resolve => setTimeout(resolve, 60000));
      } else {
        logger.error('Error fetching event', { eventId, error: error.message });
      }

      // Stop if too many consecutive errors
      if (progress.errors > 10) {
        logger.error('❌ Too many errors, stopping scan', { errors: progress.errors });
        break;
      }
    }
  }

  // Final summary
  const duration = (Date.now() - progress.startTime.getTime()) / 1000;
  logger.info('🏁 Backfill complete', {
    eventsFound: progress.eventsFound,
    eventsScanned: progress.eventsScanned,
    expectedEvents,
    duration: `${duration.toFixed(0)}s`,
    scanEfficiency: `${((progress.eventsFound / progress.eventsScanned) * 100).toFixed(1)}%`,
    errors: progress.errors,
  });

  if (progress.eventsFound < expectedEvents) {
    logger.warn('⚠️ Not all events found', {
      found: progress.eventsFound,
      expected: expectedEvents,
      missing: expectedEvents - progress.eventsFound,
    });
  }

  return progress;
}

// CLI execution
const riderId = parseInt(process.argv[2]);
const maxEvents = parseInt(process.argv[3]) || 500;

if (!riderId || isNaN(riderId)) {
  console.error('Usage: npm run backfill-rider-events <riderId> [maxEvents]');
  console.error('Example: npm run backfill-rider-events 150437 300');
  process.exit(1);
}

backfillRiderEvents(riderId, maxEvents)
  .then((progress) => {
    logger.info('✅ Script completed successfully', { eventsFound: progress.eventsFound });
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Script failed', { error: error.message });
    process.exit(1);
  });
