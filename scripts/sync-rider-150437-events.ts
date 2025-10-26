#!/usr/bin/env tsx
/**
 * Sync All Events for Rider 150437
 * Haalt rider data op en synct alle events waar rider aan heeft deelgenomen
 */

import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { logger } from '../src/utils/logger.js';
import { prisma } from '../src/database/client.js';
import { RiderRepository } from '../src/database/repositories.js';
import { config } from '../src/utils/config.js';

const TARGET_RIDER_ID = 150437;
const RATE_LIMIT_DELAY = 65000; // 65 seconds tussen calls

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncRider150437Events() {
  const apiClient = new ZwiftApiClient({
    apiKey: config.zwiftApiKey,
    baseUrl: config.zwiftApiBaseUrl,
  });
  const riderRepo = new RiderRepository();

  logger.info('╔════════════════════════════════════════════════════════════════╗');
  logger.info('║          SYNC EVENTS FOR RIDER 150437                          ║');
  logger.info('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Verify rider exists in database
    logger.info(`📋 Step 1: Check rider ${TARGET_RIDER_ID} in database`);
    const rider = await riderRepo.getRider(TARGET_RIDER_ID);
    
    if (!rider) {
      logger.error(`❌ Rider ${TARGET_RIDER_ID} not found in database`);
      logger.info('💡 Run: npm run sync');
      process.exit(1);
    }

    logger.info(`✓ Rider: ${rider.name}`);
    logger.info(`  Category: ${rider.categoryRacing || 'N/A'}`);
    logger.info(`  FTP: ${rider.ftp || 'N/A'}W`);
    logger.info(`  Total Races: ${rider.totalRaces || 0}\n`);

    // Step 2: Get full rider data from API (includes race history in 'history' field)
    logger.info(`📊 Step 2: Fetch rider data from ZwiftRacing API`);
    logger.warn('⏳ Waiting 65 seconds (rate limit)...\n');
    await sleep(RATE_LIMIT_DELAY);

    const riderData = await apiClient.getRider(TARGET_RIDER_ID);
    logger.info(`✓ Rider data fetched: ${riderData.name}`);
    
    // Extract event IDs from history field
    const history = (riderData as any).history;
    if (!history || !Array.isArray(history) || history.length === 0) {
      logger.warn(`⚠️  No race history found in API response`);
      logger.info(`\n💡 Rider might not have participated in recent races`);
      process.exit(0);
    }

    logger.info(`✓ Found ${history.length} historical race records\n`);

    // Extract unique event IDs from history
    const eventIds = [...new Set(history.map((h: any) => h.eventId).filter((id: any) => id))];
    logger.info(`📅 Step 3: Extracted ${eventIds.length} unique event IDs`);
    logger.info(`  First 10 events: ${eventIds.slice(0, 10).join(', ')}\n`);

    // Step 4: Check which events already exist
    const existingEvents = await prisma.event.findMany({
      where: { id: { in: eventIds as number[] } },
      select: { id: true },
    });
    const existingEventIds = new Set(existingEvents.map(e => e.id));
    const newEventIds = eventIds.filter(id => !existingEventIds.has(id as number));

    logger.info(`📈 Database status:`);
    logger.info(`  Existing events: ${existingEventIds.size}`);
    logger.info(`  New events to sync: ${newEventIds.length}\n`);

    if (newEventIds.length === 0) {
      logger.info('✅ All events already synced!');
      
      // Show current data
      const resultsCount = await prisma.raceResult.count({
        where: { riderId: rider.id },
      });
      logger.info(`\n📊 Current data for ${rider.name}:`);
      logger.info(`  Events in database: ${existingEventIds.size}`);
      logger.info(`  Race results saved: ${resultsCount}\n`);
      
      await prisma.$disconnect();
      process.exit(0);
    }

    // Step 5: Sync each new event
    logger.info(`🔄 Step 4: Sync ${newEventIds.length} new events`);
    logger.warn(`⚠️  This will take ~${Math.ceil(newEventIds.length * RATE_LIMIT_DELAY / 60000)} minutes\n`);
    logger.info(`Press Ctrl+C to cancel, or wait to start...\n`);
    await sleep(3000);

    const syncResults = {
      success: 0,
      failed: 0,
      resultsForRider: 0,
      totalResults: 0,
    };

    for (let i = 0; i < newEventIds.length; i++) {
      const eventId = newEventIds[i] as number;
      const progress = `[${i + 1}/${newEventIds.length}]`;

      logger.info(`${progress} Syncing event ${eventId}...`);

      try {
        // Rate limit: wait before API call
        if (i > 0) {
          logger.debug(`⏳ Waiting ${RATE_LIMIT_DELAY / 1000}s (rate limit)...`);
          await sleep(RATE_LIMIT_DELAY);
        }

        // Fetch event results from API
        const results = await apiClient.getResults(eventId);
        logger.debug(`  ✓ Fetched ${results.length} results from API`);

        // Create event record
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

        // Save results - only for riders in database
        let savedCount = 0;
        let riderResultSaved = false;

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
            savedCount++;
            
            if (result.riderId === TARGET_RIDER_ID) {
              riderResultSaved = true;
              syncResults.resultsForRider++;
              logger.info(`  🎯 Result for ${rider.name}: Position ${result.position}, Time ${result.time ? Math.floor(result.time / 60) + ':' + (result.time % 60).toString().padStart(2, '0') : 'N/A'}`);
            }
          }
        }

        syncResults.success++;
        syncResults.totalResults += savedCount;
        
        logger.info(`  ✓ Saved ${savedCount}/${results.length} results ${riderResultSaved ? '(incl. target rider)' : ''}`);

      } catch (error: any) {
        syncResults.failed++;
        logger.error(`  ❌ Failed: ${error.message}`);
        continue;
      }
    }

    // Step 6: Summary
    logger.info('\n╔════════════════════════════════════════════════════════════════╗');
    logger.info('║                   SYNC SAMENVATTING                            ║');
    logger.info('╚════════════════════════════════════════════════════════════════╝\n');

    logger.info(`📊 Results:`);
    logger.info(`  Rider: ${rider.name} (${TARGET_RIDER_ID})`);
    logger.info(`  Events processed: ${newEventIds.length}`);
    logger.info(`  Successful: ${syncResults.success}`);
    logger.info(`  Failed: ${syncResults.failed}`);
    logger.info(`  Total results saved: ${syncResults.totalResults}`);
    logger.info(`  Results for target rider: ${syncResults.resultsForRider}\n`);

    // Final database stats
    const finalStats = {
      events: await prisma.event.count(),
      results: await prisma.raceResult.count(),
      riderResults: await prisma.raceResult.count({
        where: { riderId: rider.id },
      }),
    };

    logger.info(`📈 Final Database Status:`);
    logger.info(`  Total events: ${finalStats.events}`);
    logger.info(`  Total results: ${finalStats.results}`);
    logger.info(`  Results for ${rider.name}: ${finalStats.riderResults}\n`);

    logger.info('✅ Sync completed!');
    logger.info('\n💡 Test dashboard endpoints:');
    logger.info(`   GET /api/dashboard/rider-events/${TARGET_RIDER_ID}?days=90`);
    logger.info(`   GET /api/dashboard/club-results/${TARGET_RIDER_ID}\n`);

  } catch (error) {
    logger.error('❌ Sync failed', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run
syncRider150437Events();
