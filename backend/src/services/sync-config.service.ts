/**
 * Sync Config Service - Minimal stub for Railway deployment
 * TODO: Restore full functionality
 */

export interface SyncConfig {
  lookForwardHours: number;
  nearEventThresholdHours: number;
  ridersPerBatch: number;
  [key: string]: any;
}

class SyncConfigService {
  private config: SyncConfig = {
    lookForwardHours: 36,
    nearEventThresholdHours: 24,
    ridersPerBatch: 50,
  };

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<SyncConfig>): SyncConfig {
    this.config = { ...this.config, ...updates };
    return this.getConfig();
  }

  resetToDefaults(): SyncConfig {
    this.config = {
      lookForwardHours: 36,
      nearEventThresholdHours: 24,
      ridersPerBatch: 50,
    };
    return this.getConfig();
  }

  getLookForwardHours(): number {
    return this.config.lookForwardHours;
  }
}

export const syncConfigService = new SyncConfigService();
