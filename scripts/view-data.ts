#!/usr/bin/env tsx
/**
 * Quick Data Viewer Script
 * 
 * Toont een snel overzicht van de database data voor inspectie.
 * Gebruik: npm run db:view
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger.js';

const prisma = new PrismaClient();

interface TableCounts {
  riders: number;
  clubMembers: number;
  raceResults: number;
  events: number;
  clubs: number;
  teams: number;
  syncLogs: number;
  riderSourceData: number;
  eventResultsSourceData: number;
}

async function getTableCounts(): Promise<TableCounts> {
  const [
    riders,
    clubMembers,
    raceResults,
    events,
    clubs,
    teams,
    syncLogs,
    riderSourceData,
    eventResultsSourceData
  ] = await Promise.all([
    prisma.rider.count(),
    prisma.clubMember.count(),
    prisma.raceResult.count(),
    prisma.event.count(),
    prisma.club.count(),
    prisma.team.count(),
    prisma.syncLog.count(),
    prisma.riderSourceData.count(),
    prisma.eventResultsSourceData.count()
  ]);

  return {
    riders,
    clubMembers,
    raceResults,
    events,
    clubs,
    teams,
    syncLogs,
    riderSourceData,
    eventResultsSourceData
  };
}

async function getRecentRiders(limit: number = 5) {
  return await prisma.rider.findMany({
    where: { isFavorite: true },
    orderBy: { addedAt: 'desc' },
    take: limit,
    select: {
      zwiftId: true,
      name: true,
      ranking: true,
      ftp: true,
      powerToWeight: true,
      categoryRacing: true,
      addedAt: true,
      syncPriority: true
    }
  });
}

async function getRecentEvents(limit: number = 5) {
  return await prisma.event.findMany({
    orderBy: { eventDate: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      eventDate: true,
      totalParticipants: true,
      dataSource: true,
      clubId: true
    }
  });
}

async function getLastSyncStats() {
  return await prisma.syncLog.findFirst({
    orderBy: { createdAt: 'desc' },
    select: {
      syncType: true,
      status: true,
      recordsProcessed: true,
      recordsCreated: true,
      recordsUpdated: true,
      duration: true,
      createdAt: true
    }
  });
}

async function getTopPerformers(limit: number = 5) {
  return await prisma.rider.findMany({
    where: { 
      isFavorite: true,
      ranking: { not: null }
    },
    orderBy: { ranking: 'asc' },
    take: limit,
    select: {
      name: true,
      ranking: true,
      ftp: true,
      powerToWeight: true,
      categoryRacing: true,
      totalWins: true,
      totalRaces: true
    }
  });
}

async function getRiderPhenotypes(limit: number = 10) {
  return await prisma.riderPhenotype.findMany({
    take: limit,
    include: {
      rider: {
        select: {
          name: true,
          zwiftId: true
        }
      }
    },
    orderBy: {
      bias: 'desc'
    }
  });
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   TeamNL Cloud9 - Database Quick View               ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  try {
    // Table counts
    logger.info('📊 Tabel Overzicht');
    console.log('─'.repeat(60));
    const counts = await getTableCounts();
    console.log(`  Riders (Favorites):          ${counts.riders}`);
    console.log(`  Club Members (Roster):       ${counts.clubMembers}`);
    console.log(`  Race Results:                ${counts.raceResults}`);
    console.log(`  Events:                      ${counts.events}`);
    console.log(`  Clubs:                       ${counts.clubs}`);
    console.log(`  Teams:                       ${counts.teams}`);
    console.log(`  Sync Logs:                   ${counts.syncLogs}`);
    console.log(`  Rider Source Data:           ${counts.riderSourceData}`);
    console.log(`  Event Results Source Data:   ${counts.eventResultsSourceData}`);
    console.log();

    // Last sync
    logger.info('🔄 Laatste Sync');
    console.log('─'.repeat(60));
    const lastSync = await getLastSyncStats();
    if (lastSync) {
      console.log(`  Type:             ${lastSync.syncType}`);
      console.log(`  Status:           ${lastSync.status}`);
      console.log(`  Records Created:  ${lastSync.recordsCreated}`);
      console.log(`  Records Updated:  ${lastSync.recordsUpdated}`);
      console.log(`  Duration:         ${lastSync.duration}ms`);
      console.log(`  Timestamp:        ${lastSync.createdAt.toLocaleString('nl-NL')}`);
    } else {
      console.log('  Geen sync logs gevonden. Run eerst: npm run sync');
    }
    console.log();

    // Recent riders
    logger.info('👥 Recent Toegevoegde Riders (Top 5)');
    console.log('─'.repeat(60));
    const recentRiders = await getRecentRiders();
    if (recentRiders.length > 0) {
      recentRiders.forEach((rider, index) => {
        console.log(`  ${index + 1}. ${rider.name} (${rider.zwiftId})`);
        console.log(`     Ranking: ${rider.ranking || 'N/A'} | Cat: ${rider.categoryRacing || 'N/A'} | Priority: ${rider.syncPriority}`);
        console.log(`     FTP: ${rider.ftp || 'N/A'}W | W/kg: ${rider.powerToWeight || 'N/A'}`);
        console.log(`     Added: ${rider.addedAt.toLocaleString('nl-NL')}`);
        console.log();
      });
    } else {
      console.log('  Geen favorite riders gevonden. Voeg riders toe via:');
      console.log('  - Web GUI: http://localhost:3000/favorites-manager.html');
      console.log('  - CLI: npm run favorites:add <zwiftId>');
      console.log();
    }

    // Top performers
    logger.info('🏆 Top Performers (Beste Ranking)');
    console.log('─'.repeat(60));
    const topPerformers = await getTopPerformers();
    if (topPerformers.length > 0) {
      topPerformers.forEach((rider, index) => {
        const winRate = rider.totalRaces > 0 
          ? ((rider.totalWins / rider.totalRaces) * 100).toFixed(1)
          : '0.0';
        console.log(`  ${index + 1}. ${rider.name}`);
        console.log(`     Ranking: #${rider.ranking} | Cat: ${rider.categoryRacing || 'N/A'}`);
        console.log(`     FTP: ${rider.ftp || 'N/A'}W | W/kg: ${rider.powerToWeight || 'N/A'}`);
        console.log(`     Races: ${rider.totalRaces} | Wins: ${rider.totalWins} (${winRate}%)`);
        console.log();
      });
    } else {
      console.log('  Geen riders met ranking data gevonden.');
      console.log();
    }

    // Rider phenotypes
    logger.info('🎯 Rider Types (Phenotypes)');
    console.log('─'.repeat(60));
    const phenotypes = await getRiderPhenotypes();
    if (phenotypes.length > 0) {
      phenotypes.forEach((phenotype, index) => {
        console.log(`  ${index + 1}. ${phenotype.rider.name} (${phenotype.rider.zwiftId})`);
        console.log(`     Type: ${phenotype.primaryType || 'Unknown'} (confidence: ${((phenotype.bias || 0) * 100).toFixed(0)}%)`);
        if (phenotype.sprinter) console.log(`     Sprinter: ${phenotype.sprinter.toFixed(1)}`);
        if (phenotype.climber) console.log(`     Climber: ${phenotype.climber.toFixed(1)}`);
        if (phenotype.tt) console.log(`     Time Trialist: ${phenotype.tt.toFixed(1)}`);
        console.log();
      });
    } else {
      console.log('  Geen phenotype data gevonden. Run eerst sync voor riders.');
      console.log();
    }

    // Recent events
    logger.info('📅 Recente Events (Top 5)');
    console.log('─'.repeat(60));
    const recentEvents = await getRecentEvents();
    if (recentEvents.length > 0) {
      recentEvents.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.name || 'Unnamed Event'} (${event.id})`);
        console.log(`     Datum: ${event.eventDate.toLocaleString('nl-NL')}`);
        console.log(`     Deelnemers: ${event.totalParticipants} | Source: ${event.dataSource}`);
        console.log(`     Club: ${event.clubId || 'N/A'}`);
        console.log();
      });
    } else {
      console.log('  Geen events gevonden. Run eerst sync voor events.');
      console.log();
    }

    // Quick tips
    logger.info('💡 Tips');
    console.log('─'.repeat(60));
    console.log('  📊 Visuele data viewer: npm run db:studio');
    console.log('  🔄 Sync alle data:       npm run sync');
    console.log('  👥 Favorites sync:       npm run sync:favorites');
    console.log('  📈 Events sync:          npm run sync:events:favorites');
    console.log('  🌐 Start dashboard:      npm run dev');
    console.log();
    console.log('  📖 Meer info: docs/DATA_VIEWING_GUIDE.md');
    console.log();

  } catch (error) {
    logger.error('Fout bij ophalen database data', error);
    console.log('\n❌ Error: Kon database data niet ophalen.');
    console.log('   Zorg ervoor dat de database is geïnitialiseerd:');
    console.log('   npm run db:migrate\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
