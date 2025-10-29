/**
 * Unit Tests - SyncService
 * 
 * Tests voor data synchronisatie service (main orchestration)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncService } from '../../src/services/sync.js';
import { ZwiftApiClient } from '../../src/api/zwift-client.js';
import {
  RiderRepository,
  ClubRepository,
  ClubMemberRepository,
  ResultRepository,
  SyncLogRepository,
} from '../../src/database/repositories.js';

// Mock dependencies
vi.mock('../../src/api/zwift-client.js', () => ({
  ZwiftApiClient: vi.fn(),
}));

vi.mock('../../src/database/repositories.js', () => ({
  RiderRepository: vi.fn(),
  ClubRepository: vi.fn(),
  ClubMemberRepository: vi.fn(),
  ResultRepository: vi.fn(),
  SyncLogRepository: vi.fn(),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../src/utils/config.js', () => ({
  config: {
    zwiftApiKey: 'test-api-key',
    zwiftApiBaseUrl: 'https://api.zwift.test',
    zwiftClubId: 11818,
  },
}));

describe('SyncService', () => {
  let service: SyncService;
  let mockApiClient: any;
  let mockRiderRepo: any;
  let mockClubRepo: any;
  let mockClubMemberRepo: any;
  let mockResultRepo: any;
  let mockSyncLogRepo: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock ZwiftApiClient
    mockApiClient = {
      getRider: vi.fn(),
      getRidersBulk: vi.fn(),
      getClubMembers: vi.fn(),
      getResults: vi.fn(),
      getZwiftPowerResults: vi.fn(),
    };
    (ZwiftApiClient as any).mockImplementation(() => mockApiClient);

    // Mock RiderRepository
    mockRiderRepo = {
      upsertRider: vi.fn(),
      upsertRidersBulk: vi.fn(),
      saveRiderHistory: vi.fn(),
      getFavoriteRiders: vi.fn(),
      getFavoriteZwiftIds: vi.fn(),
    };
    (RiderRepository as any).mockImplementation(() => mockRiderRepo);

    // Mock ClubRepository
    mockClubRepo = {
      upsertClub: vi.fn(),
      getClub: vi.fn(),
    };
    (ClubRepository as any).mockImplementation(() => mockClubRepo);

    // Mock ClubMemberRepository
    mockClubMemberRepo = {
      upsertClubMembersBulk: vi.fn(),
    };
    (ClubMemberRepository as any).mockImplementation(() => mockClubMemberRepo);

    // Mock ResultRepository
    mockResultRepo = {
      upsertResultsBulk: vi.fn(),
    };
    (ResultRepository as any).mockImplementation(() => mockResultRepo);

    // Mock SyncLogRepository
    mockSyncLogRepo = {
      logSync: vi.fn(),
      getRecentLogs: vi.fn(),
      getLastSuccessfulSync: vi.fn(),
    };
    (SyncLogRepository as any).mockImplementation(() => mockSyncLogRepo);

    // Create fresh service instance
    service = new SyncService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncClubMembers()', () => {
    it('should sync club members successfully', async () => {
      // Arrange
      const mockClubData = {
        id: 11818,
        name: 'TeamNL Cloud9',
        riders: [
          { zwiftId: 150437, name: 'Rider 1', clubId: 11818 },
          { zwiftId: 160000, name: 'Rider 2', clubId: 11818 },
          { zwiftId: 170000, name: 'Rider 3', clubId: 11818 },
        ],
      };

      mockApiClient.getClubMembers.mockResolvedValue(mockClubData);
      mockClubRepo.upsertClub.mockResolvedValue({ id: 11818 });
      mockClubMemberRepo.upsertClubMembersBulk.mockResolvedValue(3);
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Act
      await service.syncClubMembers(11818);

      // Assert
      expect(mockApiClient.getClubMembers).toHaveBeenCalledWith(11818);
      expect(mockClubRepo.upsertClub).toHaveBeenCalledWith({
        id: 11818,
        name: 'TeamNL Cloud9',
        memberCount: 3,
      });
      expect(mockClubMemberRepo.upsertClubMembersBulk).toHaveBeenCalledWith(
        mockClubData.riders,
        11818
      );
      expect(mockSyncLogRepo.logSync).toHaveBeenCalledWith(
        'club',
        'success',
        3,
        expect.any(Number)
      );
    });

    it('should process members in batches of 50', async () => {
      // Arrange - create 150 members to test batching
      const riders = Array.from({ length: 150 }, (_, i) => ({
        zwiftId: 150000 + i,
        name: `Rider ${i}`,
        clubId: 11818,
      }));

      mockApiClient.getClubMembers.mockResolvedValue({
        id: 11818,
        name: 'Large Club',
        riders,
      });
      mockClubRepo.upsertClub.mockResolvedValue({ id: 11818 });
      mockClubMemberRepo.upsertClubMembersBulk.mockResolvedValue(50);
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Act
      await service.syncClubMembers(11818);

      // Assert - should be called 3 times (150 / 50 = 3 batches)
      expect(mockClubMemberRepo.upsertClubMembersBulk).toHaveBeenCalledTimes(3);
      expect(mockClubMemberRepo.upsertClubMembersBulk).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ zwiftId: expect.any(Number) })]),
        11818
      );
    });

    it('should handle API errors and log failure', async () => {
      // Arrange
      mockApiClient.getClubMembers.mockRejectedValue(new Error('API Error'));
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.syncClubMembers(11818)).rejects.toThrow('API Error');

      expect(mockSyncLogRepo.logSync).toHaveBeenCalledWith(
        'club',
        'error',
        0,
        expect.any(Number),
        'API Error'
      );
    });

    it('should use default club ID from config when not provided', async () => {
      // Arrange
      mockApiClient.getClubMembers.mockResolvedValue({
        id: 11818,
        name: 'Default Club',
        riders: [],
      });
      mockClubRepo.upsertClub.mockResolvedValue({ id: 11818 });
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Act
      await service.syncClubMembers(); // No clubId provided

      // Assert
      expect(mockApiClient.getClubMembers).toHaveBeenCalledWith(11818); // Default from config
    });
  });

  describe('syncIndividualRiders()', () => {
    it('should sync individual riders with rate limiting', async () => {
      // Arrange
      const riderIds = [150437, 160000];
      const mockRiderData = {
        zwiftId: 150437,
        name: 'Test Rider',
        ftp: 300,
      };

      mockApiClient.getRider.mockResolvedValue(mockRiderData);
      mockRiderRepo.upsertRider.mockResolvedValue({ zwiftId: 150437 });
      mockRiderRepo.saveRiderHistory.mockResolvedValue(undefined);
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Mock delay to skip waiting
      vi.spyOn(service as any, 'delay').mockResolvedValue(undefined);

      // Act
      await service.syncIndividualRiders(riderIds);

      // Assert
      expect(mockApiClient.getRider).toHaveBeenCalledTimes(2);
      expect(mockRiderRepo.upsertRider).toHaveBeenCalledTimes(2);
      expect(mockRiderRepo.saveRiderHistory).toHaveBeenCalledTimes(2);
      expect((service as any).delay).toHaveBeenCalledWith(12000); // 12s delay
      expect(mockSyncLogRepo.logSync).toHaveBeenCalledWith(
        'riders',
        'success',
        2,
        expect.any(Number)
      );
    });

    it('should handle individual rider errors gracefully', async () => {
      // Arrange
      const riderIds = [150437, 160000, 170000];
      
      mockApiClient.getRider
        .mockResolvedValueOnce({ zwiftId: 150437, name: 'Rider 1' })
        .mockRejectedValueOnce(new Error('API Error')) // Rider 2 fails
        .mockResolvedValueOnce({ zwiftId: 170000, name: 'Rider 3' });

      mockRiderRepo.upsertRider.mockResolvedValue({});
      mockRiderRepo.saveRiderHistory.mockResolvedValue(undefined);
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Mock delay
      vi.spyOn(service as any, 'delay').mockResolvedValue(undefined);

      // Act
      await service.syncIndividualRiders(riderIds);

      // Assert - should log partial success
      expect(mockSyncLogRepo.logSync).toHaveBeenCalledWith(
        'riders',
        'partial',
        2, // 2 out of 3 succeeded
        expect.any(Number)
      );
    });

    it('should log error status when all riders fail', async () => {
      // Arrange
      const riderIds = [150437, 160000];
      mockApiClient.getRider.mockRejectedValue(new Error('API Error'));
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Mock delay
      vi.spyOn(service as any, 'delay').mockResolvedValue(undefined);

      // Act
      await service.syncIndividualRiders(riderIds);

      // Assert
      expect(mockSyncLogRepo.logSync).toHaveBeenCalledWith(
        'riders',
        'error',
        0,
        expect.any(Number)
      );
    });
  });

  describe('syncRidersBulk()', () => {
    it('should sync riders in bulk successfully', async () => {
      // Arrange
      const riderIds = [150437, 160000, 170000];
      const mockRiders = [
        { zwiftId: 150437, name: 'Rider 1', ftp: 300 },
        { zwiftId: 160000, name: 'Rider 2', ftp: 320 },
        { zwiftId: 170000, name: 'Rider 3', ftp: 280 },
      ];

      mockApiClient.getRidersBulk.mockResolvedValue(mockRiders);
      mockRiderRepo.upsertRidersBulk.mockResolvedValue(3);
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Act
      await service.syncRidersBulk(riderIds);

      // Assert
      expect(mockApiClient.getRidersBulk).toHaveBeenCalledWith(riderIds);
      expect(mockRiderRepo.upsertRidersBulk).toHaveBeenCalledWith(mockRiders);
      expect(mockSyncLogRepo.logSync).toHaveBeenCalledWith(
        'riders-bulk',
        'success',
        3,
        expect.any(Number)
      );
    });

    it('should reject more than 1000 riders', async () => {
      // Arrange
      const tooManyRiders = Array.from({ length: 1001 }, (_, i) => i);

      // Act & Assert
      await expect(service.syncRidersBulk(tooManyRiders)).rejects.toThrow(
        'Maximum 1000 riders per bulk sync'
      );
    });

    it('should handle bulk sync errors and log failure', async () => {
      // Arrange
      const riderIds = [150437, 160000];
      mockApiClient.getRidersBulk.mockRejectedValue(new Error('Bulk API Error'));
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.syncRidersBulk(riderIds)).rejects.toThrow('Bulk API Error');

      expect(mockSyncLogRepo.logSync).toHaveBeenCalledWith(
        'riders-bulk',
        'error',
        0,
        expect.any(Number),
        'Bulk API Error'
      );
    });
  });

  describe('syncEventResults()', () => {
    it('should sync event results from zwiftranking', async () => {
      // Arrange
      const eventId = 4879990;
      const mockResults = [
        { riderId: 150437, name: 'Rider 1', position: 1, time: 2400 },
        { riderId: 160000, name: 'Rider 2', position: 2, time: 2450 },
      ];

      mockApiClient.getResults.mockResolvedValue(mockResults);
      mockResultRepo.upsertResultsBulk.mockResolvedValue(2);
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Act
      await service.syncEventResults(eventId, 'zwiftranking');

      // Assert
      expect(mockApiClient.getResults).toHaveBeenCalledWith(eventId);
      expect(mockResultRepo.upsertResultsBulk).toHaveBeenCalledWith(mockResults, 'zwiftranking');
      expect(mockSyncLogRepo.logSync).toHaveBeenCalledWith(
        'results-zwiftranking',
        'success',
        2,
        expect.any(Number)
      );
    });

    it('should sync event results from zwiftpower', async () => {
      // Arrange
      const eventId = 4879990;
      const mockResults = [
        { riderId: 150437, name: 'Rider 1', position: 1, time: 2400 },
      ];

      mockApiClient.getZwiftPowerResults.mockResolvedValue(mockResults);
      mockResultRepo.upsertResultsBulk.mockResolvedValue(1);
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Act
      await service.syncEventResults(eventId, 'zwiftpower');

      // Assert
      expect(mockApiClient.getZwiftPowerResults).toHaveBeenCalledWith(eventId);
      expect(mockResultRepo.upsertResultsBulk).toHaveBeenCalledWith(mockResults, 'zwiftpower');
    });

    it('should skip upsert when no results returned', async () => {
      // Arrange
      mockApiClient.getResults.mockResolvedValue([]);
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Act
      await service.syncEventResults(4879990);

      // Assert
      expect(mockResultRepo.upsertResultsBulk).not.toHaveBeenCalled();
      expect(mockSyncLogRepo.logSync).toHaveBeenCalledWith(
        'results-zwiftranking',
        'success',
        0,
        expect.any(Number)
      );
    });

    it('should handle event results errors', async () => {
      // Arrange
      mockApiClient.getResults.mockRejectedValue(new Error('Event not found'));
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.syncEventResults(4879990)).rejects.toThrow('Event not found');

      expect(mockSyncLogRepo.logSync).toHaveBeenCalledWith(
        'results-zwiftranking',
        'error',
        0,
        expect.any(Number),
        'Event not found'
      );
    });
  });

  describe('syncFavoriteRiders()', () => {
    it('should sync favorite riders successfully', async () => {
      // Arrange
      const mockFavorites = [
        { zwiftId: 150437, name: 'Favorite 1', isFavorite: true, addedBy: 'user1', syncPriority: 1 },
        { zwiftId: 160000, name: 'Favorite 2', isFavorite: true, addedBy: 'user2', syncPriority: 2 },
      ];

      const mockRiderData = {
        zwiftId: 150437,
        name: 'Fresh Data',
        ftp: 300,
      };

      mockRiderRepo.getFavoriteRiders.mockResolvedValue(mockFavorites);
      mockApiClient.getRider.mockResolvedValue(mockRiderData);
      mockRiderRepo.upsertRider.mockResolvedValue({ zwiftId: 150437 });
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Mock delay
      vi.spyOn(service as any, 'delay').mockResolvedValue(undefined);

      // Act
      await service.syncFavoriteRiders();

      // Assert
      expect(mockRiderRepo.getFavoriteRiders).toHaveBeenCalled();
      expect(mockApiClient.getRider).toHaveBeenCalledTimes(2);
      expect(mockRiderRepo.upsertRider).toHaveBeenCalledWith(
        mockRiderData,
        undefined,
        {
          isFavorite: true,
          addedBy: 'user1',
          syncPriority: 1,
        }
      );
      expect((service as any).delay).toHaveBeenCalledWith(12000); // 12s rate limit
      expect(mockSyncLogRepo.logSync).toHaveBeenCalledWith(
        'favorites',
        'success',
        2,
        expect.any(Number)
      );
    });

    it('should handle no favorites gracefully', async () => {
      // Arrange
      mockRiderRepo.getFavoriteRiders.mockResolvedValue([]);

      // Act
      await service.syncFavoriteRiders();

      // Assert
      expect(mockApiClient.getRider).not.toHaveBeenCalled();
      expect(mockRiderRepo.upsertRider).not.toHaveBeenCalled();
    });

    it('should handle favorite sync errors gracefully', async () => {
      // Arrange
      const mockFavorites = [
        { zwiftId: 150437, name: 'Favorite 1', isFavorite: true },
        { zwiftId: 160000, name: 'Favorite 2', isFavorite: true },
      ];

      mockRiderRepo.getFavoriteRiders.mockResolvedValue(mockFavorites);
      mockApiClient.getRider
        .mockResolvedValueOnce({ zwiftId: 150437, name: 'Success' })
        .mockRejectedValueOnce(new Error('API Error'));
      mockRiderRepo.upsertRider.mockResolvedValue({});
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Mock delay
      vi.spyOn(service as any, 'delay').mockResolvedValue(undefined);

      // Act
      await service.syncFavoriteRiders();

      // Assert - should log partial success
      expect(mockSyncLogRepo.logSync).toHaveBeenCalledWith(
        'favorites',
        'partial',
        1,
        expect.any(Number)
      );
    });
  });

  describe('fullSync()', () => {
    it('should perform full sync with rate limiting', async () => {
      // Arrange
      mockApiClient.getClubMembers.mockResolvedValue({
        id: 11818,
        name: 'Test Club',
        riders: [],
      });
      mockClubRepo.upsertClub.mockResolvedValue({ id: 11818 });
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Mock delay to skip waiting
      const delaySpy = vi.spyOn(service as any, 'delay').mockResolvedValue(undefined);

      // Act
      await service.fullSync();

      // Assert
      expect(mockApiClient.getClubMembers).toHaveBeenCalled();
      expect(delaySpy).toHaveBeenCalledWith(60000); // 60s delay after club sync
    });

    it('should handle full sync errors', async () => {
      // Arrange
      mockApiClient.getClubMembers.mockRejectedValue(new Error('Full sync failed'));
      mockSyncLogRepo.logSync.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.fullSync()).rejects.toThrow('Full sync failed');
    });
  });

  describe('getSyncStats()', () => {
    it('should return sync statistics', async () => {
      // Arrange
      const mockRecentLogs = [
        { id: 1, type: 'club', status: 'success', startedAt: new Date() },
        { id: 2, type: 'riders', status: 'success', startedAt: new Date() },
      ];

      const mockLastClubSync = {
        id: 1,
        type: 'club',
        status: 'success',
        startedAt: new Date('2025-10-28T10:00:00Z'),
      };

      const mockLastRidersSync = {
        id: 2,
        type: 'riders',
        status: 'success',
        startedAt: new Date('2025-10-28T11:00:00Z'),
      };

      mockSyncLogRepo.getRecentLogs.mockResolvedValue(mockRecentLogs);
      mockSyncLogRepo.getLastSuccessfulSync
        .mockResolvedValueOnce(mockLastClubSync)
        .mockResolvedValueOnce(mockLastRidersSync);

      // Act
      const result = await service.getSyncStats();

      // Assert
      expect(result).toEqual({
        recentLogs: mockRecentLogs,
        lastClubSync: mockLastClubSync,
        lastRidersSync: mockLastRidersSync,
      });

      expect(mockSyncLogRepo.getRecentLogs).toHaveBeenCalledWith(20);
      expect(mockSyncLogRepo.getLastSuccessfulSync).toHaveBeenCalledWith('club');
      expect(mockSyncLogRepo.getLastSuccessfulSync).toHaveBeenCalledWith('riders');
    });
  });

  describe('delay() helper', () => {
    it('should delay execution', async () => {
      // Arrange
      const startTime = Date.now();
      const delayMs = 100;

      // Act - call real delay (not mocked)
      const realService = new SyncService();
      await (realService as any).delay(delayMs);
      const elapsed = Date.now() - startTime;

      // Assert - should have waited at least delayMs
      expect(elapsed).toBeGreaterThanOrEqual(delayMs);
    });
  });
});
