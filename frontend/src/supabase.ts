/**
 * Supabase Client Configuration - Frontend
 * Replace Firebase met Supabase PostgreSQL + Real-time
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase credentials ontbreken! Check .env file:\n' +
    'VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key'
  );
}

// Initialize Supabase client (singleton)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Dashboard doesn't need auth sessions
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limit real-time events
    },
  },
});

// Type definitions matching database schema
export interface Rider {
  id: number;
  zwift_id: number;
  name: string;
  ftp: number | null;
  weight: number | null;
  w_per_kg: number | null;
  ranking: number | null;
  ranking_score: number | null;
  category_racing: string | null;
  country_code: string | null;
  height: number | null;
  created_at: string;
  updated_at: string;
}

export interface Club {
  id: number;
  club_id: number;
  name: string;
  member_count: number | null;
  country_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  event_id: number;
  name: string;
  event_date: string;
  created_at: string;
  updated_at: string;
}

export interface RaceResult {
  id: number;
  event_id: number;
  rider_id: number;
  position: number | null;
  category: string | null;
  time_seconds: number | null;
  distance_meters: number | null;
  average_power: number | null;
  average_wkg: number | null;
  normalized_power: number | null;
  max_power: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  created_at: string;
}

export interface RiderHistory {
  id: number;
  rider_id: number;
  snapshot_date: string;
  ftp: number | null;
  weight: number | null;
  w_per_kg: number | null;
  ranking: number | null;
  ranking_score: number | null;
  category_racing: string | null;
  created_at: string;
}

export interface SyncLog {
  id: number;
  sync_type: string;
  status: 'success' | 'error' | 'partial';
  records_processed: number;
  duration_ms: number | null;
  error_message: string | null;
  metadata: any;
  created_at: string;
}

// Export configured client
export default supabase;
