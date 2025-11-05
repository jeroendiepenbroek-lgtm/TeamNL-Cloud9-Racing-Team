import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env from backend folder
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectAllTables() {
  console.log('🔍 COMPLETE SUPABASE SCHEMA INSPECTION\n');
  console.log('=' .repeat(80));
  
  const tables = ['clubs', 'riders', 'events', 'results', 'rider_history', 'sync_logs'];
  
  for (const tableName of tables) {
    console.log(`\n📋 TABLE: ${tableName.toUpperCase()}`);
    console.log('-'.repeat(80));
    
    // Get sample data to see structure
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
      
    if (error) {
      console.log(`❌ Error: ${error.message}`);
      continue;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️  Table is empty - cannot inspect columns');
      
      // Fallback: try to query information_schema via RPC or raw SQL
      // But Supabase doesn't expose this directly, so we skip
      continue;
    }
    
    const columns = Object.keys(data[0]);
    console.log(`Columns (${columns.length}):`);
    columns.forEach(col => {
      const value = data[0][col];
      const type = value === null ? 'null' : typeof value;
      const preview = value === null ? 'NULL' : 
                     typeof value === 'string' && value.length > 50 ? 
                     value.substring(0, 50) + '...' : 
                     String(value);
      console.log(`  • ${col.padEnd(25)} [${type.padEnd(10)}] = ${preview}`);
    });
    
    console.log(`\nSample row count: ${data.length}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Inspection complete!\n');
  
  // Now create the corrected SQL
  console.log('📝 Generating corrected view_my_team SQL based on actual schema...\n');
}

inspectAllTables().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
