#!/usr/bin/env node

/**
 * Test script voor de nieuwe sync service
 * Test: Voeg rider 150437 toe en check of data gesynchroniseerd wordt
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testSync() {
  console.log('\n🧪 Testing Sync Service\n');
  console.log('━'.repeat(60));
  
  const RIDER_ID = 150437;
  
  // Check if rider exists in team_roster
  console.log(`\n1️⃣  Checking team_roster for rider ${RIDER_ID}...`);
  const { data: roster } = await supabase
    .from('team_roster')
    .select('*')
    .eq('rider_id', RIDER_ID)
    .single();
  
  if (roster) {
    console.log(`   ✅ Rider ${RIDER_ID} in team_roster`);
    console.log(`   Added: ${roster.added_at}`);
    console.log(`   Last synced: ${roster.last_synced || 'Never'}`);
  } else {
    console.log(`   ❌ Rider ${RIDER_ID} NOT in team_roster`);
    console.log(`   💡 Add via admin dashboard first!`);
    return;
  }
  
  // Check ZwiftRacing data
  console.log(`\n2️⃣  Checking api_zwiftracing_riders...`);
  const { data: racingData } = await supabase
    .from('api_zwiftracing_riders')
    .select('*')
    .eq('rider_id', RIDER_ID)
    .single();
  
  if (racingData) {
    console.log(`   ✅ ZwiftRacing data found!`);
    console.log(`   Name: ${racingData.name}`);
    console.log(`   vELO: ${racingData.velo_live}`);
    console.log(`   FTP: ${racingData.ftp}W`);
    console.log(`   Wins: ${racingData.race_wins}`);
    console.log(`   Fetched: ${racingData.fetched_at}`);
  } else {
    console.log(`   ❌ No ZwiftRacing data yet`);
    console.log(`   ⏳ Sync may still be running...`);
  }
  
  // Check Zwift Official data
  console.log(`\n3️⃣  Checking api_zwift_official_profiles...`);
  const { data: profileData } = await supabase
    .from('api_zwift_official_profiles')
    .select('*')
    .eq('rider_id', RIDER_ID)
    .single();
  
  if (profileData) {
    console.log(`   ✅ Zwift Official data found!`);
    console.log(`   Name: ${profileData.first_name} ${profileData.last_name}`);
    console.log(`   Weight: ${profileData.weight_kg}kg`);
    console.log(`   Height: ${profileData.height_cm}cm`);
    console.log(`   Avatar: ${profileData.avatar_url ? '✅' : '❌'}`);
    console.log(`   Fetched: ${profileData.fetched_at}`);
  } else {
    console.log(`   ❌ No Zwift Official data yet`);
    console.log(`   ⏳ Sync may still be running...`);
  }
  
  // Check v_rider_complete view
  console.log(`\n4️⃣  Checking v_rider_complete view...`);
  const { data: completeData } = await supabase
    .from('v_rider_complete')
    .select('*')
    .eq('rider_id', RIDER_ID)
    .single();
  
  if (completeData) {
    console.log(`   ✅ Rider visible in v_rider_complete!`);
    console.log(`   Full name: ${completeData.full_name}`);
    console.log(`   vELO: ${completeData.velo_live}`);
    console.log(`   Racing FTP: ${completeData.racing_ftp}W`);
    console.log(`   Weight: ${completeData.weight_kg}kg`);
    console.log(`   Data completeness: ${completeData.data_completeness}`);
    console.log(`\n   🎉 SUCCESS! Rider will appear in Racing Matrix`);
  } else {
    console.log(`   ❌ Not visible in v_rider_complete yet`);
    console.log(`   💡 Wait a few seconds for sync to complete`);
  }
  
  // Check recent sync logs
  console.log(`\n5️⃣  Checking recent sync logs...`);
  const { data: logs } = await supabase
    .from('sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(3);
  
  if (logs && logs.length > 0) {
    console.log(`   📊 Recent syncs:`);
    logs.forEach(log => {
      console.log(`   - ${log.started_at}: ${log.status} (${log.riders_synced}/${log.riders_synced + log.riders_failed} riders)`);
    });
  } else {
    console.log(`   ℹ️  No sync logs yet`);
  }
  
  console.log('\n' + '━'.repeat(60));
  console.log('\n✅ Test complete!\n');
}

testSync().catch(console.error);
