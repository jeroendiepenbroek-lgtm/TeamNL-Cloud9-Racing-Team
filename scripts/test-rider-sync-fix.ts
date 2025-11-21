/**
 * Test Sync V2 Rider Fix - Direct test zonder server
 * Run: cd backend && npx tsx ../scripts/test-rider-sync-fix.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from backend directory
config({ path: resolve(process.cwd(), '.env') });

import { syncServiceV2 } from '../backend/src/services/sync-v2.service.js';

async function main() {
  console.log('🧪 Testing Sync V2 Rider Fix\n');
  console.log('Testing with rider 150437 (Jeroen Diepenbroek)');
  console.log('Expected: weight_kg=74, height_cm=183\n');
  
  console.log('📊 Before sync - checking current data...');
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  const { data: before } = await supabase
    .from('riders')
    .select('rider_id, name, weight_kg, height_cm, ftp, velo_rating')
    .eq('rider_id', 150437)
    .single();
  
  console.log('   Current DB values:');
  console.log(`   Weight: ${before?.weight_kg || 'NULL'}kg`);
  console.log(`   Height: ${before?.height_cm || 'NULL'}cm`);
  console.log(`   FTP: ${before?.ftp || 'NULL'}`);
  console.log(`   vELO: ${before?.velo_rating || 'NULL'}`);
  
  console.log('\n🔄 Running rider sync...');
  const metrics = await syncServiceV2.syncRiders({
    intervalMinutes: 60,
    clubId: 11818
  });
  
  console.log('\n📊 Sync completed:');
  console.log(`   Status: ${metrics.status}`);
  console.log(`   Processed: ${metrics.riders_processed}`);
  console.log(`   Updated: ${metrics.riders_updated}`);
  console.log(`   New: ${metrics.riders_new}`);
  console.log(`   Duration: ${metrics.duration_ms}ms`);
  
  console.log('\n📊 After sync - checking updated data...');
  const { data: after } = await supabase
    .from('riders')
    .select('rider_id, name, weight_kg, height_cm, ftp, velo_rating, updated_at')
    .eq('rider_id', 150437)
    .single();
  
  if (after) {
    console.log('   Updated DB values:');
    console.log(`   Weight: ${after.weight_kg || 'NULL'}kg ${after.weight_kg === 74 ? '✅' : '❌'}`);
    console.log(`   Height: ${after.height_cm || 'NULL'}cm ${after.height_cm === 183 ? '✅' : '❌'}`);
    console.log(`   FTP: ${after.ftp || 'NULL'}`);
    console.log(`   vELO: ${after.velo_rating || 'NULL'}`);
    console.log(`   Updated: ${after.updated_at}`);
    
    if (after.weight_kg === 74 && after.height_cm === 183) {
      console.log('\n✅ SUCCESS! Rider data correctly synced!');
    } else {
      console.log('\n❌ FAILED! Data still not updated.');
    }
  }
}

main().catch(console.error);
