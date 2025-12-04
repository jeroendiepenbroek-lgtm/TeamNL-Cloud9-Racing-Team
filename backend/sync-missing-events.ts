#!/usr/bin/env npx tsx
/**
 * Sync Missing Events: 5206710 en 5229579
 */

import dotenv from 'dotenv';
dotenv.config();

const { zwiftClient } = await import('./src/api/zwift-client.js');
const { supabase } = await import('./src/services/supabase.service.js');

const MISSING_EVENTS = [5206710, 5229579];
const RIDER_ID = 150437;

console.log('🔄 Syncing missing events for rider 150437...\n');

for (const eventId of MISSING_EVENTS) {
  console.log(`\n📥 Fetching event ${eventId}...`);
  
  try {
    // Haal event results op via ZwiftRacing API
    const results = await zwiftClient.getEventResults(eventId);
    
    if (!results || results.length === 0) {
      console.log(`   ⚠️  No results found for event ${eventId}`);
      continue;
    }
    
    // Filter voor onze rider
    const riderResult = results.find((r: any) => r.riderId === RIDER_ID);
    
    if (!riderResult) {
      console.log(`   ⚠️  Rider ${RIDER_ID} not found in event ${eventId}`);
      console.log(`   Total participants: ${results.length}`);
      continue;
    }
    
    console.log(`   ✅ Found rider result!`);
    console.log(`   Event: ${riderResult.eventName || 'Unknown'}`);
    console.log(`   Rank: ${riderResult.rank}`);
    console.log(`   Time: ${riderResult.finishTimeSeconds}s`);
    console.log(`   Power: ${riderResult.avgWkg} w/kg`);
    
    // Prepareer data voor insert
    const insertData = {
      event_id: eventId.toString(),
      rider_id: RIDER_ID,
      event_name: riderResult.eventName,
      event_date: riderResult.eventDate || new Date().toISOString(),
      rider_name: riderResult.riderName || 'JRøne CloudRacer-9',
      rank: riderResult.rank,
      time_seconds: riderResult.finishTimeSeconds,
      avg_wkg: riderResult.avgWkg,
      pen: riderResult.pen || riderResult.category,
      total_riders: results.length,
      avg_watts: riderResult.avgWatts,
      avg_hr: riderResult.avgHr,
      normalized_power: riderResult.normalizedPower,
      intensity_factor: riderResult.intensityFactor,
      variability_index: riderResult.variabilityIndex,
      raw_data: riderResult
    };
    
    // Insert into database
    const { error } = await (supabase as any).client
      .from('zwift_api_race_results')
      .insert(insertData);
    
    if (error) {
      console.log(`   ❌ Insert failed:`, error.message);
    } else {
      console.log(`   ✅ Inserted into database!`);
    }
    
    // Rate limit: 1 request per 60 seconds
    if (eventId !== MISSING_EVENTS[MISSING_EVENTS.length - 1]) {
      console.log('   ⏳ Waiting 65 seconds for rate limit...');
      await new Promise(resolve => setTimeout(resolve, 65000));
    }
    
  } catch (error: any) {
    console.error(`   ❌ Error syncing event ${eventId}:`, error.message);
  }
}

console.log('\n✅ Sync complete! Verifying...\n');

// Verify
const { data: updated } = await (supabase as any).client
  .from('zwift_api_race_results')
  .select('event_id, event_name, event_date')
  .eq('rider_id', RIDER_ID)
  .in('event_id', MISSING_EVENTS.map(String))
  .order('event_date', { ascending: false });

console.log(`Found ${updated?.length || 0} / ${MISSING_EVENTS.length} events in database`);
updated?.forEach((r: any) => {
  console.log(`✅ ${r.event_id}: ${r.event_name} (${new Date(r.event_date).toLocaleDateString('nl-NL')})`);
});
