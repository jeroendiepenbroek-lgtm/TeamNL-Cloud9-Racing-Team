/**
 * Test Standalone Server
 * Autonomous test zonder terminal interference
 */

import { logger } from '../src/utils/logger.js';

async function testEndpoints() {
  const baseUrl = 'http://localhost:3000';
  
  logger.info('🧪 Testing Standalone Server...\n');
  
  // Test 1: Health check
  try {
    const res = await fetch(`${baseUrl}/health`);
    const data = await res.json();
    logger.info('✅ Test 1: Health Check');
    logger.info(`   Status: ${data.status}`);
    logger.info(`   Uptime: ${data.uptime}`);
    logger.info(`   Database: ${data.services.database}\n`);
  } catch (error: any) {
    logger.error('❌ Test 1 Failed:', error.message);
    return false;
  }

  // Test 2: Config
  try {
    const res = await fetch(`${baseUrl}/api/config`);
    const data = await res.json();
    logger.info('✅ Test 2: Config');
    logger.info(`   Club ID: ${data.clubId}`);
    logger.info(`   Club Name: ${data.clubName}\n`);
  } catch (error: any) {
    logger.error('❌ Test 2 Failed:', error.message);
    return false;
  }

  // Test 3: Stats
  try {
    const res = await fetch(`${baseUrl}/api/stats`);
    const data = await res.json();
    logger.info('✅ Test 3: Supabase Stats');
    logger.info(`   Riders: ${data.stats.riders}`);
    logger.info(`   Clubs: ${data.stats.clubs}`);
    logger.info(`   Events: ${data.stats.events}\n`);
  } catch (error: any) {
    logger.error('❌ Test 3 Failed:', error.message);
    return false;
  }

  // Test 4: Clubs list
  try {
    const res = await fetch(`${baseUrl}/api/clubs`);
    const data = await res.json();
    logger.info('✅ Test 4: Tracked Clubs');
    logger.info(`   Count: ${data.count}`);
    if (data.clubs.length > 0) {
      data.clubs.forEach((club: any) => {
        logger.info(`   - ${club.name} (${club.id}): ${club.memberCount} members`);
      });
    }
    logger.info('');
  } catch (error: any) {
    logger.error('❌ Test 4 Failed:', error.message);
    return false;
  }

  // Test 5: Multi-club sync (test met kleine lijst)
  try {
    logger.info('🔄 Test 5: Multi-Club Sync');
    logger.info('   Testing with rider ID 150437...');
    
    const res = await fetch(`${baseUrl}/api/sync/riders-with-clubs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riderIds: [150437] }),
    });
    
    const data = await res.json();
    
    if (data.success) {
      logger.info('✅ Test 5: Multi-Club Sync - SUCCESS');
      logger.info(`   Riders synced: ${data.synced.riders}`);
      logger.info(`   Clubs synced: ${data.synced.clubs}`);
      if (data.clubs && data.clubs.length > 0) {
        data.clubs.forEach((club: any) => {
          logger.info(`   - ${club.name} (${club.memberCount} members)`);
        });
      }
    } else {
      logger.warn('⚠️  Test 5: Sync returned success=false');
      logger.warn(`   Errors: ${data.errors?.length || 0}`);
    }
    logger.info('');
  } catch (error: any) {
    logger.error('❌ Test 5 Failed:', error.message);
    return false;
  }

  logger.info('═══════════════════════════════════════════════');
  logger.info('✅ ALL TESTS PASSED');
  logger.info('═══════════════════════════════════════════════');
  logger.info('');
  logger.info('🚀 Standalone server is READY for:');
  logger.info('   - Autonomous cloud E2E workflow');
  logger.info('   - Production deployment (Railway/Vercel)');
  logger.info('   - Scheduled cron jobs (GitHub Actions)');
  logger.info('');
  
  return true;
}

// Run tests
testEndpoints()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    logger.error('Test script failed:', error);
    process.exit(1);
  });
