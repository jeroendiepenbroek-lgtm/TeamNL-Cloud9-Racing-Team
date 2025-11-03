/**
 * Supabase Sync Service - PostgreSQL sync replacement for Firebase
 */

import { logger } from '../utils/logger.js';
import getSupabaseClient from './supabase-client.js';
import {
  mapRider,
  mapClub,
  mapClubMember,
  mapEvent,
  mapResult,
  mapRiderHistory,
} from './firebase-firestore.mapper.js';

function getClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not initialized');
  return client;
}

async function syncRider(riderData: any): Promise<boolean> {
  try {
    const client = getClient();
    const mapped = mapRider(riderData);
    if (!mapped || !mapped.zwiftId) {
      logger.warn('syncRider: Missing required zwiftId', { riderData });
      return false;
    }

    // Calculate w/kg safely with defaults
    const ftp = mapped.ftp ? Number(mapped.ftp) : null;
    const weight = mapped.weight ? Number(mapped.weight) : null;
    const wPerKg = (ftp && weight && weight > 0) ? ftp / weight : null;

    const { error } = await client
      .from('riders')
      .upsert({
        zwift_id: mapped.zwiftId,
        name: mapped.name || 'Unknown Rider',
        ftp: ftp,
        weight: weight,
        w_per_kg: wPerKg,
        ranking: mapped.ranking || null,
        ranking_score: mapped.rankingScore || null,
        category_racing: mapped.categoryRacing || null,
        country_code: mapped.countryCode || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'zwift_id' });

    if (error) {
      logger.error('syncRider DB error:', error);
      return false;
    }

    return true;
  } catch (error: any) {
    logger.error('syncRider error:', error.message);
    return false;
  }
}

async function syncRiderHistory(riderId: number, snapshotDate: Date, historyData: any): Promise<boolean> {
  try {
    const client = getClient();
    const mapped = mapRiderHistory(riderId, snapshotDate, historyData);
    if (!mapped) return false;

    const { error } = await client
      .from('rider_history')
      .upsert({
        rider_id: riderId,
        snapshot_date: snapshotDate.toISOString(),
        ftp: mapped.ftp || null,
        weight: mapped.weight || null,
        w_per_kg: mapped.powerToWeight || null,
        ranking: mapped.ranking || null,
        ranking_score: mapped.rankingScore || null,
        category_racing: mapped.categoryRacing || null,
      }, { onConflict: 'rider_id,snapshot_date' });

    return !error;
  } catch (error: any) {
    logger.error('syncRiderHistory error:', error.message);
    return false;
  }
}

async function syncClub(clubData: any): Promise<boolean> {
  try {
    const client = getClient();
    const mapped = mapClub(clubData);
    if (!mapped) return false;

    const { error } = await client
      .from('clubs')
      .upsert({
        club_id: mapped.id,
        name: mapped.name,
        member_count: mapped.memberCount,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'club_id' });

    return !error;
  } catch (error: any) {
    logger.error('syncClub error:', error.message);
    return false;
  }
}

async function syncClubRoster(clubId: number, members: any[]): Promise<boolean> {
  try {
    const client = getClient();
    const CHUNK_SIZE = 500;
    
    for (let i = 0; i < members.length; i += CHUNK_SIZE) {
      const chunk = members.slice(i, i + CHUNK_SIZE);
      const mappedMembers = chunk.map((m) => {
        const mapped = mapClubMember(clubId, m);
        if (!mapped || !mapped.riderId) return null;
        return {
          club_id: clubId,
          rider_id: mapped.riderId,
          joined_at: mapped.joinedAt || new Date().toISOString(),
        };
      }).filter(Boolean);

      if (mappedMembers.length === 0) continue;

      const { error } = await client
        .from('club_roster')
        .upsert(mappedMembers, { onConflict: 'club_id,rider_id' });

      if (error) {
        logger.error(`Club roster upsert failed (chunk ${i / CHUNK_SIZE + 1}):`, error);
        return false;
      }
    }

    logger.info(`Club ${clubId} roster synced: ${members.length} members`);
    return true;
  } catch (error: any) {
    logger.error('syncClubRoster error:', error.message);
    return false;
  }
}

async function syncEvent(eventData: any): Promise<boolean> {
  try {
    const client = getClient();
    const mapped = mapEvent(eventData);
    if (!mapped) return false;

    const { error } = await client
      .from('events')
      .upsert({
        event_id: mapped.id,
        name: mapped.name,
        event_date: mapped.eventDate,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'event_id' });

    return !error;
  } catch (error: any) {
    logger.error('syncEvent error:', error.message);
    return false;
  }
}

async function syncRaceResults(eventId: number, results: any[]): Promise<boolean> {
  try {
    const client = getClient();
    const CHUNK_SIZE = 500;
    let totalSynced = 0;

    for (let i = 0; i < results.length; i += CHUNK_SIZE) {
      const chunk = results.slice(i, i + CHUNK_SIZE);
      const mappedResults = chunk.map((r) => {
        const mapped = mapResult(eventId, r);
        if (!mapped || !mapped.riderId) return null;
        
        return {
          event_id: eventId,
          rider_id: mapped.riderId,
          position: mapped.position || null,
          time: mapped.time || null,
          avg_power: mapped.avgPower || null,
          category: mapped.category || null,
        };
      }).filter(Boolean);

      if (mappedResults.length === 0) continue;

      const { error } = await client
        .from('race_results')
        .upsert(mappedResults, { onConflict: 'event_id,rider_id' });

      if (error) continue;
      totalSynced += mappedResults.length;
    }

    logger.info(`Event ${eventId} results synced: ${totalSynced}/${results.length}`);
    return totalSynced > 0;
  } catch (error: any) {
    logger.error('syncRaceResults error:', error.message);
    return false;
  }
}

interface SyncLogData {
  syncType: 'club' | 'rider' | 'event' | 'results' | 'manual';
  status: 'success' | 'error' | 'partial';
  details?: any;
  itemCount?: number;
  errorMessage?: string;
}

async function logSync(logData: SyncLogData): Promise<boolean> {
  try {
    const client = getClient();

    const { error } = await client
      .from('sync_logs')
      .insert({
        sync_type: logData.syncType,
        status: logData.status,
        details: logData.details || {},
        item_count: logData.itemCount || 0,
        error_message: logData.errorMessage || null,
        created_at: new Date().toISOString(),
      });

    return !error;
  } catch (error: any) {
    logger.error('logSync error:', error.message);
    return false;
  }
}

async function getSyncLogs(limit: number = 50): Promise<any[]> {
  try {
    const client = getClient();

    const { data, error } = await client
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data || [];
  } catch (error: any) {
    logger.error('getSyncLogs error:', error.message);
    return [];
  }
}

async function getSupabaseStats(): Promise<any> {
  try {
    const client = getClient();
    const tables = ['riders', 'clubs', 'events', 'race_results', 'rider_history', 'sync_logs'];
    const stats: any = {};

    for (const table of tables) {
      const { count, error } = await client
        .from(table)
        .select('*', { count: 'exact', head: true });

      stats[table] = error ? 0 : (count || 0);
    }

    return stats;
  } catch (error: any) {
    logger.error('getSupabaseStats error:', error.message);
    return {};
  }
}

async function cleanupSupabase(tables?: string[]): Promise<boolean> {
  try {
    const client = getClient();
    const tablesToClean = tables || ['race_results', 'rider_history', 'club_roster', 'events', 'riders', 'clubs'];

    for (const table of tablesToClean) {
      const { error } = await client
        .from(table)
        .delete()
        .neq('id', 0);

      if (error) {
        logger.error(`Failed to clean ${table}:`, error);
        return false;
      }
    }

    return true;
  } catch (error: any) {
    logger.error('cleanupSupabase error:', error.message);
    return false;
  }
}

export const supabaseSyncService = {
  syncRider,
  syncRiderHistory,
  syncClub,
  syncClubRoster,
  syncEvent,
  syncRaceResults,
  logSync,
  getSyncLogs,
  getSupabaseStats,
  cleanupSupabase,
  getClient,
};
