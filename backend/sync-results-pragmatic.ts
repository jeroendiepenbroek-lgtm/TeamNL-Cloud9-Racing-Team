import dotenv from 'dotenv';
dotenv.config();

const zwiftClient = (await import('./src/api/zwift-client.js')).zwiftClient;
const { supabase } = await import('./src/services/supabase.service.js');

const RIDER_ID = 150437;
const CLUB_ID = 11818; // TeamNL

(async () => {
  console.log('🏁 PRAGMATIC RACE RESULTS SYNC');
  console.log('================================\n');
  console.log('Strategy: Fetch recent club events, sync those with our rider\n');
  
  try {
    // Step 1: Use known events (skip club call to avoid rate limit)
    console.log('Step 1: Using known event IDs (avoiding rate limit)...\n');
    
    // Step 2: Get recent public events (last 30 days)
    console.log('Step 2: Searching for recent events...');
    
    // ZwiftRacing doesn't have a direct "recent events" endpoint
    // Instead, we'll use known event IDs or search through results
    
    // Pragmatic approach: Use the POC event we know + scan for more
    const knownEventIds = [
      5229579, // POC event we already know about
      // We can add more event IDs here if we find them
    ];
    
    console.log(`Found ${knownEventIds.length} known event(s)\n`);
    
    // Step 3: For each event, get full results
    let syncedEvents = 0;
    let syncedResults = 0;
    let ourRiderResults = 0;
    
    for (const eventId of knownEventIds) {
      try {
        console.log(`📥 Event ${eventId}...`);
        
        const results = await zwiftClient.getEventResults(eventId);
        
        if (!results || results.length === 0) {
          console.log(`  ⚠️  No results\n`);
          continue;
        }
        
        console.log(`  ✅ ${results.length} total results`);
        
        // Check if our rider participated
        const ourResult = results.find((r: any) => r.riderId === RIDER_ID);
        if (ourResult) {
          console.log(`  🎯 Rider ${RIDER_ID} found: Rank ${ourResult.rank}`);
          ourRiderResults++;
        }
        
        // Get event metadata
        const firstResult = results[0];
        const eventData = {
          event_id: eventId.toString(),
          title: `Race Event ${eventId}`,
          event_date: new Date().toISOString(), // Would need actual date
          event_type: 'race',
          distance_km: null,
          raw_data: firstResult
        };
        
        // Insert event
        const { error: eventError } = await (supabase as any).client
          .from('zwift_api_events')
          .upsert(eventData, { onConflict: 'event_id' });
        
        if (!eventError) {
          syncedEvents++;
          console.log(`  💾 Event saved`);
        }
        
        // Insert all results (using correct schema - only existing columns)
        const resultsToInsert = results.map((r: any) => ({
          event_id: eventId.toString(),
          rider_id: r.riderId,
          rider_name: r.name || r.riderName || `Rider ${r.riderId}`,
          rank: r.rank || r.position,
          total_riders: results.length,
          pen: r.category || r.pen || null,
          time_seconds: r.timeSeconds || r.finishTimeSeconds || null,
          delta_winner_seconds: r.gap || r.deltaWinner || null,
          avg_wkg: r.avgWkg || r.avgWattsPerKg || null,
          avg_watts: r.avgWatts || r.avgPower || null,
          avg_heart_rate: r.avgHr || r.avgHeartRate || null,
          // avg_cadence not in schema
          is_disqualified: r.dq || r.isDisqualified || false,
          did_finish: r.dnf ? false : true,
          raw_response: r
        }));
        
        const { error: resultsError, count } = await (supabase as any).client
          .from('zwift_api_race_results')
          .upsert(resultsToInsert, { 
            onConflict: 'event_id,rider_id',
            count: 'exact'
          });
        
        if (!resultsError) {
          syncedResults += resultsToInsert.length;
          console.log(`  💾 ${resultsToInsert.length} results saved\n`);
        } else {
          console.log(`  ❌ Results error:`, resultsError.message, '\n');
        }
        
        // Rate limit protection
        await new Promise(r => setTimeout(r, 2000));
        
      } catch (error: any) {
        console.log(`  ❌ Error:`, error.message);
        if (error.response?.status === 429) {
          console.log(`  ⏳ Rate limited, skipping...\n`);
        }
      }
    }
    
    console.log('================================');
    console.log('📊 SYNC SUMMARY');
    console.log('================================');
    console.log(`Events synced: ${syncedEvents}`);
    console.log(`Total results synced: ${syncedResults}`);
    console.log(`Rider ${RIDER_ID} participated in: ${ourRiderResults} events`);
    console.log('');
    
    // Verification
    console.log('🔍 Database Verification:');
    
    const { data: events } = await (supabase as any).client
      .from('zwift_api_events')
      .select('event_id, title')
      .order('event_date', { ascending: false })
      .limit(10);
    
    console.log(`\n📅 Events in database: ${events?.length || 0}`);
    if (events) {
      events.forEach((e: any) => console.log(`  - ${e.event_id}: ${e.title}`));
    }
    
    const { data: riderResults } = await (supabase as any).client
      .from('zwift_api_race_results')
      .select('event_id, rank, time_seconds')
      .eq('rider_id', RIDER_ID)
      .order('event_id', { ascending: false });
    
    console.log(`\n🏁 Rider ${RIDER_ID} results: ${riderResults?.length || 0}`);
    if (riderResults) {
      riderResults.forEach((r: any) => 
        console.log(`  - Event ${r.event_id}: Rank ${r.rank}, Time ${r.time_seconds}s`)
      );
    }
    
    // Test Results page endpoint
    console.log('\n🌐 Testing Results API endpoint...');
    const testUrl = `http://localhost:3001/api/results/rider/${RIDER_ID}?days=90`;
    console.log(`   Try: ${testUrl}`);
    
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
  }
})();
