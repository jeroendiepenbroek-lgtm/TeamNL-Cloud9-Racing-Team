#!/usr/bin/env tsx
/**
 * Script: Get Database Statistics
 * Usage: npx tsx scripts/get-stats.ts
 * 
 * Shows current database statistics
 */

import getSupabaseClient from '../src/services/supabase-client.js';
import { logger } from '../src/utils/logger.js';

logger.info('📊 Fetching database statistics...');

try {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  // Get counts from all tables
  const [ridersResult, clubsResult, eventsResult, resultsResult] = await Promise.all([
    supabase.from('riders').select('*', { count: 'exact', head: true }),
    supabase.from('clubs').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('race_results').select('*', { count: 'exact', head: true }),
  ]);

  const stats = {
    riders: ridersResult.count || 0,
    clubs: clubsResult.count || 0,
    events: eventsResult.count || 0,
    raceResults: resultsResult.count || 0,
  };

  logger.info('═══════════════════════════════════════');
  logger.info(`📊 DATABASE STATISTICS`);
  logger.info('═══════════════════════════════════════');
  logger.info(`  Riders: ${stats.riders}`);
  logger.info(`  Clubs: ${stats.clubs}`);
  logger.info(`  Events: ${stats.events}`);
  logger.info(`  Race Results: ${stats.raceResults}`);
  logger.info('═══════════════════════════════════════');

  // JSON output for parsing
  console.log(JSON.stringify(stats, null, 2));

  process.exit(0);
} catch (error: any) {
  logger.error('❌ Failed to fetch stats:', error);
  process.exit(1);
}
