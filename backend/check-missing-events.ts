#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
dotenv.config();

const { supabase } = await import('./src/services/supabase.service.js');

console.log('🔍 Checking race results for rider 150437...\n');

// Check alle results
const { data: allResults, error } = await (supabase as any).client
  .from('zwift_api_race_results')
  .select('event_id, event_name, event_date')
  .eq('rider_id', 150437)
  .order('event_date', { ascending: false });

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log(`✅ Found ${allResults.length} total results\n`);

// Check for specific events
const event5206710 = allResults.find((r: any) => r.event_id === '5206710');
const event5229579 = allResults.find((r: any) => r.event_id === '5229579');

console.log('🔎 Checking specific events:\n');
console.log(`Event 5206710 (27-11-2025): ${event5206710 ? '✅ FOUND' : '❌ MISSING'}`);
if (event5206710) {
  console.log(`   - ${event5206710.event_name}`);
  console.log(`   - Date: ${new Date(event5206710.event_date).toLocaleString('nl-NL')}`);
}

console.log(`\nEvent 5229579 (30-11-2025): ${event5229579 ? '✅ FOUND' : '❌ MISSING'}`);
if (event5229579) {
  console.log(`   - ${event5229579.event_name}`);
  console.log(`   - Date: ${new Date(event5229579.event_date).toLocaleString('nl-NL')}`);
}

// Show most recent races
console.log('\n📅 Most recent races in database:\n');
allResults.slice(0, 5).forEach((r: any, i: number) => {
  const date = new Date(r.event_date);
  console.log(`${i + 1}. ${r.event_name}`);
  console.log(`   Event ID: ${r.event_id} | Date: ${date.toLocaleString('nl-NL')}`);
});

// Check date range
const dates = allResults.map((r: any) => new Date(r.event_date));
const newest = new Date(Math.max(...dates.map(d => d.getTime())));
const oldest = new Date(Math.min(...dates.map(d => d.getTime())));

console.log(`\n📊 Date range in database:`);
console.log(`   Newest: ${newest.toLocaleString('nl-NL')}`);
console.log(`   Oldest: ${oldest.toLocaleString('nl-NL')}`);

// Check if dates are after 20-11-2025
const cutoff = new Date('2025-11-20');
const afterCutoff = allResults.filter((r: any) => new Date(r.event_date) > cutoff);
console.log(`\n   Results after 20-11-2025: ${afterCutoff.length}`);

if (!event5206710 || !event5229579) {
  console.log('\n❌ PROBLEEM: Events 5206710 en/of 5229579 ontbreken in database!');
  console.log('   → Deze moeten gesynchroniseerd worden vanuit ZwiftRacing API');
}
