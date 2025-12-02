#!/usr/bin/env node

/**
 * POC Sync Test Script
 * Test unified sync voor rider 150437
 */

import 'dotenv/config';
import { POCUnifiedSyncService } from './src/services/poc-unified-sync.service.js';
import { logger } from './src/utils/logger.js';

async function main() {
  logger.info('🧪 POC Unified Sync Test');
  logger.info('========================\n');
  logger.info('Target: Rider 150437');
  logger.info('Sources: ZwiftRacing + Zwift.com + ZwiftPower\n');
  
  const syncService = new POCUnifiedSyncService();
  
  try {
    await syncService.executeFullPOC();
    
    logger.info('\n✅ POC Sync test successful!');
    logger.info('\nNext steps:');
    logger.info('1. Check riders_unified table for rider 150437');
    logger.info('2. Check rider_rating_history for vELO trend');
    logger.info('3. Check rider_activities for recent rides');
    logger.info('4. Implement Phase 2 (events) and Phase 3 (results)');
    
    process.exit(0);
  } catch (error: any) {
    logger.error('\n❌ POC Sync test failed:', error.message);
    process.exit(1);
  }
}

main();
