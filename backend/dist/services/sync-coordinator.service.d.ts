/**
 * Sync Coordinator Service
 *
 * Coordineert de 3 sync types zonder rate limit conflicts:
 * - RIDER_SYNC (club members + bulk riders)
 * - NEAR_EVENT_SYNC (events < 24u + signups)
 * - FAR_EVENT_SYNC (events > 24u + signups)
 *
 * Strategy: Time slot allocation + priority queue
 */
type SyncType = 'RIDER_SYNC' | 'NEAR_EVENT_SYNC' | 'FAR_EVENT_SYNC' | 'COMBINED_EVENT_SYNC';
declare class SyncCoordinator {
    private queue;
    private currentSync;
    private isProcessing;
    private readonly timeSlots;
    /**
     * Check of een sync type nu mag draaien (binnen zijn time slot)
     */
    canRunNow(type: SyncType): boolean;
    /**
     * Bereken wanneer volgende time slot is
     */
    getNextSlot(type: SyncType): Date;
    /**
     * Queue een sync request met priority
     */
    queueSync(type: SyncType, callback: () => Promise<any>): Promise<any>;
    /**
     * Direct sync zonder queue (force mode)
     */
    forceSync(type: SyncType, callback: () => Promise<any>): Promise<any>;
    /**
     * Check rate limiter status voor endpoints die sync gebruikt
     */
    canSyncRun(type: SyncType): {
        canRun: boolean;
        blockedBy: string | null;
    };
    private _getPriority;
    private _sortQueue;
    private _processQueue;
    private _waitForRequest;
    private _sleep;
    /**
     * Get coordinator status
     */
    getStatus(): {
        isProcessing: boolean;
        currentSync: SyncType | null;
        queueLength: number;
        queue: {
            type: SyncType;
            priority: number;
            age: number;
        }[];
        timeSlots: {
            type: string;
            canRunNow: boolean;
            nextSlot: Date;
            interval: string;
            offset: string;
        }[];
    };
}
export declare const syncCoordinator: SyncCoordinator;
export {};
//# sourceMappingURL=sync-coordinator.service.d.ts.map