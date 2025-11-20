/**
 * Seed Results Data - Populate database with test race results
 * Run: npx tsx scripts/seed-results-data.ts
 */

import { supabase } from '../backend/src/services/supabase.service.js';

// Helpers
function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max));
}

// Generate realistic power curves based on rider category
function generatePowerCurves(category: string, avgWkg: number) {
  const baseMultipliers = {
    'A': { base: 4.5, sprint: 1.8, endurance: 0.95 },
    'B': { base: 3.8, sprint: 1.7, endurance: 0.93 },
    'C': { base: 3.2, sprint: 1.6, endurance: 0.92 },
    'D': { base: 2.5, sprint: 1.5, endurance: 0.90 }
  };

  const mult = baseMultipliers[category as keyof typeof baseMultipliers] || baseMultipliers['C'];
  
  // Sprint efforts higher, endurance lower
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

// Generate realistic vELO rating
function generateVelo(category: string): { rating: number; previous: number; change: number } {
  const veloRanges = {
    'A': [5, 7],
    'B': [4, 6],
    'C': [3, 5],
    'D': [1, 3]
  };
  
  const [min, max] = veloRanges[category as keyof typeof veloRanges] || [3, 5];
  const rating = randomInt(min, max + 1);
  const change = randomInt(-1, 2); // -1, 0, or 1
  const previous = Math.max(1, Math.min(7, rating - change));
  
  return { rating, previous, change };
}

// Sample events
const SAMPLE_EVENTS = [
  { id: 5000001, name: 'WTRL TTT - Stage 1', pen: 'A', date: new Date('2024-11-18T19:00:00Z'), totalRiders: 45 },
  { id: 5000002, name: 'ZRL Premier - Watopia Flat', pen: 'B', date: new Date('2024-11-17T20:00:00Z'), totalRiders: 38 },
  { id: 5000003, name: 'Club Race - Volcano Circuit', pen: 'C', date: new Date('2024-11-16T18:30:00Z'), totalRiders: 52 },
  { id: 5000004, name: 'KISS Race - Alpe du Zwift', pen: 'A', date: new Date('2024-11-15T19:30:00Z'), totalRiders: 28 },
  { id: 5000005, name: 'SZR Sprint Series - Crit City', pen: 'B', date: new Date('2024-11-14T20:30:00Z'), totalRiders: 41 },
  { id: 5000006, name: 'ZRL Division 2 - Titans Grove', pen: 'C', date: new Date('2024-11-13T19:00:00Z'), totalRiders: 35 },
  { id: 5000007, name: 'Wednesday Night Race - Makuri', pen: 'A', date: new Date('2024-11-12T18:00:00Z'), totalRiders: 47 },
  { id: 5000008, name: 'WTRL TTT - Stage 2', pen: 'B', date: new Date('2024-11-11T19:00:00Z'), totalRiders: 33 },
];

// Sample riders (get from database)
async function getTeamRiders() {
  const { data, error } = await supabase.client
    .from('riders')
    .select('rider_id, name, zwift_category')
    .limit(20);
  
  if (error || !data || data.length === 0) {
    console.error('❌ No riders found in database');
    return [];
  }
  
  console.log(`✅ Found ${data.length} riders in database`);
  return data;
}

// Main seed function
async function seedResultsData() {
  console.log('🌱 Starting Results Data Seed...\n');
  
  // Get team riders
  const riders = await getTeamRiders();
  if (riders.length === 0) {
    console.error('⚠️  Cannot seed results without riders. Run rider sync first.');
    return;
  }
  
  let totalInserted = 0;
  
  // Generate results for each event
  for (const event of SAMPLE_EVENTS) {
    console.log(`\n📅 Event: ${event.name} (${event.pen})`);
    
    // Select random subset of riders (3-8 riders per event)
    const participantCount = randomInt(3, Math.min(9, riders.length + 1));
    const shuffled = [...riders].sort(() => Math.random() - 0.5);
    const participants = shuffled.slice(0, participantCount);
    
    console.log(`   👥 ${participantCount} team riders participating`);
    
    // Generate results for each rider
    const results = participants.map((rider, index) => {
      const rank = index + 1;
      const category = event.pen;
      
      // Base times (in seconds) - winners go faster
      const baseTime = category === 'A' ? 1800 : category === 'B' ? 1900 : 2000;
      const timeSeconds = baseTime + (rank - 1) * randomInt(10, 30) + randomInt(0, 60);
      
      // Avg W/kg based on category
      const avgWkgRange = {
        'A': [4.2, 5.2],
        'B': [3.5, 4.5],
        'C': [2.8, 3.8],
        'D': [2.0, 3.0]
      };
      const [minWkg, maxWkg] = avgWkgRange[category as keyof typeof avgWkgRange] || [3.0, 4.0];
      const avgWkg = parseFloat(randomBetween(minWkg, maxWkg).toFixed(2));
      
      // Generate power curves
      const powerCurves = generatePowerCurves(category, avgWkg);
      
      // Generate vELO
      const velo = generateVelo(category);
      
      // Effort score (80-100 for good efforts)
      const effortScore = randomInt(80, 101);
      
      // Race points (ZwiftPower-style)
      const racePoints = parseFloat((1000 - (rank - 1) * 20 + randomBetween(-10, 10)).toFixed(2));
      
      // Delta to winner (0 for 1st place)
      const deltaWinnerSeconds = rank === 1 ? 0 : randomInt(10, 120);
      
      return {
        event_id: event.id.toString(),
        event_name: event.name,
        event_date: event.date.toISOString(),
        rider_id: rider.rider_id,
        rider_name: rider.name,
        rank,
        time_seconds: timeSeconds,
        avg_wkg: avgWkg,
        pen: event.pen,
        total_riders: event.totalRiders,
        velo_rating: velo.rating,
        velo_previous: velo.previous,
        velo_change: velo.change,
        ...powerCurves,
        effort_score: effortScore,
        race_points: racePoints,
        delta_winner_seconds: deltaWinnerSeconds
      };
    });
    
    // Insert results
    const { data, error } = await supabase.client
      .from('zwift_api_race_results')
      .upsert(results, { onConflict: 'event_id,rider_id' });
    
    if (error) {
      console.error(`   ❌ Error inserting results:`, error.message);
    } else {
      console.log(`   ✅ Inserted ${results.length} results`);
      totalInserted += results.length;
      
      // Show sample result
      const sample = results[0];
      console.log(`   📊 Sample: ${sample.rider_name} - Rank ${sample.rank} - ${sample.avg_wkg} W/kg - vELO ${sample.velo_rating}`);
    }
  }
  
  console.log(`\n✨ Seed complete! Total results inserted: ${totalInserted}`);
  console.log(`\n🔍 Test the API:`);
  console.log(`   GET /api/results/team/recent?days=90&limit=50`);
  console.log(`\n🌐 View in dashboard:`);
  console.log(`   http://localhost:3001/results`);
}

// Run seed
seedResultsData()
  .then(() => {
    console.log('\n✅ Seed script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed script failed:', error);
    process.exit(1);
  });
