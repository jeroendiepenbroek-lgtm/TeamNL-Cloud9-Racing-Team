#!/usr/bin/env node

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const BASE_URL = 'http://localhost:8080';
const SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testCompleteFlow() {
  console.log('\n🔍 COMPLETE TEAM MANAGEMENT FLOW TEST\n');
  console.log('━'.repeat(70));
  
  const RIDER_ID = 150437;
  let token;
  
  try {
    // Step 1: Login
    console.log('\n1️⃣  LOGIN');
    const loginRes = await axios.post(`${BASE_URL}/api/admin/login`, {
      email: 'admin@teamnl.cloud9',
      password: 'admin123'
    });
    token = loginRes.data.token;
    console.log('   ✅ Logged in as:', loginRes.data.admin.email);
    console.log('   Token:', token.substring(0, 50) + '...');
    
    // Step 2: Clean up existing rider first
    console.log('\n2️⃣  CLEANUP');
    console.log('   Removing rider if exists...');
    try {
      await axios.delete(`${BASE_URL}/api/admin/team/riders/${RIDER_ID}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('   ✅ Old rider removed');
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.log('   ℹ️  No existing rider to remove');
    }
    
    // Clean from database too
    await supabase.from('team_roster').delete().eq('rider_id', RIDER_ID);
    await supabase.from('api_zwiftracing_riders').delete().eq('rider_id', RIDER_ID);
    await supabase.from('api_zwift_official_profiles').delete().eq('rider_id', RIDER_ID);
    console.log('   ✅ Database cleaned');
    
    // Step 3: Add rider
    console.log('\n3️⃣  ADD RIDER');
    const addRes = await axios.post(
      `${BASE_URL}/api/admin/team/riders`,
      { rider_id: RIDER_ID },
      { headers: { Authorization: `Bearer ${token}` }}
    );
    console.log('   ✅ Rider added:', JSON.stringify(addRes.data, null, 2));
    console.log('   ⏳ Background sync started...');
    
    // Step 4: Wait and monitor
    console.log('\n4️⃣  MONITORING SYNC (checking every 3 seconds for 30 seconds)');
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 3000));
      
      const { data: roster } = await supabase
        .from('team_roster')
        .select('*')
        .eq('rider_id', RIDER_ID)
        .single();
      
      const { data: racing } = await supabase
        .from('api_zwiftracing_riders')
        .select('name, velo_live, ftp')
        .eq('rider_id', RIDER_ID)
        .maybeSingle();
      
      const { data: profile } = await supabase
        .from('api_zwift_official_profiles')
        .select('first_name, last_name, weight_kg')
        .eq('rider_id', RIDER_ID)
        .maybeSingle();
      
      console.log(`   [${i+1}/10] Roster: ${roster?.last_synced ? '✅' : '⏳'} | Racing: ${racing ? '✅' : '⏳'} | Profile: ${profile ? '✅' : '⏳'}`);
      
      if (racing && profile) {
        console.log('   🎉 SYNC COMPLETE!');
        break;
      }
    }
    
    // Step 5: Verify final state
    console.log('\n5️⃣  VERIFICATION');
    
    const { data: roster } = await supabase
      .from('team_roster')
      .select('*')
      .eq('rider_id', RIDER_ID)
      .single();
    
    if (roster) {
      console.log('   ✅ team_roster:');
      console.log('      - Added:', roster.added_at);
      console.log('      - Last synced:', roster.last_synced || 'Never');
      console.log('      - Active:', roster.is_active);
    } else {
      console.log('   ❌ NOT in team_roster');
    }
    
    const { data: racing } = await supabase
      .from('api_zwiftracing_riders')
      .select('*')
      .eq('rider_id', RIDER_ID)
      .maybeSingle();
    
    if (racing) {
      console.log('   ✅ api_zwiftracing_riders:');
      console.log('      - Name:', racing.name);
      console.log('      - vELO:', racing.velo_live);
      console.log('      - FTP:', racing.ftp + 'W');
      console.log('      - Wins:', racing.race_wins);
      console.log('      - Fetched:', racing.fetched_at);
    } else {
      console.log('   ❌ NOT in api_zwiftracing_riders');
    }
    
    const { data: profile } = await supabase
      .from('api_zwift_official_profiles')
      .select('*')
      .eq('rider_id', RIDER_ID)
      .maybeSingle();
    
    if (profile) {
      console.log('   ✅ api_zwift_official_profiles:');
      console.log('      - Name:', profile.first_name, profile.last_name);
      console.log('      - Weight:', profile.weight_kg + 'kg');
      console.log('      - Height:', profile.height_cm + 'cm');
      console.log('      - Fetched:', profile.fetched_at);
    } else {
      console.log('   ❌ NOT in api_zwift_official_profiles');
    }
    
    const { data: complete } = await supabase
      .from('v_rider_complete')
      .select('*')
      .eq('rider_id', RIDER_ID)
      .maybeSingle();
    
    if (complete) {
      console.log('   ✅ v_rider_complete:');
      console.log('      - Full name:', complete.full_name);
      console.log('      - vELO:', complete.velo_live);
      console.log('      - Racing FTP:', complete.racing_ftp + 'W');
      console.log('      - Weight:', complete.weight_kg + 'kg');
      console.log('      - Completeness:', complete.data_completeness);
    } else {
      console.log('   ❌ NOT in v_rider_complete');
    }
    
    // Step 6: Check sync logs
    console.log('\n6️⃣  SYNC LOGS');
    const { data: logs } = await supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(3);
    
    if (logs && logs.length > 0) {
      logs.forEach((log, i) => {
        console.log(`   [${i+1}] ${new Date(log.started_at).toLocaleTimeString()}`);
        console.log(`       Status: ${log.status}`);
        console.log(`       Synced: ${log.riders_synced}/${log.riders_synced + log.riders_failed}`);
        if (log.error_message) console.log(`       Error: ${log.error_message}`);
      });
    } else {
      console.log('   ℹ️  No sync logs found');
    }
    
    // Final verdict
    console.log('\n━'.repeat(70));
    if (complete) {
      console.log('\n✅ SUCCESS! Rider will appear in Racing Matrix dashboard');
    } else if (racing || profile) {
      console.log('\n⚠️  PARTIAL: Some data synced but not complete yet');
    } else {
      console.log('\n❌ FAILED: No data synced - check backend logs');
    }
    console.log('');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

testCompleteFlow().catch(console.error);
