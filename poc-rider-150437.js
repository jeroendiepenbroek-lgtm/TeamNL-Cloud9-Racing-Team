// POC: Fetch real race data for Rider 150437
const axios = require('axios');

const API_TOKEN = '650c6d2fc4ef6858d74cbef1';
const API_BASE = 'https://api.zwiftracing.app/api';
const RIDER_ID = 150437;

async function fetchRiderProfile() {
  console.log(`\n🔍 Fetching profile for rider ${RIDER_ID}...\n`);
  
  try {
    const response = await axios.get(`${API_BASE}/public/riders/${RIDER_ID}`, {
      headers: { 'Authorization': API_TOKEN }
    });
    
    const data = response.data;
    
    console.log('📊 Rider Profile:');
    console.log(`  Name: ${data.name}`);
    console.log(`  Category: ${data.zpCategory}`);
    console.log(`  vELO: ${Math.round(data.race?.current?.rating || 0)}`);
    console.log(`  FTP: ${data.zpFTP}W`);
    console.log(`  Weight: ${data.weight}kg`);
    
    console.log('\n⚡ Power Profile:');
    console.log(`  5s:  ${data.power.w5}W (${data.power.wkg5.toFixed(2)} W/kg)`);
    console.log(`  15s: ${data.power.w15}W (${data.power.wkg15.toFixed(2)} W/kg)`);
    console.log(`  30s: ${data.power.w30}W (${data.power.wkg30.toFixed(2)} W/kg)`);
    console.log(`  1m:  ${data.power.w60}W (${data.power.wkg60.toFixed(2)} W/kg)`);
    console.log(`  2m:  ${data.power.w120}W (${data.power.wkg120.toFixed(2)} W/kg)`);
    console.log(`  5m:  ${data.power.w300}W (${data.power.wkg300.toFixed(2)} W/kg)`);
    console.log(`  20m: ${data.power.w1200}W (${data.power.wkg1200.toFixed(2)} W/kg)`);
    
    // Try to find recent events in the profile
    console.log('\n💡 Note: Race history not in rider profile API');
    console.log('   Need to find actual event IDs from ZwiftRacing website');
    console.log('   Or use ZwiftPower race history if available');
    
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Mock data gebaseerd op screenshots voor POC
function generateMockRaceHistory() {
  console.log('\n📝 Generating mock race history based on screenshots...\n');
  
  const mockRaces = [
    {
      eventId: 'mock-1',
      eventName: 'Club Ladder // Herd of Honey Badgers v TeamNL_Cloud9 Spark',
      eventDate: '2025-12-29T18:00:00Z',
      position: 7,
      totalRiders: 10,
      pen: 'B',
      veloBefore: 1436,
      veloAfter: 1436,
      veloChange: 0,
      timeSeconds: 2185,
      avgWkg: 2.959,
      power5s: 8.99,
      power15s: 8.05,
      power30s: 7.31,
      power1m: 5.45,
      power2m: 4.66,
      power5m: 4.07,
      power20m: 3.07,
      effort: 90,
      rp: 111.26
    },
    {
      eventId: 'mock-2',
      eventName: 'HISP WINTER TOUR 2025 STAGE 2',
      eventDate: '2025-12-27T17:30:00Z',
      position: 13,
      totalRiders: 36,
      pen: 'B',
      veloBefore: 1432,
      veloAfter: 1432,
      veloChange: 0,
      timeSeconds: 2184,
      avgWkg: 3.095,
      power5s: 8.53,
      power15s: 7.66,
      power30s: 6.35,
      power1m: 5.14,
      power2m: 4.72,
      power5m: 3.91,
      power20m: 3.32,
      effort: 89,
      rp: 132.56
    },
    {
      eventId: 'mock-3',
      eventName: 'Club Ladder // GTR Krakens v TeamNL Cloud9 Spark',
      eventDate: '2025-12-22T18:00:00Z',
      position: 8,
      totalRiders: 10,
      pen: 'B',
      veloBefore: 1410,
      veloAfter: 1410,
      veloChange: 0,
      timeSeconds: 2173,
      avgWkg: 3.230,
      power5s: 12.74,
      power15s: 9.82,
      power30s: 7.89,
      power1m: 6.00,
      power2m: 4.47,
      power5m: 3.69,
      power20m: 3.41,
      effort: 94,
      rp: 100.31
    }
  ];
  
  return mockRaces;
}

// Generate mock event results for US2
function generateMockEventResults() {
  console.log('\n📝 Generating mock event results (US2)...\n');
  
  return {
    eventId: 'mock-1',
    eventName: 'Club Ladder // Herd of Honey Badgers v TeamNL_Cloud9 Spark',
    eventDate: '2025-12-29T18:00:00Z',
    routeName: 'Herd of Honey Badgers',
    distanceKm: 42.5,
    elevationM: 380,
    totalRiders: 10,
    results: [
      { position: 1, riderId: 999991, riderName: 'Iain Thistlethwaite', teamName: 'HERO', pen: 'B', velo: 1821, timeSeconds: 2176, avgWkg: 3.583, power5s: 9.48, power1m: 6.55, power2m: 6.30 },
      { position: 2, riderId: 999992, riderName: 'Freek Zwart', teamName: 'TeamNL', pen: 'B', velo: 1532, timeSeconds: 2184, avgWkg: 3.122, power5s: 9.61, power1m: 5.24, power2m: 4.54 },
      { position: 3, riderId: 999993, riderName: 'Matt Reamsbottom', teamName: 'HERO', pen: 'B', velo: 1493, timeSeconds: 2184, avgWkg: 3.139, power5s: 8.47, power1m: 5.72, power2m: 5.06 },
      { position: 4, riderId: 999994, riderName: 'Hans Saris', teamName: 'TeamNL', pen: 'B', velo: 1616, timeSeconds: 2184, avgWkg: 3.200, power5s: 10.71, power1m: 6.05, power2m: 4.84 },
      { position: 5, riderId: 999995, riderName: 'Rhys Williams', teamName: 'HERO', pen: 'B', velo: 1601, timeSeconds: 2184, avgWkg: 3.051, power5s: 12.77, power1m: 6.06, power2m: 4.97 },
      { position: 6, riderId: 999996, riderName: 'Joe C', teamName: 'HERO', pen: 'B', velo: 1507, timeSeconds: 2185, avgWkg: 2.945, power5s: 10.87, power1m: 5.91, power2m: 4.34 },
      { position: 7, riderId: 150437, riderName: 'JRøne | CloudRacer-9 @YouTube', teamName: 'TeamNL', pen: 'B', velo: 1436, timeSeconds: 2185, avgWkg: 2.959, power5s: 8.99, power1m: 5.45, power2m: 4.66 },
      { position: 8, riderId: 999998, riderName: 'Peter Wempe', teamName: 'TeamNL', pen: 'B', velo: 1514, timeSeconds: 2186, avgWkg: 2.847, power5s: 9.49, power1m: 4.82, power2m: 4.41 },
      { position: 9, riderId: 999999, riderName: 'Herbert Polman', teamName: 'TeamNL', pen: 'B', velo: 1473, timeSeconds: 2191, avgWkg: 2.988, power5s: 9.02, power1m: 5.58, power2m: 4.64 },
      { position: 10, riderId: 999990, riderName: 'Marc Powell', teamName: 'Herd', pen: 'B', velo: 1576, timeSeconds: 2223, avgWkg: 3.299, power5s: 8.92, power1m: 5.33, power2m: 4.24 }
    ]
  };
}

async function main() {
  console.log('🧪 POC: Rider 150437 Race Results');
  console.log('='.repeat(80));
  
  // Fetch real profile
  await fetchRiderProfile();
  
  // Generate mock data for POC
  const raceHistory = generateMockRaceHistory();
  const eventResults = generateMockEventResults();
  
  console.log('\n✅ POC Data Ready:');
  console.log(`  - Rider profile: Real data from API`);
  console.log(`  - Race history: ${raceHistory.length} mock races (US1)`);
  console.log(`  - Event results: ${eventResults.results.length} riders (US2)`);
  
  console.log('\n📦 Save this data structure for frontend:');
  console.log('\nRace History (US1):');
  console.log(JSON.stringify(raceHistory, null, 2));
  
  console.log('\nEvent Results (US2):');
  console.log(JSON.stringify(eventResults, null, 2));
}

main().catch(console.error);
