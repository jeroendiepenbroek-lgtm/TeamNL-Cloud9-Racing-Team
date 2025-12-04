import dotenv from 'dotenv';
dotenv.config();

const zwiftClient = (await import('./src/api/zwift-client.js')).zwiftClient;
const zwiftPowerClient = (await import('./src/api/zwiftpower-client.js')).zwiftPowerClient;
const { supabase } = await import('./src/services/supabase.service.js');

const RIDER_ID = 150437;
const MAX_RESULTS = 50; // Limit to avoid rate limits

(async () => {
  try {
    console.log('🏁 RACE RESULTS SYNC - Rider 150437');
    console.log('=====================================\n');
    
    // Step 1: Get rider results from ZwiftPower
    console.log('📥 Step 1: Fetching results from ZwiftPower...');
    await zwiftPowerClient.authenticate();
    const zwiftPowerResults = await zwiftPowerClient.getRiderResults(RIDER_ID, MAX_RESULTS);
    
    if (!zwiftPowerResults || zwiftPowerResults.length === 0) {
      console.log('⚠️  No results found from ZwiftPower');
      return;
    }
    
    console.log(`✅ Found ${zwiftPowerResults.length} results from ZwiftPower\n`);
    
    // Step 2: Extract unique event IDs
    console.log('📊 Step 2: Processing event IDs...');
    const eventIds = [...new Set(
      zwiftPowerResults
        .map((r: any) => r.event_id || r.zid || r.eventId)
        .filter(Boolean)
        .map(String)
    )];
    
    console.log(`Found ${eventIds.length} unique events\n`);
    
    // Step 3: For each event, get detailed results from ZwiftRacing API
    console.log('📥 Step 3: Syncing event details and results...\n');
    
    let syncedEvents = 0;
    let syncedResults = 0;
    let skippedEvents = 0;
    
    for (const eventId of eventIds.slice(0, 10)) { // Limit to 10 events to avoid rate limits
      try {
        console.log(`  Processing event ${eventId}...`);
        
        // Check if event already exists
        const { data: existingEvent } = await (supabase as any).client
          .from('zwift_api_events')
          .select('event_id')
          .eq('event_id', eventId)
          .single();
        
        if (existingEvent) {
          console.log(`    ⏭️  Event ${eventId} already synced`);
          skippedEvents++;
          continue;
        }
        
        // Wait for rate limit (1 request per minute for results)
        if (syncedEvents > 0) {
          console.log('    ⏳ Waiting 65 seconds for rate limit...');
          await new Promise(resolve => setTimeout(resolve, 65000));
        }
        
        // Get event results from ZwiftRacing API
        const results = await zwiftClient.getEventResults(parseInt(eventId));
        
        if (!results || results.length === 0) {
          console.log(`    ⚠️  No results for event ${eventId}`);
          continue;
        }
        
        // Extract event metadata from first result
        const firstResult = results[0];
        
        // Insert event
        const { error: eventError } = await (supabase as any).client
          .from('zwift_api_events')
          .insert({
            event_id: eventId,
            title: firstResult.eventName || `Event ${eventId}`,
            event_date: firstResult.eventDate ? new Date(firstResult.eventDate * 1000).toISOString() : new Date().toISOString(),
            event_type: firstResult.category || 'Race',
            route_name: firstResult.route,
            distance_km: firstResult.distanceKm,
            laps: firstResult.laps,
            duration_minutes: firstResult.durationMinutes,
            raw_data: firstResult
          });
        
        if (eventError) {
          console.log(`    ❌ Event insert error: ${eventError.message}`);
          continue;
        }
        
        console.log(`    ✅ Event ${eventId} synced`);
        syncedEvents++;
        
        // Insert results for this event
        const resultsToInsert = results.map((r: any) => ({
          event_id: eventId,
          rider_id: r.riderId,
          rank: r.rank,
          finish_time_seconds: r.timeSeconds,
          avg_wkg: r.avgWkg,
          avg_watts: r.avgWatts,
          avg_hr: r.avgHr,
          normalized_power: r.normalizedPower,
          intensity_factor: r.intensityFactor,
          variability_index: r.variabilityIndex,
          raw_data: r
        }));
        
        const { error: resultsError } = await (supabase as any).client
          .from('zwift_api_race_results')
          .insert(resultsToInsert);
        
        if (resultsError) {
          console.log(`    ❌ Results insert error: ${resultsError.message}`);
        } else {
          console.log(`    ✅ ${resultsToInsert.length} results synced`);
          syncedResults += resultsToInsert.length;
        }
        
      } catch (error: any) {
        console.log(`    ❌ Error processing event ${eventId}: ${error.message}`);
        if (error.message.includes('Rate limit')) {
          console.log('    ⏸️  Rate limit hit, stopping sync');
          break;
        }
      }
    }
    
    // Step 4: Summary
    console.log('\n=====================================');
    console.log('📊 SYNC SUMMARY');
    console.log('=====================================');
    console.log(`Events synced:   ${syncedEvents}`);
    console.log(`Events skipped:  ${skippedEvents}`);
    console.log(`Results synced:  ${syncedResults}`);
    console.log('=====================================\n');
    
    // Step 5: Verify data for rider 150437
    console.log('🔍 Verifying rider 150437 results...');
    
    const { data: riderResults, error: resultsError } = await (supabase as any).client
      .from('zwift_api_race_results')
      .select('event_id, rank, finish_time_seconds')
      .eq('rider_id', RIDER_ID)
      .order('event_id', { ascending: false })
      .limit(10);
    
    if (riderResults && riderResults.length > 0) {
      console.log(`✅ Found ${riderResults.length} results for rider 150437 in database`);
      console.log('\nRecent results:');
      riderResults.forEach((r: any) => {
        console.log(`  Event ${r.event_id}: Rank ${r.rank}, Time ${Math.floor(r.finish_time_seconds / 60)}:${String(r.finish_time_seconds % 60).padStart(2, '0')}`);
      });
    } else {
      console.log('⚠️  No results found in database');
    }
    
    console.log('\n✅ Sync complete!');
    
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    console.error(error.stack);
  }
})();
