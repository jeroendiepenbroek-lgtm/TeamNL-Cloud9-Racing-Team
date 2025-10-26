#!/usr/bin/env tsx
/**
 * Sync ALLE beschikbare data voor een specifieke rider via relaties
 * Gebruikt externe API endpoints om complete rider profile op te bouwen
 */

import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { RiderRepository, ResultRepository } from '../src/database/repositories.js';
import { config } from '../src/utils/config.js';
import { logger } from '../src/utils/logger.js';
import { prisma } from '../src/database/client.js';

const TARGET_RIDER_ID = 150437; // JRøne

async function syncCompleteRiderProfile() {
  try {
    logger.info('🔗 Start complete rider profile sync met relaties');
    logger.info(`👤 Target Rider: ${TARGET_RIDER_ID}`);

    const apiClient = new ZwiftApiClient({
      apiKey: config.zwiftApiKey,
      baseUrl: config.zwiftApiBaseUrl,
    });

    const riderRepo = new RiderRepository();
    const resultRepo = new ResultRepository();

    // ============================================
    // 1. BASIS RIDER DATA
    // ============================================
    logger.info('\n📊 [1/4] Ophalen rider basis data...');
    
    const riderData = await apiClient.getRider(TARGET_RIDER_ID);
    logger.info(`✓ Rider data opgehaald: ${riderData.name}`);
    
    // Sla rider op in database
    const savedRider = await riderRepo.upsertRider(riderData, config.zwiftClubId);
    logger.info(`✓ Rider opgeslagen in database (ID: ${savedRider.id})`);

    // ============================================
    // 2. HISTORISCHE DATA (at specific times)
    // ============================================
    logger.info('\n📈 [2/4] Ophalen historische snapshots...');
    
    const now = Math.floor(Date.now() / 1000);
    const timestamps = [
      { label: 'Nu', time: now },
      { label: '30 dagen geleden', time: now - (30 * 24 * 60 * 60) },
      { label: '60 dagen geleden', time: now - (60 * 24 * 60 * 60) },
      { label: '90 dagen geleden', time: now - (90 * 24 * 60 * 60) },
    ];

    logger.info('⏳ Wacht 12 seconden tussen historische queries (rate limit: 5/min)...');
    
    for (const { label, time } of timestamps) {
      try {
        const historicalData = await apiClient.getRiderAtTime(TARGET_RIDER_ID, time);
        
        // Sla snapshot op
        await prisma.riderHistory.create({
          data: {
            riderId: savedRider.id,
            ftp: historicalData.ftp,
            weight: historicalData.weight,
            ranking: historicalData.ranking,
            rankingScore: historicalData.rankingScore,
            powerToWeight: historicalData.powerToWeight,
            snapshotType: 'manual',
            triggeredBy: 'api_sync',
            recordedAt: new Date(time * 1000),
          },
        });
        
        logger.info(`✓ Snapshot opgeslagen: ${label} (FTP: ${historicalData.ftp || 'N/A'}, Weight: ${historicalData.weight || 'N/A'})`);
        
        // Wacht 12 seconden (5 calls per minuut = 1 per 12 sec)
        if (label !== timestamps[timestamps.length - 1].label) {
          await new Promise(resolve => setTimeout(resolve, 12000));
        }
      } catch (error) {
        logger.warn(`⚠️  Kon snapshot niet ophalen voor ${label}:`, error instanceof Error ? error.message : error);
      }
    }

    // ============================================
    // 3. RACE RESULTS (via events)
    // ============================================
    logger.info('\n🏁 [3/4] Ophalen race results...');
    
    // Haal huidige race results op uit database
    const existingResults = await resultRepo.getRiderResults(savedRider.id, 100);
    logger.info(`✓ ${existingResults.length} bestaande race results gevonden in database`);

    if (existingResults.length > 0) {
      logger.info('\n📋 Laatste 5 race results:');
      existingResults.slice(0, 5).forEach(result => {
        logger.info(`   🏆 Event ${result.eventId} - Position: ${result.position || 'N/A'} | Power: ${result.averagePower || 'N/A'}W | W/kg: ${result.averageWkg || 'N/A'}`);
      });
    } else {
      logger.info('ℹ️  Geen race results gevonden - voeg events toe via /api/sync/event/:eventId');
    }

    // ============================================
    // 4. COMPLETE PROFILE OPHALEN
    // ============================================
    logger.info('\n📦 [4/4] Ophalen complete profile met relaties...');
    
    const completeProfile = await prisma.rider.findUnique({
      where: { zwiftId: TARGET_RIDER_ID },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            memberCount: true,
          }
        },
        raceResults: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            event: {
              select: {
                name: true,
                eventDate: true,
                routeName: true,
                distance: true,
              }
            }
          }
        },
        historicalData: {
          take: 10,
          orderBy: { recordedAt: 'desc' },
        },
        statistics: true,
      }
    });

    // ============================================
    // RESULTAAT WEERGEVEN
    // ============================================
    logger.info('\n╔════════════════════════════════════════════════════════════════╗');
    logger.info('║            COMPLETE RIDER PROFILE MET RELATIES                 ║');
    logger.info('╚════════════════════════════════════════════════════════════════╝\n');

    if (completeProfile) {
      logger.info('👤 RIDER INFO:');
      logger.info(`   Name: ${completeProfile.name}`);
      logger.info(`   Zwift ID: ${completeProfile.zwiftId}`);
      logger.info(`   Category: ${completeProfile.categoryRacing || 'N/A'}`);
      logger.info(`   FTP: ${completeProfile.ftp || 'N/A'} W (${completeProfile.ftpWkg?.toFixed(2) || 'N/A'} W/kg)`);
      logger.info(`   Weight: ${completeProfile.weight || 'N/A'} kg | Height: ${completeProfile.height || 'N/A'} cm`);
      logger.info(`   Gender: ${completeProfile.gender || 'N/A'} | Country: ${completeProfile.countryCode || 'N/A'}`);

      if (completeProfile.club) {
        logger.info('\n🏆 CLUB (via relatie):');
        logger.info(`   Name: ${completeProfile.club.name}`);
        logger.info(`   ID: ${completeProfile.club.id}`);
        logger.info(`   Members: ${completeProfile.club.memberCount}`);
      }

      if (completeProfile.historicalData.length > 0) {
        logger.info('\n📈 HISTORY (via relatie):');
        logger.info(`   ${completeProfile.historicalData.length} snapshots beschikbaar`);
        completeProfile.historicalData.slice(0, 3).forEach((snap: any) => {
          const date = snap.recordedAt.toISOString().split('T')[0];
          logger.info(`   • ${date}: FTP ${snap.ftp || 'N/A'}W, Weight ${snap.weight || 'N/A'}kg, Ranking ${snap.ranking || 'N/A'}`);
        });
      }

      if (completeProfile.raceResults.length > 0) {
        logger.info('\n🏁 RACE RESULTS (via relatie):');
        logger.info(`   ${completeProfile.raceResults.length} results beschikbaar`);
        completeProfile.raceResults.slice(0, 3).forEach((result: any) => {
          logger.info(`   • Event ${result.eventId}: Pos ${result.position || 'N/A'} | ${result.averagePower || 'N/A'}W (${result.averageWkg || 'N/A'} W/kg)`);
          if (result.event) {
            logger.info(`     └─ ${result.event.name || 'Unknown event'} - ${result.event.routeName || 'N/A'}`);
          }
        });
      }

      if (completeProfile.statistics) {
        logger.info('\n📊 STATISTICS (via relatie):');
        const stats = completeProfile.statistics;
        logger.info(`   Total Races: ${stats.totalRaces || 0}`);
        logger.info(`   Wins: ${stats.totalWins || 0} | Podiums: ${stats.totalPodiums || 0} | Top 10: ${stats.totalTop10 || 0}`);
        logger.info(`   Avg Position: ${stats.avgPosition || 'N/A'}`);
        logger.info(`   Best Power: ${stats.bestPower || 'N/A'}W | Best W/kg: ${stats.bestWkg || 'N/A'}`);
      }
    }

    logger.info('\n✅ Complete rider profile sync afgerond!');
    logger.info('\n💡 Beschikbare API endpoints:');
    logger.info(`   GET /api/riders/${TARGET_RIDER_ID}`);
    logger.info(`   GET /api/riders/${TARGET_RIDER_ID}/history`);
    logger.info(`   GET /api/riders/${TARGET_RIDER_ID}/results`);

  } catch (error) {
    logger.error('❌ Sync gefaald', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run script
syncCompleteRiderProfile();
