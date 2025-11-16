/**
 * Sync Configuration Service
 * Beheer configureerbare sync intervals en parameters
 */
interface SyncConfig {
    nearEventThresholdMinutes: number;
    nearEventSyncIntervalMinutes: number;
    farEventSyncIntervalMinutes: number;
    riderSyncEnabled: boolean;
    riderSyncIntervalMinutes: number;
    lookforwardHours: number;
    checkIntervalMinutes: number;
}
declare class SyncConfigService {
    private config;
    getConfig(): SyncConfig;
    updateConfig(updates: Partial<SyncConfig>): SyncConfig;
    resetToDefaults(): SyncConfig;
    getNearEventThresholdSeconds(): number;
    getNearEventSyncIntervalMs(): number;
    getFarEventSyncIntervalMs(): number;
    getRiderSyncIntervalMs(): number;
    getCheckIntervalMs(): number;
    getLookforwardSeconds(): number;
}
export declare const syncConfigService: SyncConfigService;
export type { SyncConfig };
//# sourceMappingURL=sync-config.service.d.ts.map