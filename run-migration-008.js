const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'public' }
});

async function runMigration() {
  console.log('📋 Running migration 008_admin_system.sql...\n');

  try {
    // Read migration file
    const migrationSQL = fs.readFileSync('migrations/008_admin_system.sql', 'utf8');
    
    // Split by statement (basic splitting on semicolon)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;

      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
      
      if (error) {
        // Try direct query if RPC fails
        const { error: directError } = await supabase
          .from('_raw')
          .select('*')
          .limit(0);
        
        if (error.message.includes('does not exist')) {
          console.log('⚠️  RPC method not available, using PostgreSQL REST API...');
          // For production, we need to execute via Supabase dashboard
          console.log('\n⚠️  Please execute migration manually in Supabase SQL Editor:');
          console.log('   1. Go to https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new');
          console.log('   2. Copy-paste migrations/008_admin_system.sql');
          console.log('   3. Click "Run"\n');
          process.exit(0);
        }
        
        console.error(`❌ Error on statement ${i + 1}:`, error.message);
        process.exit(1);
      }
      
      console.log(`✅ Statement ${i + 1} executed`);
    }

    console.log('\n✅ Migration 008 completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: node create-admin-user.js');
    console.log('2. Access admin at: http://localhost:5173/admin/login');
    
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
