#!/usr/bin/env node

/**
 * Supabase Migration Runner
 * 
 * 3 manieren om te migreren:
 * 1. Direct SQL via Supabase Client (DEZE METHODE)
 * 2. PostgreSQL connection string (psql/pg)
 * 3. Supabase CLI (supabase db push)
 * 
 * Deze script gebruikt methode 1: Direct SQL via Supabase JS client
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase credentials van .env
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🗄️  Supabase Migration Runner');
console.log('📍 URL:', SUPABASE_URL);
console.log('');

/**
 * Run SQL migration file
 */
async function runMigration(filename: string): Promise<void> {
  const migrationPath = path.join(__dirname, '../supabase/migrations', filename);
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${filename}`);
    return;
  }
  
  console.log(`📄 Running: ${filename}`);
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  try {
    // Execute SQL via Supabase RPC
    // Note: Supabase doesn't have direct SQL execution via client
    // We need to use the REST API or create a postgres function
    
    // Method 1: Split into statements and execute individually
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`  [${i + 1}/${statements.length}] Executing...`);
      
      // Use rpc to execute raw SQL
      const { data, error } = await supabase.rpc('exec_sql', { 
        query: statement + ';' 
      });
      
      if (error) {
        console.error(`  ❌ Error:`, error.message);
        throw error;
      }
    }
    
    console.log(`  ✅ Success\n`);
    
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
    throw error;
  }
}

/**
 * Create migrations tracking table if not exists
 */
async function setupMigrationsTable(): Promise<void> {
  console.log('🔧 Setting up migrations tracking...');
  
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  
  if (error) {
    console.error('❌ Failed to create _migrations table:', error.message);
    throw error;
  }
  
  console.log('✅ Migrations table ready\n');
}

/**
 * Check if migration already executed
 */
async function isMigrationExecuted(name: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('_migrations')
    .select('name')
    .eq('name', name)
    .single();
  
  return !error && data !== null;
}

/**
 * Mark migration as executed
 */
async function markMigrationExecuted(name: string): Promise<void> {
  await supabase
    .from('_migrations')
    .insert({ name });
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  npm run migrate <migration-file.sql>');
    console.log('  npm run migrate 030_unified_schema_poc.sql');
    console.log('');
    console.log('Or run all pending migrations:');
    console.log('  npm run migrate:all');
    process.exit(1);
  }
  
  try {
    await setupMigrationsTable();
    
    for (const filename of args) {
      if (await isMigrationExecuted(filename)) {
        console.log(`⏭️  Skipping ${filename} (already executed)\n`);
        continue;
      }
      
      await runMigration(filename);
      await markMigrationExecuted(filename);
    }
    
    console.log('✅ All migrations complete!');
    
  } catch (error) {
    console.error('\n❌ Migration failed');
    process.exit(1);
  }
}

main();
