import prisma from './client.js';
import type { RiderData, RaceResultData } from '../types/api.types.js';
import { logger } from '../utils/logger.js';

/**
 * Database repository voor Rider operaties (HANDMATIG TOEGEVOEGD - FAVORIETEN)
 * Volgt repository pattern voor scheiding tussen data access en business logic
 */
export class RiderRepository {
  /**
   * Sla rider data op of update bestaande rider (FAVORITE)
   * Auto-calculates ftpWkg based on ftp/zpFTP and weight
   * Supports FULL rider data from API
   */
  async upsertRider(
    data: RiderData, 
    clubId?: number,
    options?: {
      isFavorite?: boolean;
      addedBy?: string;
      syncPriority?: number;
    }
  ) {
    // Use zpFTP if available, fallback to ftp
    const effectiveFtp = data.zpFTP || data.ftp;
    
    // Calculate FTP per kg if we have both values
    const ftpWkg = effectiveFtp && data.weight 
      ? effectiveFtp / data.weight 
      : null;

    // Parse age from string ("50+", "Vet") to number - store as null if not parseable
    const age = data.age ? parseInt(data.age) : null;
    const ageIsValid = age && !isNaN(age) ? age : null;

    // Extract race stats if available
    const totalWins = data.race?.wins;
    const totalPodiums = data.race?.podiums;
    const totalRaces = data.race?.finishes;
    const totalDnfs = data.race?.dnfs || 0;

    // Extract power curve data from API
    const powerCurve = data.power ? {
      // Absolute watts
      power5s: data.power.w5,
      power15s: data.power.w15,
      power30s: data.power.w30,
      power1min: data.power.w60,
      power2min: data.power.w120,
      power5min: data.power.w300,
      power20min: data.power.w1200,
      // W/kg
      powerWkg5s: data.power.wkg5,
      powerWkg15s: data.power.wkg15,
      powerWkg30s: data.power.wkg30,
      powerWkg1min: data.power.wkg60,
      powerWkg2min: data.power.wkg120,
      powerWkg5min: data.power.wkg300,
      powerWkg20min: data.power.wkg1200,
      // Advanced metrics
      criticalPower: data.power.CP,
      anaerobicWork: data.power.AWC,
      compoundScore: data.power.compoundScore,
      powerRating: data.power.powerRating,
    } : {};

    // Extract terrain handicaps
    const handicaps = data.handicaps?.profile ? {
      handicapFlat: data.handicaps.profile.flat,
      handicapRolling: data.handicaps.profile.rolling,
      handicapHilly: data.handicaps.profile.hilly,
      handicapMountainous: data.handicaps.profile.mountainous,
    } : {};

    // Favorite tracking (gebruik defaults als options niet gegeven)
    const favoriteData = {
      isFavorite: options?.isFavorite ?? true,
      addedBy: options?.addedBy ?? 'manual',
      syncPriority: options?.syncPriority ?? 1,
    };

    const rider = await prisma.rider.upsert({
      where: { zwiftId: data.riderId },
      update: {
        name: data.name,
        // Category data
        categoryRacing: data.zpCategory || data.categoryRacing,
        // Power data
        ftp: effectiveFtp,
        ftpWkg: ftpWkg,
        powerToWeight: data.powerToWeight || data.power?.compoundScore,
        // Power curve data
        ...powerCurve,
        // Personal data
        gender: data.gender,
        age: ageIsValid,
        countryCode: data.country || data.countryCode,
        weight: data.weight,
        height: data.height,
        // Race statistics
        totalWins: totalWins,
        totalPodiums: totalPodiums,
        totalRaces: totalRaces,
        totalDnfs: totalDnfs,
        // Terrain handicaps
        ...handicaps,
        // Rankings
        ranking: data.ranking,
        rankingScore: data.rankingScore,
        // Club & status
        clubId: clubId,
        lastActive: new Date(),
        isActive: true,
      },
      create: {
        zwiftId: data.riderId,
        name: data.name,
        // Favorite tracking
        ...favoriteData,
        // Category data
        categoryRacing: data.zpCategory || data.categoryRacing,
        // Power data
        ftp: effectiveFtp,
        ftpWkg: ftpWkg,
        powerToWeight: data.powerToWeight || data.power?.compoundScore,
        // Power curve data
        ...powerCurve,
        // Personal data
        gender: data.gender,
        age: ageIsValid,
        countryCode: data.country || data.countryCode,
        weight: data.weight,
        height: data.height,
        // Race statistics
        totalWins: totalWins,
        totalPodiums: totalPodiums,
        totalRaces: totalRaces,
        totalDnfs: totalDnfs,
        // Terrain handicaps
        ...handicaps,
        // Rankings
        ranking: data.ranking,
        rankingScore: data.rankingScore,
        // Club & status
        clubId: clubId,
        lastActive: new Date(),
        isActive: true,
      },
    });

    // Sla ook race rating en phenotype op indien beschikbaar
    await Promise.all([
      this.upsertRiderRaceRating(rider.id, data),
      this.upsertRiderPhenotype(rider.id, data),
    ]);

    return rider;
  }

  /**
   * Sla race rating data op voor een rider
   */
  async upsertRiderRaceRating(riderId: number, data: RiderData) {
    if (!data.race) return null;

    const raceData = data.race;
    
    return await prisma.riderRaceRating.upsert({
      where: { riderId },
      update: {
        // Current rating
        currentRating: raceData.current?.rating,
        currentDate: raceData.current?.date ? new Date(raceData.current.date * 1000) : null,
        currentExpires: raceData.current?.expires ? new Date(raceData.current.expires * 1000) : null,
        // Last race rating
        lastRating: raceData.last?.rating,
        lastDate: raceData.last?.date ? new Date(raceData.last.date * 1000) : null,
        lastExpires: raceData.last?.expires ? new Date(raceData.last.expires * 1000) : null,
        lastMixedCat: raceData.last?.mixed?.category,
        lastMixedNum: raceData.last?.mixed?.number,
        // Peak ratings
        max30Rating: raceData.max30?.rating,
        max30Date: raceData.max30?.date ? new Date(raceData.max30.date * 1000) : null,
        max30Expires: raceData.max30?.expires ? new Date(raceData.max30.expires * 1000) : null,
        max90Rating: raceData.max90?.rating,
        max90Date: raceData.max90?.date ? new Date(raceData.max90.date * 1000) : null,
        max90Expires: raceData.max90?.expires ? new Date(raceData.max90.expires * 1000) : null,
      },
      create: {
        riderId,
        // Current rating
        currentRating: raceData.current?.rating,
        currentDate: raceData.current?.date ? new Date(raceData.current.date * 1000) : null,
        currentExpires: raceData.current?.expires ? new Date(raceData.current.expires * 1000) : null,
        // Last race rating
        lastRating: raceData.last?.rating,
        lastDate: raceData.last?.date ? new Date(raceData.last.date * 1000) : null,
        lastExpires: raceData.last?.expires ? new Date(raceData.last.expires * 1000) : null,
        lastMixedCat: raceData.last?.mixed?.category,
        lastMixedNum: raceData.last?.mixed?.number,
        // Peak ratings
        max30Rating: raceData.max30?.rating,
        max30Date: raceData.max30?.date ? new Date(raceData.max30.date * 1000) : null,
        max30Expires: raceData.max30?.expires ? new Date(raceData.max30.expires * 1000) : null,
        max90Rating: raceData.max90?.rating,
        max90Date: raceData.max90?.date ? new Date(raceData.max90.date * 1000) : null,
        max90Expires: raceData.max90?.expires ? new Date(raceData.max90.expires * 1000) : null,
      },
    });
  }

  /**
   * Sla phenotype data op voor een rider
   */
  async upsertRiderPhenotype(riderId: number, data: RiderData) {
    if (!data.phenotype) return null;

    const phenotype = data.phenotype;
    
    return await prisma.riderPhenotype.upsert({
      where: { riderId },
      update: {
        sprinter: phenotype.scores?.sprinter,
        puncheur: phenotype.scores?.puncheur,
        pursuiter: phenotype.scores?.pursuiter,
        climber: phenotype.scores?.climber,
        tt: phenotype.scores?.tt,
        primaryType: phenotype.value,
        bias: phenotype.bias,
      },
      create: {
        riderId,
        sprinter: phenotype.scores?.sprinter,
        puncheur: phenotype.scores?.puncheur,
        pursuiter: phenotype.scores?.pursuiter,
        climber: phenotype.scores?.climber,
        tt: phenotype.scores?.tt,
        primaryType: phenotype.value,
        bias: phenotype.bias,
      },
    });
  }

  /**
   * Sla meerdere riders op in bulk (efficiënt)
   * Updated to handle FULL rider data from club API
   */
  async upsertRidersBulk(riders: RiderData[], clubId?: number) {
    const operations = riders.map(async (rider) => {
      // Use zpFTP if available, fallback to ftp
      const effectiveFtp = rider.zpFTP || rider.ftp;
      const ftpWkg = effectiveFtp && rider.weight 
        ? effectiveFtp / rider.weight 
        : null;

      // Parse age
      const age = rider.age ? parseInt(rider.age) : null;
      const ageIsValid = age && !isNaN(age) ? age : null;

      // Extract race stats
      const totalWins = rider.race?.wins;
      const totalPodiums = rider.race?.podiums;
      const totalRaces = rider.race?.finishes;
      const totalDnfs = rider.race?.dnfs || 0;

      // Extract power curve data
      const powerCurve = rider.power ? {
        power5s: rider.power.w5,
        power15s: rider.power.w15,
        power30s: rider.power.w30,
        power1min: rider.power.w60,
        power2min: rider.power.w120,
        power5min: rider.power.w300,
        power20min: rider.power.w1200,
        powerWkg5s: rider.power.wkg5,
        powerWkg15s: rider.power.wkg15,
        powerWkg30s: rider.power.wkg30,
        powerWkg1min: rider.power.wkg60,
        powerWkg2min: rider.power.wkg120,
        powerWkg5min: rider.power.wkg300,
        powerWkg20min: rider.power.wkg1200,
        criticalPower: rider.power.CP,
        anaerobicWork: rider.power.AWC,
        compoundScore: rider.power.compoundScore,
        powerRating: rider.power.powerRating,
      } : {};

      // Extract terrain handicaps
      const handicaps = rider.handicaps?.profile ? {
        handicapFlat: rider.handicaps.profile.flat,
        handicapRolling: rider.handicaps.profile.rolling,
        handicapHilly: rider.handicaps.profile.hilly,
        handicapMountainous: rider.handicaps.profile.mountainous,
      } : {};

      // Upsert main rider data
      const upsertedRider = await prisma.rider.upsert({
        where: { zwiftId: rider.riderId },
        update: {
          name: rider.name,
          categoryRacing: rider.zpCategory || rider.categoryRacing,
          ftp: effectiveFtp,
          ftpWkg: ftpWkg,
          powerToWeight: rider.powerToWeight || rider.power?.compoundScore,
          ...powerCurve,
          gender: rider.gender,
          age: ageIsValid,
          countryCode: rider.country || rider.countryCode,
          weight: rider.weight,
          height: rider.height,
          totalWins: totalWins,
          totalPodiums: totalPodiums,
          totalRaces: totalRaces,
          totalDnfs: totalDnfs,
          ...handicaps,
          ranking: rider.ranking,
          rankingScore: rider.rankingScore,
          clubId: clubId,
          lastActive: new Date(),
          isActive: true,
        },
        create: {
          zwiftId: rider.riderId,
          name: rider.name,
          categoryRacing: rider.zpCategory || rider.categoryRacing,
          ftp: effectiveFtp,
          ftpWkg: ftpWkg,
          powerToWeight: rider.powerToWeight || rider.power?.compoundScore,
          ...powerCurve,
          gender: rider.gender,
          age: ageIsValid,
          countryCode: rider.country || rider.countryCode,
          weight: rider.weight,
          height: rider.height,
          totalWins: totalWins,
          totalPodiums: totalPodiums,
          totalRaces: totalRaces,
          totalDnfs: totalDnfs,
          ...handicaps,
          ranking: rider.ranking,
          rankingScore: rider.rankingScore,
          clubId: clubId,
          lastActive: new Date(),
          isActive: true,
        },
      });

      // Upsert related analytics data in parallel
      await Promise.all([
        this.upsertRiderRaceRating(upsertedRider.id, rider),
        this.upsertRiderPhenotype(upsertedRider.id, rider),
      ]);

      return upsertedRider;
    });

    // Wait for all operations to complete (now Promises due to async callback)
    return await Promise.all(operations);
  }

  /**
   * Haal rider op uit database
   */
  async getRider(zwiftId: number) {
    return await prisma.rider.findUnique({
      where: { zwiftId },
      include: {
        club: true,
        raceRating: true,
        phenotype: true,
        raceResults: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            event: {
              select: {
                eventDate: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Haal alle favorite riders op (met full analytics data)
   */
  async getFavoriteRiders() {
    return await prisma.rider.findMany({
      where: { isFavorite: true },
      orderBy: { syncPriority: 'asc' },
      include: {
        club: true,
        raceRating: true,
        phenotype: true,
        raceResults: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            event: {
              select: {
                eventDate: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Haal alle riders op van een club
   */
  async getClubRiders(clubId: number, activeOnly: boolean = true) {
    return await prisma.rider.findMany({
      where: { 
        clubId,
        ...(activeOnly && { isActive: true }),
      },
      orderBy: { ranking: 'asc' },
      include: {
        raceResults: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            event: {
              select: {
                name: true,
                eventDate: true,
              },
            },
          },
        },
        statistics: true,
      },
    });
  }

  /**
   * Sla historische snapshot op voor trend analyse
   * Captures: FTP, weight, ranking, race rating, category
   */
  async saveRiderHistory(
    riderId: number, 
    options?: {
      snapshotType?: string;
      triggeredBy?: string;
    }
  ) {
    const rider = await prisma.rider.findUnique({
      where: { id: riderId },
      include: {
        raceRating: true,
      },
    });

    if (!rider) {
      logger.warn('Rider niet gevonden voor snapshot', { riderId });
      return null;
    }

    // Check of er al een snapshot vandaag bestaat (voorkom duplicaten)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingSnapshot = await prisma.riderHistory.findFirst({
      where: {
        riderId,
        recordedAt: {
          gte: today,
        },
      },
    });

    if (existingSnapshot && options?.snapshotType === 'daily') {
      logger.debug('Snapshot voor vandaag bestaat al', { riderId });
      return existingSnapshot;
    }

    const snapshot = await prisma.riderHistory.create({
      data: {
        riderId: rider.id,
        ftp: rider.ftp,
        powerToWeight: rider.ftpWkg || rider.powerToWeight,
        ranking: rider.ranking,
        rankingScore: rider.rankingScore,
        weight: rider.weight,
        categoryRacing: rider.categoryRacing,
        zPoints: rider.zPoints,
        snapshotType: options?.snapshotType || 'daily',
        triggeredBy: options?.triggeredBy || 'manual',
      },
    });

    logger.info('Rider snapshot aangemaakt', { 
      riderId, 
      snapshotId: snapshot.id,
      type: snapshot.snapshotType,
      ftp: rider.ftp,
      rating: rider.raceRating?.currentRating,
    });

    return snapshot;
  }

  /**
   * Haal rider geschiedenis op voor trend analyse
   */
  async getRiderHistory(riderId: number, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return await prisma.riderHistory.findMany({
      where: {
        riderId,
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  /**
   * Haal alle favorite riders op (Workflow Step 1)
   */
  async getAllFavorites() {
    return await prisma.rider.findMany({
      where: { isFavorite: true },
      include: {
        club: true,
        raceRating: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Check of rider al favorite is
   */
  async isFavorite(zwiftId: number): Promise<boolean> {
    const rider = await prisma.rider.findUnique({
      where: { zwiftId },
      select: { isFavorite: true },
    });
    return rider?.isFavorite ?? false;
  }

  /**
   * Haal alle favorite zwiftIds op (voor filtering)
   */
  async getFavoriteZwiftIds(): Promise<number[]> {
    const riders = await prisma.rider.findMany({
      where: { isFavorite: true },
      select: { zwiftId: true },
    });
    return riders.map(r => r.zwiftId);
  }

  /**
   * Verwijder rider uit database (cascade delete voor gerelateerde data)
   */
  async deleteRider(zwiftId: number) {
    return await prisma.rider.delete({
      where: { zwiftId },
    });
  }
}

/**
 * Database repository voor Club operaties
 */
export class ClubRepository {
  /**
   * Sla club data op of update bestaande club (overload for Step 3)
   */
  async upsertClub(data: { id: number; name?: string; memberCount?: number }) {
    return await prisma.club.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        ...(data.memberCount !== undefined && { memberCount: data.memberCount }),
      },
      create: {
        id: data.id,
        name: data.name || `Club ${data.id}`,
        memberCount: data.memberCount || 0,
      },
    });
  }

  /**
   * Update club source (Workflow Step 3)
   */
  async updateClubSource(clubId: number, source: 'favorite_rider' | 'manual' | 'api') {
    return await prisma.club.update({
      where: { id: clubId },
      data: { source },
    });
  }

  /**
   * Haal alle clubs op
   */
  async getAllClubs() {
    return await prisma.club.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Haal club data op met members
   */
  async getClub(clubId: number) {
    return await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        members: {
          orderBy: { ranking: 'asc' },
        },
      },
    });
  }
}

/**
 * Database repository voor Race Result operaties
 * Updated voor Schema v2.0
 */
export class ResultRepository {
  /**
   * Sla race resultaat op
   * First creates/updates the Event, then the RaceResult
   */
  async upsertResult(data: RaceResultData, source: 'zwiftpower' | 'zwiftranking') {
    // First ensure the event exists
    if (!data.eventId) {
      throw new Error('eventId is required');
    }

    await prisma.event.upsert({
      where: { id: data.eventId },
      update: {
        name: data.eventName || `Event ${data.eventId}`,
        eventDate: data.eventDate ? new Date(data.eventDate) : new Date(),
      },
      create: {
        id: data.eventId,
        name: data.eventName || `Event ${data.eventId}`,
        eventDate: data.eventDate ? new Date(data.eventDate) : new Date(),
      },
    });

    // Create race result (skip if duplicate - let database handle via indexes)
    try {
      return await prisma.raceResult.create({
        data: {
          eventId: data.eventId,
          riderId: data.riderId,
          riderType: 'favorite', // Results for favorite riders (90d history)
          position: data.position,
          category: data.category,
          averagePower: data.averagePower,
          averageWkg: data.averageWkg,
          time: data.time,
          distance: data.distance,
          source: source,
          didFinish: true,
        },
      });
    } catch (error) {
      // Ignore duplicate errors
      logger.debug(`Race result already exists: event ${data.eventId}, rider ${data.riderId}`);
      return null;
    }
  }

  /**
   * Sla meerdere resultaten op in bulk
   */
  async upsertResultsBulk(results: RaceResultData[], source: 'zwiftpower' | 'zwiftranking') {
    // Gebruik sequential processing voor betere error handling
    const savedResults = [];
    for (const result of results) {
      const saved = await this.upsertResult(result, source);
      savedResults.push(saved);
    }
    return savedResults;
  }

  /**
   * Haal recente resultaten op voor een rider
   */
  async getRiderResults(riderId: number, limit: number = 20) {
    return await prisma.raceResult.findMany({
      where: { riderId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        event: {
          select: {
            eventDate: true,
            name: true,
            routeName: true,
          },
        },
        rider: {
          select: {
            name: true,
            categoryRacing: true,
          },
        },
      },
    });
  }

  /**
   * Haal resultaten op voor een event
   */
  async getEventResults(eventId: number) {
    return await prisma.raceResult.findMany({
      where: { eventId },
      orderBy: { position: 'asc' },
      include: {
        event: {
          select: {
            name: true,
            eventDate: true,
            routeName: true,
            distance: true,
          },
        },
        rider: {
          select: {
            zwiftId: true,
            name: true,
            categoryRacing: true,
            countryCode: true,
            club: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Haal recente race resultaten op voor een club
   */
  async getClubRecentResults(clubId: number, limit: number = 50) {
    return await prisma.raceResult.findMany({
      where: {
        rider: {
          clubId: clubId,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        event: {
          select: {
            eventDate: true,
            name: true,
          },
        },
        rider: {
          select: {
            name: true,
            categoryRacing: true,
          },
        },
      },
    });
  }
}

/**
 * Database repository voor Sync Log operaties
 * Updated voor Schema v2.0
 */
export class SyncLogRepository {
  /**
   * Log een sync operatie met enhanced tracking
   */
  async logSync(
    syncType: string,
    status: 'success' | 'error' | 'partial' | 'rate_limited',
    recordsProcessed: number,
    duration: number,
    errorMessage?: string,
    options?: {
      recordsCreated?: number;
      recordsUpdated?: number;
      recordsFailed?: number;
      targetId?: string;
      triggeredBy?: string;
      metadata?: Record<string, any>;
    }
  ) {
    return await prisma.syncLog.create({
      data: {
        syncType,
        status,
        recordsProcessed,
        recordsCreated: options?.recordsCreated || 0,
        recordsUpdated: options?.recordsUpdated || 0,
        recordsFailed: options?.recordsFailed || 0,
        duration,
        errorMessage,
        targetId: options?.targetId,
        triggeredBy: options?.triggeredBy || 'manual',
        metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Haal recente sync logs op
   */
  async getRecentLogs(limit: number = 50) {
    return await prisma.syncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Haal logs op voor specifiek sync type
   */
  async getLogsByType(syncType: string, limit: number = 20) {
    return await prisma.syncLog.findMany({
      where: { syncType },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Haal laatste succesvolle sync op
   */
  async getLastSuccessfulSync(syncType: string) {
    return await prisma.syncLog.findFirst({
      where: {
        syncType,
        status: 'success',
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

/**
 * Database repository voor Team operaties
 * Handles team management, member toevoegen/verwijderen, en sync status tracking
 */
export class TeamRepository {
  /**
   * Maak nieuw team aan
   */
  async createTeam(data: {
    name: string;
    description?: string;
    autoSyncEnabled?: boolean;
    syncIntervalMinutes?: number;
  }) {
    return await prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
        autoSyncEnabled: data.autoSyncEnabled ?? true,
        syncIntervalMinutes: data.syncIntervalMinutes ?? 60,
      },
      include: {
        members: {
          include: {
            rider: true,
          },
        },
      },
    });
  }

  /**
   * Haal team op met alle members
   */
  async getTeam(teamId: number) {
    return await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            rider: {
              include: {
                club: true,
                statistics: true,
              },
            },
          },
          orderBy: {
            addedAt: 'desc',
          },
        },
      },
    });
  }

  /**
   * Haal alle teams op
   */
  async getAllTeams() {
    return await prisma.team.findMany({
      include: {
        members: {
          include: {
            rider: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update team instellingen
   */
  async updateTeam(
    teamId: number,
    data: {
      name?: string;
      description?: string;
      isActive?: boolean;
      autoSyncEnabled?: boolean;
      syncIntervalMinutes?: number;
    }
  ) {
    return await prisma.team.update({
      where: { id: teamId },
      data,
    });
  }

  /**
   * Voeg rider toe aan team
   */
  async addTeamMember(teamId: number, riderId: number, role: string = 'member', notes?: string) {
    // Check if member already exists
    const existing = await prisma.teamMember.findFirst({
      where: { teamId, riderId },
    });

    if (existing) {
      throw new Error(`Rider ${riderId} is already a member of team ${teamId}`);
    }

    return await prisma.teamMember.create({
      data: {
        teamId,
        riderId,
        role,
        notes,
        syncStatus: 'pending',
      },
      include: {
        rider: true,
      },
    });
  }

  /**
   * Bulk riders toevoegen aan team
   */
  async addTeamMembersBulk(teamId: number, riderIds: number[], role: string = 'member') {
    // Process sequentially to handle duplicates gracefully
    // (SQLite doesn't support skipDuplicates in createMany)
    const created = [];
    
    for (const riderId of riderIds) {
      try {
        const member = await prisma.teamMember.create({
          data: {
            teamId,
            riderId,
            role,
            syncStatus: 'pending',
          },
          include: {
            rider: true,
          },
        });
        created.push(member);
      } catch (error) {
        // Skip if already exists (unique constraint violation)
        if (error instanceof Error && error.message.includes('Unique constraint')) {
          continue;
        }
        throw error;
      }
    }

    return created;
  }

  /**
   * Verwijder rider uit team
   */
  async removeTeamMember(teamId: number, riderId: number) {
    return await prisma.teamMember.deleteMany({
      where: {
        teamId,
        riderId,
      },
    });
  }

  /**
   * Update team member status
   */
  async updateTeamMemberSyncStatus(
    teamId: number,
    riderId: number,
    status: 'pending' | 'syncing' | 'synced' | 'error',
    error?: string
  ) {
    return await prisma.teamMember.updateMany({
      where: {
        teamId,
        riderId,
      },
      data: {
        syncStatus: status,
        syncError: error,
        lastSyncedAt: status === 'synced' ? new Date() : undefined,
      },
    });
  }

  /**
   * Haal team members op die nog gesynct moeten worden
   */
  async getPendingTeamMembers(teamId: number) {
    return await prisma.teamMember.findMany({
      where: {
        teamId,
        syncStatus: { in: ['pending', 'error'] },
      },
      include: {
        rider: true,
      },
    });
  }

  /**
   * Update laatste sync timestamp van team
   */
  async updateTeamSyncTimestamp(teamId: number) {
    return await prisma.team.update({
      where: { id: teamId },
      data: {
        lastSyncedAt: new Date(),
      },
    });
  }

  /**
   * Verwijder team (cascade deletes members)
   */
  async deleteTeam(teamId: number) {
    return await prisma.team.delete({
      where: { id: teamId },
    });
  }

  /**
   * Check of rider al in team zit
   */
  async isRiderInTeam(teamId: number, riderId: number): Promise<boolean> {
    const member = await prisma.teamMember.findFirst({
      where: {
        teamId,
        riderId,
      },
    });
    return member !== null;
  }

  /**
   * Haal team statistics op
   */
  async getTeamStatistics(teamId: number) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            rider: {
              include: {
                statistics: true,
                raceResults: {
                  take: 1,
                  orderBy: {
                    createdAt: 'desc',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!team) return null;

    // Calculate aggregated stats
    const totalMembers = team.members.length;
    const avgFtp = team.members
      .map(m => m.rider.ftp)
      .filter(f => f !== null)
      .reduce((sum, ftp) => sum + (ftp || 0), 0) / totalMembers;

    const avgWkg = team.members
      .map(m => m.rider.ftpWkg)
      .filter(w => w !== null)
      .reduce((sum, wkg) => sum + (wkg || 0), 0) / totalMembers;

    const totalRaces = team.members
      .map(m => m.rider.totalRaces)
      .reduce((sum, races) => sum + (races || 0), 0);

    const totalWins = team.members
      .map(m => m.rider.totalWins)
      .reduce((sum, wins) => sum + (wins || 0), 0);

    const membersSynced = team.members.filter(m => m.syncStatus === 'synced').length;
    const membersPending = team.members.filter(m => m.syncStatus === 'pending').length;
    const membersError = team.members.filter(m => m.syncStatus === 'error').length;

    return {
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
      },
      stats: {
        totalMembers,
        avgFtp: avgFtp || null,
        avgWkg: avgWkg || null,
        totalRaces,
        totalWins,
      },
      syncStatus: {
        synced: membersSynced,
        pending: membersPending,
        error: membersError,
      },
    };
  }
}

/**
 * Database repository voor ClubMember operaties (AUTOMATISCH VIA CLUBID)
 * Club members zijn read-only snapshots van de club roster
 */
export class ClubMemberRepository {
  /**
   * Sla club member op of update bestaande
   * Dit is een snapshot van de club roster data
   */
  async upsertClubMember(data: RiderData, clubId: number) {
    const effectiveFtp = data.zpFTP || data.ftp;
    const ftpWkg = effectiveFtp && data.weight 
      ? effectiveFtp / data.weight 
      : null;

    const age = data.age ? parseInt(data.age) : null;
    const ageIsValid = age && !isNaN(age) ? age : null;

    // Extract last race date from race stats
    const lastRaceDate = data.race?.last?.date 
      ? new Date(data.race.last.date * 1000) 
      : null;

    // Extract power curve data
    const powerCurve = data.power ? {
      power5s: data.power.w5,
      power15s: data.power.w15,
      power30s: data.power.w30,
      power1min: data.power.w60,
      power2min: data.power.w120,
      power5min: data.power.w300,
      power20min: data.power.w1200,
      powerWkg5s: data.power.wkg5,
      powerWkg15s: data.power.wkg15,
      powerWkg30s: data.power.wkg30,
      powerWkg1min: data.power.wkg60,
      powerWkg2min: data.power.wkg120,
      powerWkg5min: data.power.wkg300,
      powerWkg20min: data.power.wkg1200,
      criticalPower: data.power.CP,
      anaerobicWork: data.power.AWC,
      // Note: compoundScore and powerRating are only in Rider table, not ClubMember
    } : {};

    // Extract terrain handicaps
    const handicaps = data.handicaps?.profile ? {
      handicapFlat: data.handicaps.profile.flat,
      handicapRolling: data.handicaps.profile.rolling,
      handicapHilly: data.handicaps.profile.hilly,
      handicapMountainous: data.handicaps.profile.mountainous,
    } : {};

    return await prisma.clubMember.upsert({
      where: {
        unique_club_member: {
          zwiftId: data.riderId,
          clubId: clubId,
        },
      },
      update: {
        name: data.name,
        categoryRacing: data.zpCategory || data.categoryRacing,
        ftp: effectiveFtp,
        ftpWkg: ftpWkg,
        powerToWeight: data.powerToWeight || data.power?.compoundScore,
        ...powerCurve,
        gender: data.gender,
        age: ageIsValid,
        countryCode: data.country || data.countryCode,
        weight: data.weight,
        height: data.height,
        totalWins: data.race?.wins,
        totalPodiums: data.race?.podiums,
        totalRaces: data.race?.finishes,
        totalDnfs: data.race?.dnfs,
        ...handicaps,
        ranking: data.ranking,
        rankingScore: data.rankingScore,
        lastRaceDate: lastRaceDate,
        isActive: true,
        lastSynced: new Date(),
      },
      create: {
        zwiftId: data.riderId,
        name: data.name,
        club: {
          connect: { id: clubId },
        },
        categoryRacing: data.zpCategory || data.categoryRacing,
        ftp: effectiveFtp,
        ftpWkg: ftpWkg,
        powerToWeight: data.powerToWeight || data.power?.compoundScore,
        ...powerCurve,
        gender: data.gender,
        age: ageIsValid,
        countryCode: data.country || data.countryCode,
        weight: data.weight,
        height: data.height,
        totalWins: data.race?.wins,
        totalPodiums: data.race?.podiums,
        totalRaces: data.race?.finishes,
        totalDnfs: data.race?.dnfs,
        ...handicaps,
        ranking: data.ranking,
        rankingScore: data.rankingScore,
        lastRaceDate: lastRaceDate,
        isActive: true,
      },
    });
  }

  /**
   * Bulk upsert voor club members (efficiënt)
   */
  async upsertClubMembersBulk(riders: RiderData[], clubId: number) {
    const operations = riders.map((rider) =>
      this.upsertClubMember(rider, clubId)
    );

    return await Promise.all(operations);
  }

  /**
   * Haal alle club members op voor een club
   */
  async getClubMembers(clubId: number) {
    return await prisma.clubMember.findMany({
      where: { clubId },
      orderBy: { ranking: 'asc' },
    });
  }

  /**
   * Haal actieve club members op (met recente race)
   */
  async getActiveClubMembers(clubId: number, daysAgo: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    return await prisma.clubMember.findMany({
      where: {
        clubId,
        lastRaceDate: {
          gte: cutoffDate,
        },
      },
      orderBy: { ranking: 'asc' },
    });
  }

  /**
   * Verwijder club member
   */
  async deleteClubMember(zwiftId: number, clubId: number) {
    return await prisma.clubMember.delete({
      where: {
        unique_club_member: {
          zwiftId,
          clubId,
        },
      },
    });
  }

  /**
   * Verwijder alle members van een club
   */
  async deleteAllClubMembers(clubId: number) {
    return await prisma.clubMember.deleteMany({
      where: { clubId },
    });
  }

  /**
   * Krijg club member statistieken
   */
  async getClubMemberStats(clubId: number) {
    const members = await prisma.clubMember.findMany({
      where: { clubId },
    });

    const total = members.length;
    const active7d = members.filter(m => {
      if (!m.lastRaceDate) return false;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return m.lastRaceDate >= weekAgo;
    }).length;

    const avgFtp = members
      .map(m => m.ftp)
      .filter(f => f !== null)
      .reduce((sum, ftp) => sum + (ftp || 0), 0) / total;

    const avgWkg = members
      .map(m => m.ftpWkg)
      .filter(w => w !== null)
      .reduce((sum, wkg) => sum + (wkg || 0), 0) / total;

    return {
      total,
      active7d,
      inactive: total - active7d,
      avgFtp: avgFtp || null,
      avgWkg: avgWkg || null,
    };
  }

  /**
   * Update isFavorite status voor club members (Workflow Step 4)
   */
  async updateFavoriteStatus(clubId: number, favoriteZwiftIds: number[]) {
    // Set all to false first
    await prisma.clubMember.updateMany({
      where: { clubId },
      data: { isFavorite: false },
    });

    // Set favorites to true
    if (favoriteZwiftIds.length > 0) {
      await prisma.clubMember.updateMany({
        where: {
          clubId,
          zwiftId: { in: favoriteZwiftIds },
        },
        data: { isFavorite: true },
      });
    }
  }

  /**
   * Haal alle tracked riders op (favorites + club members van favorite clubs)
   */
  async getAllTrackedRiders(): Promise<number[]> {
    const members = await prisma.clubMember.findMany({
      where: {
        club: { source: 'favorite_rider' },
      },
      select: { zwiftId: true },
    });
    return [...new Set(members.map(m => m.zwiftId))];
  }

  /**
   * Haal alleen favorites uit club members
   */
  async getFavoriteClubMembers(clubId?: number) {
    return await prisma.clubMember.findMany({
      where: {
        isFavorite: true,
        ...(clubId && { clubId }),
      },
      include: { club: true },
      orderBy: { ranking: 'asc' },
    });
  }
}

/**
 * Database repository voor Event operaties (Workflow Step 5)
 * Beheert events met soft delete en 100-day retention
 */
export class EventRepository {
  /**
   * Sla event op of update bestaand
   */
  async upsertEvent(data: {
    id: number;
    name: string;
    eventDate: Date;
    clubId?: number;
    totalFinishers?: number;
  }) {
    return await prisma.event.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        name: data.name,
        eventDate: data.eventDate,
        clubId: data.clubId,
        totalFinishers: data.totalFinishers || 0,
      },
      update: {
        name: data.name,
        totalFinishers: data.totalFinishers || 0,
      },
    });
  }

  /**
   * Haal laatste bekende event ID op
   */
  async getLastEventId(): Promise<number> {
    const event = await prisma.event.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    return event?.id || 0;
  }

  /**
   * Haal actieve events op (niet gearchiveerd)
   */
  async getActiveEvents(limit?: number) {
    return await prisma.event.findMany({
      where: { deletedAt: null },
      orderBy: { eventDate: 'desc' },
      take: limit,
      include: {
        club: true,
        _count: { select: { results: true } },
      },
    });
  }

  /**
   * Soft delete oude events (100-day retention)
   */
  async softDeleteOldEvents(retentionDays: number = 100) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.event.updateMany({
      where: {
        eventDate: { lt: cutoffDate },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    logger.info(`Soft deleted ${result.count} events older than ${retentionDays} days`);
    return result.count;
  }

  /**
   * Hard delete race results van gearchiveerde events
   */
  async deleteArchivedResults(graceDays: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - graceDays);

    const result = await prisma.raceResult.deleteMany({
      where: {
        event: {
          deletedAt: {
            not: null,
            lt: cutoffDate,
          },
        },
      },
    });

    logger.info(`Hard deleted ${result.count} race results from archived events`);
    return result.count;
  }

  /**
   * Haal events op met tracked rider deelname
   */
  async getEventsWithTrackedRiders(trackedRiderIds: number[], limit?: number) {
    return await prisma.event.findMany({
      where: {
        deletedAt: null,
        results: {
          some: {
            riderId: { in: trackedRiderIds },
          },
        },
      },
      orderBy: { eventDate: 'desc' },
      take: limit,
      include: {
        club: true,
        results: {
          where: {
            riderId: { in: trackedRiderIds },
          },
        },
      },
    });
  }
}

