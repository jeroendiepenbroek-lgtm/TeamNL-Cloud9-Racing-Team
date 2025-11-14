import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function analyzeTableVsView() {
  console.log('🔍 ADVANCED ANALYTICS: TABLE vs VIEW COMPARISON\n');
  console.log('='.repeat(80));

  // 1. Direct tabel query - eerste upcoming event
  const now = Math.floor(Date.now() / 1000);
  const future = now + (48 * 60 * 60);
  
  const { data: tableData, error: tableError } = await supabase
    .from('zwift_api_events')
    .select('event_id, title, route_name, route_world, elevation_meters, distance_meters, route_id, pens')
    .gte('time_unix', now)
    .lte('time_unix', future)
    .order('time_unix', { ascending: true })
    .limit(3);

  if (tableError) {
    console.error('❌ TABLE ERROR:', tableError);
    process.exit(1);
  }

  console.log(`📊 TABLE: zwift_api_events (${tableData.length} events)`);
  console.log('-'.repeat(80));
  
  for (const tbl of tableData) {
    console.log(`\nEvent: ${tbl.title}`);
    console.log(`  Event ID: ${tbl.event_id}`);
    console.log(`  Route Name: ${tbl.route_name || '❌ NULL'}`);
    console.log(`  Route World: ${tbl.route_world || '❌ NULL'}`);
    console.log(`  Route ID: ${tbl.route_id || '❌ NULL'}`);
    console.log(`  Elevation: ${tbl.elevation_meters ?? '❌ NULL'}`);
    console.log(`  Distance: ${tbl.distance_meters ?? '❌ NULL'}`);
    console.log(`  Pens: ${tbl.pens ? '✅ EXISTS' : '❌ NULL'}`);
  }

  // 2. View query - zelfde events
  console.log('\n📊 VIEW: view_upcoming_events');
  console.log('-'.repeat(80));
  
  const { data: viewData, error: viewError } = await supabase
    .from('view_upcoming_events')
    .select('event_id, title, route_name, route_world, elevation_meters, distance_meters, route_id, pens')
    .in('event_id', tableData.map(e => e.event_id));

  if (viewError) {
    console.error('❌ VIEW ERROR:', viewError);
    console.error('Details:', JSON.stringify(viewError, null, 2));
    process.exit(1);
  }

  for (const view of viewData) {
    console.log(`\nEvent: ${view.title}`);
    console.log(`  Event ID: ${view.event_id}`);
    console.log(`  Route Name: ${view.route_name || '❌ NULL'}`);
    console.log(`  Route World: ${view.route_world || '❌ NULL'}`);
    console.log(`  Route ID: ${view.route_id || '❌ NULL'}`);
    console.log(`  Elevation: ${view.elevation_meters ?? '❌ NULL'}`);
    console.log(`  Distance: ${view.distance_meters ?? '❌ NULL'}`);
    console.log(`  Pens: ${view.pens ? '✅ EXISTS' : '❌ NULL'}`);
  }

  // 3. Field by field comparison
  console.log('\n🔍 FIELD-BY-FIELD COMPARISON');
  console.log('='.repeat(80));
  
  const fields = ['route_name', 'route_world', 'route_id', 'elevation_meters', 'distance_meters'];
  let mismatches = 0;
  
  for (const tbl of tableData) {
    const view = viewData.find(v => v.event_id === tbl.event_id);
    if (!view) {
      console.log(`❌ Event ${tbl.event_id} NOT FOUND in view!`);
      mismatches++;
      continue;
    }
    
    console.log(`\nEvent: ${tbl.title} (${tbl.event_id})`);
    
    for (const field of fields) {
      const tableVal = tbl[field];
      const viewVal = view[field];
      const match = tableVal === viewVal;
      
      if (!match) {
        console.log(`  ❌ ${field}:`);
        console.log(`     Table: ${tableVal ?? 'NULL'}`);
        console.log(`     View:  ${viewVal ?? 'NULL'}`);
        mismatches++;
      } else if (tableVal === null || tableVal === undefined) {
        console.log(`  ⚠️  ${field}: NULL in both (API data missing)`);
      } else {
        console.log(`  ✅ ${field}: MATCH`);
      }
    }
  }

  // 4. Root cause analysis
  console.log('\n📊 ROOT CAUSE ANALYSIS');
  console.log('='.repeat(80));
  
  const nullCounts = {
    route_name: 0,
    route_world: 0,
    elevation_meters: 0,
    distance_meters: 0
  };
  
  for (const tbl of tableData) {
    if (!tbl.route_name) nullCounts.route_name++;
    if (!tbl.route_world) nullCounts.route_world++;
    if (tbl.elevation_meters === null) nullCounts.elevation_meters++;
    if (tbl.distance_meters === null) nullCounts.distance_meters++;
  }
  
  console.log('NULL values in SOURCE TABLE:');
  Object.entries(nullCounts).forEach(([field, count]) => {
    const pct = Math.round((count / tableData.length) * 100);
    console.log(`  ${field}: ${count}/${tableData.length} (${pct}%)`);
  });

  // 5. Conclusion
  console.log('\n📋 CONCLUSION');
  console.log('='.repeat(80));
  
  if (mismatches === 0) {
    console.log('✅ VIEW IS CORRECT - All fields match table exactly');
    console.log('⚠️  ISSUE: API returns NULL for route/elevation data');
    console.log('\n🔧 SOLUTION:');
    console.log('   1. View definition is correct - no changes needed');
    console.log('   2. Problem is in API sync - route data not being fetched');
    console.log('   3. Check sync.service.ts: event.route object is NULL from API');
  } else {
    console.log(`❌ VIEW HAS ${mismatches} MISMATCHES with source table`);
    console.log('\n🔧 ACTION REQUIRED:');
    console.log('   1. Re-apply migration 015 in Supabase SQL Editor');
    console.log('   2. Check view definition for GROUP BY issues');
  }
}

analyzeTableVsView().catch(console.error);
