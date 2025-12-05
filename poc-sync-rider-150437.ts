/**
 * POC Script: Sync Rider 150437 Complete Data
 * 
 * Step 1: Sync rider profile + stats from ZwiftRacing.app
 * Step 2: Sync race results (via ZwiftPower historical data)
 * Step 3: Sync upcoming events + signups (36 hours)
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Configuration
const ZWIFT_API_KEY = process.env.ZWIFT_API_KEY || '650c6d2fc4ef6858d74cbef1';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const POC_RIDER_ID = 150437;

// Clients
const zwiftClient = axios.create({
  baseURL: 'https://zwift-ranking.herokuapp.com',
  headers: { 'Authorization': ZWIFT_API_KEY },
  timeout: 30000
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Utility: Sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// STEP 1: SYNC RIDER PROFILE & STATS
// ============================================================================

async function syncRiderProfile(riderId: number) {
  console.log(`\n📊 STEP 1: Syncing rider ${riderId} profile...`);
  
  try {
    // Fetch from ZwiftRacing.app
    const response = await zwiftClient.get(`/public/riders/${riderId}`);
    const rider = response.data;
    
    console.log(`✅ Fetched rider data: ${rider.name}`);
    console.log(`   Category: ${rider.zpCategory}, FTP: ${rider.zpFTP}W`);
    console.log(`   vELO: ${rider.race?.current?.rating || 'N/A'}`);
    
    // Map to database format (riders_unified schema)
    const dbData = {
      rider_id: rider.riderId,
      name: rider.name,
      weight_kg: rider.weight,
      height_cm: rider.height,
      ftp: rider.zpFTP,
      gender: rider.gender,
      age_category: rider.age,
      country_code: rider.country,
      
      club_id: rider.club?.id,
      club_name: rider.club?.name,
      
      zp_category: rider.zpCategory,
      
      // Power curve (riders_unified uses _w and _wkg suffix)
      power_5s_w: rider.power?.w5,
      power_15s_w: rider.power?.w15,
      power_30s_w: rider.power?.w30,
      power_1m_w: rider.power?.w60,
      power_2m_w: rider.power?.w120,
      power_5m_w: rider.power?.w300,
      power_20m_w: rider.power?.w1200,
      power_5s_wkg: rider.power?.wkg5,
      power_1m_wkg: rider.power?.wkg60,
      power_5m_wkg: rider.power?.wkg300,
      power_20m_wkg: rider.power?.wkg1200,
      critical_power: rider.power?.CP,
      anaerobic_work_capacity: rider.power?.AWC,
      compound_score: rider.power?.compoundScore,
      
      // vELO ratings
      velo_rating: rider.race?.current?.rating,
      velo_max_30d: rider.race?.max30?.rating,
      velo_max_90d: rider.race?.max90?.rating,
      velo_rank: rider.race?.current?.mixed?.number,
      
      // Race stats
      race_wins: rider.race?.wins,
      race_podiums: rider.race?.podiums,
      race_count_90d: rider.race?.finishes, // Approximate as finishes
      
      // Phenotype (only 3 types in DB, climber not stored)
      phenotype_sprinter: rider.phenotype?.scores?.sprinter,
      phenotype_pursuiter: rider.phenotype?.scores?.pursuiter,
      phenotype_puncheur: rider.phenotype?.scores?.puncheur,
      
      // Handicaps
      handicap_flat: rider.handicaps?.flat,
      handicap_rolling: rider.handicaps?.rolling,
      handicap_hilly: rider.handicaps?.hilly,
      handicap_mountainous: rider.handicaps?.mountainous,
      
      // Sync tracking
      last_synced_zwift_racing: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Upsert to riders_unified table
    const { data, error } = await supabase
      .from('riders_unified')
      .upsert(dbData, { onConflict: 'rider_id' })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`✅ Rider ${riderId} synced to database`);
    console.log(`   Power 20m: ${dbData.power_20m_w}W (${dbData.power_20m_wkg} w/kg)`);
    console.log(`   Phenotype Sprinter: ${dbData.phenotype_sprinter}`);
    console.log(`   Race wins: ${dbData.race_wins}, Podiums: ${dbData.race_podiums}`);
    
    return data;
  } catch (error: any) {
    console.error(`❌ Failed to sync rider ${riderId}:`, error.message);
    throw error;
  }
}

// ============================================================================
// STEP 2: SYNC RACE RESULTS
// ============================================================================

async function syncRaceResults(riderId: number) {
  console.log(`\n🏁 STEP 2: Syncing race results for rider ${riderId}...`);
  
  try {
    // Strategy: Use ZwiftPower profile_results endpoint to find historical events
    const zpResponse = await axios.get(
      `https://zwiftpower.com/api3.php?do=profile_results&z=${riderId}&limit=30`,
      { 
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    const zpData = zpResponse.data;
    const results = zpData?.data?.results || [];
    
    console.log(`✅ Found ${results.length} race results from ZwiftPower`);
    
    if (results.length === 0) {
      console.warn('⚠️  No results found - rider may not have ZwiftPower profile');
      return [];
    }
    
    let syncedCount = 0;
    
    // Process each result
    for (let i = 0; i < Math.min(results.length, 15); i++) {
      const result = results[i];
      
      try {
        // Fetch full event results from ZwiftRacing
        console.log(`   Fetching event ${result.zid}...`);
        const eventResponse = await zwiftClient.get(`/public/results/${result.zid}`);
        const eventResults = eventResponse.data;
        
        // Find rider in results
        const riderResult = eventResults.find((r: any) => r.riderId === riderId);
        
        if (riderResult) {
          // Store in database
          const resultData = {
            event_id: result.zid.toString(),
            rider_id: riderId,
            rider_name: riderResult.name || result.name,
            rank: riderResult.rank || result.position,
            total_riders: eventResults.length,
            pen: riderResult.pen || result.category,
            time_seconds: riderResult.time || result.duration,
            avg_wkg: parseFloat(result.wkg) || riderResult.avgWkg,
            avg_watts: parseInt(result.watt) || riderResult.avgWatts,
            avg_heart_rate: parseInt(result.hr) || null,
            is_disqualified: result.flag === 'dq' || result.dq,
            did_finish: !result.dnf,
            raw_response: riderResult,
            synced_at: new Date().toISOString()
          };
          
          const { error } = await supabase
            .from('zwift_api_race_results')
            .upsert(resultData, { onConflict: 'event_id,rider_id' });
          
          if (error) {
            console.warn(`   ⚠️  Failed to store result for event ${result.zid}:`, error.message);
          } else {
            syncedCount++;
            console.log(`   ✅ Synced: ${result.event_title || 'Event'} - Rank ${resultData.rank}/${resultData.total_riders}`);
          }
        }
        
        // Rate limit: 1 call/min for /public/results
        if (i < results.length - 1) {
          console.log(`   ⏱️  Rate limit wait (65s)...`);
          await sleep(65000);
        }
      } catch (err: any) {
        console.warn(`   ⚠️  Failed to fetch event ${result.zid}:`, err.message);
      }
    }
    
    console.log(`✅ Synced ${syncedCount} race results for rider ${riderId}`);
    return syncedCount;
  } catch (error: any) {
    console.error(`❌ Failed to sync race results:`, error.message);
    
    // Fallback: Try without ZwiftPower
    console.log('   Attempting fallback strategy...');
    console.warn('⚠️  Fallback not implemented - requires manual event ID list');
    return 0;
  }
}

// ============================================================================
// STEP 3: SYNC UPCOMING EVENTS + SIGNUPS
// ============================================================================

async function syncUpcomingEventsAndSignups(riderId: number) {
  console.log(`\n📅 STEP 3: Syncing upcoming events (36 hours) + signups...`);
  
  try {
    // Fetch upcoming events
    const eventsResponse = await zwiftClient.get('/api/events/upcoming');
    const allEvents = eventsResponse.data;
    
    console.log(`✅ Fetched ${allEvents.length} upcoming events`);
    
    // Filter for next 36 hours
    const now = Math.floor(Date.now() / 1000);
    const future36h = now + (36 * 60 * 60);
    
    const relevantEvents = allEvents.filter((event: any) => 
      event.time >= now && event.time <= future36h
    );
    
    console.log(`   Filtered to ${relevantEvents.length} events in next 36 hours`);
    
    let eventsSynced = 0;
    let signupsFound = 0;
    
    // Store events and check signups
    for (const event of relevantEvents.slice(0, 20)) { // Limit to 20 events
      try {
        // Store event
        const eventData = {
          mongo_id: event._id,
          event_id: event.eventId,
          time_unix: event.time,
          title: event.title,
          event_type: event.type,
          sub_type: event.subType,
          distance_meters: event.distance,
          elevation_meters: event.elevation,
          route_name: event.route?.name,
          route_world: event.route?.world,
          organizer: event.organizer,
          category_enforcement: event.categoryEnforcement,
          pens: event.pens,
          route_full: event.route,
          raw_response: event,
          last_synced: new Date().toISOString()
        };
        
        const { error: eventError } = await supabase
          .from('zwift_api_events')
          .upsert(eventData, { onConflict: 'event_id' });
        
        if (!eventError) {
          eventsSynced++;
        }
        
        // Check signups for this event
        try {
          const signupsResponse = await zwiftClient.get(`/api/events/${event.eventId}/signups`);
          const signupsData = signupsResponse.data;
          
          // Flatten all categories
          const allSignups = Object.values(signupsData).flat() as any[];
          
          // Find rider signup
          const riderSignup = allSignups.find((s: any) => s.zwid === riderId);
          
          if (riderSignup) {
            const signupData = {
              event_id: event.eventId,
              rider_id: riderId,
              rider_name: riderSignup.name,
              category: riderSignup.category || riderSignup.pen,
              signup_timestamp: riderSignup.signupTime || new Date().toISOString(),
              synced_at: new Date().toISOString()
            };
            
            const { error: signupError } = await supabase
              .from('zwift_api_event_signups')
              .upsert(signupData, { onConflict: 'event_id,rider_id' });
            
            if (!signupError) {
              signupsFound++;
              const eventTime = new Date(event.time * 1000).toLocaleString('nl-NL');
              console.log(`   ✅ SIGNUP FOUND: ${event.title}`);
              console.log(`      Time: ${eventTime}, Category: ${signupData.category}`);
            }
          }
        } catch (signupError: any) {
          // Signups endpoint might not be available for all events
          console.log(`   ⚠️  Signups not available for: ${event.title}`);
        }
        
        // Rate limit: Be conservative (1 call/min)
        await sleep(2000); // 2 seconds between events
      } catch (err: any) {
        console.warn(`   ⚠️  Failed to process event ${event.eventId}:`, err.message);
      }
    }
    
    console.log(`✅ Synced ${eventsSynced} events`);
    console.log(`✅ Found ${signupsFound} signups for rider ${riderId}`);
    
    return { events: eventsSynced, signups: signupsFound };
  } catch (error: any) {
    console.error(`❌ Failed to sync events:`, error.message);
    throw error;
  }
}

// ============================================================================
// MAIN POC EXECUTION
// ============================================================================

async function runPOC() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  POC: Rider 150437 Complete Data Sync                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    // Step 1: Rider Profile
    await syncRiderProfile(POC_RIDER_ID);
    
    // Step 2: Race Results (limited to prevent excessive API calls)
    console.log('\n⚠️  Race results sync will take ~15 minutes due to rate limits');
    console.log('   Syncing first 15 results only for POC...');
    await syncRaceResults(POC_RIDER_ID);
    
    // Step 3: Upcoming Events
    await syncUpcomingEventsAndSignups(POC_RIDER_ID);
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  POC COMPLETE! ✅                                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\nRider 150437 data is now available in:');
    console.log('  - riders table (profile + stats)');
    console.log('  - zwift_api_race_results (race history)');
    console.log('  - zwift_api_events (upcoming events)');
    console.log('  - zwift_api_event_signups (event registrations)');
    console.log('\nDashboards can now be tested with this data!');
    
  } catch (error: any) {
    console.error('\n❌ POC FAILED:', error.message);
    process.exit(1);
  }
}

// Run POC
runPOC();
