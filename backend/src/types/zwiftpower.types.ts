/**
 * ZwiftPower Type Definities
 */

export interface ZwiftPowerRiderProfile {
  zwift_id: number;
  name: string;
  ftp: number;
  weight_kg: number;
  height_cm: number;
  flag: string;
  age: string;
  team_name: string;
  team_id: string;
  
  // Calculated fields
  wkg: number;
  calculated_category: string;
  
  // Race stats
  race_count: number;
  last_race_date: number;
  last_race_title: string;
  
  // Power curve
  avg_power?: number;
  avg_wkg?: string;
  w5?: number;
  w15?: number;
  w30?: number;
  w60?: number;
  w120?: number;
  w300?: number;
  w1200?: number;
  
  // Links
  profile_url: string;
  
  // Metadata
  data_source: 'zwiftpower';
  fetched_at: string;
}

export interface CategoryThresholds {
  male: {
    'A+': number;
    'A': number;
    'B': number;
    'C': number;
    'D': number;
  };
  female: {
    'A+': number;
    'A': number;
    'B': number;
    'C': number;
    'D': number;
  };
}

export interface CategoryCalculationResult {
  ftp: number;
  weight_kg: number;
  wkg: number;
  calculated_category: string;
  category_threshold: string;
  gender: 'male' | 'female';
  thresholds: {
    'A+': number;
    'A': number;
    'B': number;
    'C': number;
    'D': number;
  };
}

export interface DataSourceComparison {
  zwift_id: number;
  zwiftpower: {
    ftp: number;
    category: string;
    weight: number;
    source: string;
  };
  zwiftRacing: {
    ftp: number;
    category: string;
    source: string;
  };
  differences: {
    ftp_diff: number;
    ftp_changed: boolean;
    category_changed: boolean;
    recommendation: string;
  };
  timestamp: string;
}

export interface ZwiftPowerSyncLog {
  rider_id: number;
  sync_type: 'full' | 'ftp_only' | 'comparison';
  success: boolean;
  data_source: 'zwiftpower' | 'zwiftRacing' | 'both';
  changes_detected: {
    ftp_changed: boolean;
    category_changed: boolean;
    weight_changed: boolean;
  };
  old_values?: {
    ftp?: number;
    category?: string;
    weight?: number;
  };
  new_values: {
    ftp: number;
    category: string;
    weight: number;
    wkg: number;
  };
  error?: string;
  synced_at: string;
}
