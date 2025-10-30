/**
 * MVP Scheduler Service
 * 
 * Automated hourly tasks:
 * 1. Scrape events voor alle riders
 * 2. Sync rider data via API
 * 3. Enrich nieuwe events
 * 
 * Configuratie opslaan in database voor GUI control
 */

import cron from 'node-cron';
import prisma from '../database/client.js';
import { eventScraperService } from './mvp-event-scraper.service.js';
import { eventEnricherService } from './mvp-event-enricher.service.js';
import { ZwiftApiClient } from '../api/zwift-client.js';
import { logger } from '../utils/logger.js';

interface SchedulerConfig {
  enabled: boolean;
  scrapeEventsEnabled: boolean;
  scrapeEventsCron: string; // default: '0 * * * *' (every hour)
  syncRidersEnabled: boolean;
  syncRidersCron: string; // default: '0 * * * *' (every hour)
  enrichEventsEnabled: boolean;
  enrichEventsCron: string; // default: '30 * * * *' (every hour at :30)
  maxEventsPerRun: number; // default: 50
}

export class MVPSchedulerService {
  private config: SchedulerConfig;
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private apiClient: ZwiftApiClient;

  constructor() {
    this.config = this.getDefaultConfig();
    this.apiClient = new ZwiftApiClient({
      baseUrl: 'https://zwift-ranking.herokuapp.com',
      apiKey: process.env.ZWIFT_API_KEY || '',
    });
  }

  /**
   * Start scheduler met huidige configuratie
   */
  async start(): Promise<void> {
    logger.info('🕐 Starting MVP Scheduler');

    // Load config from database (or use defaults)
    await this.loadConfig();

    if (!this.config.enabled) {
      logger.info('  ℹ️  Scheduler is disabled in config');
      return;
    }

    // Schedule jobs
    if (this.config.scrapeEventsEnabled) {
      this.scheduleEventScraping();
    }

    if (this.config.syncRidersEnabled) {
      this.scheduleRiderSync();
    }

    if (this.config.enrichEventsEnabled) {
      this.scheduleEventEnrichment();
    }

    logger.info('✅ Scheduler started');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    logger.info('🛑 Stopping scheduler');
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`  ✓ Stopped job: ${name}`);
    });
    this.jobs.clear();
  }

  /**
   * Update scheduler configuratie
   */
  async updateConfig(updates: Partial<SchedulerConfig>): Promise<SchedulerConfig> {
    logger.info('⚙️  Updating scheduler config');

    this.config = { ...this.config, ...updates };

    // Save to database
    await this.saveConfig();

    // Restart jobs with new config
    this.stop();
    await this.start();

    return this.config;
  }

  /**
   * Get huidige configuratie
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    enabled: boolean;
    jobs: Array<{
      name: string;
      enabled: boolean;
      cron: string;
      nextRun: string | null;
    }>;
  } {
    const jobs = [];

    if (this.config.scrapeEventsEnabled) {
      jobs.push({
        name: 'scrape-events',
        enabled: true,
        cron: this.config.scrapeEventsCron,
        nextRun: this.getNextRunTime(this.config.scrapeEventsCron),
      });
    }

    if (this.config.syncRidersEnabled) {
      jobs.push({
        name: 'sync-riders',
        enabled: true,
        cron: this.config.syncRidersCron,
        nextRun: this.getNextRunTime(this.config.syncRidersCron),
      });
    }

    if (this.config.enrichEventsEnabled) {
      jobs.push({
        name: 'enrich-events',
        enabled: true,
        cron: this.config.enrichEventsCron,
        nextRun: this.getNextRunTime(this.config.enrichEventsCron),
      });
    }

    return {
      enabled: this.config.enabled,
      jobs,
    };
  }

  // ============================================================================
  // SCHEDULED JOBS
  // ============================================================================

  private scheduleEventScraping(): void {
    const job = cron.schedule(this.config.scrapeEventsCron, async () => {
      logger.info('🕐 [CRON] Event scraping started');

      try {
        // Get all riders from database
        const riders = await prisma.rider.findMany({
          select: { zwiftId: true },
        });

        logger.info(`  📋 Scraping events for ${riders.length} riders`);

        let totalNewEvents = 0;

        for (const rider of riders) {
          try {
            const result = await eventScraperService.scrapeRiderEvents(rider.zwiftId, 90);
            totalNewEvents += result.newEvents;
          } catch (error: any) {
            logger.error(`  ❌ Error scraping rider ${rider.zwiftId}:`, error.message);
          }

          // Small delay between riders
          await this.delay(2000);
        }

        logger.info(`✅ [CRON] Event scraping complete: ${totalNewEvents} new events found`);
      } catch (error: any) {
        logger.error('❌ [CRON] Event scraping failed:', error);
      }
    });

    this.jobs.set('scrape-events', job);
    logger.info(`  ✓ Scheduled: Event scraping (${this.config.scrapeEventsCron})`);
  }

  private scheduleRiderSync(): void {
    const job = cron.schedule(this.config.syncRidersCron, async () => {
      logger.info('🕐 [CRON] Rider sync started');

      try {
        // Get all riders from database
        const riders = await prisma.rider.findMany({
          select: { zwiftId: true, clubId: true },
        });

        logger.info(`  📋 Syncing ${riders.length} riders`);

        let synced = 0;
        let failed = 0;

        for (const rider of riders) {
          try {
            // Fetch rider data from API
            const riderData = await this.apiClient.getRider(rider.zwiftId);

            // Update in database
            await prisma.rider.update({
              where: { zwiftId: rider.zwiftId },
              data: {
                name: riderData.name,
                ftp: riderData.ftp,
                weight: riderData.weight,
                ranking: riderData.ranking,
                rankingScore: riderData.rankingScore,
                categoryRacing: riderData.categoryRacing,
              },
            });

            synced++;
          } catch (error: any) {
            logger.error(`  ❌ Error syncing rider ${rider.zwiftId}:`, error.message);
            failed++;
          }

          // Rate limit delay
          await this.delay(12000); // 5 riders per minute
        }

        logger.info(`✅ [CRON] Rider sync complete: ${synced} synced, ${failed} failed`);
      } catch (error: any) {
        logger.error('❌ [CRON] Rider sync failed:', error);
      }
    });

    this.jobs.set('sync-riders', job);
    logger.info(`  ✓ Scheduled: Rider sync (${this.config.syncRidersCron})`);
  }

  private scheduleEventEnrichment(): void {
    const job = cron.schedule(this.config.enrichEventsCron, async () => {
      logger.info('🕐 [CRON] Event enrichment started');

      try {
        // Get unenriched events
        const eventIds = await eventEnricherService.getUnenrichedEvents(
          this.config.maxEventsPerRun
        );

        if (eventIds.length === 0) {
          logger.info('  ℹ️  No events need enrichment');
          return;
        }

        logger.info(`  📋 Enriching ${eventIds.length} events`);

        const result = await eventEnricherService.enrichEvents(eventIds);

        logger.info(`✅ [CRON] Event enrichment complete: ${result.enriched} enriched, ${result.skipped} skipped, ${result.failed} failed`);
      } catch (error: any) {
        logger.error('❌ [CRON] Event enrichment failed:', error);
      }
    });

    this.jobs.set('enrich-events', job);
    logger.info(`  ✓ Scheduled: Event enrichment (${this.config.enrichEventsCron})`);
  }

  // ============================================================================
  // CONFIG MANAGEMENT
  // ============================================================================

  private getDefaultConfig(): SchedulerConfig {
    return {
      enabled: process.env.SCHEDULER_ENABLED === 'true',
      scrapeEventsEnabled: true,
      scrapeEventsCron: '0 * * * *', // Every hour at :00
      syncRidersEnabled: true,
      syncRidersCron: '15 * * * *', // Every hour at :15
      enrichEventsEnabled: true,
      enrichEventsCron: '30 * * * *', // Every hour at :30
      maxEventsPerRun: 50,
    };
  }

  private async loadConfig(): Promise<void> {
    try {
      // Check if SchedulerConfig table exists in schema
      // For MVP, we'll just use defaults and env vars
      // TODO: Create SchedulerConfig model in Prisma schema
      logger.info('  ℹ️  Using default config (no DB persistence yet)');
    } catch (error) {
      logger.warn('  ⚠️  Could not load config from database, using defaults');
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      // TODO: Save to database when SchedulerConfig model is added
      logger.info('  ℹ️  Config updated (no DB persistence yet)');
    } catch (error) {
      logger.error('  ❌ Could not save config to database:', error);
    }
  }

  private getNextRunTime(cronExpression: string): string | null {
    try {
      // Parse cron expression to get next run time
      // For simplicity, just return the cron expression
      return cronExpression;
    } catch {
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton
export const schedulerService = new MVPSchedulerService();
