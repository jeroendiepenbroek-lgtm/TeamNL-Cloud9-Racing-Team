#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config({ path: './backend/.env' });
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RIDER_ID = parseInt(process.env.RIDER_ID || '150437', 10);
const DAYS_BACK = parseInt(process.env.DAYS_BACK || '90', 10);
const DELAY_BETWEEN = parseInt(process.env.DELAY_BETWEEN_MS || '61000', 10); // ms between events — default 61000ms (61s) to respect ZwiftRacing rate limit (1 call / min)

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase env vars missing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  try {
    const cutoff = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();
    console.log('Cutoff:', cutoff);

    const { data: mappedRows, error: mapErr } = await supabase
      .from('rider_event_ids')
      .select('event_id,event_date')
      .eq('rider_id', RIDER_ID)
      .gte('event_date', cutoff)
      .order('event_date', { ascending: false });

    if (mapErr) throw mapErr;
    if (!mappedRows || mappedRows.length === 0) {
      console.log('No mapped events to process for the given cutoff');
      return;
    }

    const eventIds = mappedRows.map(r => r.event_id);
    console.log(`Events to process (${eventIds.length}):`, eventIds.join(', '));

    // Backup
    const backupDir = path.join('backend', 'data', 'backup', `90d-${new Date().toISOString().replace(/[:.]/g,'-')}`);
    fs.mkdirSync(backupDir, { recursive: true });

    for (const eid of eventIds) {
      const { data: rr } = await supabase.from('race_results').select('*').eq('event_id', eid);
      const { data: ev } = await supabase.from('race_events').select('*').eq('event_id', eid);
      fs.writeFileSync(path.join(backupDir, `race_results_${eid}.json`), JSON.stringify(rr || [], null, 2));
      fs.writeFileSync(path.join(backupDir, `race_events_${eid}.json`), JSON.stringify(ev || [], null, 2));
      console.log(`Backed up event ${eid}: results=${(rr||[]).length}, eventRows=${(ev||[]).length}`);
    }

    // Delete existing
    for (const eid of eventIds) {
      const { error: del1 } = await supabase.from('race_results').delete().eq('event_id', eid);
      const { error: del2 } = await supabase.from('race_events').delete().eq('event_id', eid);
      if (del1 || del2) console.warn('Delete errors for', eid, del1 || del2);
      else console.log('Deleted existing rows for', eid);
    }

    // Process each event sequentially using existing fetch-and-upsert-single-event script
    const resultsSummary = [];

    for (const eid of eventIds) {
      console.log(`Processing event ${eid}...`);
      // Spawn node process
      await new Promise((resolve) => {
        const proc = spawn('node', ['scripts/fetch-and-upsert-single-event.js', String(eid)], { stdio: 'inherit' });
        proc.on('close', (code) => {
          console.log(`Event ${eid} process exited with code ${code}`);
          resolve();
        });
      });

      // Small delay
      await new Promise(r => setTimeout(r, DELAY_BETWEEN));

      // Get counts & check rider presence
      const { data: cnt } = await supabase.from('race_results').select('event_id', { count: 'exact' }).eq('event_id', eid);
      const { data: me } = await supabase.from('race_results').select('*').eq('event_id', eid).eq('rider_id', RIDER_ID);
      resultsSummary.push({ event_id: eid, rows: cnt ? cnt.length : 0, rider_present: me && me.length > 0 });
      console.log(`Summary for ${eid}: rows=${cnt ? cnt.length : 0}, rider_present=${me && me.length > 0}`);
    }

    // Save summary and generate dashboard
    const summaryFile = path.join('backend', 'data', `rider-${RIDER_ID}-90d-sync-summary-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify({ eventIds, resultsSummary, backupDir }, null, 2));

    console.log('Summary saved to', summaryFile);

    // Generate dashboard for the processed events
    const { spawnSync } = require('child_process');
    spawnSync('node', ['scripts/generate-events-dashboard.js'], { stdio: 'inherit' });

    // Also regenerate rider results JSON/HTML for validation
    spawnSync('node', ['scripts/generate-rider-results-150437.js'], { stdio: 'inherit' });

    console.log('All done.');

  } catch (err) {
    console.error('Error during processing:', err.message || err);
    process.exit(1);
  }
})();
