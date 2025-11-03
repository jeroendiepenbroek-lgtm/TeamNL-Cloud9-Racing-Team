#!/usr/bin/env tsx
/**
 * Test event sync met verschillende event IDs
 * Probeert meerdere event IDs om te zien of er results zijn
 */

import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { ResultRepository } from '../src/database/repositories.js';
import { config } from '../src/utils/config.js';
import { logger } from '../src/utils/logger.js';
import { prisma } from '../src/database/client.js';

const TARGET_RIDER_ZWIFT_ID = 150437;

// Test event IDs - verschillende soorten events
// Deze zijn fictief, maar tonen hoe het werkt
const TEST_EVENT_IDS = [
  4001234, // WTRL TTT style
  3901234, // ZRL style  
  3801234, // Community events style
  4100000, // Recent event range
  4050000,
];

async function testEventSync() {
  logger.info('╔════════════════════════════════════════════════════════════════╗');
  logger.info('║              TEST EVENT RESULTS SYNC                           ║');
  logger.info('╚════════════════════════════════════════════════════════════════╝\n');

  const apiClient = new ZwiftApiClient({
    apiKey: config.zwiftApiKey,
    baseUrl: config.zwiftApiBaseUrl,
  });

  const resultRepo = new ResultRepository();
  let foundEvents = 0;
  let totalResults = 0;

  for (const eventId of TEST_EVENT_IDS) {
    try {
      logger.info(`\n🔍 Test event ${eventId}...`);
      
      // Probeer results op te halen
      const results = await apiClient.getResults(eventId);
      
      if (results.length > 0) {
        logger.info(`✅ Event ${eventId}: ${results.length} results gevonden!`);
        foundEvents++;
        totalResults += results.length;
        
        // Sla results op in database
        await resultRepo.upsertResultsBulk(results, 'zwiftranking');
        logger.info(`   💾 Results opgeslagen in database`);
        
        // Check of rider 150437 in dit event zit
        const targetRider = results.find(r => r.riderId === TARGET_RIDER_ZWIFT_ID);
        if (targetRider) {
          logger.info(`   🎯 RIDER 150437 GEVONDEN! Position: ${targetRider.position}`);
        }
      } else {
        logger.info(`   ℹ️  Event ${eventId}: geen results (event bestaat mogelijk niet)`);
      }
      
      // Rate limit: 1 per minuut, wacht 65 seconden
      const index = TEST_EVENT_IDS.indexOf(eventId);
      if (index < TEST_EVENT_IDS.length - 1) {
        logger.info('   ⏳ Wacht 65 seconden voor rate limit...');
        await new Promise(resolve => setTimeout(resolve, 65000));
      }
      
    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.info(`   ℹ️  Event ${eventId}: niet gevonden (404)`);
      } else {
        logger.error(`   ❌ Event ${eventId}: fout`, error.message);
      }
    }
  }

  // Samenvatting
  logger.info('\n╔════════════════════════════════════════════════════════════════╗');
  logger.info('║                    TEST SAMENVATTING                           ║');
  logger.info('╚════════════════════════════════════════════════════════════════╝\n');
  
  logger.info(`📊 Statistieken:`);
  logger.info(`   Events gevonden: ${foundEvents}/${TEST_EVENT_IDS.length}`);
  logger.info(`   Totaal results: ${totalResults}`);
  
  // Check database
  const dbResults = await prisma.raceResult.findMany({
    where: {
      riderId: (await prisma.rider.findUnique({ 
        where: { zwiftId: TARGET_RIDER_ZWIFT_ID },
        select: { id: true }
      }))?.id
    },
    include: { event: true }
  });
  
  logger.info(`\n🗄️  Database status rider 150437:`);
  logger.info(`   Results in DB: ${dbResults.length}`);
  
  if (dbResults.length > 0) {
    logger.info(`\n   Top ${Math.min(5, dbResults.length)} results:`);
    dbResults.slice(0, 5).forEach((result, index) => {
      logger.info(`   ${index + 1}. Event ${result.eventId} - Position ${result.position}`);
      if (result.event) {
        logger.info(`      ${result.event.name || 'Unknown Event'}`);
      }
    });
  }
  
  logger.info('\n💡 TIP: Gebruik echte event IDs van zwiftracing.app');
  logger.info('   of sync via API: POST /api/sync/event/:eventId\n');
  
  await prisma.$disconnect();
}

testEventSync().catch(error => {
  logger.error('❌ Test gefaald', error);
  process.exit(1);
});
