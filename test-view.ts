import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

console.log('🔌 Connecting to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testView() {
  console.log('🧪 Testing view_upcoming_events after migration...\n');

  const { data, error } = await supabase
    .from('view_upcoming_events')
    .select('event_id, title, route_name, route_world, elevation_meters, distance_meters')
    .limit(3);

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  console.log('✅ View query successful!');
  console.log('Found', data.length, 'events\n');
  
  data.forEach((event, i) => {
    console.log(`Event ${i+1}: ${event.title}`);
    console.log('  route_name:', event.route_name || '❌ NULL');
    console.log('  route_world:', event.route_world || '❌ NULL');
    console.log('  elevation_meters:', event.elevation_meters ?? '❌ NULL');
    console.log('  distance_meters:', event.distance_meters ?? '❌ NULL');
    console.log();
  });
  
  // Check of de bron tabellen wel data hebben
  console.log('\n🔍 Checking source table zwift_api_events...');
  const { data: sourceData, error: sourceError } = await supabase
    .from('zwift_api_events')
    .select('event_id, title, route_name, route_world, elevation_meters, distance_meters')
    .limit(1);
    
  if (!sourceError && sourceData?.[0]) {
    const src = sourceData[0];
    console.log('Source table event:', src.title);
    console.log('  route_name:', src.route_name || '❌ NULL');
    console.log('  route_world:', src.route_world || '❌ NULL');
    console.log('  elevation_meters:', src.elevation_meters ?? '❌ NULL');
    console.log('  distance_meters:', src.distance_meters ?? '❌ NULL');
  }
  
  // Zoek events MET route_name
  console.log('\n🔍 Searching for events WITH route_name filled...');
  const { data: filledData, error: filledError, count } = await supabase
    .from('zwift_api_events')
    .select('event_id, title, route_name, route_world, elevation_meters', { count: 'exact' })
    .not('route_name', 'is', null)
    .limit(3);
    
  if (!filledError) {
    console.log(`✅ Found ${count} events with route_name filled`);
    if (filledData && filledData.length > 0) {
      console.log('\nExample events:');
      filledData.forEach((evt, i) => {
        console.log(`  ${i+1}. ${evt.title}`);
        console.log(`     route: ${evt.route_name} (${evt.route_world})`);
        console.log(`     elevation: ${evt.elevation_meters}m`);
      });
    }
  } else {
    console.log('❌ No events found with route_name filled');
    console.log('\n⚠️  PROBLEEM: De zwift_api_events tabel heeft geen route/elevation data!');
    console.log('   → Dit moet worden opgevuld via event sync vanuit de API');
  }
}

testView().catch(console.error);
