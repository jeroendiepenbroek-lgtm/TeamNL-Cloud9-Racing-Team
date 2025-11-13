#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function runMigration(file: string) {
  const sql = fs.readFileSync(file, 'utf8');
  console.log(`Running: ${file}`);
  
  const { error } = await supabase.rpc('exec_sql', { sql_string: sql });
  
  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  console.log('✅ Done');
}

runMigration('supabase/migrations/013_add_foreign_key.sql');
