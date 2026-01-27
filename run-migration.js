const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Use environment variables directly
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🚀 Running sync system tables migration...\n');

  try {
    // First, check if sync_config table exists
    console.log('🔍 Checking if sync_config table exists...');
    const { data: existingData, error: checkError } = await supabase
      .from('sync_config')
      .select('*')
      .limit(1);

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows
      console.log('❌ sync_config table does not exist, creating it...\n');

      // Try to create the table using RPC (this might not work for DDL)
      console.log('⚠️  DDL operations need to be done manually in Supabase dashboard');
      console.log('📋 Please run this SQL in Supabase SQL editor:\n');

      const migrationSQL = fs.readFileSync('./migrations/create_sync_system_tables.sql', 'utf8');
      console.log('```sql');
      console.log(migrationSQL);
      console.log('```\n');

      return;
    }

    console.log('✅ sync_config table exists!');

    // Check if rider_results config exists
    const { data: riderConfig } = await supabase
      .from('sync_config')
      .select('*')
      .eq('sync_type', 'rider_results');

    if (!riderConfig || riderConfig.length === 0) {
      console.log('📝 Adding rider_results config...');
      const { error: insertError } = await supabase
        .from('sync_config')
        .insert({
          sync_type: 'rider_results',
          enabled: true,
          interval_minutes: 60
        });

      if (insertError) {
        console.log('❌ Failed to add rider_results config:', insertError.message);
      } else {
        console.log('✅ rider_results config added successfully!');
      }
    } else {
      console.log('✅ rider_results config already exists');
    }

    // List all configs
    const { data: allConfigs } = await supabase
      .from('sync_config')
      .select('*');

    console.log('\n📊 Current sync configurations:');
    allConfigs?.forEach(config => {
      console.log(`   ${config.sync_type}: ${config.enabled ? 'enabled' : 'disabled'}, ${config.interval_minutes}min interval`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runMigration();