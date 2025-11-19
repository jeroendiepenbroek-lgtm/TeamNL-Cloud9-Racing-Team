#!/usr/bin/env tsx
/**
 * Direct sync test - bypass server, run sync functie direct
 */

import { syncServiceV2 } from './backend/src/services/sync-v2.service.js';
import { syncConfigService } from './backend/src/services/sync-config.service.js';

async function runTest() {
  console.log('🧪 Testing sync service directly...\n');

  const config = syncConfigService.getConfig();

  try {
    console.log('Config:', {
      lookforwardHours: config.lookforwardHours,
      thresholdMinutes: config.nearEventThresholdMinutes,
    });
    
    console.log('\n🔄 Starting sync...\n');
    
    const result = await syncServiceV2.syncEventsCombined({
      intervalMinutes: config.nearEventSyncIntervalMinutes,
      thresholdMinutes: config.nearEventThresholdMinutes,
      lookforwardHours: config.lookforwardHours,
      mode: 'full_scan',
    });
    
    console.log('\n✅ Sync completed!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.status === 'error') {
      console.error('\n❌ Sync had errors!');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n💥 SYNC CRASHED:');
    console.error(error);
    process.exit(1);
  }
}

runTest();
