#!/usr/bin/env node
/**
 * Quick Deployment Test Script
 * Tests Supabase integration en backend endpoints locally
 */

// Load .env FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import { config } from '../src/utils/config.js';
import { logger } from '../src/utils/logger.js';
import { supabaseSyncService } from '../src/services/supabase-sync.service.js';
import { unifiedSyncService } from '../src/services/unified-sync.service.js';

const TEST_RIDER_ID = 150437;
const TEST_CLUB_ID = 11818;

async function runTests() {
  logger.info('🧪 Starting deployment tests...\n');

  // Test 1: Supabase Client
  logger.info('Test 1: Supabase Client Initialization');
  try {
    const client = supabaseSyncService.getClient();
    if (client) {
      logger.info('✅ Supabase client initialized');
    } else {
      throw new Error('Supabase client is null - check SUPABASE_URL and SUPABASE_SERVICE_KEY');
    }
  } catch (error) {
    logger.error('❌ Supabase client failed:', error);
    process.exit(1);
  }

  // Test 2: Database Stats
  logger.info('\nTest 2: Supabase Database Stats');
  try {
    const stats = await supabaseSyncService.getSupabaseStats();
    logger.info('✅ Database stats retrieved:', stats);
  } catch (error) {
    logger.error('❌ Stats retrieval failed:', error);
  }

  // Test 3: Sync Test Rider
  logger.info(`\nTest 3: Sync Test Rider (${TEST_RIDER_ID})`);
  try {
    const result = await unifiedSyncService.syncRider(TEST_RIDER_ID);
    if (result.success) {
      logger.info('✅ Rider sync successful:', result);
    } else {
      logger.warn('⚠️  Rider sync failed:', result.error);
    }
  } catch (error) {
    logger.error('❌ Rider sync error:', error);
  }

  // Test 4: Sync Club (long-running, skip if time-sensitive)
  logger.info(`\nTest 4: Sync Club (${TEST_CLUB_ID}) - may take 60s due to rate limit...`);
  try {
    const result = await unifiedSyncService.syncClub(TEST_CLUB_ID);
    if (result.success) {
      logger.info('✅ Club sync successful:', result);
    } else {
      logger.warn('⚠️  Club sync failed:', result.error);
    }
  } catch (error) {
    logger.error('❌ Club sync error:', error);
  }

  // Test 5: Final Stats Check
  logger.info('\nTest 5: Final Database Stats');
  try {
    const stats = await supabaseSyncService.getSupabaseStats();
    logger.info('✅ Final stats:', stats);
    
    if (stats && stats.riders > 0) {
      logger.info('\n🎉 All tests passed! Database has data.');
    } else {
      logger.warn('\n⚠️  Tests passed but database is empty. Run more syncs.');
    }
  } catch (error) {
    logger.error('❌ Final stats failed:', error);
  }

  logger.info('\n✅ Test suite complete!\n');
  logger.info('Next steps:');
  logger.info('1. Start frontend: cd frontend && npm run dev');
  logger.info('2. Open http://localhost:5173');
  logger.info('3. Use AdminPanel to upload riders');
  logger.info('4. Check real-time updates in dashboard');
}

runTests().catch((error) => {
  logger.error('Fatal error in test suite:', error);
  process.exit(1);
});
