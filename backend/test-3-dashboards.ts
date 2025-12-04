#!/usr/bin/env npx tsx
/**
 * Test All 3 Dashboards met Unified Sourcing Strategy
 * 
 * 1. Racing Matrix Dashboard
 * 2. Results Dashboard  
 * 3. Events Dashboard
 * 
 * POC Rider: 150437 (JRøne CloudRacer-9 - Admin)
 */

import dotenv from 'dotenv';
dotenv.config();

const { supabase } = await import('./src/services/supabase.service.js');

console.log('🧪 Testing 3 Dashboards with Unified Sourcing Strategy\n');
console.log('POC Rider: 150437 (JRøne CloudRacer-9 - Admin)\n');
console.log('='.repeat(60));

// 1. RACING MATRIX DASHBOARD
console.log('\n\n1️⃣  RACING MATRIX DASHBOARD');
console.log('─'.repeat(60));

console.log('\n📊 Testing GET /api/riders/team equivalent...');
const { data: teamRiders, error: teamError } = await (supabase as any).client
  .from('view_my_team')
  .select('*')
  .limit(5);

if (teamError) {
  console.log('   ❌ Error:', teamError.message);
} else {
  console.log(`   ✅ Success: ${teamRiders?.length || 0} riders from view`);
  if (teamRiders && teamRiders.length > 0) {
    console.log('\n   Sample rider:');
    const sample = teamRiders[0];
    console.log(`   - Name: ${sample.name}`);
    console.log(`   - Rider ID: ${sample.rider_id}`);
    console.log(`   - FTP: ${sample.ftp || 'N/A'}`);
    console.log(`   - Category: ${sample.category || 'N/A'}`);
    console.log(`   - Velo Rating: ${sample.velo_rating || 'N/A'}`);
    
    // Check if POC rider 150437 is in team
    const pocRider = teamRiders.find((r: any) => r.rider_id === 150437);
    console.log(`\n   🎯 POC Rider 150437: ${pocRider ? '✅ IN TEAM' : '❌ NOT IN TEAM'}`);
  }
}

// 2. RESULTS DASHBOARD
console.log('\n\n2️⃣  RESULTS DASHBOARD');
console.log('─'.repeat(60));

console.log('\n📊 Testing GET /api/results/rider/150437...');
const { data: results, error: resultsError } = await (supabase as any).client
  .from('zwift_api_race_results')
  .select('event_id, event_name, event_date, rank, time_seconds, avg_wkg')
  .eq('rider_id', 150437)
  .order('event_date', { ascending: false })
  .limit(5);

if (resultsError) {
  console.log('   ❌ Error:', resultsError.message);
} else {
  console.log(`   ✅ Success: ${results?.length || 0} results found`);
  if (results && results.length > 0) {
    console.log('\n   Recent races:');
    results.forEach((r: any, i: number) => {
      const date = new Date(r.event_date).toLocaleDateString('nl-NL');
      console.log(`   ${i + 1}. ${r.event_name?.substring(0, 45)}...`);
      console.log(`      ${date} | Rank ${r.rank} | ${r.avg_wkg} w/kg | ${Math.floor(r.time_seconds/60)}:${(r.time_seconds%60).toString().padStart(2,'0')}`);
    });
  }
}

// Check most recent result date
const { data: latestResult } = await (supabase as any).client
  .from('zwift_api_race_results')
  .select('event_date, event_id')
  .eq('rider_id', 150437)
  .order('event_date', { ascending: false })
  .limit(1);

if (latestResult && latestResult.length > 0) {
  const latest = new Date(latestResult[0].event_date);
  console.log(`\n   📅 Latest result: ${latest.toLocaleDateString('nl-NL')} (Event ${latestResult[0].event_id})`);
  
  // Check for missing recent events
  const nov27 = new Date('2025-11-27');
  const nov30 = new Date('2025-11-30');
  if (latest < nov27) {
    console.log(`   ⚠️  Missing events: 27-11 (5206710) and 30-11 (5229579)`);
  } else if (latest < nov30) {
    console.log(`   ⚠️  Missing event: 30-11 (5229579)`);
  }
}

// 3. EVENTS DASHBOARD
console.log('\n\n3️⃣  EVENTS DASHBOARD');
console.log('─'.repeat(60));

console.log('\n📊 Testing GET /api/events...');
const { data: events, error: eventsError } = await (supabase as any).client
  .from('zwift_api_events')
  .select('event_id, title, time_unix, organizer')
  .order('time_unix', { ascending: false })
  .limit(5);

if (eventsError) {
  console.log('   ❌ Error:', eventsError.message);
} else {
  console.log(`   ✅ Success: ${events?.length || 0} events found`);
  if (events && events.length > 0) {
    console.log('\n   Recent events:');
    events.forEach((e: any, i: number) => {
      const date = new Date(e.time_unix * 1000).toLocaleDateString('nl-NL');
      console.log(`   ${i + 1}. ${e.title?.substring(0, 45)}...`);
      console.log(`      ${date} | Event ID: ${e.event_id} | Organizer: ${e.organizer || 'N/A'}`);
    });
  }
}

// Check signups for POC rider
console.log('\n📝 Checking event signups for rider 150437...');
const { data: signups, error: signupsError } = await (supabase as any).client
  .from('event_signups')
  .select('event_id, signed_up_at')
  .eq('rider_id', 150437)
  .limit(5);

if (signupsError) {
  console.log(`   ⚠️  Table might not exist: ${signupsError.message}`);
} else if (!signups || signups.length === 0) {
  console.log('   ℹ️  No signups found for rider 150437');
} else {
  console.log(`   ✅ Found ${signups.length} signups`);
  signups.forEach((s: any) => {
    console.log(`      - Event ${s.event_id} at ${new Date(s.signed_up_at).toLocaleString('nl-NL')}`);
  });
}

// SUMMARY
console.log('\n\n📊 DASHBOARD TEST SUMMARY');
console.log('='.repeat(60));

const matrixStatus = !teamError && teamRiders && teamRiders.length > 0;
const resultsStatus = !resultsError && results && results.length > 0;
const eventsStatus = !eventsError && events && events.length > 0;

console.log(`1. Racing Matrix: ${matrixStatus ? '✅ WORKING' : '❌ FAILED'}`);
console.log(`2. Results Dashboard: ${resultsStatus ? '✅ WORKING' : '❌ FAILED'}`);
console.log(`3. Events Dashboard: ${eventsStatus ? '✅ WORKING' : '❌ FAILED'}`);

if (matrixStatus && resultsStatus && eventsStatus) {
  console.log('\n🎉 All 3 dashboards operational!');
} else {
  console.log('\n⚠️  Some dashboards need attention');
}

// NEXT STEPS
console.log('\n\n📋 NEXT STEPS');
console.log('─'.repeat(60));

// Check unified table population
const { count: unifiedCount } = await (supabase as any).client
  .from('riders_unified')
  .select('*', { count: 'exact', head: true });

const { count: teamCount } = await (supabase as any).client
  .from('my_team_members')
  .select('*', { count: 'exact', head: true });

console.log(`\n1. Unified Sync Status:`);
console.log(`   - riders_unified: ${unifiedCount || 0} riders`);
console.log(`   - my_team_members: ${teamCount || 0} riders`);
if ((unifiedCount || 0) < (teamCount || 0)) {
  console.log(`   ⚠️  Missing ${(teamCount || 0) - (unifiedCount || 0)} riders in unified table`);
  console.log(`   → Run: POST /api/riders/sync to populate`);
}

console.log(`\n2. Results Sync:`);
if (latestResult && latestResult.length > 0) {
  const latest = new Date(latestResult[0].event_date);
  const today = new Date();
  const daysDiff = Math.floor((today.getTime() - latest.getTime()) / (1000 * 60 * 60 * 24));
  console.log(`   - Latest result: ${daysDiff} days old`);
  if (daysDiff > 7) {
    console.log(`   ⚠️  Results may be outdated`);
    console.log(`   → Sync events: 5206710 (27-11) and 5229579 (30-11)`);
  }
}

console.log(`\n3. Team Management:`);
console.log(`   - Admin: Rider 150437 (JRøne)`);
console.log(`   - Team size: ${teamCount || 0} members`);
console.log(`   → Add riders via: POST /api/team/members`);

console.log('\n✅ Dashboard testing complete!\n');
