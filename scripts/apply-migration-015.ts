/**
 * Apply migration 015: Fix views to use zwift_api_event_signups
 * Run this via: npx tsx scripts/apply-migration-015.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('🔧 Applying migration 015: Fix views to use zwift_api_event_signups\n');

  // Read migration file
  const migrationPath = path.join(
    __dirname,
    '../supabase/migrations/015_fix_views_use_zwift_api_signups.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  try {
    // Execute SQL via RPC (requires a function in Supabase)
    // Since we can't execute raw SQL via REST API, we'll use the SQL editor approach
    
    console.log('⚠️  Cannot execute raw SQL via Supabase REST API');
    console.log('Please apply this migration manually via Supabase SQL Editor:');
    console.log('');
    console.log('1. Go to: https://bktbeefdmrpxhsyyalvc.supabase.co/project/_/sql');
    console.log('2. Copy-paste the contents of:');
    console.log('   supabase/migrations/015_fix_views_use_zwift_api_signups.sql');
    console.log('3. Click "Run"');
    console.log('');
    console.log('Migration SQL preview:');
    console.log('---');
    console.log(sql.substring(0, 500) + '...');
    console.log('---');
    
    // Alternative: Test if views exist and show their columns
    console.log('\n📊 Testing current view structure...\n');
    
    const { data: currentEvents, error } = await supabase
      .from('view_upcoming_events')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ view_upcoming_events error:', error.message);
    } else if (currentEvents && currentEvents.length > 0) {
      console.log('✅ view_upcoming_events exists');
      console.log('   Columns:', Object.keys(currentEvents[0]).join(', '));
      
      // Check if critical columns exist
      const event = currentEvents[0];
      const hasRoute = 'route_name' in event && 'route_world' in event;
      const hasElevation = 'elevation_meters' in event;
      const hasDistance = 'distance_meters' in event;
      
      console.log('');
      console.log('   ✓ distance_meters:', hasDistance ? '✅ EXISTS' : '❌ MISSING');
      console.log('   ✓ elevation_meters:', hasElevation ? '✅ EXISTS' : '❌ MISSING');
      console.log('   ✓ route_name:', hasRoute ? '✅ EXISTS' : '❌ MISSING');
      console.log('   ✓ route_world:', hasRoute ? '✅ EXISTS' : '❌ MISSING');
      
      if (!hasRoute || !hasElevation || !hasDistance) {
        console.log('\n⚠️  MIGRATION REQUIRED! Please apply via SQL Editor.');
      } else {
        console.log('\n✅ View already has all required columns!');
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

applyMigration();
