#!/usr/bin/env tsx
/**
 * Sync Recent Events for Rider 150437
 * Synct de laatste 5 nieuwe events (90-dagen periode)
 */

import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { logger } from '../src/utils/logger.js';
import { prisma } from '../src/database/client.js';
import { RiderRepository } from '../src/database/repositories.js';
import { config } from '../src/utils/config.js';

const TARGET_RIDER_ID = 150437;
const RATE_LIMIT_DELAY = 65000; // 65 seconds

// Laatste 5 events uit history (exclusief 5129235 die al bestaat)
const EVENT_IDS_TO_SYNC = [
  5149471, // Club Ladder // Swedish Zwift Racers P1 v TeamNL Cloud9 Lightning
  5127680, // Rebelz RL R1-5 | Fall into the Draft
  5128997, // Stage 1 - Zwift Unlocked - Race
  5135610, // Zwift Racing League: Coast Clash -  Open Aqua Division 2
  5088865, // Stage 5: Rolling With ENVE: Triple Twist
];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncRecentEvents() {
  const apiClient = new ZwiftApiClient({
    apiKey: config.zwiftApiKey,
    baseUrl: config.zwiftApiBaseUrl,
  });
  const riderRepo = new RiderRepository();

  logger.info('╔════════════════════════════════════════════════════════════════╗');
  logger.info('║       SYNC RECENT EVENTS FOR RIDER 150437 (90 days)           ║');
  logger.info('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Verify rider
    const rider = await riderRepo.getRider(TARGET_RIDER_ID);
    if (!rider) {
      logger.error(`❌ Rider ${TARGET_RIDER_ID} not found`);
      process.exit(1);
    }

    logger.info(`📋 Rider: ${rider.name}`);
    logger.info(`📅 Events to sync: ${EVENT_IDS_TO_SYNC.length}`);
    logger.warn(`⏳ Estimated time: ~${Math.ceil(EVENT_IDS_TO_SYNC.length * RATE_LIMIT_DELAY / 60000)} minutes\n`);

    const stats = {
      synced: 0,
      skipped: 0,
      failed: 0,
      riderResults: 0,
      totalResults: 0,
    };

    for (let i = 0; i < EVENT_IDS_TO_SYNC.length; i++) {
      const eventId = EVENT_IDS_TO_SYNC[i];
      logger.info(`\n[${i + 1}/${EVENT_IDS_TO_SYNC.length}] Processing event ${eventId}...`);

      // Check if exists
      const exists = await prisma.event.findUnique({ where: { id: eventId } });
      if (exists) {
        logger.info(`  ⏭️  Already synced, skipping`);
        stats.skipped++;
        continue;
      }

      try {
        // Rate limit
        if (i > 0 || stats.synced > 0) {
          logger.warn(`  ⏳ Waiting ${RATE_LIMIT_DELAY / 1000}s (rate limit)...`);
          await sleep(RATE_LIMIT_DELAY);
        }

        // Fetch results
        logger.info(`  📊 Fetching results from API...`);
        const results = await apiClient.getResults(eventId);
        logger.info(`  ✓ Fetched ${results.length} results`);

        // Create event
        const eventName = results[0]?.eventName || `Event ${eventId}`;
        const eventDate = results[0]?.eventDate ? new Date(results[0].eventDate) : new Date();
        
        await prisma.event.create({
          data: {
            id: eventId,
            name: eventName,
            eventDate: eventDate,
            distance: results[0]?.distance,
          },
        });
        logger.info(`  ✓ Event created: ${eventName}`);

        // Save results
        let saved = 0;
        let targetRiderFound = false;

        for (const result of results) {
          const dbRider = await riderRepo.getRider(result.riderId);
          if (dbRider) {
            await prisma.raceResult.create({
              data: {
                eventId: eventId,
                riderId: dbRider.id,
                position: result.position,
                category: result.category,
                time: result.time,
                averagePower: result.averagePower,
                averageWkg: result.averageWkg,
              },
            });
            saved++;
            
            if (result.riderId === TARGET_RIDER_ID) {
              targetRiderFound = true;
              stats.riderResults++;
              const timeStr = result.time ? `${Math.floor(result.time / 60)}:${(result.time % 60).toString().padStart(2, '0')}` : 'N/A';
              logger.info(`  🎯 Target rider: Position ${result.position} | Time ${timeStr} | ${result.averagePower || 'N/A'}W`);
            }
          }
        }

        stats.synced++;
        stats.totalResults += saved;
        logger.info(`  ✓ Saved ${saved}/${results.length} results ${targetRiderFound ? '✅' : '⚠️ (target not found)'}`);

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
    logger.info(`  Events failed: ${stats.failed}`);
    logger.info(`  Total results saved: ${stats.totalResults}`);
    logger.info(`  Results for rider ${TARGET_RIDER_ID}: ${stats.riderResults}\n`);

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

syncRecentEvents();
