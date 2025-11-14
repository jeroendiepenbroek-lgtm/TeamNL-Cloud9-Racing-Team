import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function applyMigration() {
  console.log('🔧 APPLYING MIGRATION 015 DIRECTLY TO SUPABASE\n');
  console.log('='.repeat(80));

  // Read migration file
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '015_fix_views_use_zwift_api_signups.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📄 Migration SQL loaded');
  console.log('📝 Executing via Supabase RPC...\n');

  // Split SQL into statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
    
    try {
      // Execute via RPC (raw SQL execution)
      const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });
      
      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error);
        console.log('Statement:', stmt.substring(0, 200) + '...');
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    } catch (err: any) {
      console.error(`❌ Exception on statement ${i + 1}:`, err.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('🧪 Testing view after migration...\n');

  // Test the view
  const { data: viewData, error: viewError } = await supabase
    .from('view_upcoming_events')
    .select('event_id, title, route_name, route_world, elevation_meters, distance_meters')
    .limit(1);

  if (viewError) {
    console.error('❌ View test FAILED:', viewError);
  } else if (viewData && viewData.length > 0) {
    console.log('✅ View test SUCCESSFUL!');
    const event = viewData[0];
    console.log('\nSample event:');
    console.log(`  Title: ${event.title}`);
    console.log(`  Route Name: ${event.route_name || '⚠️ Still NULL'}`);
    console.log(`  Route World: ${event.route_world || '⚠️ Still NULL'}`);
    console.log(`  Elevation: ${event.elevation_meters ?? '⚠️ Still NULL'}m`);
    console.log(`  Distance: ${event.distance_meters ?? '⚠️ Still NULL'}mm`);
  }
}

applyMigration().catch(console.error);
