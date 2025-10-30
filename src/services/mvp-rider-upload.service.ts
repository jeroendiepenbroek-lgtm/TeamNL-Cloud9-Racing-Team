/**
 * MVP SERVICE: RIDER UPLOAD
 * 
 * US: Rider end-points aansturen door RiderIDs (upload via TXT/CSV)
 * US: Club end-points aansturen op basis van extractie ClubID uit Rider data
 * 
 * WORKFLOW:
 * 1. Parse TXT/CSV file met RiderIDs
 * 2. Fetch rider data van ZwiftRacing API
 * 3. Extract ClubID automatisch
 * 4. Save to riders + clubs table
 */

import { ZwiftApiClient } from '../api/zwift-client.js';
import prisma from '../database/client.js';
import { logger } from '../utils/logger.js';

interface RiderUploadResult {
  riderId: number;
  riderName: string;
  clubId: number | null;
  clubName: string | null;
  success: boolean;
  error?: string;
}

export class RiderUploadService {
  private apiClient: ZwiftApiClient;

  constructor() {
    this.apiClient = new ZwiftApiClient({
      baseUrl: 'https://zwift-ranking.herokuapp.com',
      apiKey: process.env.ZWIFT_API_KEY || '',
    });
  }

  /**
   * Parse RiderIDs from TXT/CSV content
   */
  parseRiderIds(content: string): number[] {
    const lines = content.split('\n').map(line => line.trim());
    const riderIds: number[] = [];

    for (const line of lines) {
      if (!line || line.startsWith('#')) continue; // Skip empty lines and comments

      // CSV: support comma-separated values
      const values = line.split(',').map(v => v.trim());
      
      for (const value of values) {
        const id = parseInt(value);
        if (!isNaN(id) && id > 0) {
          riderIds.push(id);
        }
      }
    }

    return Array.from(new Set(riderIds)); // Deduplicate
  }

  /**
   * Upload multiple riders
   * 
   * @param riderIds - Array of Zwift rider IDs
   * @returns Upload results per rider
   */
  async uploadRiders(riderIds: number[]): Promise<{
    totalProcessed: number;
    successful: number;
    failed: number;
    results: RiderUploadResult[];
  }> {
    logger.info(`📤 Upload gestart voor ${riderIds.length} riders`);

    const results: RiderUploadResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const riderId of riderIds) {
      try {
        const result = await this.uploadSingleRider(riderId);
        results.push(result);
        
        if (result.success) {
          successful++;
          logger.info(`  ✅ ${result.riderName} (${riderId}) - Club: ${result.clubName || 'none'}`);
        } else {
          failed++;
          logger.error(`  ❌ Rider ${riderId}: ${result.error}`);
        }

        // Rate limit: 5 riders per minute
        if (riderIds.indexOf(riderId) < riderIds.length - 1) {
          await this.delay(12000); // 12 seconds = 5/min
        }
      } catch (error: any) {
        failed++;
        results.push({
          riderId,
          riderName: 'Unknown',
          clubId: null,
          clubName: null,
          success: false,
          error: error.message,
        });
        logger.error(`  ❌ Rider ${riderId}: ${error.message}`);
      }
    }

    logger.info(`✅ Upload voltooid: ${successful} successful, ${failed} failed`);

    return {
      totalProcessed: riderIds.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Upload single rider
   * 
   * 1. Fetch rider data from API
   * 2. Extract ClubID
   * 3. Upsert club if present
   * 4. Upsert rider
   */
  private async uploadSingleRider(riderId: number): Promise<RiderUploadResult> {
    // 1. Fetch from ZwiftRacing API
    const riderData = await this.apiClient.getRider(riderId);

    // 2. Extract club data
    let clubId: number | null = null;
    let clubName: string | null = null;

    if (riderData.club) {
      clubId = riderData.club.id;
      clubName = riderData.club.name || null;

      // 3. Upsert club
      await prisma.club.upsert({
        where: { id: clubId },
        create: {
          id: clubId,
          name: clubName || '',
          memberCount: 0, // Will be updated later
        },
        update: {
          name: clubName || '',
        },
      });
    }

    // 4. Upsert rider
    await prisma.rider.upsert({
      where: { zwiftId: riderId },
      create: {
        zwiftId: riderId,
        name: riderData.name,
        clubId,
        ftp: riderData.ftp || null,
        weight: riderData.weight || null,
        ranking: riderData.ranking || null,
        rankingScore: riderData.rankingScore || null,
        categoryRacing: riderData.categoryRacing || null,
        countryCode: riderData.countryCode || null,
        gender: riderData.gender || null,
        age: riderData.age ? parseInt(riderData.age.toString()) : null,
      },
      update: {
        name: riderData.name,
        clubId,
        ftp: riderData.ftp || null,
        weight: riderData.weight || null,
        ranking: riderData.ranking || null,
        rankingScore: riderData.rankingScore || null,
        categoryRacing: riderData.categoryRacing || null,
        countryCode: riderData.countryCode || null,
        gender: riderData.gender || null,
        age: riderData.age ? parseInt(riderData.age.toString()) : null,
      },
    });

    return {
      riderId,
      riderName: riderData.name,
      clubId,
      clubName,
      success: true,
    };
  }

  /**
   * Get all uploaded riders
   */
  async getUploadedRiders(): Promise<Array<{
    zwiftId: number;
    name: string;
    club: { id: number; name: string | null } | null;
    totalRaces: number | null;
  }>> {
    const riders = await prisma.rider.findMany({
      include: {
        club: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return riders.map(r => ({
      zwiftId: r.zwiftId,
      name: r.name,
      club: r.club,
      totalRaces: r.totalRaces || 0,
    }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton
export const riderUploadService = new RiderUploadService();
