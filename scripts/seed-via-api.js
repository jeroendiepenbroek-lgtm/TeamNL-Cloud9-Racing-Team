/**
 * Seed Results Data via Backend API
 * Creates test race results with realistic data
 * Run with backend server running: node seed-via-api.js
 */

// Helpers
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max));
}

// Generate realistic power curves
function generatePowerCurves(category, avgWkg) {
  const baseMultipliers = {
    'A': { sprint: 1.8, endurance: 0.95 },
    'B': { sprint: 1.7, endurance: 0.93 },
    'C': { sprint: 1.6, endurance: 0.92 },
    'D': { sprint: 1.5, endurance: 0.90 }
  };

  const mult = baseMultipliers[category] || baseMultipliers['C'];
  
  return {
    power_5s: parseFloat((avgWkg * mult.sprint * randomBetween(0.95, 1.05)).toFixed(2)),
    power_15s: parseFloat((avgWkg * mult.sprint * 0.95 * randomBetween(0.95, 1.05)).toFixed(2)),
    power_30s: parseFloat((avgWkg * mult.sprint * 0.85 * randomBetween(0.95, 1.05)).toFixed(2)),
    power_1m: parseFloat((avgWkg * 1.1 * randomBetween(0.95, 1.05)).toFixed(2)),
    power_2m: parseFloat((avgWkg * 1.05 * randomBetween(0.95, 1.05)).toFixed(2)),
    power_5m: parseFloat((avgWkg * randomBetween(0.95, 1.05)).toFixed(2)),
    power_20m: parseFloat((avgWkg * mult.endurance * randomBetween(0.95, 1.05)).toFixed(2))
  };
}

// Generate vELO
function generateVelo(category) {
  const veloRanges = {
    'A': [5, 7],
    'B': [4, 6],
    'C': [3, 5],
    'D': [1, 3]
  };
  
  const [min, max] = veloRanges[category] || [3, 5];
  const rating = randomInt(min, max + 1);
  const change = randomInt(-1, 2);
  const previous = Math.max(1, Math.min(7, rating - change));
  
  return { velo_rating: rating, velo_previous: previous, velo_change: change };
}

// Sample events
const SAMPLE_EVENTS = [
  { event_id: '5000001', event_name: 'WTRL TTT - Stage 1', pen: 'A', event_date: '2024-11-18T19:00:00Z', total_riders: 45 },
  { event_id: '5000002', event_name: 'ZRL Premier - Watopia Flat', pen: 'B', event_date: '2024-11-17T20:00:00Z', total_riders: 38 },
  { event_id: '5000003', event_name: 'Club Race - Volcano Circuit', pen: 'C', event_date: '2024-11-16T18:30:00Z', total_riders: 52 },
  { event_id: '5000004', event_name: 'KISS Race - Alpe du Zwift', pen: 'A', event_date: '2024-11-15T19:30:00Z', total_riders: 28 },
  { event_id: '5000005', event_name: 'SZR Sprint Series - Crit City', pen: 'B', event_date: '2024-11-14T20:30:00Z', total_riders: 41 },
];

// Sample riders (replace with actual rider IDs from your database)
const SAMPLE_RIDERS = [
  { rider_id: 150437, rider_name: 'Jeroen Diepenbroek', zwift_category: 'B' },
  { rider_id: 123456, rider_name: 'Test Rider 1', zwift_category: 'A' },
  { rider_id: 123457, rider_name: 'Test Rider 2', zwift_category: 'B' },
  { rider_id: 123458, rider_name: 'Test Rider 3', zwift_category: 'C' },
  { rider_id: 123459, rider_name: 'Test Rider 4', zwift_category: 'B' },
];

async function seedResults() {
  console.log('🌱 Seeding Results Data...\n');
  
  const BASE_URL = process.env.API_URL || 'http://localhost:3001';
  const allResults = [];
  
  for (const event of SAMPLE_EVENTS) {
    console.log(`📅 Event: ${event.event_name} (${event.pen})`);
    
    // Select 3-5 random riders
    const participantCount = randomInt(3, 6);
    const shuffled = [...SAMPLE_RIDERS].sort(() => Math.random() - 0.5);
    const participants = shuffled.slice(0, participantCount);
    
    participants.forEach((rider, index) => {
      const rank = index + 1;
      const category = event.pen;
      
      // Base time
      const baseTime = category === 'A' ? 1800 : category === 'B' ? 1900 : 2000;
      const time_seconds = baseTime + (rank - 1) * randomInt(10, 30) + randomInt(0, 60);
      
      // Avg W/kg
      const avgWkgRange = {
        'A': [4.2, 5.2],
        'B': [3.5, 4.5],
        'C': [2.8, 3.8],
        'D': [2.0, 3.0]
      };
      const [minWkg, maxWkg] = avgWkgRange[category] || [3.0, 4.0];
      const avg_wkg = parseFloat(randomBetween(minWkg, maxWkg).toFixed(2));
      
      // Power curves
      const powerCurves = generatePowerCurves(category, avg_wkg);
      
      // vELO
      const velo = generateVelo(category);
      
      const result = {
        ...event,
        rider_id: rider.rider_id,
        rider_name: rider.rider_name,
        rank,
        time_seconds,
        avg_wkg,
        ...powerCurves,
        ...velo,
        effort_score: randomInt(80, 101),
        race_points: parseFloat((1000 - (rank - 1) * 20 + randomBetween(-10, 10)).toFixed(2)),
        delta_winner_seconds: rank === 1 ? 0 : randomInt(10, 120)
      };
      
      allResults.push(result);
      console.log(`   ${rank}. ${rider.rider_name} - ${avg_wkg} W/kg - vELO ${velo.velo_rating}`);
    });
  }
  
  console.log(`\n📊 Generated ${allResults.length} results`);
  console.log(`\n📤 Sending to API...`);
  
  // Send to Supabase via direct insert (you'll need to do this manually or via Supabase dashboard)
  console.log(`\n⚠️  Note: Direct API insert not implemented.`);
  console.log(`\nGenerated data structure:`);
  console.log(JSON.stringify(allResults.slice(0, 2), null, 2));
  
  console.log(`\n✅ To insert this data:`);
  console.log(`   1. Copy the data above`);
  console.log(`   2. Go to Supabase Dashboard > Table Editor > zwift_api_race_results`);
  console.log(`   3. Click "Insert" > "Insert row"`);
  console.log(`   4. Or use Supabase SQL Editor with INSERT statements`);
  
  return allResults;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { seedResults, SAMPLE_EVENTS, SAMPLE_RIDERS };
}

// Run if called directly
if (require.main === module) {
  seedResults();
}
