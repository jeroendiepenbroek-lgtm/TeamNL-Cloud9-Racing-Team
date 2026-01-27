#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config({ path: './backend/.env' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const EVENT_IDS = [5366895, 5348759];

(async () => {
  const rows = [];
  for (const eid of EVENT_IDS) {
    const { data: ev, error: e1 } = await supabase.from('race_events').select('*').eq('event_id', eid).single();
    if (e1) { console.warn('No event metadata for', eid); }
    const { data: results, error: e2 } = await supabase.from('race_results').select('*').eq('event_id', eid).order('position', { ascending: true });
    if (e2) { console.warn('Error fetching results for', eid, e2); }
    rows.push({ event: ev || { event_id: eid }, results: results || [] });
  }

  // Build HTML
  let html = `<!doctype html><html><head><meta charset="utf-8"><title>Rider 150437 - Events Dashboard</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px} .event{margin-bottom:40px} table{width:100%;border-collapse:collapse} th,td{padding:6px;border:1px solid #ddd;text-align:left} th{background:#f4f4f4}</style></head><body>`;
  html += `<h1>Rider 150437 - Events Dashboard (10d)</h1>`;

  for (const item of rows) {
    const ev = item.event;
    html += `<div class="event">`;
    html += `<h2>Event ${ev.event_id || 'unknown'} - ${ev.event_name || ''}</h2>`;
    html += `<p><strong>Date:</strong> ${ev.event_date || 'unknown'} | <strong>Source:</strong> ${ev.source || ''}</p>`;
    html += `<p><strong>Total results:</strong> ${item.results.length}</p>`;
    html += `<table><thead><tr><th>Pos</th><th>Rider ID</th><th>Time (s)</th><th>Avg Power</th><th>Avg W/kg</th><th>Category</th><th>Velo Before</th><th>Velo After</th></tr></thead><tbody>`;
    for (const r of item.results) {
      html += `<tr><td>${r.position||''}</td><td>${r.rider_id||''}</td><td>${r.time_seconds||''}</td><td>${r.avg_power||''}</td><td>${r.avg_wkg||''}</td><td>${r.category||''}</td><td>${r.velo_before||''}</td><td>${r.velo_after||''}</td></tr>`;
    }
    html += `</tbody></table>`;
    html += `</div>`;
  }

  html += `</body></html>`;

  const outDir = path.join('backend', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `rider-150437-events-10d-dashboard-${new Date().toISOString().replace(/[:.]/g,'-')}.html`);
  fs.writeFileSync(outFile, html);
  console.log('Dashboard written to', outFile);
})();
