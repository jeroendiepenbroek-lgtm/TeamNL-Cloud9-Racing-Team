#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config({ path: './backend/.env' });
const { spawnSync, spawn } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RIDER_ID = parseInt(process.env.RIDER_ID || '150437', 10);
const DAYS_BACK = parseInt(process.env.DAYS_BACK || '90', 10);
const RECHECK_HOURS = parseInt(process.env.RECHECK_HOURS || '24', 10);
const DELAY_BETWEEN_MS = parseInt(process.env.DELAY_BETWEEN_MS || '61000', 10);
const ENRICH_WITH_ZR = (process.env.ENRICH_WITH_ZR || 'true') === 'true';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase env vars missing');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  try {
    console.log('Running hourly event sync for rider', RIDER_ID);

    // 1) fetch latest events file using zpdatafetch (Python script)
    console.log('Running fetch-events-only.py (ZPDataFetch)');
    const p = spawnSync('python3', ['scripts/fetch-events-only.py'], { stdio: 'inherit' });
    if (p.status !== 0) console.warn('fetch-events-only.py exited non-zero, continuing with available files');

    // 2) upsert event ids via save-event-ids.js
    console.log('Upserting event IDs into DB (save-event-ids.js)');
    const s = spawnSync('node', ['scripts/save-event-ids.js'], { stdio: 'inherit' });
    if (s.status !== 0) console.warn('save-event-ids.js exited non-zero');

    // 3) select candidate events to (re)fetch
    const cutoff = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();
    const { data: mappedRows, error: mapErr } = await supabase
      .from('rider_event_ids')
      .select('event_id,event_date')
      .eq('rider_id', RIDER_ID)
      .gte('event_date', cutoff)
      .order('event_date', { ascending: false });
    if (mapErr) throw mapErr;
    if (!mappedRows || mappedRows.length === 0) {
      console.log('No events mapped for rider in the cutoff window');
      return;
    }

    const now = new Date();
    const recheckCutoff = new Date(Date.now() - RECHECK_HOURS * 3600 * 1000);

    const toProcess = [];
    for (const r of mappedRows) {
      const eid = r.event_id;
      // check race_events.fetched_at
      const { data: evRows } = await supabase.from('race_events').select('fetched_at').eq('event_id', eid).limit(1);
      const fetched_at = evRows && evRows.length ? evRows[0].fetched_at : null;
      if (!fetched_at) {
        toProcess.push(eid);
        continue;
      }
      const fetchedDate = new Date(fetched_at);
      if (fetchedDate < recheckCutoff) toProcess.push(eid);
    }

    if (toProcess.length === 0) {
      console.log('No events require re-fetch at this time');
      return;
    }

    console.log(`Events to (re)fetch: ${toProcess.join(', ')}`);

    // 4) process sequentially respecting DELAY_BETWEEN_MS
    for (const eid of toProcess) {
      console.log(`Processing event ${eid}...`);
      const proc = spawnSync('node', ['scripts/fetch-and-upsert-single-event.js', String(eid)], { stdio: 'inherit' });
      if (proc.status !== 0) console.warn(`Event ${eid} script exited code ${proc.status}`);
      console.log(`Waiting ${DELAY_BETWEEN_MS}ms to respect rate limits`);
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_MS));
    }

    // 5) regenerate rider results + events dashboard
    console.log('Regenerating dashboards...');
    spawnSync('node', ['scripts/generate-events-dashboard.js'], { stdio: 'inherit' });
    spawnSync('node', ['scripts/generate-rider-results-150437.js'], { stdio: 'inherit' });

    console.log('Hourly sync complete.');

  } catch (err) {
    console.error('Error in hourly-event-sync:', err.message || err);
    process.exit(1);
  }
})();
