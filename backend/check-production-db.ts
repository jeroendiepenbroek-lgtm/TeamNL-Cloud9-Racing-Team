#!/usr/bin/env npx tsx

/**
 * Check Production Database Schema
 */

import dotenv from 'dotenv';
dotenv.config();

// Use existing Supabase client from service
const { supabase } = await import('./src/services/supabase.service.js');
const client = (supabase as any).client;

console.log('🔍 Checking production database...');

// Check if zwift_api_race_results table exists and has data
console.log('\n📊 Checking zwift_api_race_results table...');

const { data: results, error: resultsError, count } = await client
  .from('zwift_api_race_results')
  .select('*', { count: 'exact', head: false })
  .eq('rider_id', 150437)
  .limit(1);

console.log('Results:', {
  exists: !resultsError,
  error: resultsError?.message,
  count,
  sample: results?.[0] ? 'Has data' : 'Empty'
});

// Check race_results as alternative
console.log('\n📊 Checking race_results table...');

const { data: raceResults, error: raceError, count: raceCount } = await client
  .from('race_results')
  .select('*', { count: 'exact', head: false })
  .eq('rider_id', 150437)
  .limit(1);

console.log('Race Results:', {
  exists: !raceError,
  error: raceError?.message,
  count: raceCount,
  sample: raceResults?.[0] ? 'Has data' : 'Empty'
});

// List all tables
console.log('\n📋 Available tables:');
const { data: tables, error: tablesError } = await client
  .from('information_schema.tables')
  .select('table_name')
  .eq('table_schema', 'public')
  .like('table_name', '%result%');

if (tables) {
  tables.forEach((t: any) => console.log('  -', t.table_name));
}
