/**
 * Sync Configuration Service
 * Beheer configureerbare sync intervals en parameters
 */
const DEFAULT_CONFIG = {
    nearEventThresholdMinutes: 60, // 1 hour
    nearEventSyncIntervalMinutes: 10, // Sync every 10 minutes
    farEventSyncIntervalMinutes: 60, // Sync every 60 minutes
    riderSyncEnabled: true,
    riderSyncIntervalMinutes: 360, // Sync every 6 hours
    lookforwardHours: 36,
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