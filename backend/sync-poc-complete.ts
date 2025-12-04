import dotenv from 'dotenv';
dotenv.config();

// Lazy load clients to ensure env vars are loaded
const zwiftClient = (await import('./src/api/zwift-client.js')).zwiftClient;
const { supabase } = await import('./src/services/supabase.service.js');

const EVENT_ID = 5229579;

(async () => {
  try {
    console.log(`🔄 Syncing event ${EVENT_ID} and results...\n`);
    
    // Step 1: Get race results (we'll create basic event from results)
    console.log('📥 Fetching results from ZwiftRacing API...');
    const results = await zwiftClient.getEventResults(EVENT_ID);
    
    if (!results || results.length === 0) {
      console.log('❌ No results found for event', EVENT_ID);
      return;
    }
    
    console.log(`✅ Found ${results.length} results\n`);
    
    // Step 2: Create basic event record
    console.log('💾 Creating event record (event', EVENT_ID, ')...');
    const { data: existingEvent } = await (supabase as any).client
      .from('zwift_api_events')
      .select('event_id')
      .eq('event_id', EVENT_ID.toString())
      .single();
    
    if (existingEvent) {
      console.log('⚠️  Event already exists in database\n');
    } else {
      const { error: eventError } = await (supabase as any).client
        .from('zwift_api_events')
        .insert({
          event_id: EVENT_ID.toString(),
          title: `POC Race Event ${EVENT_ID}`,
          time_unix: Math.floor(Date.now() / 1000),
          event_type: 'Race',
          raw_response: { eventId: EVENT_ID, source: 'poc_sync', resultsCount: results.length }
        });
      
      if (eventError) {
        console.error('❌ Event insert error:', eventError.message);
      } else {
        console.log('✅ Event record created\n');
      }
    }
    
    // Step 3: Insert results
    console.log('💾 Inserting race results...');
    
    // Check existing results
    const { count } = await (supabase as any).client
      .from('zwift_api_race_results')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', EVENT_ID.toString());
    
    if (count && count > 0) {
      console.log(`⚠️  ${count} results already exist, skipping insert\n`);
    } else {
      const resultsToInsert = results.map((r: any, index: number) => ({
        event_id: EVENT_ID.toString(),
        rider_id: r.riderId || r.rider_id,
        rider_name: r.riderName || r.name || 'Unknown',
        rank: index + 1,
        time_seconds: r.time || r.timeSeconds,
        avg_wkg: r.avgWkg || r.avg_wkg,
        avg_watts: r.avgWatts || r.avg_watts,
        pen: r.pen || r.category,
        raw_response: r
      }));
      
      const { error: resultsError } = await (supabase as any).client
        .from('zwift_api_race_results')
        .insert(resultsToInsert);
      
      if (resultsError) {
        console.error('❌ Results insert error:', resultsError.message);
      } else {
        console.log(`✅ Inserted ${resultsToInsert.length} race results\n`);
      }
    }
    
    // Step 5: Verify data
    console.log('🔍 Verification:');
    
    const { data: eventData } = await (supabase as any).client
      .from('zwift_api_events')
      .select('event_id, title, time_unix')
      .eq('event_id', EVENT_ID.toString())
      .single();
    
    const { count: resultCount } = await (supabase as any).client
      .from('zwift_api_race_results')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', EVENT_ID.toString());
    
    console.log('  Event:', eventData ? `✅ ${eventData.title}` : '❌ Not found');
    console.log('  Results:', resultCount ? `✅ ${resultCount} results` : '❌ No results');
    console.log('\n✅ POC sync complete!');
    
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    if (error.response) {
      console.error('   API Response:', error.response.status, error.response.statusText);
    }
  }
})();
