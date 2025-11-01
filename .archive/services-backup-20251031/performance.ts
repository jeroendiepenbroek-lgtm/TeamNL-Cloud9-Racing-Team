/**
 * Performance Metrics Service
 * 
 * Tracks sync performance, API calls, and system health metrics
 */

import { ZwiftApiClient } from '../api/zwift-client.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

// Note: SyncLogRepository doesn't exist in MVP schema

export interface PerformanceMetrics {
  // Sync Performance
  sync: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    successRate: number;
    avgDuration: number;
    lastSyncTime: Date | null;
  };

  // API Performance
  api: {
    totalCalls: number;
    avgResponseTime: number;
    errorRate: number;
    rateLimitHits: number;
  };

  // Rider Stats
  riders: {
    totalTracked: number;
    totalFavorites: number;
    totalClubMembers: number;
    avgEventsPerRider: number;
  };

  // Event Stats
  events: {
    totalEvents: number;
    totalResults: number;
    eventsLast24h: number;
    resultsLast24h: number;
  };

  // System Health
  health: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    databaseSize: number;
  };
}

export interface SyncPerformanceEntry {
  type: string;
  duration: number;
  itemsProcessed: number;
  success: boolean;
  timestamp: Date;
}

export class PerformanceService {
  private syncLogRepo: SyncLogRepository;
  private startTime: number;
  private apiCallCount: number = 0;
  private apiResponseTimes: number[] = [];
  private rateLimitHits: number = 0;

  constructor() {
    this.syncLogRepo = new SyncLogRepository();
    this.startTime = Date.now();
  }

  /**
   * Get comprehensive performance metrics
   */
  async getMetrics(hours: number = 24): Promise<PerformanceMetrics> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get sync logs
    const recentLogs = await this.syncLogRepo.getRecentLogs(100);
    const logsInPeriod = recentLogs.filter((log: any) => log.startedAt >= since);

    const successful = logsInPeriod.filter((log: any) => log.status === 'completed');
    const failed = logsInPeriod.filter((log: any) => log.status === 'failed');

    const avgDuration = successful.length > 0
      ? successful.reduce((sum: number, log: any) => sum + (log.duration || 0), 0) / successful.length
      : 0;

    const successRate = logsInPeriod.length > 0
      ? (successful.length / logsInPeriod.length) * 100
      : 0;

    // Get latest sync time
    const lastSync = recentLogs.length > 0 ? recentLogs[0].startedAt : null;

    // API metrics
    const avgApiTime = this.apiResponseTimes.length > 0
      ? this.apiResponseTimes.reduce((a, b) => a + b, 0) / this.apiResponseTimes.length
      : 0;

    const errorRate = this.apiCallCount > 0
      ? (failed.length / this.apiCallCount) * 100
      : 0;

    // System health
    const uptime = Math.floor((Date.now() - this.startTime) / 1000); // seconds
    const memoryUsage = process.memoryUsage();

    return {
      sync: {
        totalSyncs: logsInPeriod.length,
        successfulSyncs: successful.length,
        failedSyncs: failed.length,
        successRate,
        avgDuration,
        lastSyncTime: lastSync,
      },
      api: {
        totalCalls: this.apiCallCount,
        avgResponseTime: avgApiTime,
        errorRate,
        rateLimitHits: this.rateLimitHits,
      },
      riders: {
        totalTracked: 0, // TODO: implement
        totalFavorites: 0,
        totalClubMembers: 0,
        avgEventsPerRider: 0,
      },
      events: {
        totalEvents: 0, // TODO: implement
        totalResults: 0,
        eventsLast24h: 0,
        resultsLast24h: 0,
      },
      health: {
        uptime,
        memoryUsage,
        databaseSize: 0, // TODO: implement
      },
    };
  }

  /**
   * Track an API call
   */
  trackApiCall(responseTime: number, success: boolean = true) {
    this.apiCallCount++;
    this.apiResponseTimes.push(responseTime);

    // Keep only last 1000 response times
    if (this.apiResponseTimes.length > 1000) {
      this.apiResponseTimes.shift();
    }

    if (!success) {
      logger.warn('API call failed', { responseTime });
    }
  }

  /**
   * Track rate limit hit
   */
  trackRateLimitHit() {
    this.rateLimitHits++;
    logger.warn('Rate limit hit', { total: this.rateLimitHits });
  }

  /**
   * Get recent sync performance
   */
  async getRecentSyncPerformance(limit: number = 50): Promise<SyncPerformanceEntry[]> {
    const logs = await this.syncLogRepo.getRecentLogs(limit);

    return logs.map((log: any) => ({
      type: log.type,
      duration: log.duration || 0,
      itemsProcessed: log.itemsProcessed || 0,
      success: log.status === 'completed',
      timestamp: log.startedAt,
    }));
  }

  /**
   * Get performance summary for dashboard
   */
  async getSummary() {
    const metrics = await this.getMetrics(24);

    return {
      status: this.getHealthStatus(metrics),
      uptime: this.formatUptime(metrics.health.uptime),
      lastSync: metrics.sync.lastSyncTime,
      successRate: Math.round(metrics.sync.successRate),
      avgDuration: Math.round(metrics.sync.avgDuration / 1000), // Convert to seconds
      apiCalls: metrics.api.totalCalls,
      rateLimits: metrics.api.rateLimitHits,
    };
  }

  /**
   * Determine overall health status
   */
  private getHealthStatus(metrics: PerformanceMetrics): 'healthy' | 'warning' | 'critical' {
    const { successRate } = metrics.sync;
    const { rateLimitHits } = metrics.api;

    if (successRate < 50 || rateLimitHits > 10) {
      return 'critical';
    }

    if (successRate < 80 || rateLimitHits > 5) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Format uptime as human-readable string
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Reset metrics (for testing)
   */
  reset() {
    this.apiCallCount = 0;
    this.apiResponseTimes = [];
    this.rateLimitHits = 0;
    this.startTime = Date.now();
  }
}

// Singleton instance
export const performanceService = new PerformanceService();
