import dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config();

const { supabase } = await import('./src/services/supabase.service.js');

(async () => {
  console.log('🧹 Running database cleanup...\n');
  
  const sql = readFileSync('/tmp/cleanup-legacy.sql', 'utf-8');
  
  const { error } = await (supabase as any).client.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Cleanup executed successfully\n');
    
    // Verify results
    const { data: tables } = await (supabase as any).client
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    console.log('📊 Remaining tables:', tables?.length || 0);
  }
})();
