#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const RIDER_ID = parseInt(process.env.RIDER_ID || '150437', 10);
const DAYS_BACK = parseInt(process.env.DAYS_BACK || '10', 10);

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const cutoff = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();
  console.log('Cutoff:', cutoff);
  const { data, error } = await supabase
    .from('race_results')
    .select('event_id,position,time_seconds,category,raw_data,fetched_at')
    .eq('rider_id', RIDER_ID)
    .order('fetched_at', { ascending: false });
  if (error) { console.error('Error querying race_results:', error); process.exit(1); }

  const eventsMap = new Map();
  for (const r of data) {
    const eid = r.event_id;
    if (!eventsMap.has(eid)) eventsMap.set(eid, []);
    eventsMap.get(eid).push(r);
  }

  const results = [];
  for (const [eid, rows] of eventsMap.entries()) {
    const anyRecent = rows.some(r => r.fetched_at && new Date(r.fetched_at) >= new Date(cutoff));
    if (!anyRecent) continue;
    const myRow = rows.find(r => r.time_seconds !== null && r.time_seconds !== undefined);
    results.push({ event_id: eid, rider_time: myRow ? myRow.time_seconds : null, position: myRow ? myRow.position : null, category: myRow ? myRow.category : null, rows: rows.length });
  }

  results.sort((a,b)=> b.event_id - a.event_id);
  console.log('Events where rider has rows in last', DAYS_BACK, 'days:', results.length);
  results.forEach(r => console.log(r.event_id, 'time:', r.rider_time, 'pos:', r.position, 'cat:', r.category, 'rows:', r.rows));
})();