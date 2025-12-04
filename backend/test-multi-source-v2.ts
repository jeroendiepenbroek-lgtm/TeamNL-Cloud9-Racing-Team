/**
 * Multi-Source Test v2 - Correct API structure
 */
import dotenv from 'dotenv';
dotenv.config();

import { zwiftClient } from './src/api/zwift-client.js';

const RIDER_ID = 150437;

async function testMultiSource() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       🧪 MULTI-SOURCE API TEST - RIDER 150437                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. ZwiftRacing.app (Primary)
    console.log('1️⃣  ZwiftRacing.app API:');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    const zwiftRacing = await zwiftClient.getRider(RIDER_ID);
    
    console.log(`✅ Rider: ${zwiftRacing.name}`);
    console.log(`   Country: ${zwiftRacing.country}`);
    console.log(`   Weight: ${zwiftRacing.weight}kg`);
    console.log(`   ZP Category: ${zwiftRacing.zpCategory}`);
    console.log(`   ZP FTP: ${zwiftRacing.zpFTP}W`);
    console.log('');
    
    // Power data
    if (zwiftRacing.power) {
      console.log(`   Power Curves:`);
      console.log(`     5s:   ${zwiftRacing.power.w5}W (${zwiftRacing.power.wkg5} W/kg)`);
      console.log(`     1min: ${zwiftRacing.power.w60}W (${zwiftRacing.power.wkg60} W/kg)`);
      console.log(`     20min: ${zwiftRacing.power.w1200}W (${zwiftRacing.power.wkg1200} W/kg)`);
      console.log('');
    }
    
    // Race data
    if (zwiftRacing.race?.current) {
      console.log(`   vELO Rating:`);
      console.log(`     Current: ${zwiftRacing.race.current.rating}`);
      console.log(`     Category: ${zwiftRacing.race.current.mixed?.category} (Rank ${zwiftRacing.race.current.mixed?.number})`);
      console.log(`     Wins: ${zwiftRacing.race.wins}`);
      console.log(`     Podiums: ${zwiftRacing.race.podiums}`);
      console.log('');
    }
    
    // Phenotype
    if (zwiftRacing.phenotype) {
      console.log(`   Phenotype: ${zwiftRacing.phenotype.value} (${zwiftRacing.phenotype.bias})`);
      console.log(`     Sprinter: ${zwiftRacing.phenotype.scores?.sprinter}`);
      console.log(`     Climber: ${zwiftRacing.phenotype.scores?.climber}`);
      console.log('');
    }
    
    // Club
    if (zwiftRacing.club) {
      console.log(`   Club: ${zwiftRacing.club.name} (ID: ${zwiftRacing.club.id})`);
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('✅ API structure verified - ready for database mapping\n');
    
    // Show full structure
    console.log('📊 Full API response structure:');
    console.log('   Top-level keys:', Object.keys(zwiftRacing).sort().join(', '));
    
    if (zwiftRacing.power) {
      console.log('   power.*:', Object.keys(zwiftRacing.power).sort().join(', '));
    }
    if (zwiftRacing.race) {
      console.log('   race.*:', Object.keys(zwiftRacing.race).sort().join(', '));
    }
    if (zwiftRacing.phenotype) {
      console.log('   phenotype.*:', Object.keys(zwiftRacing.phenotype).sort().join(', '));
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testMultiSource();
