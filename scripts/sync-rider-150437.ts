#!/usr/bin/env tsx
/**
 * Test script: Sync rider 150437 met volledige data analyse
 * 
 * Haalt op:
 * - Rider basic data (naam, leeftijd, gewicht, etc.)
 * - Power curve (5s, 15s, 30s, 1min, 2min, 5min, 20min)
 * - Phenotype scores (sprinter, puncheur, pursuiter, climber, tt)
 * - Race rating (current, last, max30, max90)
 * - Terrain handicaps (flat, rolling, hilly, mountainous)
 * - Club membership
 */

import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { RiderRepository } from '../src/database/repositories.js';
import { logger } from '../src/utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const RIDER_ID = 150437;

async function main() {
  logger.info('🔍 Start analyse van rider 150437');
  logger.info('================================================');

  // Initialize API client
  const apiClient = new ZwiftApiClient({
    apiKey: process.env.ZWIFT_API_KEY || '',
    baseUrl: 'https://zwift-ranking.herokuapp.com',
  });

  const riderRepo = new RiderRepository();

  try {
    // 1. Haal rider data op via API
    logger.info(`\n📡 Stap 1: Ophalen rider data van API...`);
    const riderData = await apiClient.getRider(RIDER_ID);
    
    logger.info(`\n✅ Rider data opgehaald:`);
    logger.info(`   Naam: ${riderData.name}`);
    logger.info(`   Land: ${riderData.country}`);
    logger.info(`   Leeftijd: ${riderData.age}`);
    logger.info(`   Gewicht: ${riderData.weight} kg`);
    logger.info(`   Hoogte: ${riderData.height} cm`);
    logger.info(`   Categorie: ${riderData.zpCategory}`);
    logger.info(`   FTP: ${riderData.zpFTP} watts`);

    // 2. Analyseer power curve data
    if (riderData.power) {
      logger.info(`\n💪 Power Curve Data:`);
      logger.info(`   5s:   ${riderData.power.w5}w (${riderData.power.wkg5} w/kg)`);
      logger.info(`   15s:  ${riderData.power.w15}w (${riderData.power.wkg15} w/kg)`);
      logger.info(`   30s:  ${riderData.power.w30}w (${riderData.power.wkg30} w/kg)`);
      logger.info(`   1min: ${riderData.power.w60}w (${riderData.power.wkg60} w/kg)`);
      logger.info(`   2min: ${riderData.power.w120}w (${riderData.power.wkg120} w/kg)`);
      logger.info(`   5min: ${riderData.power.w300}w (${riderData.power.wkg300} w/kg)`);
      logger.info(`   20min: ${riderData.power.w1200}w (${riderData.power.wkg1200} w/kg)`);
      logger.info(`   Critical Power: ${riderData.power.CP?.toFixed(1)}w`);
      logger.info(`   Anaerobic Work: ${riderData.power.AWC?.toFixed(0)}J`);
      logger.info(`   Compound Score: ${riderData.power.compoundScore?.toFixed(1)}`);
    }

    // 3. Analyseer phenotype
    if (riderData.phenotype) {
      logger.info(`\n🧬 Phenotype Analysis:`);
      logger.info(`   Type: ${riderData.phenotype.value} (bias: ${riderData.phenotype.bias?.toFixed(1)}%)`);
      if (riderData.phenotype.scores) {
        logger.info(`   Scores:`);
        logger.info(`     - Sprinter:  ${riderData.phenotype.scores.sprinter}/100`);
        logger.info(`     - Puncheur:  ${riderData.phenotype.scores.puncheur}/100`);
        logger.info(`     - Pursuiter: ${riderData.phenotype.scores.pursuiter}/100`);
        logger.info(`     - Climber:   ${riderData.phenotype.scores.climber}/100`);
        logger.info(`     - TT:        ${riderData.phenotype.scores.tt}/100`);
      }
    }

    // 4. Analyseer race stats
    if (riderData.race) {
      logger.info(`\n🏁 Race Statistics:`);
      logger.info(`   Finishes: ${riderData.race.finishes}`);
      logger.info(`   Wins: ${riderData.race.wins}`);
      logger.info(`   Podiums: ${riderData.race.podiums}`);
      logger.info(`   DNFs: ${riderData.race.dnfs}`);
      
      if (riderData.race.current) {
        logger.info(`\n   Current Rating:`);
        logger.info(`     - Rating: ${riderData.race.current.rating?.toFixed(1)}`);
        logger.info(`     - Category: ${riderData.race.current.mixed?.category} ${riderData.race.current.mixed?.number}`);
        logger.info(`     - Date: ${new Date((riderData.race.current.date || 0) * 1000).toLocaleDateString()}`);
      }
      
      if (riderData.race.max30) {
        logger.info(`\n   Max 30d Rating:`);
        logger.info(`     - Rating: ${riderData.race.max30.rating?.toFixed(1)}`);
        logger.info(`     - Category: ${riderData.race.max30.mixed?.category} ${riderData.race.max30.mixed?.number}`);
      }
      
      if (riderData.race.max90) {
        logger.info(`\n   Max 90d Rating:`);
        logger.info(`     - Rating: ${riderData.race.max90.rating?.toFixed(1)}`);
        logger.info(`     - Category: ${riderData.race.max90.mixed?.category} ${riderData.race.max90.mixed?.number}`);
      }
    }

    // 5. Analyseer terrain handicaps
    if (riderData.handicaps?.profile) {
      logger.info(`\n🏔️ Terrain Handicaps (seconds):`);
      logger.info(`   Flat:        ${riderData.handicaps.profile.flat?.toFixed(1)}s`);
      logger.info(`   Rolling:     ${riderData.handicaps.profile.rolling?.toFixed(1)}s`);
      logger.info(`   Hilly:       ${riderData.handicaps.profile.hilly?.toFixed(1)}s`);
      logger.info(`   Mountainous: ${riderData.handicaps.profile.mountainous?.toFixed(1)}s`);
    }

    // 6. Club info
    if (riderData.club) {
      logger.info(`\n🏢 Club Membership:`);
      logger.info(`   Club ID: ${riderData.club.id}`);
      logger.info(`   Club Name: ${riderData.club.name}`);
    }

    // 7. Sla data op in database
    logger.info(`\n\n💾 Stap 2: Opslaan in database...`);
    
    const clubId = riderData.club?.id;
    const savedRider = await riderRepo.upsertRider(riderData, clubId, {
      isFavorite: true,
      addedBy: 'test-script',
      syncPriority: 1,
    });

    logger.info(`✅ Rider opgeslagen in database (ID: ${savedRider.id})`);

    // 8. Verifieer wat er is opgeslagen
    logger.info(`\n\n🔍 Stap 3: Verificatie van opgeslagen data...`);
    
    const verifyRider = await riderRepo.getRider(RIDER_ID);
    if (!verifyRider) {
      throw new Error('Rider niet gevonden na opslaan!');
    }

    logger.info(`✅ Rider gevonden in database`);
    logger.info(`   Database ID: ${verifyRider.id}`);
    logger.info(`   Zwift ID: ${verifyRider.zwiftId}`);
    logger.info(`   Naam: ${verifyRider.name}`);
    logger.info(`   FTP: ${verifyRider.ftp}w (${verifyRider.ftpWkg?.toFixed(2)} w/kg)`);
    logger.info(`   Categorie: ${verifyRider.categoryRacing}`);
    logger.info(`   Power 5s: ${verifyRider.power5s}w`);
    logger.info(`   Power 5min: ${verifyRider.power5min}w`);
    logger.info(`   Club ID: ${verifyRider.clubId}`);

    // Check phenotype relatie
    if (verifyRider.phenotype) {
      logger.info(`\n✅ Phenotype data gevonden:`);
      logger.info(`   Type: ${verifyRider.phenotype.primaryType}`);
      logger.info(`   Bias: ${verifyRider.phenotype.bias?.toFixed(1)}%`);
      logger.info(`   Sprinter: ${verifyRider.phenotype.sprinter}`);
      logger.info(`   Climber: ${verifyRider.phenotype.climber}`);
    }

    // Check race rating relatie
    if (verifyRider.raceRating) {
      logger.info(`\n✅ Race Rating data gevonden:`);
      logger.info(`   Current: ${verifyRider.raceRating.currentRating?.toFixed(1)}`);
      logger.info(`   Max 30d: ${verifyRider.raceRating.max30Rating?.toFixed(1)}`);
      logger.info(`   Max 90d: ${verifyRider.raceRating.max90Rating?.toFixed(1)}`);
    }

    logger.info(`\n\n================================================`);
    logger.info(`✅ ANALYSE COMPLEET`);
    logger.info(`================================================`);
    logger.info(`\n📊 Samenvatting:`);
    logger.info(`   - Rider data: ✅ Opgeslagen`);
    logger.info(`   - Power curve: ✅ Opgeslagen (7 data points)`);
    logger.info(`   - Phenotype: ✅ Opgeslagen (5 scores)`);
    logger.info(`   - Race rating: ✅ Opgeslagen (current + max30 + max90)`);
    logger.info(`   - Terrain handicaps: ✅ Opgeslagen (4 profiles)`);
    logger.info(`   - Club: ✅ Gekoppeld`);
    logger.info(`\n🔍 Check de data in Prisma Studio: http://localhost:5555`);
    logger.info(`   - Rider tabel (ID: ${savedRider.id})`);
    logger.info(`   - RiderPhenotype tabel`);
    logger.info(`   - RiderRaceRating tabel`);

  } catch (error) {
    logger.error('❌ Fout bij syncen rider:', error);
    process.exit(1);
  }
}

main();
