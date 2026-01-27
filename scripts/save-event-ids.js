#!/usr/bin/env node
require('dotenv').config({ path: './backend/.env' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RIDER_ID = parseInt(process.env.RIDER_ID || '150437', 10);
const DAYS_BACK = parseInt(process.env.DAYS_BACK || '90', 10);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase env vars missing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  const dataDir = path.join(process.cwd(), 'backend', 'data');
  const files = fs.readdirSync(dataDir).filter(f => f.startsWith(`rider-${RIDER_ID}-events-`) && f.endsWith('.json'));
  if (!files.length) {
    console.error('No events file found in backend/data. Run fetch-events-only.py first.');
    process.exit(1);
  }
  // Choose latest file by modification time (mtime) to avoid lexicographic ordering pitfalls
  let latest = files[0];
  let latestMtime = fs.statSync(path.join(dataDir, latest)).mtimeMs;
  for (const f of files) {
    try {
      const m = fs.statSync(path.join(dataDir, f)).mtimeMs;
      if (m >= latestMtime) {
        latestMtime = m;
        latest = f;
      }
    } catch (e) {
      // ignore
    }
  }

  console.log(`Using latest events file: ${latest}`);
  const raw = JSON.parse(fs.readFileSync(path.join(dataDir, latest), 'utf-8'));
  // Support multiple file shapes: 'races' (zpdatafetch), 'events' (90d filter), or just 'event_ids'
  const races = raw.races || raw.events || [];
  const eventIdsOnly = Array.isArray(raw.event_ids) ? raw.event_ids : [];

  const cutoff = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000);

  const rows = [];

  // If we have structured races/events with dates
  if (races && races.length > 0) {
    for (const r of races) {
      // Accept either object with event_id/name/date or simple values
      const event_id = r.event_id || r.id || r.zid || r.eventId || r.eventId;
      let dateVal = r.date || r.event_date || r.date_iso || r.dateString || null;
      // Support numeric unix timestamps as strings
      let dt = null;
      try {
        if (!dateVal && typeof r === 'string' && /^\d+$/.test(r)) {
          // sometimes races array might contain event IDs as strings
          // we don't have date for those - skip unless in eventIdsOnly
        } else {
          if (dateVal && /^\d+$/.test(String(dateVal))) {
            dt = new Date(parseInt(String(dateVal), 10) * 1000);
          } else if (dateVal) {
            dt = new Date(dateVal);
          }
        }
      } catch (e) { dt = null; }

      // Only include events within cutoff if we have a date
      if (dt && dt < cutoff) continue;

      if (event_id) {
        rows.push({ rider_id: RIDER_ID, event_id: parseInt(String(event_id), 10), event_date: dt ? dt.toISOString() : null, source: 'zpdatafetch' });
      }
    }
  }

  // If file contained only event_ids, include them (no date available)
  if (rows.length === 0 && eventIdsOnly.length > 0) {
    for (const eid of eventIdsOnly) {
      rows.push({ rider_id: RIDER_ID, event_id: parseInt(String(eid), 10), event_date: null, source: 'zpdatafetch' });
    }
  }

  if (rows.length === 0) {
    console.log(`No events in last ${DAYS_BACK} days to save`);
    process.exit(0);
  }

  console.log(`Upserting ${rows.length} rows into rider_event_ids (rider ${RIDER_ID})`);

  const { data, error } = await supabase
    .from('rider_event_ids')
    .upsert(rows, { onConflict: 'rider_id,event_id' })
    .select();

  if (error) {
    console.error('Upsert error:', error.message || error);
    process.exit(1);
  }

  console.log(`Upsert complete: ${data.length} rows saved`);

  // report count for rider
  const { data: countData } = await supabase
    .from('rider_event_ids')
    .select('event_id')
    .eq('rider_id', RIDER_ID);

  console.log(`Rider ${RIDER_ID} now has ${countData.length} event mappings in DB`);
})();