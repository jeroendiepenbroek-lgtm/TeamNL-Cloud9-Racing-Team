#!/usr/bin/env tsx
/**
 * Sync Rider Events from History
 * 
 * Gebruikt de rider history endpoint die ALLE event details bevat
 * inclusief de rider's eigen resultaten.
 */

import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { logger } from '../src/utils/logger.js';
import { prisma } from '../src/database/client.js';
import { RiderRepository } from '../src/database/repositories.js';
import { config } from '../src/utils/config.js';

const TARGET_RIDER_ID = 150437;
const MAX_EVENTS = 10; // Laatste 10 events

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncFromRiderHistory() {
  const apiClient = new ZwiftApiClient({
    apiKey: config.zwiftApiKey,
    baseUrl: config.zwiftApiBaseUrl,
  });
  const riderRepo = new RiderRepository();

  logger.info('╔════════════════════════════════════════════════════════════════╗');
  logger.info('║      SYNC EVENTS FROM RIDER HISTORY (Better Approach)         ║');
  logger.info('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Verify rider in database
    const rider = await riderRepo.getRider(TARGET_RIDER_ID);
    if (!rider) {
      logger.error(`❌ Rider ${TARGET_RIDER_ID} not found in database`);
      process.exit(1);
    }

    logger.info(`📋 Rider: ${rider.name}`);
    logger.info(`   Category: ${rider.categoryRacing}`);
    logger.info(`   Club: TeamNL Cloud9 Racing\n`);

    // Step 2: Get rider data with history (direct axios call to bypass schema validation)
    logger.info(`📊 Fetching rider history from ZwiftRacing API...`);
    logger.warn(`⏳ Waiting 5 seconds (rate limit)...\n`);
    await sleep(5000);

    // Direct API call om alle data inclusief history te krijgen
    const axios = (await import('axios')).default;
    const response = await axios.get(
      `https://zwift-ranking.herokuapp.com/api/riders/${TARGET_RIDER_ID}`,
      {
        headers: {
          'Authorization': config.zwiftApiKey,
        },
      }
    );

    const riderData = response.data;
    const history = riderData.history;

    if (!history || !Array.isArray(history) || history.length === 0) {
      logger.warn(`⚠️  No history found`);
      process.exit(0);
    }

    logger.info(`✓ Found ${history.length} races in history`);
    logger.info(`  Syncing last ${MAX_EVENTS} events\n`);

    // Step 3: Process history entries (most recent first)
    const eventsToSync = history.slice(0, MAX_EVENTS);
    
    const stats = {
      synced: 0,
      skipped: 0,
      failed: 0,
    };

    for (let i = 0; i < eventsToSync.length; i++) {
      const historyEntry = eventsToSync[i];
      const event = historyEntry.event;
      const eventId = parseInt(event.id);

      logger.info(`\n[${i + 1}/${eventsToSync.length}] Processing Event ${eventId}`);
      logger.info(`  "${event.title}"`);

      try {
        // Check if result already exists
        const existingResult = await prisma.raceResult.findFirst({
          where: {
            eventId: eventId,
            riderId: rider.id,
          },
        });

        if (existingResult) {
          logger.info(`  ⏭️  Already synced with result`);
          stats.skipped++;
          continue;
        }

        // Create or update event
        const eventDate = new Date(event.time * 1000);
        
        await prisma.event.upsert({
          where: { id: eventId },
          create: {
            id: eventId,
            name: event.title,
            eventDate: eventDate,
            eventType: event.type,
            routeName: event.route?.name,
            worldName: event.route?.world,
            distance: event.distance,
            elevation: event.elevation,
          },
          update: {
            name: event.title,
            eventDate: eventDate,
            eventType: event.type,
            routeName: event.route?.name,
            worldName: event.route?.world,
            distance: event.distance,
            elevation: event.elevation,
            updatedAt: new Date(),
          },
        });

        logger.info(`  ✓ Event: ${event.title}`);
        logger.info(`    Date: ${eventDate.toISOString().split('T')[0]}`);
        logger.info(`    Route: ${event.route?.name || 'N/A'} (${event.route?.world || 'N/A'})`);
        logger.info(`    Distance: ${event.distance}km, Elevation: ${event.elevation}m`);

        // Create race result from history entry
        await prisma.raceResult.create({
          data: {
            eventId: eventId,
            riderId: rider.id,
            position: historyEntry.position,
            positionCategory: historyEntry.positionInCategory,
            category: historyEntry.category,
            time: Math.floor(historyEntry.time),
            timeGap: historyEntry.gap,
            distance: historyEntry.distance,
            averagePower: Math.floor(historyEntry.np || historyEntry.wkg1200 * rider.weight!),
            averageWkg: historyEntry.wkg1200,
            normalizedPower: historyEntry.np,
            averageHeartRate: historyEntry.heartRate?.avg,
            maxHeartRate: historyEntry.heartRate?.max,
            didFinish: true,
          },
        });

        const timeStr = `${Math.floor(historyEntry.time / 60)}:${(Math.floor(historyEntry.time) % 60).toString().padStart(2, '0')}`;
        logger.info(`  🎯 Result saved:`);
        logger.info(`    Position: ${historyEntry.position} overall, ${historyEntry.positionInCategory} in Cat ${historyEntry.category}`);
        logger.info(`    Time: ${timeStr} (+${Math.floor(historyEntry.gap)}s gap)`);
        logger.info(`    Power: ${Math.floor(historyEntry.np || 0)}W (${historyEntry.wkg1200?.toFixed(2)}W/kg)`);
        logger.info(`    HR: ${historyEntry.heartRate?.avg || 'N/A'} avg, ${historyEntry.heartRate?.max || 'N/A'} max`);

        stats.synced++;

      } catch (error: any) {
        stats.failed++;
        logger.error(`  ❌ Failed: ${error.message}`);
      }
    }

    // Summary
    logger.info('\n╔════════════════════════════════════════════════════════════════╗');
    logger.info('║                   SYNC SAMENVATTING                            ║');
    logger.info('╚════════════════════════════════════════════════════════════════╝\n');

    logger.info(`📊 Sync Results:`);
    logger.info(`  Events synced: ${stats.synced}`);
    logger.info(`  Events skipped: ${stats.skipped}`);
    logger.info(`  Events failed: ${stats.failed}\n`);

    // Database stats
    const dbStats = {
      totalEvents: await prisma.event.count(),
      totalResults: await prisma.raceResult.count(),
      riderResults: await prisma.raceResult.count({
        where: { riderId: rider.id },
      }),
    };

    logger.info(`📈 Database Status:`);
    logger.info(`  Total events: ${dbStats.totalEvents}`);
    logger.info(`  Total results: ${dbStats.totalResults}`);
    logger.info(`  Results for ${rider.name}: ${dbStats.riderResults}\n`);

    logger.info('✅ Sync completed!');
    logger.info('\n💡 Test dashboard:');
    logger.info(`   npx tsx scripts/test-dashboard.ts`);
    logger.info(`   GET /api/dashboard/rider-events/${TARGET_RIDER_ID}?days=90\n`);

  } catch (error) {
    logger.error('❌ Sync failed', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncFromRiderHistory();
