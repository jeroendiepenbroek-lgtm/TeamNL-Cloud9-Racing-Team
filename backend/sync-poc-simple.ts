import dotenv from 'dotenv';
dotenv.config();

const zwiftClient = (await import('./src/api/zwift-client.js')).zwiftClient;
const { supabase } = await import('./src/services/supabase.service.js');

const EVENT_ID = 5229579;

(async () => {
  try {
    console.log(`🔄 Syncing results for event ${EVENT_ID}...\n`);
    
    // Get race results
    console.log('📥 Fetching results from ZwiftRacing API...');
    const results = await zwiftClient.getEventResults(EVENT_ID);
    
    if (!results || results.length === 0) {
      console.log('❌ No results found');
      return;
    }
    
    console.log(`✅ Found ${results.length} results\n`);
    console.log('Sample result:', JSON.stringify(results[0], null, 2));
    
    // Insert results
    console.log('\n💾 Inserting race results...');
    
    const { count } = await (supabase as any).client
      .from('zwift_api_race_results')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', EVENT_ID.toString());
    
    if (count && count > 0) {
      console.log(`⚠️  ${count} results already exist, skipping\n`);
    } else {
      const resultsToInsert = results.map((r: any, index: number) => ({
        event_id: EVENT_ID.toString(),
        rider_id: r.riderId,
        rank: index + 1,
        finish_time_seconds: r.time,
        category: r.category,
        position_in_category: r.positionInCategory,
        rating: r.rating,
        rating_before: r.ratingBefore,
        rating_delta: r.ratingDelta,
        raw_data: r
      }));
      
      const { error } = await (supabase as any).client
        .from('zwift_api_race_results')
        .insert(resultsToInsert);
      
      if (error) {
        console.error('❌ Insert error:', error.message);
      } else {
        console.log(`✅ Inserted ${resultsToInsert.length} results\n`);
      }
    }
    
    // Verify
    const { count: finalCount } = await (supabase as any).client
      .from('zwift_api_race_results')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', EVENT_ID.toString());
    
    console.log(`🔍 Verification: ${finalCount} results in database`);
    console.log('✅ Sync complete!');
    
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
  }
})();
