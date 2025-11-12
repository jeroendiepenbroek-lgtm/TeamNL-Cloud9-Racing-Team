/**
 * Feature 1: Manual Event Import
 * 
 * Import specific events by ID from ZwiftRacing.app
 * Useful when you know which events your team is participating in
 * 
 * Usage:
 *   npm run import:events -- 5129235 5130456 5131789
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ZWIFT_RACING_API = 'https://zwift-ranking.herokuapp.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchEventDetails(eventId: number): Promise<any> {
  console.log(`\n📥 Fetching event ${eventId}...`);
  
  try {
    const response = await axios.get(
      `${ZWIFT_RACING_API}/api/events/${eventId}`,
      { timeout: 10000 }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.error(`  ❌ Event ${eventId} not found`);
      return null;
    }
    throw error;
  }
}

async function fetchEventSignups(eventId: number): Promise<any[]> {
  try {
    const response = await axios.get(
      `${ZWIFT_RACING_API}/api/events/${eventId}/signups`,
      { timeout: 10000 }
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    // Signups endpoint might not exist, try results
    try {
      const response = await axios.get(
        `${ZWIFT_RACING_API}/api/events/${eventId}/results`,
        { timeout: 10000 }
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  }
}

async function getOurRiders(): Promise<Map<number, any>> {
  const { data, error } = await supabase
    .from('riders')
    .select('*');
  
  if (error) throw error;
  
  const riderMap = new Map();
  data?.forEach(rider => {
    riderMap.set(rider.rider_id, rider);
  });
  
  return riderMap;
}

async function importEvent(eventId: number, ourRiders: Map<number, any>): Promise<{
  success: boolean;
  signupsMatched: number;
}> {
  // Fetch event details
  const event = await fetchEventDetails(eventId);
  
  if (!event) {
    return { success: false, signupsMatched: 0 };
  }
  
  console.log(`  📅 ${event.name}`);
  console.log(`  🕐 ${event.eventDate}`);
  console.log(`  📍 ${event.route || 'Unknown route'}`);
  
  // Save event to database
  const { error: eventError } = await supabase
    .from('events')
    .upsert({
      event_id: event.id,
      name: event.name,
      event_date: event.eventDate,
      event_type: event.type || event.sport || 'race',
      description: event.description,
      route: event.route,
      distance_meters: event.distanceInMeters,
      organizer: event.organizer,
      event_url: `https://www.zwiftracing.app/events/${event.id}`,
      category_enforcement: event.categoryEnforcement || false,
      zwift_event_id: event.id,
      last_synced: new Date().toISOString(),
    }, {
      onConflict: 'event_id',
    });
  
  if (eventError) {
    console.error(`  ❌ Error saving event:`, eventError.message);
    return { success: false, signupsMatched: 0 };
  }
  
  console.log('  ✓ Event saved to database');
  
  // Fetch signups
  const signups = await fetchEventSignups(eventId);
  console.log(`  👥 Found ${signups.length} signups/results`);
  
  let signupsMatched = 0;
  
  if (signups.length > 0) {
    console.log('  📝 Matching with team riders...');
    
    for (const signup of signups) {
      const riderId = signup.riderId || signup.rider_id;
      
      if (!riderId) continue;
      
      if (ourRiders.has(riderId)) {
        const rider = ourRiders.get(riderId);
        
        const { error: signupError } = await supabase
          .from('event_signups')
          .upsert({
            event_id: eventId,
            rider_id: riderId,
            category: signup.category || signup.cat || rider.zp_category,
            status: signup.status || 'confirmed',
            team_name: signup.team || signup.teamName,
          }, {
            onConflict: 'event_id,rider_id',
          });
        
        if (!signupError) {
          signupsMatched++;
          console.log(`    ✓ ${rider.name} (${signup.category || rider.zp_category || '-'})`);
        }
      }
    }
  }
  
  return { success: true, signupsMatched };
}

async function main() {
  const eventIds = process.argv.slice(2)
    .filter(arg => !arg.startsWith('--'))
    .map(id => parseInt(id))
    .filter(id => !isNaN(id));
  
  if (eventIds.length === 0) {
    console.log('❌ No event IDs provided\n');
    console.log('Usage: npm run import:events -- <eventId1> <eventId2> ...\n');
    console.log('Example: npm run import:events -- 5129235 5130456\n');
    console.log('You can find event IDs from ZwiftRacing.app URLs:');
    console.log('  https://www.zwiftracing.app/events/5129235');
    console.log('                                        ^^^^^^^ \n');
    process.exit(1);
  }
  
  console.log('🏁 TeamNL Cloud9 - Manual Event Import');
  console.log('='.repeat(60));
  console.log(`📋 Importing ${eventIds.length} event(s): ${eventIds.join(', ')}\n`);
  
  // Get our riders
  console.log('📋 Loading team riders...');
  const ourRiders = await getOurRiders();
  console.log(`✅ Found ${ourRiders.size} riders in database\n`);
  
  let successCount = 0;
  let totalSignupsMatched = 0;
  
  for (const eventId of eventIds) {
    const result = await importEvent(eventId, ourRiders);
    
    if (result.success) {
      successCount++;
      totalSignupsMatched += result.signupsMatched;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ IMPORT COMPLETE\n');
  console.log(`📊 Summary:`);
  console.log(`   - Events imported: ${successCount}/${eventIds.length}`);
  console.log(`   - Team signups matched: ${totalSignupsMatched}`);
  console.log('');
  
  if (totalSignupsMatched > 0) {
    console.log('💡 View in dashboard: /events');
  }
}

main()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
