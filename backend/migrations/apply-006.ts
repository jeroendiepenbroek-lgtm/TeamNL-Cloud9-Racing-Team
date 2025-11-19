#!/usr/bin/env tsx
/**
 * Apply Migration 006: Extend race_results table for Results Dashboard
 * 
 * This script reads the migration SQL file and executes it against Supabase
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../src/services/supabase.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  console.log('📦 Applying Migration 006: Extend race_results table\n');
  
  try {
    // Read migration file
    const migrationPath = join(__dirname, '006_extend_race_results.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📊 SQL length:', migrationSQL.length, 'characters\n');
    
    // Split into individual statements (crude but works for our case)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`🔧 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 80).replace(/\s+/g, ' ');
      
      try {
        console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);
        
        const { error } = await supabase.client.rpc('exec_sql', { sql: stmt });
        
        if (error) {
          console.error(`  ❌ Error:`, error.message);
          errorCount++;
        } else {
          console.log(`  ✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.error(`  ❌ Exception:`, err.message);
        errorCount++;
      }
      
      console.log('');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📝 Total: ${statements.length}`);
    console.log('='.repeat(60));
    
    if (errorCount === 0) {
      console.log('\n✨ Migration completed successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Migration completed with errors. Check logs above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
