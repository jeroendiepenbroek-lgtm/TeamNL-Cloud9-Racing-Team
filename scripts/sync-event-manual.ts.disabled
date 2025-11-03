#!/usr/bin/env tsx
/**
 * Handmatig event results syncen
 * 
 * Gebruik: npx tsx scripts/sync-event-manual.ts <eventId>
 * Voorbeeld: npx tsx scripts/sync-event-manual.ts 4001234
 */

import SyncService from '../src/services/sync.js';
import { logger } from '../src/utils/logger.js';
import { prisma } from '../src/database/client.js';

const eventId = process.argv[2] ? parseInt(process.argv[2]) : null;

async function syncEventManual() {
  if (!eventId || isNaN(eventId)) {
    logger.error('❌ Event ID is verplicht');
    logger.info('💡 Gebruik: npx tsx scripts/sync-event-manual.ts <eventId>');
    logger.info('📚 Voorbeeld: npx tsx scripts/sync-event-manual.ts 4001234');
    process.exit(1);
  }

  logger.info('╔════════════════════════════════════════════════════════════════╗');
  logger.info('║              MANUAL EVENT SYNC                                 ║');
  logger.info('╚════════════════════════════════════════════════════════════════╝\n');
  logger.info(`🏁 Event ID: ${eventId}\n`);

  try {
    const syncService = new SyncService();
    
    // Sync van ZwiftRacing.app (standaard)
    logger.info('🔄 Start sync van ZwiftRacing.app...');
    await syncService.syncEventResults(eventId, 'zwiftranking');
    
    // Check hoeveel results er zijn opgeslagen
    const results = await prisma.raceResult.findMany({
      where: { eventId },
      include: {
        rider: {
          select: { zwiftId: true, name: true }
        }
      }
    });
    
    logger.info(`\n✅ Sync compleet!`);
    logger.info(`📊 ${results.length} results opgeslagen voor event ${eventId}\n`);
    
    if (results.length > 0) {
      logger.info('Top 5 results:');
      results.slice(0, 5).forEach((result, index) => {
        logger.info(`  ${index + 1}. ${result.rider?.name || 'Unknown'} (${result.rider?.zwiftId}) - Pos ${result.position}`);
      });
      
      // Check of rider 150437 erbij zit
      const targetRider = results.find(r => r.rider?.zwiftId === 150437);
      if (targetRider) {
        logger.info(`\n🎯 Rider 150437 gevonden! Position: ${targetRider.position}`);
      } else {
        logger.info(`\nℹ️  Rider 150437 niet gevonden in dit event`);
      }
    }
    
  } catch (error) {
    logger.error('❌ Sync gefaald', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncEventManual();
