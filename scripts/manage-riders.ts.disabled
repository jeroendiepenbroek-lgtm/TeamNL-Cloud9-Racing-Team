#!/usr/bin/env node
/**
 * Simple Rider Management CLI
 * 
 * Voeg riders toe aan database op basis van ZwiftID
 * Triggert automatisch volledige data collectie (prio 1-4):
 * 1. Rider details
 * 2. Rider races (90 dagen) - TODO
 * 3. Club gegevens
 * 4. Alle club members + 24u races - TODO
 * 
 * Usage:
 *   npm run riders
 */

import readline from 'readline';
import { DataCollectionService } from '../src/services/data-collection.js';
import { RiderRepository } from '../src/database/repositories.js';
import { logger } from '../src/utils/logger.js';

const dataService = new DataCollectionService();
const riderRepo = new RiderRepository();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function printHeader(text: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${text}`);
  console.log('='.repeat(60) + '\n');
}

function printMenu() {
  printHeader('RIDER MANAGEMENT');
  console.log('1. 👥 Bekijk alle riders in database');
  console.log('2. ➕ Voeg rider toe (ZwiftID) → triggert volledige data collectie');
  console.log('3. ➕ Voeg meerdere riders toe (bulk)');
  console.log('4. ➖ Verwijder rider');
  console.log('5. 🔍 Zoek rider (ZwiftID)');
  console.log('0. 🚪 Exit');
  console.log('');
}

async function listAllRiders() {
  printHeader('ALLE RIDERS IN DATABASE');
  
  try {
    // Gebruik Prisma direct voor simpele lijst
    const { default: prisma } = await import('../src/database/client.js');
    
    const riders = await prisma.rider.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50, // Limiteer tot laatste 50
      select: {
        zwiftId: true,
        name: true,
        clubId: true,
        club: {
          select: {
            name: true,
          },
        },
        ftp: true,
        ftpWkg: true,
        categoryRacing: true,
        totalRaces: true,
        totalWins: true,
        createdAt: true,
      },
    });
    
    if (riders.length === 0) {
      console.log('⚠️  Geen riders in database. Voeg riders toe met optie 2.\n');
      return;
    }
    
    console.log(`Totaal: ${riders.length} riders (laatste 50)\n`);
    
    riders.forEach((rider, idx) => {
      console.log(`${idx + 1}. ${rider.name} (${rider.zwiftId})`);
      if (rider.club) {
        console.log(`   Club: ${rider.club.name} (${rider.clubId})`);
      }
      console.log(`   FTP: ${rider.ftp || 'N/A'}W | W/kg: ${rider.ftpWkg?.toFixed(2) || 'N/A'}`);
      console.log(`   Categorie: ${rider.categoryRacing || 'N/A'}`);
      console.log(`   Races: ${rider.totalRaces || 0} | Wins: ${rider.totalWins || 0}`);
      console.log(`   Toegevoegd: ${new Date(rider.createdAt).toLocaleDateString('nl-NL')}`);
      console.log('');
    });
  } catch (error) {
    console.log(`❌ Error: ${(error as Error).message}\n`);
  }
}

async function addRider() {
  printHeader('RIDER TOEVOEGEN');
  
  const zwiftIdStr = await question('Zwift ID: ');
  const zwiftId = parseInt(zwiftIdStr);
  
  if (isNaN(zwiftId)) {
    console.log('❌ Ongeldige Zwift ID\n');
    return;
  }
  
  // Vraag welke data te verzamelen
  console.log('\n📋 Wat wil je verzamelen?');
  const raceHistory = await question('  Rider race history (90 dagen)? (j/n, default: j): ');
  const clubData = await question('  Club gegevens? (j/n, default: j): ');
  const fullClub = await question('  ⚠️  VOLLEDIGE club sync (ALLE members + 24u races voor actieve riders)? (j/n, default: n): ');
  
  if (fullClub.toLowerCase() === 'j') {
    console.log('\n⚡ OPTIMALISATIE v2 (BULK API):');
    console.log('   - Bulk ophalen: ALLE ~400 riders in 1 API call (15s)');
    console.log('   - Filter: Alleen riders met race in laatste 7 dagen');
    console.log('   - 24u sync: ~50-100 actieve riders × 61s = 1-2 uur');
    console.log('   - Totaal: ~51 API calls i.p.v. ~450 calls!');
    console.log('   - Rate limits: POST bulk (1/15min) + getRiderResults (1/min)\n');
  }
  
  console.log('\n⏳ Start data collectie...');
  console.log('   → Prio 1: Rider details ophalen');
  if (raceHistory.toLowerCase() !== 'n') {
    console.log('   → Prio 2: Rider races (90 dagen)');
  }
  if (clubData.toLowerCase() !== 'n') {
    console.log('   → Prio 3: Club gegevens ophalen');
    if (fullClub.toLowerCase() === 'j') {
      console.log('   → Prio 4: Club members + 24u races (alleen actieve riders)');
    }
  }
  console.log('');
  
  try {
    const result = await dataService.collectRiderData(zwiftId, {
      includeRaceHistory: raceHistory.toLowerCase() !== 'n',
      includeClubData: clubData.toLowerCase() !== 'n',
      includeClubMembersRaces: fullClub.toLowerCase() === 'j',
    });
    
    console.log('\n✅ Data collectie voltooid!');
    console.log(`\n📊 Resultaten:`);
    console.log(`   Rider: ${result.rider.name} (${result.rider.zwiftId})`);
    console.log(`   Club: ${result.club?.name || 'Geen'} (${result.rider.clubId || 'N/A'})`);
    console.log(`   FTP: ${result.rider.ftp || 'N/A'}W | W/kg: ${result.rider.ftpWkg?.toFixed(2) || 'N/A'}`);
    console.log(`   Categorie: ${result.rider.categoryRacing || 'N/A'}`);
    console.log(`   Race history: ${result.raceHistory} races opgeslagen`);
    console.log(`   Club members: ${result.clubMembers} opgeslagen`);
    console.log(`   Club races (24u): ${result.clubRaces24h} opgeslagen`);
    console.log('');
  } catch (error) {
    console.log(`\n❌ Error: ${(error as Error).message}\n`);
  }
}

async function addMultipleRiders() {
  printHeader('BULK RIDERS TOEVOEGEN');
  
  console.log('Voer Zwift IDs in, gescheiden door komma\'s of spaties:');
  const input = await question('Zwift IDs: ');
  
  // Parse input: splits op komma of spatie
  const zwiftIds = input
    .split(/[,\s]+/)
    .map(id => parseInt(id.trim()))
    .filter(id => !isNaN(id));
  
  if (zwiftIds.length === 0) {
    console.log('❌ Geen geldige Zwift IDs opgegeven\n');
    return;
  }
  
  // Voor bulk: standaard opties (snel)
  console.log(`\n⏳ Start bulk collectie voor ${zwiftIds.length} riders...`);
  console.log(`   Opties: Rider details + race history (90d) + club data`);
  console.log(`   Prio 4 (volledige club sync) is uitgeschakeld voor bulk import`);
  console.log(`   Dit kan even duren: ~2s per rider + rate limiting\n`);
  
  try {
    const results = [];
    let successful = 0;
    let failed = 0;
    
    for (const zwiftId of zwiftIds) {
      try {
        console.log(`\n[${successful + failed + 1}/${zwiftIds.length}] Verwerk rider ${zwiftId}...`);
        const result = await dataService.collectRiderData(zwiftId, {
          includeRaceHistory: true,
          includeClubData: true,
          includeClubMembersRaces: false, // Never voor bulk
        });
        results.push({ zwiftId, success: true, data: result });
        successful++;
        console.log(`✅ ${result.rider.name} - ${result.raceHistory} races opgeslagen`);
        
        // Kleine delay tussen riders
        if (successful + failed < zwiftIds.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.log(`❌ Fout: ${(error as Error).message}`);
        results.push({ zwiftId, success: false, error: (error as Error).message });
        failed++;
      }
    }
    
    console.log('\n✅ Bulk collectie voltooid!');
    console.log(`   Geslaagd: ${successful}`);
    console.log(`   Gefaald: ${failed}`);
    console.log('');
    
    if (failed > 0) {
      console.log('❌ Gefaalde riders:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.zwiftId}: ${r.error}`);
        });
      console.log('');
    }
  } catch (error) {
    console.log(`\n❌ Error: ${(error as Error).message}\n`);
  }
}

async function removeRider() {
  printHeader('RIDER VERWIJDEREN');
  
  const zwiftIdStr = await question('Zwift ID: ');
  const zwiftId = parseInt(zwiftIdStr);
  
  if (isNaN(zwiftId)) {
    console.log('❌ Ongeldige Zwift ID\n');
    return;
  }
  
  try {
    // Check of rider bestaat
    const rider = await riderRepo.getRider(zwiftId);
    if (!rider) {
      console.log(`⚠️  Rider ${zwiftId} niet gevonden in database.\n`);
      return;
    }
    
    console.log(`\nRider: ${rider.name} (${rider.zwiftId})`);
    console.log(`Club: ${rider.club?.name || 'Geen'}`);
    const confirm = await question(`\n⚠️  Weet je zeker dat je deze rider wilt verwijderen? (j/n): `);
    
    if (confirm.toLowerCase() !== 'j') {
      console.log('❌ Geannuleerd\n');
      return;
    }
    
    await dataService.removeRider(zwiftId);
    console.log(`\n✅ Rider ${rider.name} verwijderd (inclusief race history, stats, etc.)\n`);
  } catch (error) {
    console.log(`❌ Error: ${(error as Error).message}\n`);
  }
}

async function searchRider() {
  printHeader('RIDER ZOEKEN');
  
  const zwiftIdStr = await question('Zwift ID: ');
  const zwiftId = parseInt(zwiftIdStr);
  
  if (isNaN(zwiftId)) {
    console.log('❌ Ongeldige Zwift ID\n');
    return;
  }
  
  try {
    const rider = await riderRepo.getRider(zwiftId);
    
    if (!rider) {
      console.log(`⚠️  Rider ${zwiftId} niet gevonden in database.\n`);
      const add = await question('Wil je deze rider toevoegen? (j/n): ');
      if (add.toLowerCase() === 'j') {
        await addRider();
      }
      return;
    }
    
    console.log(`\nNaam: ${rider.name}`);
    console.log(`Zwift ID: ${rider.zwiftId}`);
    console.log(`Club: ${rider.club?.name || 'Geen'} (${rider.clubId || 'N/A'})`);
    console.log('');
    console.log('📊 Stats:');
    console.log(`   FTP: ${rider.ftp || 'N/A'}W | W/kg: ${rider.ftpWkg?.toFixed(2) || 'N/A'}`);
    console.log(`   Power/Weight: ${rider.powerToWeight?.toFixed(2) || 'N/A'}`);
    console.log(`   Categorie: ${rider.categoryRacing || 'N/A'}`);
    console.log(`   Ranking: ${rider.ranking || 'N/A'}`);
    console.log('');
    console.log('🏁 Race History:');
    console.log(`   Totaal races: ${rider.totalRaces || 0}`);
    console.log(`   Totaal wins: ${rider.totalWins || 0}`);
    console.log(`   Totaal podiums: ${rider.totalPodiums || 0}`);
    console.log('');
    console.log(`Laatst geüpdatet: ${new Date(rider.lastUpdated).toLocaleString('nl-NL')}`);
    console.log(`Toegevoegd: ${new Date(rider.createdAt).toLocaleString('nl-NL')}`);
    
    if (rider.raceResults && rider.raceResults.length > 0) {
      console.log(`\n🏆 Laatste ${rider.raceResults.length} races:`);
      rider.raceResults.forEach((result, idx) => {
        console.log(`${idx + 1}. ${result.event?.name || 'Unknown event'}`);
        console.log(`   Positie: ${result.position || 'N/A'} | Categorie: ${result.category || 'N/A'}`);
        console.log(`   Datum: ${result.event?.eventDate ? new Date(result.event.eventDate).toLocaleDateString('nl-NL') : 'N/A'}`);
      });
    }
    console.log('');
  } catch (error) {
    console.log(`❌ Error: ${(error as Error).message}\n`);
  }
}

async function main() {
  console.log('\n🏁 TeamNL Cloud9 - Rider Data Collection');
  console.log('   Automatische data collectie via ZwiftRacing API\n');
  
  let running = true;
  
  while (running) {
    printMenu();
    const choice = await question('Kies een optie: ');
    
    switch (choice) {
      case '1':
        await listAllRiders();
        break;
      case '2':
        await addRider();
        break;
      case '3':
        await addMultipleRiders();
        break;
      case '4':
        await removeRider();
        break;
      case '5':
        await searchRider();
        break;
      case '0':
        running = false;
        console.log('\n👋 Tot ziens!\n');
        break;
      default:
        console.log('❌ Ongeldige keuze\n');
    }
  }
  
  rl.close();
}

// Run
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
