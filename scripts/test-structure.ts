#!/usr/bin/env node
/**
 * Dry-run Test - Validates code structure without requiring Supabase
 * Tests imports, function signatures, and basic TypeScript compilation
 */

import { logger } from '../src/utils/logger.js';

logger.info('🧪 Dry-run Test Suite - Code Structure Validation\n');

async function validateImports() {
  logger.info('Test 1: Validate Module Imports...');
  
  try {
    // Test Supabase client
    const { default: getSupabaseClient } = await import('../src/services/supabase-client.js');
    logger.info('✅ supabase-client.js imports successfully');
    
    // Test Supabase sync service
    const { supabaseSyncService } = await import('../src/services/supabase-sync.service.js');
    logger.info('✅ supabase-sync.service.js imports successfully');
    logger.info(`   Available methods: ${Object.keys(supabaseSyncService).join(', ')}`);
    
    // Test unified sync service
    const { unifiedSyncService } = await import('../src/services/unified-sync.service.js');
    logger.info('✅ unified-sync.service.js imports successfully');
    logger.info(`   Available methods: ${Object.keys(unifiedSyncService).join(', ')}`);
    
    // Test mapper
    const mapper = await import('../src/services/firebase-firestore.mapper.js');
    logger.info('✅ firebase-firestore.mapper.js imports successfully');
    logger.info(`   Available mappers: ${Object.keys(mapper.default).join(', ')}`);
    
    return true;
  } catch (error) {
    logger.error('❌ Import validation failed:', error);
    return false;
  }
}

async function validateFunctionSignatures() {
  logger.info('\nTest 2: Validate Function Signatures...');
  
  try {
    const { supabaseSyncService } = await import('../src/services/supabase-sync.service.js');
    
    // Check required methods exist
    const requiredMethods = [
      'syncRider',
      'syncRiderHistory',
      'syncClub',
      'syncClubRoster',
      'syncEvent',
      'syncRaceResults',
      'getSupabaseStats',
      'logSync',
      'getSyncLogs',
      'cleanupSupabase',
      'getClient'
    ];
    
    for (const method of requiredMethods) {
      if (typeof supabaseSyncService[method] === 'function') {
        logger.info(`✅ supabaseSyncService.${method}() exists`);
      } else {
        throw new Error(`Missing method: ${method}`);
      }
    }
    
    return true;
  } catch (error) {
    logger.error('❌ Function signature validation failed:', error);
    return false;
  }
}

async function validateEnvironmentSetup() {
  logger.info('\nTest 3: Environment Configuration Check...');
  
  try {
    const { config } = await import('../src/utils/config.js');
    
    logger.info(`   ZWIFT_API_KEY: ${config.zwiftApiKey ? '✅ Set' : '❌ Missing'}`);
    logger.info(`   ZWIFT_API_BASE_URL: ${config.zwiftApiBaseUrl || '❌ Missing'}`);
    logger.info(`   SUPABASE_URL: ${process.env.SUPABASE_URL || '❌ Not set (expected for dry-run)'}`);
    logger.info(`   SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Not set (expected for dry-run)'}`);
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      logger.warn('\n⚠️  Supabase credentials not configured - this is OK for dry-run');
      logger.warn('   To run live tests, configure .env with:');
      logger.warn('   - SUPABASE_URL=https://xxx.supabase.co');
      logger.warn('   - SUPABASE_SERVICE_KEY=eyJhbG...');
    }
    
    return true;
  } catch (error) {
    logger.error('❌ Environment check failed:', error);
    return false;
  }
}

async function validateMapperFunctions() {
  logger.info('\nTest 4: Validate Mapper Functions...');
  
  try {
    const mapper = await import('../src/services/firebase-firestore.mapper.js');
    
    // Test mapper with mock data
    const mockRider = {
      riderId: 150437,
      name: 'Test Rider',
      ftp: 300,
      weight: 75,
      ranking: 1500,
    };
    
    const mapped = mapper.default.mapRider(mockRider);
    logger.info('✅ mapRider() works with mock data');
    logger.info(`   Mapped fields: ${Object.keys(mapped || {}).join(', ')}`);
    
    const mockClub = {
      id: 11818,
      name: 'Test Club',
      memberCount: 50,
    };
    
    const mappedClub = mapper.default.mapClub(mockClub);
    logger.info('✅ mapClub() works with mock data');
    logger.info(`   Mapped fields: ${Object.keys(mappedClub || {}).join(', ')}`);
    
    return true;
  } catch (error) {
    logger.error('❌ Mapper validation failed:', error);
    return false;
  }
}

async function validateAPIClient() {
  logger.info('\nTest 5: Validate Zwift API Client...');
  
  try {
    const { ZwiftApiClient } = await import('../src/api/zwift-client.js');
    const { config } = await import('../src/utils/config.js');
    
    const client = new ZwiftApiClient({
      apiKey: config.zwiftApiKey,
      baseUrl: config.zwiftApiBaseUrl,
    });
    
    logger.info('✅ ZwiftApiClient instantiated successfully');
    logger.info(`   Base URL: ${config.zwiftApiBaseUrl}`);
    logger.info(`   API Key: ${config.zwiftApiKey ? '***' + config.zwiftApiKey.slice(-4) : 'Not set'}`);
    
    return true;
  } catch (error) {
    logger.error('❌ API client validation failed:', error);
    return false;
  }
}

// Run all tests
(async () => {
  const results = {
    imports: false,
    signatures: false,
    environment: false,
    mappers: false,
    apiClient: false,
  };
  
  results.imports = await validateImports();
  results.signatures = await validateFunctionSignatures();
  results.environment = await validateEnvironmentSetup();
  results.mappers = await validateMapperFunctions();
  results.apiClient = await validateAPIClient();
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  logger.info('\n' + '='.repeat(60));
  logger.info(`Test Results: ${passed}/${total} passed\n`);
  
  if (passed === total) {
    logger.info('🎉 All dry-run tests passed!');
    logger.info('\n📝 Code structure is valid and ready for deployment.');
    logger.info('\n🚀 Next steps:');
    logger.info('   1. Configure Supabase credentials in .env');
    logger.info('   2. Run: npx tsx scripts/test-deployment.ts (live test)');
    logger.info('   3. Start backend: npm run dev:watch');
    logger.info('   4. Start frontend: cd frontend && npm run dev');
    process.exit(0);
  } else {
    logger.error('❌ Some tests failed. Fix issues before deployment.');
    process.exit(1);
  }
})();
