#!/usr/bin/env node
/**
 * Sync Runner - Wrapper voor unified-sync.service.ts
 */

// Load environment variables FIRST
import { config } from 'dotenv';
config();

// WORKAROUND: Override SERVICE_KEY with ANON_KEY since service key is expired
if (process.env.SUPABASE_ANON_KEY) {
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_ANON_KEY;
  console.log('🔧 Using SUPABASE_ANON_KEY (service key is expired)\n');
}

// Log env check
console.log('🔧 Environment check:');
console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅' : '❌'}`);
console.log(`   Key being used: ANON (RLS enabled)`);
console.log(`   ZWIFT_API_KEY: ${process.env.ZWIFT_API_KEY ? '✅' : '❌'}\n`);

import { syncService, syncRider, syncAllTeam } from './backend/services/unified-sync.service.ts';

const riderId = process.argv[2] ? parseInt(process.argv[2]) : null;

if (!riderId) {
  console.error('Usage: npx tsx sync-runner.ts <riderId>');
  console.error('   OR: npx tsx sync-runner.ts --all');
  process.exit(1);
}

(async () => {
  try {
    if (process.argv[2] === '--all') {
      console.log('🔄 Syncing all team members...\n');
      const results = await syncAllTeam({ includeEnrichment: true });
      
      const successful = results.filter(r => r.success).length;
      console.log(`\n📊 SUMMARY:`);
      console.log(`   ✅ Successful: ${successful}`);
      console.log(`   ❌ Failed: ${results.length - successful}`);
      
    } else {
      console.log(`🔄 Syncing rider ${riderId}...\n`);
      const result = await syncRider(riderId, { includeEnrichment: true });
      
      console.log(`\n📊 RESULT:`);
      console.log(`   Success: ${result.success ? '✅' : '❌'}`);
      console.log(`   Name: ${result.name || 'N/A'}`);
      console.log(`   Fields synced: ${result.synced_fields.total}`);
      console.log(`     - ZwiftRacing: ${result.synced_fields.zwift_racing}`);
      console.log(`     - Zwift Official: ${result.synced_fields.zwift_official}`);
      if (result.errors.length > 0) {
        console.log(`   Errors:`);
        result.errors.forEach(err => console.log(`     - ${err}`));
      }
    }

  } catch (error) {
    console.error('❌ FATAL ERROR:', error.message);
    process.exit(1);
  }
})();
