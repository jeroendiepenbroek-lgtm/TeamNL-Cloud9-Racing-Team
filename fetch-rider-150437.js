#!/usr/bin/env node

/**
 * Fetch Rider 150437 data en upload direct naar Supabase
 * API BASE: https://zwift-ranking.herokuapp.com (ZwiftRacing.app backend)
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RIDER_ID = 150437;
const API_BASE = 'https://zwift-ranking.herokuapp.com';
const API_KEY = '650c6d2fc4ef6858d74cbef1';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Fetch Rider 150437 Data → Supabase                       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

async function fetchIndividualRider() {
  console.log('📊 Fetching Individual Rider Data...');
  
  try {
    const response = await axios.get(
      `${API_BASE}/public/riders/${RIDER_ID}`,
      { 
        timeout: 10000,
        headers: { 'Authorization': API_KEY }
      }
    );
    
    if (response.data) {
      console.log(`   ✅ Fetched rider: ${response.data.name}`);
      console.log(`   vELO: ${response.data.velo}`);
      console.log(`   Racing Score: ${response.data.racingScore}\n`);
      return response.data;
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('   ❌ Still rate limited (401)\n');
    } else {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
    return null;
  }
}

async function fetchClubData() {
  console.log('📊 Fetching Club 11818 (TeamNL Cloud9) Data...');
  
  try {
    const response = await axios.get(
      `${API_BASE}/public/clubs/11818`,
      { 
        timeout: 15000,
        headers: { 'Authorization': API_KEY }
      }
    );
    
    if (response.data && response.data.riders) {
      const rider150437 = response.data.riders.find(r => r.riderId === RIDER_ID);
      
      console.log(`   ✅ Fetched club with ${response.data.riders.length} riders`);
      if (rider150437) {
        console.log(`   ✅ Found rider 150437 in club data`);
        console.log(`   Name: ${rider150437.name}`);
        console.log(`   vELO: ${rider150437.velo}\n`);
        return { club: response.data, riders: response.data.riders, rider150437 };
      } else {
        console.log(`   ⚠️  Rider 150437 not found in club\n`);
        return { club: response.data, riders: response.data.riders, rider150437: null };
      }
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('   ❌ Still rate limited (401)\n');
    } else {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
    return null;
  }
}

// ============================================================================
// UPLOAD FUNCTIONS
// ============================================================================

async function uploadIndividualRider(riderData) {
  if (!riderData) return;
  
  console.log('📤 Uploading to api_zwiftracing_public_riders_individual...');
  
  const record = {
    rider_id: riderData.riderId,
    source_api: 'zwiftracing.app',
    endpoint: '/public/riders/{id}',
    fetched_at: new Date().toISOString(),
    id: riderData.riderId,
    name: riderData.name,
    velo: riderData.velo,
    racing_score: riderData.racingScore,
    ftp: riderData.power?.wkg1200 ? Math.round(riderData.power.wkg1200 * (riderData.weight || 75)) : null,
    power_5s: riderData.power?.w5,
    power_15s: riderData.power?.w15,
    power_30s: riderData.power?.w30,
    power_60s: riderData.power?.w60,
    power_120s: riderData.power?.w120,
    power_300s: riderData.power?.w300,
    power_1200s: riderData.power?.w1200,
    power_5s_wkg: riderData.power?.wkg5,
    power_15s_wkg: riderData.power?.wkg15,
    power_30s_wkg: riderData.power?.wkg30,
    power_60s_wkg: riderData.power?.wkg60,
    power_120s_wkg: riderData.power?.wkg120,
    power_300s_wkg: riderData.power?.wkg300,
    power_1200s_wkg: riderData.power?.wkg1200,
    weight: riderData.weight,
    height: riderData.height,
    phenotype: riderData.phenotype?.value,
    category: null, // Not in individual endpoint
    race_count: riderData.race?.finishes || 0,
    zwift_id: riderData.zwiftId,
    country: null,
    age: null,
    raw_response: riderData
  };
  
  const { error } = await supabase
    .from('api_zwiftracing_public_riders_individual')
    .upsert(record, { onConflict: 'rider_id' });
  
  if (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  } else {
    console.log(`   ✅ Uploaded rider 150437\n`);
  }
}

async function uploadClubData(clubData) {
  if (!clubData) return;
  
  // Upload club info
  console.log('📤 Uploading to api_zwiftracing_public_clubs...');
  
  const clubRecord = {
    club_id: clubData.club.clubId,
    source_api: 'zwiftracing.app',
    endpoint: '/public/clubs/{id}',
    fetched_at: new Date().toISOString(),
    id: clubData.club.clubId,
    name: clubData.club.name,
    description: clubData.club.description,
    member_count: clubData.riders.length,
    raw_response: clubData.club
  };
  
  const { error: clubError } = await supabase
    .from('api_zwiftracing_public_clubs')
    .upsert(clubRecord, { onConflict: 'club_id' });
  
  if (clubError) {
    console.log(`   ❌ Error: ${clubError.message}\n`);
  } else {
    console.log(`   ✅ Uploaded club 11818\n`);
  }
  
  // Upload all riders
  console.log(`📤 Uploading ${clubData.riders.length} riders to api_zwiftracing_public_clubs_riders...`);
  
  const riderRecords = clubData.riders.map(r => ({
    rider_id: r.riderId,
    club_id: clubData.club.clubId,
    source_api: 'zwiftracing.app',
    endpoint: '/public/clubs/{id}',
    fetched_at: new Date().toISOString(),
    id: r.riderId,
    name: r.name,
    velo: r.velo,
    racing_score: r.racingScore,
    ftp: r.power?.wkg1200 ? Math.round(r.power.wkg1200 * (r.weight || 75)) : null,
    power_5s: r.power?.w5,
    power_15s: r.power?.w15,
    power_30s: r.power?.w30,
    power_60s: r.power?.w60,
    power_120s: r.power?.w120,
    power_300s: r.power?.w300,
    power_1200s: r.power?.w1200,
    power_5s_wkg: r.power?.wkg5,
    power_15s_wkg: r.power?.wkg15,
    power_30s_wkg: r.power?.wkg30,
    power_60s_wkg: r.power?.wkg60,
    power_120s_wkg: r.power?.wkg120,
    power_300s_wkg: r.power?.wkg300,
    power_1200s_wkg: r.power?.wkg1200,
    weight: r.weight,
    height: r.height,
    phenotype: r.phenotype?.value,
    category: null,
    race_count: r.race?.finishes || 0,
    zwift_id: r.zwiftId,
    country: null,
    age: null,
    raw_response: r
  }));
  
  // Batch upload (500 at a time)
  const batchSize = 500;
  let uploaded = 0;
  
  for (let i = 0; i < riderRecords.length; i += batchSize) {
    const batch = riderRecords.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('api_zwiftracing_public_clubs_riders')
      .upsert(batch, { onConflict: 'rider_id' });
    
    if (error) {
      console.log(`   ❌ Error uploading batch: ${error.message}\n`);
      break;
    }
    
    uploaded += batch.length;
    process.stdout.write(`   Uploaded ${uploaded}/${riderRecords.length}...\r`);
  }
  
  console.log(`\n   ✅ Uploaded ${uploaded} riders\n`);
}

// ============================================================================
// VERIFICATION
// ============================================================================

async function verifyData() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Check v_rider_complete
  const { data: riderComplete, error: rcError } = await supabase
    .from('v_rider_complete')
    .select('rider_id, full_name, velo, racing_score, data_completeness')
    .eq('rider_id', RIDER_ID)
    .single();
  
  if (rcError) {
    console.log('❌ v_rider_complete:', rcError.message);
  } else if (riderComplete) {
    console.log('✅ v_rider_complete:');
    console.log(`   Name: ${riderComplete.full_name}`);
    console.log(`   vELO: ${riderComplete.velo}`);
    console.log(`   Racing Score: ${riderComplete.racing_score}`);
    console.log(`   Data: ${riderComplete.data_completeness}\n`);
  } else {
    console.log('⚠️  v_rider_complete: No data found\n');
  }
  
  // Check team rankings
  const { data: teamRank, error: trError } = await supabase
    .from('v_team_rankings')
    .select('rider_id, name, velo, velo_rank, performance_grade')
    .eq('rider_id', RIDER_ID)
    .single();
  
  if (trError) {
    console.log('❌ v_team_rankings:', trError.message);
  } else if (teamRank) {
    console.log('✅ v_team_rankings:');
    console.log(`   Name: ${teamRank.name}`);
    console.log(`   vELO: ${teamRank.velo}`);
    console.log(`   Rank: #${teamRank.velo_rank}`);
    console.log(`   Grade: ${teamRank.performance_grade}\n`);
  } else {
    console.log('⚠️  v_team_rankings: Not found (rider not in club?)\n');
  }
  
  // Check total team members
  const { count: teamCount } = await supabase
    .from('api_zwiftracing_public_clubs_riders')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', 11818);
  
  console.log(`📊 Team Members in Database: ${teamCount || 0}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY not set!\n');
    console.log('export SUPABASE_SERVICE_KEY="your-key"');
    process.exit(1);
  }
  
  try {
    // Try individual rider first
    const individualData = await fetchIndividualRider();
    if (individualData) {
      await uploadIndividualRider(individualData);
    }
    
    // Then try club data
    const clubData = await fetchClubData();
    if (clubData) {
      await uploadClubData(clubData);
    }
    
    // Verify
    await verifyData();
    
    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ FETCH & UPLOAD COMPLETE!');
    console.log('════════════════════════════════════════════════════════════\n');
    
    console.log('Test in Supabase SQL Editor:');
    console.log('SELECT * FROM v_rider_complete WHERE rider_id = 150437;');
    console.log('SELECT * FROM v_team_rankings LIMIT 10;\n');
    
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

main();
