/**
 * Quick Sync Script - Vervang seed data met real results
 * Run: npm run sync-live
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ZWIFT_API_KEY = process.env.ZWIFT_API_KEY || '';
const ZWIFT_API_BASE = 'https://zwift-ranking.herokuapp.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const zwiftApi = axios.create({
  baseURL: ZWIFT_API_BASE,
  headers: { 'Authorization': ZWIFT_API_KEY },
  timeout: 30000,
});

console.log('🚀 TeamNL Results - LIVE SYNC\n');

async function main() {
  try {
    // Step 1: Delete seed data
    console.log('🗑️  Deleting seed data (5000%)...');
    const { error: deleteError } = await supabase
      .from('zwift_api_race_results')
      .delete()
      .ilike('event_id', '5000%');
    
    if (deleteError) throw deleteError;
    console.log('✅ Seed data deleted\n');
    
    // Step 2: Get team riders
    console.log('📊 Fetching team riders...');
    const { data: riders, error: ridersError } = await supabase
      .from('riders')
      .select('rider_id, name')
      .order('name');
    
    if (ridersError) throw ridersError;
    console.log(`✅ Found ${riders?.length || 0} riders\n`);
    
    if (!riders || riders.length === 0) {
      console.log('⚠️  No riders found. Run club sync first.');
      return;
    }
    
    const teamRiderIds = riders.map(r => r.rider_id);
    console.log(`Team: ${riders.map(r => r.name).join(', ')}\n`);
    
    // Step 3: Get recent events (laatste 30 dagen)
    console.log('📅 Fetching recent events (last 30 days)...');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffUnix = Math.floor(cutoff.getTime() / 1000);
    
    const { data: events, error: eventsError } = await supabase
      .from('zwift_api_events')
      .select('event_id, title, time_unix')
      .gte('time_unix', cutoffUnix)
      .order('time_unix', { ascending: false })
      .limit(20); // Max 20 events
    
    if (eventsError) throw eventsError;
    console.log(`✅ Found ${events?.length || 0} events\n`);
    
    if (!events || events.length === 0) {
      console.log('⚠️  No recent events found.');
      return;
    }
    
    // Step 4: Fetch results per event
    const allResults: any[] = [];
    let eventsProcessed = 0;
    
    console.log(`\n⏳ Starting sync with 60s rate limit between calls...\n`);
    
    for (const event of events.slice(0, 3)) { // Test met 3 events eerst
      try {
        console.log(`🔍 Event ${event.event_id}: ${event.title}`);
        
        const response = await zwiftApi.get(`/public/results/${event.event_id}`);
        const results = response.data;
        
        if (!Array.isArray(results)) {
          console.log(`   ⚠️  No results array returned`);
          continue;
        }
        
        // Filter team members
        const teamResults = results.filter((r: any) => 
          teamRiderIds.includes(r.riderId || r.rider_id)
        );
        
        if (teamResults.length === 0) {
          console.log(`   → No team members in this event`);
          eventsProcessed++;
          continue;
        }
        
        console.log(`   ✅ Found ${teamResults.length} team results`);
        
        // Convert to DB format
        for (const result of teamResults) {
          const riderId = result.riderId || result.rider_id;
          const rider = riders.find(r => r.rider_id === riderId);
          
          allResults.push({
            event_id: event.event_id.toString(),
            event_name: event.title || 'Unknown',
            event_date: new Date(event.time_unix * 1000).toISOString(),
            rider_id: riderId,
            rider_name: rider?.name || result.riderName || result.name || 'Unknown',
            rank: result.rank || result.position || 0,
            time_seconds: result.timeInSeconds || result.time_seconds || 0,
            avg_wkg: result.avgWkg || result.avg_wkg || 0,
            pen: result.category || result.pen || 'A',
            total_riders: results.length,
            velo_rating: result.velo || result.veloRating || result.velo_rating || null,
            velo_previous: result.veloPrevious || result.velo_previous || null,
            velo_change: result.veloChange || result.velo_change || 0,
            power_5s: result.power5s || result.power_5s || null,
            power_15s: result.power15s || result.power_15s || null,
            power_30s: result.power30s || result.power_30s || null,
            power_1m: result.power1m || result.power_1m || null,
            power_2m: result.power2m || result.power_2m || null,
            power_5m: result.power5m || result.power_5m || null,
            power_20m: result.power20m || result.power_20m || null,
            effort_score: result.effortScore || result.effort_score || null,
            race_points: result.racePoints || result.race_points || null,
            delta_winner_seconds: result.deltaToWinner || result.delta_winner_seconds || null,
          });
        }
        
        eventsProcessed++;
        
        
      } catch (error: any) {
        const msg = error.response?.status === 429 
          ? 'Rate limit reached'
          : error.message || 'Unknown error';
        console.log(`   ❌ Error: ${msg}`);
        
        // Bij 429 stoppen we
        if (error.response?.status === 429) {
          console.log(`\n⚠️  API rate limit bereikt. Stop sync.\n`);
          break;
        }
      }
      
      // Rate limiting: 60s wachttijd tussen elke event
      if (eventsProcessed < 3) {
        console.log(`   ⏳ Waiting 60s (rate limit)...`);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }
    
    console.log(`\n📦 Total results collected: ${allResults.length}`);
    
    if (allResults.length === 0) {
      console.log('⚠️  No team results to insert');
      return;
    }
    
    // Step 5: Insert into database
    console.log('💾 Inserting into database...');
    const { data: inserted, error: insertError } = await supabase
      .from('zwift_api_race_results')
      .insert(allResults)
      .select();
    
    if (insertError) throw insertError;
    
    console.log(`✅ Success! Inserted ${inserted?.length || 0} results\n`);
    
    // Summary
    const uniqueRiders = new Set(allResults.map(r => r.rider_name));
    const uniqueEvents = new Set(allResults.map(r => r.event_id));
    
    console.log('📊 Summary:');
    console.log(`   Events: ${uniqueEvents.size}`);
    console.log(`   Riders: ${uniqueRiders.size} (${Array.from(uniqueRiders).join(', ')})`);
    console.log(`   Results: ${allResults.length}\n`);
    
    console.log('🎉 LIVE DATA SYNC COMPLETE!\n');
    console.log('👉 Check: http://localhost:5173/results');
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

main();
