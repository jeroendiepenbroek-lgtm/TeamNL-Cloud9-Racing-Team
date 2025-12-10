#!/usr/bin/env node

/**
 * Upload lokale SQLite data naar Supabase
 * 
 * Workflow:
 * 1. Lees data uit teamnl_racing.db
 * 2. Connect naar Supabase
 * 3. Upload data naar gelijknamige tabellen
 * 4. Verify counts
 */

const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY_HERE';

const SQLITE_DB = './teamnl_racing.db';

// ============================================================================
// SETUP
// ============================================================================

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Upload to Supabase (Rider 150437)                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Check SQLite database exists
if (!fs.existsSync(SQLITE_DB)) {
  console.error('❌ SQLite database not found:', SQLITE_DB);
  console.log('Run sync-to-database.js first!');
  process.exit(1);
}

// Check Supabase credentials
if (SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_KEY_HERE') {
  console.error('❌ Supabase service key not configured!');
  console.log('\nOptions:');
  console.log('1. Set environment variable:');
  console.log('   export SUPABASE_SERVICE_KEY="your-key"');
  console.log('\n2. Or edit this script and paste your key');
  console.log('   (Find in Supabase Dashboard → Settings → API → service_role key)');
  process.exit(1);
}

// Initialize clients
const db = new Database(SQLITE_DB, { readonly: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ============================================================================
// UPLOAD FUNCTIONS
// ============================================================================

async function uploadEvents() {
  console.log('📊 Uploading Events...');
  
  const events = db.prepare(`
    SELECT * FROM api_zwiftracing_api_events_upcoming
  `).all();
  
  console.log(`   Found ${events.length} events in SQLite`);
  
  if (events.length === 0) {
    console.log('   ⚠️  No events to upload\n');
    return;
  }
  
  // Batch insert (max 1000 per batch for Supabase)
  const batchSize = 500;
  let uploaded = 0;
  
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('api_zwiftracing_api_events_upcoming')
      .upsert(batch, { onConflict: 'event_id' });
    
    if (error) {
      console.error('   ❌ Error uploading batch:', error.message);
      throw error;
    }
    
    uploaded += batch.length;
    process.stdout.write(`   Uploaded ${uploaded}/${events.length}...\r`);
  }
  
  console.log(`\n   ✅ Uploaded ${uploaded} events\n`);
}

async function uploadSignups() {
  console.log('📊 Uploading Event Signups...');
  
  const signups = db.prepare(`
    SELECT * FROM api_zwiftracing_api_events_signups
  `).all();
  
  console.log(`   Found ${signups.length} signups in SQLite`);
  
  if (signups.length === 0) {
    console.log('   ⚠️  No signups to upload\n');
    return;
  }
  
  // Clean data - convert numeric strings to actual numbers
  const cleanedSignups = signups.map(signup => {
    const cleaned = { ...signup };
    
    // Convert integer fields
    const intFields = ['w5', 'w15', 'w30', 'w60', 'w120', 'w300', 'w1200', 
                       'race_finishes', 'race_wins', 'race_podiums', 'race_dnfs',
                       'weight', 'height', 'club_id'];
    intFields.forEach(field => {
      if (cleaned[field] !== null && cleaned[field] !== undefined) {
        cleaned[field] = parseInt(cleaned[field]) || null;
      }
    });
    
    // Convert decimal fields
    const decimalFields = ['wkg5', 'wkg15', 'wkg30', 'wkg60', 'wkg120', 'wkg300', 'wkg1200',
                          'cp', 'awc', 'compound_score', 'race_rating', 'phenotype_bias'];
    decimalFields.forEach(field => {
      if (cleaned[field] !== null && cleaned[field] !== undefined) {
        cleaned[field] = parseFloat(cleaned[field]) || null;
      }
    });
    
    return cleaned;
  });
  
  // Batch insert
  const batchSize = 500;
  let uploaded = 0;
  
  for (let i = 0; i < cleanedSignups.length; i += batchSize) {
    const batch = cleanedSignups.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('api_zwiftracing_api_events_signups')
      .upsert(batch, { onConflict: 'signup_id' });
    
    if (error) {
      console.error('   ❌ Error uploading batch:', error.message);
      throw error;
    }
    
    uploaded += batch.length;
    process.stdout.write(`   Uploaded ${uploaded}/${signups.length}...\r`);
  }
  
  console.log(`\n   ✅ Uploaded ${uploaded} signups\n`);
}

async function uploadZwiftPowerRaces() {
  console.log('📊 Uploading ZwiftPower Race History...');
  
  const races = db.prepare(`
    SELECT * FROM api_zwiftpower_cache3_profile_races
  `).all();
  
  console.log(`   Found ${races.length} races in SQLite`);
  
  if (races.length === 0) {
    console.log('   ⚠️  No races to upload\n');
    return;
  }
  
  // Clean data - convert types
  const cleanedRaces = races.map(race => {
    const cleaned = { ...race };
    
    // Convert integer fields
    const intFields = ['rider_id', 'position', 'finish_time', 'avg_power', 'max_power', 'avg_hr', 'max_hr'];
    intFields.forEach(field => {
      if (cleaned[field] !== null && cleaned[field] !== undefined) {
        cleaned[field] = parseInt(cleaned[field]) || null;
      }
    });
    
    // Convert decimal fields
    const decimalFields = ['avg_wkg', 'max_wkg'];
    decimalFields.forEach(field => {
      if (cleaned[field] !== null && cleaned[field] !== undefined) {
        cleaned[field] = parseFloat(cleaned[field]) || null;
      }
    });
    
    // Convert Unix timestamp to ISO string for event_date
    if (cleaned.event_date && !isNaN(cleaned.event_date)) {
      const timestamp = parseFloat(cleaned.event_date);
      if (timestamp > 1000000000 && timestamp < 10000000000) {
        // Unix timestamp in seconds
        cleaned.event_date = new Date(timestamp * 1000).toISOString();
      } else if (timestamp >= 10000000000) {
        // Unix timestamp in milliseconds
        cleaned.event_date = new Date(timestamp).toISOString();
      }
    }
    
    // Convert boolean fields
    if (cleaned.is_upgrade !== null && cleaned.is_upgrade !== undefined) {
      cleaned.is_upgrade = Boolean(parseInt(cleaned.is_upgrade));
    }
    if (cleaned.is_disqualified !== null && cleaned.is_disqualified !== undefined) {
      cleaned.is_disqualified = Boolean(parseInt(cleaned.is_disqualified));
    }
    
    return cleaned;
  });
  
  // Batch insert
  const batchSize = 500;
  let uploaded = 0;
  
  for (let i = 0; i < cleanedRaces.length; i += batchSize) {
    const batch = cleanedRaces.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('api_zwiftpower_cache3_profile_races')
      .upsert(batch, { onConflict: 'race_id' });
    
    if (error) {
      console.error('   ❌ Error uploading batch:', error.message);
      throw error;
    }
    
    uploaded += batch.length;
    process.stdout.write(`   Uploaded ${uploaded}/${races.length}...\r`);
  }
  
  console.log(`\n   ✅ Uploaded ${uploaded} races\n`);
}

async function verifyCounts() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VERIFICATION - Supabase Record Counts');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Events
  const { count: eventsCount, error: eventsError } = await supabase
    .from('api_zwiftracing_api_events_upcoming')
    .select('*', { count: 'exact', head: true });
  
  if (eventsError) {
    console.error('❌ Error counting events:', eventsError.message);
  } else {
    console.log(`✅ Events: ${eventsCount}`);
  }
  
  // Signups
  const { count: signupsCount, error: signupsError } = await supabase
    .from('api_zwiftracing_api_events_signups')
    .select('*', { count: 'exact', head: true });
  
  if (signupsError) {
    console.error('❌ Error counting signups:', signupsError.message);
  } else {
    console.log(`✅ Signups: ${signupsCount}`);
  }
  
  // Races
  const { count: racesCount, error: racesError } = await supabase
    .from('api_zwiftpower_cache3_profile_races')
    .select('*', { count: 'exact', head: true });
  
  if (racesError) {
    console.error('❌ Error counting races:', racesError.message);
  } else {
    console.log(`✅ ZwiftPower Races: ${racesCount}`);
  }
  
  console.log('');
}

async function testViews() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TESTING HYBRID VIEWS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Test v_race_calendar
  const { data: calendar, error: calendarError } = await supabase
    .from('v_race_calendar')
    .select('event_id, title, start_time, total_signups')
    .limit(5);
  
  if (calendarError) {
    console.log('❌ v_race_calendar:', calendarError.message);
  } else {
    console.log(`✅ v_race_calendar: ${calendar.length} events`);
    if (calendar.length > 0) {
      console.log(`   Next race: "${calendar[0].title}"`);
      console.log(`   Start: ${calendar[0].start_time}`);
      console.log(`   Signups: ${calendar[0].total_signups}\n`);
    }
  }
  
  // Test v_event_signup_preview
  const { data: signupPreview, error: signupError } = await supabase
    .from('v_event_signup_preview')
    .select('event_id, category, rider_name, race_rating, predicted_position')
    .limit(5);
  
  if (signupError) {
    console.log('❌ v_event_signup_preview:', signupError.message);
  } else {
    console.log(`✅ v_event_signup_preview: ${signupPreview.length} signups`);
    if (signupPreview.length > 0) {
      const s = signupPreview[0];
      console.log(`   Sample: ${s.rider_name} (Cat ${s.category})`);
      console.log(`   Rating: ${s.race_rating}, Predicted: P${s.predicted_position}\n`);
    }
  }
  
  // Test v_race_history
  const { data: history, error: historyError } = await supabase
    .from('v_race_history')
    .select('event_name, event_date, position, avg_wkg')
    .eq('rider_id', 150437)
    .limit(5);
  
  if (historyError) {
    console.log('❌ v_race_history (rider 150437):', historyError.message);
  } else {
    console.log(`✅ v_race_history (rider 150437): ${history.length} races`);
    if (history.length > 0) {
      const r = history[0];
      console.log(`   Last race: "${r.event_name}"`);
      console.log(`   Date: ${r.event_date}`);
      console.log(`   Result: P${r.position}, Avg: ${r.avg_wkg} w/kg\n`);
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  try {
    // Upload data
    await uploadEvents();
    await uploadSignups();
    await uploadZwiftPowerRaces();
    
    // Verify
    await verifyCounts();
    
    // Test views
    await testViews();
    
    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ UPLOAD COMPLETE!');
    console.log('════════════════════════════════════════════════════════════\n');
    
    console.log('Next steps:');
    console.log('1. ✅ Database synced to Supabase');
    console.log('2. 🔍 Test queries in Supabase SQL Editor');
    console.log('3. 🚀 Start building frontend components');
    console.log('4. 📊 Connect frontend to Supabase API\n');
    
  } catch (error) {
    console.error('\n❌ Upload failed:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run
main();
