#!/usr/bin/env node
require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RIDER_ID = parseInt(process.env.RIDER_ID || '150437', 10);
const DAYS_BACK = parseInt(process.env.DAYS_BACK || '10', 10);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase env missing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  const cutoff = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();
  console.log('Cutoff:', cutoff);

  // Query rows where event_date >= cutoff OR created_at >= cutoff
  const { data, error } = await supabase
    .from('rider_event_ids')
    .select('event_id,event_date,created_at')
    .eq('rider_id', RIDER_ID)
    .or(`event_date.gte.${cutoff},created_at.gte.${cutoff}`)
    .order('event_date', { ascending: false });

  if (error) {
    console.error('DB error:', error);
    process.exit(1);
  }

  console.log('Found', (data || []).length, 'events in last', DAYS_BACK, 'days for rider', RIDER_ID);
  for (const r of data || []) {
    console.log(`  - ${r.event_id}  event_date=${r.event_date}  created_at=${r.created_at}`);
  }
})();
