import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { zwiftClient } from './backend/src/api/zwift-client.js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fillMissingRouteData() {
  console.log('🔧 FILLING MISSING ROUTE DATA IN zwift_api_events TABLE\n');
  console.log('='.repeat(80));

  // 1. Load routes cache
  console.log('📥 Loading routes cache...');
  await zwiftClient.getAllRoutes();
  console.log('✅ Routes cache loaded\n');

  // 2. Find events with route_id but missing route_name/world/elevation
  const now = Math.floor(Date.now() / 1000);
  const future = now + (48 * 60 * 60);
  
  console.log('🔍 Finding events with missing route data...');
  const { data: events, error } = await supabase
    .from('zwift_api_events')
    .select('id, event_id, title, route_id, route_name, route_world, elevation_meters')
    .gte('time_unix', now)
    .lte('time_unix', future)
    .not('route_id', 'is', null);

  if (error) {
    console.error('❌ Error fetching events:', error);
    process.exit(1);
  }

  console.log(`Found ${events.length} upcoming events with route_id\n`);

  // 3. Update events met ontbrekende data
  let updated = 0;
  let alreadyComplete = 0;
  let notFound = 0;

  for (const event of events) {
    const needsUpdate = !event.route_name || !event.route_world || event.elevation_meters === null;
    
    if (!needsUpdate) {
      alreadyComplete++;
      continue;
    }

    // Lookup route via cached data
    const cachedRoute = zwiftClient.getCachedRouteById(event.route_id);
    
    if (!cachedRoute) {
      console.log(`⚠️  Route ${event.route_id} not found in cache for event: ${event.title}`);
      notFound++;
      continue;
    }

    // Update event
    const updates: any = {};
    if (!event.route_name && cachedRoute.name) {
      updates.route_name = cachedRoute.name;
    }
    if (!event.route_world && cachedRoute.world) {
      updates.route_world = cachedRoute.world;
    }
    if (event.elevation_meters === null && cachedRoute.elevation) {
      // Round elevation to integer (database expects INTEGER not FLOAT)
      updates.elevation_meters = Math.round(parseFloat(String(cachedRoute.elevation)));
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('zwift_api_events')
        .update(updates)
        .eq('id', event.id);

      if (updateError) {
        console.error(`❌ Failed to update event ${event.event_id}:`, updateError);
      } else {
        console.log(`✅ Updated: ${event.title}`);
        console.log(`   Route: ${updates.route_name || 'n/a'} (${updates.route_world || 'n/a'})`);
        console.log(`   Elevation: ${updates.elevation_meters || 'n/a'}m`);
        updated++;
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY:');
  console.log(`   Total events: ${events.length}`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ✓ Already complete: ${alreadyComplete}`);
  console.log(`   ⚠️  Route not found: ${notFound}`);
  
  console.log('\n🧪 Testing view after update...');
  
  const { data: viewData, error: viewError } = await supabase
    .from('view_upcoming_events')
    .select('event_id, title, route_name, route_world, elevation_meters, distance_meters')
    .limit(3);

  if (viewError) {
    console.error('❌ View test failed:', viewError);
  } else {
    console.log('\n✅ View test successful!\n');
    viewData.forEach((evt, i) => {
      console.log(`${i + 1}. ${evt.title}`);
      console.log(`   Route: ${evt.route_name || '❌ NULL'} (${evt.route_world || '❌ NULL'})`);
      console.log(`   Elevation: ${evt.elevation_meters ?? '❌ NULL'}m`);
      console.log(`   Distance: ${(evt.distance_meters / 1000000).toFixed(1)}km`);
    });
  }
}

fillMissingRouteData().catch(console.error);
