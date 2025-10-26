#!/usr/bin/env tsx
/**
 * Test full club sync met ALLE rider data
 * Wacht tot rate limit is verlopen (60 min sinds laatste call)
 */

import { SyncService } from '../src/services/sync.js';
import { RiderRepository } from '../src/database/repositories.js';
import { logger } from '../src/utils/logger.js';
import { prisma } from '../src/database/client.js';

const TEST_CLUB_ID = 2281;

async function testFullSync() {
  try {
    logger.info('🧪 Start VOLLEDIGE club sync test');
    logger.info(`⚠️  Dit gebruikt de /public/clubs/${TEST_CLUB_ID} endpoint`);
    logger.info('⏰ Rate limit: 1 call per 60 minuten');

    const syncService = new SyncService();
    const riderRepo = new RiderRepository();

    // Sync club members (met ALLE data: power curves, race stats, phenotype, etc.)
    await syncService.syncClubMembers(TEST_CLUB_ID);

    // Toon resultaten
    logger.info('📊 Sync compleet - bekijk data:');
    const allRiders = await riderRepo.getClubRiders(TEST_CLUB_ID, false);
    
    logger.info(`\n✅ ${allRiders.length} riders gesynchroniseerd:\n`);
    
    // Toon eerste 5 riders met alle details
    allRiders.slice(0, 5).forEach(rider => {
      logger.info(`👤 ${rider.name} (${rider.zwiftId})`);
      logger.info(`   Category: ${rider.categoryRacing || 'N/A'}`);
      logger.info(`   FTP: ${rider.ftp || 'N/A'} W (${rider.ftpWkg?.toFixed(2) || 'N/A'} W/kg)`);
      logger.info(`   Weight: ${rider.weight || 'N/A'} kg, Height: ${rider.height || 'N/A'} cm`);
      logger.info(`   Gender: ${rider.gender || 'N/A'}, Age: ${rider.age || 'N/A'}`);
      logger.info(`   Country: ${rider.countryCode || 'N/A'}`);
      logger.info(`   Races: ${rider.totalRaces || 0}, Wins: ${rider.totalWins || 0}, Podiums: ${rider.totalPodiums || 0}`);
      logger.info('');
    });

    if (allRiders.length > 5) {
      logger.info(`   ... en ${allRiders.length - 5} meer riders`);
    }

    logger.info('\n💡 Open Prisma Studio om alle data te bekijken: npm run db:studio');

  } catch (error) {
    logger.error('❌ Test sync gefaald', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run script
testFullSync();
