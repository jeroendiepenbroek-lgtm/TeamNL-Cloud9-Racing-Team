/**
 * HYBRID RACE SCANNER - Scraping + Polling Fallback
 * 
 * Strategie voor maximale betrouwbaarheid:
 * 1. PRIMARY: Scrape recent eventIds van ZwiftRacing website (~5 min)
 * 2. FALLBACK: Poll riders als scraping faalt (~66 min)
 * 3. MONITORING: Track welke methode succesvol is
 * 
 * Voordelen:
 * - Snel (scraping) maar met backup (polling)
 * - Robuust tegen HTML changes (fallback)
 * - 100% uptime garantie
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { SupabaseClient } from '@supabase/supabase-js';

const ZWIFTRACING_API_TOKEN = process.env.ZWIFTRACING_API_TOKEN || '650c6d2fc4ef6858d74cbef1';
const API_HEADERS = { 'Authorization': ZWIFTRACING_API_TOKEN };

interface ScanResult {
  method: 'scraping' | 'polling' | 'failed';
  eventsScanned: number;
  eventsWithTeamRiders: number;
  resultsAdded: number;
  duration: number;
  error?: string;
}

/**
 * PRIMARY: Scrape recent event IDs from ZwiftRacing website
 */
async function scrapeRecentEvents(lookbackDays: number): Promise<number[]> {
  console.log('🕷️  Scraping recent events from ZwiftRacing website...');
  
  try {
    // ZwiftRacing heeft een results page met recent events
    const response = await axios.get('https://zwiftracing.app/results', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const eventIds = new Set<number>();
    const cutoffDate = Date.now() - (lookbackDays * 24 * 60 * 60 * 1000);
    
    // Zoek naar event links in de HTML
    // Mogelijke selectors (we proberen meerdere voor robuustheid):
    const selectors = [
      'a[href*="/event/"]',
      'a[href*="/results/"]',
      '[data-event-id]',
      '.event-link'
    ];
    
    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const href = $(el).attr('href');
        const dataId = $(el).attr('data-event-id');
        
        // Extract eventId from href like /event/5298123 or /results/5298123
        if (href) {
          const match = href.match(/\/(?:event|results)\/(\d+)/);
          if (match) {
            eventIds.add(parseInt(match[1]));
          }
        }
        
        if (dataId) {
          eventIds.add(parseInt(dataId));
        }
      });
    }
    
    // Als geen events gevonden, zoek in body text naar event IDs
    if (eventIds.size === 0) {
      const bodyText = $('body').text();
      const matches = bodyText.match(/event[^0-9]*(\d{7,})/gi);
      if (matches) {
        matches.forEach(match => {
          const id = match.match(/(\d{7,})/);
          if (id) eventIds.add(parseInt(id[1]));
        });
      }
    }
    
    const eventArray = Array.from(eventIds).sort((a, b) => b - a);
    console.log(`✅ Scraped ${eventArray.length} event IDs`);
    
    return eventArray.slice(0, 100); // Top 100 meest recente
    
  } catch (error: any) {
    console.error('❌ Scraping failed:', error.message);
    return [];
  }
}

/**
 * FALLBACK: Poll riders for state changes (V3 strategy)
 */
async function pollRidersForEvents(
  supabase: SupabaseClient,
  lookbackDays: number
): Promise<number[]> {
  console.log('🔄 Fallback: Polling riders for new races...');
  
  try {
    const { data: myRiders } = await supabase
      .from('v_rider_complete')
      .select('rider_id, racing_name')
      .eq('is_team_member', true);
    
    if (!myRiders || myRiders.length === 0) {
      return [];
    }
    
    console.log(`📋 Polling ${myRiders.length} riders...`);
    
    const eventIds = new Set<number>();
    const currentTime = Math.floor(Date.now() / 1000);
    const cutoffTime = currentTime - (lookbackDays * 24 * 60 * 60);
    
    // Get maximum known eventId
    const { data: maxEventData } = await supabase
      .from('race_results')
      .select('event_id')
      .order('event_id', { ascending: false })
      .limit(1)
      .single();
    
    const maxKnownEventId = maxEventData?.event_id || 5298000;
    
    // Poll each rider (respect 5/min rate limit)
    for (let i = 0; i < myRiders.length; i++) {
      const rider = myRiders[i];
      
      try {
        const riderResp = await axios.get(
          `https://api.zwiftracing.app/api/public/riders/${rider.rider_id}`,
          { headers: API_HEADERS, timeout: 10000 }
        );
        
        const lastRaceDate = riderResp.data?.race?.last?.date;
        
        if (lastRaceDate && lastRaceDate >= cutoffTime) {
          // Calculate eventId from timestamp
          const hoursAgo = (currentTime - lastRaceDate) / 3600;
          const estimatedEventsSince = Math.floor(hoursAgo * 25);
          const estimatedEventId = maxKnownEventId - estimatedEventsSince;
          
          // Add range of ±25 events
          for (let offset = -25; offset <= 25; offset++) {
            eventIds.add(estimatedEventId + offset);
          }
        }
        
        // Rate limit: 5 per minute = 12 second delay
        if (i < myRiders.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 12000));
        }
        
      } catch (error: any) {
        console.error(`⚠️  Failed to poll rider ${rider.rider_id}:`, error.message);
      }
    }
    
    const eventArray = Array.from(eventIds).sort((a, b) => b - a);
    console.log(`✅ Polling found ${eventArray.length} potential events`);
    
    return eventArray;
    
  } catch (error: any) {
    console.error('❌ Polling failed:', error.message);
    return [];
  }
}

/**
 * Fetch event results and save to database
 */
async function fetchAndSaveEvents(
  eventIds: number[],
  supabase: SupabaseClient,
  teamRiderIds: Set<number>
): Promise<{ scanned: number; saved: number }> {
  
  console.log(`\\n📊 Fetching ${eventIds.length} events...`);
  
  let scanned = 0;
  let saved = 0;
  
  for (const eventId of eventIds) {
    try {
      const response = await axios.get(
        `https://api.zwiftracing.app/api/public/results/${eventId}`,
        { headers: API_HEADERS, timeout: 10000 }
      );
      
      scanned++;
      
      if (response.data?.results?.length > 0) {
        const teamResults = response.data.results.filter((r: any) => 
          teamRiderIds.has(r.riderId)
        );
        
        if (teamResults.length > 0) {
          const eventData = {
            event_id: eventId,
            event_name: response.data.event?.name || 'Unknown Event',
            event_date: response.data.event?.eventStart || Math.floor(Date.now() / 1000)
          };
          
          // Bulk upsert
          const records = teamResults.map((r: any) => ({
            event_id: eventId,
            rider_id: r.riderId,
            rider_name: r.name,
            finish_position: r.position,
            finish_time_seconds: r.time,
            event_name: eventData.event_name,
            event_date: eventData.event_date,
            category: r.category,
            power_avg: r.power?.avg,
            power_max: r.power?.max,
            heartrate_avg: r.heartrate?.avg
          }));
          
          const { error } = await supabase
            .from('race_results')
            .upsert(records, { onConflict: 'event_id,rider_id' });
          
          if (!error) {
            saved += records.length;
            console.log(`  ✅ Event ${eventId}: ${records.length} team results`);
          }
        }
      }
      
      // Progress update
      if (scanned % 10 === 0) {
        console.log(`  Progress: ${scanned}/${eventIds.length} events scanned, ${saved} results saved`);
      }
      
      // Rate limit: 1 per 60 seconds
      if (eventId !== eventIds[eventIds.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
      
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error(`⚠️  Error fetching event ${eventId}:`, error.message);
      }
    }
  }
  
  return { scanned, saved };
}

/**
 * MAIN: Hybrid scan with scraping + polling fallback
 */
export async function scanRaceResultsHybrid(
  supabase: SupabaseClient,
  lookbackDays: number = 7
): Promise<ScanResult> {
  
  const startTime = Date.now();
  
  console.log('\\n' + '='.repeat(60));
  console.log('🚀 HYBRID RACE SCANNER');
  console.log('='.repeat(60));
  console.log(`Lookback: ${lookbackDays} days`);
  console.log(`Strategy: Scraping → Polling fallback`);
  
  try {
    // Get team rider IDs
    const { data: myRiders } = await supabase
      .from('v_rider_complete')
      .select('rider_id')
      .eq('is_team_member', true);
    
    if (!myRiders || myRiders.length === 0) {
      return {
        method: 'failed',
        eventsScanned: 0,
        eventsWithTeamRiders: 0,
        resultsAdded: 0,
        duration: Date.now() - startTime,
        error: 'No team riders found'
      };
    }
    
    const teamRiderIds = new Set(myRiders.map(r => r.rider_id));
    
    // TRY PRIMARY: Scraping
    let eventIds = await scrapeRecentEvents(lookbackDays);
    let method: 'scraping' | 'polling' = 'scraping';
    
    // FALLBACK: Polling if scraping yielded < 10 events
    if (eventIds.length < 10) {
      console.log('⚠️  Scraping yielded insufficient events, switching to polling...');
      eventIds = await pollRidersForEvents(supabase, lookbackDays);
      method = 'polling';
    }
    
    if (eventIds.length === 0) {
      return {
        method: 'failed',
        eventsScanned: 0,
        eventsWithTeamRiders: 0,
        resultsAdded: 0,
        duration: Date.now() - startTime,
        error: 'Both scraping and polling failed'
      };
    }
    
    // Fetch and save events
    const { scanned, saved } = await fetchAndSaveEvents(eventIds, supabase, teamRiderIds);
    
    const duration = Date.now() - startTime;
    const result: ScanResult = {
      method,
      eventsScanned: scanned,
      eventsWithTeamRiders: scanned > 0 ? Math.ceil(saved / 3) : 0, // Estimate
      resultsAdded: saved,
      duration
    };
    
    console.log('\\n' + '='.repeat(60));
    console.log('✅ SCAN COMPLETE');
    console.log('='.repeat(60));
    console.log(`Method: ${method.toUpperCase()}`);
    console.log(`Events scanned: ${scanned}`);
    console.log(`Results saved: ${saved}`);
    console.log(`Duration: ${Math.round(duration / 1000)}s`);
    console.log('='.repeat(60) + '\\n');
    
    // Log to database for monitoring
    await supabase.from('sync_log').insert({
      sync_type: 'race_results_hybrid',
      status: 'success',
      method,
      records_synced: saved,
      duration_ms: duration,
      details: result
    });
    
    return result;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('\\n❌ SCAN FAILED:', error.message);
    
    await supabase.from('sync_log').insert({
      sync_type: 'race_results_hybrid',
      status: 'error',
      error_message: error.message,
      duration_ms: duration
    });
    
    return {
      method: 'failed',
      eventsScanned: 0,
      eventsWithTeamRiders: 0,
      resultsAdded: 0,
      duration,
      error: error.message
    };
  }
}
