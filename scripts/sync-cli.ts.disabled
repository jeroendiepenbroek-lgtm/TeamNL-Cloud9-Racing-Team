#!/usr/bin/env tsx
/**
 * CLI Script voor handmatige data synchronisatie
 * 
 * Gebruik:
 *   npm run sync              # Volledige club sync
 *   tsx scripts/sync-cli.ts --riders 150437,200000  # Sync specifieke riders
 *   tsx scripts/sync-cli.ts --event 4879983         # Sync event resultaten
 */

import SyncService from '../src/services/sync.js';
import { logger } from '../src/utils/logger.js';
import prisma from '../src/database/client.js';

async function main() {
  const args = process.argv.slice(2);
  const syncService = new SyncService();

  try {
    if (args.includes('--help') || args.includes('-h')) {
      printHelp();
      return;
    }

    // Parse arguments
    const ridersArg = args.find(arg => arg.startsWith('--riders='));
    const eventArg = args.find(arg => arg.startsWith('--event='));
    const fullSync = args.includes('--full');

    if (ridersArg) {
      // Sync specifieke riders
      const riderIds = ridersArg
        .split('=')[1]
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));

      logger.info(`🔄 Start sync voor ${riderIds.length} riders...`);
      await syncService.syncIndividualRiders(riderIds);
      
    } else if (eventArg) {
      // Sync event resultaten
      const eventId = parseInt(eventArg.split('=')[1]);
      if (isNaN(eventId)) {
        logger.error('Ongeldige event ID');
        process.exit(1);
      }

      const source = args.includes('--zwiftpower') ? 'zwiftpower' : 'zwiftranking';
      logger.info(`🔄 Start sync voor event ${eventId} (${source})...`);
      await syncService.syncEventResults(eventId, source);
      
    } else if (fullSync) {
      // Volledige sync
      logger.info('🔄 Start volledige synchronisatie...');
      await syncService.fullSync();
      
    } else {
      // Default: club members sync
      logger.info('🔄 Start club members sync...');
      await syncService.syncClubMembers();
    }

    logger.info('✅ Synchronisatie succesvol voltooid!');
    
    // Toon sync stats
    const stats = await syncService.getSyncStats();
    logger.info('📊 Laatste sync statistieken:', {
      lastClubSync: stats.lastClubSync?.createdAt,
      lastRidersSync: stats.lastRidersSync?.createdAt,
    });

  } catch (error) {
    logger.error('❌ Synchronisatie gefaald:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function printHelp() {
  console.log(`
TeamNL Cloud9 Data Sync CLI

Gebruik:
  npm run sync                              # Sync club members (default)
  npm run sync -- --full                    # Volledige sync (alle data)
  npm run sync -- --riders=150437,200000    # Sync specifieke riders
  npm run sync -- --event=4879983           # Sync event resultaten
  npm run sync -- --event=4879983 --zwiftpower  # Gebruik ZwiftPower als bron

Opties:
  --help, -h        Toon deze help tekst
  --full            Volledige sync (let op: gebruikt veel API calls)
  --riders=ID,...   Sync specifieke rider IDs (komma gescheiden)
  --event=ID        Sync event resultaten
  --zwiftpower      Gebruik ZwiftPower als bron (i.p.v. ZwiftRanking)

Voorbeelden:
  npm run sync
  npm run sync -- --riders=150437
  npm run sync -- --event=4879983
  npm run sync -- --full

Let op: Respecteer API rate limits!
  - Club sync: 1x per 60 minuten
  - Individual riders: 5x per minuut
  - Event results: 1x per minuut
  `);
}

// Run het script
main();
