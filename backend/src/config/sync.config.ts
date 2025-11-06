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

export function getSyncConfig(): SyncConfig {
  // Default: enabled in production, disabled in development
  const enabled = process.env.SYNC_ENABLED === 'true' || 
                  (process.env.SYNC_ENABLED !== 'false' && process.env.NODE_ENV === 'production');
  
  const intervalHours = parseInt(process.env.SYNC_INTERVAL_HOURS || '6', 10);
  const startDelayMinutes = parseInt(process.env.SYNC_START_DELAY_MINUTES || '5', 10);
  
  // Genereer cron expression: elke N uur
  // Format: "0 0 */N * * *" = elke N uur op het hele uur
  const cronExpression = `0 0 */${intervalHours} * * *`;
  
  return {
    enabled,
    intervalHours,
    startDelayMinutes,
    cronExpression,
  };
}

export const syncConfig = getSyncConfig();
