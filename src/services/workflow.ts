/**
 * Workflow Service - Production Workflow Implementation
 * 
 * Manages the complete workflow:
 * 1. Add favorite riders (subteam) by ZwiftID
 * 2. Store all rider details in appropriate tables
 * 3. Get list of clubs where favorites ride
 * 4. Track selected clubs and sync all their members
 * 5. Sync events for favorites (90 days lookback)
 * 6. Sync events for club members (24 hours lookback)
 * 7. Cleanup events older than 100 days
 */

import { logger } from '../utils/logger.js';
import { ZwiftApiClient } from '../api/zwift-client.js';
import { RiderRepository, ClubRepository, ClubMemberRepository, EventRepository, ResultRepository } from '../database/repositories.js';
import prisma from '../database/client.js';
import type { RaceResultData } from '../types/api.types.js';

export class WorkflowService {
  private apiClient: ZwiftApiClient;
  private riderRepo: RiderRepository;
  private clubRepo: ClubRepository;
  private clubMemberRepo: ClubMemberRepository;
  private eventRepo: EventRepository;
  private resultRepo: ResultRepository;

  constructor() {
    this.apiClient = new ZwiftApiClient();
    this.riderRepo = new RiderRepository();
    this.clubRepo = new ClubRepository();
    this.clubMemberRepo = new ClubMemberRepository();
    this.eventRepo = new EventRepository();
    this.resultRepo = new ResultRepository();
  }

  /**
   * Step 1 & 2: Add favorite rider(s) and store all details
   */
  async addFavoriteRider(zwiftId: number, priority: 1 | 2 | 3 | 4 = 1, addedBy = 'manual'): Promise<any> {
    logger.info(`Adding favorite rider ${zwiftId} with priority ${priority}`);
    
    try {
      // Fetch rider data from API
      const riderData = await this.apiClient.getRider(zwiftId);
      
      // Store in riders table as favorite
      const rider = await this.riderRepo.upsertRider(riderData, undefined, {
        isFavorite: true,
        syncPriority: priority,
        addedBy,
        syncEnabled: true,
      });
      
      logger.info(`Favorite rider ${zwiftId} (${rider.name}) added successfully`);
      return rider;
    } catch (error) {
      logger.error(`Failed to add favorite rider ${zwiftId}:`, error);
      throw error;
    }
  }

  /**
   * Step 1 (bulk): Add multiple favorite riders at once
   */
  async addFavoriteRidersBulk(zwiftIds: number[], priority: 1 | 2 | 3 | 4 = 1, addedBy = 'manual'): Promise<any[]> {
    logger.info(`Adding ${zwiftIds.length} favorite riders in bulk`);
    
    const results = [];
    for (const zwiftId of zwiftIds) {
      try {
        const rider = await this.addFavoriteRider(zwiftId, priority, addedBy);
        results.push({ zwiftId, success: true, rider });
      } catch (error) {
        logger.error(`Failed to add rider ${zwiftId}:`, error);
        results.push({ zwiftId, success: false, error: (error as Error).message });
      }
    }
    
    return results;
  }

  /**
   * Step 3: Get list of clubs where favorite riders are members
   */
  async getClubsOfFavorites(): Promise<Array<{ clubId: number; clubName: string; riderCount: number; riders: any[] }>> {
    logger.info('Getting clubs where favorite riders are members');
    
    // Get all favorite riders with their clubId
    const favorites = await prisma.rider.findMany({
      where: { 
        isFavorite: true,
        clubId: { not: null }
      },
      select: {
        zwiftId: true,
        name: true,
        clubId: true,
      }
    });

    // Group by clubId
    const clubMap = new Map<number, { riders: any[] }>();
    
    for (const rider of favorites) {
      if (!rider.clubId) continue;
      
      if (!clubMap.has(rider.clubId)) {
        clubMap.set(rider.clubId, { riders: [] });
      }
      clubMap.get(rider.clubId)!.riders.push({
        zwiftId: rider.zwiftId,
        name: rider.name,
      });
    }

    // Get club details
    const result = [];
    for (const [clubId, data] of clubMap.entries()) {
      let clubName = 'Unknown Club';
      
      // Try to get club from database
      const club = await this.clubRepo.getClub(clubId);
      if (club) {
        clubName = club.name || `Club ${clubId}`;
      } else {
        // Try to fetch from API
        try {
          const clubData = await this.apiClient.getClubMembers(clubId);
          clubName = clubData.name;
          
          // Store club for future reference
          await this.clubRepo.upsertClub({
            id: clubId,
            name: clubName,
            memberCount: clubData.riders.length,
            source: 'favorites',
            syncEnabled: false, // Not tracked by default
          });
        } catch (error) {
          logger.warn(`Could not fetch club ${clubId} details:`, error);
        }
      }
      
      result.push({
        clubId,
        clubName,
        riderCount: data.riders.length,
        riders: data.riders,
      });
    }
    
    logger.info(`Found ${result.length} clubs with favorite riders`);
    return result;
  }

  /**
   * Step 4: Enable tracking for selected clubs (sync all members)
   */
  async enableClubTracking(clubId: number, enabled = true): Promise<void> {
    logger.info(`${enabled ? 'Enabling' : 'Disabling'} tracking for club ${clubId}`);
    
    await this.clubRepo.updateClub(clubId, {
      syncEnabled: enabled,
      isFavorite: enabled,
    });
    
    if (enabled) {
      // Immediately sync club members
      await this.syncClubMembers(clubId);
    }
  }

  /**
   * Step 4 (helper): Sync all members of a club
   */
  async syncClubMembers(clubId: number): Promise<{ synced: number; errors: number }> {
    logger.info(`Syncing members for club ${clubId}`);
    
    try {
      const clubData = await this.apiClient.getClubMembers(clubId);
      
      // Update club info
      await this.clubRepo.upsertClub({
        id: clubId,
        name: clubData.name,
        memberCount: clubData.riders.length,
        source: 'tracked',
      });
      
      // Sync all members
      const results = await this.clubMemberRepo.upsertClubMembersBulk(clubData.riders, clubId);
      
      logger.info(`Synced ${results.created + results.updated} members for club ${clubId}`);
      return { synced: results.created + results.updated, errors: results.failed };
    } catch (error) {
      logger.error(`Failed to sync club ${clubId} members:`, error);
      throw error;
    }
  }

  /**
   * Step 5: Sync events for favorite riders (90 days lookback)
   */
  async syncFavoriteRiderEvents(zwiftId: number, daysLookback = 90): Promise<{ events: number; results: number }> {
    logger.info(`Syncing events for favorite rider ${zwiftId} (${daysLookback} days lookback)`);
    
    try {
      // Get rider results from API
      const results = await this.apiClient.getRiderResults(zwiftId);
      
      if (results.length === 0) {
        logger.info(`No results found for rider ${zwiftId}`);
        return { events: 0, results: 0 };
      }
      
      // Filter by date (90 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysLookback);
      
      const recentResults = results.filter(r => {
        const eventDate = new Date(r.event.eventDate);
        return eventDate >= cutoffDate;
      });
      
      logger.info(`Found ${recentResults.length} results in last ${daysLookback} days for rider ${zwiftId}`);
      
      // Store events and results
      let eventsStored = 0;
      let resultsStored = 0;
      
      for (const result of recentResults) {
        try {
          // Store event
          await this.eventRepo.upsertEvent(result.event);
          eventsStored++;
          
          // Store result (link to rider)
          const rider = await this.riderRepo.getRider(zwiftId);
          if (rider) {
            await this.resultRepo.upsertResult(result, rider.id, undefined, result.event.eventId);
            resultsStored++;
          }
        } catch (error) {
          logger.warn(`Failed to store result for rider ${zwiftId}, event ${result.event.eventId}:`, error);
        }
      }
      
      logger.info(`Stored ${eventsStored} events and ${resultsStored} results for rider ${zwiftId}`);
      return { events: eventsStored, results: resultsStored };
    } catch (error) {
      logger.error(`Failed to sync events for rider ${zwiftId}:`, error);
      throw error;
    }
  }

  /**
   * Step 5 (bulk): Sync events for all favorite riders
   */
  async syncAllFavoriteRiderEvents(daysLookback = 90): Promise<{ processed: number; events: number; results: number }> {
    logger.info(`Syncing events for all favorite riders (${daysLookback} days lookback)`);
    
    const favorites = await prisma.rider.findMany({
      where: { isFavorite: true },
      select: { zwiftId: true, name: true }
    });
    
    logger.info(`Found ${favorites.length} favorite riders to sync`);
    
    let totalEvents = 0;
    let totalResults = 0;
    
    for (const rider of favorites) {
      try {
        const { events, results } = await this.syncFavoriteRiderEvents(rider.zwiftId, daysLookback);
        totalEvents += events;
        totalResults += results;
        
        // Rate limiting: wait 12 seconds between riders (5 per minute)
        if (favorites.indexOf(rider) < favorites.length - 1) {
          await this.sleep(12000);
        }
      } catch (error) {
        logger.error(`Failed to sync events for favorite ${rider.zwiftId} (${rider.name}):`, error);
      }
    }
    
    logger.info(`Synced ${totalEvents} events and ${totalResults} results for ${favorites.length} favorites`);
    return { processed: favorites.length, events: totalEvents, results: totalResults };
  }

  /**
   * Step 6: Sync events for club members (24 hours lookback)
   */
  async syncClubMemberEvents(clubId: number, hoursLookback = 24): Promise<{ processed: number; events: number; results: number }> {
    logger.info(`Syncing events for club ${clubId} members (${hoursLookback} hours lookback)`);
    
    // Get all club members
    const members = await prisma.clubMember.findMany({
      where: { clubId },
      select: { zwiftId: true, name: true }
    });
    
    logger.info(`Found ${members.length} members in club ${clubId}`);
    
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursLookback);
    
    let totalEvents = 0;
    let totalResults = 0;
    
    for (const member of members) {
      try {
        // Get rider results
        const results = await this.apiClient.getRiderResults(member.zwiftId);
        
        // Filter by date (24 hours)
        const recentResults = results.filter(r => {
          const eventDate = new Date(r.event.eventDate);
          return eventDate >= cutoffDate;
        });
        
        if (recentResults.length === 0) continue;
        
        // Store events and results
        for (const result of recentResults) {
          try {
            await this.eventRepo.upsertEvent(result.event);
            totalEvents++;
            
            // Find club member record
            const clubMember = await prisma.clubMember.findFirst({
              where: { zwiftId: member.zwiftId, clubId }
            });
            
            if (clubMember) {
              await this.resultRepo.upsertResult(result, undefined, clubMember.id, result.event.eventId);
              totalResults++;
            }
          } catch (error) {
            logger.warn(`Failed to store result for club member ${member.zwiftId}:`, error);
          }
        }
        
        // Rate limiting: 5 riders per minute
        if (members.indexOf(member) < members.length - 1) {
          await this.sleep(12000);
        }
      } catch (error) {
        logger.error(`Failed to sync events for club member ${member.zwiftId}:`, error);
      }
    }
    
    logger.info(`Synced ${totalEvents} events and ${totalResults} results for club ${clubId}`);
    return { processed: members.length, events: totalEvents, results: totalResults };
  }

  /**
   * Step 6 (all clubs): Sync events for all tracked clubs
   */
  async syncAllClubMemberEvents(hoursLookback = 24): Promise<{ clubs: number; processed: number; events: number; results: number }> {
    logger.info(`Syncing events for all tracked clubs (${hoursLookback} hours lookback)`);
    
    const clubs = await prisma.club.findMany({
      where: { syncEnabled: true },
      select: { id: true, name: true }
    });
    
    logger.info(`Found ${clubs.length} tracked clubs`);
    
    let totalProcessed = 0;
    let totalEvents = 0;
    let totalResults = 0;
    
    for (const club of clubs) {
      try {
        const { processed, events, results } = await this.syncClubMemberEvents(club.id, hoursLookback);
        totalProcessed += processed;
        totalEvents += events;
        totalResults += results;
      } catch (error) {
        logger.error(`Failed to sync club ${club.id} (${club.name}) member events:`, error);
      }
    }
    
    logger.info(`Synced ${totalEvents} events and ${totalResults} results from ${clubs.length} clubs`);
    return { clubs: clubs.length, processed: totalProcessed, events: totalEvents, results: totalResults };
  }

  /**
   * Step 7: Cleanup events older than specified days
   */
  async cleanupOldEvents(daysThreshold = 100): Promise<{ eventsDeleted: number; resultsDeleted: number }> {
    logger.info(`Cleaning up events older than ${daysThreshold} days`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
    
    try {
      // Delete old results first (foreign key constraint)
      const resultsDeleted = await prisma.raceResult.deleteMany({
        where: {
          event: {
            eventDate: { lt: cutoffDate }
          }
        }
      });
      
      // Delete old events
      const eventsDeleted = await prisma.event.deleteMany({
        where: {
          eventDate: { lt: cutoffDate }
        }
      });
      
      logger.info(`Cleaned up ${eventsDeleted.count} events and ${resultsDeleted.count} results older than ${daysThreshold} days`);
      return { eventsDeleted: eventsDeleted.count, resultsDeleted: resultsDeleted.count };
    } catch (error) {
      logger.error('Failed to cleanup old events:', error);
      throw error;
    }
  }

  /**
   * Complete workflow: Run all steps for a favorite rider
   */
  async runCompleteWorkflowForRider(zwiftId: number): Promise<any> {
    logger.info(`Running complete workflow for rider ${zwiftId}`);
    
    const results: any = {
      zwiftId,
      steps: {}
    };
    
    try {
      // Step 1 & 2: Add as favorite
      results.steps.addFavorite = await this.addFavoriteRider(zwiftId);
      
      // Step 3: Get clubs
      const clubs = await this.getClubsOfFavorites();
      results.steps.clubs = clubs;
      
      // Step 4: Enable tracking for clubs (if any)
      if (clubs.length > 0) {
        for (const club of clubs) {
          try {
            await this.enableClubTracking(club.clubId, true);
          } catch (error) {
            logger.warn(`Could not enable tracking for club ${club.clubId}:`, error);
          }
        }
      }
      
      // Step 5: Sync rider events (90 days)
      results.steps.riderEvents = await this.syncFavoriteRiderEvents(zwiftId, 90);
      
      // Step 6: Sync club member events (24 hours) - if clubs exist
      if (clubs.length > 0) {
        results.steps.clubEvents = [];
        for (const club of clubs) {
          try {
            const clubResults = await this.syncClubMemberEvents(club.clubId, 24);
            results.steps.clubEvents.push({ clubId: club.clubId, ...clubResults });
          } catch (error) {
            logger.warn(`Could not sync club ${club.clubId} events:`, error);
          }
        }
      }
      
      // Step 7: Cleanup old events
      results.steps.cleanup = await this.cleanupOldEvents(100);
      
      logger.info(`Completed workflow for rider ${zwiftId}`);
      return results;
    } catch (error) {
      logger.error(`Workflow failed for rider ${zwiftId}:`, error);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const workflowService = new WorkflowService();
