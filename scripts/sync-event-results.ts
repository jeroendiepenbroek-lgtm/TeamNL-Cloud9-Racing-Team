#!/usr/bin/env tsx
/**
 * Sync Race Results voor specifiek Event ID
 * 
 * Haalt alle race results op voor een event en slaat ze op in de database.
 * Linkt results aan riders (indien in database) via riderId.
 * 
 * Usage: npx tsx scripts/sync-event-results.ts <eventId>
 * Example: npx tsx scripts/sync-event-results.ts 4879983
 */

import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { RiderRepository } from '../src/database/repositories.js';
import { logger } from '../src/utils/logger.js';
import { config } from '../src/utils/config.js';
import { prisma } from '../src/database/client.js';

async function syncEventResults(eventId: number) {
  logger.info('='.repeat(70));
  logger.info(`🏁 START EVENT RESULTS SYNC | Event ID: ${eventId}`);
  logger.info('='.repeat(70));

  const apiClient = new ZwiftApiClient({
    apiKey: config.zwiftApiKey,
    baseUrl: config.zwiftApiBaseUrl,
  });
  const riderRepo = new RiderRepository();

  try {
    // ============================================
    // STEP 1: Fetch Event Results from API
    // ============================================
    logger.info('\n📥 [1/4] Race results ophalen van API...');
    const results = await apiClient.getResults(eventId);
    
    if (results.length === 0) {
      logger.warn(`⚠️  Geen results gevonden voor event ${eventId}`);
      return { event: null, savedResults: 0, totalResults: 0 };
    }

    logger.info(`✅ ${results.length} results opgehaald`);
    
    // Log top 3
    logger.info('\n🏆 Top 3 finishers:');
    results.slice(0, 3).forEach((result: any, index: number) => {
      const medal = ['🥇', '🥈', '🥉'][index];
      logger.info(`   ${medal} P${result.position} - ${result.name} (ID: ${result.riderId})`);
      logger.info(`      Category: ${result.category}, Time: ${result.time ? (result.time / 60).toFixed(1) : 'N/A'} min`);
      if (result.rating) {
        const delta = result.ratingDelta || 0;
        logger.info(`      Rating: ${result.ratingBefore?.toFixed(1)} → ${result.rating.toFixed(1)} (${delta > 0 ? '+' : ''}${delta.toFixed(1)})`);
      }
    });

    // ============================================
    // STEP 2: Check/Create Event in Database
    // ============================================
    logger.info('\n💾 [2/4] Event aanmaken in database...');
    
    const event = await prisma.event.upsert({
      where: { id: eventId },
      create: {
        id: eventId,
        name: `Event ${eventId}`, // Placeholder - we don't have event name from results API
        eventDate: new Date(), // Placeholder - estimate from results
        eventType: 'race',
        totalParticipants: results.length,
        totalFinishers: results.filter((r: any) => r.time !== 21600).length, // 21600 = DNF
        dataSource: 'manual',
      },
      update: {
        totalParticipants: results.length,
        totalFinishers: results.filter((r: any) => r.time !== 21600).length,
      },
    });

    logger.info(`✅ Event opgeslagen (ID: ${event.id}, Participants: ${event.totalParticipants})`);

    // ============================================
    // STEP 3: Match Results to Riders
    // ============================================
    logger.info('\n🔗 [3/4] Results linken aan riders...');
    
    // Get all Zwift IDs we have in database
    const allRiders = await prisma.rider.findMany({
      select: { id: true, zwiftId: true, name: true },
    });
    
    const riderMap = new Map(allRiders.map(r => [r.zwiftId, r]));
    logger.info(`   Database bevat ${allRiders.length} riders`);

    // Check matches
    const matchedResults = results.filter((r: any) => riderMap.has(r.riderId));
    logger.info(`   ${matchedResults.length} results matchen met database riders`);
    
    if (matchedResults.length > 0) {
      logger.info('\n   📋 Matched riders:');
      matchedResults.slice(0, 5).forEach((r: any) => {
        const rider = riderMap.get(r.riderId);
        logger.info(`      • ${rider?.name} (Zwift ID: ${r.riderId}) - P${r.position}`);
      });
      if (matchedResults.length > 5) {
        logger.info(`      ... en ${matchedResults.length - 5} meer`);
      }
    }

    // ============================================
    // STEP 4: Save Results to Database
    // ============================================
    logger.info('\n💾 [4/4] Results opslaan in database...');
    
    let savedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const result of results) {
      try {
        const rider = riderMap.get(result.riderId);
        
        // Create unique ID
        const resultId = `${eventId}-${result.riderId}`;
        
        await prisma.raceResult.upsert({
          where: { id: resultId },
          create: {
            id: resultId,
            eventId: event.id,
            riderId: rider?.id,  // Link to rider if found, otherwise null
            riderType: rider ? 'favorite' : 'club_member',  // Mark type
            position: result.position,
            positionCategory: result.positionInCategory,
            category: result.category,
            time: result.time,
            timeGap: result.gap,
            averagePower: result.averagePower,
            averageWkg: result.averageWkg,
            distance: result.distance,
            didFinish: result.time !== 21600, // 21600 = DNF marker
            source: 'zwift_racing_app',
            dataQuality: 'high',
          },
          update: {
            position: result.position,
            positionCategory: result.positionInCategory,
            category: result.category,
            time: result.time,
            timeGap: result.gap,
            averagePower: result.averagePower,
            averageWkg: result.averageWkg,
            didFinish: result.time !== 21600,
          },
        });

        savedCount++;
        
        if (savedCount % 10 === 0) {
          logger.debug(`   ${savedCount}/${results.length} results opgeslagen...`);
        }
        
      } catch (error) {
        errorCount++;
        logger.error(`   Fout bij opslaan result voor rider ${result.riderId}:`, error);
      }
    }

    logger.info(`✅ Results opgeslagen: ${savedCount} success, ${errorCount} errors`);

    // ============================================
    // STEP 5: Summary & Verification
    // ============================================
    logger.info('\n' + '='.repeat(70));
    logger.info('✅ EVENT RESULTS SYNC COMPLEET');
    logger.info('='.repeat(70));
    logger.info(`Event ID: ${eventId}`);
    logger.info(`Total Results: ${results.length}`);
    logger.info(`Saved to Database: ${savedCount}`);
    logger.info(`Matched to Riders: ${matchedResults.length}`);
    logger.info(`Finishers: ${results.filter((r: any) => r.time !== 21600).length}`);
    logger.info(`DNFs: ${results.filter((r: any) => r.time === 21600).length}`);
    
    // Category breakdown
    const categories = results.reduce((acc: Record<string, number>, r: any) => {
      const cat = r.category || 'Unknown';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    logger.info('\n📊 Category Breakdown:');
    Object.entries(categories).forEach(([cat, count]) => {
      logger.info(`   ${cat}: ${count} riders`);
    });
    
    logger.info('='.repeat(70));

    return {
      event,
      savedResults: savedCount,
      totalResults: results.length,
      matchedRiders: matchedResults.length,
      categories,
    };

  } catch (error) {
    logger.error('❌ SYNC GEFAALD', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// CLI Execution
// ============================================
const eventId = process.argv[2] ? parseInt(process.argv[2]) : null;

if (!eventId || isNaN(eventId)) {
  logger.error('❌ Ongeldig of geen Event ID opgegeven!');
  logger.info('');
  logger.info('Usage: npx tsx scripts/sync-event-results.ts <eventId>');
  logger.info('Example: npx tsx scripts/sync-event-results.ts 4879983');
  logger.info('');
  logger.info('💡 Event IDs kun je vinden via:');
  logger.info('   - ZwiftPower website (in URL)');
  logger.info('   - Club event lists');
  logger.info('   - Zwift Companion app');
  process.exit(1);
}

syncEventResults(eventId)
  .then(() => {
    logger.info('\n✅ Script succesvol afgerond');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n❌ Script gefaald', error);
    process.exit(1);
  });
