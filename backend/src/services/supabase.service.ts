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
      .single();

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

  async getRider(zwiftId: number): Promise<DbRider | null> {
    const { data, error } = await this.client
      .from('riders')
      .select('*')
      .eq('zwift_id', zwiftId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async upsertRiders(riders: Partial<DbRider>[]): Promise<DbRider[]> {
    const { data, error } = await this.client
      .from('riders')
      .upsert(riders, { onConflict: 'zwift_id' })
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
}

export const supabase = new SupabaseService();
