/**
 * Sync Configuration Service
 * Beheer configureerbare sync intervals en parameters
 */

interface SyncConfig {
  // Event sync intervals
  nearEventThresholdMinutes: number; // Events binnen deze tijd = "near"
  nearEventSyncIntervalMinutes: number; // Sync interval voor near events
  farEventSyncIntervalMinutes: number; // Sync interval voor far events
  
  // Rider sync intervals
  riderSyncEnabled: boolean;
  riderSyncIntervalMinutes: number;
  
  // General settings
  lookforwardHours: number; // Hoeveel uur vooruit kijken
  checkIntervalMinutes: number; // Hoe vaak de scheduler checkt
}

const DEFAULT_CONFIG: SyncConfig = {
  nearEventThresholdMinutes: 120, // 2 hours (events binnen 2u = near)
  nearEventSyncIntervalMinutes: 15, // Sync every 15 minutes
  farEventSyncIntervalMinutes: 180, // Sync every 180 minutes (3 hours, veelvoud van 15!)
  riderSyncEnabled: true,
  riderSyncIntervalMinutes: 90, // Sync every 90 minutes (POST rate limit safe: 1/15min)
  lookforwardHours: 48, // 48 hours lookahead
  checkIntervalMinutes: 5,
};

class SyncConfigService {
  private config: SyncConfig = { ...DEFAULT_CONFIG };

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<SyncConfig>): SyncConfig {
    this.config = { ...this.config, ...updates };
    console.log('[SyncConfig] Updated configuration:', this.config);
    return this.getConfig();
  }

  resetToDefaults(): SyncConfig {
    this.config = { ...DEFAULT_CONFIG };
    console.log('[SyncConfig] Reset to default configuration');
    return this.getConfig();
  }

  // Helper methods
  getNearEventThresholdSeconds(): number {
    return this.config.nearEventThresholdMinutes * 60;
  }

  getNearEventSyncIntervalMs(): number {
    return this.config.nearEventSyncIntervalMinutes * 60 * 1000;
  }

  getFarEventSyncIntervalMs(): number {
    return this.config.farEventSyncIntervalMinutes * 60 * 1000;
  }

  getRiderSyncIntervalMs(): number {
    return this.config.riderSyncIntervalMinutes * 60 * 1000;
  }

  getCheckIntervalMs(): number {
    return this.config.checkIntervalMinutes * 60 * 1000;
  }

  getLookforwardSeconds(): number {
    return this.config.lookforwardHours * 60 * 60;
  }
}

export const syncConfigService = new SyncConfigService();
export type { SyncConfig };
