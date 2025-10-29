import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SubteamService } from '../../src/services/subteam.js';
import { ZwiftApiClient } from '../../src/api/zwift-client.js';
import { RiderRepository, ClubRepository } from '../../src/database/repositories.js';

// Mock dependencies
vi.mock('../../src/api/zwift-client.js');
vi.mock('../../src/database/repositories.js');
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('SubteamService', () => {
  let subteamService: SubteamService;
  let mockZwiftApi: any;
  let mockRiderRepo: any;
  let mockClubRepo: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock instances
    mockZwiftApi = {
      getRider: vi.fn(),
    };

    mockRiderRepo = {
      getRider: vi.fn(),
      isFavorite: vi.fn(),
      upsertRider: vi.fn().mockResolvedValue({ id: 1, zwiftId: 123456 }),
      getAllFavorites: vi.fn(),
      deleteRider: vi.fn().mockResolvedValue(true),
    };

    mockClubRepo = {
      upsertClub: vi.fn().mockResolvedValue({ id: 2281 }),
      getAllClubs: vi.fn().mockResolvedValue([]),
      updateClubSource: vi.fn().mockResolvedValue(true),
    };

    // Mock constructors
    vi.mocked(ZwiftApiClient).mockImplementation(() => mockZwiftApi);
    vi.mocked(RiderRepository).mockImplementation(() => mockRiderRepo);
    vi.mocked(ClubRepository).mockImplementation(() => mockClubRepo);

    subteamService = new SubteamService();
    
    // Mock sleep to avoid delays in tests
    (subteamService as any).sleep = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addFavorites', () => {
    it('should add new riders successfully', async () => {
      const zwiftIds = [123456];
      const mockRiderData = {
        riderId: 123456,
        name: 'Test Rider',
        ftp: 300,
        club: { id: 2281, name: 'TeamNL' },
        zpCategory: 'B',
        gender: 'M',
        country: 'nl',
        weight: 75,
        height: 180,
        power: {
          w5: 800,
          w15: 700,
          w30: 600,
          w60: 500,
          w120: 400,
          w300: 350,
          w1200: 310,
          wkg5: 10.67,
          wkg15: 9.33,
          wkg30: 8.0,
          wkg60: 6.67,
          wkg120: 5.33,
          wkg300: 4.67,
          wkg1200: 4.13,
          CP: 305,
          AWC: 15000,
          compoundScore: 1500,
          powerRating: 1600,
        },
        race: {
          wins: 5,
          podiums: 10,
          finishes: 50,
          dnfs: 2,
        },
        handicaps: {
          profile: {
            flat: -10.5,
            rolling: 5.2,
            hilly: 15.8,
            mountainous: 20.3,
          },
        },
      };

      mockRiderRepo.getRider.mockResolvedValue(null); // Rider doesn't exist
      mockZwiftApi.getRider.mockResolvedValue(mockRiderData);
      mockRiderRepo.upsertRider.mockResolvedValue({ id: 1, zwiftId: 123456 });
      mockClubRepo.upsertClub.mockResolvedValue({ id: 2281 });

      const result = await subteamService.addFavorites(zwiftIds);

      expect(result.added).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockZwiftApi.getRider).toHaveBeenCalledWith(123456);
      expect(mockRiderRepo.upsertRider).toHaveBeenCalled();
      expect(mockClubRepo.upsertClub).toHaveBeenCalledWith({
        id: 2281,
        name: 'TeamNL',
      });
    });

    it('should update existing riders', async () => {
      const zwiftIds = [123456];
      const existingRider = {
        id: 1,
        zwiftId: 123456,
        name: 'Test Rider',
        isFavorite: true,
        clubId: 2281,
        ftp: 280,
      };

      const updatedRiderData = {
        riderId: 123456,
        name: 'Test Rider',
        ftp: 300, // FTP increased
        club: { id: 2281, name: 'TeamNL' },
        zpCategory: 'B',
        gender: 'M',
        country: 'nl',
        weight: 75,
        height: 180,
        power: {
          w5: 800,
          w15: 700,
          w30: 600,
          w60: 500,
          w120: 400,
          w300: 350,
          w1200: 310,
          wkg5: 10.67,
          wkg15: 9.33,
          wkg30: 8.0,
          wkg60: 6.67,
          wkg120: 5.33,
          wkg300: 4.67,
          wkg1200: 4.13,
          CP: 305,
          AWC: 15000,
          compoundScore: 1500,
          powerRating: 1600,
        },
        race: {
          wins: 5,
          podiums: 10,
          finishes: 50,
          dnfs: 2,
        },
        handicaps: {
          profile: {
            flat: -10.5,
            rolling: 5.2,
            hilly: 15.8,
            mountainous: 20.3,
          },
        },
      };

      mockRiderRepo.getRider.mockResolvedValue(existingRider);
      mockZwiftApi.getRider.mockResolvedValue(updatedRiderData);
      mockRiderRepo.upsertRider.mockResolvedValue({ id: 1, zwiftId: 123456 });

      const result = await subteamService.addFavorites(zwiftIds);

      expect(result.added).toBe(0);
      expect(result.updated).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.riders[0].status).toBe('updated');
      expect(result.riders[0].clubChanged).toBeUndefined(); // Same club
    });

    it('should detect club changes', async () => {
      const zwiftIds = [123456];
      const existingRider = {
        id: 1,
        zwiftId: 123456,
        name: 'Test Rider',
        isFavorite: true,
        clubId: 2281, // Old club
        ftp: 300,
      };

      const updatedRiderData = {
        riderId: 123456,
        name: 'Test Rider',
        ftp: 300,
        club: { id: 9999, name: 'New Team' }, // New club!
        zpCategory: 'B',
        gender: 'M',
        country: 'nl',
        weight: 75,
        height: 180,
        power: {
          w5: 800,
          w15: 700,
          w30: 600,
          w60: 500,
          w120: 400,
          w300: 350,
          w1200: 310,
          wkg5: 10.67,
          wkg15: 9.33,
          wkg30: 8.0,
          wkg60: 6.67,
          wkg120: 5.33,
          wkg300: 4.67,
          wkg1200: 4.13,
          CP: 305,
          AWC: 15000,
          compoundScore: 1500,
          powerRating: 1600,
        },
        race: {
          wins: 5,
          podiums: 10,
          finishes: 50,
          dnfs: 2,
        },
        handicaps: {
          profile: {
            flat: -10.5,
            rolling: 5.2,
            hilly: 15.8,
            mountainous: 20.3,
          },
        },
      };

      mockRiderRepo.getRider.mockResolvedValue(existingRider);
      mockZwiftApi.getRider.mockResolvedValue(updatedRiderData);
      mockRiderRepo.upsertRider.mockResolvedValue({ id: 1, zwiftId: 123456 });
      mockClubRepo.upsertClub.mockResolvedValue({ id: 9999 });

      const result = await subteamService.addFavorites(zwiftIds);

      expect(result.updated).toBe(1);
      expect(result.riders[0].clubChanged).toBe(true);
      expect(mockClubRepo.upsertClub).toHaveBeenCalledWith({
        id: 9999,
        name: 'New Team',
      });
    });

    it('should handle API errors gracefully', async () => {
      const zwiftIds = [123456, 789012];

      mockRiderRepo.getRider.mockResolvedValue(null);
      mockZwiftApi.getRider
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          riderId: 789012,
          name: 'Working Rider',
          ftp: 300,
          zpCategory: 'B',
          gender: 'M',
          country: 'nl',
          weight: 75,
          height: 180,
          power: {
            w5: 800,
            w15: 700,
            w30: 600,
            w60: 500,
            w120: 400,
            w300: 350,
            w1200: 310,
            wkg5: 10.67,
            wkg15: 9.33,
            wkg30: 8.0,
            wkg60: 6.67,
            wkg120: 5.33,
            wkg300: 4.67,
            wkg1200: 4.13,
            CP: 305,
            AWC: 15000,
            compoundScore: 1500,
            powerRating: 1600,
          },
          race: {
            wins: 5,
            podiums: 10,
            finishes: 50,
            dnfs: 2,
          },
          handicaps: {
            profile: {
              flat: -10.5,
              rolling: 5.2,
              hilly: 15.8,
              mountainous: 20.3,
            },
          },
        });

      mockRiderRepo.upsertRider.mockResolvedValue({ id: 2, zwiftId: 789012 });

      const result = await subteamService.addFavorites(zwiftIds);

      expect(result.added).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.riders[0].status).toBe('failed');
      expect(result.riders[1].status).toBe('added');
    });

    it('should extract club automatically', async () => {
      const zwiftIds = [123456];
      const mockRiderData = {
        riderId: 123456,
        name: 'Test Rider',
        ftp: 300,
        club: { id: 2281, name: 'TeamNL' },
        zpCategory: 'B',
        gender: 'M',
        country: 'nl',
        weight: 75,
        height: 180,
        power: {
          w5: 800,
          w15: 700,
          w30: 600,
          w60: 500,
          w120: 400,
          w300: 350,
          w1200: 310,
          wkg5: 10.67,
          wkg15: 9.33,
          wkg30: 8.0,
          wkg60: 6.67,
          wkg120: 5.33,
          wkg300: 4.67,
          wkg1200: 4.13,
          CP: 305,
          AWC: 15000,
          compoundScore: 1500,
          powerRating: 1600,
        },
        race: {
          wins: 5,
          podiums: 10,
          finishes: 50,
          dnfs: 2,
        },
        handicaps: {
          profile: {
            flat: -10.5,
            rolling: 5.2,
            hilly: 15.8,
            mountainous: 20.3,
          },
        },
      };

      mockRiderRepo.getRider.mockResolvedValue(null);
      mockZwiftApi.getRider.mockResolvedValue(mockRiderData);
      mockRiderRepo.upsertRider.mockResolvedValue({ id: 1, zwiftId: 123456 });
      mockClubRepo.upsertClub.mockResolvedValue({ id: 2281 });

      await subteamService.addFavorites(zwiftIds);

      // Verify club extraction was called with club object
      expect(mockClubRepo.upsertClub).toHaveBeenCalledWith({
        id: 2281,
        name: 'TeamNL',
      });
    });
  });

  describe('removeFavorite', () => {
    it('should remove a favorite rider', async () => {
      const zwiftId = 123456;
      mockRiderRepo.deleteRider.mockResolvedValue(true);

      await subteamService.removeFavorite(zwiftId);

      expect(mockRiderRepo.deleteRider).toHaveBeenCalledWith(zwiftId);
    });
  });

  describe('listFavorites', () => {
    it('should return all favorites', async () => {
      const mockFavorites = [
        { zwiftId: 123456, name: 'Rider 1', ftp: 300 },
        { zwiftId: 789012, name: 'Rider 2', ftp: 320 },
      ];

      mockRiderRepo.getAllFavorites.mockResolvedValue(mockFavorites);

      const result = await subteamService.listFavorites();

      expect(result).toEqual(mockFavorites);
      expect(mockRiderRepo.getAllFavorites).toHaveBeenCalled();
    });
  });
});
