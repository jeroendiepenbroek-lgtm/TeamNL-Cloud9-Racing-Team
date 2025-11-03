/**
 * MVP Repositories - Cleaned version with only existing tables
 * 
 * Only includes repositories for tables that exist in the current schema:
 * - Rider (basic CRUD)
 * - Club (basic CRUD)
 * - Event (basic CRUD)
 * - RaceResult (basic CRUD)
 * 
 * All other tables (SyncLog, Team, TeamMember, ClubMember, RiderHistory, etc.) are removed
 */

import prisma from './client.js';
import type { RiderData, RaceResultData } from '../types/api.types.js';
import { logger } from '../utils/logger.js';

/**
 * Database repository voor Rider operaties (MVP)
 */
export class RiderRepository {
  /**
   * Sla rider data op of update bestaande rider
   */
  async upsertRider(data: RiderData, clubId?: number) {
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

    const rider = await prisma.rider.upsert({
      where: { zwiftId: data.riderId },
      update: {
        name: data.name,
        categoryRacing: data.zpCategory || data.categoryRacing,
        ftp: effectiveFtp,
        gender: data.gender,
        age: ageIsValid,
        countryCode: data.country || data.countryCode,
        weight: data.weight,
        totalWins: totalWins,
        totalPodiums: totalPodiums,
        totalRaces: totalRaces,
        totalDnfs: totalDnfs,
        ranking: data.ranking,
        rankingScore: data.rankingScore,
        clubId: clubId,
      },
      create: {
        zwiftId: data.riderId,
        name: data.name,
        categoryRacing: data.zpCategory || data.categoryRacing,
        ftp: effectiveFtp,
        gender: data.gender,
        age: ageIsValid,
        countryCode: data.country || data.countryCode,
        weight: data.weight,
        totalWins: totalWins,
        totalPodiums: totalPodiums,
        totalRaces: totalRaces,
        totalDnfs: totalDnfs,
        ranking: data.ranking,
        rankingScore: data.rankingScore,
        clubId: clubId,
      },
    });

    return rider;
  }

  /**
   * Haal rider op uit database
   */
  async getRider(zwiftId: number) {
    return await prisma.rider.findUnique({
      where: { zwiftId },
      include: {
        club: true,
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
   * Haal alle riders op (gefilterd)
   */
  async getRiders(limit: number = 50) {
    return await prisma.rider.findMany({
      orderBy: { ranking: 'asc' },
      take: limit,
      include: {
        club: true,
      },
    });
  }

  /**
   * Haal alle riders op van een club
   */
  async getClubRiders(clubId: number) {
    return await prisma.rider.findMany({
      where: { clubId },
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
      },
    });
  }

  /**
   * Verwijder rider uit database
   */
  async deleteRider(zwiftId: number) {
    return await prisma.rider.delete({
      where: { zwiftId },
    });
  }
}

/**
 * Database repository voor Club operaties (MVP)
 */
export class ClubRepository {
  /**
   * Sla club data op of update bestaande club
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
        riders: {
          orderBy: { ranking: 'asc' },
        },
      },
    });
  }
}

/**
 * Database repository voor Race Result operaties (MVP)
 */
export class ResultRepository {
  /**
   * Sla race resultaat op
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

    // Create race result
    try {
      return await prisma.raceResult.create({
        data: {
          eventId: data.eventId,
          riderId: data.riderId,
          position: data.position,
          averagePower: data.averagePower,
          time: data.time,
        },
      });
    } catch (error) {
      logger.debug(`Race result already exists: event ${data.eventId}, rider ${data.riderId}`);
      return null;
    }
  }

  /**
   * Sla meerdere resultaten op in bulk
   */
  async upsertResultsBulk(results: RaceResultData[], source: 'zwiftpower' | 'zwiftranking') {
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
 * Database repository voor Event operaties (MVP)
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
   * Haal actieve events op
   */
  async getActiveEvents(limit?: number) {
    return await prisma.event.findMany({
      orderBy: { eventDate: 'desc' },
      take: limit,
      include: {
        club: true,
        _count: { select: { results: true } },
      },
    });
  }
}
