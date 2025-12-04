#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
dotenv.config();

const { supabase } = await import('./src/services/supabase.service.js');

console.log('🔍 Checking table existence and row counts...\n');

const tables = [
  'riders',
  'riders_unified',
  'my_team_members',
  'zwift_api_race_results',
  'zwift_api_events'
];

for (const table of tables) {
  const { count, error } = await (supabase as any).client
    .from(table)
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log(`❌ ${table}: ${error.message}`);
  } else {
    console.log(`✅ ${table}: ${count} rows`);
  }
}
