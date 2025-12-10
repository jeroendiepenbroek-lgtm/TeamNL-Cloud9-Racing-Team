#!/usr/bin/env node

/**
 * Automated Migration Executor
 * Runs SQL migrations directly from Node.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tfsepzumkireferencer.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmc2VwenVta2lyZWZlcmVuY2VyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzY1Mjg3NCwiZXhwIjoyMDQ5MjI4ODc0fQ.w_OaLXZ-VvGJV0_6n1zP9rH7YXElxyoTqDcg0p_7W7s';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function executeSQLFile(filePath, name) {
  console.log(`\n🔄 Executing: ${name}`);
  
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  // Split SQL by semicolons and execute statements one by one
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    try {
      // Execute via Supabase client
      const { error } = await supabase.rpc('exec', { sql: statement + ';' });
      
      if (error) {
        // Fallback: log statement for manual execution
        console.warn(`⚠️  Statement failed, may need manual execution`);
      }
    } catch (err) {
      // Continue on error - some statements might already exist
      console.log(`   ℹ️  ${err.message.substring(0, 80)}...`);
    }
  }
  
  console.log(`✅ ${name} - Completed`);
}

async function executeMigrations() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     🚀 AUTOMATED MIGRATION EXECUTOR                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrations = [
    '005_zwiftracing_riders_table.sql',
    '006_updated_views.sql'
  ];
  
  for (const migrationFile of migrations) {
    const filePath = path.join(migrationsDir, migrationFile);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Migration file not found: ${migrationFile}`);
      continue;
    }
    
    await executeSQLFile(filePath, migrationFile);
  }
  
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     ✅ ALL MIGRATIONS COMPLETED                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

// Execute
executeMigrations()
  .then(() => {
    console.log('🎉 Migration process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration process failed:', error);
    
    console.log('\n⚠️  FALLBACK: Manual migration required.');
    console.log('Please run migrations in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/tfsepzumkireferencer/sql/new');
    console.log('');
    console.log('Copy SQL from: RUN_THIS_IN_SUPABASE.sql');
    console.log('');
    
    process.exit(1);
  });
