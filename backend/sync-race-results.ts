import dotenv from 'dotenv';
dotenv.config();

// Lazy load clients
const zwiftClient = (await import('./src/api/zwift-client.js')).zwiftClient;
const zwiftPowerClient = (await import('./src/api/zwiftpower-client.js')).zwiftPowerClient;
const { supabase } = await import('./src/services/supabase.service.js');

const RIDER_ID = 150437;

(async () => {
  console.log('🏁 RACE RESULTS SYNC STRATEGY');
  console.log('================================\n');
  
  try {
    // Step 1: Authenticate ZwiftPower
    console.log('Step 1: Authenticating ZwiftPower...');
    await zwiftPowerClient.authenticate();
    console.log('✅ Authenticated\n');
    
    // Step 2: Get rider's recent race results from ZwiftPower
    console.log(`Step 2: Fetching race results for rider ${RIDER_ID}...`);
    const zpResults = await zwiftPowerClient.getRiderResults(RIDER_ID, 30);
    
    if (!zpResults || zpResults.length === 0) {
      console.log('⚠️  No results from ZwiftPower API\n');
      console.log('Checking response structure:', zpResults);
      return;
    }
    
    console.log(`✅ Found ${zpResults.length} results from ZwiftPower\n`);
    
    // Step 3: Analyze first result structure
    console.log('Step 3: Analyzing result structure...');
    const firstResult = zpResults[0];
    console.log('Keys:', Object.keys(firstResult));
    console.log('Sample:', JSON.stringify(firstResult, null, 2).substring(0, 500));
    console.log('');
    
    // Step 4: Extract unique event IDs
    const eventIds = [...new Set(zpResults
      .map((r: any) => r.event_id || r.eventId || r.zid)
      .filter(Boolean))];
    
    console.log(`Step 4: Found ${eventIds.length} unique events`);
    console.log('Event IDs:', eventIds.slice(0, 10));
    console.log('');
    
    // Step 5: For each event, get full results from ZwiftRacing API
    console.log('Step 5: Syncing events and results...\n');
    
    let syncedEvents = 0;
    let syncedResults = 0;
    
    for (const eventId of eventIds.slice(0, 5)) { // Start with 5 most recent
      try {
        console.log(`  📥 Event ${eventId}...`);
        
        // Get full event results from ZwiftRacing API
        const eventResults = await zwiftClient.getEventResults(eventId);
        
        if (!eventResults || eventResults.length === 0) {
          console.log(`    ⚠️  No results found`);
          continue;
        }
        
        console.log(`    ✅ ${eventResults.length} results`);
        
        // Extract event metadata from first result
        const firstEventResult = eventResults[0];
        const eventDate = firstEventResult.timestamp || firstEventResult.date || Date.now() / 1000;
        
        // Insert/update event in zwift_api_events
        const { error: eventError } = await (supabase as any).client
          .from('zwift_api_events')
          .upsert({
            event_id: eventId.toString(),
            title: firstEventResult.eventName || `Event ${eventId}`,
            event_date: new Date(eventDate * 1000).toISOString(),
            event_type: firstEventResult.category || 'race',
            route_name: firstEventResult.route,
            distance_km: firstEventResult.distanceKm,
            raw_data: firstEventResult
          }, { onConflict: 'event_id' });
        
        if (!eventError) {
          syncedEvents++;
        }
        
        // Insert results into zwift_api_race_results
        const resultsToInsert = eventResults.map((r: any) => ({
          event_id: eventId.toString(),
          rider_id: r.riderId,
          rank: r.rank,
          finish_time_seconds: r.timeSeconds,
          avg_wkg: r.avgWkg,
          avg_watts: r.avgWatts,
          avg_hr: r.avgHr,
          normalized_power: r.normalizedPower,
          raw_data: r
        }));
        
        const { error: resultsError } = await (supabase as any).client
          .from('zwift_api_race_results')
          .upsert(resultsToInsert, { 
            onConflict: 'event_id,rider_id',
            ignoreDuplicates: false 
          });
        
        if (!resultsError) {
          syncedResults += resultsToInsert.length;
          console.log(`    💾 Saved ${resultsToInsert.length} results`);
        } else {
          console.log(`    ❌ Error saving results:`, resultsError.message);
        }
        
        // Rate limit: 1 request per minute for results endpoint
        if (eventIds.indexOf(eventId) < eventIds.length - 1) {
          console.log(`    ⏳ Waiting 65s for rate limit...\n`);
          await new Promise(r => setTimeout(r, 65000));
        }
        
      } catch (error: any) {
        console.log(`    ❌ Error:`, error.message);
        if (error.response?.status === 429) {
          console.log(`    ⏳ Rate limited, waiting 90s...\n`);
          await new Promise(r => setTimeout(r, 90000));
        }
      }
    }
    
    console.log('\n================================');
    console.log('📊 SYNC COMPLETE');
    console.log('================================');
    console.log(`Events synced: ${syncedEvents}`);
    console.log(`Results synced: ${syncedResults}`);
    console.log('');
    
    // Step 6: Verify data
    console.log('Step 6: Verification...');
    
    const { count: eventCount } = await (supabase as any).client
      .from('zwift_api_events')
      .select('*', { count: 'exact', head: true });
    
    const { count: resultCount } = await (supabase as any).client
      .from('zwift_api_race_results')
      .select('*', { count: 'exact', head: true })
      .eq('rider_id', RIDER_ID);
    
    console.log(`✅ Total events in DB: ${eventCount}`);
    console.log(`✅ Total results for rider ${RIDER_ID}: ${resultCount}`);
    
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
})();
