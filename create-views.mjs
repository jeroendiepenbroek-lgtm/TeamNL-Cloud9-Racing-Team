#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createViews() {
  console.log('🔧 Creating dashboard views...\n');
  
  const sql = `
    -- Dashboard 1: Rider Results (90 dagen)
    CREATE OR REPLACE VIEW v_dashboard_rider_results AS
    SELECT 
      re.event_id,
      re.event_name,
      re.event_date,
      re.world,
      re.route,
      re.distance_km,
      rr.rider_id,
      rr.position,
      rr.category,
      rr.category_position,
      rr.avg_power,
      rr.avg_wkg,
      rr.time_seconds,
      rr.velo_before,
      rr.velo_after,
      rr.velo_change,
      rr.team_name,
      rr.source,
      -- Bereken tijd in min:sec format
      CONCAT(
        FLOOR(rr.time_seconds / 60)::TEXT, 
        ':', 
        LPAD((rr.time_seconds % 60)::TEXT, 2, '0')
      ) AS time_formatted,
      -- Count total participants
      (SELECT COUNT(*) FROM race_results WHERE event_id = rr.event_id) AS total_participants
    FROM race_results rr
    INNER JOIN race_events re ON rr.event_id = re.event_id
    WHERE re.event_date >= NOW() - INTERVAL '90 days'
    ORDER BY re.event_date DESC, rr.position ASC;
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('❌ Error creating view:', error);
    // Fallback: probeer direct via from
    console.log('\n🔄 Trying alternative approach...');
    return;
  }
  
  console.log('✅ View v_dashboard_rider_results created');
  
  // Test query
  const { data: testData, error: testError } = await supabase
    .from('v_dashboard_rider_results')
    .select('*')
    .eq('rider_id', 150437)
    .limit(5);
  
  if (testError) {
    console.error('❌ Error testing view:', testError);
  } else {
    console.log(`✅ Test query successful: ${testData.length} results for rider 150437`);
    if (testData.length > 0) {
      console.log('\n📊 Sample result:');
      console.log(testData[0]);
    }
  }
}

createViews().catch(console.error);
