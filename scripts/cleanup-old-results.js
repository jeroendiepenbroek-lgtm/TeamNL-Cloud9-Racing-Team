#!/usr/bin/env node
require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RIDER_ID = parseInt(process.env.RIDER_ID || '150437');
const DAYS_BACK = parseInt(process.env.DAYS_BACK || '10');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase env vars missing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  const cutoff = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();
  console.log(`Cutoff ISO: ${cutoff} (older than ${DAYS_BACK} days)`);

  const { data: events, error } = await supabase
    .from('race_events')
    .select('event_id,event_date')
    .lt('event_date', cutoff);

  if (error) {
    console.error('Error fetching events:', error.message || error);
    process.exit(1);
  }

  const oldEventIds = (events || []).map(e => e.event_id).filter(Boolean);
  if (oldEventIds.length === 0) {
    console.log('No old events to delete');
    process.exit(0);
  }

  console.log(`Deleting race_results for rider ${RIDER_ID} for ${oldEventIds.length} events`);

  const { error: delErr } = await supabase
    .from('race_results')
    .delete()
    .eq('rider_id', RIDER_ID)
    .in('event_id', oldEventIds);

  if (delErr) {
    console.error('Delete error:', delErr.message || delErr);
    process.exit(1);
  }

  console.log('Delete completed');
})();
