#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config({ path: './backend/.env' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RIDER_ID = parseInt(process.env.RIDER_ID || '150437', 10);
const DAYS_BACK = parseInt(process.env.DAYS_BACK || '10', 10);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase env vars missing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  try {
    const cutoff = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();
    console.log(`Cutoff: ${cutoff}`);

    const { data: events, error: e1 } = await supabase
      .from('rider_event_ids')
      .select('event_id,event_date')
      .eq('rider_id', RIDER_ID)
      .gte('event_date', cutoff)
      .order('event_date', { ascending: false });

    if (e1) throw e1;

    console.log(`Found ${events.length} mapped events for rider ${RIDER_ID} in last ${DAYS_BACK} days`);

    const eventIds = events.map(r => r.event_id);

    const results = {};
    for (const eid of eventIds) {
      const { data: rr, error: e2 } = await supabase
        .from('race_results')
        .select('*')
        .eq('event_id', eid)
        .order('position', { ascending: true });

      if (e2) {
        console.warn(`Error fetching results for event ${eid}:`, e2.message || e2);
        results[eid] = { error: e2.message || String(e2), rows: [] };
      } else {
        results[eid] = { rows: rr || [] };
      }
    }

    // Save to file
    const outDir = path.join('backend', 'data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `rider-${RIDER_ID}-events-10d-results-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
    const out = { rider_id: RIDER_ID, days_back: DAYS_BACK, cutoff, events: events.map(e => ({ event_id: e.event_id, event_date: e.event_date })), results };
    fs.writeFileSync(outFile, JSON.stringify(out, null, 2));

    console.log(`Saved results to ${outFile}`);
    // Summary
    let totalResults = 0;
    for (const [eid, obj] of Object.entries(results)) {
      const count = Array.isArray(obj.rows) ? obj.rows.length : 0;
      console.log(`Event ${eid}: ${count} results`);
      totalResults += count;
    }
    console.log(`Total results rows: ${totalResults}`);

  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
