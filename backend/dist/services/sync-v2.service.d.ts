/**
 * Sync Service V2 - Modern, Type-Safe, Observable
 *
 * Features:
 * - Separate Rider & Event sync flows
 * - Detailed metrics per sync type
 * - Real-time progress tracking
 * - Error handling without crashes
 * - Configurable intervals
 */
export interface RiderSyncMetrics {
    type: 'RIDER_SYNC';
    timestamp: string;
    interval_minutes: number;
    riders_processed: number;
    riders_updated: number;
    riders_new: number;
    duration_ms: number;
    status: 'success' | 'partial' | 'error';
    error_count: number;
}
export interface EventSyncMetrics {
    type: 'NEAR_EVENT_SYNC' | 'FAR_EVENT_SYNC';
    timestamp: string;
    interval_minutes: number;
    threshold_minutes: number;
    events_scanned: number;
    events_near: number;
    events_far: number;
    signups_synced: number;
    duration_ms: number;
    status: 'success' | 'partial' | 'error';
    error_count: number;
}
export declare class SyncServiceV2 {
    /**
     * RIDER SYNC
     * Syncs all club members with full rider data
     * Tracks: interval, rider count, new vs updated
     */
    syncRiders(config: {
        intervalMinutes: number;
        clubId?: number;
    }): Promise<RiderSyncMetrics>;
    /**
     * EVENT SYNC - NEAR EVENTS
     * Syncs events that are close to starting (more frequent updates)
     */
    syncNearEvents(config: {
        intervalMinutes: number;
        thresholdMinutes: number;
        lookforwardHours: number;
    }): Promise<EventSyncMetrics>;
    /**
     * EVENT SYNC - FAR EVENTS
     * Syncs events that are far in the future (less frequent updates)
     */
    syncFarEvents(config: {
        intervalMinutes: number;
        thresholdMinutes: number;
        lookforwardHours: number;
    }): Promise<EventSyncMetrics>;
    /**
     * Helper: Sync signups for specific event
     */
    private syncEventSignups;
    /**
     * Get latest sync metrics for dashboard
     */
    getLatestMetrics(): Promise<{
        rider_sync: RiderSyncMetrics | null;
        near_event_sync: EventSyncMetrics | null;
        far_event_sync: EventSyncMetrics | null;
    }>;
    private parseMetricsFromLog;
}
export declare const syncServiceV2: SyncServiceV2;
//# sourceMappingURL=sync-v2.service.d.ts.map