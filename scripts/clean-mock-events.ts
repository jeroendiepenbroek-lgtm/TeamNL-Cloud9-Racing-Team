#!/usr/bin/env tsx
/**
 * Clean Mock Event Data
 * Removes TEST* events and signups from database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanMockData() {
  console.log('🧹 Cleaning mock event data...\n');

  try {
    // 1. Delete signups for TEST events
    const { error: signupsError, count: signupsCount } = await supabase
      .from('event_signups')
      .delete()
      .like('event_id', 'TEST%')
      .select('*', { count: 'exact', head: true });

    if (signupsError) throw signupsError;
    console.log(`✅ Deleted ${signupsCount || 0} mock signups`);

    // 2. Delete TEST events
    const { error: eventsError, count: eventsCount } = await supabase
      .from('zwift_api_events')
      .delete()
      .like('event_id', 'TEST%')
      .select('*', { count: 'exact', head: true });

    if (eventsError) throw eventsError;
    console.log(`✅ Deleted ${eventsCount || 0} mock events`);

    // 3. Show remaining data
    const { count: remainingEvents } = await supabase
      .from('zwift_api_events')
      .select('*', { count: 'exact', head: true });

    const { count: remainingSignups } = await supabase
      .from('event_signups')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Database status:`);
    console.log(`   Events: ${remainingEvents || 0}`);
    console.log(`   Signups: ${remainingSignups || 0}`);

  } catch (error) {
    console.error('❌ Error cleaning mock data:', error);
    process.exit(1);
  }
}

cleanMockData();
