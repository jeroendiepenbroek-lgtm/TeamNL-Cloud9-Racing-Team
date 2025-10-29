/**
 * Unit Tests - SchedulerService
 * 
 * Tests voor configureerbare cron job scheduler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchedulerService, getScheduler } from '../../src/services/scheduler.js';
import cron from 'node-cron';
import { SubteamService } from '../../src/services/subteam.js';
import { EventService } from '../../src/services/event.js';
import { ClubService } from '../../src/services/club.js';

// Mock dependencies
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
    validate: vi.fn(),
  },
}));

vi.mock('../../src/services/subteam.js', () => ({
  SubteamService: vi.fn(),
}));

vi.mock('../../src/services/event.js', () => ({
  EventService: vi.fn(),
}));

vi.mock('../../src/services/club.js', () => ({
  ClubService: vi.fn(),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('SchedulerService', () => {
  let service: SchedulerService;
  let mockSubteamService: any;
  let mockEventService: any;
  let mockClubService: any;
  let mockCronJob: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };

    // Reset mocks
    vi.clearAllMocks();

    // Mock cron job
    mockCronJob = {
      stop: vi.fn(),
    };

    (cron.schedule as any).mockReturnValue(mockCronJob);
    (cron.validate as any).mockReturnValue(true);

    // Mock SubteamService
    mockSubteamService = {
      syncFavoriteStats: vi.fn(),
    };
    (SubteamService as any).mockImplementation(() => mockSubteamService);

    // Mock EventService
    mockEventService = {
      forwardScan: vi.fn(),
      cleanup100Days: vi.fn(),
    };
    (EventService as any).mockImplementation(() => mockEventService);

    // Mock ClubService
    mockClubService = {
      syncAllClubRosters: vi.fn(),
    };
    (ClubService as any).mockImplementation(() => mockClubService);

    // Create fresh service instance
    service = new SchedulerService();
  });

  afterEach(() => {
    // Restore env
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('start()', () => {
    it('should start favorites sync when enabled', async () => {
      // Arrange
      process.env.FAVORITES_SYNC_ENABLED = 'true';
      process.env.FAVORITES_SYNC_CRON = '0 */6 * * *';

      mockSubteamService.syncFavoriteStats.mockResolvedValue({
        synced: 5,
        failed: 0,
        clubsExtracted: 2,
      });

      // Act
      await service.start();

      // Assert
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 */6 * * *',
        expect.any(Function)
      );
    });

    it('should start club sync when enabled', async () => {
      // Arrange
      process.env.CLUB_SYNC_ENABLED = 'true';
      process.env.CLUB_SYNC_CRON = '0 */12 * * *';

      mockClubService.syncAllClubRosters.mockResolvedValue({
        synced: 2,
        failed: 0,
        totalMembers: 100,
      });

      // Act
      await service.start();

      // Assert
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 */12 * * *',
        expect.any(Function)
      );
    });

    it('should start forward scan when enabled', async () => {
      // Arrange
      process.env.FORWARD_SCAN_ENABLED = 'true';
      process.env.FORWARD_SCAN_CRON = '0 4 * * *';
      process.env.FORWARD_SCAN_MAX_EVENTS = '500';
      process.env.FORWARD_SCAN_RETENTION_DAYS = '90';

      mockEventService.forwardScan.mockResolvedValue({
        scanned: 500,
        found: 50,
        saved: 50,
        archived: 10,
        duration: 300000,
        lastEventId: 5129235,
      });

      // Act
      await service.start();

      // Assert
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 4 * * *',
        expect.any(Function)
      );
    });

    it('should start cleanup when enabled', async () => {
      // Arrange
      process.env.CLEANUP_ENABLED = 'true';
      process.env.CLEANUP_CRON = '0 3 * * *';
      process.env.CLEANUP_RETENTION_DAYS = '100';

      mockEventService.cleanup100Days.mockResolvedValue(25);

      // Act
      await service.start();

      // Assert
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 3 * * *',
        expect.any(Function)
      );
    });

    it('should not start jobs when disabled', async () => {
      // Arrange - all disabled
      process.env.FAVORITES_SYNC_ENABLED = 'false';
      process.env.CLUB_SYNC_ENABLED = 'false';
      process.env.FORWARD_SCAN_ENABLED = 'false';
      process.env.CLEANUP_ENABLED = 'false';

      // Act
      await service.start();

      // Assert - no cron jobs scheduled
      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('should use default cron expressions when not specified', async () => {
      // Arrange
      process.env.FAVORITES_SYNC_ENABLED = 'true';
      // Don't set FAVORITES_SYNC_CRON

      mockSubteamService.syncFavoriteStats.mockResolvedValue({
        synced: 0,
        failed: 0,
        clubsExtracted: 0,
      });

      // Act
      await service.start();

      // Assert - should use default '0 */6 * * *'
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 */6 * * *',
        expect.any(Function)
      );
    });

    it('should run startup sync for favorites when enabled', async () => {
      // Arrange
      process.env.FAVORITES_SYNC_ENABLED = 'true';
      process.env.FAVORITES_SYNC_ON_STARTUP = 'true';

      mockSubteamService.syncFavoriteStats.mockResolvedValue({
        synced: 5,
        failed: 0,
        clubsExtracted: 2,
      });

      // Act
      await service.start();

      // Assert
      expect(mockSubteamService.syncFavoriteStats).toHaveBeenCalled();
    });

    it('should run startup sync for clubs when enabled', async () => {
      // Arrange
      process.env.CLUB_SYNC_ENABLED = 'true';
      process.env.CLUB_SYNC_ON_STARTUP = 'true';

      mockClubService.syncAllClubRosters.mockResolvedValue({
        synced: 1,
        failed: 0,
        totalMembers: 50,
      });

      // Act
      await service.start();

      // Assert
      expect(mockClubService.syncAllClubRosters).toHaveBeenCalled();
    });

    it('should handle startup sync errors gracefully', async () => {
      // Arrange
      process.env.FAVORITES_SYNC_ENABLED = 'true';
      process.env.FAVORITES_SYNC_ON_STARTUP = 'true';

      mockSubteamService.syncFavoriteStats.mockRejectedValue(
        new Error('Startup sync failed')
      );

      // Act & Assert - should not throw
      await expect(service.start()).resolves.not.toThrow();
    });

    it('should skip invalid cron expressions', async () => {
      // Arrange
      process.env.FAVORITES_SYNC_ENABLED = 'true';
      process.env.FAVORITES_SYNC_CRON = 'INVALID';

      (cron.validate as any).mockReturnValue(false);

      // Act
      await service.start();

      // Assert - should not create job
      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('should recognize boolean env variants', async () => {
      // Test different boolean formats
      const testCases = [
        { value: 'true', expected: true },
        { value: 'TRUE', expected: true },
        { value: '1', expected: true },
        { value: 'yes', expected: true },
        { value: 'YES', expected: true },
        { value: 'false', expected: false },
        { value: '0', expected: false },
        { value: 'no', expected: false },
        { value: '', expected: false },
      ];

      for (const testCase of testCases) {
        // Reset
        vi.clearAllMocks();
        service = new SchedulerService();

        // Arrange
        process.env.FAVORITES_SYNC_ENABLED = testCase.value;

        mockSubteamService.syncFavoriteStats.mockResolvedValue({
          synced: 0,
          failed: 0,
          clubsExtracted: 0,
        });

        // Act
        await service.start();

        // Assert
        if (testCase.expected) {
          expect(cron.schedule).toHaveBeenCalled();
        } else {
          expect(cron.schedule).not.toHaveBeenCalled();
        }
      }
    });
  });

  describe('stop()', () => {
    it('should stop all running jobs', async () => {
      // Arrange - start some jobs first
      process.env.FAVORITES_SYNC_ENABLED = 'true';
      process.env.CLUB_SYNC_ENABLED = 'true';

      mockSubteamService.syncFavoriteStats.mockResolvedValue({
        synced: 0,
        failed: 0,
        clubsExtracted: 0,
      });
      mockClubService.syncAllClubRosters.mockResolvedValue({
        synced: 0,
        failed: 0,
        totalMembers: 0,
      });

      await service.start();

      // Act
      service.stop();

      // Assert - both jobs should be stopped
      expect(mockCronJob.stop).toHaveBeenCalledTimes(2);
    });

    it('should clear jobs map after stopping', async () => {
      // Arrange
      process.env.FAVORITES_SYNC_ENABLED = 'true';
      mockSubteamService.syncFavoriteStats.mockResolvedValue({
        synced: 0,
        failed: 0,
        clubsExtracted: 0,
      });

      await service.start();

      // Act
      service.stop();

      // Assert - status should be empty
      const status = service.getStatus();
      expect(status).toHaveLength(0);
    });

    it('should handle stop when no jobs are running', () => {
      // Act & Assert - should not throw
      expect(() => service.stop()).not.toThrow();
    });
  });

  describe('getStatus()', () => {
    it('should return status of all active jobs', async () => {
      // Arrange
      process.env.FAVORITES_SYNC_ENABLED = 'true';
      process.env.CLUB_SYNC_ENABLED = 'true';
      process.env.FAVORITES_SYNC_CRON = '0 */6 * * *';
      process.env.CLUB_SYNC_CRON = '0 */12 * * *';

      mockSubteamService.syncFavoriteStats.mockResolvedValue({
        synced: 0,
        failed: 0,
        clubsExtracted: 0,
      });
      mockClubService.syncAllClubRosters.mockResolvedValue({
        synced: 0,
        failed: 0,
        totalMembers: 0,
      });

      await service.start();

      // Act
      const status = service.getStatus();

      // Assert
      expect(status).toHaveLength(2);
      expect(status).toContainEqual({
        name: 'favorites-sync',
        schedule: '0 */6 * * *',
      });
      expect(status).toContainEqual({
        name: 'club-sync',
        schedule: '0 */12 * * *',
      });
    });

    it('should return empty array when no jobs are running', () => {
      // Act
      const status = service.getStatus();

      // Assert
      expect(status).toHaveLength(0);
      expect(status).toEqual([]);
    });
  });

  describe('triggerJob()', () => {
    it('should throw error for non-existent job', async () => {
      // Act & Assert
      await expect(service.triggerJob('non-existent')).rejects.toThrow(
        "Job 'non-existent' niet gevonden"
      );
    });

    it('should throw not implemented error for manual trigger', async () => {
      // Arrange
      process.env.FAVORITES_SYNC_ENABLED = 'true';
      mockSubteamService.syncFavoriteStats.mockResolvedValue({
        synced: 0,
        failed: 0,
        clubsExtracted: 0,
      });

      await service.start();

      // Act & Assert
      await expect(service.triggerJob('favorites-sync')).rejects.toThrow(
        'Manual trigger not implemented'
      );
    });
  });

  describe('getScheduler() singleton', () => {
    it('should return same instance on multiple calls', () => {
      // Act
      const instance1 = getScheduler();
      const instance2 = getScheduler();

      // Assert
      expect(instance1).toBe(instance2);
    });

    it('should return SchedulerService instance', () => {
      // Act
      const instance = getScheduler();

      // Assert
      expect(instance).toBeInstanceOf(SchedulerService);
    });
  });

  describe('Integration - Cron job execution', () => {
    it('should execute favorites sync callback correctly', async () => {
      // Arrange
      process.env.FAVORITES_SYNC_ENABLED = 'true';

      mockSubteamService.syncFavoriteStats.mockResolvedValue({
        synced: 5,
        failed: 1,
        clubsExtracted: 3,
      });

      let cronCallback: Function | null = null;
      (cron.schedule as any).mockImplementation(
        (expression: string, callback: Function) => {
          cronCallback = callback;
          return mockCronJob;
        }
      );

      // Act
      await service.start();

      // Manually trigger the cron callback
      if (cronCallback) {
        await cronCallback();
      }

      // Assert - callback should have been executed
      expect(mockSubteamService.syncFavoriteStats).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in cron job callbacks', async () => {
      // Arrange
      process.env.FAVORITES_SYNC_ENABLED = 'true';

      mockSubteamService.syncFavoriteStats.mockRejectedValue(
        new Error('Sync failed')
      );

      let cronCallback: Function | null = null;
      (cron.schedule as any).mockImplementation(
        (expression: string, callback: Function) => {
          cronCallback = callback;
          return mockCronJob;
        }
      );

      // Act
      await service.start();

      // Execute callback and expect it to handle error
      if (cronCallback) {
        await expect(cronCallback()).resolves.not.toThrow();
      }
    });
  });
});
