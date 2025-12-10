#!/usr/bin/env node

/**
 * Sync Rider Data naar Gelijknamige Tabellen
 * Creates local SQLite database met exacte tabelstructuur als Supabase
 */

const Database = require('better-sqlite3');
const fs = require('fs');

const RIDER_ID = 150437;
const db = new Database('teamnl_racing.db');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  TeamNL Racing - Database Sync (Rider 150437)             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// Create Tables (exact match met migrations/002_api_source_tables.sql)
// ============================================================================

console.log('📊 Creating database tables...\n');

// Table 1: ZwiftRacing Events
db.exec(`
  DROP TABLE IF EXISTS api_zwiftracing_api_events_upcoming;
  
  CREATE TABLE api_zwiftracing_api_events_upcoming (
    event_id TEXT PRIMARY KEY,
    source_api TEXT DEFAULT 'zwiftracing.app' NOT NULL,
    endpoint TEXT DEFAULT '/api/events/upcoming' NOT NULL,
    fetched_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    time INTEGER NOT NULL,
    start_time TEXT,
    route_id TEXT,
    distance INTEGER,
    title TEXT NOT NULL,
    num_laps TEXT,
    type TEXT,
    sub_type TEXT,
    staggered_start INTEGER,
    categories TEXT,
    signups TEXT,
    
    raw_response TEXT NOT NULL
  );
  
  CREATE INDEX idx_events_start ON api_zwiftracing_api_events_upcoming(start_time);
  CREATE INDEX idx_events_type ON api_zwiftracing_api_events_upcoming(type);
`);

console.log('✅ Created: api_zwiftracing_api_events_upcoming');

// Table 2: ZwiftRacing Event Signups
db.exec(`
  DROP TABLE IF EXISTS api_zwiftracing_api_events_signups;
  
  CREATE TABLE api_zwiftracing_api_events_signups (
    signup_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL,
    rider_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    source_api TEXT DEFAULT 'zwiftracing.app' NOT NULL,
    endpoint TEXT DEFAULT '/api/events/{id}/signups' NOT NULL,
    fetched_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    name TEXT,
    zwift_id INTEGER,
    
    w5 INTEGER,
    w15 INTEGER,
    w30 INTEGER,
    w60 INTEGER,
    w120 INTEGER,
    w300 INTEGER,
    w1200 INTEGER,
    
    wkg5 REAL,
    wkg15 REAL,
    wkg30 REAL,
    wkg60 REAL,
    wkg120 REAL,
    wkg300 REAL,
    wkg1200 REAL,
    
    cp REAL,
    awc REAL,
    compound_score REAL,
    
    race_rating REAL,
    race_finishes INTEGER,
    race_wins INTEGER,
    race_podiums INTEGER,
    race_dnfs INTEGER,
    
    weight INTEGER,
    height INTEGER,
    
    phenotype_value TEXT,
    phenotype_bias REAL,
    
    club_id INTEGER,
    club_name TEXT,
    club_bg_color TEXT,
    club_text_color TEXT,
    
    raw_response TEXT NOT NULL,
    
    UNIQUE(event_id, rider_id, category)
  );
  
  CREATE INDEX idx_signups_event ON api_zwiftracing_api_events_signups(event_id);
  CREATE INDEX idx_signups_rider ON api_zwiftracing_api_events_signups(rider_id);
`);

console.log('✅ Created: api_zwiftracing_api_events_signups');

// Table 3: ZwiftPower Race History
db.exec(`
  DROP TABLE IF EXISTS api_zwiftpower_cache3_profile_races;
  
  CREATE TABLE api_zwiftpower_cache3_profile_races (
    race_id INTEGER PRIMARY KEY AUTOINCREMENT,
    rider_id INTEGER NOT NULL,
    event_id TEXT,
    source_api TEXT DEFAULT 'zwiftpower.com' NOT NULL,
    endpoint TEXT DEFAULT '/cache3/profile/{id}_all.json' NOT NULL,
    fetched_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    event_date TEXT,
    event_name TEXT,
    route_name TEXT,
    category TEXT,
    position INTEGER,
    finish_time INTEGER,
    
    avg_power INTEGER,
    max_power INTEGER,
    avg_wkg REAL,
    max_wkg REAL,
    
    avg_hr INTEGER,
    max_hr INTEGER,
    
    is_upgrade INTEGER,
    is_disqualified INTEGER,
    dq_reason TEXT,
    
    raw_response TEXT NOT NULL,
    
    UNIQUE(rider_id, event_id)
  );
  
  CREATE INDEX idx_zp_rider ON api_zwiftpower_cache3_profile_races(rider_id);
  CREATE INDEX idx_zp_date ON api_zwiftpower_cache3_profile_races(event_date);
`);

console.log('✅ Created: api_zwiftpower_cache3_profile_races\n');

// ============================================================================
// Sync ZwiftRacing Events
// ============================================================================

console.log('📊 Syncing ZwiftRacing Events...');

if (fs.existsSync('data/api_zwiftracing_events_upcoming.json')) {
  const events = JSON.parse(fs.readFileSync('data/api_zwiftracing_events_upcoming.json', 'utf8'));
  
  const insertEvent = db.prepare(`
    INSERT OR REPLACE INTO api_zwiftracing_api_events_upcoming (
      event_id, source_api, endpoint, fetched_at,
      time, start_time, route_id, distance, title, num_laps,
      type, sub_type, staggered_start, categories, signups,
      raw_response
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let count = 0;
  const insertMany = db.transaction((events) => {
    for (const e of events) {
      insertEvent.run(
        e.eventId,
        'zwiftracing.app',
        '/api/events/upcoming',
        new Date().toISOString(),
        e.time,
        new Date(e.time * 1000).toISOString(),
        e.routeId,
        e.distance,
        e.title,
        e.numLaps,
        e.type,
        e.subType,
        e.staggeredStart ? 1 : 0,
        e.categories,
        e.signups,
        JSON.stringify(e)
      );
      count++;
    }
  });
  
  insertMany(events);
  console.log(`✅ Inserted ${count} events\n`);
} else {
  console.log('⚠️  No events data found\n');
}

// ============================================================================
// Sync ZwiftRacing Event Signups
// ============================================================================

console.log('📊 Syncing Event Signups...');

if (fs.existsSync('data/api_zwiftracing_event_5230192_signups.json')) {
  const signups = JSON.parse(fs.readFileSync('data/api_zwiftracing_event_5230192_signups.json', 'utf8'));
  
  const insertSignup = db.prepare(`
    INSERT OR REPLACE INTO api_zwiftracing_api_events_signups (
      event_id, rider_id, category, source_api, endpoint, fetched_at,
      name, zwift_id,
      w5, w15, w30, w60, w120, w300, w1200,
      wkg5, wkg15, wkg30, wkg60, wkg120, wkg300, wkg1200,
      cp, awc, compound_score,
      race_rating, race_finishes, race_wins, race_podiums, race_dnfs,
      weight, height,
      phenotype_value, phenotype_bias,
      club_id, club_name, club_bg_color, club_text_color,
      raw_response
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let count = 0;
  const insertMany = db.transaction((signupData) => {
    // Structure is an array of category objects: [{name: "A", riders: [...]}, ...]
    for (const categoryGroup of signupData) {
      if (!categoryGroup.riders || !Array.isArray(categoryGroup.riders)) continue;
      
      for (const r of categoryGroup.riders) {
        insertSignup.run(
          '5230192',
          r.riderId,
          categoryGroup.name,  // Use the category name from the group object
          'zwiftracing.app',
          '/api/events/{id}/signups',
          new Date().toISOString(),
          r.name,
          r.zwiftId || null,
          r.power?.w5 || null,
          r.power?.w15 || null,
          r.power?.w30 || null,
          r.power?.w60 || null,
          r.power?.w120 || null,
          r.power?.w300 || null,
          r.power?.w1200 || null,
          r.power?.wkg5 || null,
          r.power?.wkg15 || null,
          r.power?.wkg30 || null,
          r.power?.wkg60 || null,
          r.power?.wkg120 || null,
          r.power?.wkg300 || null,
          r.power?.wkg1200 || null,
          r.power?.CP || null,
          r.power?.AWC || null,
          r.power?.compoundScore || null,
          r.race?.rating || null,
          r.race?.finishes || null,
          r.race?.wins || null,
          r.race?.podiums || null,
          r.race?.dnfs || null,
          r.weight || null,
          r.height || null,
          r.phenotype?.value || null,
          r.phenotype?.overall?.bias || null,
          r.club?.clubId || null,
          r.club?.name || null,
          r.club?.backgroundColor || null,
          r.club?.textColor || null,
          JSON.stringify(r)
        );
        count++;
      }
    }
  });
  
  insertMany(signups);
  console.log(`✅ Inserted ${count} signups\n`);
} else {
  console.log('⚠️  No signup data found\n');
}

// ============================================================================
// Sync ZwiftPower Race History
// ============================================================================

console.log('📊 Syncing ZwiftPower Race History...');

if (fs.existsSync('ZWIFTPOWER_FULL_DATA_150437.json')) {
  const races = JSON.parse(fs.readFileSync('ZWIFTPOWER_FULL_DATA_150437.json', 'utf8'));
  
  const insertRace = db.prepare(`
    INSERT OR REPLACE INTO api_zwiftpower_cache3_profile_races (
      rider_id, event_id, source_api, endpoint, fetched_at,
      event_date, event_name, route_name, category, position, finish_time,
      avg_power, max_power, avg_wkg, max_wkg,
      avg_hr, max_hr,
      is_upgrade, is_disqualified, dq_reason,
      raw_response
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let count = 0;
  const insertMany = db.transaction((races) => {
    // races.data is the array
    const raceData = races.data || races;
    
    for (const r of raceData) {
      // Parse event date from time array [seconds, 0]
      let eventDate = null;
      if (r.event_date) {
        eventDate = r.event_date;
      } else if (r.time && Array.isArray(r.time)) {
        eventDate = new Date(r.time[0] * 1000).toISOString();
      }
      
      insertRace.run(
        RIDER_ID,
        r.event_id || r.zid || null,
        'zwiftpower.com',
        '/cache3/profile/{id}_all.json',
        new Date().toISOString(),
        eventDate,
        r.event_name || r.name || null,
        r.route_name || null,
        r.category || null,
        r.pos || r.position || null,
        r.time_gun || r.time?.[0] || null,
        r.avg_power?.[0] || null,
        r.max_power?.[0] || null,
        r.avg_wkg?.[0] || null,
        r.max_wkg?.[0] || null,
        r.avg_hr?.[0] || null,
        r.max_hr?.[0] || null,
        0, // is_upgrade
        0, // is_disqualified
        null, // dq_reason
        JSON.stringify(r)
      );
      count++;
    }
  });
  
  insertMany(races);
  console.log(`✅ Inserted ${count} races for rider ${RIDER_ID}\n`);
} else {
  console.log('⚠️  No ZwiftPower data found\n');
}

// ============================================================================
// Summary & Verification
// ============================================================================

console.log('━'.repeat(60));
console.log('📊 DATABASE SUMMARY');
console.log('━'.repeat(60));

const tables = [
  'api_zwiftracing_api_events_upcoming',
  'api_zwiftracing_api_events_signups',
  'api_zwiftpower_cache3_profile_races'
];

const summary = tables.map(table => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
  return {
    table: table,
    records: count.count
  };
});

console.table(summary);

// ============================================================================
// Test Queries
// ============================================================================

console.log('\n📊 VERIFICATION QUERIES\n');

// Query 1: Upcoming events
console.log('1. Next 5 upcoming events:');
const upcomingEvents = db.prepare(`
  SELECT event_id, title, datetime(start_time) as start, type
  FROM api_zwiftracing_api_events_upcoming
  WHERE start_time > datetime('now')
  ORDER BY start_time
  LIMIT 5
`).all();
console.table(upcomingEvents);

// Query 2: Event signups for rider 150437
console.log('\n2. Event signups for rider 150437:');
const riderSignups = db.prepare(`
  SELECT event_id, category, name, race_rating, wkg1200 as ftp_wkg
  FROM api_zwiftracing_api_events_signups
  WHERE rider_id = ?
`).all(RIDER_ID);

if (riderSignups.length > 0) {
  console.table(riderSignups);
} else {
  console.log('   No signups found for rider 150437');
}

// Query 3: Recent ZwiftPower races
console.log('\n3. Recent 5 ZwiftPower races for rider 150437:');
const recentRaces = db.prepare(`
  SELECT event_name, category, position, avg_power, avg_wkg
  FROM api_zwiftpower_cache3_profile_races
  WHERE rider_id = ?
  ORDER BY event_date DESC
  LIMIT 5
`).all(RIDER_ID);

if (recentRaces.length > 0) {
  console.table(recentRaces);
} else {
  console.log('   No races found');
}

// ============================================================================
// Export SQL for Supabase
// ============================================================================

console.log('\n━'.repeat(60));
console.log('📝 Exporting data for Supabase...\n');

// Export as SQL INSERT statements
let sqlExport = '-- TeamNL Racing - Data Export for Supabase\n';
sqlExport += '-- Generated: ' + new Date().toISOString() + '\n\n';

// Export events (sample 50)
sqlExport += '-- Upcoming Events (sample 50)\n';
const sampleEvents = db.prepare(`
  SELECT * FROM api_zwiftracing_api_events_upcoming LIMIT 50
`).all();

for (const e of sampleEvents) {
  sqlExport += `INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '${e.event_id}', 
    '${e.source_api}', 
    '${e.endpoint}', 
    '${e.fetched_at}', 
    ${e.time}, 
    '${e.start_time}', 
    '${e.title.replace(/'/g, "''")}', 
    '${e.type}',
    '${e.raw_response.replace(/'/g, "''")}'
  ) ON CONFLICT (event_id) DO NOTHING;\n`;
}

fs.writeFileSync('data/supabase_export.sql', sqlExport);
console.log('✅ Exported SQL to: data/supabase_export.sql');

// Export as CSV
console.log('✅ Database saved to: teamnl_racing.db');

console.log('\n' + '═'.repeat(60));
console.log('✅ SYNC COMPLETE!');
console.log('═'.repeat(60));
console.log('\nNext steps:');
console.log('1. ✅ Database created: teamnl_racing.db');
console.log('2. 📊 View data: sqlite3 teamnl_racing.db');
console.log('3. ☁️  Upload to Supabase (use migrations + CSV import)');
console.log('4. 🚀 Start building frontend!\n');

db.close();
