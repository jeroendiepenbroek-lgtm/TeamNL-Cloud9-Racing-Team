import axios from 'axios';
import { RiderRepository, ResultRepository } from '../database/repositories-mvp.js';
import { ZwiftApiClient } from '../api/zwift-client.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

// Note: TeamRepository doesn't exist in MVP schema - team features disabled

/**
 * TeamService - Orchestrates team management operations
 * 
 * Features:
 * - Add riders (single & bulk) to team
 * - Auto-fetch rider data, club, and 90-day race history
 * - Rate-limit aware with retry logic
 * - Sync status tracking per team member
 */
export class TeamService {
  private teamRepo: TeamRepository;
  private riderRepo: RiderRepository;
  private resultRepo: ResultRepository;
  private apiClient: ZwiftApiClient;

  constructor() {
    this.teamRepo = new TeamRepository();
    this.riderRepo = new RiderRepository();
    this.resultRepo = new ResultRepository();
    
    this.apiClient = new ZwiftApiClient({
      apiKey: config.zwiftApiKey,
      baseUrl: config.zwiftApiBaseUrl,
    });
  }

  /**
   * Create a new team
   */
  async createTeam(data: {
    name: string;
    description?: string;
    autoSyncEnabled?: boolean;
    syncIntervalMinutes?: number;
  }) {
    logger.info(`👥 Creating team: ${data.name}`);
    
    try {
      const team = await this.teamRepo.createTeam(data);
      logger.info(`✓ Team created: ${team.id} - ${team.name}`);
      return team;
    } catch (error) {
      logger.error(`❌ Failed to create team`, error);
      throw error;
    }
  }

  /**
   * Add a single rider to team and sync their data
   */
  async addMember(teamId: number, zwiftId: number, role: string = 'member', notes?: string) {
    logger.info(`👤 Adding rider ${zwiftId} to team ${teamId}`);

    try {
      // Check if rider already in team
      const exists = await this.teamRepo.isRiderInTeam(teamId, zwiftId);
      if (exists) {
        logger.warn(`⚠️  Rider ${zwiftId} already in team ${teamId}`);
        throw new Error(`Rider ${zwiftId} is already a member of this team`);
      }

      // Step 1: Fetch rider data from API
      logger.info(`📡 Fetching rider data for ${zwiftId}...`);
      let riderData;
      try {
        riderData = await this.apiClient.getRider(zwiftId);
      } catch (error) {
        logger.error(`❌ Failed to fetch rider ${zwiftId} from API`, error);
        throw new Error(`Could not fetch rider ${zwiftId} from Zwift API`);
      }

      // Step 2: Upsert rider to database
      logger.info(`💾 Upserting rider ${riderData.name} (${zwiftId})...`);
      const rider = await this.riderRepo.upsertRider(riderData);

      // Step 3: Upsert club if present (club info not available from single rider endpoint)
      // Club sync would need to be done separately via club endpoint

      // Step 4: Add member to team (with pending sync status)
      logger.info(`➕ Adding member to team...`);
      const member = await this.teamRepo.addTeamMember(teamId, rider.id, role, notes);

      // Step 5: Trigger rider history sync (90 days) in background
      logger.info(`🔄 Starting rider history sync (90 days)...`);
      this.syncRiderHistory(teamId, rider.id, zwiftId).catch((error) => {
        logger.error(`❌ Background sync failed for rider ${zwiftId}`, error);
      });

      logger.info(`✓ Rider ${zwiftId} added to team ${teamId}`);
      return member;
    } catch (error) {
      logger.error(`❌ Failed to add rider ${zwiftId} to team ${teamId}`, error);
      throw error;
    }
  }

  /**
   * Add multiple riders to team (bulk)
   * Rate-limit aware: processes in batches with delays
   */
  async addMembersBulk(
    teamId: number,
    zwiftIds: number[],
    role: string = 'member',
    batchSize: number = 5
  ) {
    logger.info(`👥 Adding ${zwiftIds.length} riders to team ${teamId} (bulk)`);

    const results = {
      added: [] as number[],
      skipped: [] as number[],
      failed: [] as { zwiftId: number; error: string }[],
    };

    // Process in batches to respect rate limits
    for (let i = 0; i < zwiftIds.length; i += batchSize) {
      const batch = zwiftIds.slice(i, i + batchSize);
      logger.info(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(zwiftIds.length / batchSize)}`);

      for (const zwiftId of batch) {
        try {
          // Check if already exists
          const exists = await this.teamRepo.isRiderInTeam(teamId, zwiftId);
          if (exists) {
            logger.info(`⏭️  Skipping rider ${zwiftId} (already in team)`);
            results.skipped.push(zwiftId);
            continue;
          }

          // Add member
          await this.addMember(teamId, zwiftId, role);
          results.added.push(zwiftId);

          // Small delay between riders in same batch
          await this.sleep(2000);
        } catch (error) {
          logger.error(`❌ Failed to add rider ${zwiftId}`, error);
          results.failed.push({
            zwiftId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Delay between batches (respect rate limits)
      if (i + batchSize < zwiftIds.length) {
        logger.info(`⏸️  Waiting 15s before next batch...`);
        await this.sleep(15000);
      }
    }

    logger.info(`✓ Bulk add completed: ${results.added.length} added, ${results.skipped.length} skipped, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Sync rider's race history (last 90 days)
   * Uses direct API call to /api/riders/:id to get history
   */
  private async syncRiderHistory(teamId: number, riderId: number, zwiftId: number) {
    logger.info(`🔄 Syncing history for rider ${zwiftId}...`);

    try {
      // Update status to syncing
      await this.teamRepo.updateTeamMemberSyncStatus(teamId, riderId, 'syncing');

      // Fetch rider history from API (direct axios call to bypass strict schema)
      const apiUrl = `${config.zwiftApiBaseUrl}/api/riders/${zwiftId}`;
      logger.debug(`📡 Fetching rider history from ${apiUrl}`);

      const response = await axios.get(apiUrl, {
        headers: {
          Authorization: config.zwiftApiKey,
        },
        timeout: 30000,
      });

      if (!response.data || !Array.isArray(response.data.history)) {
        throw new Error('Invalid rider history response');
      }

      const history = response.data.history;
      logger.info(`📊 Received ${history.length} history entries`);

      // Filter last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const ninetyDaysAgoTimestamp = Math.floor(ninetyDaysAgo.getTime() / 1000);

      const recentHistory = history.filter((entry: any) => {
        const updatedAt = entry.updatedAt || entry.createdAt;
        return updatedAt >= ninetyDaysAgoTimestamp;
      });

      logger.info(`📅 Found ${recentHistory.length} entries in last 90 days`);

      let eventsProcessed = 0;
      let eventsFailed = 0;

      // Process each history entry
      for (const entry of recentHistory) {
        try {
          // Extract event data
          const eventId = entry.eventId;
          const eventName = entry.route || entry.name || `Event ${eventId}`;
          const eventDate = entry.updatedAt || entry.createdAt;

          // Upsert event
          await this.resultRepo.upsertResult(
            {
              riderId: zwiftId,
              name: `Rider ${zwiftId}`,
              eventId,
              eventName,
              eventDate: new Date(eventDate * 1000).toISOString(),
              position: entry.position,
              category: entry.category,
              time: entry.time ? Math.round(entry.time) : undefined,
              distance: entry.distance,
              averagePower: entry.power?.avg || entry.power?.ap,
              averageWkg: entry.wkg?.avg || entry.power?.wkg,
            },
            'zwiftranking'
          );

          eventsProcessed++;
        } catch (error) {
          logger.error(`Failed to process history entry for event ${entry.eventId}`, error);
          eventsFailed++;
        }
      }

      // Update sync status to synced
      await this.teamRepo.updateTeamMemberSyncStatus(teamId, riderId, 'synced');

      logger.info(`✓ History sync completed: ${eventsProcessed} events synced, ${eventsFailed} failed`);

      return {
        eventsProcessed,
        eventsFailed,
        totalHistory: history.length,
        recentHistory: recentHistory.length,
      };
    } catch (error) {
      logger.error(`❌ Failed to sync history for rider ${zwiftId}`, error);
      
      // Update sync status to error
      await this.teamRepo.updateTeamMemberSyncStatus(
        teamId,
        riderId,
        'error',
        error instanceof Error ? error.message : String(error)
      );

      throw error;
    }
  }

  /**
   * Sync all pending team members
   */
  async syncTeamMembers(teamId: number) {
    logger.info(`🔄 Syncing pending members for team ${teamId}`);

    try {
      const pendingMembers = await this.teamRepo.getPendingTeamMembers(teamId);
      logger.info(`📋 Found ${pendingMembers.length} pending members`);

      let synced = 0;
      let failed = 0;

      for (const member of pendingMembers) {
        try {
          await this.syncRiderHistory(teamId, member.riderId, member.rider.zwiftId);
          synced++;
          
          // Rate limit: wait between syncs
          await this.sleep(5000);
        } catch (error) {
          logger.error(`Failed to sync member ${member.rider.zwiftId}`, error);
          failed++;
        }
      }

      // Update team sync timestamp
      await this.teamRepo.updateTeamSyncTimestamp(teamId);

      logger.info(`✓ Team sync completed: ${synced} synced, ${failed} failed`);

      return {
        synced,
        failed,
        total: pendingMembers.length,
      };
    } catch (error) {
      logger.error(`❌ Failed to sync team ${teamId}`, error);
      throw error;
    }
  }

  /**
   * Get team with full details
   */
  async getTeam(teamId: number) {
    logger.info(`📋 Getting team ${teamId}`);
    
    try {
      const team = await this.teamRepo.getTeam(teamId);
      if (!team) {
        throw new Error(`Team ${teamId} not found`);
      }
      return team;
    } catch (error) {
      logger.error(`❌ Failed to get team ${teamId}`, error);
      throw error;
    }
  }

  /**
   * Get team statistics
   */
  async getTeamStatistics(teamId: number) {
    logger.info(`📊 Getting statistics for team ${teamId}`);
    
    try {
      const stats = await this.teamRepo.getTeamStatistics(teamId);
      if (!stats) {
        throw new Error(`Team ${teamId} not found`);
      }
      return stats;
    } catch (error) {
      logger.error(`❌ Failed to get team statistics`, error);
      throw error;
    }
  }

  /**
   * Remove member from team
   */
  async removeMember(teamId: number, zwiftId: number) {
    logger.info(`➖ Removing rider ${zwiftId} from team ${teamId}`);

    try {
      // Find rider's database ID
      const rider = await this.riderRepo.getRider(zwiftId);
      if (!rider) {
        throw new Error(`Rider ${zwiftId} not found`);
      }

      await this.teamRepo.removeTeamMember(teamId, rider.id);
      logger.info(`✓ Rider ${zwiftId} removed from team ${teamId}`);
    } catch (error) {
      logger.error(`❌ Failed to remove rider ${zwiftId}`, error);
      throw error;
    }
  }

  /**
   * List all teams
   */
  async listTeams() {
    logger.info(`📋 Listing all teams`);
    
    try {
      const teams = await this.teamRepo.getAllTeams();
      return teams;
    } catch (error) {
      logger.error(`❌ Failed to list teams`, error);
      throw error;
    }
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: number) {
    logger.info(`🗑️  Deleting team ${teamId}`);
    
    try {
      await this.teamRepo.deleteTeam(teamId);
      logger.info(`✓ Team ${teamId} deleted`);
    } catch (error) {
      logger.error(`❌ Failed to delete team ${teamId}`, error);
      throw error;
    }
  }

  /**
   * Helper: sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default TeamService;
