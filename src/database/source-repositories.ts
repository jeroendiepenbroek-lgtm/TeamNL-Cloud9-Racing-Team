import prisma from './client.js';
import { logger } from '../utils/logger.js';

/**
 * 🗄️ BRONDATATABELLEN REPOSITORIES
 * 
 * 🇳🇱 DOEL:
 * Data access layer voor immutable source data (ruwe API responses).
 * Elke API call wordt opgeslagen als snapshot voor auditing, trending en debugging.
 * 
 * ARCHITECTUUR PRINCIPES:
 * ✅ Immutable: Brondata wordt NOOIT geüpdatet, alleen nieuwe snapshots toegevoegd
 * ✅ Complete: Volledige API response opgeslagen als JSON string (rawData field)
 * ✅ Traceable: Elke call gelogd met timestamps, rate limits, response times
 * ✅ Indexed: Key fields (name, eventId, riderId) uitgepakt voor snelle queries
 * 
 * REPOSITORY CLASSES (9):
 * 1. ClubSourceRepository - Club snapshots (/public/clubs/:id)
 * 2. ClubRosterSourceRepository - Member lists (paginated)
 * 3. EventResultsSourceRepository - Event results (/public/results/:eventId)
 * 4. EventZpSourceRepository - ZwiftPower data (/public/zp/:eventId/results)
 * 5. RiderSourceRepository - Current rider profiles (/public/riders/:id)
 * 6. RiderHistorySourceRepository - Historical snapshots (/public/riders/:id/:time)
 * 7. RiderBulkSourceRepository - Bulk fetches (POST /public/riders)
 * 8. RiderBulkHistorySourceRepository - Bulk historical (POST /public/riders/:time)
 * 9. RateLimitRepository - Rate limit tracking (automatic)
 * 
 * USAGE PATTERN:
 * ```typescript
 * // Save API response
 * const snapshot = await clubSourceRepo.saveClubData({
 *   clubId: 11818,
 *   rawData: apiResponse,  // Complete JSON object
 *   rateLimitRemaining: 3,
 *   responseTime: 1250
 * });
 * 
 * // Query latest snapshot
 * const latest = await clubSourceRepo.getLatestClubData(11818);
 * 
 * // Query historical trend
 * const history = await clubSourceRepo.getAllClubSnapshots(11818, 10);
 * ```
 * 
 * RATE LIMIT INTEGRATION:
 * - RateLimitRepository.isWithinRateLimit(endpoint) → Check before API calls
 * - Automatic logging via ZwiftApiClient axios interceptor
 * - WARNING logs when limitRemaining < 2
 */

// ============================================================================
// CLUB SOURCE DATA
// ============================================================================

export class ClubSourceRepository {
  /**
   * Sla club data op van /public/clubs/:id
   */
  async saveClubData(params: {
    clubId: number;
    rawData: any; // Complete API response
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
    responseTime?: number;
  }) {
    const { clubId, rawData, rateLimitRemaining, rateLimitReset, responseTime } = params;
    
    // Parse key fields voor indexing
    const name = rawData.name || null;
    const memberCount = rawData.riders?.length || rawData.memberCount || null;
    const countryCode = rawData.countryCode || null;

    return await prisma.clubSourceData.create({
      data: {
        clubId,
        rawData: JSON.stringify(rawData),
        name,
        memberCount,
        countryCode,
        rateLimitRemaining,
        rateLimitReset,
        responseTime,
      },
    });
  }

  /**
   * Haal laatste club data op
   */
  async getLatestClubData(clubId: number) {
    return await prisma.clubSourceData.findFirst({
      where: { clubId },
      orderBy: { fetchedAt: 'desc' },
    });
  }

  /**
   * Haal alle club data snapshots op
   */
  async getAllClubSnapshots(clubId: number, limit: number = 10) {
    return await prisma.clubSourceData.findMany({
      where: { clubId },
      orderBy: { fetchedAt: 'desc' },
      take: limit,
    });
  }
}

export class ClubRosterSourceRepository {
  /**
   * Sla club roster data op van /public/clubs/:id/:riderId
   */
  async saveClubRosterData(params: {
    clubId: number;
    fromRiderId: number;
    rawData: any[]; // Array van riders
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
    responseTime?: number;
  }) {
    const { clubId, fromRiderId, rawData, rateLimitRemaining, rateLimitReset, responseTime } = params;
    
    return await prisma.clubRosterSourceData.create({
      data: {
        clubId,
        fromRiderId,
        rawData: JSON.stringify(rawData),
        ridersCount: rawData.length,
        rateLimitRemaining,
        rateLimitReset,
        responseTime,
      },
    });
  }

  /**
   * Haal laatste roster data op
   */
  async getLatestRosterData(clubId: number) {
    return await prisma.clubRosterSourceData.findFirst({
      where: { clubId },
      orderBy: { fetchedAt: 'desc' },
    });
  }
}

// ============================================================================
// EVENT SOURCE DATA
// ============================================================================

export class EventResultsSourceRepository {
  /**
   * Sla event results data op van /public/results/:eventId
   */
  async saveEventResultsData(params: {
    eventId: number;
    rawData: any[]; // Array van results
    eventName?: string;
    eventDate?: Date;
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
    responseTime?: number;
  }) {
    const { eventId, rawData, eventName, eventDate, rateLimitRemaining, rateLimitReset, responseTime } = params;
    
    // Count participants en finishers
    const participantsCount = rawData.length;
    const finishersCount = rawData.filter((r: any) => r.didFinish !== false).length;

    return await prisma.eventResultsSourceData.create({
      data: {
        eventId,
        rawData: JSON.stringify(rawData),
        participantsCount,
        finishersCount,
        eventName,
        eventDate,
        rateLimitRemaining,
        rateLimitReset,
        responseTime,
      },
    });
  }

  /**
   * Haal laatste event results op
   */
  async getLatestEventResults(eventId: number) {
    return await prisma.eventResultsSourceData.findFirst({
      where: { eventId },
      orderBy: { fetchedAt: 'desc' },
    });
  }

  /**
   * Check of event al is opgehaald
   */
  async hasEventData(eventId: number): Promise<boolean> {
    const count = await prisma.eventResultsSourceData.count({
      where: { eventId },
    });
    return count > 0;
  }

  /**
   * Haal alle events van afgelopen N dagen
   */
  async getRecentEvents(days: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await prisma.eventResultsSourceData.findMany({
      where: {
        eventDate: {
          gte: cutoffDate,
        },
      },
      orderBy: { eventDate: 'desc' },
    });
  }
}

export class EventZpSourceRepository {
  /**
   * Sla ZwiftPower event data op van /public/zp/:eventId/results
   */
  async saveEventZpData(params: {
    eventId: number;
    rawData: any[]; // Array van ZP results
    eventName?: string;
    eventDate?: Date;
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
    responseTime?: number;
  }) {
    const { eventId, rawData, eventName, eventDate, rateLimitRemaining, rateLimitReset, responseTime } = params;
    
    return await prisma.eventZpSourceData.create({
      data: {
        eventId,
        rawData: JSON.stringify(rawData),
        participantsCount: rawData.length,
        eventName,
        eventDate,
        rateLimitRemaining,
        rateLimitReset,
        responseTime,
      },
    });
  }

  /**
   * Haal laatste ZP event data op
   */
  async getLatestEventZpData(eventId: number) {
    return await prisma.eventZpSourceData.findFirst({
      where: { eventId },
      orderBy: { fetchedAt: 'desc' },
    });
  }

  /**
   * Check of ZP event data al is opgehaald
   */
  async hasEventZpData(eventId: number): Promise<boolean> {
    const count = await prisma.eventZpSourceData.count({
      where: { eventId },
    });
    return count > 0;
  }

  /**
   * Haal alle ZP events van afgelopen N dagen
   */
  async getRecentZpEvents(days: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await prisma.eventZpSourceData.findMany({
      where: {
        eventDate: {
          gte: cutoffDate,
        },
      },
      orderBy: { eventDate: 'desc' },
    });
  }
}

// ============================================================================
// RIDER SOURCE DATA
// ============================================================================

export class RiderSourceRepository {
  /**
   * Sla rider data op van /public/riders/:riderId
   */
  async saveRiderData(params: {
    riderId: number;
    rawData: any; // Complete API response
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
    responseTime?: number;
  }) {
    const { riderId, rawData, rateLimitRemaining, rateLimitReset, responseTime } = params;
    
    // Parse key fields voor indexing
    const name = rawData.name || null;
    const ranking = rawData.ranking || null;
    const categoryRacing = rawData.category || null;
    const ftp = rawData.zpFTP || rawData.ftp || null;

    return await prisma.riderSourceData.create({
      data: {
        riderId,
        rawData: JSON.stringify(rawData),
        name,
        ranking,
        categoryRacing,
        ftp,
        rateLimitRemaining,
        rateLimitReset,
        responseTime,
      },
    });
  }

  /**
   * Haal laatste rider data op
   */
  async getLatestRiderData(riderId: number) {
    return await prisma.riderSourceData.findFirst({
      where: { riderId },
      orderBy: { fetchedAt: 'desc' },
    });
  }

  /**
   * Haal alle rider snapshots op
   */
  async getAllRiderSnapshots(riderId: number, limit: number = 10) {
    return await prisma.riderSourceData.findMany({
      where: { riderId },
      orderBy: { fetchedAt: 'desc' },
      take: limit,
    });
  }
}

export class RiderHistorySourceRepository {
  /**
   * Sla rider history data op van /public/riders/:riderId/:time
   */
  async saveRiderHistoryData(params: {
    riderId: number;
    epochTime: number;
    rawData: any; // Complete API response
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
    responseTime?: number;
  }) {
    const { riderId, epochTime, rawData, rateLimitRemaining, rateLimitReset, responseTime } = params;
    
    // Parse key fields
    const name = rawData.name || null;
    const ranking = rawData.ranking || null;
    const ftp = rawData.zpFTP || rawData.ftp || null;
    
    // Convert epoch to Date
    const snapshotDate = new Date(epochTime * 1000);

    return await prisma.riderHistorySourceData.create({
      data: {
        riderId,
        epochTime,
        rawData: JSON.stringify(rawData),
        name,
        ranking,
        ftp,
        snapshotDate,
        rateLimitRemaining,
        rateLimitReset,
        responseTime,
      },
    });
  }

  /**
   * Haal rider data op specifieke datum op
   */
  async getRiderDataAtTime(riderId: number, date: Date) {
    return await prisma.riderHistorySourceData.findFirst({
      where: {
        riderId,
        snapshotDate: {
          lte: date,
        },
      },
      orderBy: { snapshotDate: 'desc' },
    });
  }

  /**
   * Haal alle history snapshots op
   */
  async getAllHistorySnapshots(riderId: number, limit: number = 50) {
    return await prisma.riderHistorySourceData.findMany({
      where: { riderId },
      orderBy: { snapshotDate: 'desc' },
      take: limit,
    });
  }
}

export class RiderBulkSourceRepository {
  /**
   * Sla bulk rider data op van POST /public/riders
   */
  async saveBulkRiderData(params: {
    riderIds: number[];
    rawData: any[]; // Array van riders
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
    responseTime?: number;
  }) {
    const { riderIds, rawData, rateLimitRemaining, rateLimitReset, responseTime } = params;
    
    return await prisma.riderBulkSourceData.create({
      data: {
        riderIds: JSON.stringify(riderIds),
        rawData: JSON.stringify(rawData),
        requestedCount: riderIds.length,
        returnedCount: rawData.length,
        rateLimitRemaining,
        rateLimitReset,
        responseTime,
      },
    });
  }

  /**
   * Haal laatste bulk fetch op
   */
  async getLatestBulkFetch() {
    return await prisma.riderBulkSourceData.findFirst({
      orderBy: { fetchedAt: 'desc' },
    });
  }
}

export class RiderBulkHistorySourceRepository {
  /**
   * Sla bulk rider history data op van POST /public/riders/:time
   */
  async saveBulkHistoryData(params: {
    riderIds: number[];
    epochTime: number;
    rawData: any[]; // Array van riders
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
    responseTime?: number;
  }) {
    const { riderIds, epochTime, rawData, rateLimitRemaining, rateLimitReset, responseTime } = params;
    
    const snapshotDate = new Date(epochTime * 1000);

    return await prisma.riderBulkHistorySourceData.create({
      data: {
        epochTime,
        riderIds: JSON.stringify(riderIds),
        rawData: JSON.stringify(rawData),
        requestedCount: riderIds.length,
        returnedCount: rawData.length,
        snapshotDate,
        rateLimitRemaining,
        rateLimitReset,
        responseTime,
      },
    });
  }

  /**
   * Haal bulk history data op specifieke datum
   */
  async getBulkHistoryAtTime(date: Date) {
    return await prisma.riderBulkHistorySourceData.findFirst({
      where: {
        snapshotDate: {
          lte: date,
        },
      },
      orderBy: { snapshotDate: 'desc' },
    });
  }
}

// ============================================================================
// RATE LIMIT TRACKING
// ============================================================================

export class RateLimitRepository {
  /**
   * Log rate limit status van API call
   */
  async logRateLimit(params: {
    endpoint: string;
    method: string;
    limitMax: number;
    limitRemaining: number;
    limitResetAt: Date;
    requestUrl?: string;
    responseStatus?: number;
    responseTime?: number;
  }) {
    return await prisma.rateLimitLog.create({
      data: params,
    });
  }

  /**
   * Haal laatste rate limit status voor endpoint
   */
  async getLatestRateLimit(endpoint: string) {
    return await prisma.rateLimitLog.findFirst({
      where: { endpoint },
      orderBy: { recordedAt: 'desc' },
    });
  }

  /**
   * Check of endpoint binnen rate limit is
   */
  async isWithinRateLimit(endpoint: string): Promise<boolean> {
    const latest = await this.getLatestRateLimit(endpoint);
    
    if (!latest) {
      return true; // Geen data = veilig om te proberen
    }

    // Check of reset time voorbij is
    if (new Date() > latest.limitResetAt) {
      return true;
    }

    // Check of er nog requests over zijn
    return latest.limitRemaining > 0;
  }

  /**
   * Haal rate limit stats voor monitoring
   */
  async getRateLimitStats(hours: number = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const logs = await prisma.rateLimitLog.findMany({
      where: {
        recordedAt: {
          gte: since,
        },
      },
      orderBy: { recordedAt: 'desc' },
    });

    // Groepeer per endpoint
    const stats: Record<string, {
      totalCalls: number;
      avgResponseTime: number;
      limitReached: number;
      nextReset?: Date;
    }> = {};

    for (const log of logs) {
      if (!stats[log.endpoint]) {
        stats[log.endpoint] = {
          totalCalls: 0,
          avgResponseTime: 0,
          limitReached: 0,
        };
      }

      stats[log.endpoint].totalCalls++;
      
      if (log.responseTime) {
        stats[log.endpoint].avgResponseTime += log.responseTime;
      }

      if (log.limitRemaining === 0) {
        stats[log.endpoint].limitReached++;
        stats[log.endpoint].nextReset = log.limitResetAt;
      }
    }

    // Calculate averages
    for (const endpoint in stats) {
      if (stats[endpoint].totalCalls > 0) {
        stats[endpoint].avgResponseTime /= stats[endpoint].totalCalls;
      }
    }

    return stats;
  }

  /**
   * Haal alle rate limit resets die nog actief zijn
   */
  async getActiveRateLimits() {
    const now = new Date();
    
    return await prisma.rateLimitLog.findMany({
      where: {
        limitResetAt: {
          gt: now,
        },
        limitRemaining: 0,
      },
      orderBy: { limitResetAt: 'asc' },
      distinct: ['endpoint'],
    });
  }
}

// ============================================================================
// EXPORT SINGLETONS
// ============================================================================

export const clubSourceRepo = new ClubSourceRepository();
export const clubRosterSourceRepo = new ClubRosterSourceRepository();
export const eventResultsSourceRepo = new EventResultsSourceRepository();
export const eventZpSourceRepo = new EventZpSourceRepository();
export const riderSourceRepo = new RiderSourceRepository();
export const riderHistorySourceRepo = new RiderHistorySourceRepository();
export const riderBulkSourceRepo = new RiderBulkSourceRepository();
export const riderBulkHistorySourceRepo = new RiderBulkHistorySourceRepository();
export const rateLimitRepo = new RateLimitRepository();
