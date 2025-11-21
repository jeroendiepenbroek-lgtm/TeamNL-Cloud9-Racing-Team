/**
 * Auto-Sync Configuration Validator
 * Prevents invalid sync configurations that cause conflicts
 */

export interface SyncConfig {
  // Rider Sync
  riderSyncEnabled: boolean;
  riderSyncIntervalMinutes: number; // Min: 60 (API rate limit)
  
  // Event Sync
  eventSyncEnabled: boolean;
  nearEventSyncIntervalMinutes: number; // Recommended: 15
  fullEventSyncIntervalHours: number; // Recommended: 3
  nearEventThresholdMinutes: number; // Default: 120 (2 hours)
  lookforwardHours: number; // Default: 48
  
  // Cron Expressions (generated from intervals)
  riderSyncCron?: string;
  nearEventSyncCron?: string;
  fullEventSyncCron?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  generatedCrons?: {
    rider: string;
    nearEvent: string;
    fullEvent: string;
  };
}

export class SyncConfigValidator {
  
  /**
   * Validate sync configuration
   * Returns errors, warnings, and suggestions
   */
  static validate(config: SyncConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // ============================================================================
    // RULE 1: Rider Sync Interval (API Rate Limit)
    // ============================================================================
    if (config.riderSyncEnabled) {
      // API limit: POST /public/riders = 1 call per 15 minutes
      if (config.riderSyncIntervalMinutes < 15) {
        errors.push('❌ Rider sync interval must be >= 15 min (API rate limit: 1/15min)');
      }
      
      // Recommended minimum for team data
      if (config.riderSyncIntervalMinutes < 60) {
        warnings.push('⚠️ Rider sync < 60 min may hit rate limits with large teams');
        suggestions.push('💡 Recommended: 60 minutes for stable sync');
      }

      // Maximum practical interval
      if (config.riderSyncIntervalMinutes > 240) {
        warnings.push('⚠️ Rider sync > 4 hours may show stale data');
      }
    }

    // ============================================================================
    // RULE 2: Event Sync Intervals
    // ============================================================================
    if (config.eventSyncEnabled) {
      // Near event sync minimum (signup API rate limit)
      if (config.nearEventSyncIntervalMinutes < 5) {
        errors.push('❌ Near event sync must be >= 5 min (API rate limit: 1/1min per event)');
      }

      // Near event sync maximum
      if (config.nearEventSyncIntervalMinutes > 30) {
        warnings.push('⚠️ Near event sync > 30 min may miss last-minute signups');
      }

      // Full event sync minimum
      if (config.fullEventSyncIntervalHours < 1) {
        errors.push('❌ Full event sync must be >= 1 hour (rate limit protection)');
      }

      // Full event sync maximum
      if (config.fullEventSyncIntervalHours > 12) {
        warnings.push('⚠️ Full event sync > 12 hours may show stale event list');
      }
    }

    // ============================================================================
    // RULE 3: Cron Overlap Prevention (CRITICAL!)
    // ============================================================================
    if (config.eventSyncEnabled) {
      const { nearCronMinutes, fullCronMinutes } = this.calculateCronMinutes(config);
      
      // Check for exact overlap
      const overlap = nearCronMinutes.some(nearMin => {
        return fullCronMinutes.some(fullMin => nearMin === fullMin);
      });

      if (overlap) {
        errors.push('❌ NEAR and FULL event sync crons overlap! This causes duplicate API calls.');
        suggestions.push('💡 Solution: Offset FULL sync by 5 minutes (e.g., :55 instead of :50)');
      }

      // Check for close proximity (< 3 min apart = warning)
      const tooClose = nearCronMinutes.some(nearMin => {
        return fullCronMinutes.some(fullMin => Math.abs(nearMin - fullMin) < 3);
      });

      if (tooClose && !overlap) {
        warnings.push('⚠️ NEAR and FULL syncs run within 3 minutes - may cause queue congestion');
        suggestions.push('💡 Recommended: Keep syncs at least 5 minutes apart');
      }
    }

    // ============================================================================
    // RULE 4: Threshold Logic
    // ============================================================================
    if (config.eventSyncEnabled) {
      // Near threshold should be reasonable
      if (config.nearEventThresholdMinutes < 30) {
        warnings.push('⚠️ Near event threshold < 30 min may miss events');
        suggestions.push('💡 Recommended: 120 minutes (2 hours) for safety margin');
      }

      if (config.nearEventThresholdMinutes > 360) {
        warnings.push('⚠️ Near event threshold > 6 hours may cause too many signup syncs');
      }

      // Lookforward should cover near threshold
      const lookforwardMinutes = config.lookforwardHours * 60;
      if (lookforwardMinutes < config.nearEventThresholdMinutes) {
        errors.push('❌ Lookforward window must be >= near event threshold');
        suggestions.push(`💡 Set lookforwardHours to at least ${Math.ceil(config.nearEventThresholdMinutes / 60)} hours`);
      }
    }

    // ============================================================================
    // RULE 5: Rate Limit Budget
    // ============================================================================
    if (config.eventSyncEnabled) {
      const nearCallsPerHour = 60 / config.nearEventSyncIntervalMinutes;
      const fullCallsPerDay = 24 / config.fullEventSyncIntervalHours;

      // Estimate total calls per day (assuming 20 near events avg)
      const estimatedNearCalls = nearCallsPerHour * 24 * 20; // 20 events × 24h × calls/hour
      const estimatedFullCalls = fullCallsPerDay * 100; // 100 events × calls/day

      if (estimatedNearCalls > 2000) {
        warnings.push(`⚠️ Estimated ${estimatedNearCalls} near event API calls/day - high rate limit risk`);
        suggestions.push('💡 Increase nearEventSyncIntervalMinutes or reduce nearEventThresholdMinutes');
      }
    }

    // ============================================================================
    // Generate Valid Cron Expressions
    // ============================================================================
    const generatedCrons = this.generateCronExpressions(config);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      generatedCrons,
    };
  }

  /**
   * Calculate exact minutes when crons will trigger
   * Used for overlap detection
   */
  private static calculateCronMinutes(config: SyncConfig): {
    nearCronMinutes: number[];
    fullCronMinutes: number[];
  } {
    const nearCronMinutes: number[] = [];
    const fullCronMinutes: number[] = [];

    // NEAR: Runs every X minutes (e.g., 15 min = :00, :15, :30, :45)
    const nearInterval = config.nearEventSyncIntervalMinutes;
    for (let min = 0; min < 60; min += nearInterval) {
      nearCronMinutes.push(min);
    }

    // FULL: Runs every X hours at a specific minute
    // Default: every 3 hours at :55 (00:55, 03:55, 06:55, etc.)
    const fullIntervalHours = config.fullEventSyncIntervalHours;
    const fullMinute = this.calculateSafeFullSyncMinute(nearCronMinutes);
    
    // Generate minutes for each full sync trigger in 24h period
    for (let hour = 0; hour < 24; hour += fullIntervalHours) {
      fullCronMinutes.push(fullMinute); // Same minute each cycle
    }

    return { nearCronMinutes, fullCronMinutes };
  }

  /**
   * Calculate a safe minute for FULL sync that avoids NEAR sync
   */
  private static calculateSafeFullSyncMinute(nearMinutes: number[]): number {
    // Try :55, :56, :57, :58, :59, :00, :01, etc.
    const candidates = [55, 56, 57, 58, 59, 0, 1, 2, 3, 4, 5];
    
    for (const candidate of candidates) {
      if (!nearMinutes.includes(candidate)) {
        return candidate;
      }
    }

    // Fallback: find first gap in near schedule
    for (let min = 0; min < 60; min++) {
      if (!nearMinutes.includes(min)) {
        return min;
      }
    }

    return 55; // Last resort
  }

  /**
   * Generate valid cron expressions from config
   */
  static generateCronExpressions(config: SyncConfig): {
    rider: string;
    nearEvent: string;
    fullEvent: string;
  } {
    // Rider: Every X minutes starting at :00
    const riderCron = config.riderSyncIntervalMinutes === 60
      ? '0 * * * *' // Hourly at :00
      : `*/${config.riderSyncIntervalMinutes} * * * *`; // Every X min

    // Near Event: Every X minutes
    const nearInterval = config.nearEventSyncIntervalMinutes;
    let nearCron: string;
    
    if (nearInterval === 15) {
      nearCron = '5,20,35,50 * * * *'; // Recommended: offset by 5 min from :00
    } else if (nearInterval === 30) {
      nearCron = '5,35 * * * *';
    } else if (nearInterval === 10) {
      nearCron = '5,15,25,35,45,55 * * * *';
    } else {
      nearCron = `*/${nearInterval} * * * *`;
    }

    // Full Event: Every X hours at safe minute
    const { nearCronMinutes } = this.calculateCronMinutes(config);
    const safeMinute = this.calculateSafeFullSyncMinute(nearCronMinutes);
    const fullCron = `${safeMinute} */${config.fullEventSyncIntervalHours} * * *`;

    return {
      rider: riderCron,
      nearEvent: nearCron,
      fullEvent: fullCron,
    };
  }

  /**
   * Get recommended safe configuration
   */
  static getRecommendedConfig(): SyncConfig {
    return {
      riderSyncEnabled: true,
      riderSyncIntervalMinutes: 60, // Safe rate limit
      
      eventSyncEnabled: true,
      nearEventSyncIntervalMinutes: 15, // 4x per hour
      fullEventSyncIntervalHours: 3, // 8x per day
      nearEventThresholdMinutes: 120, // 2 hours
      lookforwardHours: 48,
      
      riderSyncCron: '0 * * * *',
      nearEventSyncCron: '5,20,35,50 * * * *',
      fullEventSyncCron: '55 */3 * * *', // Offset by 5 min!
    };
  }

  /**
   * Parse config from environment or defaults
   */
  static fromEnv(env: Record<string, string | undefined>): SyncConfig {
    return {
      riderSyncEnabled: env.RIDER_SYNC_ENABLED !== 'false',
      riderSyncIntervalMinutes: parseInt(env.RIDER_SYNC_INTERVAL_MINUTES || '60'),
      
      eventSyncEnabled: env.EVENT_SYNC_ENABLED !== 'false',
      nearEventSyncIntervalMinutes: parseInt(env.NEAR_EVENT_SYNC_INTERVAL_MINUTES || '15'),
      fullEventSyncIntervalHours: parseInt(env.FULL_EVENT_SYNC_INTERVAL_HOURS || '3'),
      nearEventThresholdMinutes: parseInt(env.NEAR_EVENT_THRESHOLD_MINUTES || '120'),
      lookforwardHours: parseInt(env.LOOKFORWARD_HOURS || '48'),
    };
  }
}

// ============================================================================
// Example Usage
// ============================================================================

/*
// In server.ts or sync configuration:

import { SyncConfigValidator } from './sync-config-validator.js';

// Load config from env
const config = SyncConfigValidator.fromEnv(process.env);

// Validate before starting
const validation = SyncConfigValidator.validate(config);

if (!validation.valid) {
  console.error('❌ Invalid sync configuration:');
  validation.errors.forEach(err => console.error(err));
  process.exit(1);
}

if (validation.warnings.length > 0) {
  console.warn('⚠️ Sync configuration warnings:');
  validation.warnings.forEach(warn => console.warn(warn));
}

if (validation.suggestions.length > 0) {
  console.log('💡 Suggestions:');
  validation.suggestions.forEach(sug => console.log(sug));
}

// Use generated cron expressions
const { rider, nearEvent, fullEvent } = validation.generatedCrons!;
cron.schedule(rider, async () => { ... });
cron.schedule(nearEvent, async () => { ... });
cron.schedule(fullEvent, async () => { ... });
*/
