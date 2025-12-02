/**
 * Unified Scheduler Service - Minimal stub for Railway deployment
 * TODO: Restore full scheduling functionality
 */

export interface SchedulerStatus {
  isRunning: boolean;
  lastRiderSync: string | null;
  lastEventSync: string | null;
  lastResultsSync: string | null;
  lastCleanup: string | null;
}

class UnifiedScheduler {
  private isRunning = false;

  start(): void {
    console.log('⚠️  UnifiedScheduler: Stub service - no actual scheduling');
    this.isRunning = true;
  }

  stop(): void {
    console.log('UnifiedScheduler: Stopping (stub)');
    this.isRunning = false;
  }

  getStatus(): SchedulerStatus {
    return {
      isRunning: this.isRunning,
      lastRiderSync: null,
      lastEventSync: null,
      lastResultsSync: null,
      lastCleanup: null,
    };
  }

  triggerRiderSync(): Promise<void> {
    console.log('UnifiedScheduler: Rider sync triggered (stub - no action)');
    return Promise.resolve();
  }

  triggerEventSync(): Promise<void> {
    console.log('UnifiedScheduler: Event sync triggered (stub - no action)');
    return Promise.resolve();
  }

  triggerResultsSync(): Promise<void> {
    console.log('UnifiedScheduler: Results sync triggered (stub - no action)');
    return Promise.resolve();
  }

  triggerCleanup(): Promise<void> {
    console.log('UnifiedScheduler: Cleanup triggered (stub - no action)');
    return Promise.resolve();
  }
}

export const unifiedScheduler = new UnifiedScheduler();
