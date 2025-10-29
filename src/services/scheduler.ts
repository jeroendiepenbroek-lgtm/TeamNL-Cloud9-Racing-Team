/**
 * Scheduler Service - Configureerbare Cron Jobs
 * 
 * Ondersteunt configuratie van verschillende sync componenten via .env
 */

import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { SubteamService } from './subteam.js';
import { EventService } from './event.js';
import { ClubService } from './club.js';

export class SchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private subteamService: SubteamService;
  private eventService: EventService;
  private clubService: ClubService;

  constructor() {
    this.subteamService = new SubteamService();
    this.eventService = new EventService();
    this.clubService = new ClubService();
  }

  /**
   * Start alle geconfigureerde cron jobs
   */
  async start(): Promise<void> {
    logger.info('🕐 Scheduler wordt gestart...');

    // 1. Favorite Riders Sync
    if (this.getEnvBoolean('FAVORITES_SYNC_ENABLED')) {
      const cronExp = process.env.FAVORITES_SYNC_CRON || '0 */6 * * *';
      this.scheduleJob('favorites-sync', cronExp, async () => {
        logger.info('⏰ Start scheduled favorite riders sync');
        try {
          const result = await this.subteamService.syncFavoriteStats();
          logger.info('✅ Favorite riders sync voltooid', {
            synced: result.synced,
            failed: result.failed,
            clubsExtracted: result.clubsExtracted,
          });
        } catch (error) {
          logger.error('❌ Favorite riders sync gefaald', error);
        }
      });

      // Optioneel: sync bij startup
      if (this.getEnvBoolean('FAVORITES_SYNC_ON_STARTUP')) {
        logger.info('🚀 Startup sync: favorite riders');
        await this.subteamService.syncFavoriteStats().catch((error) => {
          logger.error('Startup sync gefaald', error);
        });
      }
    }

    // 2. Club Rosters Sync
    if (this.getEnvBoolean('CLUB_SYNC_ENABLED')) {
      const cronExp = process.env.CLUB_SYNC_CRON || '0 */12 * * *';
      this.scheduleJob('club-sync', cronExp, async () => {
        logger.info('⏰ Start scheduled club rosters sync');
        try {
          const result = await this.clubService.syncAllClubRosters();
          logger.info('✅ Club rosters sync voltooid', {
            synced: result.synced,
            failed: result.failed,
            totalMembers: result.totalMembers,
          });
        } catch (error) {
          logger.error('❌ Club sync gefaald', error);
        }
      });

      // Optioneel: sync bij startup
      if (this.getEnvBoolean('CLUB_SYNC_ON_STARTUP')) {
        logger.info('🚀 Startup sync: club rosters');
        await this.clubService.syncAllClubRosters().catch((error) => {
          logger.error('Startup club sync gefaald', error);
        });
      }
    }

    // 3. Forward Event Scan
    if (this.getEnvBoolean('FORWARD_SCAN_ENABLED')) {
      const cronExp = process.env.FORWARD_SCAN_CRON || '0 4 * * *';
      this.scheduleJob('forward-scan', cronExp, async () => {
        logger.info('⏰ Start scheduled forward event scan');
        try {
          const maxEvents = parseInt(process.env.FORWARD_SCAN_MAX_EVENTS || '1000', 10);
          const retentionDays = parseInt(process.env.FORWARD_SCAN_RETENTION_DAYS || '100', 10);

          const result = await this.eventService.forwardScan({
            maxEvents,
            retentionDays,
          });

          logger.info('✅ Forward scan voltooid', {
            scanned: result.scanned,
            found: result.found,
            saved: result.saved,
            archived: result.archived,
            durationMin: Math.round(result.duration / 1000 / 60),
            lastEventId: result.lastEventId,
          });
        } catch (error) {
          logger.error('❌ Forward scan gefaald', error);
        }
      });

      // Optioneel: scan bij startup (NIET AANBEVOLEN - duurt 17 uur!)
      if (this.getEnvBoolean('FORWARD_SCAN_ON_STARTUP')) {
        logger.warn('⚠️  WAARSCHUWING: Forward scan bij startup kan 17+ uur duren!');
        // Uncomment als je dit echt wilt:
        // await this.eventService.forwardScan({...}).catch(...);
      }
    }

    // 4. Data Cleanup
    if (this.getEnvBoolean('CLEANUP_ENABLED')) {
      const cronExp = process.env.CLEANUP_CRON || '0 3 * * *';
      this.scheduleJob('cleanup', cronExp, async () => {
        logger.info('⏰ Start scheduled data cleanup');
        try {
          const retentionDays = parseInt(process.env.CLEANUP_RETENTION_DAYS || '100', 10);
          const archived = await this.eventService.cleanup100Days(retentionDays);
          logger.info('✅ Cleanup voltooid', { archived });
        } catch (error) {
          logger.error('❌ Cleanup gefaald', error);
        }
      });
    }

    const activeJobs = Array.from(this.jobs.keys());
    logger.info(`✅ Scheduler gestart met ${activeJobs.length} jobs`, { jobs: activeJobs });
  }

  /**
   * Stop alle cron jobs
   */
  stop(): void {
    logger.info('🛑 Scheduler wordt gestopt...');
    for (const [name, job] of this.jobs) {
      job.stop();
      logger.debug(`Stopped job: ${name}`);
    }
    this.jobs.clear();
    logger.info('✅ Scheduler gestopt');
  }

  /**
   * Get status van alle jobs
   */
  getStatus(): Array<{ name: string; schedule: string }> {
    return Array.from(this.jobs.keys()).map((name) => ({
      name,
      schedule: this.getJobSchedule(name),
    }));
  }

  /**
   * Trigger een job handmatig (voor testing)
   */
  async triggerJob(jobName: string): Promise<void> {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job '${jobName}' niet gevonden`);
    }

    logger.info(`🔧 Manual trigger: ${jobName}`);
    // Cron job heeft geen publieke trigger method, dus we roepen de functie direct aan
    // Dit is een workaround - in productie kun je de functie extracten naar een apart object
    throw new Error('Manual trigger not implemented - use API endpoints instead');
  }

  /**
   * Private: Schedule een cron job
   */
  private scheduleJob(name: string, cronExpression: string, callback: () => Promise<void>): void {
    if (!cron.validate(cronExpression)) {
      logger.error(`❌ Ongeldige cron expressie voor ${name}: ${cronExpression}`);
      return;
    }

    const job = cron.schedule(cronExpression, async () => {
      try {
        await callback();
      } catch (error) {
        logger.error(`Job ${name} gefaald`, error);
      }
    });

    this.jobs.set(name, job);
    logger.info(`📅 Scheduled: ${name} (${cronExpression})`);
  }

  /**
   * Private: Get boolean from env (support true/1/yes)
   */
  private getEnvBoolean(key: string): boolean {
    const value = process.env[key]?.toLowerCase();
    return value === 'true' || value === '1' || value === 'yes';
  }

  /**
   * Private: Get cron schedule for job
   */
  private getJobSchedule(jobName: string): string {
    switch (jobName) {
      case 'favorites-sync':
        return process.env.FAVORITES_SYNC_CRON || '0 */6 * * *';
      case 'club-sync':
        return process.env.CLUB_SYNC_CRON || '0 */12 * * *';
      case 'forward-scan':
        return process.env.FORWARD_SCAN_CRON || '0 4 * * *';
      case 'cleanup':
        return process.env.CLEANUP_CRON || '0 3 * * *';
      default:
        return 'unknown';
    }
  }
}

// Singleton instance
let schedulerInstance: SchedulerService | null = null;

export function getScheduler(): SchedulerService {
  if (!schedulerInstance) {
    schedulerInstance = new SchedulerService();
  }
  return schedulerInstance;
}
