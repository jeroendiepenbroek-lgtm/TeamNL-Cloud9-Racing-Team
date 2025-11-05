/**
 * Setup Supabase Database - Run force-clean-deploy.sql
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupDatabase() {
  console.log('🚀 Setting up Supabase database...\n');
  
  try {
    // Read SQL file
    const sqlPath = join(__dirname, '../supabase/force-clean-deploy.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    console.log('📄 Running force-clean-deploy.sql...');
    
    // Execute SQL via RPC (Supabase management API)
    // Note: This requires direct database access via Supabase SQL Editor
    // For production, use Supabase CLI or direct psql connection
    
    console.log('\n⚠️  MANUAL STEP REQUIRED:');
    console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Navigate to: SQL Editor');
    console.log('3. Create new query and paste content from:');
    console.log(`   ${sqlPath}`);
    console.log('4. Run the query (this will drop and recreate all tables)\n');
    
    // Verify tables exist after manual setup
    console.log('🔍 Verifying tables...');
    
    const tables = ['clubs', 'riders', 'events', 'results', 'rider_history', 'sync_logs'];
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Table '${table}' not found or not accessible`);
      } else {
        console.log(`✅ Table '${table}' exists (${data?.length || 0} rows)`);
      }
    }
    
    console.log('\n✅ Database verification complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Run sync: POST http://localhost:3000/api/clubs/11818/sync');
    console.log('2. Run sync: POST http://localhost:3000/api/riders/sync');
    console.log('3. Check data: GET http://localhost:3000/api/riders');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupDatabase();
