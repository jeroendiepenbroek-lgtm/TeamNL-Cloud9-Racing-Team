/**
 * Seed script: Add test events to database for UI testing
 * Creates events in the FUTURE (next 48 hours) so they appear in the Events page
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function seedTestEvents() {
  console.log('🌱 Seeding test events...');
  
  const now = Math.floor(Date.now() / 1000);
  
  // Create 10 test events spread across next 48 hours
  const testEvents = [
    {
      event_id: 'TEST001',
      mongo_id: 'test_mongo_001',
      time_unix: now + (2 * 3600), // In 2 hours
      title: 'TeamNL Test Race - Sprint Edition',
      event_type: 'RACE',
      sub_type: 'sprint',
      distance_meters: 25000,
      elevation_meters: 150,
      route_name: 'Watopia Figure 8',
      route_world: 'WATOPIA',
      organizer: 'TeamNL Cloud9',
      category_enforcement: true,
      pens: JSON.stringify([
        { name: 'A', label: 'Cat A', minWkg: 4.0, maxWkg: 9.9 },
        { name: 'B', label: 'Cat B', minWkg: 3.2, maxWkg: 3.99 },
      ]),
      raw_response: JSON.stringify({ test: true }),
      last_synced: new Date().toISOString(),
    },
    {
      event_id: 'TEST002',
      mongo_id: 'test_mongo_002',
      time_unix: now + (6 * 3600), // In 6 hours
      title: 'WTRL TTT Practice Session',
      event_type: 'RACE',
      sub_type: 'ttt',
      distance_meters: 36000,
      elevation_meters: 425,
      route_name: 'Makuri Islands',
      route_world: 'MAKURI',
      organizer: 'WTRL',
      category_enforcement: true,
      pens: JSON.stringify([
        { name: 'A', label: 'Open', minWkg: 0, maxWkg: 9.9 },
      ]),
      raw_response: JSON.stringify({ test: true }),
      last_synced: new Date().toISOString(),
    },
    {
      event_id: 'TEST003',
      mongo_id: 'test_mongo_003',
      time_unix: now + (12 * 3600), // In 12 hours
      title: 'Zwift Racing League - Stage 4',
      event_type: 'RACE',
      sub_type: 'road',
      distance_meters: 42000,
      elevation_meters: 620,
      route_name: 'Alpe du Zwift',
      route_world: 'WATOPIA',
      organizer: 'Zwift',
      category_enforcement: true,
      pens: JSON.stringify([
        { name: 'A', label: 'Cat A', minWkg: 4.0, maxWkg: 9.9 },
        { name: 'B', label: 'Cat B', minWkg: 3.2, maxWkg: 3.99 },
        { name: 'C', label: 'Cat C', minWkg: 2.5, maxWkg: 3.19 },
      ]),
      raw_response: JSON.stringify({ test: true }),
      last_synced: new Date().toISOString(),
    },
    {
      event_id: 'TEST004',
      mongo_id: 'test_mongo_004',
      time_unix: now + (18 * 3600), // In 18 hours
      title: 'Herd Racing - Flat Race',
      event_type: 'RACE',
      sub_type: 'crit',
      distance_meters: 30000,
      elevation_meters: 80,
      route_name: 'Tempus Fugit',
      route_world: 'WATOPIA',
      organizer: 'Herd',
      category_enforcement: false,
      pens: JSON.stringify([
        { name: 'ALL', label: 'Open Race', minWkg: 0, maxWkg: 9.9 },
      ]),
      raw_response: JSON.stringify({ test: true }),
      last_synced: new Date().toISOString(),
    },
    {
      event_id: 'TEST005',
      mongo_id: 'test_mongo_005',
      time_unix: now + (24 * 3600), // In 24 hours (tomorrow)
      title: 'TeamNL Training Ride - Endurance',
      event_type: 'GROUP_RIDE',
      sub_type: 'endurance',
      distance_meters: 50000,
      elevation_meters: 400,
      route_name: 'Three Sisters',
      route_world: 'WATOPIA',
      organizer: 'TeamNL Cloud9',
      category_enforcement: false,
      pens: JSON.stringify([
        { name: 'A', label: 'Fast Group (3.0+)', minWkg: 3.0, maxWkg: 9.9 },
        { name: 'B', label: 'Social Group (2.0+)', minWkg: 2.0, maxWkg: 2.99 },
      ]),
      raw_response: JSON.stringify({ test: true }),
      last_synced: new Date().toISOString(),
    },
    {
      event_id: 'TEST006',
      mongo_id: 'test_mongo_006',
      time_unix: now + (30 * 3600), // In 30 hours
      title: 'ZRL Season 2025 - Qualifier',
      event_type: 'RACE',
      sub_type: 'road',
      distance_meters: 38000,
      elevation_meters: 550,
      route_name: 'Tick Tock',
      route_world: 'WATOPIA',
      organizer: 'Zwift',
      category_enforcement: true,
      pens: JSON.stringify([
        { name: 'A', label: 'Cat A', minWkg: 4.0, maxWkg: 9.9 },
        { name: 'B', label: 'Cat B', minWkg: 3.2, maxWkg: 3.99 },
        { name: 'C', label: 'Cat C', minWkg: 2.5, maxWkg: 3.19 },
        { name: 'D', label: 'Cat D', minWkg: 0, maxWkg: 2.49 },
      ]),
      raw_response: JSON.stringify({ test: true }),
      last_synced: new Date().toISOString(),
    },
    {
      event_id: 'TEST007',
      mongo_id: 'test_mongo_007',
      time_unix: now + (36 * 3600), // In 36 hours
      title: 'WTRL TTT Americas',
      event_type: 'RACE',
      sub_type: 'ttt',
      distance_meters: 36000,
      elevation_meters: 425,
      route_name: 'Neokyo',
      route_world: 'MAKURI',
      organizer: 'WTRL',
      category_enforcement: true,
      pens: JSON.stringify([
        { name: 'A', label: 'Elite', minWkg: 4.5, maxWkg: 9.9 },
        { name: 'B', label: 'Advanced', minWkg: 3.5, maxWkg: 4.49 },
        { name: 'C', label: 'Intermediate', minWkg: 2.8, maxWkg: 3.49 },
      ]),
      raw_response: JSON.stringify({ test: true }),
      last_synced: new Date().toISOString(),
    },
    {
      event_id: 'TEST008',
      mongo_id: 'test_mongo_008',
      time_unix: now + (42 * 3600), // In 42 hours
      title: 'Zwift Academy - Final Race',
      event_type: 'RACE',
      sub_type: 'road',
      distance_meters: 45000,
      elevation_meters: 780,
      route_name: 'Radio Tower Climb',
      route_world: 'WATOPIA',
      organizer: 'Zwift',
      category_enforcement: true,
      pens: JSON.stringify([
        { name: 'A', label: 'All Categories', minWkg: 0, maxWkg: 9.9 },
      ]),
      raw_response: JSON.stringify({ test: true }),
      last_synced: new Date().toISOString(),
    },
    {
      event_id: 'TEST009',
      mongo_id: 'test_mongo_009',
      time_unix: now + (46 * 3600), // In 46 hours (near 48h limit)
      title: 'TeamNL Wednesday Night Race',
      event_type: 'RACE',
      sub_type: 'crit',
      distance_meters: 28000,
      elevation_meters: 120,
      route_name: 'London Classique',
      route_world: 'LONDON',
      organizer: 'TeamNL Cloud9',
      category_enforcement: true,
      pens: JSON.stringify([
        { name: 'A', label: 'Cat A', minWkg: 4.0, maxWkg: 9.9 },
        { name: 'B', label: 'Cat B', minWkg: 3.2, maxWkg: 3.99 },
        { name: 'C', label: 'Cat C', minWkg: 2.5, maxWkg: 3.19 },
      ]),
      raw_response: JSON.stringify({ test: true }),
      last_synced: new Date().toISOString(),
    },
    {
      event_id: 'TEST010',
      mongo_id: 'test_mongo_010',
      time_unix: now + (47 * 3600), // In 47 hours (just before 48h)
      title: 'Late Night Recovery Ride',
      event_type: 'GROUP_RIDE',
      sub_type: 'recovery',
      distance_meters: 20000,
      elevation_meters: 50,
      route_name: 'Watopia Flat',
      route_world: 'WATOPIA',
      organizer: 'TeamNL Cloud9',
      category_enforcement: false,
      pens: JSON.stringify([
        { name: 'ALL', label: 'Easy Pace (1.5-2.0 w/kg)', minWkg: 1.5, maxWkg: 2.0 },
      ]),
      raw_response: JSON.stringify({ test: true }),
      last_synced: new Date().toISOString(),
    },
  ];

  console.log(`Creating ${testEvents.length} test events...`);
  
  const { data, error } = await supabase
    .from('zwift_api_events')
    .upsert(testEvents, { onConflict: 'event_id' })
    .select();

  if (error) {
    console.error('❌ Error seeding events:', error);
    throw error;
  }

  console.log(`✅ Successfully seeded ${data?.length || 0} test events`);
  console.log('\nEvent timeline:');
  testEvents.forEach((event, i) => {
    const hoursFromNow = (event.time_unix - now) / 3600;
    const eventDate = new Date(event.time_unix * 1000);
    console.log(`  ${i + 1}. ${event.title}`);
    console.log(`     Time: ${eventDate.toISOString()} (in ${hoursFromNow.toFixed(1)}h)`);
  });
  
  console.log('\n🎉 Test data ready! Open Events page to see them.');
}

seedTestEvents()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
