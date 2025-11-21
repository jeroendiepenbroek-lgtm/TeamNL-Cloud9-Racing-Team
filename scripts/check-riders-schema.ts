#!/usr/bin/env tsx

/**
 * Check exact column names in riders table
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env from backend directory
config({ path: resolve(process.cwd(), 'backend', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking riders table schema...\n');

  // Get one rider to see all columns
  const { data, error } = await supabase
    .from('riders')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log(`✅ Found ${columns.length} columns in riders table:\n`);
    
    columns.sort().forEach((col, i) => {
      console.log(`   ${i + 1}. ${col}`);
    });

    console.log('\n📊 Power columns:');
    const powerCols = columns.filter(c => c.startsWith('power_'));
    powerCols.forEach(col => console.log(`   - ${col}`));

    console.log('\n⚙️  Physical attributes:');
    const physicalCols = columns.filter(c => ['weight', 'height', 'ftp', 'zp_ftp', 'velo'].some(k => c.includes(k)));
    physicalCols.forEach(col => console.log(`   - ${col}`));
  }
}

checkSchema();
