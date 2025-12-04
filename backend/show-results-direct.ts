#!/usr/bin/env npx tsx

/**
 * Direct Results API Test - Bypass Server
 * Simuleert /api/results/rider/150437?days=30
 */

import dotenv from 'dotenv';
dotenv.config();

const { supabase } = await import('./src/services/supabase.service.js');

const riderId = 150437;
const days = 30;
const limit = 50;

console.log(`\n🔍 Fetching results for rider ${riderId} (last ${days} days, limit ${limit})...\n`);

try {
  const results = await (supabase as any).getRiderResults(riderId, days, limit);
  
  console.log(`✅ SUCCESS: Got ${results.length} race results\n`);
  
  // Show first 3 results
  console.log('📋 Sample results:');
  results.slice(0, 3).forEach((result: any, idx: number) => {
    console.log(`\n${idx + 1}. ${result.event_name}`);
    console.log(`   Date: ${new Date(result.event_date).toLocaleDateString('nl-NL')}`);
    console.log(`   Rank: ${result.rank} / ${result.total_riders || '?'}`);
    console.log(`   Time: ${Math.floor(result.time_seconds / 60)}:${(result.time_seconds % 60).toString().padStart(2, '0')}`);
    console.log(`   Power: ${result.avg_wkg} w/kg`);
    console.log(`   Category: ${result.pen || 'N/A'}`);
  });
  
  console.log(`\n... and ${results.length - 3} more results`);
  console.log(`\n✅ Results page kan gevuld worden met deze ${results.length} races!\n`);
  
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
