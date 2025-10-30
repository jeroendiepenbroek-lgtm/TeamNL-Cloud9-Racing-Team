#!/usr/bin/env tsx
/**
 * Sync event 5129235 met correcte API response handling
 */
import axios from 'axios';
import { prisma } from '../src/database/client.js';
import { logger } from '../src/utils/logger.js';
import { z } from 'zod';
const EVENT_ID = 5129235;
const TARGET_RIDER_ZWIFT_ID = 150437;
const API_KEY = '650c6d2fc4ef6858d74cbef1';
const BASE_URL = 'https://zwift-ranking.herokuapp.com';
// Schema voor de daadwerkelijke API response
const ActualResultSchema = z.object({
    riderId: z.number(),
    name: z.string(),
    category: z.string(),
    time: z.number(),
    gap: z.number(),
    position: z.number(),
    positionInCategory: z.number(),
    rating: z.number(),
    ratingBefore: z.number(),
    ratingDelta: z.number(),
    ratingMax30: z.number(),
    ratingMax90: z.number(),
});
async function syncEvent5129235() {
    logger.info('╔════════════════════════════════════════════════════════════════╗');
    logger.info('║         SYNC EVENT 5129235 + RIDER 150437 RELATIE            ║');
    logger.info('╚════════════════════════════════════════════════════════════════╝\n');
    try {
        // Stap 1: Haal results op
        logger.info(`🔍 Ophalen results voor event ${EVENT_ID}..`);
        const response = await axios.get(`${BASE_URL}/public/results/${EVENT_ID}`, {
            headers: { 'Authorization': API_KEY },
            timeout: 30000,
        });
        if (!Array.isArray(response.data)) {
            throw new Error('Onverwacht response formaat');
        }
        logger.info(`✓ ${response.data.length} results ontvangen\n`);
        // Valideer results
        const validResults = response.data
            .map((r) => {
            try {
                return ActualResultSchema.parse(r);
            }
            catch {
                return null;
            }
        })
            .filter((r) => r !== null);
        logger.info(`✓ ${validResults.length} results gevalideerd\n`);
        // Stap 2: Maak event aan
        logger.info('📊 Event aanmaken...');
        const event = await prisma.event.upsert({
            where: { id: EVENT_ID },
            create: {
                id: EVENT_ID,
                name: `Event ${EVENT_ID}`,
                eventDate: new Date(), // Placeholder
            },
            update: {},
        });
        logger.info(`✓ Event ${event.id} in database\n`);
        // Stap 3: Verwerk results - alleen voor riders die al in DB zijn
        logger.info('💾 Results opslaan...');
        let saved = 0;
        let skipped = 0;
        for (const result of validResults) {
            // Zoek rider in database
            const rider = await prisma.rider.findUnique({
                where: { zwiftId: result.riderId },
            });
            if (!rider) {
                skipped++;
                continue;
            }
            // Sla result op
            await prisma.raceResult.upsert({
                where: {
                    unique_result: {
                        eventId: EVENT_ID,
                        riderId: rider.id,
                        source: 'zwiftranking',
                    },
                },
                create: {
                    eventId: EVENT_ID,
                    riderId: rider.id,
                    position: result.position,
                    positionCategory: result.positionInCategory,
                    category: result.category,
                    time: result.time,
                    timeGap: result.gap,
                    source: 'zwiftranking',
                    dataQuality: 'validated',
                },
                update: {
                    position: result.position,
                    positionCategory: result.positionInCategory,
                    category: result.category,
                    time: result.time,
                    timeGap: result.gap,
                },
            });
            saved++;
        }
        logger.info(`✓ ${saved} results opgeslagen`);
        logger.info(`  ${skipped} riders niet in database (skipped)\n`);
        // Stap 4: Haal rider 150437 result op
        logger.info('🎯 Rider 150437 relatie...\n');
        const targetResult = await prisma.raceResult.findFirst({
            where: {
                eventId: EVENT_ID,
                rider: { zwiftId: TARGET_RIDER_ZWIFT_ID },
            },
            include: {
                rider: true,
                event: true,
            },
        });
        if (targetResult) {
            logger.info('═'.repeat(64));
            logger.info('✅ RELATIE GEVONDEN!');
            logger.info('═'.repeat(64) + '\n');
            logger.info('EVENT:');
            logger.info(`  ID: ${targetResult.event.id}`);
            logger.info(`  Name: ${targetResult.event.name}\n`);
            logger.info('RIDER:');
            logger.info(`  Database ID: ${targetResult.rider.id}`);
            logger.info(`  Zwift ID: ${targetResult.rider.zwiftId}`);
            logger.info(`  Name: ${targetResult.rider.name}\n`);
            logger.info('RACE RESULT:');
            logger.info(`  Database ID: ${targetResult.id}`);
            logger.info(`  Position: ${targetResult.position}`);
            logger.info(`  Category Position: ${targetResult.positionCategory}`);
            logger.info(`  Category: ${targetResult.category}`);
            if (targetResult.time) {
                const min = Math.floor(targetResult.time / 60);
                const sec = (targetResult.time % 60).toFixed(2);
                logger.info(`  Time: ${min}:${sec.padStart(5, '0')}`);
            }
            if (targetResult.timeGap) {
                logger.info(`  Gap: +${targetResult.timeGap.toFixed(2)}s`);
            }
            logger.info('\n' + '═'.repeat(64));
            logger.info('DATABASE RELATIES:');
            logger.info('═'.repeat(64) + '\n');
            logger.info(`Event Table:`);
            logger.info(`  └─ id: ${targetResult.event.id} (PK)\n`);
            logger.info(`Rider Table:`);
            logger.info(`  └─ id: ${targetResult.rider.id} (PK)`);
            logger.info(`  └─ zwiftId: ${targetResult.rider.zwiftId} (UNIQUE)\n`);
            logger.info(`RaceResult Table:`);
            logger.info(`  └─ id: ${targetResult.id} (PK)`);
            logger.info(`  └─ eventId: ${targetResult.eventId} (FK → Event.id)`);
            logger.info(`  └─ riderId: ${targetResult.riderId} (FK → Rider.id)`);
            logger.info(`  └─ position: ${targetResult.position}`);
            logger.info(`  └─ source: ${targetResult.source}\n`);
            logger.info('═'.repeat(64) + '\n');
        }
        else {
            logger.warn('⚠️  Rider 150437 niet gevonden in database');
            logger.info('   Run eerst: npx tsx scripts/sync-test-riders.ts\n');
        }
        // Stap 5: Test query
        logger.info('🔍 Test SQL query (via Prisma):\n');
        const queryResult = await prisma.$queryRaw `
      SELECT 
        r.name as rider_name,
        r.zwiftId as rider_zwift_id,
        e.id as event_id,
        e.name as event_name,
        rr.position,
        rr.positionCategory,
        rr.category,
        rr.time
      FROM race_results rr
      JOIN riders r ON rr.riderId = r.id
      JOIN events e ON rr.eventId = e.id
      WHERE r.zwiftId = 150437 AND e.id = 5129235
    `;
        if (Array.isArray(queryResult) && queryResult.length > 0) {
            logger.info('Query result:');
            logger.info(JSON.stringify(queryResult[0], null, 2));
        }
        logger.info('\n✅ Sync compleet!\n');
    }
    catch (error) {
        if (error.response?.status === 429) {
            logger.error('❌ Rate limit - wacht en probeer opnieuw');
        }
        else {
            logger.error('❌ Fout:', error.message);
        }
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
syncEvent5129235();
//# sourceMappingURL=sync-event-5129235-final.js.map