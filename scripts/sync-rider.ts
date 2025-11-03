#!/usr/bin/env tsx
/**
 * Script: Sync Single Rider
 * Usage: npx tsx scripts/sync-rider.ts <riderId>
 * 
 * Syncs detailed rider info to Supabase
 */

import { supabaseSyncService } from '../src/services/supabase-sync.service.js';
import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { config } from '../src/utils/config.js';
import { logger } from '../src/utils/logger.js';

const riderId = parseInt(process.argv[2], 10);

if (isNaN(riderId)) {
  console.error('❌ Invalid rider ID');
  process.exit(1);
}

logger.info(`🔄 Syncing rider ${riderId}...`);

const apiClient = new ZwiftApiClient({
  apiKey: config.zwiftApiKey,
  baseUrl: config.zwiftApiBaseUrl,
});

try {
  const riderData = await apiClient.getRider(riderId);
  
  logger.info(`  👤 Rider: ${riderData.name} (${riderData.club?.name || 'No club'})`);

  await supabaseSyncService.syncRider(riderData);

  logger.info(`✅ Rider sync complete`);
  process.exit(0);
} catch (error: any) {
  logger.error('❌ Rider sync failed:', error);
  process.exit(1);
}
