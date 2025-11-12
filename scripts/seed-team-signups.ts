/**
 * Seed script: Add team rider signups to test events
 * Tests US2 and US3: Events with team riders highlighted + rider count
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function seedTeamSignups() {
  console.log('🌱 Seeding team rider signups to test events...\n');
  
  // Get team riders from database
  const { data: riders, error: ridersError } = await supabase
    .from('riders')
    .select('rider_id, name, zp_category, zp_ftp, weight')
    .limit(10);
  
  if (ridersError || !riders || riders.length === 0) {
    console.error('❌ No riders found in database');
    return;
  }
  
  console.log(`✅ Found ${riders.length} team riders`);
  
  // Create signups for test events
  const signups = [
    // TEST001 - TeamNL Test Race (3 riders)
    { event_id: 'TEST001', rider_id: riders[0].rider_id, pen_name: 'A', category: 'A', status: 'confirmed' },
    { event_id: 'TEST001', rider_id: riders[1].rider_id, pen_name: 'B', category: 'B', status: 'confirmed' },
    { event_id: 'TEST001', rider_id: riders[2].rider_id, pen_name: 'A', category: 'A', status: 'tentative' },
    
    // TEST002 - WTRL TTT (2 riders - team event!)
    { event_id: 'TEST002', rider_id: riders[0].rider_id, pen_name: 'A', category: 'Elite', status: 'confirmed', team_name: 'TeamNL Cloud9 A' },
    { event_id: 'TEST002', rider_id: riders[3].rider_id, pen_name: 'A', category: 'Elite', status: 'confirmed', team_name: 'TeamNL Cloud9 A' },
    
    // TEST003 - ZRL Stage 4 (5 riders - big event!)
    { event_id: 'TEST003', rider_id: riders[0].rider_id, pen_name: 'A', category: 'A', status: 'confirmed' },
    { event_id: 'TEST003', rider_id: riders[1].rider_id, pen_name: 'B', category: 'B', status: 'confirmed' },
    { event_id: 'TEST003', rider_id: riders[2].rider_id, pen_name: 'A', category: 'A', status: 'confirmed' },
    { event_id: 'TEST003', rider_id: riders[4].rider_id, pen_name: 'C', category: 'C', status: 'confirmed' },
    { event_id: 'TEST003', rider_id: riders[5].rider_id, pen_name: 'B', category: 'B', status: 'tentative' },
    
    // TEST005 - Training Ride (1 rider)
    { event_id: 'TEST005', rider_id: riders[6].rider_id, pen_name: 'A', category: 'Fast Group', status: 'confirmed' },
    
    // TEST007 - WTRL TTT Americas (4 riders - another team event)
    { event_id: 'TEST007', rider_id: riders[1].rider_id, pen_name: 'B', category: 'Advanced', status: 'confirmed', team_name: 'TeamNL Cloud9 B' },
    { event_id: 'TEST007', rider_id: riders[3].rider_id, pen_name: 'B', category: 'Advanced', status: 'confirmed', team_name: 'TeamNL Cloud9 B' },
    { event_id: 'TEST007', rider_id: riders[7].rider_id, pen_name: 'B', category: 'Advanced', status: 'confirmed', team_name: 'TeamNL Cloud9 B' },
    { event_id: 'TEST007', rider_id: riders[8].rider_id, pen_name: 'B', category: 'Advanced', status: 'tentative', team_name: 'TeamNL Cloud9 B' },
    
    // TEST009 - Wednesday Night Race (2 riders)
    { event_id: 'TEST009', rider_id: riders[2].rider_id, pen_name: 'A', category: 'A', status: 'confirmed' },
    { event_id: 'TEST009', rider_id: riders[9].rider_id, pen_name: 'C', category: 'C', status: 'confirmed' },
  ];
  
  console.log(`\n📝 Creating ${signups.length} signups...`);
  
  const { data, error } = await supabase
    .from('event_signups')
    .upsert(signups, { onConflict: 'event_id,rider_id' })
    .select();
  
  if (error) {
    console.error('❌ Error seeding signups:', error);
    throw error;
  }
  
  console.log(`✅ Successfully created ${data?.length || 0} signups\n`);
  
  // Summary
  const eventCounts: Record<string, number> = {};
  signups.forEach(s => {
    eventCounts[s.event_id] = (eventCounts[s.event_id] || 0) + 1;
  });
  
  console.log('📊 Signup Summary:');
  Object.entries(eventCounts).forEach(([eventId, count]) => {
    const eventNames: Record<string, string> = {
      'TEST001': 'TeamNL Test Race - Sprint Edition',
      'TEST002': 'WTRL TTT Practice Session',
      'TEST003': 'Zwift Racing League - Stage 4',
      'TEST005': 'TeamNL Training Ride - Endurance',
      'TEST007': 'WTRL TTT Americas',
      'TEST009': 'TeamNL Wednesday Night Race',
    };
    console.log(`  ${eventId} (${eventNames[eventId]}): ${count} riders`);
  });
  
  console.log('\n🎉 Test signups ready!');
  console.log('📍 API endpoints to test:');
  console.log('  • GET /api/events/upcoming (all events with signup counts)');
  console.log('  • GET /api/events/upcoming?hasTeamRiders=true (events with team only)');
  console.log('  • GET /api/events/TEST001/signups (specific event signups)');
}

seedTeamSignups()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
