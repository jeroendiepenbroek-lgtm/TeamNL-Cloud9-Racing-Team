/**
 * Script om mock/test riders uit de database te verwijderen
 * Run: npx tsx scripts/cleanup-mock-riders.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupMockRiders() {
  console.log('🧹 Cleaning up mock/test riders...\n');

  // Get all riders om te inspecteren
  const { data: riders, error: fetchError } = await supabase
    .from('riders')
    .select('rider_id, name, zp_category, zp_ftp, weight')
    .order('rider_id');

  if (fetchError) {
    console.error('❌ Error fetching riders:', fetchError);
    return;
  }

  if (!riders || riders.length === 0) {
    console.log('✅ No riders found in database');
    return;
  }

  console.log(`📊 Found ${riders.length} riders:\n`);
  riders.forEach(r => {
    console.log(`  ${r.rider_id} - ${r.name} (Cat: ${r.zp_category || '?'}, FTP: ${r.zp_ftp || '?'}W, Weight: ${r.weight || '?'}kg)`);
  });

  console.log('\n🔍 Identifying mock/test riders...');
  
  // Mock riders identificeren (riders met test/mock namen of specifieke IDs)
  const mockRiderIds = riders
    .filter(r => {
      const name = r.name.toLowerCase();
      return (
        name.includes('test') ||
        name.includes('mock') ||
        name.includes('demo') ||
        name.includes('sample') ||
        name.includes('example') ||
        r.rider_id < 1000 // Zeer lage IDs zijn vaak test data
      );
    })
    .map(r => r.rider_id);

  if (mockRiderIds.length === 0) {
    console.log('✅ No mock riders identified');
    return;
  }

  console.log(`\n🎯 Identified ${mockRiderIds.length} mock riders to delete:`);
  mockRiderIds.forEach(id => {
    const rider = riders.find(r => r.rider_id === id);
    console.log(`  ${id} - ${rider?.name}`);
  });

  console.log('\n⏳ Deleting mock riders...');

  const { error: deleteError } = await supabase
    .from('riders')
    .delete()
    .in('rider_id', mockRiderIds);

  if (deleteError) {
    console.error('❌ Error deleting riders:', deleteError);
    return;
  }

  console.log(`✅ Successfully deleted ${mockRiderIds.length} mock riders`);
  
  // Show remaining riders
  const { data: remainingRiders } = await supabase
    .from('riders')
    .select('rider_id, name')
    .order('rider_id');

  if (remainingRiders && remainingRiders.length > 0) {
    console.log(`\n📊 Remaining ${remainingRiders.length} riders:`);
    remainingRiders.forEach(r => {
      console.log(`  ${r.rider_id} - ${r.name}`);
    });
  } else {
    console.log('\n✅ All riders removed');
  }
}

cleanupMockRiders().catch(console.error);
