/**
 * Type definities voor TeamNL Cloud9 Racing Team Backend
 */

// ZwiftRacing API Response Types
export interface ZwiftClub {
  id: number;
  name: string;
  description?: string;
  tag?: string;
  memberCount?: number;
}

export interface ZwiftRider {
  riderId: number;
  name: string;
  category?: string;
  ranking?: number;
  points?: number;
}

export interface ZwiftEvent {
  id: number;
  name: string;
  eventDate: string;
  type?: string;
  clubId?: number;
}

export interface ZwiftResult {
  eventId: number;
  riderId: number;
  position: number;
  time?: number;
  points?: number;
}

export interface RiderHistory {
  riderId: number;
  date: string;
  ranking: number;
  points: number;
  category: string;
}

export interface SyncLog {
  id: string;
  endpoint: string;
  status: 'success' | 'error';
  recordsProcessed: number;
  message?: string;
  timestamp: string;
}

// Supabase Database Types (matches schema)
export interface DbClub {
  id: number;
  name: string;
  description?: string;
  tag?: string;
  member_count?: number;
  last_synced?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbRider {
  id: number;
  zwift_id: number;
  name: string;
  category?: string;
  ranking?: number;
  points?: number;
  club_id?: number;
  is_active?: boolean;
  last_synced?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbEvent {
  id: number;
  zwift_event_id: number;
  name: string;
  event_date: string;
  event_type?: string;
  club_id?: number;
  last_synced?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbResult {
  id: number;
  event_id: number;
  rider_id: number;
  position: number;
  time_seconds?: number;
  points?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbRiderHistory {
  id: number;
  rider_id: number;
  snapshot_date: string;
  ranking: number;
  points: number;
  category: string;
  created_at?: string;
}

export interface DbSyncLog {
  id: number;
  endpoint: string;
  status: string;
  records_processed: number;
  error_message?: string;
  created_at: string;
}
