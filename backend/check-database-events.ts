/**
 * Check database voor event IDs van rider 150437
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bktbeefdmrpxhsyyalvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU'
);

async function checkDatabaseEvents() {
  console.log('🗄️  DATABASE CHECK - Event IDs voor Rider 150437\n');
  console.log('='.repeat(80));

  const { data, error } = await supabase
    .from('zwift_api_race_results')
    .select('event_id, event_name, event_date, rank, position, velo_rating, time_seconds, avg_wkg, pen, total_riders')
    .eq('rider_id', 150437)
    .order('event_date', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Gevonden: ${data.length} results in database\n`);
  
  const uniqueEvents = [...new Set(data.map(r => r.event_id))];
  console.log(`📋 UNIQUE EVENT IDs: ${uniqueEvents.length} events\n`);
  
  console.log('🚀 GEBRUIK DEZE EVENT IDs VOOR RESULTS ENDPOINT:');
  console.log('-'.repeat(80));
  uniqueEvents.forEach(eventId => {
    const eventResults = data.filter(r => r.event_id === eventId);
    const r = eventResults[0];
    const date = new Date(r.event_date).toLocaleDateString('nl-NL');
    console.log(`  curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \\`);
    console.log(`       https://zwift-ranking.herokuapp.com/public/results/${eventId}`);
    console.log(`  → ${r.event_name} (${date})`);
    console.log('');
  });
  
  console.log('\n📊 ALLE RESULTS (sorted by date, newest first):');
  console.log('-'.repeat(80));
  console.log('Date       | Event ID | Rank | Pos | PEN | vELO   | Time  | Event Name');
  console.log('-'.repeat(80));
  
  data.forEach(r => {
    const date = new Date(r.event_date).toLocaleDateString('nl-NL');
    const time = `${Math.floor(r.time_seconds / 60)}:${String(Math.floor(r.time_seconds % 60)).padStart(2, '0')}`;
    const velo = r.velo_rating.toFixed(1).padStart(7);
    const eventName = (r.event_name || 'Unknown Event').substring(0, 40);
    const rank = String(r.rank).padStart(4);
    const pos = String(r.position).padStart(3);
    const pen = r.pen || 'N/A';
    
    console.log(`${date} | ${String(r.event_id).padStart(8)} | ${rank} | ${pos} | ${String(pen).padStart(3)} | ${velo} | ${time.padStart(5)} | ${eventName}`);
  });

  console.log('\n\n' + '='.repeat(80));
  console.log('📈 STATISTICS');
  console.log('='.repeat(80));
  console.log(`  • Total races: ${data.length}`);
  console.log(`  • Unique events: ${uniqueEvents.length}`);
  console.log(`  • Avg rank: ${(data.reduce((sum, r) => sum + r.rank, 0) / data.length).toFixed(1)}`);
  console.log(`  • Best rank: ${Math.min(...data.map(r => r.rank))}`);
  console.log(`  • Avg vELO: ${(data.reduce((sum, r) => sum + r.velo_rating, 0) / data.length).toFixed(1)}`);
  console.log(`  • Current vELO: ${data[0].velo_rating.toFixed(1)}`);
  console.log(`  • vELO range: ${Math.min(...data.map(r => r.velo_rating)).toFixed(1)} - ${Math.max(...data.map(r => r.velo_rating)).toFixed(1)}`);
}

checkDatabaseEvents().catch(console.error);
