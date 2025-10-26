import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { RiderRepository } from '../database/repositories.js';
import { SyncQueue } from './sync-queue.js';

/**
 * SmartScheduler - Automatische sync op basis van priority levels
 * 
 * Features:
 * - Priority-based intervals (P1=15min, P2=30min, P3=60min, P4=120min)
 * - Configureerbaar via environment variables
 * - Integration met SyncQueue (non-blocking)
 * - Conflict detection (skip als rider al in queue)
 * - Start/stop control
 */
export class SmartScheduler {
  private riderRepo: RiderRepository;
  private syncQueue: SyncQueue;
  private jobs: Map<number, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;
  
  // Default intervals (in minutes)
  private intervals: Record<number, number> = {
    1: 15,   // P1: elke 15 min
    2: 30,   // P2: elke 30 min
    3: 60,   // P3: elk uur
    4: 120   // P4: elke 2 uur
  };
  
  constructor(riderRepo: RiderRepository, syncQueue: SyncQueue) {
    this.riderRepo = riderRepo;
    this.syncQueue = syncQueue;
    
    // Load intervals from environment
    this.loadIntervalsFromEnv();
  }
  
  /**
   * Load interval configuratie uit environment variables
   */
  private loadIntervalsFromEnv(): void {
    const p1 = parseInt(process.env.SCHEDULER_P1_INTERVAL || '15');
    const p2 = parseInt(process.env.SCHEDULER_P2_INTERVAL || '30');
    const p3 = parseInt(process.env.SCHEDULER_P3_INTERVAL || '60');
    const p4 = parseInt(process.env.SCHEDULER_P4_INTERVAL || '120');
    
    // Validate ranges (5-180 minutes)
    this.intervals[1] = this.validateInterval(p1, 15);
    this.intervals[2] = this.validateInterval(p2, 30);
    this.intervals[3] = this.validateInterval(p3, 60);
    this.intervals[4] = this.validateInterval(p4, 120);
    
    logger.info('Scheduler intervals geladen', {
      P1: `${this.intervals[1]} min`,
      P2: `${this.intervals[2]} min`,
      P3: `${this.intervals[3]} min`,
      P4: `${this.intervals[4]} min`
    });
  }
  
  /**
   * Validate interval range (5-180 minutes)
   */
  private validateInterval(value: number, defaultValue: number): number {
    if (isNaN(value) || value < 5 || value > 180) {
      logger.warn(`Ongeldige interval waarde: ${value}, gebruik default: ${defaultValue}`);
      return defaultValue;
    }
    return value;
  }
  
  /**
   * Convert minutes to cron expression
   */
  private minutesToCron(minutes: number): string {
    if (minutes < 60) {
      // Elke X minuten: */X * * * *
      return `*/${minutes} * * * *`;
    } else if (minutes === 60) {
      // Elk uur: 0 * * * *
      return '0 * * * *';
    } else {
      // Elke X uren: 0 */X * * *
      const hours = Math.floor(minutes / 60);
      return `0 */${hours} * * *`;
    }
  }
  
  /**
   * Start scheduler voor specifieke priority
   */
  private startPriorityScheduler(priority: number): void {
    const interval = this.intervals[priority];
    const cronExpr = this.minutesToCron(interval);
    
    logger.info(`Start scheduler voor priority ${priority}`, {
      interval: `${interval} min`,
      cron: cronExpr
    });
    
    const job = cron.schedule(cronExpr, async () => {
      await this.syncPriority(priority);
    }, {
      scheduled: true,
      timezone: 'Europe/Amsterdam'
    });
    
    this.jobs.set(priority, job);
  }
  
    /**
   * Sync alle riders voor specifieke priority
   */
  private async syncPriority(priority: number): Promise<void> {
    try {
      logger.debug(`Scheduled sync voor priority ${priority} gestart`);
      
      // Haal alle favorites op en filter op priority
      const allFavorites = await this.riderRepo.getFavoriteRiders();
      const riders = allFavorites.filter(r => r.syncPriority === priority);
      
      if (riders.length === 0) {
        logger.debug(`Geen favorites met priority ${priority}`);
        return;
      }
      
      // Check queue status
      const queueStatus = this.syncQueue.getStatus();
      const jobs = (queueStatus as any).jobs || [];
      const inQueueIds = new Set(
        jobs
          .filter((j: any) => j.status === 'pending' || j.status === 'processing')
          .map((j: any) => j.riderId)
      );
      
      // Filter riders die al in queue zitten
      const toSync = riders.filter(r => !inQueueIds.has(r.zwiftId));
      
      if (toSync.length === 0) {
        logger.debug(`Alle priority ${priority} riders zitten al in queue`);
        return;
      }
      
      // Enqueue riders
      let queued = 0;
      for (const rider of toSync) {
        try {
          await this.syncQueue.enqueue(rider.zwiftId, priority as 1 | 2 | 3 | 4, 'scheduler');
          queued++;
        } catch (error) {
          logger.error(`Fout bij enqueue rider ${rider.zwiftId}`, error);
        }
      }
      
      logger.info(`Scheduled sync voor priority ${priority} voltooid`, {
        totalRiders: riders.length,
        alreadyInQueue: riders.length - toSync.length,
        queued
      });
      
    } catch (error) {
      logger.error(`Fout bij scheduled sync priority ${priority}`, error);
    }
  }
  
  /**
   * Start scheduler (alle priorities)
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn('Scheduler draait al');
      return;
    }
    
    logger.info('🕐 SmartScheduler wordt gestart...');
    
    // Start scheduler voor elke priority
    for (let priority = 1; priority <= 4; priority++) {
      this.startPriorityScheduler(priority);
    }
    
    this.isRunning = true;
    logger.info('✅ SmartScheduler gestart', {
      priorities: [1, 2, 3, 4],
      intervals: this.intervals
    });
  }
  
  /**
   * Stop scheduler (alle priorities)
   */
  public stop(): void {
    if (!this.isRunning) {
      logger.warn('Scheduler draait niet');
      return;
    }
    
    logger.info('⏹️ SmartScheduler wordt gestopt...');
    
    // Stop alle jobs
    for (const [priority, job] of this.jobs.entries()) {
      job.stop();
      logger.debug(`Scheduler voor priority ${priority} gestopt`);
    }
    
    this.jobs.clear();
    this.isRunning = false;
    logger.info('✅ SmartScheduler gestopt');
  }
  
  /**
   * Restart scheduler (reload intervals)
   */
  public restart(): void {
    logger.info('🔄 SmartScheduler wordt herstart...');
    this.stop();
    this.loadIntervalsFromEnv();
    this.start();
    logger.info('✅ SmartScheduler herstart');
  }
  
  /**
   * Get scheduler status
   */
  public getStatus() {
    return {
      isRunning: this.isRunning,
      intervals: this.intervals,
      activePriorities: Array.from(this.jobs.keys()),
      nextRuns: this.getNextRuns()
    };
  }
  
  /**
   * Calculate next run times voor elke priority
   */
  private getNextRuns(): Record<number, string> {
    const nextRuns: Record<number, string> = {};
    
    for (let priority = 1; priority <= 4; priority++) {
      const interval = this.intervals[priority];
      const now = new Date();
      const nextRun = new Date(now.getTime() + interval * 60 * 1000);
      nextRuns[priority] = nextRun.toISOString();
    }
    
    return nextRuns;
  }
  
  /**
   * Check of scheduler enabled is via environment
   */
  public static isEnabled(): boolean {
    return process.env.SCHEDULER_ENABLED === 'true';
  }
}
