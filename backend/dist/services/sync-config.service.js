/**
 * Sync Configuration Service
 * Beheer configureerbare sync intervals en parameters
 */
const DEFAULT_CONFIG = {
    nearEventThresholdMinutes: 120, // 2 hours (events binnen 2u = near)
    nearEventSyncIntervalMinutes: 15, // Sync every 15 minutes
    farEventSyncIntervalMinutes: 180, // Sync every 180 minutes (3 hours, veelvoud van 15!)
    riderSyncEnabled: true,
    riderSyncIntervalMinutes: 90, // Sync every 90 minutes (POST rate limit safe: 1/15min)
    lookforwardHours: 48, // 48 hours lookahead
    checkIntervalMinutes: 5,
};
class SyncConfigService {
    config = { ...DEFAULT_CONFIG };
    getConfig() {
        return { ...this.config };
    }
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        console.log('[SyncConfig] Updated configuration:', this.config);
        return this.getConfig();
    }
    resetToDefaults() {
        this.config = { ...DEFAULT_CONFIG };
        console.log('[SyncConfig] Reset to default configuration');
        return this.getConfig();
    }
    // Helper methods
    getNearEventThresholdSeconds() {
        return this.config.nearEventThresholdMinutes * 60;
    }
    getNearEventSyncIntervalMs() {
        return this.config.nearEventSyncIntervalMinutes * 60 * 1000;
    }
    getFarEventSyncIntervalMs() {
        return this.config.farEventSyncIntervalMinutes * 60 * 1000;
    }
    getRiderSyncIntervalMs() {
        return this.config.riderSyncIntervalMinutes * 60 * 1000;
    }
    getCheckIntervalMs() {
        return this.config.checkIntervalMinutes * 60 * 1000;
    }
    getLookforwardSeconds() {
        return this.config.lookforwardHours * 60 * 60;
    }
}
export const syncConfigService = new SyncConfigService();
//# sourceMappingURL=sync-config.service.js.map