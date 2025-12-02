-- ============================================================================
-- Migration 018: Unified Schema voor Multi-Source Dashboards
-- ============================================================================
-- Doel: 3 dashboards (Rider Performance, Events, Results) met data van:
--       - ZwiftRacing.app (vELO, results, events)
--       - Zwift.com (avatar, activities, social)
--       - ZwiftPower (FTP, weight, enrichment)
--
-- POC: Start met rider 150437, dan scale naar 75 team riders
-- ============================================================================

-- ============================================================================
-- TABLE 1: riders_unified (Multi-source rider data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS riders_unified (
  rider_id INT PRIMARY KEY,
  name TEXT NOT NULL,
  
  -- ZwiftRacing.app data
  velo_rating INT,
  velo_rating_updated_at TIMESTAMPTZ,
  category TEXT CHECK (category IN ('A', 'B', 'C', 'D', 'E')),
  race_count_90d INT DEFAULT 0,
  
  -- Zwift.com API data
  zwift_profile_id TEXT UNIQUE,
  avatar_url TEXT,
  avatar_url_large TEXT,
  country_code TEXT,
  country_alpha3 TEXT,
  level INT,
  followers_count INT DEFAULT 0,
  followees_count INT DEFAULT 0,
  currently_riding BOOLEAN DEFAULT false,
  
  -- ZwiftPower data (KRITIEK voor FTP/weight!)
  ftp INT,
  weight_kg DECIMAL(5,2),
  height_cm INT,
  zp_category TEXT,
  zp_ranking_position INT,
  
  -- Metadata
  is_team_member BOOLEAN DEFAULT false,
  club_id INT,
  club_name TEXT,
  
  -- Sync tracking
  last_synced_zwift_racing TIMESTAMPTZ,
  last_synced_zwift_official TIMESTAMPTZ,
  last_synced_zwiftpower TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_riders_unified_team ON riders_unified(is_team_member) WHERE is_team_member = true;
CREATE INDEX IF NOT EXISTS idx_riders_unified_rating ON riders_unified(velo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_riders_unified_category ON riders_unified(category);

-- ============================================================================
-- TABLE 2: rider_rating_history (vELO over tijd voor graphs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rider_rating_history (
  id BIGSERIAL PRIMARY KEY,
  rider_id INT NOT NULL REFERENCES riders_unified(rider_id) ON DELETE CASCADE,
  rating INT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  source TEXT CHECK (source IN ('race_result', 'api_sync', 'zwiftpower')),
  
  UNIQUE(rider_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_rating_history_rider ON rider_rating_history(rider_id, recorded_at DESC);

-- ============================================================================
-- TABLE 3: rider_activities (Recent training van Zwift.com)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rider_activities (
  id BIGSERIAL PRIMARY KEY,
  activity_id BIGINT UNIQUE NOT NULL,
  rider_id INT NOT NULL REFERENCES riders_unified(rider_id) ON DELETE CASCADE,
  
  name TEXT,
  sport TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  
  distance_meters INT,
  duration_seconds INT,
  elevation_meters INT,
  
  avg_watts INT,
  calories INT,
  avg_heart_rate INT,
  max_heart_rate INT,
  
  world_id INT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_rider ON rider_activities(rider_id, start_date DESC);

-- ============================================================================
-- TABLE 4: events_unified (Upcoming events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS events_unified (
  event_id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_type TEXT,
  sub_type TEXT,
  
  -- Route info
  route_id INT,
  route_name TEXT,
  route_world TEXT,
  route_profile TEXT CHECK (route_profile IN ('Flat', 'Rolling', 'Hilly', 'Mountainous')),
  distance_km DECIMAL(5,2),
  elevation_m INT,
  laps INT,
  
  -- Stats
  total_signups INT DEFAULT 0,
  team_signups_count INT DEFAULT 0,
  categories_available TEXT, -- 'A,B,C,D'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events_unified(event_date);
CREATE INDEX IF NOT EXISTS idx_events_team ON events_unified(team_signups_count) WHERE team_signups_count > 0;

-- ============================================================================
-- TABLE 5: event_signups_unified (Who signed up for what)
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_signups_unified (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events_unified(event_id) ON DELETE CASCADE,
  rider_id INT NOT NULL REFERENCES riders_unified(rider_id) ON DELETE CASCADE,
  
  category TEXT,
  weight_kg DECIMAL(5,2),
  height_cm INT,
  
  -- Power profile (from signups data)
  power_wkg_5s DECIMAL(5,2),
  power_wkg_1m DECIMAL(5,2),
  power_wkg_5m DECIMAL(5,2),
  power_wkg_20m DECIMAL(5,2),
  critical_power INT,
  anaerobic_work_capacity INT,
  
  -- Racing stats
  wins INT DEFAULT 0,
  podiums INT DEFAULT 0,
  phenotype TEXT, -- 'SPRINTER', 'ALLROUNDER', 'CLIMBER', etc
  
  is_team_member BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, rider_id)
);

CREATE INDEX IF NOT EXISTS idx_signups_event ON event_signups_unified(event_id);
CREATE INDEX IF NOT EXISTS idx_signups_rider ON event_signups_unified(rider_id);
CREATE INDEX IF NOT EXISTS idx_signups_team ON event_signups_unified(is_team_member) WHERE is_team_member = true;

-- ============================================================================
-- TABLE 6: race_results_unified (Results + ZP enrichment)
-- ============================================================================
CREATE TABLE IF NOT EXISTS race_results_unified (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events_unified(event_id) ON DELETE CASCADE,
  rider_id INT NOT NULL REFERENCES riders_unified(rider_id) ON DELETE CASCADE,
  
  -- Result basics
  rank INT NOT NULL,
  time_seconds INT,
  avg_wkg DECIMAL(5,2),
  category TEXT,
  position_in_category INT,
  
  -- Power curve (ZwiftRacing)
  power_5s DECIMAL(5,2),
  power_15s DECIMAL(5,2),
  power_30s DECIMAL(5,2),
  power_1m DECIMAL(5,2),
  power_2m DECIMAL(5,2),
  power_5m DECIMAL(5,2),
  power_20m DECIMAL(5,2),
  power_avg INT,
  power_max INT,
  
  -- Heart rate
  heartrate_avg INT,
  heartrate_max INT,
  
  -- vELO ratings
  velo_rating INT,
  velo_previous INT,
  velo_change INT,
  
  -- Effort
  effort_score INT,
  race_points DECIMAL(6,2),
  
  -- Status
  dnf BOOLEAN DEFAULT false,
  
  -- ZwiftPower enrichment (nullable until enriched)
  zp_category_enforcement BOOLEAN,
  zp_disqualified BOOLEAN DEFAULT false,
  zp_disqualified_reason TEXT,
  zp_age_group_position INT,
  zp_points INT,
  
  -- Metadata
  source TEXT DEFAULT 'zwift_racing',
  enriched_with_zp BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, rider_id)
);

CREATE INDEX IF NOT EXISTS idx_results_event ON race_results_unified(event_id);
CREATE INDEX IF NOT EXISTS idx_results_rider ON race_results_unified(rider_id);
CREATE INDEX IF NOT EXISTS idx_results_rating ON race_results_unified(velo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_results_created ON race_results_unified(created_at DESC);

-- ============================================================================
-- TABLE 7: sync_status_unified (Track syncs per source)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_status_unified (
  id BIGSERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'riders', 'events', 'signups', 'results', 'activities'
  source TEXT NOT NULL, -- 'zwift_racing', 'zwift_official', 'zwiftpower'
  entity_id TEXT, -- Optional: specific entity (rider_id, event_id)
  
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  records_processed INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_created INT DEFAULT 0,
  
  duration_ms INT,
  error_message TEXT,
  
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_status_type_source ON sync_status_unified(sync_type, source);
CREATE INDEX IF NOT EXISTS idx_sync_status_entity ON sync_status_unified(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sync_status_started ON sync_status_unified(started_at DESC);

-- ============================================================================
-- Migration tracking
-- ============================================================================
COMMENT ON TABLE riders_unified IS 'Multi-source rider data: ZwiftRacing (vELO) + Zwift.com (avatar/social) + ZwiftPower (FTP/weight)';
COMMENT ON TABLE rider_rating_history IS 'vELO rating history for trend graphs (30-day window)';
COMMENT ON TABLE rider_activities IS 'Training rides from Zwift.com API (last 10 activities)';
COMMENT ON TABLE events_unified IS 'Upcoming events from ZwiftRacing.app';
COMMENT ON TABLE event_signups_unified IS 'Event signups with power profiles';
COMMENT ON TABLE race_results_unified IS 'Race results enriched with ZwiftPower data (CE/DQ flags)';
COMMENT ON TABLE sync_status_unified IS 'Multi-source sync monitoring (per API endpoint)';
