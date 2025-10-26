/**
 * Data Collection Service
 * 
 * Orkestreert de complete data collection flow:
 * 1. Haal rider details op (met ClubID)
 * 2. Haal rider races op (laatste 90 dagen)
 * 3. Haal club gegevens op
 * 4. Haal alle club members + hun 24u races op
 * 
 * Met rate limiting en error handling
 */

import { ZwiftApiClient } from '../api/zwift-client.js';
import { RiderRepository, ClubRepository, ResultRepository, SyncLogRepository, ClubMemberRepository } from '../database/repositories.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

export class DataCollectionService {
  private apiClient: ZwiftApiClient;
  private riderRepo: RiderRepository;
  private clubRepo: ClubRepository;
  private clubMemberRepo: ClubMemberRepository; // Voor club roster sync
  private resultRepo: ResultRepository;
  private syncLogRepo: SyncLogRepository;

  constructor() {
    this.apiClient = new ZwiftApiClient({
      apiKey: config.zwiftApiKey,
      baseUrl: config.zwiftApiBaseUrl,
    });
    this.riderRepo = new RiderRepository();
    this.clubRepo = new ClubRepository();
    this.clubMemberRepo = new ClubMemberRepository(); // Zal later gebruikt worden
    this.resultRepo = new ResultRepository();
    this.syncLogRepo = new SyncLogRepository();
  }

  /**
   * HOOFDFUNCTIE: Verzamel alle data voor een rider
   * Voert prioriteit 1-4 uit in volgorde
   * 
   * @param zwiftId - Rider ID
   * @param options - Configuratie opties
   */
  async collectRiderData(
    zwiftId: number,
    options: {
      includeRaceHistory?: boolean;      // Prio 2: rider races (90 dagen)
      includeClubData?: boolean;         // Prio 3: club gegevens
      includeClubMembersRaces?: boolean; // Prio 4: alle club members + 24u races (ZEER LANGZAAM!)
    } = {}
  ): Promise<{
    rider: any;
    raceHistory: number;
    club: any | null;
    clubMembers: number;
    clubRaces24h: number;
  }> {
    // Defaults
    const {
      includeRaceHistory = true,
      includeClubData = true,
      includeClubMembersRaces = false, // Default FALSE - te langzaam voor normale gebruik
    } = options;

    const startTime = Date.now();
    logger.info(`Start data collectie voor rider ${zwiftId}`);

    try {
      // PRIO 1: Rider details + ClubID (ALTIJD)
      logger.info('Prio 1: Rider details ophalen...');
      const rider = await this.collectRiderDetails(zwiftId);
      
      // PRIO 2: Rider races laatste 90 dagen (OPTIONEEL)
      let raceHistory = 0;
      if (includeRaceHistory) {
        logger.info('Prio 2: Rider race historie (90 dagen) ophalen...');
        raceHistory = await this.collectRiderRaces(zwiftId, 90);
      } else {
        logger.info('Prio 2: Skip (disabled)');
      }
      
      // PRIO 3 & 4: Club gegevens (OPTIONEEL)
      let club = null;
      let clubMembers = 0;
      let clubRaces24h = 0;
      
      if (rider.clubId && includeClubData) {
        logger.info(`Prio 3: Club ${rider.clubId} gegevens ophalen...`);
        club = await this.collectClubData(rider.clubId);
        
        // PRIO 4: Alle club members + hun 24u races (ZEER LANGZAAM - optioneel)
        if (includeClubMembersRaces) {
          logger.warn(`Prio 4: Alle club members + 24u races ophalen (dit duurt ${Math.ceil(club?.memberCount || 0)}+ minuten!)...`);
          const clubData = await this.collectClubMembersAndRaces(rider.clubId);
          clubMembers = clubData.totalMembers;
          clubRaces24h = clubData.totalRaces24h;
        } else {
          logger.info('Prio 4: Skip (disabled - gebruik --full voor volledige club sync)');
        }
      } else {
        if (!rider.clubId) {
          logger.warn(`Rider ${zwiftId} heeft geen clubId, skip prio 3 & 4`);
        } else {
          logger.info('Prio 3 & 4: Skip (disabled)');
        }
      }

      const duration = Date.now() - startTime;
      
      // Log success
      await this.syncLogRepo.logSync(
        'rider_full_collection',
        'success',
        1,
        duration,
        undefined,
        {
          recordsCreated: 1,
          targetId: zwiftId.toString(),
          triggeredBy: 'manual',
        }
      );

      logger.info(`✅ Data collectie voltooid in ${duration}ms`);

      return {
        rider,
        raceHistory,
        club,
        clubMembers,
        clubRaces24h,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.syncLogRepo.logSync(
        'rider_full_collection',
        'error',
        0,
        duration,
        (error as Error).message,
        {
          targetId: zwiftId.toString(),
          triggeredBy: 'manual',
        }
      );

      logger.error(`❌ Data collectie gefaald voor rider ${zwiftId}:`, error);
      throw error;
    }
  }

  /**
   * PRIO 1: Haal rider details op en sla op
   * API: /public/riders/:riderId
   * Note: API geeft GEEN clubId terug - die moet je ophalen via club members API
   */
  private async collectRiderDetails(zwiftId: number) {
    try {
      const riderData = await this.apiClient.getRider(zwiftId);
      
      // Sla op ZONDER clubId (die halen we later op via club members)
      const rider = await this.riderRepo.upsertRider(riderData);
      
      logger.info(`✓ Rider ${rider.name} (${zwiftId}) opgeslagen. Club: ${rider.clubId || 'onbekend'}`);
      
      return rider;
    } catch (error) {
      logger.error(`Fout bij ophalen rider ${zwiftId}:`, error);
      throw error;
    }
  }

  /**
   * PRIO 2: Haal rider races op (laatste X dagen)
   * API: /public/riders/:riderId/results
   */
  private async collectRiderRaces(zwiftId: number, days: number = 90): Promise<number> {
    try {
      logger.info(`Haal race results op voor rider ${zwiftId} (laatste ${days} dagen)...`);
      
      const results = await this.apiClient.getRiderResults(zwiftId);
      
      if (results.length === 0) {
        logger.info(`Geen races gevonden voor rider ${zwiftId}`);
        return 0;
      }
      
      // Filter op laatste X dagen
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const recentResults = results.filter(r => {
        if (!r.eventDate) return false;
        const eventDate = new Date(r.eventDate);
        return eventDate >= cutoffDate;
      });

      if (recentResults.length === 0) {
        logger.info(`Geen races gevonden voor rider ${zwiftId} in laatste ${days} dagen (totaal: ${results.length} races)`);
        return 0;
      }

      // Sla bulk op via ResultRepository
      const savedResults = await this.resultRepo.upsertResultsBulk(recentResults, 'zwiftranking');
      
      logger.info(`✓ ${savedResults.length} races opgeslagen voor rider ${zwiftId} (laatste ${days} dagen, totaal beschikbaar: ${results.length})`);
      
      return savedResults.length;
    } catch (error) {
      logger.error(`Fout bij ophalen races voor rider ${zwiftId}:`, error);
      // Don't throw - continue met rest van flow
      return 0;
    }
  }

  /**
   * PRIO 3: Haal club gegevens op
   * API: /public/clubs/:clubId retourneert { clubId, name, riders }
   */
  private async collectClubData(clubId: number) {
    try {
      const clubData = await this.apiClient.getClubMembers(clubId);
      
      // upsertClub verwacht (clubId, memberCount, name?)
      const club = await this.clubRepo.upsertClub(
        clubData.clubId,
        clubData.riders.length,
        clubData.name
      );
      
      logger.info(`✓ Club ${club.name} (${clubId}) opgeslagen. Members: ${club.memberCount}`);
      
      return club;
    } catch (error) {
      logger.error(`Fout bij ophalen club ${clubId}:`, error);
      // Don't throw - club data is nice-to-have
      return null;
    }
  }

  /**
   * PRIO 4: Haal ALLE club members op + hun races van laatste 24u
   * OPTIMALISATIE v2: Gebruik POST /public/riders (bulk API)
   * 
   * Strategie:
   * 1. Haal club info op (geeft rider IDs)
   * 2. POST /public/riders (bulk) - haal ALLE members in 1 call op (max 1000)
   * 3. Filter op recent actieve riders (laatste 7 dagen)
   * 4. Alleen voor actieve riders: haal 24u races op (1 call/min)
   * 
   * Besparing:
   * - Was: 400 individuele rider calls + ~50 race calls = ~450 calls
   * - Nu: 1 bulk call + ~50 race calls = ~51 calls!
   */
  private async collectClubMembersAndRaces(clubId: number): Promise<{
    totalMembers: number;
    totalRaces24h: number;
  }> {
    try {
      // STAP 1: Haal club info op (geeft rider IDs, maar niet alle rider details)
      const clubData = await this.apiClient.getClubMembers(clubId);
      const riderIds = clubData.riders.map(r => r.riderId);
      
      logger.info(`Club ${clubId} heeft ${clubData.riders.length} members`);
      logger.info(`🚀 Bulk ophalen rider details (${riderIds.length} IDs in 1 API call)...`);

      // STAP 2: BULK OPTIMALISATIE - Haal alle riders in 1 call op!
      // POST /public/riders (max 1000 IDs, rate limit: 1/15min)
      const batchSize = 1000;
      const batches = [];
      for (let i = 0; i < riderIds.length; i += batchSize) {
        batches.push(riderIds.slice(i, i + batchSize));
      }

      const allMembers = [];
      for (let i = 0; i < batches.length; i++) {
        logger.info(`  Batch ${i + 1}/${batches.length}: ${batches[i].length} riders`);
        const batchMembers = await this.apiClient.getRidersBulk(batches[i]);
        allMembers.push(...batchMembers);
        
        // Wacht 15 min tussen batches (rate limit 1/15min)
        if (i < batches.length - 1) {
          const delayMin = 15;
          logger.info(`  ⏳ Wacht ${delayMin} min tussen batches (rate limit)...`);
          await this.sleep(delayMin * 60 * 1000);
        }
      }

      logger.info(`✓ ${allMembers.length} members opgehaald via bulk API`);

      // STAP 3: Sla alle members op in bulk
      await this.riderRepo.upsertRidersBulk(allMembers, clubId);
      logger.info(`✓ ${allMembers.length} club members opgeslagen in database`);

      // STAP 4: Filter op recent actieve riders voor 24u race collection
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // Laatste 7 dagen
      
      const activeMembers = allMembers.filter(member => {
        // Members zonder race data zijn waarschijnlijk niet recent actief
        if (!member.race?.last?.date) return false;
        
        // Check of laatste race binnen 7 dagen is
        const lastRaceDate = new Date(member.race.last.date * 1000); // epoch to Date
        return lastRaceDate >= cutoffDate;
      });

      logger.info(`📊 Actieve members (laatste 7 dagen): ${activeMembers.length}/${allMembers.length}`);
      
      if (activeMembers.length === 0) {
        logger.info('Geen recent actieve members, skip 24u race collection');
        return {
          totalMembers: allMembers.length,
          totalRaces24h: 0,
        };
      }

      // STAP 5: Nu alleen voor actieve members: haal 24u races op
      // RATE LIMITING: 1 call/min voor getRiderResults
      let totalRaces24h = 0;
      const delayMs = 61 * 1000; // 61s tussen calls

      logger.info(`Start 24u race collection voor ${activeMembers.length} actieve members...`);
      logger.info(`⏱️  Geschatte duur: ${Math.ceil(activeMembers.length)} minuten`);

      for (let i = 0; i < activeMembers.length; i++) {
        const member = activeMembers[i];
        
        logger.info(`[${i + 1}/${activeMembers.length}] ${member.name} (${member.riderId})`);

        try {
          const races = await this.collectRiderRaces(member.riderId, 1); // Laatste 1 dag = 24u
          totalRaces24h += races;
          if (races > 0) {
            logger.info(`  ✓ ${races} races (24u) opgeslagen`);
          }
        } catch (error) {
          logger.warn(`  ⚠️  Skip races:`, (error as Error).message);
        }

        // Wacht tussen calls (behalve laatste)
        if (i < activeMembers.length - 1) {
          logger.info(`  ⏳ Wacht ${delayMs / 1000}s (rate limiting)...`);
          await this.sleep(delayMs);
        }
      }

      logger.info(`✓ Totaal ${totalRaces24h} races (24u) opgeslagen voor ${activeMembers.length} actieve members (${allMembers.length} total)`);

      return {
        totalMembers: allMembers.length,
        totalRaces24h,
      };
    } catch (error) {
      logger.error(`Fout bij ophalen club members voor club ${clubId}:`, error);
      return {
        totalMembers: 0,
        totalRaces24h: 0,
      };
    }
  }

  /**
   * Bulk collectie: voeg meerdere riders toe
   * Voert voor elke rider de complete flow uit (prio 1-4)
   */
  async collectMultipleRiders(zwiftIds: number[]): Promise<{
    successful: number;
    failed: number;
    results: any[];
  }> {
    logger.info(`Start bulk collectie voor ${zwiftIds.length} riders`);

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const zwiftId of zwiftIds) {
      try {
        const result = await this.collectRiderData(zwiftId);
        results.push({ zwiftId, success: true, data: result });
        successful++;
        
        // Kleine delay tussen riders (rate limiting)
        await this.sleep(2000); // 2s tussen riders
      } catch (error) {
        logger.error(`Fout bij collectie rider ${zwiftId}:`, (error as Error).message);
        results.push({ zwiftId, success: false, error: (error as Error).message });
        failed++;
      }
    }

    logger.info(`Bulk collectie voltooid: ${successful} geslaagd, ${failed} gefaald`);

    return {
      successful,
      failed,
      results,
    };
  }

  /**
   * Verwijder rider uit database (+ alle gerelateerde data)
   */
  async removeRider(zwiftId: number): Promise<void> {
    logger.info(`Verwijder rider ${zwiftId} uit database...`);

    try {
      const rider = await this.riderRepo.getRider(zwiftId);
      
      if (!rider) {
        throw new Error(`Rider ${zwiftId} niet gevonden in database`);
      }

      // Prisma cascade delete handelt automatisch:
      // - RaceResults
      // - RiderHistory
      // - RiderStatistics
      // - TeamMembers
      // - UserFavorites
      
      await this.riderRepo.deleteRider(zwiftId);
      
      logger.info(`✓ Rider ${rider.name} (${zwiftId}) verwijderd uit database`);
    } catch (error) {
      logger.error(`Fout bij verwijderen rider ${zwiftId}:`, error);
      throw error;
    }
  }

  /**
   * Helper: sleep voor rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * TODO: Sync club roster naar ClubMember tabel
   * Dit wordt later geïmplementeerd voor automatische club sync
   */
  async syncClubRoster(clubId: number): Promise<void> {
    // Placeholder - wordt later geïmplementeerd
    logger.info(`TODO: Sync club ${clubId} roster naar ClubMember tabel`);
    await this.clubMemberRepo.getClubMembers(clubId); // Dummy call om TS warning te voorkomen
  }
}
