#!/usr/bin/env tsx
/**
 * Apply missing fields migration and re-sync data
 * This adds position, position_in_category, heartrate fields
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load backend .env
dotenv.config({ path: join(__dirname, 'backend', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔧 Applying missing fields migration...\n');

  const migration = `
    -- US1: Separate position fields for accuracy
    ALTER TABLE zwift_api_race_results 
      ADD COLUMN IF NOT EXISTS position INTEGER,
      ADD COLUMN IF NOT EXISTS position_in_category INTEGER;

    -- Heartrate fields (US: Hartslag metrics)
    ALTER TABLE zwift_api_race_results 
      ADD COLUMN IF NOT EXISTS heartrate_avg INTEGER,
      ADD COLUMN IF NOT EXISTS heartrate_max INTEGER;

    -- Route details already exist, but ensure they're there
    ALTER TABLE zwift_api_race_results 
      ADD COLUMN IF NOT EXISTS route_world TEXT,
      ADD COLUMN IF NOT EXISTS route_name TEXT,
      ADD COLUMN IF NOT EXISTS route_profile TEXT,
      ADD COLUMN IF NOT EXISTS distance_km TEXT,
      ADD COLUMN IF NOT EXISTS elevation_m INTEGER,
      ADD COLUMN IF NOT EXISTS laps INTEGER,
      ADD COLUMN IF NOT EXISTS event_type TEXT,
      ADD COLUMN IF NOT EXISTS sub_type TEXT;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: migration });
    
    if (error) {
      // Try direct query if RPC doesn't exist
      console.log('⚠️  RPC method not available, applying columns individually...');
      
      const columns = [
        'position INTEGER',
        'position_in_category INTEGER',
        'heartrate_avg INTEGER',
        'heartrate_max INTEGER',
      ];

      for (const col of columns) {
        const [name, type] = col.split(' ');
        const { error: colError } = await supabase
          .from('zwift_api_race_results')
          .select(name)
          .limit(1);
        
        if (colError && colError.message.includes('does not exist')) {
          console.log(`   Adding column: ${name}`);
          // Column doesn't exist, need to add via SQL
          console.log(`   ⚠️  Please add manually: ALTER TABLE zwift_api_race_results ADD COLUMN ${name} ${type};`);
        } else {
          console.log(`   ✓ Column exists: ${name}`);
        }
      }
    } else {
      console.log('✅ Migration applied successfully!\n');
    }
  } catch (error: any) {
    console.error('❌ Migration error:', error.message);
  }

  // Verify columns
  console.log('🔍 Verifying columns...');
  const { data, error } = await supabase
    .from('zwift_api_race_results')
    .select('position, position_in_category, heartrate_avg, heartrate_max')
    .limit(1);

  if (error) {
    console.error('❌ Columns not yet available:', error.message);
    console.log('\n📋 MANUAL STEP REQUIRED:');
    console.log('Run this SQL in Supabase SQL Editor:');
    console.log('---');
    console.log(migration);
    console.log('---\n');
    return false;
  }

  console.log('✅ All columns verified!\n');
  return true;
}

async function triggerResync() {
  console.log('🔄 Triggering re-sync for rider 150437...\n');
  
  try {
    const response = await fetch('https://teamnl-cloud9-racing-team-production.up.railway.app/api/sync/results/rider/150437', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daysBack: 90, forceRefresh: true })
    });

    const result = await response.json();
    console.log('📊 Sync result:', result);
    
    if (result.results_synced > 0) {
      console.log(`✅ Successfully synced ${result.results_synced} results!\n`);
      return true;
    }
  } catch (error: any) {
    console.error('❌ Sync error:', error.message);
  }
  
  return false;
}

async function main() {
  console.log('🚀 TeamNL Results Dashboard - Missing Fields Migration\n');
  console.log('This will:');
  console.log('  1. Add position & position_in_category columns');
  console.log('  2. Add heartrate_avg & heartrate_max columns');
  console.log('  3. Re-sync rider 150437 data with new fields\n');

  const migrated = await applyMigration();
  
  if (!migrated) {
    console.log('⚠️  Migration incomplete. Please run the SQL manually first.');
    process.exit(1);
  }

  const synced = await triggerResync();
  
  if (synced) {
    console.log('✅ All done! Check your dashboard at:');
    console.log('   https://teamnl-cloud9-racing-team-production.up.railway.app/results/rider/150437\n');
    console.log('You should now see:');
    console.log('  ✓ Position with category: "9 (3)"');
    console.log('  ✓ Total riders: "/ 42"');
    console.log('  ✓ HR Avg and HR Max columns');
    console.log('  ✓ vELO change: 25 (not 26)\n');
  }
}

main().catch(console.error);
