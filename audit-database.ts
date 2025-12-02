#!/usr/bin/env node

/**
 * Supabase Database Audit Tool
 * Inventariseer alle bestaande tables en views
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🔍 Supabase Database Audit Tool');
console.log('================================\n');

/**
 * Query database metadata
 */
async function queryDatabase(query: string): Promise<any> {
  const { data, error } = await supabase.rpc('query', { sql: query }).catch(async () => {
    // Fallback: gebruik direct connection via REST
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: query })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    return { data: await response.json(), error: null };
  });
  
  if (error) throw error;
  return data;
}

/**
 * Get all tables
 */
async function getTables() {
  console.log('📊 PUBLIC TABLES');
  console.log('─────────────────\n');
  
  const { data: tables, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');
  
  if (error) {
    console.error('Error fetching tables:', error.message);
    return [];
  }
  
  return tables || [];
}

/**
 * Main execution
 */
async function main() {
  try {
    // Method 1: Query via Supabase client (limited access)
    console.log('Method 1: Querying via Supabase client...\n');
    
    const { data: tableCount, error: countError } = await supabase
      .rpc('count_tables')
      .catch(() => ({ data: null, error: { message: 'RPC not available' }}));
    
    if (countError) {
      console.log('⚠️  RPC access limited, using alternative method\n');
    }
    
    // Method 2: List known tables from migrations
    console.log('📋 Known Tables (from migrations):\n');
    
    const knownTables = [
      // New unified tables (Migration 018)
      'riders_unified',
      'rider_rating_history', 
      'rider_activities',
      'events_unified',
      'event_signups_unified',
      'race_results_unified',
      'sync_status_unified',
      
      // Legacy tables (to identify)
      'riders',
      'clubs',
      'events',
      'event_results',
      'event_signups',
      'routes',
      'sync_logs',
      
      // Sourcing tables
      'zwift_api_riders',
      'zwift_api_events',
      'zwift_api_signups',
      'zwift_api_results',
      'zwiftpower_riders',
      'zwiftpower_results',
      
      // Views
      'rider_stats_view',
      'event_summary_view'
    ];
    
    console.log('NEW (Unified Schema):');
    console.log('  ✅ riders_unified');
    console.log('  ✅ rider_rating_history');
    console.log('  ✅ rider_activities');
    console.log('  ✅ events_unified');
    console.log('  ✅ event_signups_unified');
    console.log('  ✅ race_results_unified');
    console.log('  ✅ sync_status_unified\n');
    
    console.log('LEGACY (To deprecate/migrate):');
    console.log('  ⚠️  riders (replaced by riders_unified)');
    console.log('  ⚠️  clubs (data merged into riders_unified)');
    console.log('  ⚠️  events (replaced by events_unified)');
    console.log('  ⚠️  event_results (replaced by race_results_unified)');
    console.log('  ⚠️  event_signups (replaced by event_signups_unified)');
    console.log('  ⚠️  sync_logs (replaced by sync_status_unified)\n');
    
    console.log('SOURCING (Multi-source data):');
    console.log('  📦 zwift_api_riders');
    console.log('  📦 zwift_api_events');
    console.log('  📦 zwift_api_signups');
    console.log('  📦 zwift_api_results');
    console.log('  📦 zwiftpower_riders');
    console.log('  📦 zwiftpower_results\n');
    
    console.log('\n🎯 RECOMMENDED ACTIONS:\n');
    console.log('1. CREATE MIGRATION: Rename legacy tables → _deprecated suffix');
    console.log('   - riders → riders_deprecated');
    console.log('   - events → events_deprecated');
    console.log('   - etc.\n');
    
    console.log('2. UPDATE FRONTEND: Migrate queries to use unified tables');
    console.log('   - Search for imports/queries using old table names');
    console.log('   - Replace with unified equivalents\n');
    
    console.log('3. UPDATE BACKEND: Migrate services to use unified tables');
    console.log('   - SupabaseService methods');
    console.log('   - Dashboard endpoints\n');
    
    console.log('4. KEEP SOURCING TABLES: These provide raw API data');
    console.log('   - zwift_api_* tables stay (needed for sync)');
    console.log('   - zwiftpower_* tables stay (enrichment source)\n');
    
    console.log('5. DROP DEPRECATED: After 2 weeks of monitoring');
    console.log('   - Verify no queries use _deprecated tables');
    console.log('   - Run DROP TABLE statements\n');
    
  } catch (error: any) {
    console.error('\n❌ Audit failed:', error.message);
    process.exit(1);
  }
}

main();
