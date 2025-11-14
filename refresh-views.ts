import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function refreshViews() {
  console.log('🔄 Refreshing Supabase views...');
  
  // Lees de migratie SQL
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '015_fix_views_use_zwift_api_signups.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('📄 SQL loaded from:', migrationPath);
  console.log('📝 Executing SQL...\n');
  
  // Voer SQL uit via RPC (als je die hebt) of direct
  // Voor nu: print instructie
  console.log('⚠️  Manual action required:');
  console.log('1. Go to: https://bktbeefdmrpxhsyyalvc.supabase.co/project/_/sql');
  console.log('2. Paste the SQL from:', migrationPath);
  console.log('3. Click "Run"\n');
  
  // Test de view
  console.log('🧪 Testing view_upcoming_events...');
  const { data, error } = await supabase
    .from('view_upcoming_events')
    .select('event_id, title, route_name, route_world, elevation_meters, distance_meters')
    .limit(1);
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ View query successful!');
    console.log('Sample event:', JSON.stringify(data?.[0], null, 2));
    
    if (data?.[0]) {
      const event = data[0];
      console.log('\n📊 Data check:');
      console.log('  route_name:', event.route_name || '❌ NULL');
      console.log('  route_world:', event.route_world || '❌ NULL');
      console.log('  elevation_meters:', event.elevation_meters || '❌ NULL');
      console.log('  distance_meters:', event.distance_meters || '❌ NULL');
    }
  }
}

refreshViews().catch(console.error);
