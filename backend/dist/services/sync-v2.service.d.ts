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
    type: 'NEAR_EVENT_SYNC' | 'FAR_EVENT_SYNC' | 'COMBINED_EVENT_SYNC';
    timestamp: string;
    interval_minutes: number;
    threshold_minutes: number;
    mode: 'near_only' | 'full_scan';
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
     * RIDER SYNC (Coordinated)
     * Uses sync coordinator to prevent conflicts
     */
    syncRidersCoordinated(config: {
        intervalMinutes: number;
        clubId?: number;
    }): Promise<RiderSyncMetrics>;
    /**
     * RIDER SYNC (Direct - internal use)
     * Syncs all club members with full rider data
     * Tracks: interval, rider count, new vs updated
     */
    syncRiders(config: {
        intervalMinutes: number;
        clubId?: number;
    }): Promise<RiderSyncMetrics>;
    /**
     * NEAR EVENT SYNC (Coordinated)
     * Uses sync coordinator to prevent conflicts
     */
    syncNearEventsCoordinated(config: {
        intervalMinutes: number;
        thresholdMinutes: number;
        lookforwardHours: number;
    }): Promise<EventSyncMetrics>;
    /**
     * EVENT SYNC - NEAR EVENTS (Direct - internal use)
     * Syncs events that are close to starting (more frequent updates)
     */
    syncNearEvents(config: {
        intervalMinutes: number;
        thresholdMinutes: number;
        lookforwardHours: number;
    }): Promise<EventSyncMetrics>;
    /**
     * FAR EVENT SYNC (Coordinated)
     * Uses sync coordinator to prevent conflicts
     */
    syncFarEventsCoordinated(config: {
        intervalMinutes: number;
        thresholdMinutes: number;
        lookforwardHours: number;
        force?: boolean;
    }): Promise<EventSyncMetrics>;
    /**
     * EVENT SYNC - FAR EVENTS (Direct - internal use)
     * Syncs events that are far in the future (less frequent updates)
     * @param config.force - If true, sync ALL events (not just new ones)
     */
    syncFarEvents(config: {
        intervalMinutes: number;
        thresholdMinutes: number;
        lookforwardHours: number;
        force?: boolean;
    }): Promise<EventSyncMetrics>;
    /**
     * COMBINED EVENT SYNC (Coordinated)
     * Intelligente sync die near/far combineert:
     * - Frequent runs (15min): Alleen NEAR events + signups
     * - Periodic runs (2u): ALLE events + signups
     *
     * Voorkomt:
     * - FAR_EVENT_SYNC die nooit triggert (near sync doet alles al)
     * - Overlap tussen near/far logic
     * - Onnodig scannen van far events bij elke run
     */
    syncEventsCoordinated(config: {
        intervalMinutes: number;
        thresholdMinutes: number;
        lookforwardHours: number;
        mode: 'near_only' | 'full_scan';
    }): Promise<EventSyncMetrics>;
    /**
     * COMBINED EVENT SYNC (Direct - internal)
     * Implementatie van slimme event sync
     */
    syncEventsCombined(config: {
        intervalMinutes: number;
        thresholdMinutes: number;
        lookforwardHours: number;
        mode: 'near_only' | 'full_scan';
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