/**
 * Sync Coordinator Service - Minimal stub for Railway deployment
 * TODO: Restore full functionality
 */

export interface SyncCoordinatorStatus {
  activeSyncs: number;
  queuedSyncs: number;
}

class SyncCoordinator {
  canSync(type: string): boolean {
    // Always allow syncs (no rate limiting in stub)
    return true;
  }

  recordSync(type: string): void {
    console.log(`SyncCoordinator (stub): Recorded ${type} sync`);
  }

  getStatus(): SyncCoordinatorStatus {
    return {
      activeSyncs: 0,
      queuedSyncs: 0,
    };
  }
}

export const syncCoordinator = new SyncCoordinator();
