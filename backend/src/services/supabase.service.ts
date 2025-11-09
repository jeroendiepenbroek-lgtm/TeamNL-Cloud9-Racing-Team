/**
 * Supabase Client voor directe database toegang
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  DbClub,
  DbRider,
  DbEvent,
  DbResult,
  DbRiderHistory,
  DbSyncLog,
} from '../types/index.js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  // ========== CLUBS ==========
  async getClub(clubId: number): Promise<DbClub | null> {
    const { data, error } = await this.client
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no rows

    if (error) throw error;
    return data;
  }

  async upsertClub(club: Partial<DbClub>): Promise<DbClub> {
    const { data, error } = await this.client
      .from('clubs')
      .upsert(club, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ========== RIDERS ==========
  async getRiders(clubId?: number): Promise<DbRider[]> {
    let query = this.client.from('riders').select('*');
    
    if (clubId) {
      query = query.eq('club_id', clubId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getRider(riderId: number): Promise<DbRider | null> {
    const { data, error } = await this.client
      .from('riders')
      .select('*')
      .eq('rider_id', riderId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async upsertRiders(riders: Partial<DbRider>[]): Promise<DbRider[]> {
    // Strip generated or read-only columns before upsert
    // Be defensief: verwijder expliciet bekende generated kolommen en gooi
    // properties weg die expliciet undefined zijn om per ongeluk setten te voorkomen.
    const GENERATED_COLUMNS = ['watts_per_kg', 'rider_created_at', 'rider_updated_at', 'created_at', 'updated_at'];
    const cleaned = riders.map(r => {
      const copy: any = { ...r };
      // Remove known generated/read-only columns if present
      for (const col of GENERATED_COLUMNS) {
        if (col in copy) delete copy[col];
      }
      // Remove any keys that are explicitly undefined (avoid sending e.g. {foo: undefined})
      for (const k of Object.keys(copy)) {
        if (copy[k] === undefined) delete copy[k];
      }
      return copy as Partial<DbRider>;
    });

    const { data, error } = await this.client
      .from('riders')
      .upsert(cleaned, { onConflict: 'rider_id' })
      .select();

    if (error) throw error;
    return data;
  }

  // ========== EVENTS ==========
  async getEvents(clubId?: number): Promise<DbEvent[]> {
    let query = this.client.from('events').select('*');
    
    if (clubId) {
      query = query.eq('club_id', clubId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async upsertEvents(events: Partial<DbEvent>[]): Promise<DbEvent[]> {
    const { data, error } = await this.client
      .from('events')
      .upsert(events, { onConflict: 'zwift_event_id' })
      .select();

    if (error) throw error;
    return data;
  }

  // ========== RESULTS ==========
  async getEventResults(eventId: number): Promise<DbResult[]> {
    const { data, error } = await this.client
      .from('results')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return data || [];
  }

  async upsertResults(results: Partial<DbResult>[]): Promise<DbResult[]> {
    const { data, error } = await this.client
      .from('results')
      .upsert(results)
      .select();

    if (error) throw error;
    return data;
  }

  // ========== RIDER HISTORY ==========
  async getRiderHistory(riderId: number): Promise<DbRiderHistory[]> {
    const { data, error } = await this.client
      .from('rider_history')
      .select('*')
      .eq('rider_id', riderId)
      .order('snapshot_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async insertRiderHistory(history: Partial<DbRiderHistory>[]): Promise<DbRiderHistory[]> {
    const { data, error } = await this.client
      .from('rider_history')
      .insert(history)
      .select();

    if (error) throw error;
    return data;
  }

  // ========== SYNC LOGS ==========
  async getSyncLogs(limit: number = 50): Promise<DbSyncLog[]> {
    const { data, error } = await this.client
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async createSyncLog(log: Partial<DbSyncLog>): Promise<DbSyncLog> {
    const { data, error } = await this.client
      .from('sync_logs')
      .insert(log)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ========== MY TEAM MEMBERS ==========
  // Query via VIEW (niet direct riders tabel!)
  async getMyTeamMembers(): Promise<any[]> {
    // First get base team data from view
    const { data: teamData, error: teamError } = await this.client
      .from('view_my_team')
      .select('*')
      .order('ranking', { ascending: true, nullsFirst: false });

    if (teamError) throw teamError;
    if (!teamData) return [];

    // Calculate 30-day averages for each rider
    const riderIds = teamData.map(r => r.rider_id);
    
    // Get last 30 days of rating history for all riders
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: historyData, error: historyError } = await this.client
      .from('rider_history')
      .select('rider_id, race_current_rating, snapshot_date')
      .in('rider_id', riderIds)
      .gte('snapshot_date', thirtyDaysAgo.toISOString())
      .order('rider_id')
      .order('snapshot_date', { ascending: false });

    if (historyError) {
      console.warn('Failed to fetch rider history for 30-day averages:', historyError);
      // Continue without 30-day averages
      return teamData.map(r => ({ ...r, rating_30day_avg: null }));
    }

    // Calculate averages per rider
    const avgMap = new Map<number, number>();
    if (historyData) {
      const groupedByRider = new Map<number, number[]>();
      
      for (const record of historyData) {
        if (!record.race_current_rating) continue;
        
        if (!groupedByRider.has(record.rider_id)) {
          groupedByRider.set(record.rider_id, []);
        }
        groupedByRider.get(record.rider_id)!.push(record.race_current_rating);
      }
      
      for (const [riderId, ratings] of groupedByRider.entries()) {
        if (ratings.length > 0) {
          const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
          avgMap.set(riderId, Math.round(avg));
        }
      }
    }

    // Merge 30-day averages into team data
    return teamData.map(rider => ({
      ...rider,
      rating_30day_avg: avgMap.get(rider.rider_id) || rider.race_current_rating || null,
    }));
  }

  async addMyTeamMember(riderId: number): Promise<any> {
    const { data, error } = await this.client
      .from('my_team_members')
      .insert({ rider_id: riderId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeMyTeamMember(riderId: number): Promise<void> {
    const { error } = await this.client
      .from('my_team_members')
      .delete()
      .eq('rider_id', riderId);

    if (error) throw error;
  }

  async bulkAddMyTeamMembers(riderIds: number[]): Promise<any[]> {
    const records = riderIds.map(id => ({ rider_id: id }));
    const { data, error } = await this.client
      .from('my_team_members')
      .upsert(records, { onConflict: 'rider_id' })
      .select();

    if (error) throw error;
    return data || [];
  }

  async toggleFavorite(riderId: number, isFavorite: boolean): Promise<void> {
    const { error } = await this.client
      .from('my_team_members')
      .update({ is_favorite: isFavorite })
      .eq('rider_id', riderId);

    if (error) throw error;
  }
}

export const supabase = new SupabaseService();
