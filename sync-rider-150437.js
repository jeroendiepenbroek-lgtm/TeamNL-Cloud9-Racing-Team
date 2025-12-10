#!/usr/bin/env node

/**
 * Complete Data Sync voor Rider 150437
 * Test sync van alle API sources naar lokale JSON files
 */

const axios = require('axios');
const fs = require('fs');

const RIDER_ID = 150437;
const API_KEY = '650c6d2fc4ef6858d74cbef1';
const BASE_URL = 'https://zwift-ranking.herokuapp.com';

// ============================================================================
// Helper Functions
// ============================================================================

function saveJSON(filename, data) {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`✅ Saved: ${filename}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// ZwiftRacing.app API Calls
// ============================================================================

async function syncZwiftRacingIndividualRider() {
  console.log('\n📊 ZwiftRacing: Individual Rider Data');
  console.log('━'.repeat(60));
  
  try {
    const response = await axios.get(
      `${BASE_URL}/public/riders/${RIDER_ID}`,
      { headers: { 'API-KEY': API_KEY } }
    );
    
    console.log(`✅ Fetched rider ${RIDER_ID}`);
    console.log(`   Name: ${response.data.name}`);
    console.log(`   vELO: ${response.data.velo}`);
    console.log(`   FTP: ${response.data.ftp}W`);
    console.log(`   Phenotype: ${response.data.phenotype}`);
    
    saveJSON(`data/api_zwiftracing_rider_${RIDER_ID}.json`, response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return null;
  }
}

async function syncZwiftRacingClubData() {
  console.log('\n📊 ZwiftRacing: Club Data (TeamNL Cloud9)');
  console.log('━'.repeat(60));
  
  try {
    const response = await axios.get(
      `${BASE_URL}/public/clubs/11818`,
      { headers: { 'API-KEY': API_KEY } }
    );
    
    console.log(`✅ Fetched club data`);
    console.log(`   Total members: ${response.data.length}`);
    
    // Find rider 150437 in club data
    const rider = response.data.find(r => r.id === RIDER_ID);
    if (rider) {
      console.log(`   ✅ Rider ${RIDER_ID} found in club`);
      console.log(`   Name: ${rider.name}`);
      console.log(`   vELO: ${rider.velo}`);
      saveJSON(`data/api_zwiftracing_club_rider_${RIDER_ID}.json`, rider);
    } else {
      console.log(`   ⚠️  Rider ${RIDER_ID} NOT in club`);
    }
    
    saveJSON(`data/api_zwiftracing_club_11818_all.json`, response.data);
    
    return rider;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.response?.status === 401) {
      console.log('   ⚠️  Rate limited - need to wait 60 minutes');
    }
    return null;
  }
}

async function syncZwiftRacingUpcomingEvents() {
  console.log('\n📊 ZwiftRacing: Upcoming Events');
  console.log('━'.repeat(60));
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/events/upcoming`,
      { headers: { 'API-KEY': API_KEY } }
    );
    
    console.log(`✅ Fetched ${response.data.length} upcoming events`);
    
    // Save sample
    const sample = response.data.slice(0, 10);
    console.log(`   Next event: ${sample[0]?.title}`);
    console.log(`   Start: ${new Date(sample[0]?.time * 1000).toLocaleString()}`);
    
    saveJSON(`data/api_zwiftracing_events_upcoming.json`, response.data);
    saveJSON(`data/api_zwiftracing_events_upcoming_sample.json`, sample);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return null;
  }
}

async function syncZwiftRacingEventSignups(eventId) {
  console.log(`\n📊 ZwiftRacing: Event Signups for ${eventId}`);
  console.log('━'.repeat(60));
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/events/${eventId}/signups`,
      { headers: { 'API-KEY': API_KEY } }
    );
    
    console.log(`✅ Fetched event signups`);
    
    // Find rider 150437
    let found = false;
    for (const category of response.data) {
      const rider = category.riders?.find(r => r.riderId === RIDER_ID);
      if (rider) {
        console.log(`   ✅ Rider ${RIDER_ID} found in category ${category.category}`);
        console.log(`   Name: ${rider.name}`);
        console.log(`   Rating: ${rider.race?.rating}`);
        console.log(`   FTP: ${rider.power?.w1200}W / ${rider.power?.wkg1200}W/kg`);
        saveJSON(`data/api_zwiftracing_event_${eventId}_rider_${RIDER_ID}.json`, rider);
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.log(`   ⚠️  Rider ${RIDER_ID} NOT signed up for this event`);
    }
    
    saveJSON(`data/api_zwiftracing_event_${eventId}_signups.json`, response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return null;
  }
}

// ============================================================================
// Zwift Official API Calls (would need OAuth token)
// ============================================================================

async function syncZwiftOfficialProfile() {
  console.log('\n📊 Zwift Official: Profile Data');
  console.log('━'.repeat(60));
  console.log('⚠️  Requires OAuth token - skipping for now');
  console.log('   Would fetch from: /api/profiles/' + RIDER_ID);
  return null;
}

async function syncZwiftOfficialActivities() {
  console.log('\n📊 Zwift Official: Recent Activities');
  console.log('━'.repeat(60));
  console.log('⚠️  Requires OAuth token - skipping for now');
  console.log('   Would fetch from: /api/profiles/' + RIDER_ID + '/activities');
  return null;
}

// ============================================================================
// ZwiftPower API (via Python library)
// ============================================================================

async function syncZwiftPowerHistory() {
  console.log('\n📊 ZwiftPower: Race History');
  console.log('━'.repeat(60));
  console.log('⚠️  Requires Python zpdatafetch library');
  console.log('   Checking if data already exists...');
  
  // Check if we already have the data from earlier test
  if (fs.existsSync('ZWIFTPOWER_FULL_DATA_150437.json')) {
    const data = JSON.parse(fs.readFileSync('ZWIFTPOWER_FULL_DATA_150437.json', 'utf8'));
    console.log(`✅ Found existing ZwiftPower data`);
    console.log(`   Total races: ${data.length}`);
    console.log(`   Date range: ${data[0]?.event_date} to ${data[data.length-1]?.event_date}`);
    
    // Copy to data folder
    saveJSON(`data/api_zwiftpower_rider_${RIDER_ID}_races.json`, data);
    return data;
  } else {
    console.log('   ℹ️  Run: python3 export-zwiftpower-data.py');
    return null;
  }
}

// ============================================================================
// Main Sync Function
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Complete Data Sync for Rider 150437                      ║');
  console.log('║  (Jeroen Diepenbroek - TeamNL Cloud9)                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Create data directory
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
  }
  
  const results = {
    rider_id: RIDER_ID,
    synced_at: new Date().toISOString(),
    sources: {}
  };
  
  // Sync ZwiftRacing data
  results.sources.zwiftracing_individual = await syncZwiftRacingIndividualRider();
  await sleep(1000); // Rate limit
  
  results.sources.zwiftracing_club = await syncZwiftRacingClubData();
  await sleep(1000);
  
  results.sources.zwiftracing_events = await syncZwiftRacingUpcomingEvents();
  await sleep(1000);
  
  // Try to find events rider is signed up for
  if (results.sources.zwiftracing_events?.length > 0) {
    console.log('\n🔍 Searching for events rider is signed up for...');
    const sampleEventId = results.sources.zwiftracing_events[0].eventId;
    results.sources.zwiftracing_event_signups = await syncZwiftRacingEventSignups(sampleEventId);
  }
  
  // Sync Zwift Official (would need OAuth)
  results.sources.zwift_profile = await syncZwiftOfficialProfile();
  results.sources.zwift_activities = await syncZwiftOfficialActivities();
  
  // Sync ZwiftPower
  results.sources.zwiftpower_history = await syncZwiftPowerHistory();
  
  // Save summary
  console.log('\n' + '━'.repeat(60));
  console.log('📊 SYNC SUMMARY');
  console.log('━'.repeat(60));
  
  const sourceSummary = Object.entries(results.sources).map(([key, value]) => ({
    source: key,
    status: value ? '✅ Success' : '❌ Failed/Skipped',
    records: Array.isArray(value) ? value.length : (value ? 1 : 0)
  }));
  
  console.table(sourceSummary);
  
  saveJSON('data/sync_summary.json', results);
  
  console.log('\n✅ Sync complete! Data saved to ./data/ directory');
  console.log('\nNext steps:');
  console.log('1. Review data files in ./data/');
  console.log('2. Create Supabase project');
  console.log('3. Run migrations (002, 003)');
  console.log('4. Upload this data to Supabase');
}

// ============================================================================
// Run
// ============================================================================

main().catch(console.error);
