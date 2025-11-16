#!/usr/bin/env tsx
/**
 * Check recent sync logs from database
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../backend/.env') });

import { SupabaseService } from '../backend/src/services/supabase.service.js';

async function checkSyncLogs() {
  const supabase = new SupabaseService();
  const logs = await supabase.getRecentSyncLogs(20);

  console.log('\n📋 Laatste 20 sync logs:\n');
  logs.forEach(log => {
    const time = new Date(log.started_at).toLocaleTimeString('nl-NL');
    console.log(`[${log.status}] ${log.endpoint} - ${time}`);
    if (log.error_message) console.log(`   ❌ ${log.error_message.substring(0, 100)}`);
  });
  
  // Check laatste club members sync
  const clubSyncs = logs.filter(l => l.endpoint.includes('clubs') || l.endpoint === 'RIDER_SYNC');
  if (clubSyncs.length > 0) {
    const latest = clubSyncs[0];
    const timeDiff = Date.now() - new Date(latest.started_at).getTime();
    const minutesAgo = Math.floor(timeDiff / 60000);
    console.log(`\n⏰ Laatste club/rider sync: ${minutesAgo} minuten geleden`);
    console.log(`   Status: ${latest.status}`);
    console.log(`   Rate limit reset: over ${Math.max(0, 60 - minutesAgo)} minuten`);
  }
}

checkSyncLogs();
