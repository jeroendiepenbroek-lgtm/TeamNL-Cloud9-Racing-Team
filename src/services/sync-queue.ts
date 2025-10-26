import { EventEmitter } from 'events';
import SyncService from './sync.js';
import { logger } from '../utils/logger.js';

/**
 * Queue Item Interface
 */
export interface QueueItem {
  id: string;
  riderId: number;
  priority: 1 | 2 | 3 | 4;
  addedAt: Date;
  addedBy: string;
  retries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Queue Status Interface
 */
export interface QueueStatus {
  queueDepth: number;
  processing: QueueItem | null;
  pending: QueueItem[];
  failed: QueueItem[];
  completed: number;
  totalProcessed: number;
}

/**
 * SyncQueue - Producer-Consumer Pattern
 * 
 * Features:
 * - Priority-based processing (P1 first)
 * - Non-blocking enqueue (instant API response)
 * - Background worker with rate limiting
 * - Automatic retry (3 attempts)
 * - Progress events for real-time UI updates
 * - In-memory implementation (no Redis needed)
 */
export class SyncQueue extends EventEmitter {
  private queue: QueueItem[] = [];
  private processing: boolean = false;
  private currentItem: QueueItem | null = null;
  private completedCount: number = 0;
  private totalProcessed: number = 0;
  private syncService: SyncService;
  private maxRetries: number = 3;
  private rateLimit: number = 12000; // 12 seconds (5 calls/min)

  constructor(syncService?: SyncService) {
    super();
    this.syncService = syncService || new SyncService();
  }

  /**
   * Producer: Add item to queue (instant return)
   */
  enqueue(riderId: number, priority: 1 | 2 | 3 | 4, addedBy: string = 'api'): string {
    // Check if rider already in queue
    const existing = this.queue.find(item => item.riderId === riderId);
    if (existing) {
      logger.debug(`Rider ${riderId} al in queue (status: ${existing.status})`);
      return existing.id;
    }

    // Create queue item
    const item: QueueItem = {
      id: this.generateId(),
      riderId,
      priority,
      addedAt: new Date(),
      addedBy,
      retries: 0,
      status: 'pending',
    };

    this.queue.push(item);
    this.sortByPriority();

    logger.info(`➕ Rider ${riderId} toegevoegd aan queue (P${priority}, ID: ${item.id})`);
    
    // Emit event voor GUI updates
    this.emit('enqueued', item);

    // Start worker if not already running
    if (!this.processing) {
      this.startWorker();
    }

    return item.id;
  }

  /**
   * Producer: Bulk enqueue
   */
  enqueueBulk(riders: Array<{ riderId: number; priority: 1 | 2 | 3 | 4 }>, addedBy: string = 'bulk'): string[] {
    const jobIds: string[] = [];

    for (const rider of riders) {
      const jobId = this.enqueue(rider.riderId, rider.priority, addedBy);
      jobIds.push(jobId);
    }

    logger.info(`➕ ${riders.length} riders toegevoegd aan queue (bulk)`);
    return jobIds;
  }

  /**
   * Consumer: Background worker loop
   */
  private async startWorker() {
    if (this.processing) {
      logger.debug('Worker al actief');
      return;
    }

    this.processing = true;
    logger.info('🚀 Queue worker gestart');

    while (this.queue.length > 0) {
      await this.processNext();
    }

    this.processing = false;
    logger.info('✅ Queue worker gestopt (queue leeg)');
    this.emit('worker-stopped');
  }

  /**
   * Process next item in queue
   */
  private async processNext() {
    if (this.queue.length === 0) {
      return;
    }

    // Pop highest priority item
    const item = this.queue.shift()!;
    this.currentItem = item;

    item.status = 'processing';
    item.startedAt = new Date();
    
    logger.info(`⚙️  Processing rider ${item.riderId} (P${item.priority}, attempt ${item.retries + 1})`);
    this.emit('processing', item);

    try {
      // Sync rider via SyncService
      await this.syncService.syncIndividualRiders([item.riderId]);

      // Success!
      item.status = 'completed';
      item.completedAt = new Date();
      this.completedCount++;
      this.totalProcessed++;

      const duration = item.completedAt.getTime() - item.startedAt!.getTime();
      logger.info(`✅ Rider ${item.riderId} gesynchroniseerd (${duration}ms)`);
      
      this.emit('completed', item);

    } catch (error) {
      // Error handling
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      item.error = errorMessage;
      item.retries++;
      this.totalProcessed++;

      logger.warn(`⚠️  Fout bij rider ${item.riderId} (poging ${item.retries}/${this.maxRetries}): ${errorMessage}`);

      if (item.retries < this.maxRetries) {
        // Re-queue for retry
        item.status = 'pending';
        item.startedAt = undefined;
        this.queue.push(item);
        this.sortByPriority();
        
        logger.info(`🔄 Rider ${item.riderId} opnieuw in queue geplaatst`);
        this.emit('retry', item);
      } else {
        // Max retries reached - mark as failed
        item.status = 'failed';
        item.completedAt = new Date();
        
        logger.error(`❌ Rider ${item.riderId} gefaald na ${this.maxRetries} pogingen`);
        this.emit('failed', item);
      }
    }

    this.currentItem = null;

    // Rate limiting: wait before next item
    if (this.queue.length > 0) {
      logger.debug(`⏱️  Rate limit: wacht ${this.rateLimit / 1000}s voor volgende item`);
      await this.delay(this.rateLimit);
    }
  }

  /**
   * Get current queue status
   */
  getStatus(): QueueStatus {
    return {
      queueDepth: this.queue.length,
      processing: this.currentItem,
      pending: this.queue.filter(i => i.status === 'pending'),
      failed: this.queue.filter(i => i.status === 'failed'),
      completed: this.completedCount,
      totalProcessed: this.totalProcessed,
    };
  }

  /**
   * Get item by ID
   */
  getItem(jobId: string): QueueItem | undefined {
    // Check current item
    if (this.currentItem?.id === jobId) {
      return this.currentItem;
    }

    // Check queue
    return this.queue.find(item => item.id === jobId);
  }

  /**
   * Cancel item (if pending)
   */
  cancel(jobId: string): boolean {
    const index = this.queue.findIndex(item => item.id === jobId && item.status === 'pending');
    
    if (index === -1) {
      return false;
    }

    const item = this.queue.splice(index, 1)[0];
    logger.info(`🚫 Job ${jobId} geannuleerd (rider ${item.riderId})`);
    this.emit('cancelled', item);
    
    return true;
  }

  /**
   * Retry failed item
   */
  retry(jobId: string): boolean {
    const item = this.queue.find(i => i.id === jobId && i.status === 'failed');
    
    if (!item) {
      return false;
    }

    // Reset for retry
    item.status = 'pending';
    item.retries = 0;
    item.error = undefined;
    item.startedAt = undefined;
    item.completedAt = undefined;
    
    this.sortByPriority();
    
    logger.info(`🔄 Job ${jobId} reset voor retry (rider ${item.riderId})`);
    this.emit('retry', item);

    // Restart worker if stopped
    if (!this.processing) {
      this.startWorker();
    }

    return true;
  }

  /**
   * Retry all failed items
   */
  retryAll(): number {
    const failed = this.queue.filter(i => i.status === 'failed');
    
    failed.forEach(item => {
      item.status = 'pending';
      item.retries = 0;
      item.error = undefined;
      item.startedAt = undefined;
      item.completedAt = undefined;
    });

    if (failed.length > 0) {
      this.sortByPriority();
      logger.info(`🔄 ${failed.length} gefaalde jobs reset voor retry`);

      if (!this.processing) {
        this.startWorker();
      }
    }

    return failed.length;
  }

  /**
   * Clear completed items from queue
   */
  clearCompleted(): number {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(i => i.status !== 'completed');
    const removed = initialLength - this.queue.length;
    
    if (removed > 0) {
      logger.info(`🧹 ${removed} voltooide items verwijderd uit queue`);
    }

    return removed;
  }

  /**
   * Pause processing (stops after current item)
   */
  pause() {
    this.processing = false;
    logger.info('⏸️  Queue gepauzeerd (stopt na huidige item)');
    this.emit('paused');
  }

  /**
   * Resume processing
   */
  resume() {
    if (this.queue.length > 0 && !this.processing) {
      logger.info('▶️  Queue hervat');
      this.startWorker();
      this.emit('resumed');
    }
  }

  /**
   * Sort queue by priority (P1 first)
   */
  private sortByPriority() {
    this.queue.sort((a, b) => {
      // First by priority (ascending: 1 = highest)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Then by added time (oldest first)
      return a.addedAt.getTime() - b.addedAt.getTime();
    });
  }

  /**
   * Generate unique job ID
   */
  private generateId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let queueInstance: SyncQueue | null = null;

export function getSyncQueue(): SyncQueue {
  if (!queueInstance) {
    queueInstance = new SyncQueue();
  }
  return queueInstance;
}

export default SyncQueue;
