/**
 * Multi-Club Sync Service
 * 
 * Intelligente sync service die automatisch clubs detecteert van riders
 * en deze synchroniseert naar Supabase.
 */

import { logger } from '../utils/logger.js';
import { supabaseSyncService } from './supabase-sync.service.js';
import getSupabaseClient from './supabase-client.js';
import { ZwiftApiClient } from '../api/zwift-client.js';
import { config } from '../utils/config.js';

interface ClubDetectionResult {
  clubIds: Set<number>;
  riderCount: number;
  clubCount: number;
}

interface MultiClubSyncResult {
  success: boolean;
  synced: {
    riders: number;
    clubs: number;
    clubRosters: number;
  };
  clubs: Array<{
    id: number;
    name: string;
    memberCount: number;
  }>;
  errors: string[];
}

class MultiClubSyncService {
  private apiClient: ZwiftApiClient;

  constructor() {
    this.apiClient = new ZwiftApiClient({
      apiKey: config.zwiftApiKey,
      baseUrl: config.zwiftApiBaseUrl,
    });
  }

  /**
   * Detecteer alle clubs van een lijst riders
   */
  async detectClubsFromRiders(riderIds: number[]): Promise<ClubDetectionResult> {
    const clubIds = new Set<number>();
    let riderCount = 0;

    logger.info(`🔍 Detecteer clubs voor ${riderIds.length} riders...`);

    for (const riderId of riderIds) {
      try {
        // Haal rider data op van API
        const riderData = await this.apiClient.getRider(riderId);
        
        // Check of rider club heeft
        if (riderData.club?.id) {
          clubIds.add(riderData.club.id);
          riderCount++;
        }
      } catch (error: any) {
        logger.warn(`⚠️ Rider ${riderId} niet gevonden of geen club`);
      }
    }

    logger.info(`✅ Gevonden: ${clubIds.size} unieke clubs van ${riderCount} riders`);

    return {
      clubIds,
      riderCount,
      clubCount: clubIds.size,
    };
  }

  /**
   * Sync riders + automatisch hun clubs
   */
  async syncRidersWithClubs(riderIds: number[]): Promise<MultiClubSyncResult> {
    const result: MultiClubSyncResult = {
      success: true,
      synced: {
        riders: 0,
        clubs: 0,
        clubRosters: 0,
      },
      clubs: [],
      errors: [],
    };

    try {
      // Stap 1: Detecteer alle clubs
      logger.info('📋 Stap 1/3: Club detectie...');
      const detection = await this.detectClubsFromRiders(riderIds);

      // Stap 2: Sync alle clubs
      logger.info('📋 Stap 2/3: Sync clubs...');
      for (const clubId of detection.clubIds) {
        try {
          const clubData = await this.apiClient.getClubMembers(clubId);
          
          // Sync club info
          const clubSynced = await supabaseSyncService.syncClub({
            id: clubData.clubId,
            name: clubData.name,
            memberCount: clubData.riders.length,
          });

          if (clubSynced) {
            result.synced.clubs++;
            result.clubs.push({
              id: clubData.clubId,
              name: clubData.name,
              memberCount: clubData.riders.length,
            });

            // Sync club roster (alle members)
            const rosterSynced = await supabaseSyncService.syncClubRoster(
              clubData.clubId,
              clubData.riders.map((r: any) => ({
                zwiftId: r.riderId,
                name: r.name,
                clubId: clubData.clubId,
                category: r.category,
                ftp: r.ftp,
                weight: r.weight,
              }))
            );

            if (rosterSynced) {
              result.synced.clubRosters++;
              logger.info(`  ✅ Club ${clubData.name}: ${clubData.riders.length} members`);
            }
          }
        } catch (error: any) {
          const msg = `Failed to sync club ${clubId}: ${error.message}`;
          result.errors.push(msg);
          logger.error(msg);
        }
      }

      // Stap 3: Sync individuele riders
      logger.info('📋 Stap 3/3: Sync riders...');
      for (const riderId of riderIds) {
        try {
          const riderData = await this.apiClient.getRider(riderId);
          const synced = await supabaseSyncService.syncRider(riderData);

          if (synced) {
            result.synced.riders++;
          }
        } catch (error: any) {
          const msg = `Failed to sync rider ${riderId}: ${error.message}`;
          result.errors.push(msg);
          logger.warn(msg);
        }
      }

      logger.info(`✅ Multi-club sync complete:`, {
        riders: result.synced.riders,
        clubs: result.synced.clubs,
        errors: result.errors.length,
      });

    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
      logger.error('❌ Multi-club sync failed:', error);
    }

    return result;
  }

  /**
   * Haal alle unieke clubs op uit database
   */
  async getAllTrackedClubs(): Promise<Array<{ id: number; name: string; memberCount: number }>> {
    try {
      const client = getSupabaseClient();
      if (!client) return [];
      
      const { data, error } = await client
        .from('clubs')
        .select('club_id, name, member_count')
        .order('name');

      if (error) {
        logger.error('Failed to fetch clubs:', error);
        return [];
      }

      return (data || []).map((club: any) => ({
        id: club.club_id,
        name: club.name,
        memberCount: club.member_count,
      }));
    } catch (error: any) {
      logger.error('getAllTrackedClubs error:', error);
      return [];
    }
  }
}

export const multiClubSyncService = new MultiClubSyncService();
export { MultiClubSyncService };
