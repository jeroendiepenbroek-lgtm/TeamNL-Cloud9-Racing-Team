const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://tfsepzumkireferencer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmc2VwenVta2lyZWZlcmVuY2VyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzY1Mjg3NCwiZXhwIjoyMDQ5MjI4ODc0fQ.w_OaLXZ-VvGJV0_6n1zP9rH7YXElxyoTqDcg0p_7W7s'
);

async function runMigrations() {
  console.log('🔧 Checking current tables...\n');
  
  // Check existing tables
  const { data: tables, error: tableError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .like('table_name', 'api_%');
  
  if (tables) {
    console.log('📊 Current API tables:');
    tables.forEach(t => console.log(`   - ${t.table_name}`));
    console.log('');
  }
  
  console.log('⚠️  Supabase client cannot execute DDL statements directly.');
  console.log('');
  console.log('📋 To complete migrations, please:');
  console.log('');
  console.log('1. Go to: https://supabase.com/dashboard/project/tfsepzumkireferencer/sql/new');
  console.log('');
  console.log('2. Copy and paste this SQL:');
  console.log('');
  console.log('=' .repeat(80));
  console.log(fs.readFileSync('/tmp/run_migrations.sql', 'utf8'));
  console.log('=' .repeat(80));
  console.log('');
  console.log('3. Click "Run" button');
  console.log('');
  console.log('4. After successful execution, run:');
  console.log('   node fetch-zwiftracing-rider.js 150437');
  console.log('');
}

runMigrations().catch(console.error);
