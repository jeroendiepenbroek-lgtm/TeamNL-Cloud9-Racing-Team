#!/usr/bin/env tsx
/**
 * Quick Bulk Event Sync
 *
 * Sync specifieke event IDs voor snelle data populatie
 */
import { prisma } from '../src/database/client.js';
import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { config } from '../src/utils/config.js';
import { logger } from '../src/utils/logger.js';
import { RiderRepository } from '../src/database/repositories.js';
// Voorbeeldlijst met event IDs (vervang met echte event IDs)
const EVENT_IDS = [
    5129235, // Already synced
    // Voeg hier meer event IDs toe
];
const RATE_LIMIT_DELAY = 60000; // 60s
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function bulkSyncEvents() {
    const apiClient = new ZwiftApiClient({
        apiKey: config.zwiftApiKey,
        baseUrl: config.zwiftApiBaseUrl,
    });
    const riderRepo = new RiderRepository();
    logger.info('╔════════════════════════════════════════════════════════════════╗');
    logger.info('║              BULK EVENT SYNC                                   ║');
    logger.info('╚════════════════════════════════════════════════════════════════╝\n');
    logger.info(`📋 Events to sync: ${EVENT_IDS.length}`);
    logger.warn(`⏳ Estimated time: ~${Math.ceil(EVENT_IDS.length)} minutes\n`);
    let synced = 0;
    let skipped = 0;
    let failed = 0;
    let totalResults = 0;
    try {
        for (let i = 0; i < EVENT_IDS.length; i++) {
            const eventId = EVENT_IDS[i];
            logger.info(`[${i + 1}/${EVENT_IDS.length}] Processing event ${eventId}...`);
            // Check if already exists
            const existing = await prisma.event.findUnique({ where: { id: eventId } });
            if (existing) {
                logger.info(`  ⏭️  Already synced, skipping`);
                skipped++;
                continue;
            }
            try {
                // Rate limit wait (except first)
                if (i > 0) {
                    logger.debug(`  ⏳ Waiting ${RATE_LIMIT_DELAY / 1000}s...`);
                    await sleep(RATE_LIMIT_DELAY);
                }
                // Fetch results
                const results = await apiClient.getResults(eventId);
                logger.debug(`  ✓ Fetched ${results.length} results from API`);
                // Create event
                await prisma.event.create({
                    data: {
                        id: eventId,
                        name: results[0]?.eventName || `Event ${eventId}`,
                        eventDate: results[0]?.eventDate ? new Date(results[0].eventDate) : new Date(),
                        distance: results[0]?.distance,
                    },
                });
                // Save results - only for riders in database
                let savedCount = 0;
                for (const result of results) {
                    const rider = await riderRepo.getRider(result.riderId);
                    if (rider) {
                        await prisma.raceResult.create({
                            data: {
                                eventId: eventId,
                                riderId: rider.id,
                                position: result.position,
                                category: result.category,
                                time: result.time,
                                averagePower: result.averagePower,
                                averageWkg: result.averageWkg,
                            },
                        });
                        savedCount++;
                    }
                }
                synced++;
                totalResults += savedCount;
                logger.info(`  ✓ Saved ${savedCount}/${results.length} results`);
            }
            catch (error) {
                failed++;
                logger.error(`  ❌ Failed: ${error.message}`);
            }
        }
        // Summary
        logger.info('\n╔════════════════════════════════════════════════════════════════╗');
        logger.info('║                   SAMENVATTING                                 ║');
        logger.info('╚════════════════════════════════════════════════════════════════╝\n');
        logger.info(`📊 Results:`);
        logger.info(`  Total events: ${EVENT_IDS.length}`);
        logger.info(`  Synced: ${synced}`);
        logger.info(`  Skipped (already existed): ${skipped}`);
        logger.info(`  Failed: ${failed}`);
        logger.info(`  Total race results: ${totalResults}\n`);
        const dbStats = {
            events: await prisma.event.count(),
            results: await prisma.raceResult.count(),
            riders: await prisma.rider.count(),
        };
        logger.info(`📈 Database Status:`);
        logger.info(`  Events: ${dbStats.events}`);
        logger.info(`  Race Results: ${dbStats.results}`);
        logger.info(`  Riders: ${dbStats.riders}\n`);
        logger.info('✅ Bulk sync completed!');
        logger.info('\n💡 Test dashboard:');
        logger.info(`   GET /api/dashboard/club-results/150437`);
        logger.info(`   GET /api/dashboard/rider-events/150437?days=90\n`);
    }
    catch (error) {
        logger.error('❌ Bulk sync failed', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
bulkSyncEvents();
//# sourceMappingURL=bulk-sync-events.js.map