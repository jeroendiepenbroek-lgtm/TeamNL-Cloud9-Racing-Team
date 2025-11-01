/**
 * Test script: Analyseer GET /public/riders/:id/results endpoint
 * 
 * Doel: Verificeer of dit endpoint een directe RiderID → EventID relatie geeft
 */

import { ZwiftApiClient } from './src/api/zwift-client.js';
import { config } from './src/utils/config.js';
import { logger } from './src/utils/logger.js';

async function analyzeRiderEventsEndpoint() {
  logger.info('🔍 Analyseer GET /public/riders/:id/results endpoint\n');

  const apiClient = new ZwiftApiClient({
    apiKey: config.zwiftApiKey,
    baseUrl: config.zwiftApiBaseUrl,
  }, false); // Disable rate limit tracking voor test

  try {
    // Test met rider 150437
    const riderId = 150437;
    logger.info(`📊 Fetch results voor rider ${riderId}...`);

    // Direct axios call om raw response te zien
    const response = await (apiClient as any).client.get(`/public/riders/${riderId}/results`);
    
    logger.info(`\n✅ Success! Raw response ontvangen\n`);
    logger.info(`📦 RESPONSE STRUCTURE:\n`);
    logger.info(JSON.stringify(response.data, null, 2));
    
    // Check structure
    logger.info(`\n\n🔍 STRUCTURE ANALYSE:\n`);
    logger.info(`Type: ${typeof response.data}`);
    logger.info(`Is Array: ${Array.isArray(response.data)}`);
    logger.info(`Keys: ${Object.keys(response.data).join(', ')}`);
    
    if (response.data.race) {
      logger.info(`\n� RACE OBJECT FOUND:\n`);
      logger.info(`Race keys: ${Object.keys(response.data.race).join(', ')}`);
      
      if (response.data.race.finishes) {
        logger.info(`\nFinishes count: ${response.data.race.finishes.length}`);
        logger.info(`\nFIRST FINISH:\n`);
        logger.info(JSON.stringify(response.data.race.finishes[0], null, 2));
      }
    }

  } catch (error: any) {
    logger.error('❌ Error:', error.message);
    if (error.response) {
      logger.error('Response status:', error.response.status);
      logger.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run analyse
analyzeRiderEventsEndpoint().catch(console.error);
