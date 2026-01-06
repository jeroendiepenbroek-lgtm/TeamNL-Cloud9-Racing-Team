/**
 * SLIMME RACE SCANNER V2
 * 
 * Problemen met oude aanpak:
 * - Scande 4500+ events blind (1-5% hit rate)
 * - Rate limit: 1 call per 60 seconden = 75 minuten voor 75 events!
 * 
 * Nieuwe aanpak:
 * 1. Bulk fetch ALL rider data (1 POST call, limit 1x per 15 min)
 * 2. Filter riders die recent geraced hebben
 * 3. Scan ALLEEN events voor die riders
 * 4. Respecteer 60s rate limit
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const ZWIFTRACING_API_TOKEN = process.env.ZWIFTRACING_API_TOKEN || '650c6d2fc4ef6858d74cbef1';
const API_HEADERS = { 'Authorization': ZWIFTRACING_API_TOKEN }; // Geen Bearer!

export async function scanRaceResultsSmart(supabase: ReturnType<typeof createClient>) {
  const startTime = Date.now();
  
  console.log('\\n🏁 Starting SMART race results scan...');
  
  try {
    // Get config
    const { data: configData } = await supabase
      .from('race_scan_config')
      .select('*')
      .single();
    
    if (!configData?.enabled) {
      console.log('⏸️  Race scanner disabled');
      return;
    }
    
    const { data: scanConfig } = await supabase
      .from('sync_config')
      .select('config')
      .eq('sync_type', 'race_results')
      .single();
    
    const FULL_SCAN_DAYS = scanConfig?.config?.fullScanDays || 7;
    const lookbackHours = FULL_SCAN_DAYS * 24;
    const cutoffTime = Math.floor(Date.now() / 1000) - (lookbackHours * 3600);
    
    console.log(`📅 Looking for races in last ${FULL_SCAN_DAYS} days (since ${new Date(cutoffTime * 1000).toISOString()})`);
    
    // Log scan start
    await supabase.from('race_scan_log').insert({
      started_at: new Date().toISOString(),
      status: 'running'
    });
    
    // Get team riders
    const { data: myRiders } = await supabase
      .from('v_rider_complete')
      .select('rider_id, racing_name')
      .eq('is_team_member', true);
    
    if (!myRiders || myRiders.length === 0) {
      console.log('⚠️  No team riders found');
      return;
    }
    
    console.log(`📋 Team has ${myRiders.length} riders`);
    
    // STEP 1: Bulk fetch rider data to find who raced recently
    console.log('\\n🎯 Fetching rider data (bulk POST)...');
    
    const allRiderIds = myRiders.map(r => r.rider_id);
    const riderDataResponse = await axios.post(
      'https://api.zwiftracing.app/api/public/riders',
      allRiderIds,
      {
        headers: API_HEADERS,
        timeout: 30000
      }
    );
    
    const ridersWithData = riderDataResponse.data || [];
    const activeRiders = ridersWithData.filter((r: any) => {
      if (!r.race?.last?.date) return false;
      const lastRaceTime = r.race.last.date;
      return lastRaceTime >= cutoffTime;
    });
    
    console.log(`✅ ${activeRiders.length}/${myRiders.length} riders raced in last ${FULL_SCAN_DAYS} days`);
    
    if (activeRiders.length === 0) {
      console.log('✨ No riders with recent races - nothing to scan!');
      return;
    }
    
    // Show active riders
    activeRiders.slice(0, 10).forEach((r: any) => {
      const lastRace = new Date(r.race.last.date * 1000).toISOString().split('T')[0];
      console.log(`  - ${r.name} (last race: ${lastRace})`);
    });
    if (activeRiders.length > 10) {
      console.log(`  ... +${activeRiders.length - 10} more`);
    }
    
    // STEP 2: Calculate event range
    console.log('\\n🔍 Calculating event ID range...');
    
    const { data: recentEvent } = await supabase
      .from('race_results')
      .select('event_id')
      .order('event_id', { ascending: false })
      .limit(1)
      .single();
    
    const maxKnownEventId = recentEvent?.event_id || 5300000;
    const estimatedEventsPerHour = 25;
    const estimatedTotalEvents = lookbackHours * estimatedEventsPerHour;
    
    const scanStartEventId = maxKnownEventId - estimatedTotalEvents - 200;
    const scanEndEventId = maxKnownEventId + 100;
    
    const eventIdsToCheck = Array.from(
      { length: scanEndEventId - scanStartEventId },
      (_, i) => scanStartEventId + i
    );
    
    console.log(`📊 Event range: ${scanStartEventId} to ${scanEndEventId} (${eventIdsToCheck.length} total)`);
    
    // Check which are already in database
    const { data: existingEvents } = await supabase
      .from('race_results')
      .select('event_id')
      .gte('event_id', scanStartEventId)
      .lte('event_id', scanEndEventId);
    
    const existingEventIds = new Set(existingEvents?.map(e => e.event_id) || []);
    const newEventIds = eventIdsToCheck.filter(id => !existingEventIds.has(id));
    
    console.log(`✅ ${existingEventIds.size} events already in DB (skipping)`);
    console.log(`🆕 ${newEventIds.length} new events to check`);
    
    if (newEventIds.length === 0) {
      console.log('✨ Database up to date!');
      return;
    }
    
    // STEP 3: Scan events (1 per 60 seconds!)
    const activeRiderIds = new Set(activeRiders.map((r: any) => r.riderId));
    const EVENT_DELAY = 60000; // 60 seconds = API rate limit
    
    console.log(`\\n⏱️  Rate limit: 1 event per 60 seconds`);
    console.log(`⏱️  Est. time: ${Math.round(newEventIds.length / 60)} minutes for ${newEventIds.length} events\\n`);
    
    let eventsChecked = 0;
    let eventsWithTeamRiders = 0;
    let resultsSaved = 0;
    
    for (let i = 0; i < newEventIds.length; i++) {
      const eventId = newEventIds[i];
      
      try {
        eventsChecked++;
        
        const eventResponse = await axios.get(
          `https://api.zwiftracing.app/api/public/results/${eventId}`,
          {
            headers: API_HEADERS,
            timeout: 10000
          }
        );
        
        const eventData = eventResponse.data;
        const teamRiderResults = eventData.results?.filter((r: any) => 
          activeRiderIds.has(r.riderId)
        ) || [];
        
        if (teamRiderResults.length === 0) {
          continue;
        }
        
        eventsWithTeamRiders++;
        console.log(`  ✅ Event ${eventId} "${eventData.title}": ${teamRiderResults.length} team riders`);
        
        // Save to database
        const raceResults = teamRiderResults.map((r: any) => ({
          event_id: eventId,
          event_name: eventData.title || 'Unknown',
          event_date: new Date(eventData.time * 1000).toISOString(),
          event_type: eventData.type,
          event_subtype: eventData.subType,
          distance_meters: eventData.distance,
          elevation_meters: eventData.elevation,
          route_id: eventData.routeId,
          rider_id: r.riderId,
          rider_name: r.name,
          position: r.position,
          total_riders: eventData.results?.length || 0,
          category: r.category,
          time_seconds: r.time,
          gap_seconds: r.gap,
          dnf: r.dnf || false,
          velo_rating: Math.round(r.rating || 0),
          velo_before: Math.round(r.ratingBefore || 0),
          velo_change: Math.round(r.ratingDelta || 0),
          velo_max_30day: r.max30,
          velo_max_90day: r.max90,
          wkg_avg: r.wkgAvg,
          wkg_5s: r.wkg5,
          wkg_15s: r.wkg15,
          wkg_30s: r.wkg30,
          wkg_60s: r.wkg60,
          wkg_120s: r.wkg120,
          wkg_300s: r.wkg300,
          wkg_1200s: r.wkg1200,
          power_avg: r.power,
          power_np: r.np,
          power_ftp: r.ftp,
          heart_rate_avg: r.heartRate,
          effort_score: r.load,
          updated_at: new Date().toISOString()
        }));
        
        const { error: upsertError } = await supabase
          .from('race_results')
          .upsert(raceResults, { onConflict: 'event_id,rider_id' });
        
        if (!upsertError) {
          resultsSaved += raceResults.length;
        }
        
        // Progress every 10 events
        if ((i + 1) % 10 === 0 || (i + 1) === newEventIds.length) {
          const pct = Math.round(((i + 1) / newEventIds.length) * 100);
          console.log(`   📊 ${pct}%: ${i + 1}/${newEventIds.length} checked, ${eventsWithTeamRiders} races, ${resultsSaved} results`);
        }
        
        // Rate limit delay
        if (i < newEventIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, EVENT_DELAY));
        }
        
      } catch (error: any) {
        if (error.response?.status === 429) {
          console.warn(`  ⏳ Rate limited - backing off 2 minutes`);
          await new Promise(resolve => setTimeout(resolve, 120000));
        } else {
          console.error(`  ❌ Event ${eventId}: ${error.message}`);
        }
      }
    }
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`\\n🎉 Scan complete in ${duration}s!`);
    console.log(`📊 Stats: ${eventsChecked} checked, ${eventsWithTeamRiders} with team, ${resultsSaved} results saved`);
    
    // Update database
    await supabase.from('race_scan_log').update({
      completed_at: new Date().toISOString(),
      status: 'success',
      events_checked: eventsChecked,
      events_with_my_riders: eventsWithTeamRiders,
      results_saved: resultsSaved,
      duration_seconds: duration
    }).eq('started_at', new Date(startTime).toISOString());
    
    await supabase.from('race_scan_config').update({
      last_scan_at: new Date().toISOString(),
      last_scan_events_checked: eventsChecked,
      last_scan_events_saved: eventsWithTeamRiders,
      last_scan_duration_seconds: duration,
      next_scan_at: new Date(Date.now() + (configData.scan_interval_minutes * 60 * 1000)).toISOString()
    }).eq('id', configData.id);
    
  } catch (error: any) {
    console.error('❌ Scan failed:', error.message);
    
    await supabase.from('race_scan_log').update({
      completed_at: new Date().toISOString(),
      status: 'failed',
      error_message: error.message
    }).eq('started_at', new Date(startTime).toISOString());
  }
}
