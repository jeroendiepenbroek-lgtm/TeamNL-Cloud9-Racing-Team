#!/usr/bin/env npx tsx
/**
 * Sync specifieke events naar database
 * Wacht automatisch op rate limits
 */

import dotenv from 'dotenv';
dotenv.config();

const { zwiftClient } = await import('./src/api/zwift-client.js');
const { supabase } = await import('./src/services/supabase.service.js');

const EVENTS_TO_SYNC = [
  { id: 5206710, date: '2025-11-27', name: 'Race 27-11-2025' },
  { id: 5229579, date: '2025-11-30', name: 'Race 30-11-2025' },
];

const RIDER_ID = 150437;

console.log('🔄 Syncing missing events...\n');
console.log('⚠️  Rate limit: 1 event/min - dit duurt ~2 minuten\n');

for (let i = 0; i < EVENTS_TO_SYNC.length; i++) {
  const event = EVENTS_TO_SYNC[i];
  
  console.log(`\n[${i + 1}/${EVENTS_TO_SYNC.length}] Event ${event.id} (${event.date})`);
  console.log('─'.repeat(50));
  
  try {
    // Fetch event results
    console.log('📥 Fetching results...');
    const results = await zwiftClient.getEventResults(event.id);
    
    if (!results || results.length === 0) {
      console.log('   ⚠️  No results found');
      continue;
    }
    
    console.log(`   ✅ Got ${results.length} participants`);
    
    // Find all rider results (niet alleen onze rider)
    const ridersToInsert: any[] = [];
    
    for (const result of results) {
      const data = {
        event_id: String(event.id),
        rider_id: result.riderId || result.rider_id,
        event_name: result.eventName || event.name,
        event_date: result.eventDate || event.date,
        rider_name: result.riderName || result.name,
        rank: result.rank || result.position,
        time_seconds: result.finishTimeSeconds || result.time_seconds || result.time,
        avg_wkg: result.avgWkg || result.avg_wkg,
        avg_watts: result.avgWatts || result.avg_watts,
        avg_hr: result.avgHr || result.avg_hr,
        pen: result.pen || result.category,
        total_riders: results.length,
        normalized_power: result.normalizedPower,
        intensity_factor: result.intensityFactor,
        variability_index: result.variabilityIndex,
      };
      
      ridersToInsert.push(data);
    }
    
    // Batch insert
    console.log(`💾 Inserting ${ridersToInsert.length} results...`);
    const { error } = await (supabase as any).client
      .from('zwift_api_race_results')
      .upsert(ridersToInsert, { 
        onConflict: 'event_id,rider_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.log(`   ❌ Insert error: ${error.message}`);
    } else {
      console.log(`   ✅ Inserted successfully!`);
      
      // Check onze rider
      const ourResult = ridersToInsert.find(r => r.rider_id === RIDER_ID);
      if (ourResult) {
        console.log(`   🎯 Rider ${RIDER_ID}: Rank ${ourResult.rank} / ${ridersToInsert.length} | ${ourResult.avg_wkg} w/kg`);
      }
    }
    
    // Rate limit wachten (behalve laatste)
    if (i < EVENTS_TO_SYNC.length - 1) {
      console.log('\n⏳ Waiting 65 seconds for rate limit...');
      await new Promise(resolve => setTimeout(resolve, 65000));
    }
    
  } catch (error: any) {
    if (error.message?.includes('Rate limit')) {
      console.log('   ⚠️  Rate limit hit - waiting 65 seconds...');
      await new Promise(resolve => setTimeout(resolve, 65000));
      i--; // Retry this event
    } else {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
}

// Verify
console.log('\n\n✅ Sync complete! Verifying...\n');
const { data: verified } = await (supabase as any).client
  .from('zwift_api_race_results')
  .select('event_id, event_name, event_date, rank')
  .eq('rider_id', RIDER_ID)
  .in('event_id', EVENTS_TO_SYNC.map(e => String(e.id)))
  .order('event_date', { ascending: false });

if (verified && verified.length > 0) {
  console.log(`📊 Found ${verified.length} / ${EVENTS_TO_SYNC.length} events for rider ${RIDER_ID}:\n`);
  verified.forEach((r: any) => {
    console.log(`✅ Event ${r.event_id}: ${r.event_name}`);
    console.log(`   Date: ${new Date(r.event_date).toLocaleDateString('nl-NL')} | Rank: ${r.rank}`);
  });
} else {
  console.log('❌ No events found after sync');
}

console.log('\n✅ Done!');
