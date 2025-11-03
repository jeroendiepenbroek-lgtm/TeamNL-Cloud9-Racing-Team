#!/usr/bin/env tsx
/**
 * Script: Sync Club Members
 * Usage: npx tsx scripts/sync-club.ts <clubId>
 * 
 * Syncs club info + all members to Supabase
 */

import { supabaseSyncService } from '../src/services/supabase-sync.service.js';
import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { config } from '../src/utils/config.js';
import { logger } from '../src/utils/logger.js';

const clubId = parseInt(process.argv[2] || config.zwiftClubId.toString(), 10);

if (isNaN(clubId)) {
  console.error('❌ Invalid club ID');
  process.exit(1);
}

logger.info(`🔄 Syncing club ${clubId}...`);

const apiClient = new ZwiftApiClient({
  apiKey: config.zwiftApiKey,
  baseUrl: config.zwiftApiBaseUrl,
});

try {
  // Fetch club data
  const clubData = await apiClient.getClubMembers(clubId);
  
  logger.info(`  📋 Club: ${clubData.name} (${clubData.riders.length} members)`);

  // Sync club info
  await supabaseSyncService.syncClub({
    id: clubData.clubId,
    name: clubData.name,
    memberCount: clubData.riders.length,
  });

  // Sync club roster
  await supabaseSyncService.syncClubRoster(
    clubData.clubId,
    clubData.riders.map((r: any) => ({
      zwiftId: r.riderId,
      name: r.name,
      clubId: clubData.clubId,
      category: r.category,
      ftp: r.ftp,
      weight: r.weight,
    }))
  );

  logger.info(`✅ Club sync complete: ${clubData.riders.length} members`);
  process.exit(0);
} catch (error: any) {
  logger.error('❌ Club sync failed:', error);
  process.exit(1);
}
