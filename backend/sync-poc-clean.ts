/**
 * POC Clean Sync - Rider 150437 → riders_unified + my_team_members
 */
import dotenv from 'dotenv';
dotenv.config();

import { zwiftClient } from './src/api/zwift-client.js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const RIDER_ID = 150437;

async function syncPOC() {
  console.log('\n🔄 POC CLEAN SYNC - Rider 150437\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // 1. Fetch from ZwiftRacing API
  console.log('1️⃣  Fetching from ZwiftRacing.app...');
  const rider = await zwiftClient.getRider(RIDER_ID);
  
  console.log(`   ✅ ${rider.name}`);
  console.log(`      zpFTP: ${rider.zpFTP}W`);
  console.log(`      power_w1200: ${rider.power.w1200}W`);
  console.log(`      vELO: ${rider.race.current.rating}`);
  console.log('');
  
  // 2. Map to riders_unified format
  console.log('2️⃣  Mapping to riders_unified schema...');
  
  // Get first sample to see actual column names
  const sampleRes = await fetch(`${SUPABASE_URL}/rest/v1/riders_unified?limit=1`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const sample = await sampleRes.json();
  
  if (sample.length > 0) {
    console.log(`   Sample columns: ${Object.keys(sample[0]).slice(0, 20).join(', ')}...`);
  }
  console.log('');
  
  // 3. Insert rider
  console.log('3️⃣  Inserting rider 150437...');
  
  const dbRider: any = {
    rider_id: rider.riderId,
    name: rider.name,
    country_code: rider.country,
    weight_kg: rider.weight,
    height_cm: rider.height,
    zp_ftp: rider.zpFTP,
    category: rider.zpCategory,
    
    // Power data
    power_w5: rider.power.w5,
    power_w15: rider.power.w15,
    power_w30: rider.power.w30,
    power_w60: rider.power.w60,
    power_w120: rider.power.w120,
    power_w300: rider.power.w300,
    power_w1200: rider.power.w1200,
    
    power_wkg5: rider.power.wkg5,
    power_wkg15: rider.power.wkg15,
    power_wkg30: rider.power.wkg30,
    power_wkg60: rider.power.wkg60,
    power_wkg120: rider.power.wkg120,
    power_wkg300: rider.power.wkg300,
    power_wkg1200: rider.power.wkg1200,
    
    critical_power: rider.power.CP,
    anaerobic_work_capacity: rider.power.AWC,
    compound_score: rider.power.compoundScore,
    power_rating: rider.power.powerRating,
    
    // Race data
    velo_rating: rider.race.current.rating,
    velo_category: rider.race.current.mixed?.category,
    velo_rank: rider.race.current.mixed?.number,
    race_wins: rider.race.wins,
    race_podiums: rider.race.podiums,
    race_finishes: rider.race.finishes,
    
    // Phenotype
    phenotype: rider.phenotype.value,
    phenotype_sprinter: rider.phenotype.scores?.sprinter,
    phenotype_climber: rider.phenotype.scores?.climber,
    phenotype_pursuiter: rider.phenotype.scores?.pursuiter,
    phenotype_puncheur: rider.phenotype.scores?.puncheur,
    
    // Club
    club_id: rider.club?.id,
    club_name: rider.club?.name
  };
  
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/riders_unified`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(dbRider)
  });
  
  if (upsertRes.ok) {
    const result = await upsertRes.json();
    console.log(`   ✅ Rider inserted (${result.length} row affected)`);
  } else {
    const error = await upsertRes.text();
    console.log(`   ❌ Insert failed: ${error}`);
    console.log('   Debug: Trying to match column names...');
    
    // If failed, show which fields might be wrong
    if (sample.length > 0) {
      const availableColumns = Object.keys(sample[0]);
      const attemptedColumns = Object.keys(dbRider);
      const missing = attemptedColumns.filter(col => !availableColumns.includes(col));
      
      if (missing.length > 0) {
        console.log(`   Missing columns: ${missing.slice(0, 10).join(', ')}`);
      }
    }
  }
  
  // 4. Add to my_team_members
  console.log('');
  console.log('4️⃣  Adding to my_team_members...');
  
  // First check schema
  const teamSampleRes = await fetch(`${SUPABASE_URL}/rest/v1/my_team_members?limit=0`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact'
    }
  });
  
  const teamCount = teamSampleRes.headers.get('content-range')?.split('/')[1];
  console.log(`   Current team size: ${teamCount} members`);
  
  const teamRes = await fetch(`${SUPABASE_URL}/rest/v1/my_team_members`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=ignore-duplicates,return=representation'
    },
    body: JSON.stringify({ rider_id: RIDER_ID })
  });
  
  if (teamRes.ok || teamRes.status === 409) {
    console.log('   ✅ Added to my_team_members');
  } else {
    const error = await teamRes.text();
    console.log(`   ❌ Team add failed: ${error}`);
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('✅ POC Sync complete!\n');
}

syncPOC().catch(console.error);
