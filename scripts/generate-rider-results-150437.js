#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config({ path: './backend/.env' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RIDER_ID = 150437;
const LIMIT = 2; // first 2 results

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase env vars missing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  try {
    // Fetch the most recent results for rider
    const { data: recent, error } = await supabase
      .from('v_dashboard_rider_results')
      .select('*')
      .eq('rider_id', RIDER_ID)
      .order('event_date', { ascending: false })
      .limit(LIMIT);

    if (error) throw error;

    const total_races_res = await supabase
      .from('v_dashboard_rider_results')
      .select('*')
      .eq('rider_id', RIDER_ID);

    const totalRaces = total_races_res.data ? total_races_res.data.length : 0;
    const wins = (total_races_res.data || []).filter(r=>r.position===1).length;
    const podiums = (total_races_res.data || []).filter(r=>r.position<=3).length;
    const avgWkg = (total_races_res.data || []).reduce((s,r)=>s+(r.avg_wkg||0),0)/Math.max(1,(total_races_res.data||[]).length);
    const avgPosition = (total_races_res.data || []).reduce((s,r)=>s+(r.position||0),0)/Math.max(1,(total_races_res.data||[]).length);

    // Prepare payload
    const payload = {
      riderId: RIDER_ID,
      stats: {
        totalRaces,
        wins,
        podiums,
        avgWkg: parseFloat(avgWkg.toFixed(2)),
        avgPosition: parseFloat(avgPosition.toFixed(1))
      },
      history: recent || []
    };

    const outDir = path.join('backend','data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const jsonFile = path.join(outDir, `rider-${RIDER_ID}-results-latest-${LIMIT}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(payload, null, 2));
    console.log('Wrote JSON:', jsonFile);

    // Create a simple HTML mimicking the Results page layout
    let html = `<!doctype html><html><head><meta charset="utf-8"><title>Rider ${RIDER_ID} - Results</title><style>body{font-family:Arial;padding:20px;background:#f9fbfd} .cards{display:flex;gap:12px;margin-bottom:20px} .card{background:white;padding:18px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.06);flex:1} .card h3{margin:0 0 6px} table{width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden} th,td{padding:10px;border-bottom:1px solid #eef2f6;text-align:left} th{background:#f4f7fb} .event-row{display:flex;align-items:center;gap:12px;padding:14px 0}</style></head><body>`;
    html += `<h1>Race Results - Rider ${RIDER_ID}</h1>`;
    html += `<div class="cards"><div class="card"><h3>Wins</h3><p style="font-size:20px;font-weight:700">${wins}</p></div><div class="card"><h3>Podiums</h3><p style="font-size:20px;font-weight:700">${podiums}</p></div><div class="card"><h3>Avg Position</h3><p style="font-size:20px;font-weight:700">${payload.stats.avgPosition}</p></div><div class="card"><h3>Avg W/kg</h3><p style="font-size:20px;font-weight:700">${payload.stats.avgWkg}</p></div></div>`;

    html += `<h2>Recent (${LIMIT})</h2><table><thead><tr><th>Event</th><th>Date</th><th>Pos</th><th>Category</th><th>Time (s)</th><th>Avg W/kg</th><th>Velo</th></tr></thead><tbody>`;
    for (const r of payload.history) {
      html += `<tr><td>${r.event_name || r.event_id}</td><td>${new Date(r.event_date).toLocaleString()}</td><td>${r.position||''}</td><td>${r.category||''}</td><td>${r.time_seconds||''}</td><td>${(r.avg_wkg||'').toFixed? (r.avg_wkg||'') : (r.avg_wkg||'')}</td><td>${r.velo_after||''}</td></tr>`;
    }
    html += `</tbody></table>`;

    html += `</body></html>`;

    const htmlFile = path.join(outDir, `rider-${RIDER_ID}-results-page-${new Date().toISOString().replace(/[:.]/g,'-')}.html`);
    fs.writeFileSync(htmlFile, html);
    console.log('Wrote HTML:', htmlFile);

  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
