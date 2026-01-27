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
const RIDER_ID = parseInt(process.env.RIDER_ID || '150437', 10);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase env vars missing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const requestWithRetry = async (url, maxRetries = 6, headers = {}) => {
  let attempt = 0;
  let backoff = 500;
  while (attempt <= maxRetries) {
    try {
      const res = await axios.get(url, { headers, timeout: 20000 });
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
      console.error('Request error:', err.message || err);
      return null;
    }
  }
  console.error('Max retries exceeded for URL:', url);
  return null;
};

(async () => {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node fetch-and-upsert-single-event.js <eventId>');
    process.exit(1);
  }
  const eventId = args[0];
  console.log('Fetching event', eventId);

  // Helper: try to fetch event_date from rider_event_ids mapping as fallback
  const getEventDateFromRiderEventIds = async (eid) => {
    try {
      const { data: rows, error } = await supabase.from('rider_event_ids').select('event_date').eq('event_id', eid).limit(1);
      if (error || !rows || rows.length === 0) return null;
      return rows[0].event_date;
    } catch (e) {
      return null;
    }
  };

  // Try primary ZwiftRacing API (include API token)
  let data = await requestWithRetry(`https://api.zwiftracing.app/api/public/results/${eventId}`, 6, { Authorization: ZR_TOKEN });
  let usedSource = 'zwiftracing';

  // If primary is rate limited or missing, try the ZP (/zp/) endpoint then local files
  if (!data || !Array.isArray(data.results) || (data.error && String(data.error).toLowerCase().includes('too many requests'))) {
    console.warn('Primary ZwiftRacing API missing or rate-limited for', eventId, '- trying ZPDataFetch endpoint');
    const zp = await requestWithRetry(`https://api.zwiftracing.app/api/public/zp/${eventId}/results`, 3);
    if (zp && Array.isArray(zp.results)) {
      data = zp;
      usedSource = 'zpdatafetch';
    } else {
      // Try local backup files (from previous runs)
      const candidates = [
        path.join('backend','data',`race_results_${eventId}.json`),
        path.join('backend','data','backup',`race_results_${eventId}.json`),
        path.join('backend','data',`race_results_${eventId}.raw.json`)
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          try {
            const raw = JSON.parse(fs.readFileSync(c, 'utf8'));
            if (Array.isArray(raw)) {
              data = { results: raw, event: raw.event || null };
              usedSource = 'local';
              console.log('Loaded results from local file', c);
              break;
            } else if (raw && Array.isArray(raw.results)) {
              data = raw;
              usedSource = 'local';
              console.log('Loaded results object from local file', c);
              break;
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }
    }
  }

  // At this point we should have either ZP data, ZR data, or local fallback
  // Prefer ZP (fast) and enrich with ZR if configured
  // Use requestWithRetryHeaders when making API calls with optional headers

  // Build zpData/zrData structures if not already present in variables
  // (older code path used `data`, but we now support both)
  let zpData = null;
  let zrData = null;
  if (data && Array.isArray(data.results)) {
    // existing code path --- assume this came from an earlier attempt; treat as 'zr' only
    zrData = data;
  }

  // If zpData isn't fetched yet, try to fetch it
  if (!zpData) {
    try {
      const tryZp = await requestWithRetry(`https://api.zwiftracing.app/api/public/zp/${eventId}/results`, 3);
      if (tryZp && Array.isArray(tryZp.results)) {
        zpData = tryZp;
      }
    } catch (e) {
      // ignore
    }
  }

  // If no zpData, ensure we have zrData
  if (!zpData && !zrData) {
    const tryZr = await requestWithRetry(`https://api.zwiftracing.app/api/public/results/${eventId}`, 6, { Authorization: ZR_TOKEN });
    if (tryZr && Array.isArray(tryZr.results)) zrData = tryZr;
  }

  // If we have zp data and enrichment is enabled, fetch ZR for enrichment if not already fetched
  const ENRICH_WITH_ZR = (process.env.ENRICH_WITH_ZR || 'true') === 'true';
  if (zpData && ENRICH_WITH_ZR && !zrData) {
    const tryZr = await requestWithRetry(`https://api.zwiftracing.app/api/public/results/${eventId}`, 3, { Authorization: ZR_TOKEN });
    if (tryZr && Array.isArray(tryZr.results)) zrData = tryZr;
  }

  // Local fallback to files if neither API returned data
  if ((!zpData || !Array.isArray(zpData.results)) && (!zrData || !Array.isArray(zrData.results))) {
    const candidates = [
      path.join('backend','data',`race_results_${eventId}.json`),
      path.join('backend','data','backup',`race_results_${eventId}.json`),
      path.join('backend','data',`race_results_${eventId}.raw.json`)
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        try {
          const raw = JSON.parse(fs.readFileSync(c, 'utf8'));
          if (Array.isArray(raw)) {
            zpData = { results: raw, event: raw.event || null };
            console.log('Loaded results array from local file', c);
            break;
          } else if (raw && Array.isArray(raw.results)) {
            zpData = raw;
            console.log('Loaded results object from local file', c);
            break;
          }
        } catch (e) { }
      }
    }
  }

  const zpResults = (zpData && Array.isArray(zpData.results)) ? zpData.results : [];
  const zrResults = (zrData && Array.isArray(zrData.results)) ? zrData.results : [];

  // Build maps by rider id to merge results
  const mapByRider = new Map();
  const pushToMap = (r, source) => {
    const rid = r.riderId || r.rider_id || r.zwid || r.zwiftId || r.zwift_id || r.zwiftid || null;
    const riderId = rid ? parseInt(String(rid).replace(/[^0-9]/g, ''), 10) : null;
    if (!riderId) return;
    if (!mapByRider.has(riderId)) mapByRider.set(riderId, { rider_id: riderId, raw_data: { zp: null, zr: null } });
    const entry = mapByRider.get(riderId);
    entry.raw_data[source] = r;

    // Merge precedence: zp fields first, then zr
    entry.position = entry.position === undefined || entry.position === null ? (r.position ? parseInt(String(r.position).replace(/[^0-9-]/g, ''),10) : null) : entry.position;
    entry.category = entry.category || r.category || null;
    entry.category_position = entry.category_position === undefined || entry.category_position === null ? (r.categoryPosition ? parseInt(String(r.categoryPosition).replace(/[^0-9-]/g,''),10) : (r.category_position ? parseInt(String(r.category_position).replace(/[^0-9-]/g,''),10) : null)) : entry.category_position;

    const avg_power_raw = r.avgWatts || r.avg_power;
    const avg_power = avg_power_raw !== undefined && avg_power_raw !== null ? Math.round(Number(String(avg_power_raw).replace(/[^0-9.-]/g, '')) || 0) : null;
    entry.avg_power = (entry.avg_power === undefined || entry.avg_power === null) ? (isNaN(avg_power) ? null : avg_power) : entry.avg_power;

    const avg_wkg = r.avg_wkg !== undefined && r.avg_wkg !== null ? Number(String(r.avg_wkg).replace(/[^0-9.-]/g, '')) : null;
    entry.avg_wkg = (entry.avg_wkg === undefined || entry.avg_wkg === null) ? (isNaN(avg_wkg) ? null : avg_wkg) : entry.avg_wkg;

    const time_seconds_raw = r.timeInSeconds || r.time || r.time_seconds || r.seconds || r.timeSeconds;
    const time_seconds = time_seconds_raw !== undefined && time_seconds_raw !== null ? Math.round(Number(String(time_seconds_raw).replace(/[^0-9.-]/g, '')) || 0) : null;
    entry.time_seconds = (entry.time_seconds === undefined || entry.time_seconds === null) ? (isNaN(time_seconds) ? null : time_seconds) : entry.time_seconds;

    const velo_before = r.velo_before ? Number(r.velo_before) : null;
    const velo_after = r.velo_after ? Number(r.velo_after) : null;
    entry.velo_before = (entry.velo_before === undefined || entry.velo_before === null) ? (isNaN(velo_before) ? null : velo_before) : entry.velo_before;
    entry.velo_after = (entry.velo_after === undefined || entry.velo_after === null) ? (isNaN(velo_after) ? null : velo_after) : entry.velo_after;
    entry.velo_change = (entry.velo_change === undefined || entry.velo_change === null) ? ((entry.velo_before !== null && entry.velo_after !== null) ? (entry.velo_after - entry.velo_before) : null) : entry.velo_change;

    entry.team_name = entry.team_name || r.teamName || r.team_name || null;
  };

  for (const r of zpResults) pushToMap(r, 'zp');
  for (const r of zrResults) pushToMap(r, 'zr');

  const records = Array.from(mapByRider.values()).map(e => ({
    event_id: parseInt(String(eventId).replace(/[^0-9]/g, ''), 10),
    rider_id: e.rider_id,
    position: e.position || null,
    category: e.category || null,
    category_position: e.category_position || null,
    avg_power: e.avg_power || null,
    avg_wkg: e.avg_wkg || null,
    time_seconds: e.time_seconds || null,
    velo_before: e.velo_before || null,
    velo_after: e.velo_after || null,
    velo_change: e.velo_change || null,
    team_name: e.team_name || null,
    raw_data: e.raw_data,
    source: zpResults.length ? 'zpdatafetch' : 'zwiftracing'
  }));

  console.log(`Prepared ${records.length} merged records for event ${eventId} (zp=${zpResults.length}, zr=${zrResults.length})`);

  // Prepare event metadata and ensure event_date from fallback if missing in response
  const inferredEventDate = (zpData && (zpData.event?.event_date || zpData.event?.date)) || (zrData && (zrData.event?.event_date || zrData.event?.date)) || await getEventDateFromRiderEventIds(eventId) || null;
  const eventRecord = {
    event_id: parseInt(String(eventId).replace(/[^0-9]/g, ''), 10),
    event_name: (zpData && (zpData.event?.name || zpData.name)) || (zrData && (zrData.event?.name || zrData.name)) || null,
    event_date: inferredEventDate,
    fetched_at: new Date().toISOString(),
    world: (zpData && zpData.event?.world) || (zrData && zrData.event?.world) || null,
    route: (zpData && zpData.event?.route) || (zrData && zrData.event?.route) || null,
    distance_km: (zpData && zpData.event?.distance_km) || (zrData && zrData.event?.distance_km) || null,
    source: zpResults.length ? 'zpdatafetch' : 'zwiftracing'
  };

  // Ensure event_date fallback
  if (!eventRecord.event_date) {
    eventRecord.event_date = eventRecord.fetched_at;
    console.log('Event date missing from APIs, using fetched_at:', eventRecord.event_date);
  }

  // Upsert event metadata before inserting results to satisfy FK
  const { data: evUp, error: evErr } = await supabase.from('race_events').upsert(eventRecord, { onConflict: 'event_id' }).select();
  if (evErr) {
    console.error('Event upsert error:', evErr.message || evErr);
    process.exit(1);
  } else {
    console.log('Event upserted:', evUp && evUp.length ? evUp[0].event_id : eventRecord.event_id);
  }

  // Debug: show sample record types
  if (records.length > 0) {
    console.log('Sample sanitized record:', JSON.stringify(records[0], null, 2));
    console.log('Field types:', Object.fromEntries(Object.entries(records[0]).map(([k,v]) => [k, typeof v])));
  }

  // Upsert rows in batches to avoid large payloads
  const batchSize = 200;
  let totalSaved = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const chunk = records.slice(i, i+batchSize);
    const { data: upData, error } = await supabase.from('race_results').upsert(chunk, { onConflict: 'event_id,rider_id' }).select();
    if (error) {
      console.error('Upsert error:', error.message || error);
    } else {
      console.log(`Upserted ${upData.length} records (chunk ${i/batchSize+1})`);
      totalSaved += upData.length;
    }
    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`Total saved: ${totalSaved}`);
})();