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
  nearEventThresholdMinutes: 60, // 1 hour
  nearEventSyncIntervalMinutes: 10, // Sync every 10 minutes
  farEventSyncIntervalMinutes: 60, // Sync every 60 minutes
  riderSyncEnabled: true,
  riderSyncIntervalMinutes: 360, // Sync every 6 hours
  lookforwardHours: 36,
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
