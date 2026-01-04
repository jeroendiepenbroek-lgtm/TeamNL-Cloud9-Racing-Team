// Test script to fetch and display race results in the format shown in screenshots
const axios = require('axios');

const API_TOKEN = '650c6d2fc4ef6858d74cbef1';
const API_BASE = 'https://api.zwiftracing.app/api';

// Test riders from database
const testRiders = [
  150437,  // JRøne | CloudRacer-9 @YouTube
  1813927, // Dyl On(CLOUD🌩️)
  1495,    // Onno Aphinan
  523903,  // Rob van Roest
  1044873  // Jens Jeremy (TeamNL)
];

async function fetchRiderProfile(riderId) {
  try {
    const response = await axios.get(`${API_BASE}/public/riders/${riderId}`, {
      headers: { 'Authorization': API_TOKEN }
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching rider ${riderId}:`, error.message);
    return null;
  }
}

function formatDate(timestamp) {
  return new Date(timestamp * 1000).toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function displayRiderResults(riderId) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🏁 RIDER RESULTS: ${riderId}`);
  console.log(`${'='.repeat(80)}\n`);
  
  const profile = await fetchRiderProfile(riderId);
  
  if (!profile) {
    return;
  }
  
  // US1 Format: Rider Overview (like screenshot 1)
  console.log(`📊 Profile: ${profile.name}`);
  console.log(`Category: ${profile.zpCategory || profile.race?.current?.mixed?.category || 'N/A'}`);
  console.log(`vELO: ${Math.round(profile.race?.current?.rating || 0)}`);
  console.log(`\n📈 Racing Stats:`);
  console.log(`  Races: ${profile.race?.stats?.finishes || 0}`);
  console.log(`  Wins: ${profile.race?.stats?.wins || 0}`);
  console.log(`  Podiums: ${profile.race?.stats?.podiums || 0}`);
  console.log(`  Win Rate: ${((profile.race?.stats?.wins || 0) / (profile.race?.stats?.finishes || 1) * 100).toFixed(1)}%`);
  
  // Power profile (like screenshot 1 power columns)
  console.log(`\n⚡ Power Profile:`);
  const power = profile.power || {};
  console.log(`  5s:  ${power.w5 || '-'}W (${power.wkg5?.toFixed(2) || '-'} W/kg)`);
  console.log(`  15s: ${power.w15 || '-'}W (${power.wkg15?.toFixed(2) || '-'} W/kg)`);
  console.log(`  30s: ${power.w30 || '-'}W (${power.wkg30?.toFixed(2) || '-'} W/kg)`);
  console.log(`  1m:  ${power.w60 || '-'}W (${power.wkg60?.toFixed(2) || '-'} W/kg)`);
  console.log(`  2m:  ${power.w120 || '-'}W (${power.wkg120?.toFixed(2) || '-'} W/kg)`);
  console.log(`  5m:  ${power.w300 || '-'}W (${power.wkg300?.toFixed(2) || '-'} W/kg)`);
  console.log(`  20m: ${power.w1200 || '-'}W (${power.wkg1200?.toFixed(2) || '-'} W/kg)`);
  
  // Recent races (we'll need to fetch this from a different endpoint or database)
  console.log(`\n🏆 Recent Races: (To be fetched from event results API)`);
  console.log(`  Note: Need to fetch actual event participation from events database`);
}

async function main() {
  console.log('🧪 Testing Results Feature - Matching Screenshots Format\n');
  console.log(`US1: Rider race history overview`);
  console.log(`US2: Individual race result details`);
  console.log(`US3: Team overview of recent races\n`);
  
  // Test with rider 150437 first
  await displayRiderResults(150437);
  
  console.log(`\n\n💡 Next Steps:`);
  console.log(`1. Fetch actual event IDs from rider participation`);
  console.log(`2. Use /api/public/results/{eventId} to get full race results`);
  console.log(`3. Display in table format matching screenshots`);
}

main().catch(console.error);
