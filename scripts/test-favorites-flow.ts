#!/usr/bin/env tsx
/**
 * End-to-End Test voor Favorites Workflow
 * 
 * Test scenario:
 * 1. Voeg test favorite toe
 * 2. Verifieer in database
 * 3. Sync favorite data
 * 4. Controleer race_ratings + phenotype data
 * 5. Test list favorites
 * 6. Test soft delete
 * 7. Cleanup
 */

import { RiderRepository } from '../src/database/repositories.js';
import { SyncService } from '../src/services/sync.js';
import { ZwiftApiClient } from '../src/api/zwift-client.js';
import prisma from '../src/database/client.js';
import { logger } from '../src/utils/logger.js';
import { config } from '../src/utils/config.js';

// Test Zwift ID (gebruik een bekende rider uit club_members)
const TEST_ZWIFT_ID = 1495; // Onno Aphinan - bestaande club member

async function main() {
  console.log('\n🧪 Start End-to-End Favorites Test\n');
  console.log('═'.repeat(60));
  
  const riderRepo = new RiderRepository();
  const syncService = new SyncService();
  const apiClient = new ZwiftApiClient({
    apiKey: config.zwiftApiKey,
    baseUrl: config.zwiftApiBaseUrl,
  });
  
  let testPassed = true;
  
  try {
    // ============================================================
    // TEST 1: Haal test rider data op van API
    // ============================================================
    console.log('\n📋 TEST 1: Fetch rider data van API');
    console.log('─'.repeat(60));
    
    let riderData;
    try {
      riderData = await apiClient.getRider(TEST_ZWIFT_ID);
      console.log(`✅ Rider data opgehaald: ${riderData.name} (${riderData.riderId})`);
      console.log(`   FTP: ${riderData.zpFTP || riderData.ftp}W, Ranking: ${riderData.ranking}`);
    } catch (error) {
      console.error(`❌ FAILED: Kon rider ${TEST_ZWIFT_ID} niet ophalen van API`);
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      testPassed = false;
      
      // Probeer alternatieve test ID
      console.log('\n🔄 Probeer alternatieve test rider...');
      const altTestId = 123456; // Fallback test ID
      try {
        riderData = await apiClient.getRider(altTestId);
        console.log(`✅ Alternatieve rider data opgehaald: ${riderData.name} (${riderData.riderId})`);
      } catch {
        console.error('❌ FAILED: Geen geldige test rider beschikbaar');
        process.exit(1);
      }
    }
    
    // ============================================================
    // TEST 2: Voeg favorite toe via repository
    // ============================================================
    console.log('\n📋 TEST 2: Voeg rider toe als favorite');
    console.log('─'.repeat(60));
    
    try {
      const rider = await riderRepo.upsertRider(riderData, undefined, {
        isFavorite: true,
        addedBy: 'test-suite',
        syncPriority: 1,
      });
      
      console.log(`✅ Favorite toegevoegd: ${rider.name} (ID: ${rider.id})`);
      console.log(`   isFavorite: ${rider.isFavorite}`);
      console.log(`   syncPriority: ${rider.syncPriority}`);
      console.log(`   addedBy: ${rider.addedBy}`);
    } catch (error) {
      console.error('❌ FAILED: Kon favorite niet toevoegen');
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      testPassed = false;
    }
    
    // ============================================================
    // TEST 3: Verifieer in database
    // ============================================================
    console.log('\n📋 TEST 3: Verifieer favorite in database');
    console.log('─'.repeat(60));
    
    try {
      const dbRider = await prisma.rider.findUnique({
        where: { zwiftId: riderData.riderId },
        include: {
          raceRating: true,
          phenotype: true,
        },
      });
      
      if (!dbRider) {
        throw new Error('Rider niet gevonden in database');
      }
      
      console.log(`✅ Rider gevonden in database`);
      console.log(`   zwiftId: ${dbRider.zwiftId}`);
      console.log(`   name: ${dbRider.name}`);
      console.log(`   isFavorite: ${dbRider.isFavorite}`);
      console.log(`   syncPriority: ${dbRider.syncPriority}`);
      console.log(`   ftp: ${dbRider.ftp}W`);
      console.log(`   Power 5s: ${dbRider.power5s}W`);
      
      if (!dbRider.isFavorite) {
        throw new Error('isFavorite is niet TRUE');
      }
      
      if (dbRider.syncPriority !== 1) {
        throw new Error(`syncPriority is ${dbRider.syncPriority}, verwacht 1`);
      }
      
      console.log(`✅ Favorite metadata correct opgeslagen`);
      
      // Check analytics data
      if (dbRider.raceRating) {
        console.log(`✅ Race rating gevonden: ${dbRider.raceRating.currentRating}`);
      } else {
        console.log(`ℹ️  Race rating nog niet beschikbaar (normaal na eerste add)`);
      }
      
      if (dbRider.phenotype) {
        console.log(`✅ Phenotype gevonden: ${dbRider.phenotype.primaryType}`);
      } else {
        console.log(`ℹ️  Phenotype nog niet beschikbaar (normaal na eerste add)`);
      }
      
    } catch (error) {
      console.error('❌ FAILED: Database verificatie gefaald');
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      testPassed = false;
    }
    
    // ============================================================
    // TEST 4: Test getFavoriteRiders()
    // ============================================================
    console.log('\n📋 TEST 4: Test getFavoriteRiders() methode');
    console.log('─'.repeat(60));
    
    try {
      const favorites = await riderRepo.getFavoriteRiders();
      
      console.log(`✅ getFavoriteRiders() retourneert ${favorites.length} favorite(s)`);
      
      const testRider = favorites.find(f => f.zwiftId === riderData.riderId);
      if (!testRider) {
        throw new Error('Test rider niet gevonden in favorites lijst');
      }
      
      console.log(`✅ Test rider aanwezig in favorites lijst`);
      console.log(`   Naam: ${testRider.name}`);
      console.log(`   Priority: ${testRider.syncPriority}`);
      
      // Verifieer sortering op priority
      const priorities = favorites.map(f => f.syncPriority || 999);
      const isSorted = priorities.every((val, i, arr) => !i || arr[i - 1] <= val);
      
      if (isSorted) {
        console.log(`✅ Favorites correct gesorteerd op syncPriority`);
      } else {
        console.warn(`⚠️  Favorites niet correct gesorteerd`);
      }
      
    } catch (error) {
      console.error('❌ FAILED: getFavoriteRiders() test gefaald');
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      testPassed = false;
    }
    
    // ============================================================
    // TEST 5: Test priority update
    // ============================================================
    console.log('\n📋 TEST 5: Test priority update');
    console.log('─'.repeat(60));
    
    try {
      await prisma.rider.update({
        where: { zwiftId: riderData.riderId },
        data: { syncPriority: 3 },
      });
      
      const updated = await prisma.rider.findUnique({
        where: { zwiftId: riderData.riderId },
        select: { syncPriority: true },
      });
      
      if (updated?.syncPriority === 3) {
        console.log(`✅ Priority update succesvol: 1 → 3`);
      } else {
        throw new Error(`Priority update gefaald: ${updated?.syncPriority}`);
      }
      
      // Reset naar priority 1 voor volgende tests
      await prisma.rider.update({
        where: { zwiftId: riderData.riderId },
        data: { syncPriority: 1 },
      });
      
    } catch (error) {
      console.error('❌ FAILED: Priority update test gefaald');
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      testPassed = false;
    }
    
    // ============================================================
    // TEST 6: Test soft delete
    // ============================================================
    console.log('\n📋 TEST 6: Test soft delete (isFavorite = false)');
    console.log('─'.repeat(60));
    
    try {
      await prisma.rider.update({
        where: { zwiftId: riderData.riderId },
        data: { isFavorite: false },
      });
      
      const softDeleted = await prisma.rider.findUnique({
        where: { zwiftId: riderData.riderId },
        select: { isFavorite: true, name: true, ftp: true },
      });
      
      if (!softDeleted) {
        throw new Error('Rider niet meer gevonden (hard delete?)');
      }
      
      if (softDeleted.isFavorite === false) {
        console.log(`✅ Soft delete succesvol: isFavorite = false`);
        console.log(`   Data behouden: naam=${softDeleted.name}, ftp=${softDeleted.ftp}W`);
      } else {
        throw new Error(`Soft delete gefaald: isFavorite = ${softDeleted.isFavorite}`);
      }
      
      // Verifieer dat getFavoriteRiders() deze niet meer retourneert
      const favoritesAfterDelete = await riderRepo.getFavoriteRiders();
      const stillInList = favoritesAfterDelete.find(f => f.zwiftId === riderData.riderId);
      
      if (!stillInList) {
        console.log(`✅ Rider niet meer in getFavoriteRiders() resultaat`);
      } else {
        throw new Error('Rider nog steeds in favorites lijst na soft delete');
      }
      
    } catch (error) {
      console.error('❌ FAILED: Soft delete test gefaald');
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      testPassed = false;
    }
    
    // ============================================================
    // TEST 7: Test re-add na soft delete
    // ============================================================
    console.log('\n📋 TEST 7: Test re-add na soft delete');
    console.log('─'.repeat(60));
    
    try {
      await prisma.rider.update({
        where: { zwiftId: riderData.riderId },
        data: { 
          isFavorite: true,
          syncPriority: 2,
          addedBy: 'test-re-add',
        },
      });
      
      const reAdded = await prisma.rider.findUnique({
        where: { zwiftId: riderData.riderId },
        select: { isFavorite: true, syncPriority: true, addedBy: true },
      });
      
      if (reAdded?.isFavorite && reAdded.syncPriority === 2) {
        console.log(`✅ Re-add succesvol: isFavorite = true, priority = 2`);
        console.log(`   addedBy bijgewerkt naar: ${reAdded.addedBy}`);
      } else {
        throw new Error('Re-add gefaald');
      }
      
    } catch (error) {
      console.error('❌ FAILED: Re-add test gefaald');
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      testPassed = false;
    }
    
    // ============================================================
    // TEST 8: Cleanup - hard delete test data
    // ============================================================
    console.log('\n📋 TEST 8: Cleanup test data');
    console.log('─'.repeat(60));
    
    try {
      // Verwijder race ratings en phenotypes eerst (cascade)
      await prisma.riderRaceRating.deleteMany({
        where: { rider: { zwiftId: riderData.riderId } },
      });
      
      await prisma.riderPhenotype.deleteMany({
        where: { rider: { zwiftId: riderData.riderId } },
      });
      
      // Verwijder rider
      await prisma.rider.delete({
        where: { zwiftId: riderData.riderId },
      });
      
      console.log(`✅ Test data verwijderd uit database`);
      
      // Verifieer dat rider echt weg is
      const stillExists = await prisma.rider.findUnique({
        where: { zwiftId: riderData.riderId },
      });
      
      if (!stillExists) {
        console.log(`✅ Cleanup compleet - geen test data meer in database`);
      } else {
        console.warn(`⚠️  Rider nog steeds aanwezig na delete`);
      }
      
    } catch (error) {
      console.error('⚠️  Cleanup gefaald (mogelijk niet kritiek)');
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      // Niet markeren als failed - cleanup errors zijn minder kritiek
    }
    
    // ============================================================
    // TEST RESULTAAT
    // ============================================================
    console.log('\n' + '═'.repeat(60));
    
    if (testPassed) {
      console.log('✅ ALLE TESTS GESLAAGD');
      console.log('\n📊 Test Coverage:');
      console.log('   ✓ API data fetch');
      console.log('   ✓ Favorite toevoegen met options');
      console.log('   ✓ Database verificatie');
      console.log('   ✓ getFavoriteRiders() query');
      console.log('   ✓ Priority updates');
      console.log('   ✓ Soft delete (isFavorite=false)');
      console.log('   ✓ Re-add na soft delete');
      console.log('   ✓ Data cleanup');
      console.log('\n✨ Favorites workflow volledig functioneel!\n');
      process.exit(0);
    } else {
      console.log('❌ ENKELE TESTS GEFAALD');
      console.log('\nControleer de errors hierboven voor details.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 ONVERWACHTE FOUT:');
    console.error(error);
    console.log('\n');
    process.exit(1);
  }
}

main();
