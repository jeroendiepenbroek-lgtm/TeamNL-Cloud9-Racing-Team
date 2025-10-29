import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventService } from '../../src/services/event.js';
import { ZwiftApiClient } from '../../src/api/zwift-client.js';
import {
  EventRepository,
  ResultRepository,
  RiderRepository,
  ClubMemberRepository,
  ClubRepository,
} from '../../src/database/repositories.js';

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

describe('EventService', () => {
  let eventService: EventService;
  let mockZwiftApi: any;
  let mockEventRepo: any;
  let mockResultRepo: any;
  let mockRiderRepo: any;
  let mockClubMemberRepo: any;
  let mockClubRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();

        // Setup mock instances
    mockZwiftApi = {
      getResults: vi.fn(),
    };

    mockEventRepo = {
      getLastEventId: vi.fn(),
      upsertEvent: vi.fn(),
      softDeleteOldEvents: vi.fn().mockResolvedValue(0),
      deleteArchivedResults: vi.fn().mockResolvedValue(0),
      getEventsWithTrackedRiders: vi.fn(),
    };

    mockResultRepo = {
      upsertResult: vi.fn(),
      upsertRaceResultsBulk: vi.fn(),
      deleteArchivedResults: vi.fn(),
    };

    mockRiderRepo = {
      getFavoriteZwiftIds: vi.fn().mockResolvedValue([]),
    };

    mockClubMemberRepo = {
      getAllTrackedRiders: vi.fn().mockResolvedValue([]),
    };

    mockClubRepo = {
      getAllClubs: vi.fn().mockResolvedValue([]),
    };

    // Mock constructors
    vi.mocked(ZwiftApiClient).mockImplementation(() => mockZwiftApi);
    vi.mocked(EventRepository).mockImplementation(() => mockEventRepo);
    vi.mocked(ResultRepository).mockImplementation(() => mockResultRepo);
    vi.mocked(RiderRepository).mockImplementation(() => mockRiderRepo);
    vi.mocked(ClubMemberRepository).mockImplementation(() => mockClubMemberRepo);
    vi.mocked(ClubRepository).mockImplementation(() => mockClubRepo);

    eventService = new EventService();
    
    // Mock sleep to avoid delays in tests
    (eventService as any).sleep = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('forwardScan', () => {
    it('should scan events and save results with tracked riders', async () => {
      const trackedZwiftIds = [123456, 789012];
      const mockResults = [
        {
          riderId: 123456, // Tracked rider!
          name: 'Tracked Rider 1',
          position: 1,
          time: 2400,
          averageWkg: 4.5,
          averagePower: 320,
        },
        {
          riderId: 999999, // Not tracked
          name: 'Random Rider',
          position: 2,
          time: 2450,
          averageWkg: 4.2,
          averagePower: 300,
        },
        {
          riderId: 789012, // Tracked rider!
          name: 'Tracked Rider 2',
          position: 3,
          time: 2500,
          averageWkg: 4.0,
          averagePower: 280,
        },
      ];

      mockEventRepo.getLastEventId.mockResolvedValue(4879989);
      mockRiderRepo.getFavoriteZwiftIds.mockResolvedValue([123456]);
      mockClubRepo.getAllClubs.mockResolvedValue([
        { id: 2281, source: 'favorite_rider' },
      ]);
      mockClubMemberRepo.getAllTrackedRiders.mockResolvedValue([789012]); // Just ZwiftIDs
      mockZwiftApi.getResults.mockResolvedValue(mockResults);
      mockEventRepo.upsertEvent.mockResolvedValue({ id: 4879990 });
      mockResultRepo.upsertResult.mockResolvedValue({ id: 1 });

      const result = await eventService.forwardScan({ maxEvents: 1 });

      expect(result.scanned).toBe(1);
      expect(result.found).toBe(1); // 1 event with tracked riders
      expect(result.saved).toBe(1);
      expect(mockZwiftApi.getResults).toHaveBeenCalledWith(4879990);
      expect(mockEventRepo.upsertEvent).toHaveBeenCalled();
      expect(mockResultRepo.upsertResult).toHaveBeenCalled();
    });

    it('should skip events without tracked riders', async () => {
      const mockResults = [
        {
          riderId: 999999, // Not tracked
          name: 'Random Rider 1',
          position: 1,
          time: 2400,
          averageWkg: 4.5,
          averagePower: 320,
        },
        {
          riderId: 888888, // Not tracked
          name: 'Random Rider 2',
          position: 2,
          time: 2450,
          averageWkg: 4.2,
          averagePower: 300,
        },
      ];

      mockEventRepo.getLastEventId.mockResolvedValue(4879989);
      mockRiderRepo.getFavoriteZwiftIds.mockResolvedValue([123456]);
      mockClubRepo.getAllClubs.mockResolvedValue([]);
      mockClubMemberRepo.getAllTrackedRiders.mockResolvedValue([]);
      mockZwiftApi.getResults.mockResolvedValue(mockResults);

      const result = await eventService.forwardScan({ maxEvents: 1 });

      expect(result.scanned).toBe(1);
      expect(result.found).toBe(0); // No tracked riders
      expect(result.saved).toBe(0);
      expect(mockEventRepo.upsertEvent).not.toHaveBeenCalled();
    });

    it('should handle multiple events', async () => {
      mockEventRepo.getLastEventId.mockResolvedValue(4879989);
      mockRiderRepo.getFavoriteZwiftIds.mockResolvedValue([123456]);
      mockClubRepo.getAllClubs.mockResolvedValue([]);
      mockClubMemberRepo.getAllTrackedRiders.mockResolvedValue([]);
      
      // First event has tracked riders
      const mockResults1 = [
        {
          riderId: 123456, // Tracked
          name: 'Tracked Rider',
          position: 1,
          time: 2400,
          averageWkg: 4.5,
          averagePower: 320,
        },
      ];
      
      // Second event has no tracked riders
      const mockResults2 = [
        {
          riderId: 999999, // Not tracked
          name: 'Random Rider',
          position: 1,
          time: 3000,
          averageWkg: 5.0,
          averagePower: 380,
        },
      ];

      mockZwiftApi.getResults
        .mockResolvedValueOnce(mockResults1)
        .mockResolvedValueOnce(mockResults2);
      mockEventRepo.upsertEvent.mockResolvedValue({ id: 4879990 });
      mockResultRepo.upsertResult.mockResolvedValue({ id: 1 });
      
      // Mock sleep to avoid waiting
      vi.spyOn(eventService as any, 'sleep').mockResolvedValue(undefined);

      const result = await eventService.forwardScan({ maxEvents: 2 });

      expect(result.scanned).toBe(2);
      expect(result.found).toBe(1); // Only event1 has tracked riders
      expect(result.saved).toBe(1);
    });

    it('should handle API errors gracefully', async () => {
      mockEventRepo.getLastEventId.mockResolvedValue(4879989);
      mockRiderRepo.getFavoriteZwiftIds.mockResolvedValue([123456]);
      mockClubRepo.getAllClubs.mockResolvedValue([]);
      mockClubMemberRepo.getAllTrackedRiders.mockResolvedValue([]);
      mockZwiftApi.getResults.mockRejectedValue(new Error('API Error'));

      const result = await eventService.forwardScan({ maxEvents: 1 });

      expect(result.scanned).toBe(1);
      expect(result.found).toBe(0);
      expect(result.saved).toBe(0);
      // Should continue despite error
    });

    it('should respect rate limiting', async () => {
      mockEventRepo.getLastEventId.mockResolvedValue(4879989);
      mockRiderRepo.getFavoriteZwiftIds.mockResolvedValue([123456]);
      mockClubRepo.getAllClubs.mockResolvedValue([]);
      mockClubMemberRepo.getAllTrackedRiders.mockResolvedValue([]);
      
      // Mock both events with tracked results
      const mockResultsWithTracked = [
        {
          riderId: 123456, // Tracked!
          name: 'Tracked Rider',
          position: 1,
          time: 2400,
          averageWkg: 4.5,
          averagePower: 320,
        },
      ];
      
      mockZwiftApi.getResults
        .mockResolvedValueOnce(mockResultsWithTracked)
        .mockResolvedValueOnce(mockResultsWithTracked);
      
      mockEventRepo.upsertEvent.mockResolvedValue({ id: 4879990 });
      mockResultRepo.upsertResult.mockResolvedValue({ id: 1 });

      // Spy on sleep method before scanning
      const sleepSpy = vi.spyOn(eventService as any, 'sleep').mockResolvedValue(undefined);

      await eventService.forwardScan({ maxEvents: 2 });

      // Should have called sleep once (between 2 events, not after last)
      expect(sleepSpy).toHaveBeenCalledTimes(1);
      expect(sleepSpy).toHaveBeenCalledWith(61000); // 61 seconds

      sleepSpy.mockRestore();
    });

    it('should perform cleanup after scan', async () => {
      mockEventRepo.getLastEventId.mockResolvedValue(4879989);
      mockRiderRepo.getFavoriteZwiftIds.mockResolvedValue([123456]);
      mockClubRepo.getAllClubs.mockResolvedValue([]);
      mockClubMemberRepo.getAllTrackedRiders.mockResolvedValue([]);
      
      // Mock event with tracked results
      mockZwiftApi.getResults.mockResolvedValue([
        {
          riderId: 123456, // Tracked!
          name: 'Tracked Rider',
          position: 1,
          time: 2400,
          averageWkg: 4.5,
          averagePower: 320,
        },
      ]);
      
      mockEventRepo.upsertEvent.mockResolvedValue({ id: 4879990 });
      mockResultRepo.upsertResult.mockResolvedValue({ id: 1 });
      mockEventRepo.softDeleteOldEvents.mockResolvedValue(5);
      mockEventRepo.deleteArchivedResults.mockResolvedValue(10); // deleteArchivedResults is on EventRepo

      await eventService.forwardScan({ maxEvents: 1, retentionDays: 100 });

      expect(mockEventRepo.softDeleteOldEvents).toHaveBeenCalledWith(100);
      expect(mockEventRepo.deleteArchivedResults).toHaveBeenCalledWith(7); // 7 day grace period
    });
  });

  describe('getTrackedEvents', () => {
    it('should return tracked events', async () => {
      const trackedRiders = [123456, 789012];
      mockRiderRepo.getFavoriteZwiftIds.mockResolvedValue([123456]);
      mockClubMemberRepo.getAllTrackedRiders.mockResolvedValue([789012]);

      const mockEvents = [
        {
          id: 4879990,
          name: 'Event 1',
          eventDate: '2025-10-27T10:00:00Z',
        },
        {
          id: 4879991,
          name: 'Event 2',
          eventDate: '2025-10-27T11:00:00Z',
        },
      ];

      mockEventRepo.getEventsWithTrackedRiders.mockResolvedValue(mockEvents);

      const result = await eventService.getTrackedEvents(10);

      expect(result).toEqual(mockEvents);
      // Should call with array of tracked rider IDs + limit
      expect(mockEventRepo.getEventsWithTrackedRiders).toHaveBeenCalledWith(
        expect.arrayContaining([123456, 789012]),
        10
      );
    });
  });

  describe('tracked riders calculation', () => {
    it('should combine favorites and club members', async () => {
      // Setup tracked riders: 2 favorites + 2 club members (1 overlap)
      mockRiderRepo.getFavoriteZwiftIds.mockResolvedValue([123456, 789012]);
      mockClubRepo.getAllClubs.mockResolvedValue([
        { id: 2281, source: 'favorite_rider' },
      ]);
      mockClubMemberRepo.getAllTrackedRiders.mockResolvedValue([
        789012, // Overlap with favorite
        111111,
      ]);

      mockEventRepo.getLastEventId.mockResolvedValue(4879989);
      mockZwiftApi.getResults.mockResolvedValue([
        { 
          riderId: 123456, 
          name: 'Favorite 1', 
          position: 1, 
          time: 2400, 
          averageWkg: 4.5, 
          averagePower: 320 
        },
        { 
          riderId: 111111, 
          name: 'Club Member', 
          position: 2, 
          time: 2450, 
          averageWkg: 4.2, 
          averagePower: 300 
        },
      ]);
      mockEventRepo.upsertEvent.mockResolvedValue({ id: 4879990 });
      mockResultRepo.upsertResult.mockResolvedValue({ id: 1 });

      const result = await eventService.forwardScan({ maxEvents: 1 });

      // Should find event with both tracked riders (1 favorite + 1 club member)
      expect(result.found).toBe(1);
      expect(result.saved).toBe(1);
      // Should have saved 2 results (both riders)
      expect(mockResultRepo.upsertResult).toHaveBeenCalledTimes(2);
    });
  });
});
