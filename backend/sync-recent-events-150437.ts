import 'dotenv/config';
import { supabase } from './src/services/supabase.service.js';
import { zwiftClient } from './src/api/zwift-client.js';

const RIDER_ID = 150437;

// Events na 24-11-2025 die mogelijk gereden zijn
const RECENT_EVENTS = [
  5229579, // 30-11 (last race volgens API!) - nog niet gesaved
  // 5206710, // 27-11 - already saved (incomplete data)
];

async function syncRecentEvents() {
  console.log('🔄 SYNC RECENT EVENTS for Rider 150437\n');
  console.log('═'.repeat(60));
  
  for (let i = 0; i < RECENT_EVENTS.length; i++) {
    const eventId = RECENT_EVENTS[i];
    
    console.log(`\n📅 Event ${i + 1}/${RECENT_EVENTS.length}: ${eventId}`);
    console.log('─'.repeat(60));
    
    try {
      // Fetch from API
      console.log('Fetching from ZwiftRacing.app API...');
      const results = await zwiftClient.getEventResults(eventId);
      
      console.log(`✅ Got ${results.length} riders`);
      
      // Find our rider
      const riderResult = results.find((r: any) => r.riderId === RIDER_ID);
      
      if (riderResult) {
        console.log(`\n🎯 Rider 150437 FOUND in this event!`);
        console.log(`   Name: ${riderResult.name}`);
        console.log(`   Category: ${riderResult.category || 'N/A'}`);
        console.log(`   Time: ${riderResult.time ? `${Math.floor(riderResult.time / 60)}:${String(Math.floor(riderResult.time % 60)).padStart(2, '0')}` : 'N/A'}`);
        console.log(`   Position in cat: ${riderResult.positionInCategory || 'N/A'}`);
        console.log(`   Rating: ${riderResult.rating?.toFixed(2) || 'N/A'} (Δ ${riderResult.ratingDelta > 0 ? '+' : ''}${riderResult.ratingDelta?.toFixed(2) || 'N/A'})`);
        
        // Map to database format
        // Note: Some events have minimal data (no eventName, rank, power curve)
        const eventData: any = {
          event_id: String(eventId),
          rider_id: RIDER_ID,
          rider_name: riderResult.name,
          position_in_category: riderResult.positionInCategory,
          total_riders: results.length,
          velo_rating: riderResult.rating ? Math.round(riderResult.rating) : null,
          velo_previous: riderResult.ratingBefore ? Math.round(riderResult.ratingBefore) : null,
          velo_change: riderResult.ratingDelta ? Math.round(riderResult.ratingDelta) : null,
        };
        
        // Add time (can be 'time' or 'finishTimeSeconds')
        if (riderResult.time) {
          eventData.time_seconds = Math.round(riderResult.time);
        } else if (riderResult.finishTimeSeconds) {
          eventData.time_seconds = riderResult.finishTimeSeconds;
        }
        
        // Add optional fields if present
        if (riderResult.eventName) eventData.event_name = riderResult.eventName;
        if (riderResult.eventDate) eventData.event_date = new Date(riderResult.eventDate * 1000).toISOString();
        if (riderResult.rank) eventData.rank = riderResult.rank;
        if (riderResult.avgWkg) eventData.avg_wkg = riderResult.avgWkg;
        if (riderResult.pen) eventData.pen = riderResult.pen;
        if (riderResult.position) eventData.position = riderResult.position;
        
        // Power curve (if available)
        if (riderResult.power) {
          if (riderResult.power.fiveSecond) eventData.power_5s = riderResult.power.fiveSecond;
          if (riderResult.power.fifteenSecond) eventData.power_15s = riderResult.power.fifteenSecond;
          if (riderResult.power.thirtySecond) eventData.power_30s = riderResult.power.thirtySecond;
          if (riderResult.power.oneMinute) eventData.power_1m = riderResult.power.oneMinute;
          if (riderResult.power.twoMinute) eventData.power_2m = riderResult.power.twoMinute;
          if (riderResult.power.fiveMinute) eventData.power_5m = riderResult.power.fiveMinute;
          if (riderResult.power.twentyMinute) eventData.power_20m = riderResult.power.twentyMinute;
        }
        
        // Insert into database
        console.log('\n   Saving to database...');
        const { error } = await supabase.client
          .from('zwift_api_race_results')
          .upsert(eventData, { onConflict: 'event_id,rider_id' });
        
        if (error) {
          console.log(`   ❌ Database error: ${error.message}`);
        } else {
          console.log('   ✅ Saved to zwift_api_race_results');
        }
      } else {
        console.log(`\n⚠️  Rider 150437 NOT found in this event`);
        console.log(`   (${results.length} other riders participated)`);
      }
      
      // Rate limiting
      if (i < RECENT_EVENTS.length - 1) {
        console.log('\n⏳ Waiting 65 seconds (rate limit)...');
        await new Promise(resolve => setTimeout(resolve, 65000));
      }
      
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
      if (error.message.includes('429')) {
        console.log('⚠️  Rate limit hit! Wait 60+ seconds before retrying');
      }
    }
  }
  
  // Final check
  console.log('\n\n' + '═'.repeat(60));
  console.log('📊 FINAL CHECK');
  console.log('═'.repeat(60));
  
  const { data: allResults, error } = await supabase.client
    .from('zwift_api_race_results')
    .select('event_id, event_name, event_date, rank')
    .eq('rider_id', RIDER_ID)
    .order('event_date', { ascending: false })
    .limit(5);
  
  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log(`\n✅ Total results in database: ${allResults?.length || 0}`);
    console.log('\n📅 Most recent 5 races:');
    allResults?.forEach((r: any, i: number) => {
      const date = new Date(r.event_date).toLocaleDateString('nl-NL');
      console.log(`   ${i + 1}. ${r.event_name?.substring(0, 50)}...`);
      console.log(`      ${date} | Rank ${r.rank} | Event ${r.event_id}`);
    });
  }
  
  console.log('\n✅ Sync complete!');
}

syncRecentEvents().catch(console.error);
