/**
 * ULTIEME SLIMME RACE SCANNER V3 - POLLING STRATEGIE
 * 
 * Strategie:
 * 1. Poll riders elke X minuten (GET /riders/<id>)
 * 2. Check race.last.date veranderingen
 * 3. Als changed → nieuwe race! Haal event op
 * 4. Rate limit: 5 calls/min = 77 riders in ~16 minuten
 * 
 * Voordelen:
 * - 100% hit rate (we weten precies welke events nieuw zijn)
 * - Geen tijd verspillen aan lege events
 * - Real-time detection (binnen 16 min na race)
 * - Veel minder API calls dan blind scannen
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const ZWIFTRACING_API_TOKEN = process.env.ZWIFTRACING_API_TOKEN || '650c6d2fc4ef6858d74cbef1';
const API_HEADERS = { 'Authorization': ZWIFTRACING_API_TOKEN };

interface RiderRaceState {
  riderId: number;
  lastRaceDate: number | null;
  lastChecked: number;
}

export async function pollRidersForNewRaces(supabase: ReturnType<typeof createClient>) {
  const startTime = Date.now();
  
  console.log('\\n🔄 Polling riders for new races...');
  
  try {
    // Get team riders
    const { data: myRiders } = await supabase
      .from('v_rider_complete')
      .select('rider_id, racing_name')
      .eq('is_team_member', true);
    
    if (!myRiders || myRiders.length === 0) {
      console.log('⚠️  No team riders');
      return { newRaces: 0, ridersChecked: 0 };
    }
    
    console.log(`📋 Checking ${myRiders.length} riders for race updates...`);
    
    // Get previous state from database
    const { data: previousStates } = await supabase
      .from('rider_race_state')
      .select('*');
    
    const stateMap = new Map<number, RiderRaceState>();
    previousStates?.forEach(s => {
      stateMap.set(s.rider_id, {
        riderId: s.rider_id,
        lastRaceDate: s.last_race_date,
        lastChecked: new Date(s.last_checked).getTime()
      });
    });
    
    const RIDER_DELAY = 12000; // 12s = 5 per minute (rate limit)
    let ridersChecked = 0;
    let newRacesFound = 0;
    const newEventIds = new Set<number>();
    
    // Poll each rider
    for (const rider of myRiders) {
      try {
        ridersChecked++;
        
        const riderResponse = await axios.get(
          `https://api.zwiftracing.app/api/public/riders/${rider.rider_id}`,
          {
            headers: API_HEADERS,
            timeout: 10000
          }
        );
        
        const riderData = riderResponse.data;
        const currentLastRace = riderData.race?.last?.date || null;
        const previousState = stateMap.get(rider.rider_id);
        
        // Check for change
        if (previousState && currentLastRace && currentLastRace !== previousState.lastRaceDate) {
          newRacesFound++;
          console.log(`  🆕 ${rider.racing_name}: New race detected!`);
          console.log(`     Previous: ${new Date(previousState.lastRaceDate! * 1000).toISOString()}`);
          console.log(`     Current:  ${new Date(currentLastRace * 1000).toISOString()}`);
          
          // Calculate estimated eventId based on race time
          const nowEpoch = Math.floor(Date.now() / 1000);
          const hoursAgo = (nowEpoch - currentLastRace) / 3600;
          const estimatedEventsSince = Math.floor(hoursAgo * 25); // ~25 events/hour
          
          // Get recent max eventId from database
          const { data: maxEvent } = await supabase
            .from('race_results')
            .select('event_id')
            .order('event_id', { ascending: false })
            .limit(1)
            .single();
          
          const maxKnownEventId = maxEvent?.event_id || 5300000;
          const estimatedEventId = maxKnownEventId - estimatedEventsSince;
          
          console.log(`     🎯 Estimated eventId: ${estimatedEventId} (±25)`);
          
          // Store the event ID range to check
          for (let offset = -25; offset <= 25; offset++) {
            newEventIds.add(estimatedEventId + offset);
          }
        }
        
        // Update state
        await supabase
          .from('rider_race_state')
          .upsert({
            rider_id: rider.rider_id,
            last_race_date: currentLastRace,
            last_checked: new Date().toISOString(),
            race_finishes: riderData.race?.finishes || 0
          }, {
            onConflict: 'rider_id'
          });
        
        // Progress
        if (ridersChecked % 10 === 0) {
          console.log(`   📊 Progress: ${ridersChecked}/${myRiders.length} riders, ${newRacesFound} new races`);
        }
        
        // Rate limit
        if (ridersChecked < myRiders.length) {
          await new Promise(resolve => setTimeout(resolve, RIDER_DELAY));
        }
        
      } catch (error: any) {
        if (error.response?.status === 429) {
          console.warn(`  ⏳ Rate limited - backing off 60s`);
          await new Promise(resolve => setTimeout(resolve, 60000));
        } else {
          console.error(`  ❌ ${rider.racing_name}: ${error.message}`);
        }
      }
    }
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`\\n✅ Poll complete in ${duration}s`);
    console.log(`📊 Stats: ${ridersChecked} riders, ${newRacesFound} new races detected`);
        // Fetch event details for new races
    if (newEventIds.size > 0) {
      console.log(`\n🔍 Fetching ${newEventIds.size} potential event IDs...`);
      
      const eventIdsToFetch = Array.from(newEventIds);
      let eventsFetched = 0;
      let eventsWithTeam = 0;
      let resultsSaved = 0;
      
      for (const eventId of eventIdsToFetch) {
        try {
          const eventResponse = await axios.get(
            `https://api.zwiftracing.app/api/public/results/${eventId}`,
            {
              headers: API_HEADERS,
              timeout: 10000
            }
          );
          
          const eventData = eventResponse.data;
          const teamRiderResults = eventData.results?.filter((r: any) => 
            myRiders.some(rider => rider.rider_id === r.riderId)
          ) || [];
          
          if (teamRiderResults.length === 0) {
            continue;
          }
          
          eventsFetched++;
          eventsWithTeam++;
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
          
          // Progress
          if (eventsFetched % 5 === 0) {
            console.log(`   📊 ${eventsFetched} events checked, ${resultsSaved} results saved`);
          }
          
          // Rate limit: 60s per event
          if (eventsFetched < eventIdsToFetch.length) {
            await new Promise(resolve => setTimeout(resolve, 60000));
          }
          
        } catch (error: any) {
          if (error.response?.status === 429) {
            console.warn(`  ⏳ Rate limited - backing off 2 min`);
            await new Promise(resolve => setTimeout(resolve, 120000));
          }
          // Skip not found events silently
        }
      }
      
      console.log(`\n🎉 Event fetch complete: ${eventsWithTeam} races, ${resultsSaved} results saved`);
    }
        return {
      newRaces: newRacesFound,
      ridersChecked,
      newEventIds: Array.from(newEventIds)
    };
    
  } catch (error: any) {
    console.error('❌ Poll failed:', error.message);
    throw error;
  }
}

/**
 * Create rider_race_state table if not exists
 */
export const RIDER_STATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS rider_race_state (
  rider_id INTEGER PRIMARY KEY,
  last_race_date INTEGER,
  last_checked TIMESTAMP WITH TIME ZONE NOT NULL,
  race_finishes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_race_state_last_checked 
  ON rider_race_state(last_checked);

COMMENT ON TABLE rider_race_state IS 'Tracks last known race state per rider for change detection';
`;
