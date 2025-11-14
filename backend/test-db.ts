import { supabase } from './src/services/supabase.service';

async function test() {
  const now = Math.floor(Date.now() / 1000);
  const future = now + (48 * 3600);

  const { data, error } = await (supabase as any).client
    .from('zwift_api_events')
    .select('event_id, title, distance_meters, elevation_meters, route_name, route_world')
    .gte('time_unix', now)
    .lte('time_unix', future)
    .order('time_unix', { ascending: true })
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('\n📊 Sample events (eerste 5 van komende 48u):\n');
  data.forEach((e, i) => {
    console.log(`${i + 1}. ${e.title}`);
    console.log(`   - Distance: ${e.distance_meters ? (e.distance_meters / 1000).toFixed(1) + ' km' : 'NULL'}`);
    console.log(`   - Elevation: ${e.elevation_meters ? e.elevation_meters + 'm' : 'NULL'}`);
    console.log(`   - Route: ${e.route_name || 'NULL'} (${e.route_world || 'NULL'})`);
    console.log('');
  });

  const withRoute = data.filter(e => e.route_name).length;
  const withElevation = data.filter(e => e.elevation_meters).length;
  const withDistance = data.filter(e => e.distance_meters).length;

  console.log(`✅ Stats uit database:`);
  console.log(`   - ${withDistance}/5 hebben distance_meters`);
  console.log(`   - ${withElevation}/5 hebben elevation_meters`);
  console.log(`   - ${withRoute}/5 hebben route_name\n`);
}

test().then(() => process.exit(0));
