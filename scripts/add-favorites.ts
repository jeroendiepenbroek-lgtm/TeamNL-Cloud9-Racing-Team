#!/usr/bin/env node
/**
 * Bulk toevoegen van favorite riders
 * 
 * Usage:
 *   npm run favorites:add 123456 789012 345678
 *   npm run favorites:add --file riders.txt
 * 
 * File format (riders.txt):
 *   123456
 *   789012
 *   345678
 */

import { RiderRepository } from '../src/database/repositories.js';
import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { config } from '../src/utils/config.js';
import { logger } from '../src/utils/logger.js';
import { readFileSync } from 'fs';

const apiClient = new ZwiftApiClient({
  apiKey: config.zwiftApiKey,
  baseUrl: config.zwiftApiBaseUrl,
});

const riderRepo = new RiderRepository();

async function addFavoriteRider(zwiftId: number, priority: number = 1): Promise<void> {
  try {
    logger.info(`📥 Haalt rider ${zwiftId} op van API...`);
    
    // Haal full data op van API
    const riderData = await apiClient.getRider(zwiftId);
    
    // Sla op in riders tabel (met favorite tracking)
    const rider = await riderRepo.upsertRider(riderData, undefined, {
      isFavorite: true,
      addedBy: 'bulk',
      syncPriority: priority,
    });
    
    logger.info(`✅ Favorite toegevoegd: ${rider.name} (ID: ${rider.id}, Priority: ${priority})`);
    
    // Race rating en phenotype worden automatisch opgeslagen door upsertRider
    
  } catch (error) {
    logger.error(`❌ Fout bij toevoegen rider ${zwiftId}:`, error);
    throw error;
  }
}

async function addFavoritesFromFile(filePath: string, priority: number = 2): Promise<void> {
  logger.info(`📂 Leest riders van bestand: ${filePath}`);
  
  const content = readFileSync(filePath, 'utf-8');
  const zwiftIds = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => parseInt(line, 10))
    .filter(id => !isNaN(id));
  
  logger.info(`📋 Gevonden: ${zwiftIds.length} rider IDs`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const zwiftId of zwiftIds) {
    try {
      await addFavoriteRider(zwiftId, priority);
      successCount++;
      
      // Rate limiting: 5 per min = wacht 12 sec tussen calls
      if (zwiftIds.indexOf(zwiftId) < zwiftIds.length - 1) {
        logger.debug('⏳ Wacht 12 seconden (rate limiting)...');
        await new Promise(resolve => setTimeout(resolve, 12000));
      }
    } catch (error) {
      errorCount++;
      logger.warn(`⚠️  Overslaan rider ${zwiftId}`);
    }
  }
  
  logger.info(`\n🎉 Bulk import voltooid:`);
  logger.info(`   ✅ Succesvol: ${successCount}`);
  logger.info(`   ❌ Gefaald: ${errorCount}`);
}

async function addFavoritesFromArgs(zwiftIds: number[], priority: number = 1): Promise<void> {
  logger.info(`📋 Toevoegen ${zwiftIds.length} favorite riders...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const zwiftId of zwiftIds) {
    try {
      await addFavoriteRider(zwiftId, priority);
      successCount++;
      
      // Rate limiting
      if (zwiftIds.indexOf(zwiftId) < zwiftIds.length - 1) {
        logger.debug('⏳ Wacht 12 seconden (rate limiting)...');
        await new Promise(resolve => setTimeout(resolve, 12000));
      }
    } catch (error) {
      errorCount++;
      logger.warn(`⚠️  Overslaan rider ${zwiftId}`);
    }
  }
  
  logger.info(`\n🎉 Import voltooid:`);
  logger.info(`   ✅ Succesvol: ${successCount}`);
  logger.info(`   ❌ Gefaald: ${errorCount}`);
}

async function listFavorites(): Promise<void> {
  const favorites = await riderRepo.getFavoriteRiders();
  
  console.log('\n📋 Favorite Riders:');
  console.log('─'.repeat(80));
  
  if (favorites.length === 0) {
    console.log('Geen favorieten gevonden.');
    return;
  }
  
  favorites.forEach(rider => {
    console.log(`[${rider.syncPriority}] ${rider.name.padEnd(30)} | Zwift ID: ${rider.zwiftId} | FTP: ${rider.ftp || 'N/A'}W | Added: ${rider.addedBy}`);
  });
  
  console.log('─'.repeat(80));
  console.log(`Totaal: ${favorites.length} favorieten\n`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    console.log(`
📚 Favorite Riders Management

Usage:
  npm run favorites:add <zwiftId1> <zwiftId2> ...    # Voeg riders toe via IDs
  npm run favorites:add --file <path>                # Import vanuit bestand
  npm run favorites:add --priority <1-4> <ids...>    # Met prioriteit (1=hoogste)
  npm run favorites:list                             # Lijst alle favorieten
  
Examples:
  npm run favorites:add 123456 789012
  npm run favorites:add --file data/team-riders.txt
  npm run favorites:add --priority 2 123456
  npm run favorites:list

File format (één Zwift ID per regel):
  123456
  789012
  # Comments worden genegeerd
  345678
`);
    process.exit(0);
  }
  
  try {
    if (args[0] === 'list' || args[0] === '--list') {
      await listFavorites();
    } else if (args[0] === '--file') {
      if (!args[1]) {
        throw new Error('Bestandspad vereist na --file');
      }
      const priority = args.includes('--priority') 
        ? parseInt(args[args.indexOf('--priority') + 1], 10) || 2
        : 2;
      await addFavoritesFromFile(args[1], priority);
    } else {
      const priorityIndex = args.indexOf('--priority');
      const priority = priorityIndex >= 0 && args[priorityIndex + 1]
        ? parseInt(args[priorityIndex + 1], 10) || 1
        : 1;
      
      const zwiftIds = args
        .filter(arg => !arg.startsWith('--') && arg !== args[priorityIndex + 1])
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id));
      
      if (zwiftIds.length === 0) {
        throw new Error('Geen geldige Zwift IDs opgegeven');
      }
      
      await addFavoritesFromArgs(zwiftIds, priority);
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Fout bij uitvoeren commando:', error);
    process.exit(1);
  }
}

main();
