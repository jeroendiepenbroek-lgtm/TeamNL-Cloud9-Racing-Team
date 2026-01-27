#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const RIDER_ID = process.env.RIDER_ID || '150437';
const DAYS = parseInt(process.env.DAYS_BACK || '90', 10);

const dataDir = path.join(process.cwd(), 'backend', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.startsWith(`rider-${RIDER_ID}-events-`) && f.endsWith('.json'));
if (!files.length) {
  console.error('No events file found');
  process.exit(1);
}
files.sort();
const latest = files[files.length - 1];
const raw = JSON.parse(fs.readFileSync(path.join(dataDir, latest), 'utf-8'));
const races = raw.races || [];

const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
const filtered = [];
for (const r of races) {
  let dt = null;
  try {
    if (r.date && /^\d+$/.test(String(r.date))) dt = new Date(parseInt(String(r.date), 10) * 1000);
    else dt = new Date(r.date);
  } catch (e) { dt = null; }
  if (!dt) continue;
  if (dt >= cutoff) filtered.push({ event_id: String(r.event_id), date: dt.toISOString(), name: r.name || r.event_title || null });
}

const outFile = path.join(dataDir, `rider-${RIDER_ID}-events-90d-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
fs.writeFileSync(outFile, JSON.stringify({ rider_id: Number(RIDER_ID), fetch_date: new Date().toISOString(), total: filtered.length, events: filtered }, null, 2));
console.log(`Saved ${filtered.length} events to ${outFile}`);
console.log(filtered.map(e=>e.event_id).join('\n'));
