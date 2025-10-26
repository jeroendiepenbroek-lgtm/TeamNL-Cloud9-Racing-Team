#!/usr/bin/env tsx
/**
 * Test script voor het syncen van specifieke riders
 */

import { config } from '../src/utils/config.js';
import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { RiderRepository, ClubRepository } from '../src/database/repositories.js';
import { logger } from '../src/utils/logger.js';
import { prisma } from '../src/database/client.js';

const TEST_RIDERS = [1813927, 150437, 1495];
const TEST_CLUB_ID = 2281;

async function syncTestRiders() {
  try {
    logger.info('🧪 Start test rider sync', { riders: TEST_RIDERS, clubId: TEST_CLUB_ID });

    const apiClient = new ZwiftApiClient({
      apiKey: config.zwiftApiKey,
      baseUrl: config.zwiftApiBaseUrl,
    });

    const riderRepo = new RiderRepository();
    const clubRepo = new ClubRepository();

    // Eerst club info ophalen (als die niet bestaat)
    logger.info('📋 Check club info...');
    const existingClub = await clubRepo.getClub(TEST_CLUB_ID);
    if (!existingClub) {
      logger.info('➕ Club 2281 toevoegen aan database');
      await clubRepo.upsertClub(TEST_CLUB_ID, 3, 'Test Club');
    }

    // Sync elke rider individueel
    for (const riderId of TEST_RIDERS) {
      try {
        logger.info(`🔄 Sync rider ${riderId}...`);
        
        // Haal rider data op van API (5 per minuut limiet)
        const riderData = await apiClient.getRider(riderId);
        
        // Sla op in database
        const savedRider = await riderRepo.upsertRider(riderData, TEST_CLUB_ID);

        logger.info(`✅ Rider ${riderId} gesynchroniseerd`, {
          name: savedRider.name,
          ftp: savedRider.ftp,
          weight: savedRider.weight,
        });

        // Wacht 12 seconden tussen calls (5 per minuut = 1 per 12 sec)
        if (riderId !== TEST_RIDERS[TEST_RIDERS.length - 1]) {
          logger.info('⏳ Wacht 12 seconden voor rate limit...');
          await new Promise(resolve => setTimeout(resolve, 12000));
        }

      } catch (error) {
        logger.error(`❌ Fout bij sync van rider ${riderId}`, error);
      }
    }

    // Toon resultaten
    logger.info('📊 Sync compleet - database status:');
    const allRiders = await riderRepo.getClubRiders(TEST_CLUB_ID, false);
    
    allRiders.forEach(rider => {
      logger.info(`  👤 ${rider.name} (${rider.zwiftId})`, {
        ftp: rider.ftp,
        ftpWkg: rider.ftpWkg,
        weight: rider.weight,
        category: rider.categoryRacing,
      });
    });

    logger.info('✅ Test sync succesvol afgerond');

  } catch (error) {
    logger.error('❌ Test sync gefaald', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run script
syncTestRiders();
