/**
 * US8: Sync Configuration - Configureerbare sync intervals
 *
 * Environment variables:
 * - SYNC_ENABLED=true|false (default: true in production, false in dev)
 * - SYNC_INTERVAL_HOURS=6 (default: 6 hours)
 * - SYNC_START_DELAY_MINUTES=5 (default: 5 minutes after startup)
 */
export interface SyncConfig {
    enabled: boolean;
    intervalHours: number;
    startDelayMinutes: number;
    cronExpression: string;
}
export declare function getSyncConfig(): SyncConfig;
export declare const syncConfig: SyncConfig;
//# sourceMappingURL=sync.config.d.ts.map