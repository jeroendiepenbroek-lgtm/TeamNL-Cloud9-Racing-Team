#!/usr/bin/env npx tsx
/**
 * Check Unified Tables Status
 */

import dotenv from 'dotenv';
dotenv.config();

const { supabase } = await import('./src/services/supabase.service.js');

console.log('🔍 Checking Unified Architecture Tables...\n');

// Check riders_unified
console.log('1️⃣ riders_unified table:');
const { data: riders, error: ridersError } = await (supabase as any).client
  .from('riders_unified')
  .select('rider_id, name, race_last_date, zp_ftp')
  .order('race_last_date', { ascending: false })
  .limit(10);

if (ridersError) {
  console.log('   ❌ Error:', ridersError.message);
} else {
  console.log(`   ✅ Found ${riders?.length || 0} riders`);
  riders?.forEach((r: any) => {
    const lastRace = r.race_last_date ? new Date(r.race_last_date * 1000).toLocaleDateString('nl-NL') : 'Never';
    console.log(`      - ${r.name} (${r.rider_id}) | FTP: ${r.zp_ftp || '?'} | Last: ${lastRace}`);
  });
}

// Check zwift_api_race_results (results table)
console.log('\n2️⃣ zwift_api_race_results table:');
const { data: results, error: resultsError } = await (supabase as any).client
  .from('zwift_api_race_results')
  .select('event_id, event_name, event_date, rider_id')
  .order('event_date', { ascending: false })
  .limit(5);

if (resultsError) {
  console.log('   ❌ Error:', resultsError.message);
} else {
  console.log(`   ✅ Found ${results?.length || 0} recent results`);
  results?.forEach((r: any) => {
    const date = new Date(r.event_date).toLocaleDateString('nl-NL');
    console.log(`      - Event ${r.event_id} (${date}): ${r.event_name?.substring(0, 50)}...`);
  });
}

// Check my_team_members
console.log('\n3️⃣ my_team_members table:');
const { data: team, error: teamError } = await (supabase as any).client
  .from('my_team_members')
  .select('rider_id, is_active');

if (teamError) {
  console.log('   ❌ Error:', teamError.message);
} else {
  console.log(`   ✅ Found ${team?.length || 0} team members`);
  const active = team?.filter((t: any) => t.is_active).length || 0;
  console.log(`      Active: ${active} / ${team?.length || 0}`);
}

// Check view_my_team
console.log('\n4️⃣ view_my_team (unified view):');
const { data: viewData, error: viewError } = await (supabase as any).client
  .from('view_my_team')
  .select('rider_id, name')
  .limit(5);

if (viewError) {
  console.log('   ❌ Error:', viewError.message);
} else {
  console.log(`   ✅ View working: ${viewData?.length || 0} riders`);
}

console.log('\n📊 Summary:');
console.log(`   - Unified riders: ${riders?.length || 0}`);
console.log(`   - Race results: ${results?.length || 0}`);
console.log(`   - Team members: ${team?.length || 0}`);
console.log(`   - View working: ${viewData ? '✅' : '❌'}`);
