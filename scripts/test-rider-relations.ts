#!/usr/bin/env tsx
/**
 * Complete test voor Rider 150437 - ALLE relaties
 * Test: Club, Rider, History, Results, Statistics
 */

import { prisma } from '../src/database/client.js';
import { logger } from '../src/utils/logger.js';

const TARGET_RIDER_ZWIFT_ID = 150437;

async function testCompleteRiderProfile() {
  try {
    logger.info('╔════════════════════════════════════════════════════════════════╗');
    logger.info('║      COMPLETE RELATIE TEST - RIDER 150437 (JRøne)             ║');
    logger.info('╚════════════════════════════════════════════════════════════════╝\n');

    // ============================================
    // 1. RIDER BASIS DATA
    // ============================================
    logger.info('📊 [1/5] RIDER BASIS DATA');
    logger.info('─'.repeat(60));
    
    const rider = await prisma.rider.findUnique({
      where: { zwiftId: TARGET_RIDER_ZWIFT_ID },
    });

    if (!rider) {
      logger.error('❌ Rider niet gevonden in database!');
      process.exit(1);
    }

    logger.info(`✓ Rider gevonden (ID: ${rider.id})`);
    logger.info(`  Name: ${rider.name}`);
    logger.info(`  Zwift ID: ${rider.zwiftId}`);
    logger.info(`  Category: ${rider.categoryRacing || 'N/A'}`);
    logger.info(`  FTP: ${rider.ftp || 'N/A'} W (${rider.ftpWkg?.toFixed(2) || 'N/A'} W/kg)`);
    logger.info(`  Weight: ${rider.weight || 'N/A'} kg | Height: ${rider.height || 'N/A'} cm`);
    logger.info(`  Gender: ${rider.gender || 'N/A'} | Country: ${rider.countryCode || 'N/A'}`);
    logger.info(`  Total Races: ${rider.totalRaces || 0} | Wins: ${rider.totalWins || 0} | Podiums: ${rider.totalPodiums || 0}`);
    logger.info(`  Active: ${rider.isActive ? 'Yes' : 'No'} | Last Active: ${rider.lastActive?.toISOString().split('T')[0] || 'N/A'}`);

    // ============================================
    // 2. CLUB RELATIE
    // ============================================
    logger.info('\n🏆 [2/5] CLUB RELATIE (via clubId FK)');
    logger.info('─'.repeat(60));
    
    if (rider.clubId) {
      const club = await prisma.club.findUnique({
        where: { id: rider.clubId },
        include: {
          _count: {
            select: { members: true }
          }
        }
      });

      if (club) {
        logger.info(`✓ Club gevonden`);
        logger.info(`  Club Name: ${club.name}`);
        logger.info(`  Club ID: ${club.id}`);
        logger.info(`  Members: ${club.memberCount} (in DB: ${club._count.members})`);
        logger.info(`  Description: ${club.description || 'N/A'}`);
        logger.info(`  Website: ${club.website || 'N/A'}`);
        logger.info(`  Last Sync: ${club.lastSync?.toISOString() || 'Never'}`);
        
        logger.info(`\n  ✓ Relatie: Rider.clubId (${rider.clubId}) → Club.id (${club.id})`);
      } else {
        logger.warn(`  ⚠️  Club ID ${rider.clubId} bestaat niet in database`);
      }
    } else {
      logger.info('  ℹ️  Rider heeft geen club');
    }

    // ============================================
    // 3. HISTORICAL DATA RELATIE
    // ============================================
    logger.info('\n📈 [3/5] HISTORICAL DATA RELATIE (1:M)');
    logger.info('─'.repeat(60));
    
    const historicalData = await prisma.riderHistory.findMany({
      where: { riderId: rider.id },
      orderBy: { recordedAt: 'desc' },
      take: 10,
    });

    logger.info(`✓ ${historicalData.length} historical snapshots gevonden`);
    
    if (historicalData.length > 0) {
      logger.info(`\n  Laatste 5 snapshots:`);
      historicalData.slice(0, 5).forEach((snap, index) => {
        const date = snap.recordedAt.toISOString().split('T')[0];
        logger.info(`  ${index + 1}. ${date} - FTP: ${snap.ftp || 'N/A'}W, Weight: ${snap.weight || 'N/A'}kg, Ranking: ${snap.ranking || 'N/A'}`);
        logger.info(`     Type: ${snap.snapshotType}, Triggered by: ${snap.triggeredBy || 'N/A'}`);
      });
      
      logger.info(`\n  ✓ Relatie: RiderHistory.riderId (${historicalData[0].riderId}) → Rider.id (${rider.id})`);
    } else {
      logger.info('  ℹ️  Geen historical data beschikbaar');
      logger.info('  💡 Run: npx tsx scripts/sync-rider-complete.ts');
    }

    // ============================================
    // 4. RACE RESULTS RELATIE
    // ============================================
    logger.info('\n🏁 [4/5] RACE RESULTS RELATIE (1:M + Event)');
    logger.info('─'.repeat(60));
    
    const raceResults = await prisma.raceResult.findMany({
      where: { riderId: rider.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            eventDate: true,
            routeName: true,
            distance: true,
          }
        }
      }
    });

    logger.info(`✓ ${raceResults.length} race results gevonden`);
    
    if (raceResults.length > 0) {
      logger.info(`\n  Laatste 5 race results:`);
      raceResults.slice(0, 5).forEach((result, index) => {
        logger.info(`  ${index + 1}. Event ${result.eventId} - Position: ${result.position || 'N/A'}`);
        logger.info(`     Power: ${result.averagePower || 'N/A'}W (${result.averageWkg?.toFixed(2) || 'N/A'} W/kg)`);
        logger.info(`     Time: ${result.time ? `${Math.floor(result.time / 60)}:${(result.time % 60).toString().padStart(2, '0')}` : 'N/A'}`);
        
        if (result.event) {
          logger.info(`     Event: ${result.event.name}`);
          logger.info(`     Date: ${result.event.eventDate?.toISOString().split('T')[0] || 'N/A'}`);
          logger.info(`     Route: ${result.event.routeName || 'N/A'} (${result.event.distance || 'N/A'}km)`);
        }
      });
      
      logger.info(`\n  ✓ Relatie: RaceResult.riderId (${raceResults[0].riderId}) → Rider.id (${rider.id})`);
      logger.info(`  ✓ Relatie: RaceResult.eventId (${raceResults[0].eventId}) → Event.id (${raceResults[0].eventId})`);
    } else {
      logger.info('  ℹ️  Geen race results beschikbaar');
      logger.info('  💡 Sync via: POST /api/sync/event/:eventId');
    }

    // ============================================
    // 5. STATISTICS RELATIE
    // ============================================
    logger.info('\n📊 [5/5] STATISTICS RELATIE (1:1)');
    logger.info('─'.repeat(60));
    
    const statistics = await prisma.riderStatistics.findUnique({
      where: { riderId: rider.id },
    });

    if (statistics) {
      logger.info(`✓ Statistics record gevonden`);
      logger.info(`  Total Races: ${statistics.totalRaces || 0}`);
      logger.info(`  Wins: ${statistics.totalWins || 0} | Podiums: ${statistics.totalPodiums || 0} | Top 10: ${statistics.totalTop10 || 0}`);
      logger.info(`  DNFs: ${statistics.totalDNF || 0}`);
      logger.info(`  Avg Position: ${statistics.avgPosition?.toFixed(1) || 'N/A'}`);
      logger.info(`  Avg Power: ${statistics.avgPower || 'N/A'}W | Avg W/kg: ${statistics.avgWkg?.toFixed(2) || 'N/A'}`);
      logger.info(`  Best Position: ${statistics.bestPosition || 'N/A'}`);
      logger.info(`  Best Power: ${statistics.bestPower || 'N/A'}W | Best W/kg: ${statistics.bestWkg?.toFixed(2) || 'N/A'}`);
      logger.info(`  Recent 30d: ${statistics.recent30dRaces || 0} races, ${statistics.recent30dWins || 0} wins`);
      logger.info(`  Last Calculated: ${statistics.lastCalculated?.toISOString() || 'N/A'}`);
      
      logger.info(`\n  ✓ Relatie: RiderStatistics.riderId (${statistics.riderId}) → Rider.id (${rider.id}) [UNIQUE]`);
    } else {
      logger.info('  ℹ️  Geen statistics record');
      logger.info('  💡 Statistics worden automatisch berekend na het syncen van race results');
    }

    // ============================================
    // 6. COMPLETE QUERY TEST (alles in 1 query)
    // ============================================
    logger.info('\n🔗 [BONUS] COMPLETE QUERY MET ALLE RELATIES');
    logger.info('─'.repeat(60));
    
    const completeProfile = await prisma.rider.findUnique({
      where: { zwiftId: TARGET_RIDER_ZWIFT_ID },
      include: {
        club: true,
        raceResults: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { event: true }
        },
        historicalData: {
          take: 5,
          orderBy: { recordedAt: 'desc' }
        },
        statistics: true,
      }
    });

    logger.info('✓ Complete profile query uitgevoerd met Prisma includes');
    logger.info(`  Loaded relations:`);
    logger.info(`    - Club: ${completeProfile?.club ? '✓' : '✗'}`);
    logger.info(`    - Race Results: ${completeProfile?.raceResults.length || 0} records`);
    logger.info(`    - Historical Data: ${completeProfile?.historicalData.length || 0} snapshots`);
    logger.info(`    - Statistics: ${completeProfile?.statistics ? '✓' : '✗'}`);

    // ============================================
    // SAMENVATTING
    // ============================================
    logger.info('\n╔════════════════════════════════════════════════════════════════╗');
    logger.info('║                      TEST SAMENVATTING                         ║');
    logger.info('╚════════════════════════════════════════════════════════════════╝\n');

    const summary = {
      rider: '✓ Gevonden',
      club: rider.clubId ? '✓ Relatie actief' : '✗ Geen club',
      historicalData: `${historicalData.length} snapshots`,
      raceResults: `${raceResults.length} results`,
      statistics: statistics ? '✓ Beschikbaar' : '✗ Nog niet berekend',
    };

    logger.info('Status per relatie:');
    Object.entries(summary).forEach(([key, value]) => {
      const icon = value.includes('✓') ? '✅' : value.includes('✗') ? '⚠️' : 'ℹ️';
      logger.info(`  ${icon} ${key.padEnd(20)}: ${value}`);
    });

    logger.info('\n📍 Database Relaties:');
    logger.info('  1. Rider → Club          (via clubId FK)');
    logger.info('  2. Rider → RiderHistory  (via riderId FK, 1:M)');
    logger.info('  3. Rider → RaceResult    (via riderId FK, 1:M)');
    logger.info('  4. RaceResult → Event    (via eventId FK, M:1)');
    logger.info('  5. Rider → Statistics    (via riderId FK, 1:1 UNIQUE)');

    logger.info('\n🌐 API Endpoints:');
    logger.info(`  GET /api/riders/${TARGET_RIDER_ZWIFT_ID}`);
    logger.info(`  GET /api/riders/${TARGET_RIDER_ZWIFT_ID}/history`);
    logger.info(`  GET /api/riders/${TARGET_RIDER_ZWIFT_ID}/results`);
    logger.info(`  GET /api/club/members`);

    logger.info('\n✅ Test compleet!\n');

  } catch (error) {
    logger.error('❌ Test gefaald', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
testCompleteRiderProfile();
