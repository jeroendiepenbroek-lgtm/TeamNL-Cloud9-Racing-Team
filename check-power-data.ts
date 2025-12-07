/**
 * Check power data in riders_unified
 * Diagnose waarom Racing Matrix leeg is
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkPowerData() {
  console.log('🔍 Checking riders_unified schema and data...\n');

  // Step 1: Check welke power kolommen bestaan
  console.log('📋 Step 1: Check welke kolommen bestaan:');
  const { data: columns, error: colError } = await client
    .from('riders_unified')
    .select('*')
    .limit(1);

  if (colError) {
    console.error('❌ Error fetching columns:', colError);
    return;
  }

  if (columns && columns.length > 0) {
    const columnNames = Object.keys(columns[0]);
    const powerColumns = columnNames.filter(c => c.includes('power') || c.includes('ftp') || c.includes('weight'));
    console.log('Power-related columns:', powerColumns);
    console.log('');
  }

  // Step 2: Check sample data voor team members
  console.log('📊 Step 2: Sample data voor 5 team members:');
  const { data: riders, error: ridersError } = await client
    .from('riders_unified')
    .select('rider_id, name, ftp, weight_kg, power_1m_w, power_5m_w, power_20m_w, velo_rating')
    .eq('is_team_member', true)
    .order('velo_rating', { ascending: false, nullsFirst: false })
    .limit(5);

  if (ridersError) {
    console.error('❌ Error fetching riders:', ridersError);
    return;
  }

  console.table(riders);

  // Step 3: Count NULL power data
  console.log('\n📈 Step 3: NULL data analysis:');
  const { count: totalTeam } = await client
    .from('riders_unified')
    .select('*', { count: 'exact', head: true })
    .eq('is_team_member', true);

  const { count: nullPower1m } = await client
    .from('riders_unified')
    .select('*', { count: 'exact', head: true })
    .eq('is_team_member', true)
    .is('power_1m_w', null);

  const { count: nullFTP } = await client
    .from('riders_unified')
    .select('*', { count: 'exact', head: true })
    .eq('is_team_member', true)
    .is('ftp', null);

  console.log(`Total team members: ${totalTeam}`);
  console.log(`NULL power_1m_w: ${nullPower1m} (${((nullPower1m!/totalTeam!)*100).toFixed(1)}%)`);
  console.log(`NULL ftp: ${nullFTP} (${((nullFTP!/totalTeam!)*100).toFixed(1)}%)`);

  // Step 4: Check mapping issue
  console.log('\n⚠️  PROBLEEM: API verwacht power_w60 maar database heeft power_1m_w');
  console.log('Database columns: power_5s_w, power_1m_w, power_5m_w, power_20m_w');
  console.log('API query verwacht: power_w60, power_w300, power_w1200');
  console.log('\n🔧 FIX: Update riders.ts endpoint om correcte columns te gebruiken');
}

checkPowerData().catch(console.error);
