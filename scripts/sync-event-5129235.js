#!/usr/bin/env tsx
/**
 * Direct event data ophalen en opslaan voor event 5129235
 * Bypassed rate limiter voor één-malige sync
 */
import axios from 'axios';
import { prisma } from '../src/database/client.js';
import { logger } from '../src/utils/logger.js';
import { RaceResultSchema } from '../src/types/api.types.js';
const EVENT_ID = 5129235;
const TARGET_RIDER_ZWIFT_ID = 150437;
const API_KEY = '650c6d2fc4ef6858d74cbef1';
const BASE_URL = 'https://zwift-ranking.herokuapp.com';
async function syncEventDirect() {
    logger.info('╔════════════════════════════════════════════════════════════════╗');
    logger.info('║         DIRECT EVENT SYNC - Event 5129235                     ║');
    logger.info('╚════════════════════════════════════════════════════════════════╝\n');
    try {
        // Stap 1: Haal event results op van API (direct, zonder rate limiter)
        logger.info(`🔍 Ophalen results voor event ${EVENT_ID}...`);
        const response = await axios.get(`${BASE_URL}/public/results/${EVENT_ID}`, {
            headers: { 'Authorization': API_KEY },
            timeout: 30000,
        });
        if (!Array.isArray(response.data)) {
            throw new Error('Onverwacht response formaat');
        }
        logger.info(`✓ ${response.data.length} results ontvangen van API\n`);
        // Stap 2: Valideer en verwerk data
        const validResults = response.data.map((result, index) => {
            try {
                return RaceResultSchema.parse(result);
            }
            catch (error) {
                logger.warn(`Validatie fout voor result ${index}:`, error);
                return null;
            }
        }).filter((r) => r !== null);
        logger.info(`✓ ${validResults.length} results gevalideerd\n`);
        // Stap 3: Check of event al bestaat, zo niet maak aan
        logger.info('📊 Event data verwerken...');
        // Eerste result om event info te krijgen
        const firstResult = validResults[0];
        if (!firstResult) {
            logger.error('Geen geldige results gevonden');
            return;
        }
        // Maak of update event
        const event = await prisma.event.upsert({
            where: { id: EVENT_ID },
            create: {
                id: EVENT_ID,
                name: firstResult.eventName || `Event ${EVENT_ID}`,
                eventDate: firstResult.eventDate ? new Date(firstResult.eventDate * 1000) : new Date(),
                routeName: firstResult.routeName,
                distance: firstResult.distance,
                elevationGain: firstResult.elevationGain,
                laps: firstResult.laps,
            },
            update: {
                name: firstResult.eventName || `Event ${EVENT_ID}`,
                eventDate: firstResult.eventDate ? new Date(firstResult.eventDate * 1000) : new Date(),
                routeName: firstResult.routeName,
                distance: firstResult.distance,
                elevationGain: firstResult.elevationGain,
                laps: firstResult.laps,
            },
        });
        logger.info(`✓ Event opgeslagen: ${event.name}`);
        logger.info(`  Route: ${event.routeName || 'N/A'}`);
        logger.info(`  Datum: ${event.eventDate?.toISOString().split('T')[0] || 'N/A'}`);
        logger.info(`  Distance: ${event.distance || 'N/A'} km\n`);
        // Stap 4: Sla alle results op
        logger.info('💾 Results opslaan in database...');
        let created = 0;
        let updated = 0;
        let errors = 0;
        for (const result of validResults) {
            try {
                // Zoek rider in database via zwiftId
                const rider = await prisma.rider.findUnique({
                    where: { zwiftId: result.riderId },
                });
                if (!rider) {
                    logger.debug(`Rider ${result.riderId} niet in database, skip result`);
                    errors++;
                    continue;
                }
                // Upsert result
                const saved = await prisma.raceResult.upsert({
                    where: {
                        eventId_riderId_source: {
                            eventId: EVENT_ID,
                            riderId: rider.id,
                            source: 'zwiftranking',
                        },
                    },
                    create: {
                        eventId: EVENT_ID,
                        riderId: rider.id,
                        position: result.position,
                        positionCategory: result.positionCategory,
                        category: result.category,
                        time: result.time,
                        timeGap: result.timeGap,
                        distance: result.distance,
                        averagePower: result.averagePower,
                        normalizedPower: result.normalizedPower,
                        maxPower: result.maxPower,
                        averageWkg: result.averageWkg,
                        zPower: result.zPower,
                        averageHeartRate: result.averageHeartRate,
                        maxHeartRate: result.maxHeartRate,
                        averageCadence: result.averageCadence,
                        maxCadence: result.maxCadence,
                        averageSpeed: result.averageSpeed,
                        maxSpeed: result.maxSpeed,
                        points: result.points,
                        primePoints: result.primePoints,
                        didFinish: result.didFinish ?? true,
                        didNotStart: result.didNotStart ?? false,
                        flagged: result.flagged ?? false,
                        disqualified: result.disqualified ?? false,
                        flagReason: result.flagReason,
                        bikeFrame: result.bikeFrame,
                        bikeWheels: result.bikeWheels,
                        source: 'zwiftranking',
                        dataQuality: 'validated',
                    },
                    update: {
                        position: result.position,
                        positionCategory: result.positionCategory,
                        category: result.category,
                        time: result.time,
                        timeGap: result.timeGap,
                        distance: result.distance,
                        averagePower: result.averagePower,
                        normalizedPower: result.normalizedPower,
                        maxPower: result.maxPower,
                        averageWkg: result.averageWkg,
                        zPower: result.zPower,
                        averageHeartRate: result.averageHeartRate,
                        maxHeartRate: result.maxHeartRate,
                        averageCadence: result.averageCadence,
                        maxCadence: result.maxCadence,
                        averageSpeed: result.averageSpeed,
                        maxSpeed: result.maxSpeed,
                        points: result.points,
                        primePoints: result.primePoints,
                        didFinish: result.didFinish ?? true,
                        didNotStart: result.didNotStart ?? false,
                        flagged: result.flagged ?? false,
                        disqualified: result.disqualified ?? false,
                        flagReason: result.flagReason,
                        bikeFrame: result.bikeFrame,
                        bikeWheels: result.bikeWheels,
                        dataQuality: 'validated',
                    },
                });
                if (saved) {
                    created++;
                }
                else {
                    updated++;
                }
            }
            catch (error) {
                logger.debug(`Fout bij opslaan result voor rider ${result.riderId}:`, error);
                errors++;
            }
        }
        logger.info(`✓ Results verwerkt:`);
        logger.info(`  Created/Updated: ${created}`);
        logger.info(`  Errors: ${errors}\n`);
        // Stap 5: Zoek specifiek rider 150437
        logger.info('🎯 Zoek rider 150437 in dit event...\n');
        const targetRiderResult = await prisma.raceResult.findFirst({
            where: {
                eventId: EVENT_ID,
                rider: {
                    zwiftId: TARGET_RIDER_ZWIFT_ID,
                },
            },
            include: {
                rider: {
                    select: {
                        zwiftId: true,
                        name: true,
                        categoryRacing: true,
                    },
                },
                event: {
                    select: {
                        name: true,
                        eventDate: true,
                        routeName: true,
                        distance: true,
                    },
                },
            },
        });
        if (targetRiderResult) {
            logger.info('✅ RIDER 150437 GEVONDEN IN EVENT!\n');
            logger.info('═'.repeat(64));
            logger.info('EVENT INFORMATIE:');
            logger.info('═'.repeat(64));
            logger.info(`  Event: ${targetRiderResult.event.name}`);
            logger.info(`  Route: ${targetRiderResult.event.routeName || 'N/A'}`);
            logger.info(`  Datum: ${targetRiderResult.event.eventDate?.toISOString().split('T')[0] || 'N/A'}`);
            logger.info(`  Distance: ${targetRiderResult.event.distance || 'N/A'} km\n`);
            logger.info('═'.repeat(64));
            logger.info('RIDER INFORMATIE:');
            logger.info('═'.repeat(64));
            logger.info(`  Naam: ${targetRiderResult.rider.name}`);
            logger.info(`  Zwift ID: ${targetRiderResult.rider.zwiftId}`);
            logger.info(`  Category: ${targetRiderResult.rider.categoryRacing || 'N/A'}\n`);
            logger.info('═'.repeat(64));
            logger.info('RACE RESULTAAT:');
            logger.info('═'.repeat(64));
            logger.info(`  Positie: ${targetRiderResult.position || 'N/A'}`);
            logger.info(`  Positie in Cat: ${targetRiderResult.positionCategory || 'N/A'}`);
            logger.info(`  Category: ${targetRiderResult.category || 'N/A'}`);
            if (targetRiderResult.time) {
                const minutes = Math.floor(targetRiderResult.time / 60);
                const seconds = targetRiderResult.time % 60;
                logger.info(`  Tijd: ${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
            if (targetRiderResult.timeGap) {
                logger.info(`  Gap: +${targetRiderResult.timeGap}s`);
            }
            logger.info(`\n  Gemiddeld Vermogen: ${targetRiderResult.averagePower || 'N/A'} W`);
            logger.info(`  Normalized Power: ${targetRiderResult.normalizedPower || 'N/A'} W`);
            logger.info(`  Max Power: ${targetRiderResult.maxPower || 'N/A'} W`);
            logger.info(`  Gemiddeld W/kg: ${targetRiderResult.averageWkg?.toFixed(2) || 'N/A'}`);
            if (targetRiderResult.averageHeartRate) {
                logger.info(`\n  Gemiddelde HR: ${targetRiderResult.averageHeartRate} bpm`);
                logger.info(`  Max HR: ${targetRiderResult.maxHeartRate || 'N/A'} bpm`);
            }
            if (targetRiderResult.averageCadence) {
                logger.info(`\n  Gemiddelde Cadence: ${targetRiderResult.averageCadence} rpm`);
                logger.info(`  Max Cadence: ${targetRiderResult.maxCadence || 'N/A'} rpm`);
            }
            logger.info(`\n  Gemiddelde Snelheid: ${targetRiderResult.averageSpeed?.toFixed(1) || 'N/A'} km/h`);
            logger.info(`  Max Snelheid: ${targetRiderResult.maxSpeed?.toFixed(1) || 'N/A'} km/h`);
            if (targetRiderResult.points) {
                logger.info(`\n  Points: ${targetRiderResult.points}`);
            }
            if (targetRiderResult.primePoints) {
                logger.info(`  Prime Points: ${targetRiderResult.primePoints}`);
            }
            logger.info(`\n  Finished: ${targetRiderResult.didFinish ? 'Yes' : 'No'}`);
            logger.info(`  DNF: ${targetRiderResult.didNotStart ? 'Yes' : 'No'}`);
            logger.info(`  Flagged: ${targetRiderResult.flagged ? 'Yes' : 'No'}`);
            if (targetRiderResult.bikeFrame || targetRiderResult.bikeWheels) {
                logger.info(`\n  Bike Setup:`);
                if (targetRiderResult.bikeFrame)
                    logger.info(`    Frame: ${targetRiderResult.bikeFrame}`);
                if (targetRiderResult.bikeWheels)
                    logger.info(`    Wheels: ${targetRiderResult.bikeWheels}`);
            }
            logger.info('\n' + '═'.repeat(64) + '\n');
        }
        else {
            logger.warn('⚠️  Rider 150437 niet gevonden in dit event');
            logger.info('   Mogelijk is de rider niet in de database of heeft niet deelgenomen\n');
        }
        // Stap 6: Toon statistieken
        logger.info('📊 EVENT STATISTIEKEN:\n');
        const totalParticipants = await prisma.raceResult.count({
            where: { eventId: EVENT_ID },
        });
        const finishers = await prisma.raceResult.count({
            where: { eventId: EVENT_ID, didFinish: true },
        });
        logger.info(`  Totaal results in DB: ${totalParticipants}`);
        logger.info(`  Finishers: ${finishers}`);
        logger.info(`  DNF: ${totalParticipants - finishers}\n`);
        logger.info('✅ Sync compleet!\n');
    }
    catch (error) {
        if (error.response?.status === 429) {
            logger.error('❌ Rate limit error - wacht 65 seconden en probeer opnieuw');
        }
        else if (error.response?.status === 404) {
            logger.error('❌ Event niet gevonden - check event ID');
        }
        else {
            logger.error('❌ Fout bij sync:', error.message);
        }
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
syncEventDirect();
//# sourceMappingURL=sync-event-5129235.js.map