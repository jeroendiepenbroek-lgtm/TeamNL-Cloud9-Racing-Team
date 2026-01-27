#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config({ path: './backend/.env' });
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ZR_TOKEN = process.env.ZWIFTRACING_API_TOKEN || '650c6d2fc4ef6858d74cbef1';
const RIDER_ID = parseInt(process.env.RIDER_ID || '150437');
const DAYS_BACK = parseInt(process.env.DAYS_BACK || '10');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase env vars missing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Instead of reading a local file, load events from DB mapping table to ensure canonical set
const cutoff = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();
console.log(`Querying rider_event_ids for rider ${RIDER_ID} since ${cutoff}`);
const { data: mappedRows, error: mapErr } = await supabase
  .from('rider_event_ids')
  .select('event_id,event_date')
  .eq('rider_id', RIDER_ID)
  .gte('event_date', cutoff)
  .order('event_date', { ascending: false });

if (mapErr) {
  console.error('Failed to load rider_event_ids:', mapErr.message || mapErr);
  process.exit(1);
}

const eventsToProcess = (mappedRows || []).map(r => ({ event_id: String(r.event_id), date: r.event_date }));

if (!eventsToProcess.length) {
  console.log('No mapped events to process for the given cutoff');
  process.exit(0);
}

console.log(`Processing ${eventsToProcess.length} events from DB mapping (cutoff ${cutoff})`);

(async () => {
  let totalUpserted = 0;
  // helper: request with retry/backoff for 429
  const requestWithRetry = async (url, maxRetries = 6) => {
    let attempt = 0;
    let backoff = 500;
    while (attempt <= maxRetries) {
      try {
        const res = await axios.get(url, { headers: { Authorization: ZR_TOKEN }, timeout: 20000 });
        return res.data;
      } catch (err) {
        const status = err.response && err.response.status;
        if (status === 429) {
          const ra = parseInt(err.response.headers['retry-after'] || '1', 10);
          const wait = Math.max(ra * 1000, backoff);
          console.warn(`Rate limited (429). Attempt ${attempt+1}/${maxRetries}. Waiting ${wait}ms...`);
          await new Promise(r => setTimeout(r, wait));
          backoff *= 1.5;
          attempt++;
          continue;
        }
        // other errors: log and return null
        console.error('Request error:', err.message || err);
        return null;
      }
    }
    console.error('Max retries exceeded for URL:', url);
    return null;
  };

  const missingRiderEvents = [];

  for (const ev of eventsToProcess) {
    const eventId = ev.event_id;
    console.log(`Fetching event ${eventId}...`);

    try {
      const data = await requestWithRetry(`https://api.zwiftracing.app/api/public/results/${eventId}`, 6);
      if (!data || !data.results || !Array.isArray(data.results) || data.results.length === 0) {
        console.warn(`No results for event ${eventId}`);
        missingRiderEvents.push({ eventId, reason: 'no_results' });
        continue;
      }

      // Check if rider present
      const myResult = data.results.find(r => String(r.zwid || r.rider_id) === String(RIDER_ID));

      if (!myResult) {
        console.warn(`Rider ${RIDER_ID} not found in event ${eventId} results`);
        missingRiderEvents.push({ eventId, reason: 'rider_not_found' });
        // Optional fallback to ZPDataFetch per-event could be added here
        continue;
      }

      // Build records to upsert
      const records = data.results.map(r => {
        const velo_before = r.velo_before ? Number(r.velo_before) : null;
        const velo_after = r.velo_after ? Number(r.velo_after) : null;
        const velo_change = (velo_before !== null && velo_after !== null) ? (velo_after - velo_before) : null;
        const rider_id = r.zwid || r.rider_id;

        const avg_power_raw = (r.avgWatts || r.avg_power);
        const avg_power = avg_power_raw !== undefined && avg_power_raw !== null ? Math.round(Number(avg_power_raw)) : null;
        const avg_wkg = r.avg_wkg !== undefined && r.avg_wkg !== null ? Number(r.avg_wkg) : null;
        const time_seconds_raw = r.timeInSeconds || r.time;
        const time_seconds = time_seconds_raw !== undefined && time_seconds_raw !== null ? Number(time_seconds_raw) : null;

        return {
          event_id: parseInt(eventId, 10),
          rider_id: parseInt(String(rider_id), 10),
          position: r.position ? parseInt(String(r.position), 10) : null,
          category: r.category || null,
          category_position: r.categoryPosition ? parseInt(String(r.categoryPosition), 10) : (r.category_position ? parseInt(String(r.category_position), 10) : null),
          avg_power: avg_power,
          avg_wkg: avg_wkg,
          time_seconds: time_seconds,
          velo_before,
          velo_after,
          velo_change,
          team_name: r.teamName || null,
          source: 'zwiftracing'
        };
      });

      // Upsert into race_results
      const { data: upData, error } = await supabase
        .from('race_results')
        .upsert(records, { onConflict: 'event_id,rider_id' })
        .select();

      if (error) {
        console.error(`Upsert error for event ${eventId}:`, error.message || error);
        continue;
      }

      console.log(`Upserted ${upData.length} records for event ${eventId}`);
      totalUpserted += upData.length;

      // Also upsert event metadata to race_events table
      const eventRecord = {
        event_id: parseInt(eventId, 10),
        event_name: ev.name || data.event?.name || null,
        event_date: ev.date || data.event?.event_date || new Date().toISOString(),
        world: data.event?.world || null,
        route: data.event?.route || null,
        distance_km: data.event?.distance_km || null,
        total_participants: data.results.length,
        source: 'zwiftracing'
      };

      await supabase.from('race_events').upsert(eventRecord, { onConflict: 'event_id' });

    } catch (err) {
      console.error(`Error fetching/upserting event ${eventId}:`, err.message || err);
      continue;
    }
    // small delay
    await new Promise(r => setTimeout(r, 500));
  }

  if (missingRiderEvents.length > 0) {
    const reportFile = path.join(process.cwd(), 'backend', `rider-${RIDER_ID}-missing-events-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(missingRiderEvents, null, 2));
    console.log(`Saved missing rider report: ${reportFile}`);
  }


  console.log(`Done. Total upserted records: ${totalUpserted}`);
})();
