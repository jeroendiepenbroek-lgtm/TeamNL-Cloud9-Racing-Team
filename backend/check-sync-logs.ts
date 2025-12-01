import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function checkSyncLogs() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('sync_logs')
    .select('endpoint, status, records_processed, duration_ms, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('\n=== LAATSTE 10 SYNC LOGS ===\n');
    data.forEach((log) => {
      console.log(`${log.endpoint.padEnd(25)} | ${log.status.padEnd(10)} | ${String(log.records_processed).padStart(4)} items | ${String(log.duration_ms).padStart(6)}ms | ${new Date(log.created_at).toLocaleTimeString('nl-NL')}`);
    });
  }
}

checkSyncLogs();
