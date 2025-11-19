#!/usr/bin/env node
/**
 * Force Full Event Sync - One-time manual trigger
 * Synchroniseert ALLE events + signups (near + far)
 */

import { SyncServiceV2 } from './dist/services/sync-v2.service.js';
import { syncConfigService } from './dist/services/sync-config.service.js';

console.log('🚀 Starting MANUAL FULL Event Sync...\n');

const syncService = new SyncServiceV2();
const config = syncConfigService.getConfig();

try {
  const metrics = await syncService.syncEventsCoordinated({
    intervalMinutes: 180,
    thresholdMinutes: config.nearEventThresholdMinutes,
    lookforwardHours: config.lookforwardHours,
    mode: 'full_scan', // FULL SCAN - alle events + signups!
  });

  console.log('\n✅ FULL Sync Completed!');
  console.log('═══════════════════════════════════════');
  console.log(`📊 Mode: ${metrics.mode}`);
  console.log(`📅 Events scanned: ${metrics.events_scanned}`);
  console.log(`🔥 Near events: ${metrics.events_near}`);
  console.log(`🌐 Far events: ${metrics.events_far}`);
  console.log(`👥 Signups synced: ${metrics.signups_synced}`);
  console.log(`⏱️  Duration: ${(metrics.duration_ms / 1000).toFixed(1)}s`);
  console.log(`✅ Status: ${metrics.status}`);
  
  if (metrics.error_count > 0) {
    console.log(`⚠️  Errors: ${metrics.error_count}`);
  }

  console.log('\n🔍 Check for Rider 397234 in Event 5208495:');
  console.log('   Database query needed to verify signup was saved');
  
  process.exit(0);
} catch (error) {
  console.error('\n❌ Sync Failed:', error);
  process.exit(1);
}
