/**
 * Rider Sync Scheduler
 * Periodiek riders synchroniseren (configureerbaar interval)
 */
export declare class RiderSyncScheduler {
    private intervalId;
    private isSyncing;
    start(): void;
    stop(): void;
    restart(): void;
    private syncRiders;
    syncNow(): Promise<{
        success: boolean;
        count?: number;
        error?: string;
    }>;
}
export declare const riderSyncScheduler: RiderSyncScheduler;
//# sourceMappingURL=rider-sync.d.ts.map