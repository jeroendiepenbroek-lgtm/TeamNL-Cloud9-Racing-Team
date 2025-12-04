import dotenv from 'dotenv';
dotenv.config();

const zwiftClient = (await import('./src/api/zwift-client.js')).zwiftClient;
const { supabase } = await import('./src/services/supabase.service.js');

// Known event IDs where rider 150437 participated (from ZwiftPower or manual)
const KNOWN_EVENTS = [
  5229579, // POC event
  // Add more event IDs here as we discover them
];

const RIDER_ID = 150437;

(async () => {
  try {
    console.log('🏁 RESULTS PAGE DATA SYNC');
    console.log('===============================\n');
    
    console.log(`📊 Processing ${KNOWN_EVENTS.length} known events for rider ${RIDER_ID}...\n`);
    
    let syncedEvents = 0;
    let syncedResults = 0;
    let riderResults = 0;
    
    for (const eventId of KNOWN_EVENTS) {
      try {
        console.log(`📥 Event ${eventId}:`);
        
        // Check if already synced
        const { data: existingEvent } = await (supabase as any).client
          .from('zwift_api_events')
          .select('event_id')
          .eq('event_id', eventId.toString())
          .single();
        
        const { count: existingResults } = await (supabase as any).client
          .from('zwift_api_race_results')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId.toString());
        
        if (existingEvent && existingResults && existingResults > 0) {
          console.log(`  ✅ Already synced (${existingResults} results)`);
          
          // Check if rider 150437 is in results
          const { data: riderResult } = await (supabase as any).client
            .from('zwift_api_race_results')
            .select('rank, finish_time_seconds, avg_wkg')
            .eq('event_id', eventId.toString())
            .eq('rider_id', RIDER_ID)
            .single();
          
          if (riderResult) {
            console.log(`  🏆 Rider 150437: Rank ${riderResult.rank}, ${riderResult.avg_wkg?.toFixed(2)} w/kg`);
            riderResults++;
          }
          
          continue;
        }
        
        // Wait for rate limit
        if (syncedEvents > 0) {
          console.log('  ⏳ Waiting 65s for rate limit...');
          await new Promise(resolve => setTimeout(resolve, 65000));
        }
        
        // Fetch results
        console.log('  📥 Fetching results from ZwiftRacing API...');
        const results = await zwiftClient.getEventResults(eventId);
        
        if (!results || results.length === 0) {
          console.log('  ⚠️  No results found');
          continue;
        }
        
        console.log(`  ✅ Found ${results.length} results`);
        
        // Find rider 150437 in results
        const riderResult = results.find((r: any) => r.riderId === RIDER_ID);
        if (riderResult) {
          console.log(`  🏆 Rider 150437: Rank ${riderResult.rank}`);
          riderResults++;
        }
        
        // Insert/update event
        if (!existingEvent) {
          const firstResult = results[0];
          const { error: eventError } = await (supabase as any).client
            .from('zwift_api_events')
            .upsert({
              event_id: eventId.toString(),
              title: firstResult.eventName || `Event ${eventId}`,
              event_date: firstResult.eventDate ? 
                new Date(firstResult.eventDate * 1000).toISOString() : 
                new Date().toISOString(),
              event_type: firstResult.category || 'Race',
              route_name: firstResult.route,
              distance_km: firstResult.distanceKm,
              laps: firstResult.laps,
              duration_minutes: firstResult.durationMinutes,
              raw_data: firstResult
            });
          
          if (eventError) {
            console.log(`  ❌ Event error: ${eventError.message}`);
            continue;
          }
          console.log('  ✅ Event synced');
          syncedEvents++;
        }
        
        // Insert results
        const resultsToInsert = results.map((r: any) => ({
          event_id: eventId.toString(),
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
        
        // Batch insert
        const batchSize = 100;
        for (let i = 0; i < resultsToInsert.length; i += batchSize) {
          const batch = resultsToInsert.slice(i, i + batchSize);
          const { error: resultsError } = await (supabase as any).client
            .from('zwift_api_race_results')
            .upsert(batch, { onConflict: 'event_id,rider_id' });
          
          if (resultsError) {
            console.log(`  ❌ Results batch ${i} error: ${resultsError.message}`);
          }
        }
        
        console.log(`  ✅ ${resultsToInsert.length} results synced\n`);
        syncedResults += resultsToInsert.length;
        
      } catch (error: any) {
        console.log(`  ❌ Error: ${error.message}\n`);
        if (error.message.includes('Rate limit')) {
          console.log('⏸️  Rate limit hit, stopping');
          break;
        }
      }
    }
    
    // Summary
    console.log('===============================');
    console.log('📊 SYNC SUMMARY');
    console.log('===============================');
    console.log(`Events processed:  ${KNOWN_EVENTS.length}`);
    console.log(`Events synced:     ${syncedEvents}`);
    console.log(`Total results:     ${syncedResults}`);
    console.log(`Rider 150437:      ${riderResults} races`);
    console.log('===============================\n');
    
    // Verify Results Dashboard data
    console.log('🔍 Testing Results Dashboard endpoint...\n');
    
    const { data: teamResults } = await (supabase as any).client
      .from('zwift_api_race_results')
      .select(`
        event_id,
        rider_id,
        rank,
        finish_time_seconds,
        avg_wkg,
        avg_watts
      `)
      .eq('rider_id', RIDER_ID)
      .order('event_id', { ascending: false })
      .limit(10);
    
    if (teamResults && teamResults.length > 0) {
      console.log(`✅ Results Dashboard ready with ${teamResults.length} results`);
      console.log('\nRecent races for rider 150437:');
      teamResults.forEach((r: any, i: number) => {
        const minutes = Math.floor(r.finish_time_seconds / 60);
        const seconds = r.finish_time_seconds % 60;
        console.log(`  ${i + 1}. Event ${r.event_id}: Rank ${r.rank}, ${minutes}:${String(seconds).padStart(2, '0')}, ${r.avg_wkg?.toFixed(2)} w/kg`);
      });
    } else {
      console.log('⚠️  No results data available yet');
    }
    
    console.log('\n✅ Sync complete! Results page is ready.');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
})();
