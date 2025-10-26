#!/usr/bin/env tsx
/**
 * Sync All Events for a Rider
 * 
 * Haalt alle recente events op van een specifieke rider via ZwiftRacing.app API
 * en synchroniseert de resultaten naar de database.
 */

import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { logger } from '../src/utils/logger.js';
import { prisma } from '../src/database/client.js';
import { RiderRepository } from '../src/database/repositories.js';
import { config } from '../src/utils/config.js';

// Configuration
const TARGET_RIDER_ID = 150437; // JRøne | CloudRacer-9
const RATE_LIMIT_DELAY = 60000; // 60 seconds between API calls

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncRiderEvents() {
  const apiClient = new ZwiftApiClient({
    apiKey: config.zwiftApiKey,
    baseUrl: config.zwiftApiBaseUrl,
  });
  const riderRepo = new RiderRepository();

  logger.info('╔════════════════════════════════════════════════════════════════╗');
  logger.info('║              SYNC RIDER EVENTS                                 ║');
  logger.info('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Get rider info
    logger.info(`📋 Step 1: Get rider ${TARGET_RIDER_ID} info`);
    const rider = await riderRepo.getRider(TARGET_RIDER_ID);
    
    if (!rider) {
      logger.error(`❌ Rider ${TARGET_RIDER_ID} not found in database`);
      logger.info('💡 Sync club members first: npm run sync');
      process.exit(1);
    }

    logger.info(`✓ Rider: ${rider.name}`);
    logger.info(`  Category: ${rider.categoryRacing}`);
    logger.info(`  Total Races: ${rider.totalRaces}\n`);

    // Step 2: Get rider's race history from API
    logger.info(`📊 Step 2: Fetch race history from ZwiftRacing.app`);
    logger.warn('⏳ Waiting 60 seconds (rate limit)...');
    await sleep(RATE_LIMIT_DELAY);

    const riderData = await apiClient.getRider(TARGET_RIDER_ID);
    
    if (!riderData.results || riderData.results.length === 0) {
      logger.warn(`⚠️  No race results found for rider ${TARGET_RIDER_ID}`);
      process.exit(0);
    }

    logger.info(`✓ Found ${riderData.results.length} race results\n`);

    // Step 3: Extract unique event IDs
    const eventIds: number[] = [...new Set(riderData.results.map((r: any) => r.eventId as number))];
    logger.info(`📅 Step 3: Found ${eventIds.length} unique events`);
    logger.info(`  Event IDs: ${eventIds.slice(0, 5).join(', ')}${eventIds.length > 5 ? '...' : ''}\n`);

    // Step 4: Check which events already exist
    const existingEvents = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true },
    });
    const existingEventIds = new Set(existingEvents.map(e => e.id));
    const newEventIds: number[] = eventIds.filter(id => !existingEventIds.has(id));

    logger.info(`📈 Database status:`);
    logger.info(`  Existing events: ${existingEventIds.size}`);
    logger.info(`  New events to sync: ${newEventIds.length}\n`);

    if (newEventIds.length === 0) {
      logger.info('✅ All events already synced!');
      process.exit(0);
    }

    // Step 5: Sync each new event
    logger.info(`🔄 Step 4: Sync ${newEventIds.length} events`);
    logger.warn(`⚠️  This will take ~${Math.ceil(newEventIds.length * RATE_LIMIT_DELAY / 60000)} minutes (rate limit)\n`);

    const syncResults = {
      success: 0,
      failed: 0,
      results: 0,
    };

    for (let i = 0; i < newEventIds.length; i++) {
      const eventId = newEventIds[i];
      const progress = `[${i + 1}/${newEventIds.length}]`;

      logger.info(`${progress} Syncing event ${eventId}...`);

      try {
        // Rate limit: wait before each API call (except first)
        if (i > 0) {
          logger.debug(`⏳ Waiting ${RATE_LIMIT_DELAY / 1000}s (rate limit)...`);
          await sleep(RATE_LIMIT_DELAY);
        }

        // Get event results from API
        const eventResults = await apiClient.getResults(eventId);
        
        // Create or update event record
        await prisma.event.upsert({
          where: { id: eventId },
          create: {
            id: eventId,
            name: `Event ${eventId}`,
          },
          update: {
            updatedAt: new Date(),
          },
        });

        // Save race results - only for riders that exist in our database
        let savedCount = 0;
        for (const result of eventResults) {
          const riderInDb = await riderRepo.getRider(result.riderId);
          if (riderInDb) {
            await prisma.raceResult.upsert({
              where: {
                eventId_riderId: {
                  eventId: eventId,
                  riderId: riderInDb.id,
                },
              },
              create: {
                eventId: eventId,
                riderId: riderInDb.id,
                position: result.position,
                positionCategory: result.positionCategory,
                category: result.category,
                time: result.time,
                timeGap: result.timeGap,
                averagePower: result.averagePower,
                averageWkg: result.averageWkg,
              },
              update: {
                position: result.position,
                positionCategory: result.positionCategory,
                category: result.category,
                time: result.time,
                timeGap: result.timeGap,
                averagePower: result.averagePower,
                averageWkg: result.averageWkg,
                updatedAt: new Date(),
              },
            });
            savedCount++;
          }
        }
        
        syncResults.success++;
        syncResults.results += savedCount;
        
        logger.info(`  ✓ Synced ${savedCount}/${eventResults.length} results (only existing riders)`);
      } catch (error: any) {
        syncResults.failed++;
        logger.error(`  ❌ Failed: ${error.message}`);
        
        // Continue with next event despite errors
        continue;
      }
    }

    // Step 6: Summary
    logger.info('\n╔════════════════════════════════════════════════════════════════╗');
    logger.info('║                   SYNC SAMENVATTING                            ║');
    logger.info('╚════════════════════════════════════════════════════════════════╝\n');

    logger.info(`📊 Results:`);
    logger.info(`  Rider: ${rider.name} (${TARGET_RIDER_ID})`);
    logger.info(`  Total events processed: ${newEventIds.length}`);
    logger.info(`  Successful: ${syncResults.success}`);
    logger.info(`  Failed: ${syncResults.failed}`);
    logger.info(`  Total results synced: ${syncResults.results}\n`);

    // Final database stats
    const finalStats = {
      events: await prisma.event.count(),
      results: await prisma.raceResult.count(),
      riderResults: await prisma.raceResult.count({
        where: { riderId: rider.id },
      }),
    };

    logger.info(`📈 Database Status:`);
    logger.info(`  Total events: ${finalStats.events}`);
    logger.info(`  Total results: ${finalStats.results}`);
    logger.info(`  Results for ${rider.name}: ${finalStats.riderResults}\n`);

    logger.info('✅ Sync completed!');
    logger.info('\n💡 Test dashboard:');
    logger.info(`   GET /api/dashboard/rider-events/${TARGET_RIDER_ID}?days=90`);
    logger.info(`   GET /api/dashboard/club-results/${TARGET_RIDER_ID}\n`);

  } catch (error) {
    logger.error('❌ Sync gefaald', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run
syncRiderEvents();
