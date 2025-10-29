/**
 * Unit Tests - ClubService
 * 
 * Tests voor club roster synchronisatie (Workflow Step 4)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClubService } from '../../src/services/club.js';
import { ZwiftApiClient } from '../../src/api/zwift-client.js';
import { ClubRepository, ClubMemberRepository, RiderRepository } from '../../src/database/repositories.js';

// Mock dependencies
vi.mock('../../src/api/zwift-client.js', () => ({
  ZwiftApiClient: vi.fn(),
}));

vi.mock('../../src/database/repositories.js', () => ({
  ClubRepository: vi.fn(),
  ClubMemberRepository: vi.fn(),
  RiderRepository: vi.fn(),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../src/utils/config.js', () => ({
  config: {
    zwiftApiKey: 'test-api-key',
    zwiftApiBaseUrl: 'https://api.zwift.test',
  },
}));

describe('ClubService', () => {
  let service: ClubService;
  let mockZwiftApi: any;
  let mockClubRepo: any;
  let mockClubMemberRepo: any;
  let mockRiderRepo: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock ZwiftApiClient
    mockZwiftApi = {
      getClubMembers: vi.fn(),
    };
    (ZwiftApiClient as any).mockImplementation(() => mockZwiftApi);

    // Mock ClubRepository
    mockClubRepo = {
      getAllClubs: vi.fn(),
      getClub: vi.fn(),
      upsertClub: vi.fn(),
    };
    (ClubRepository as any).mockImplementation(() => mockClubRepo);

    // Mock ClubMemberRepository
    mockClubMemberRepo = {
      upsertClubMembersBulk: vi.fn(),
      updateFavoriteStatus: vi.fn(),
      getFavoriteClubMembers: vi.fn(),
      getAllTrackedRiders: vi.fn(),
    };
    (ClubMemberRepository as any).mockImplementation(() => mockClubMemberRepo);

    // Mock RiderRepository
    mockRiderRepo = {
      getFavoriteZwiftIds: vi.fn(),
    };
    (RiderRepository as any).mockImplementation(() => mockRiderRepo);

    // Create fresh service instance
    service = new ClubService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncAllClubRosters()', () => {
    it('should sync all favorite clubs successfully', async () => {
      // Arrange
      const mockClubs = [
        {
          id: 11818,
          name: 'TeamNL Cloud9',
          source: 'favorite_rider',
          memberCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 22000,
          name: 'Test Club',
          source: 'favorite_rider',
          memberCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockFavoriteIds = [150437, 200000];

      const mockClubData = {
        id: 11818,
        name: 'TeamNL Cloud9',
        riders: [
          { zwiftId: 150437, name: 'Rider 1', clubId: 11818 },
          { zwiftId: 160000, name: 'Rider 2', clubId: 11818 },
          { zwiftId: 170000, name: 'Rider 3', clubId: 11818 },
        ],
      };

      mockClubRepo.getAllClubs.mockResolvedValue(mockClubs);
      mockRiderRepo.getFavoriteZwiftIds.mockResolvedValue(mockFavoriteIds);
      mockZwiftApi.getClubMembers.mockResolvedValue(mockClubData);
      mockClubMemberRepo.getFavoriteClubMembers.mockResolvedValue([
        { zwiftId: 150437, name: 'Rider 1' },
      ]);

      // Mock sleep to skip waiting
      vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      // Act
      const result = await service.syncAllClubRosters();

      // Assert
      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.totalMembers).toBe(6); // 3 members per club
      expect(result.clubs).toHaveLength(2);
      expect(result.clubs[0].success).toBe(true);
      expect(result.clubs[0].memberCount).toBe(3);
      expect(result.clubs[0].favoritesCount).toBe(1);

      // Verify API calls
      expect(mockZwiftApi.getClubMembers).toHaveBeenCalledTimes(2);
      expect(mockClubMemberRepo.upsertClubMembersBulk).toHaveBeenCalledTimes(2);
      expect(mockClubRepo.upsertClub).toHaveBeenCalledTimes(2);
    });

    it('should skip sync when no favorite clubs exist', async () => {
      // Arrange - only non-favorite clubs
      const mockClubs = [
        {
          id: 11818,
          name: 'TeamNL Cloud9',
          source: 'manual', // NOT favorite_rider
          memberCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockClubRepo.getAllClubs.mockResolvedValue(mockClubs);

      // Act
      const result = await service.syncAllClubRosters();

      // Assert
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.totalMembers).toBe(0);
      expect(result.clubs).toHaveLength(0);

      // Should not call API
      expect(mockZwiftApi.getClubMembers).not.toHaveBeenCalled();
    });

    it('should skip sync when no clubs exist', async () => {
      // Arrange
      mockClubRepo.getAllClubs.mockResolvedValue([]);

      // Act
      const result = await service.syncAllClubRosters();

      // Assert
      expect(result.synced).toBe(0);
      expect(result.clubs).toHaveLength(0);
    });

    it('should handle individual club sync failures gracefully', async () => {
      // Arrange
      const mockClubs = [
        {
          id: 11818,
          name: 'Success Club',
          source: 'favorite_rider',
          memberCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 22000,
          name: 'Fail Club',
          source: 'favorite_rider',
          memberCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockClubRepo.getAllClubs.mockResolvedValue(mockClubs);
      mockRiderRepo.getFavoriteZwiftIds.mockResolvedValue([150437]);

      // First club succeeds
      mockZwiftApi.getClubMembers
        .mockResolvedValueOnce({
          id: 11818,
          name: 'Success Club',
          riders: [{ zwiftId: 150437, name: 'Rider 1', clubId: 11818 }],
        })
        // Second club fails
        .mockRejectedValueOnce(new Error('API Error'));

      mockClubMemberRepo.getFavoriteClubMembers.mockResolvedValue([]);

      // Mock sleep
      vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      // Act
      const result = await service.syncAllClubRosters();

      // Assert
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.clubs).toHaveLength(2);
      expect(result.clubs[0].success).toBe(true);
      expect(result.clubs[1].success).toBe(false);
      expect(result.clubs[1].error).toBe('API Error');
    });

    it('should respect rate limiting between clubs', async () => {
      // Arrange
      const mockClubs = [
        {
          id: 11818,
          name: 'Club 1',
          source: 'favorite_rider',
          memberCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 22000,
          name: 'Club 2',
          source: 'favorite_rider',
          memberCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockClubRepo.getAllClubs.mockResolvedValue(mockClubs);
      mockRiderRepo.getFavoriteZwiftIds.mockResolvedValue([]);
      mockZwiftApi.getClubMembers.mockResolvedValue({
        id: 11818,
        name: 'Club',
        riders: [{ zwiftId: 150437, name: 'Rider', clubId: 11818 }],
      });

      // Spy on sleep method
      const sleepSpy = vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      // Act
      await service.syncAllClubRosters();

      // Assert - should call sleep once (between first and second club)
      expect(sleepSpy).toHaveBeenCalledTimes(1);
      expect(sleepSpy).toHaveBeenCalledWith(61 * 60 * 1000); // 61 minutes
    });

    it('should throw error if main sync fails', async () => {
      // Arrange
      mockClubRepo.getAllClubs.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.syncAllClubRosters()).rejects.toThrow('Database error');
    });
  });

  describe('syncClubRoster()', () => {
    it('should sync a club roster with members', async () => {
      // Arrange
      const clubId = 11818;
      const favoriteZwiftIds = [150437, 200000];

      const mockClubData = {
        id: clubId,
        name: 'TeamNL Cloud9',
        riders: [
          { zwiftId: 150437, name: 'Favorite Rider', clubId },
          { zwiftId: 160000, name: 'Regular Rider 1', clubId },
          { zwiftId: 200000, name: 'Favorite Rider 2', clubId },
        ],
      };

      mockZwiftApi.getClubMembers.mockResolvedValue(mockClubData);
      mockClubMemberRepo.getFavoriteClubMembers.mockResolvedValue([
        { zwiftId: 150437, name: 'Favorite Rider' },
        { zwiftId: 200000, name: 'Favorite Rider 2' },
      ]);

      // Act
      const result = await service.syncClubRoster(clubId, favoriteZwiftIds);

      // Assert
      expect(result.memberCount).toBe(3);
      expect(result.favoritesCount).toBe(2);

      // Verify repository calls
      expect(mockZwiftApi.getClubMembers).toHaveBeenCalledWith(clubId);
      expect(mockClubMemberRepo.upsertClubMembersBulk).toHaveBeenCalledWith(
        mockClubData.riders,
        clubId
      );
      expect(mockClubRepo.upsertClub).toHaveBeenCalledWith({
        id: clubId,
        name: 'TeamNL Cloud9',
        memberCount: 3,
      });
      expect(mockClubMemberRepo.updateFavoriteStatus).toHaveBeenCalledWith(
        clubId,
        favoriteZwiftIds
      );
    });

    it('should handle club with no members', async () => {
      // Arrange
      const clubId = 11818;
      mockZwiftApi.getClubMembers.mockResolvedValue({
        id: clubId,
        name: 'Empty Club',
        riders: [],
      });

      // Act
      const result = await service.syncClubRoster(clubId);

      // Assert
      expect(result.memberCount).toBe(0);
      expect(result.favoritesCount).toBe(0);

      // Should still save club but not members
      expect(mockClubMemberRepo.upsertClubMembersBulk).not.toHaveBeenCalled();
    });

    it('should handle null/undefined club data', async () => {
      // Arrange
      const clubId = 11818;
      mockZwiftApi.getClubMembers.mockResolvedValue(null);

      // Act
      const result = await service.syncClubRoster(clubId);

      // Assert
      expect(result.memberCount).toBe(0);
      expect(result.favoritesCount).toBe(0);
    });

    it('should sync without favorite tracking if no favoriteZwiftIds provided', async () => {
      // Arrange
      const clubId = 11818;
      const mockClubData = {
        id: clubId,
        name: 'Club',
        riders: [
          { zwiftId: 150437, name: 'Rider 1', clubId },
          { zwiftId: 160000, name: 'Rider 2', clubId },
        ],
      };

      mockZwiftApi.getClubMembers.mockResolvedValue(mockClubData);

      // Act
      const result = await service.syncClubRoster(clubId); // No favoriteZwiftIds

      // Assert
      expect(result.memberCount).toBe(2);
      expect(result.favoritesCount).toBe(0);

      // Should not update favorite status
      expect(mockClubMemberRepo.updateFavoriteStatus).not.toHaveBeenCalled();
      expect(mockClubMemberRepo.getFavoriteClubMembers).not.toHaveBeenCalled();
    });

    it('should not update favorites if favoriteZwiftIds is empty array', async () => {
      // Arrange
      const clubId = 11818;
      mockZwiftApi.getClubMembers.mockResolvedValue({
        id: clubId,
        name: 'Club',
        riders: [{ zwiftId: 150437, name: 'Rider', clubId }],
      });

      // Act
      const result = await service.syncClubRoster(clubId, []); // Empty array

      // Assert
      expect(result.favoritesCount).toBe(0);
      expect(mockClubMemberRepo.updateFavoriteStatus).not.toHaveBeenCalled();
    });
  });

  describe('syncSingleClub()', () => {
    it('should sync a single club successfully', async () => {
      // Arrange
      const clubId = 11818;
      mockRiderRepo.getFavoriteZwiftIds.mockResolvedValue([150437]);
      mockZwiftApi.getClubMembers.mockResolvedValue({
        id: clubId,
        name: 'TeamNL Cloud9',
        riders: [
          { zwiftId: 150437, name: 'Rider 1', clubId },
          { zwiftId: 160000, name: 'Rider 2', clubId },
        ],
      });
      mockClubRepo.getClub.mockResolvedValue({
        id: clubId,
        name: 'TeamNL Cloud9',
        memberCount: 2,
      });
      mockClubMemberRepo.getFavoriteClubMembers.mockResolvedValue([
        { zwiftId: 150437, name: 'Rider 1' },
      ]);

      // Act
      const result = await service.syncSingleClub(clubId);

      // Assert
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.totalMembers).toBe(2);
      expect(result.clubs).toHaveLength(1);
      expect(result.clubs[0].success).toBe(true);
      expect(result.clubs[0].clubName).toBe('TeamNL Cloud9');
      expect(result.clubs[0].memberCount).toBe(2);
      expect(result.clubs[0].favoritesCount).toBe(1);
    });

    it('should handle sync failure and return error result', async () => {
      // Arrange
      const clubId = 11818;
      mockRiderRepo.getFavoriteZwiftIds.mockResolvedValue([]);
      mockZwiftApi.getClubMembers.mockRejectedValue(new Error('Rate limit exceeded'));

      // Act
      const result = await service.syncSingleClub(clubId);

      // Assert
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.totalMembers).toBe(0);
      expect(result.clubs).toHaveLength(1);
      expect(result.clubs[0].success).toBe(false);
      expect(result.clubs[0].error).toBe('Rate limit exceeded');
    });

    it('should use club ID as name if club not found in DB', async () => {
      // Arrange
      const clubId = 99999;
      mockRiderRepo.getFavoriteZwiftIds.mockResolvedValue([]);
      mockZwiftApi.getClubMembers.mockResolvedValue({
        id: clubId,
        name: 'Unknown Club',
        riders: [{ zwiftId: 150437, name: 'Rider', clubId }],
      });
      mockClubRepo.getClub.mockResolvedValue(null); // Club not in DB yet
      mockClubMemberRepo.getFavoriteClubMembers.mockResolvedValue([]);

      // Act
      const result = await service.syncSingleClub(clubId);

      // Assert
      expect(result.clubs[0].clubName).toBe('Club 99999');
    });
  });

  describe('getAllTrackedClubMembers()', () => {
    it('should return all tracked club members', async () => {
      // Arrange
      const mockMembers = [
        { zwiftId: 150437, name: 'Rider 1', clubId: 11818 },
        { zwiftId: 160000, name: 'Rider 2', clubId: 11818 },
        { zwiftId: 170000, name: 'Rider 3', clubId: 22000 },
      ];

      mockClubMemberRepo.getAllTrackedRiders.mockResolvedValue(mockMembers);

      // Act
      const result = await service.getAllTrackedClubMembers();

      // Assert
      expect(result).toEqual(mockMembers);
      expect(result).toHaveLength(3);
      expect(mockClubMemberRepo.getAllTrackedRiders).toHaveBeenCalled();
    });
  });

  describe('getFavoriteClubMembers()', () => {
    it('should return favorite club members for specific club', async () => {
      // Arrange
      const clubId = 11818;
      const mockMembers = [
        { zwiftId: 150437, name: 'Favorite 1', clubId, isFavorite: true },
        { zwiftId: 160000, name: 'Favorite 2', clubId, isFavorite: true },
      ];

      mockClubMemberRepo.getFavoriteClubMembers.mockResolvedValue(mockMembers);

      // Act
      const result = await service.getFavoriteClubMembers(clubId);

      // Assert
      expect(result).toEqual(mockMembers);
      expect(result).toHaveLength(2);
      expect(mockClubMemberRepo.getFavoriteClubMembers).toHaveBeenCalledWith(clubId);
    });

    it('should return all favorite club members when no clubId specified', async () => {
      // Arrange
      const mockMembers = [
        { zwiftId: 150437, name: 'Favorite 1', clubId: 11818, isFavorite: true },
        { zwiftId: 160000, name: 'Favorite 2', clubId: 22000, isFavorite: true },
      ];

      mockClubMemberRepo.getFavoriteClubMembers.mockResolvedValue(mockMembers);

      // Act
      const result = await service.getFavoriteClubMembers();

      // Assert
      expect(result).toEqual(mockMembers);
      expect(mockClubMemberRepo.getFavoriteClubMembers).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Integration - Full workflow', () => {
    it('should complete full club sync workflow', async () => {
      // Arrange - simulate complete workflow
      const mockClubs = [
        {
          id: 11818,
          name: 'TeamNL Cloud9',
          source: 'favorite_rider',
          memberCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockFavoriteIds = [150437];

      const mockClubData = {
        id: 11818,
        name: 'TeamNL Cloud9',
        riders: [
          { zwiftId: 150437, name: 'Favorite Rider', clubId: 11818 },
          { zwiftId: 160000, name: 'Regular Rider', clubId: 11818 },
        ],
      };

      mockClubRepo.getAllClubs.mockResolvedValue(mockClubs);
      mockRiderRepo.getFavoriteZwiftIds.mockResolvedValue(mockFavoriteIds);
      mockZwiftApi.getClubMembers.mockResolvedValue(mockClubData);
      mockClubMemberRepo.getFavoriteClubMembers.mockResolvedValue([
        { zwiftId: 150437, name: 'Favorite Rider' },
      ]);
      mockClubMemberRepo.getAllTrackedRiders.mockResolvedValue(mockClubData.riders);

      // Mock sleep
      vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      // Act - run full workflow
      const syncResult = await service.syncAllClubRosters();
      const allMembers = await service.getAllTrackedClubMembers();
      const favorites = await service.getFavoriteClubMembers(11818);

      // Assert - verify workflow steps
      expect(syncResult.synced).toBe(1);
      expect(syncResult.totalMembers).toBe(2);
      expect(allMembers).toHaveLength(2);
      expect(favorites).toHaveLength(1);

      // Verify all repository methods called in correct order
      expect(mockClubRepo.getAllClubs).toHaveBeenCalled();
      expect(mockRiderRepo.getFavoriteZwiftIds).toHaveBeenCalled();
      expect(mockZwiftApi.getClubMembers).toHaveBeenCalled();
      expect(mockClubMemberRepo.upsertClubMembersBulk).toHaveBeenCalled();
      expect(mockClubRepo.upsertClub).toHaveBeenCalled();
      expect(mockClubMemberRepo.updateFavoriteStatus).toHaveBeenCalled();
    });
  });
});
