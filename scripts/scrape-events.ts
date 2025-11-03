#!/usr/bin/env tsx
/**
 * Script: Scrape Events from All Riders
 * Usage: npx tsx scripts/scrape-events.ts
 * 
 * Scrapes events from all riders in database
 * Saves events + race results to Supabase
 */

import { eventScraperService } from '../src/services/mvp-event-scraper.service.js';
import { config } from '../src/utils/config.js';
import { logger } from '../src/utils/logger.js';
import prisma from '../src/database/client.js';
import getSupabaseClient from '../src/services/supabase-client.js';

const SCRAPING_DAYS = config.eventScrapingDays;

logger.info(`🕷️  Starting event scraping (last ${SCRAPING_DAYS} days)...`);

try {
  // Check if event scraping is enabled
  if (!config.eventScrapingEnabled) {
    logger.warn('⚠️  Event scraping is disabled (EVENT_SCRAPING_ENABLED=false)');
    process.exit(0);
  }

  // Get all riders from Supabase
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const { data: riders, error } = await supabase
    .from('riders')
    .select('zwift_id, name')
    .limit(100); // Limit to prevent rate limiting

  if (error) {
    throw new Error(`Failed to fetch riders: ${error.message}`);
  }

  if (!riders || riders.length === 0) {
    logger.warn('⚠️  No riders found in database');
    process.exit(0);
  }

  logger.info(`  📋 Found ${riders.length} riders to scrape`);

  let totalNewEvents = 0;
  let totalNewResults = 0;
  let successful = 0;
  let failed = 0;

  // Scrape events for each rider
  for (const rider of riders) {
    try {
      logger.info(`  🔄 Scraping rider ${rider.name} (${rider.zwift_id})...`);
      
      const result = await eventScraperService.scrapeRiderEvents(
        rider.zwift_id,
        SCRAPING_DAYS
      );

      totalNewEvents += result.newEvents;
      totalNewResults += result.newResults;
      successful++;

      logger.info(`    ✅ ${result.newEvents} new events, ${result.newResults} new results`);

      // Rate limiting: 2 second delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      failed++;
      logger.error(`    ❌ Failed: ${error.message}`);
    }
  }

  logger.info('═══════════════════════════════════════');
  logger.info(`✅ Event scraping complete`);
  logger.info(`  Riders processed: ${successful}/${riders.length}`);
  logger.info(`  New events: ${totalNewEvents}`);
  logger.info(`  New results: ${totalNewResults}`);
  logger.info(`  Failed: ${failed}`);
  logger.info('═══════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
} catch (error: any) {
  logger.error('❌ Event scraping failed:', error);
  process.exit(1);
}
