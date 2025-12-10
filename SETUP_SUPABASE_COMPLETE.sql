-- ============================================================================
-- COMPLETE SUPABASE SETUP VOOR RAILWAY PROJECT
-- ============================================================================
-- Project: bktbeefdmrpxhsyyalvc
-- Draai dit bestand in: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new
-- 
-- Dit script:
-- 1. Maakt alle benodigde tabellen aan
-- 2. Maakt v_rider_complete view
-- 3. Setup is daarna klaar voor data sync
-- ============================================================================

-- MIGRATION 1: Multi-Source Architecture
-- ============================================================================
-- ============================================================================
-- MULTI-SOURCE ARCHITECTURE: Separate source tables + Hybrid views
-- ============================================================================
-- Migration: 001_multi_source_architecture
-- Created: December 8, 2025
-- Purpose: Robust data integration from multiple Zwift APIs
-- Sources: ZwiftRacing.app (PRIMARY) + Zwift Official (ENRICHMENT)
-- Strategy: Raw tables per source + Views for frontend
-- Author: TeamNL Cloud9 Racing Team
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SOURCE TABLE 1: zwift_racing_riders (PRIMARY - 51 fields)
-- API: ZwiftRacing.app (https://zwift-ranking.herokuapp.com)
-- Sync: Every 24 hours
-- Priority: 1 (highest)
-- Auth: API Key (650c6d2fc4ef6858d74cbef1)
-- Bulk: 1000 riders per call
-- ----------------------------------------------------------------------------

CREATE TABLE zwift_racing_riders (
  -- Identity
  rider_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  flag TEXT,
  category TEXT CHECK (category IN ('A', 'B', 'C', 'D', 'E')),
  
  -- Club Membership
  club_id INTEGER NOT NULL DEFAULT 2281,  -- TeamNL Cloud9
  
  -- Physical Stats
  ftp_watts INTEGER,
  ftp_wkg NUMERIC(4,2),
  weight_kg NUMERIC(5,2),
  
  -- Power Curve (5s to 20min)
  power_5s_watts INTEGER,
  power_5s_wkg NUMERIC(4,2),
  power_15s_watts INTEGER,
  power_15s_wkg NUMERIC(4,2),
  power_30s_watts INTEGER,
  power_30s_wkg NUMERIC(4,2),
  power_1min_watts INTEGER,
  power_1min_wkg NUMERIC(4,2),
  power_5min_watts INTEGER,
  power_5min_wkg NUMERIC(4,2),
  power_10min_watts INTEGER,
  power_10min_wkg NUMERIC(4,2),
  power_20min_watts INTEGER,
  power_20min_wkg NUMERIC(4,2),
  
  -- vELO Ratings
  velo_score INTEGER,
  velo_tier TEXT,  -- Bronze, Silver, Gold, Amethyst, Sapphire, Ruby, Emerald, Diamond
  velo_max_90d INTEGER,
  
  -- Phenotype Classification
  phenotype_type TEXT CHECK (phenotype_type IN ('sprinter', 'pursuiter', 'time_trialist', 'road_racer', 'climber', 'unknown')),
  phenotype_score NUMERIC(5,2),
  phenotype_confidence NUMERIC(5,2),
  
  -- Handicap System
  handicap_seconds INTEGER,
  handicap_category TEXT,
  
  -- API Metadata
  api_response_raw JSONB,  -- Full 51-field JSON response
  
  -- Sync Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  sync_status TEXT CHECK (sync_status IN ('success', 'failed', 'pending')) DEFAULT 'success',
  sync_error TEXT
);

-- Indexes for Racing Matrix queries
CREATE INDEX idx_racing_category ON zwift_racing_riders(category);
CREATE INDEX idx_racing_velo ON zwift_racing_riders(velo_score DESC);
CREATE INDEX idx_racing_club ON zwift_racing_riders(club_id);
CREATE INDEX idx_racing_ftp_wkg ON zwift_racing_riders(ftp_wkg DESC);
CREATE INDEX idx_racing_phenotype ON zwift_racing_riders(phenotype_type);
CREATE INDEX idx_racing_synced ON zwift_racing_riders(last_synced_at DESC);
CREATE INDEX idx_racing_status ON zwift_racing_riders(sync_status);
CREATE INDEX idx_racing_updated ON zwift_racing_riders(updated_at DESC);

-- Partial index for active riders
CREATE INDEX idx_racing_active 
  ON zwift_racing_riders(velo_score DESC) 
  WHERE sync_status = 'success' AND club_id = 2281;

-- JSONB index for raw API response queries (optional)
-- CREATE INDEX idx_racing_raw_gin ON zwift_racing_riders USING GIN (api_response_raw);

COMMENT ON TABLE zwift_racing_riders IS 'Primary racing data from ZwiftRacing.app (51 fields), synced every 24h, bulk 1000 riders/call';
COMMENT ON COLUMN zwift_racing_riders.velo_tier IS 'vELO: Bronze(0-999), Silver(1000-1199), Gold(1200-1349), Amethyst(1350-1449), Sapphire(1450-1549), Ruby(1550-1649), Emerald(1650-1749), Diamond(1750+)';
COMMENT ON COLUMN zwift_racing_riders.phenotype_type IS 'Rider classification: sprinter(5s power), pursuiter(1min), time_trialist(20min), road_racer(balanced), climber(high w/kg)';
COMMENT ON COLUMN zwift_racing_riders.api_response_raw IS 'Full JSON response from ZwiftRacing.app API for debugging';

-- ----------------------------------------------------------------------------
-- SOURCE TABLE 2: zwift_official_profiles (ENRICHMENT - 92 fields)
-- API: Zwift Official (https://us-or-rly101.zwift.com)
-- Sync: Every 168 hours (weekly)
-- Priority: 2 (enrichment)
-- Auth: OAuth 2.0 Password Grant (jeroen.diepenbroek@gmail.com)
-- Individual: 1 rider per call (no bulk endpoint)
-- ----------------------------------------------------------------------------

CREATE TABLE zwift_official_profiles (
  -- Identity (MUST match zwift_racing_riders.rider_id)
  rider_id INTEGER PRIMARY KEY,
  zwift_id TEXT NOT NULL,
  
  -- Personal Info
  first_name TEXT,
  last_name TEXT,
  email_address TEXT,  -- Privacy: may be null
  
  -- Avatar/Profile Images
  image_src TEXT,           -- Small avatar (96x96)
  image_src_large TEXT,     -- Large avatar (300x300) ← USE THIS FOR RACING MATRIX!
  profile_image_url TEXT,   -- Full-size profile image
  
  -- Social Stats (KEY ENRICHMENT DATA)
  followers_count INTEGER,
  followees_count INTEGER,
  public_attributes JSONB,  -- Privacy settings
  
  -- Physical Stats (for FTP comparison with racing data)
  ftp_watts INTEGER,        -- Compare with racing_ftp_watts
  weight_grams INTEGER,     -- Weight in grams (divide by 1000 for kg)
  height_cm NUMERIC(5,2),
  
  -- Location
  country_code TEXT,
  origin_country_code TEXT,
  
  -- Connected Services (VALUABLE FOR TEAM INSIGHTS)
  strava_connected BOOLEAN DEFAULT false,
  strava_premium BOOLEAN DEFAULT false,
  wahoo_connected BOOLEAN DEFAULT false,
  
  -- Achievements & Career Stats
  achievements_count INTEGER,
  total_distance_meters BIGINT,     -- Career distance
  total_elevation_meters BIGINT,    -- Career climbing
  total_runs INTEGER,               -- Total rides
  
  -- Racing Stats (from Official API)
  racing_score INTEGER,
  
  -- API Metadata
  api_response_raw JSONB,  -- Full 92-field JSON response
  
  -- OAuth Tracking
  oauth_last_success TIMESTAMPTZ,
  oauth_last_failure TIMESTAMPTZ,
  oauth_failure_reason TEXT,
  
  -- Sync Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  sync_status TEXT CHECK (sync_status IN ('success', 'failed', 'pending', 'oauth_failed')) DEFAULT 'success',
  sync_error TEXT
);

-- Indexes for social/enrichment queries
CREATE INDEX idx_official_followers ON zwift_official_profiles(followers_count DESC);
CREATE INDEX idx_official_country ON zwift_official_profiles(country_code);
CREATE INDEX idx_official_strava ON zwift_official_profiles(strava_connected) WHERE strava_connected = true;
CREATE INDEX idx_official_synced ON zwift_official_profiles(last_synced_at DESC);
CREATE INDEX idx_official_status ON zwift_official_profiles(sync_status);
CREATE INDEX idx_official_updated ON zwift_official_profiles(updated_at DESC);

-- JSONB index for raw API response queries (optional)
-- CREATE INDEX idx_official_raw_gin ON zwift_official_profiles USING GIN (api_response_raw);

COMMENT ON TABLE zwift_official_profiles IS 'Social/enrichment data from Zwift Official API (92 fields), synced every 168h (weekly), individual API calls';
COMMENT ON COLUMN zwift_official_profiles.followers_count IS 'Social influence metric - Example: rider 150437 has 4259 followers!';
COMMENT ON COLUMN zwift_official_profiles.image_src_large IS 'High-res avatar URL (300x300) - Use this for Racing Matrix dashboard';
COMMENT ON COLUMN zwift_official_profiles.ftp_watts IS 'Official FTP from Zwift profile - Compare with racing_ftp_watts to detect discrepancies';

-- ----------------------------------------------------------------------------
-- SOURCE TABLE 3: zwift_official_activities (OPTIONAL)
-- Recent rides from Zwift Official API
-- Sync: On-demand when viewing rider profile
-- Use: Activity history, recent performance
-- ----------------------------------------------------------------------------

CREATE TABLE zwift_official_activities (
  activity_id TEXT PRIMARY KEY,
  rider_id INTEGER NOT NULL REFERENCES zwift_official_profiles(rider_id) ON DELETE CASCADE,
  
  -- Activity Details
  name TEXT,
  description TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Performance Stats
  distance_meters BIGINT,
  elevation_meters INTEGER,
  avg_power_watts INTEGER,
  max_power_watts INTEGER,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  calories INTEGER,
  
  -- Context
  world_name TEXT,
  route_name TEXT,
  activity_type TEXT,  -- 'ride', 'race', 'workout', 'free_ride'
  
  -- Metadata
  fetched_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activities_rider ON zwift_official_activities(rider_id);
CREATE INDEX idx_activities_date ON zwift_official_activities(started_at DESC);
CREATE INDEX idx_activities_type ON zwift_official_activities(activity_type);

COMMENT ON TABLE zwift_official_activities IS 'Recent rides (last 20 per rider) from Zwift Official API - Example: rider 150437 Snowman race 44km';

-- ----------------------------------------------------------------------------
-- HYBRID VIEW 1: v_team_riders_complete (PRIMARY FRONTEND VIEW)
-- Combines racing data (PRIMARY) + social enrichment (OPTIONAL)
-- Use this for Racing Matrix Dashboard
-- Returns: All riders with combined data from both sources
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_team_riders_complete AS
SELECT 
  -- Identity (from Racing - PRIMARY SOURCE)
  r.rider_id,
  r.name,
  r.flag,
  r.category,
  r.club_id,
  
  -- Racing Stats (PRIMARY SOURCE: ZwiftRacing.app)
  r.ftp_watts AS racing_ftp_watts,
  r.ftp_wkg AS racing_ftp_wkg,
  r.weight_kg,
  r.velo_score,
  r.velo_tier,
  r.velo_max_90d,
  r.phenotype_type,
  r.phenotype_score,
  r.phenotype_confidence,
  r.handicap_seconds,
  
  -- Power Curve (from Racing)
  r.power_5s_watts,
  r.power_5s_wkg,
  r.power_15s_watts,
  r.power_15s_wkg,
  r.power_30s_watts,
  r.power_30s_wkg,
  r.power_1min_watts,
  r.power_1min_wkg,
  r.power_5min_watts,
  r.power_5min_wkg,
  r.power_10min_watts,
  r.power_10min_wkg,
  r.power_20min_watts,
  r.power_20min_wkg,
  
  -- Social Enrichment (OPTIONAL: Zwift Official API)
  o.image_src_large AS avatar_url,
  o.followers_count,
  o.followees_count,
  o.total_distance_meters / 1000.0 AS total_distance_km,
  o.total_elevation_meters AS total_elevation_m,
  o.strava_connected,
  o.strava_premium,
  o.racing_score AS official_racing_score,
  o.country_code,
  
  -- FTP Comparison (INTERESTING DATA QUALITY CHECK)
  o.ftp_watts AS official_ftp_watts,
  CASE 
    WHEN o.ftp_watts IS NOT NULL AND r.ftp_watts IS NOT NULL 
    THEN abs(o.ftp_watts - r.ftp_watts)
    ELSE NULL
  END AS ftp_difference_watts,
  CASE 
    WHEN o.ftp_watts IS NOT NULL AND r.ftp_watts IS NOT NULL AND r.ftp_watts > 0
    THEN round((abs(o.ftp_watts - r.ftp_watts)::numeric / r.ftp_watts * 100), 1)
    ELSE NULL
  END AS ftp_difference_percent,
  
  -- Data Completeness Status (for debugging)
  CASE 
    WHEN o.rider_id IS NOT NULL THEN 'complete'
    ELSE 'racing_only'
  END AS data_status,
  
  CASE 
    WHEN o.rider_id IS NULL THEN false
    WHEN o.image_src_large IS NULL THEN false
    ELSE true
  END AS has_avatar,
  
  CASE 
    WHEN o.rider_id IS NULL THEN false
    WHEN o.followers_count IS NULL THEN false
    ELSE true
  END AS has_social_stats,
  
  -- Sync Freshness (for monitoring)
  r.last_synced_at AS racing_synced_at,
  o.last_synced_at AS social_synced_at,
  GREATEST(r.updated_at, COALESCE(o.updated_at, r.updated_at)) AS last_updated_at,
  
  -- Sync Status (for error tracking)
  r.sync_status AS racing_sync_status,
  o.sync_status AS social_sync_status
  
FROM zwift_racing_riders r
LEFT JOIN zwift_official_profiles o ON r.rider_id = o.rider_id
WHERE r.club_id = 2281;  -- TeamNL Cloud9 only

COMMENT ON VIEW v_team_riders_complete IS 'HYBRID VIEW: Racing data (PRIMARY from ZwiftRacing.app) + Social enrichment (OPTIONAL from Zwift Official). Use for Racing Matrix Dashboard with avatars.';

-- ----------------------------------------------------------------------------
-- HYBRID VIEW 2: v_team_riders_racing (FAST - NO JOINS)
-- Racing data only, super fast queries
-- Use when avatars/social stats not needed
-- Returns: Essential racing stats without social enrichment
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_team_riders_racing AS
SELECT 
  rider_id,
  name,
  flag,
  category,
  ftp_watts,
  ftp_wkg,
  weight_kg,
  velo_score,
  velo_tier,
  velo_max_90d,
  phenotype_type,
  phenotype_score,
  phenotype_confidence,
  handicap_seconds,
  
  -- Power Curve (essential for Racing Matrix)
  power_5s_wkg,
  power_1min_wkg,
  power_5min_wkg,
  power_20min_wkg,
  
  -- Sync Info
  last_synced_at,
  sync_status
FROM zwift_racing_riders
WHERE club_id = 2281
ORDER BY velo_score DESC;

COMMENT ON VIEW v_team_riders_racing IS 'Racing data only (no joins, super fast). Use for simple queries without avatars. 10× faster than v_team_riders_complete.';

-- ----------------------------------------------------------------------------
-- HYBRID VIEW 3: v_team_riders_social (SOCIAL STATS)
-- Social influence ranking
-- Use for "Who's got most followers?" dashboard
-- Returns: Top influencers with social stats
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_team_riders_social AS
SELECT 
  o.rider_id,
  r.name,
  r.category,
  o.image_src_large AS avatar_url,
  o.followers_count,
  o.followees_count,
  o.total_distance_meters / 1000.0 AS total_distance_km,
  o.total_elevation_meters AS total_elevation_m,
  o.strava_connected,
  o.strava_premium,
  o.racing_score,
  o.country_code,
  o.last_synced_at,
  
  -- Follower/Following Ratio (influence metric)
  CASE 
    WHEN o.followees_count > 0 
    THEN round((o.followers_count::numeric / o.followees_count), 2)
    ELSE NULL
  END AS follower_ratio
  
FROM zwift_official_profiles o
INNER JOIN zwift_racing_riders r ON o.rider_id = r.rider_id
WHERE r.club_id = 2281
ORDER BY o.followers_count DESC;

COMMENT ON VIEW v_team_riders_social IS 'Social stats only. Use for influencer ranking dashboard. Example: rider 150437 has 4259 followers (32× ratio)!';

-- ----------------------------------------------------------------------------
-- SYNC STRATEGY TABLE
-- Manages sync schedules per source
-- Use: Automated sync orchestration
-- ----------------------------------------------------------------------------

CREATE TABLE sync_strategy (
  source_name TEXT PRIMARY KEY,
  source_type TEXT CHECK (source_type IN ('api', 'database', 'manual')),
  sync_interval_hours INTEGER NOT NULL,
  last_sync_started_at TIMESTAMPTZ,
  last_sync_completed_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  sync_priority INTEGER DEFAULT 99,  -- Lower = higher priority (1 = highest)
  is_enabled BOOLEAN DEFAULT true,
  bulk_size INTEGER,  -- For bulk operations (e.g., 1000 riders)
  notes TEXT
);

INSERT INTO sync_strategy (source_name, source_type, sync_interval_hours, sync_priority, bulk_size, notes) VALUES
  ('zwift_racing', 'api', 24, 1, 1000, 'Racing data changes daily. Highest priority. Bulk API: 1000 riders/call. Rate limit: 5/min individual, 1/15min bulk.'),
  ('zwift_official', 'api', 168, 2, 1, 'Social data stable. Weekly sync sufficient. Individual API calls only. OAuth 2.0 auth (24h tokens).'),
  ('zwift_power', 'api', 999999, 99, 1, 'DEPRECATED - Bot protected (nginx CAPTCHA). Never sync (999999h = ~114 years). Data available via zwift_racing.');

COMMENT ON TABLE sync_strategy IS 'Sync schedule management per API source. Controls when and how often to sync each data source.';

-- ----------------------------------------------------------------------------
-- SYNC LOG TABLE
-- Tracks all sync operations for debugging
-- Use: Audit trail, error tracking, performance monitoring
-- ----------------------------------------------------------------------------

CREATE TABLE sync_log (
  log_id SERIAL PRIMARY KEY,
  source_name TEXT NOT NULL REFERENCES sync_strategy(source_name),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('running', 'success', 'partial_success', 'failed')) NOT NULL,
  
  -- Metrics
  riders_attempted INTEGER DEFAULT 0,
  riders_synced INTEGER DEFAULT 0,
  riders_failed INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  
  -- Error Tracking
  error_message TEXT,
  error_details JSONB,
  
  -- Performance
  api_calls_made INTEGER DEFAULT 0,
  rate_limit_hits INTEGER DEFAULT 0
);

CREATE INDEX idx_sync_log_source ON sync_log(source_name);
CREATE INDEX idx_sync_log_started ON sync_log(started_at DESC);
CREATE INDEX idx_sync_log_status ON sync_log(status);

COMMENT ON TABLE sync_log IS 'Audit log for all sync operations. Use for debugging, monitoring, and performance analysis.';

-- ----------------------------------------------------------------------------
-- HELPER FUNCTION: Check data completeness
-- Returns riders missing social enrichment
-- Use: Identify riders that need Zwift Official sync
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_riders_missing_enrichment()
RETURNS TABLE (
  rider_id INTEGER,
  name TEXT,
  category TEXT,
  racing_synced_at TIMESTAMPTZ,
  days_since_racing_sync INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.rider_id,
    r.name,
    r.category,
    r.last_synced_at,
    EXTRACT(DAY FROM (now() - r.last_synced_at))::integer AS days_since_racing_sync
  FROM zwift_racing_riders r
  LEFT JOIN zwift_official_profiles o ON r.rider_id = o.rider_id
  WHERE r.club_id = 2281
    AND o.rider_id IS NULL  -- No social data yet
  ORDER BY r.last_synced_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_riders_missing_enrichment IS 'Returns riders with racing data but no social enrichment. Use to prioritize Zwift Official sync.';

-- ----------------------------------------------------------------------------
-- HELPER FUNCTION: Get stale sync targets
-- Returns sources that need syncing based on schedule
-- Use: Automated sync orchestration
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_stale_sync_targets()
RETURNS TABLE (
  source_name TEXT,
  hours_since_sync NUMERIC,
  sync_interval_hours INTEGER,
  overdue_by_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.source_name,
    EXTRACT(EPOCH FROM (now() - s.last_sync_completed_at)) / 3600 AS hours_since_sync,
    s.sync_interval_hours,
    (EXTRACT(EPOCH FROM (now() - s.last_sync_completed_at)) / 3600) - s.sync_interval_hours AS overdue_by_hours
  FROM sync_strategy s
  WHERE s.is_enabled = true
    AND s.sync_interval_hours IS NOT NULL
    AND (s.last_sync_completed_at IS NULL 
         OR s.last_sync_completed_at + (s.sync_interval_hours || ' hours')::interval < now())
  ORDER BY s.sync_priority ASC, overdue_by_hours DESC NULLS FIRST;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_stale_sync_targets IS 'Returns sources that need syncing (past their schedule). Use for automated sync orchestration.';

-- ----------------------------------------------------------------------------
-- MATERIALIZED VIEW (OPTIONAL - FOR PERFORMANCE)
-- Pre-computed hybrid view, refresh every hour
-- Use if team grows beyond 100 riders
-- Uncomment when needed:
-- ----------------------------------------------------------------------------

-- CREATE MATERIALIZED VIEW mv_team_riders_complete AS
-- SELECT * FROM v_team_riders_complete;
-- 
-- CREATE UNIQUE INDEX idx_mv_riders_id ON mv_team_riders_complete(rider_id);
-- CREATE INDEX idx_mv_riders_velo ON mv_team_riders_complete(velo_score DESC);
-- CREATE INDEX idx_mv_riders_category ON mv_team_riders_complete(category);
-- 
-- COMMENT ON MATERIALIZED VIEW mv_team_riders_complete IS 'Pre-computed v_team_riders_complete for large teams (>100 riders). Refresh hourly: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_team_riders_complete;';

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these after migration to verify everything works
-- ============================================================================

-- Check all tables created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE 'zwift_%' OR table_name LIKE 'sync_%')
ORDER BY table_name;

-- Check all views created
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'v_team_%'
ORDER BY table_name;

-- Check all indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND (tablename LIKE 'zwift_%' OR tablename LIKE 'sync_%')
ORDER BY tablename, indexname;

-- Check all functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%rider%'
ORDER BY routine_name;

-- Test sync strategy
SELECT * FROM sync_strategy ORDER BY sync_priority;

-- Test helper functions
SELECT * FROM get_stale_sync_targets();
-- SELECT * FROM get_riders_missing_enrichment();  -- Will be empty until data synced

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- Next steps:
-- 1. Verify all objects created (queries above)
-- 2. Implement backend sync services (zwift-racing-sync.service.ts, zwift-official-sync.service.ts)
-- 3. Run initial sync (all 80 TeamNL riders)
-- 4. Update frontend to query v_team_riders_complete
-- 5. Add avatar display in Racing Matrix
-- 6. Monitor sync_log for errors
-- 7. Set up automated sync (cron or backend scheduler)
-- ============================================================================

-- MIGRATION 2: API Source Tables
-- ============================================================================
-- ============================================================================
-- MIGRATION 002: API Source Tables (1:1 Mapping)
-- ============================================================================
-- Principe: Tabelnaam = api_{source}_{endpoint_path}
-- Doel: Exacte kopie van API responses zonder transformaties
-- Datum: 8 december 2025
-- ============================================================================

-- ============================================================================
-- ZWIFTRACING.APP SOURCE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- API: GET /public/clubs/{id}
-- Rate: 1/60min (Standard) | 10/60min (Premium)
-- Returns: 1000 members max, 51 fields per rider
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_zwiftracing_public_clubs (
  -- Meta
  club_id INTEGER PRIMARY KEY,
  source_api TEXT DEFAULT 'zwiftracing.app' NOT NULL,
  endpoint TEXT DEFAULT '/public/clubs/{id}' NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- API Response
  id INTEGER NOT NULL,
  name TEXT,
  description TEXT,
  member_count INTEGER,
  
  -- Raw JSON backup
  raw_response JSONB NOT NULL
);

COMMENT ON TABLE api_zwiftracing_public_clubs IS 
  '1:1 mapping van GET /public/clubs/{id}. Club metadata zonder riders.';

CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_public_clubs_fetched 
  ON api_zwiftracing_public_clubs(fetched_at DESC);


-- ----------------------------------------------------------------------------
-- API: GET /public/clubs/{id} (riders array binnen response)
-- Rate: 1/60min (Standard) | 10/60min (Premium)
-- Returns: 51 fields per rider, max 1000 riders
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_zwiftracing_public_clubs_riders (
  -- Meta
  rider_id INTEGER PRIMARY KEY,
  club_id INTEGER NOT NULL,
  source_api TEXT DEFAULT 'zwiftracing.app' NOT NULL,
  endpoint TEXT DEFAULT '/public/clubs/{id}' NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- API Response (51 fields - exact copy)
  id INTEGER NOT NULL,
  name TEXT,
  velo DECIMAL(10,2),
  racing_score DECIMAL(10,2),
  
  -- Power absolute (watts)
  ftp INTEGER,
  power_5s INTEGER,
  power_15s INTEGER,
  power_30s INTEGER,
  power_60s INTEGER,
  power_120s INTEGER,
  power_300s INTEGER,
  power_1200s INTEGER,
  
  -- Power relative (w/kg)
  power_5s_wkg DECIMAL(5,2),
  power_15s_wkg DECIMAL(5,2),
  power_30s_wkg DECIMAL(5,2),
  power_60s_wkg DECIMAL(5,2),
  power_120s_wkg DECIMAL(5,2),
  power_300s_wkg DECIMAL(5,2),
  power_1200s_wkg DECIMAL(5,2),
  
  -- Physical
  weight DECIMAL(5,2),
  height INTEGER,
  
  -- Classification
  phenotype TEXT,
  category TEXT,
  
  -- Stats
  race_count INTEGER,
  
  -- Additional fields (expand as discovered)
  zwift_id INTEGER,
  country TEXT,
  age INTEGER,
  
  -- Raw JSON backup
  raw_response JSONB NOT NULL,
  
  FOREIGN KEY (club_id) REFERENCES api_zwiftracing_public_clubs(club_id) ON DELETE CASCADE
);

COMMENT ON TABLE api_zwiftracing_public_clubs_riders IS 
  '1:1 mapping van GET /public/clubs/{id} riders array. PRIMARY SOURCE voor team data. 51 fields per rider.';

CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_public_clubs_riders_club 
  ON api_zwiftracing_public_clubs_riders(club_id);
CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_public_clubs_riders_velo 
  ON api_zwiftracing_public_clubs_riders(velo DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_public_clubs_riders_fetched 
  ON api_zwiftracing_public_clubs_riders(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_public_clubs_riders_name 
  ON api_zwiftracing_public_clubs_riders(name);


-- ----------------------------------------------------------------------------
-- API: POST /public/riders (bulk)
-- Rate: 1/15min (Standard) | 10/15min (Premium)
-- Returns: 51 fields per rider, max 1000 riders
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_zwiftracing_public_riders_bulk (
  -- Meta
  rider_id INTEGER PRIMARY KEY,
  source_api TEXT DEFAULT 'zwiftracing.app' NOT NULL,
  endpoint TEXT DEFAULT '/public/riders (bulk)' NOT NULL,
  bulk_request_id UUID,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- API Response (51 fields - same as clubs)
  id INTEGER NOT NULL,
  name TEXT,
  velo DECIMAL(10,2),
  racing_score DECIMAL(10,2),
  
  -- Power absolute
  ftp INTEGER,
  power_5s INTEGER,
  power_15s INTEGER,
  power_30s INTEGER,
  power_60s INTEGER,
  power_120s INTEGER,
  power_300s INTEGER,
  power_1200s INTEGER,
  
  -- Power relative
  power_5s_wkg DECIMAL(5,2),
  power_15s_wkg DECIMAL(5,2),
  power_30s_wkg DECIMAL(5,2),
  power_60s_wkg DECIMAL(5,2),
  power_120s_wkg DECIMAL(5,2),
  power_300s_wkg DECIMAL(5,2),
  power_1200s_wkg DECIMAL(5,2),
  
  -- Physical
  weight DECIMAL(5,2),
  height INTEGER,
  
  -- Classification
  phenotype TEXT,
  category TEXT,
  
  -- Stats
  race_count INTEGER,
  
  -- Additional
  zwift_id INTEGER,
  country TEXT,
  age INTEGER,
  
  -- Raw JSON
  raw_response JSONB NOT NULL
);

COMMENT ON TABLE api_zwiftracing_public_riders_bulk IS 
  '1:1 mapping van POST /public/riders. BACKUP SOURCE - gebruik alleen voor riders buiten club.';

CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_public_riders_bulk_fetched 
  ON api_zwiftracing_public_riders_bulk(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_public_riders_bulk_request 
  ON api_zwiftracing_public_riders_bulk(bulk_request_id);

-- Track bulk requests
CREATE TABLE IF NOT EXISTS api_zwiftracing_public_riders_bulk_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  rider_ids INTEGER[] NOT NULL,
  total_riders INTEGER NOT NULL,
  successful_count INTEGER,
  failed_count INTEGER,
  duration_ms INTEGER,
  error_message TEXT
);

COMMENT ON TABLE api_zwiftracing_public_riders_bulk_requests IS 
  'Log van bulk request calls voor monitoring en debugging.';


-- ----------------------------------------------------------------------------
-- API: GET /public/riders/{id}
-- Rate: 5/min (Standard) | 10/min (Premium)
-- Returns: 51 fields (same as bulk)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_zwiftracing_public_riders_individual (
  -- Meta
  rider_id INTEGER PRIMARY KEY,
  source_api TEXT DEFAULT 'zwiftracing.app' NOT NULL,
  endpoint TEXT DEFAULT '/public/riders/{id}' NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- API Response (51 fields - same structure)
  id INTEGER NOT NULL,
  name TEXT,
  velo DECIMAL(10,2),
  racing_score DECIMAL(10,2),
  
  -- Power absolute
  ftp INTEGER,
  power_5s INTEGER,
  power_15s INTEGER,
  power_30s INTEGER,
  power_60s INTEGER,
  power_120s INTEGER,
  power_300s INTEGER,
  power_1200s INTEGER,
  
  -- Power relative
  power_5s_wkg DECIMAL(5,2),
  power_15s_wkg DECIMAL(5,2),
  power_30s_wkg DECIMAL(5,2),
  power_60s_wkg DECIMAL(5,2),
  power_120s_wkg DECIMAL(5,2),
  power_300s_wkg DECIMAL(5,2),
  power_1200s_wkg DECIMAL(5,2),
  
  -- Physical
  weight DECIMAL(5,2),
  height INTEGER,
  
  -- Classification
  phenotype TEXT,
  category TEXT,
  
  -- Stats
  race_count INTEGER,
  
  -- Additional
  zwift_id INTEGER,
  country TEXT,
  age INTEGER,
  
  -- Raw JSON
  raw_response JSONB NOT NULL
);

COMMENT ON TABLE api_zwiftracing_public_riders_individual IS 
  '1:1 mapping van GET /public/riders/{id}. On-demand individual lookups.';

CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_public_riders_individual_fetched 
  ON api_zwiftracing_public_riders_individual(fetched_at DESC);


-- ----------------------------------------------------------------------------
-- API: GET /api/events/upcoming
-- Rate: Unknown (estimate hourly)
-- Returns: Array of events, ~10 fields per event
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_zwiftracing_api_events_upcoming (
  -- Meta
  event_id TEXT PRIMARY KEY,
  source_api TEXT DEFAULT 'zwiftracing.app' NOT NULL,
  endpoint TEXT DEFAULT '/api/events/upcoming' NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- API Response
  time BIGINT NOT NULL,                    -- Unix timestamp
  start_time TIMESTAMPTZ,                  -- Converted
  route_id TEXT,
  distance INTEGER,                        -- meters
  title TEXT NOT NULL,
  num_laps TEXT,
  type TEXT,                               -- Race/Workout/GroupRide
  sub_type TEXT,                           -- Scratch/Points/TT
  staggered_start BOOLEAN,
  categories TEXT,                         -- "A,B,C,D,E"
  signups TEXT,                            -- "25,34,57,44,16"
  
  -- Raw JSON
  raw_response JSONB NOT NULL
);

COMMENT ON TABLE api_zwiftracing_api_events_upcoming IS 
  '1:1 mapping van GET /api/events/upcoming. Event calendar (856+ events).';

CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_api_events_upcoming_start 
  ON api_zwiftracing_api_events_upcoming(start_time DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_api_events_upcoming_type 
  ON api_zwiftracing_api_events_upcoming(type);
CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_api_events_upcoming_fetched 
  ON api_zwiftracing_api_events_upcoming(fetched_at DESC);


-- ----------------------------------------------------------------------------
-- API: GET /api/events/{eventId}/signups
-- Rate: Unknown (estimate on-demand)
-- Returns: Grouped by category, 50+ fields per rider
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_zwiftracing_api_events_signups (
  -- Meta
  signup_id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  rider_id INTEGER NOT NULL,
  category TEXT NOT NULL,                  -- A/B/C/D/E
  source_api TEXT DEFAULT 'zwiftracing.app' NOT NULL,
  endpoint TEXT DEFAULT '/api/events/{id}/signups' NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Rider identity
  name TEXT,
  zwift_id INTEGER,
  
  -- Power absolute (watts)
  w5 INTEGER,
  w15 INTEGER,
  w30 INTEGER,
  w60 INTEGER,
  w120 INTEGER,
  w300 INTEGER,
  w1200 INTEGER,
  
  -- Power relative (w/kg)
  wkg5 DECIMAL(5,2),
  wkg15 DECIMAL(5,2),
  wkg30 DECIMAL(5,2),
  wkg60 DECIMAL(5,2),
  wkg120 DECIMAL(5,2),
  wkg300 DECIMAL(5,2),
  wkg1200 DECIMAL(5,2),
  
  -- Critical Power model
  cp DECIMAL(10,2),
  awc DECIMAL(10,2),
  compound_score DECIMAL(10,2),
  
  -- Race stats
  race_rating DECIMAL(10,2),
  race_finishes INTEGER,
  race_wins INTEGER,
  race_podiums INTEGER,
  race_dnfs INTEGER,
  
  -- Physical
  weight INTEGER,                          -- grams
  height INTEGER,                          -- cm
  
  -- Classification
  phenotype_value TEXT,
  phenotype_bias DECIMAL(5,2),
  phenotype_sprinter_score DECIMAL(5,2),
  phenotype_breakaway_score DECIMAL(5,2),
  phenotype_climber_score DECIMAL(5,2),
  phenotype_tt_score DECIMAL(5,2),
  
  -- Club
  club_id INTEGER,
  club_name TEXT,
  club_bg_color TEXT,
  club_text_color TEXT,
  club_border_color TEXT,
  
  -- Handicaps
  handicap_standard DECIMAL(5,2),
  handicap_ttt DECIMAL(5,2),
  handicap_climbing DECIMAL(5,2),
  handicap_flat DECIMAL(5,2),
  
  -- Points & events
  points INTEGER,
  events_30d INTEGER,
  events_90d INTEGER,
  
  -- Raw JSON
  raw_response JSONB NOT NULL,
  
  UNIQUE(event_id, rider_id, category)
);

COMMENT ON TABLE api_zwiftracing_api_events_signups IS 
  '1:1 mapping van GET /api/events/{id}/signups. PRE-RACE ANALYSIS GOLDMINE! 50+ fields per rider.';

CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_api_events_signups_event 
  ON api_zwiftracing_api_events_signups(event_id);
CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_api_events_signups_rider 
  ON api_zwiftracing_api_events_signups(rider_id);
CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_api_events_signups_category 
  ON api_zwiftracing_api_events_signups(category);
CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_api_events_signups_rating 
  ON api_zwiftracing_api_events_signups(race_rating DESC NULLS LAST);


-- ----------------------------------------------------------------------------
-- API: GET /public/results/{eventId}
-- Rate: 1/min (Standard & Premium)
-- Returns: Race results (structure TBD)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_zwiftracing_public_results (
  -- Meta
  result_id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  rider_id INTEGER NOT NULL,
  source_api TEXT DEFAULT 'zwiftracing.app' NOT NULL,
  endpoint TEXT DEFAULT '/public/results/{id}' NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- API Response (expand when tested)
  position INTEGER,
  category TEXT,
  finish_time INTEGER,                     -- seconds
  time_gap INTEGER,                        -- seconds behind winner
  
  -- Power data (if available)
  avg_power INTEGER,
  max_power INTEGER,
  normalized_power INTEGER,
  
  -- Performance
  avg_hr INTEGER,
  max_hr INTEGER,
  avg_cadence INTEGER,
  
  -- Raw JSON
  raw_response JSONB NOT NULL,
  
  UNIQUE(event_id, rider_id)
);

COMMENT ON TABLE api_zwiftracing_public_results IS 
  '1:1 mapping van GET /public/results/{id}. Post-race results data.';

CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_public_results_event 
  ON api_zwiftracing_public_results(event_id);
CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_public_results_rider 
  ON api_zwiftracing_public_results(rider_id);
CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_public_results_position 
  ON api_zwiftracing_public_results(position);


-- ============================================================================
-- ZWIFT OFFICIAL API SOURCE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- API: GET /api/profiles/{id}
-- Rate: ~1/sec recommended
-- Returns: 92 fields (profile, social, achievements)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_zwift_api_profiles (
  -- Meta
  rider_id INTEGER PRIMARY KEY,
  source_api TEXT DEFAULT 'zwift.com' NOT NULL,
  endpoint TEXT DEFAULT '/api/profiles/{id}' NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- API Response (92 fields)
  id INTEGER NOT NULL,
  public_id TEXT,
  first_name TEXT,
  last_name TEXT,
  
  -- Avatar
  image_src TEXT,
  image_src_large TEXT,
  
  -- Demographics
  male BOOLEAN,
  birth_date DATE,
  age INTEGER,
  country_code INTEGER,
  country_alpha3 TEXT,
  
  -- Physical (API returns grams/mm)
  weight INTEGER,                          -- grams
  height INTEGER,                          -- cm
  ftp INTEGER,                             -- watts
  
  -- Social
  followers_count INTEGER,
  followees_count INTEGER,
  rideons_given INTEGER,
  
  -- Achievements
  achievement_level INTEGER,
  total_distance BIGINT,                   -- meters
  total_distance_climbed BIGINT,           -- meters
  total_xp INTEGER,
  
  -- Privacy settings
  privacy_profile BOOLEAN,
  privacy_activities BOOLEAN,
  privacy_messaging BOOLEAN,
  privacy_display_weight BOOLEAN,
  privacy_display_age BOOLEAN,
  
  -- Status
  riding BOOLEAN,
  world_id INTEGER,
  
  -- Profile details
  player_type TEXT,
  player_type_id INTEGER,
  use_metric BOOLEAN,
  
  -- Additional fields
  email_address TEXT,
  email_address_verified BOOLEAN,
  
  -- Competition Metrics (Zwift Official Racing Score) 🏁
  competition_racing_score INTEGER,
  competition_category TEXT,
  competition_category_women TEXT,
  
  -- Raw JSON
  raw_response JSONB NOT NULL
);

COMMENT ON TABLE api_zwift_api_profiles IS 
  '1:1 mapping van GET /api/profiles/{id}. Official Zwift profile met avatars, social stats, EN competitionMetrics (racing score). 95 fields.';

CREATE INDEX IF NOT EXISTS idx_api_zwift_api_profiles_fetched 
  ON api_zwift_api_profiles(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_zwift_api_profiles_name 
  ON api_zwift_api_profiles(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_api_zwift_api_profiles_country 
  ON api_zwift_api_profiles(country_code);


-- ----------------------------------------------------------------------------
-- API: GET /api/profiles/{id}/activities
-- Rate: ~1/sec recommended
-- Returns: Array of activities, 28 fields each
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_zwift_api_profiles_activities (
  -- Meta
  activity_id BIGINT PRIMARY KEY,
  rider_id INTEGER NOT NULL,
  source_api TEXT DEFAULT 'zwift.com' NOT NULL,
  endpoint TEXT DEFAULT '/api/profiles/{id}/activities' NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- API Response (28 fields)
  id BIGINT NOT NULL,
  id_str TEXT,
  profile_id INTEGER,
  name TEXT,
  description TEXT,
  
  -- Timing
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  moving_time_ms BIGINT,
  elapsed_time_ms BIGINT,
  
  -- Distance & elevation
  distance_meters DECIMAL(10,2),
  total_elevation DECIMAL(10,2),
  
  -- Power
  avg_watts INTEGER,
  max_watts INTEGER,
  normalized_power INTEGER,
  
  -- Heart rate
  avg_hr INTEGER,
  max_hr INTEGER,
  
  -- Cadence
  avg_cadence INTEGER,
  
  -- Energy
  calories DECIMAL(10,2),
  
  -- Social
  rideon_count INTEGER,
  comment_count INTEGER,
  
  -- World & route
  world_id INTEGER,
  route_id TEXT,
  
  -- Files
  fit_file_key TEXT,
  fit_file_bucket TEXT,
  
  -- Privacy
  privacy TEXT,                            -- PUBLIC/PRIVATE/FOLLOWERS
  
  -- Raw JSON
  raw_response JSONB NOT NULL,
  
  FOREIGN KEY (rider_id) REFERENCES api_zwift_api_profiles(rider_id) ON DELETE CASCADE
);

COMMENT ON TABLE api_zwift_api_profiles_activities IS 
  '1:1 mapping van GET /api/profiles/{id}/activities. Activity feed met performance metrics. 28 fields per activity.';

CREATE INDEX IF NOT EXISTS idx_api_zwift_api_profiles_activities_rider 
  ON api_zwift_api_profiles_activities(rider_id);
CREATE INDEX IF NOT EXISTS idx_api_zwift_api_profiles_activities_start 
  ON api_zwift_api_profiles_activities(start_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_api_zwift_api_profiles_activities_fetched 
  ON api_zwift_api_profiles_activities(fetched_at DESC);


-- ----------------------------------------------------------------------------
-- API: GET /api/profiles/{id}/followers
-- Rate: ~1/sec recommended
-- Returns: Array of followers with nested profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_zwift_api_profiles_followers (
  -- Meta
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL,               -- followee (being followed)
  follower_id INTEGER NOT NULL,            -- follower (following)
  source_api TEXT DEFAULT 'zwift.com' NOT NULL,
  endpoint TEXT DEFAULT '/api/profiles/{id}/followers' NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- API Response
  status TEXT,                             -- "IS_FOLLOWING"
  is_favorite BOOLEAN,
  
  -- Follower profile (nested)
  follower_first_name TEXT,
  follower_last_name TEXT,
  follower_avatar TEXT,
  follower_country_code INTEGER,
  follower_followers_count INTEGER,
  follower_followees_count INTEGER,
  followees_in_common INTEGER,
  
  -- Raw JSON
  raw_response JSONB NOT NULL,
  
  UNIQUE(rider_id, follower_id)
);

COMMENT ON TABLE api_zwift_api_profiles_followers IS 
  '1:1 mapping van GET /api/profiles/{id}/followers. Social network - wie volgt deze rider.';

CREATE INDEX IF NOT EXISTS idx_api_zwift_api_profiles_followers_rider 
  ON api_zwift_api_profiles_followers(rider_id);
CREATE INDEX IF NOT EXISTS idx_api_zwift_api_profiles_followers_follower 
  ON api_zwift_api_profiles_followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_api_zwift_api_profiles_followers_fetched 
  ON api_zwift_api_profiles_followers(fetched_at DESC);


-- ----------------------------------------------------------------------------
-- API: GET /api/profiles/{id}/followees
-- Rate: ~1/sec recommended
-- Returns: Array of followees with nested profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_zwift_api_profiles_followees (
  -- Meta
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL,               -- follower (following)
  followee_id INTEGER NOT NULL,            -- followee (being followed)
  source_api TEXT DEFAULT 'zwift.com' NOT NULL,
  endpoint TEXT DEFAULT '/api/profiles/{id}/followees' NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- API Response
  status TEXT,                             -- "IS_FOLLOWING"
  is_favorite BOOLEAN,
  
  -- Followee profile (nested)
  followee_first_name TEXT,
  followee_last_name TEXT,
  followee_avatar TEXT,
  followee_country_code INTEGER,
  followee_followers_count INTEGER,
  followee_followees_count INTEGER,
  followees_in_common INTEGER,
  
  -- Raw JSON
  raw_response JSONB NOT NULL,
  
  UNIQUE(rider_id, followee_id)
);

COMMENT ON TABLE api_zwift_api_profiles_followees IS 
  '1:1 mapping van GET /api/profiles/{id}/followees. Social network - wie volgt deze rider.';

CREATE INDEX IF NOT EXISTS idx_api_zwift_api_profiles_followees_rider 
  ON api_zwift_api_profiles_followees(rider_id);
CREATE INDEX IF NOT EXISTS idx_api_zwift_api_profiles_followees_followee 
  ON api_zwift_api_profiles_followees(followee_id);
CREATE INDEX IF NOT EXISTS idx_api_zwift_api_profiles_followees_fetched 
  ON api_zwift_api_profiles_followees(fetched_at DESC);


-- ============================================================================
-- SYNC MONITORING
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_sync_log (
  id SERIAL PRIMARY KEY,
  source_api TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  sync_started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  sync_completed_at TIMESTAMPTZ,
  status TEXT NOT NULL,                    -- 'running', 'success', 'failed'
  records_fetched INTEGER,
  records_inserted INTEGER,
  records_updated INTEGER,
  error_message TEXT,
  duration_ms INTEGER,
  
  -- Request details
  request_params JSONB,
  http_status_code INTEGER
);

COMMENT ON TABLE api_sync_log IS 
  'Monitoring log voor alle API sync operaties. Track success/failure rates en performance.';

CREATE INDEX IF NOT EXISTS idx_api_sync_log_started 
  ON api_sync_log(sync_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_sync_log_api 
  ON api_sync_log(source_api, endpoint);
CREATE INDEX IF NOT EXISTS idx_api_sync_log_status 
  ON api_sync_log(status);


-- ============================================================================
-- GRANT PERMISSIONS (Supabase service role)
-- ============================================================================

-- Grant read access to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant full access to service role (for sync jobs)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify table count
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE 'api_%';
  
  RAISE NOTICE 'Created % API source tables', table_count;
END $$;

-- MIGRATION 2B: Competition Metrics
-- ============================================================================
-- ============================================================================
-- MIGRATION 002B: Add Competition Metrics to api_zwift_api_profiles
-- ============================================================================
-- Adds Zwift Official Racing Score (competitionMetrics) to profiles table
-- Datum: 9 december 2025
-- ============================================================================

-- Add competition_metrics columns to api_zwift_api_profiles
ALTER TABLE api_zwift_api_profiles 
  ADD COLUMN IF NOT EXISTS competition_racing_score INTEGER,
  ADD COLUMN IF NOT EXISTS competition_category TEXT,
  ADD COLUMN IF NOT EXISTS competition_category_women TEXT;

-- Update comment to reflect new field count
COMMENT ON TABLE api_zwift_api_profiles IS 
  '1:1 mapping van GET /api/profiles/{id}. Official Zwift profile met avatars, social stats, EN competitionMetrics (racing score). 95 fields.';

-- Verify columns added
DO $$
BEGIN
  RAISE NOTICE 'Added competition_metrics columns to api_zwift_api_profiles';
  RAISE NOTICE 'Ready to sync Zwift profiles with racing scores';
END $$;

-- MIGRATION 005: ZwiftRacing Riders Table (Direct Rider Endpoint)
-- ============================================================================
-- Purpose: Create dedicated table for ZwiftRacing.app /public/riders/{id} endpoint
-- Replaces: Club-based riders table with direct rider lookup
-- Date: 10 december 2025
-- ============================================================================

-- Drop old club-based approach
DROP TABLE IF EXISTS api_zwiftracing_public_clubs_riders CASCADE;
DROP TABLE IF EXISTS api_zwiftracing_public_clubs CASCADE;

-- ============================================================================
-- ZwiftRacing Riders Table (Direct Endpoint)
-- ============================================================================
-- API: GET https://zwift-ranking.herokuapp.com/public/riders/{riderId}
-- Auth: Authorization header required
-- Rate: 5 calls per minute
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_zwiftracing_riders (
  -- Meta
  rider_id INTEGER PRIMARY KEY,
  source_api TEXT DEFAULT 'zwiftracing.app' NOT NULL,
  endpoint TEXT DEFAULT '/public/riders/{id}' NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Identity
  id INTEGER NOT NULL,
  name TEXT,
  country TEXT,
  
  -- Racing Metrics (ZwiftRacing.app calculated)
  velo_live DECIMAL(10,2),
  velo_30day DECIMAL(10,2),
  velo_90day DECIMAL(10,2),
  category TEXT,
  
  -- Power Curve - Absolute (watts)
  ftp INTEGER,
  power_5s INTEGER,
  power_15s INTEGER,
  power_30s INTEGER,
  power_60s INTEGER,
  power_120s INTEGER,
  power_300s INTEGER,
  power_1200s INTEGER,
  
  -- Power Curve - Relative (w/kg)
  power_5s_wkg DECIMAL(5,2),
  power_15s_wkg DECIMAL(5,2),
  power_30s_wkg DECIMAL(5,2),
  power_60s_wkg DECIMAL(5,2),
  power_120s_wkg DECIMAL(5,2),
  power_300s_wkg DECIMAL(5,2),
  power_1200s_wkg DECIMAL(5,2),
  
  -- Physical
  weight DECIMAL(5,2),
  height INTEGER,
  
  -- Rider Type Classification
  phenotype TEXT,
  
  -- Race Statistics
  race_count INTEGER,
  
  -- Additional fields
  zwift_id INTEGER,
  age INTEGER,
  
  -- Raw JSON backup
  raw_response JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_riders_velo_live 
  ON api_zwiftracing_riders(velo_live DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_riders_fetched 
  ON api_zwiftracing_riders(fetched_at DESC);

COMMENT ON TABLE api_zwiftracing_riders IS 
  'ZwiftRacing.app rider data via /public/riders/{id} endpoint.
   Direct rider lookup - NO club dependency.
   Contains: vELO, power curve, phenotype, racing metrics.
   Auth required: Authorization header.
   Rate limit: 5 calls/minute per rider.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON api_zwiftracing_riders TO authenticated;
GRANT SELECT ON api_zwiftracing_riders TO anon;
GRANT ALL ON api_zwiftracing_riders TO service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created api_zwiftracing_riders table';
  RAISE NOTICE '✅ Dropped old club-based tables';
  RAISE NOTICE '🔑 Requires: Authorization header for API access';
  RAISE NOTICE '📊 Next: Run fetch script to populate with rider data';
END $$;

-- MIGRATION 6: Updated Views (v_rider_complete!)
-- ============================================================================
-- ============================================================================
-- MIGRATION 006: Updated Views for New ZwiftRacing Riders Table
-- ============================================================================
-- Purpose: Update all views to use api_zwiftracing_riders instead of clubs
-- Date: 10 december 2025
-- ============================================================================

-- Drop all existing views
DROP VIEW IF EXISTS v_rider_complete CASCADE;
DROP VIEW IF EXISTS v_team_rankings CASCADE;
DROP VIEW IF EXISTS v_power_rankings CASCADE;
DROP VIEW IF EXISTS v_event_results CASCADE;
DROP VIEW IF EXISTS v_activities_feed CASCADE;
DROP VIEW IF EXISTS v_race_calendar CASCADE;
DROP VIEW IF EXISTS v_event_signup_preview CASCADE;
DROP VIEW IF EXISTS v_social_network CASCADE;
DROP VIEW IF EXISTS v_dashboard_summary CASCADE;

-- ============================================================================
-- VIEW 1: Complete Rider Profile (Racing Matrix / Team Dashboard)
-- ============================================================================

CREATE OR REPLACE VIEW v_rider_complete AS
SELECT 
  -- Identity (prefer Zwift Official for official data)
  COALESCE(zo.rider_id, zr.rider_id) AS rider_id,
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name) AS full_name,
  zr.name AS racing_name,
  zo.first_name,
  zo.last_name,
  
  -- Racing Metrics (combined sources)
  zr.velo_live,
  zr.velo_30day,
  zr.velo_90day,
  zo.competition_racing_score AS zwift_official_racing_score,
  zo.competition_category AS zwift_official_category,
  zr.phenotype,
  zr.category AS zwiftracing_category,
  zr.race_count,
  
  -- Power Curve (only from ZwiftRacing)
  zr.ftp AS racing_ftp,
  zr.power_5s, zr.power_15s, zr.power_30s, zr.power_60s,
  zr.power_120s, zr.power_300s, zr.power_1200s,
  zr.power_5s_wkg, zr.power_15s_wkg, zr.power_30s_wkg,
  zr.power_60s_wkg, zr.power_120s_wkg, zr.power_300s_wkg,
  zr.power_1200s_wkg,
  
  -- Physical (prefer Official for accuracy, convert from grams to kg)
  COALESCE(zo.weight / 1000.0, zr.weight) AS weight_kg,
  COALESCE(zo.height, zr.height) AS height_cm,
  COALESCE(zo.ftp, zr.ftp) AS ftp_watts,
  
  -- Avatar & Visual (only from Official)
  zo.image_src AS avatar_url,
  zo.image_src_large AS avatar_url_large,
  
  -- Social Stats (only from Official)
  zo.followers_count,
  zo.followees_count,
  zo.rideons_given,
  
  -- Demographics (only from Official)
  zo.age,
  zo.male AS is_male,
  zo.country_code,
  zo.country_alpha3,
  
  -- Achievements (only from Official)
  zo.achievement_level,
  zo.total_distance / 1000.0 AS total_distance_km,
  zo.total_distance_climbed AS total_elevation_m,
  
  -- Privacy (only from Official)
  zo.privacy_profile,
  zo.privacy_activities,
  
  -- Status
  zo.riding AS currently_riding,
  zo.world_id AS current_world,
  
  -- Sync tracking
  zr.fetched_at AS racing_data_updated,
  zo.fetched_at AS profile_data_updated,
  
  -- Source indicators
  CASE 
    WHEN zr.rider_id IS NOT NULL AND zo.rider_id IS NOT NULL THEN 'complete'
    WHEN zr.rider_id IS NOT NULL THEN 'racing_only'
    WHEN zo.rider_id IS NOT NULL THEN 'profile_only'
  END AS data_completeness

FROM api_zwift_api_profiles zo
FULL OUTER JOIN api_zwiftracing_riders zr ON zo.rider_id = zr.rider_id;

COMMENT ON VIEW v_rider_complete IS 
  'Complete rider data combining Zwift Official + ZwiftRacing.app.
   NO club dependency - direct rider lookup.
   Used by: Racing Matrix, Team Dashboard.
   Test: SELECT * FROM v_rider_complete WHERE rider_id = 150437;';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON v_rider_complete TO authenticated;
GRANT SELECT ON v_rider_complete TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created v_rider_complete view';
  RAISE NOTICE '📊 Uses: api_zwift_api_profiles + api_zwiftracing_riders';
  RAISE NOTICE '🎯 NO club dependency';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check dat de view bestaat:
SELECT 'v_rider_complete view exists!' as status;

-- Check hoeveel rows (verwacht 0 na migrations, data volgt later):
SELECT COUNT(*) as row_count FROM v_rider_complete;

-- ✅ KLAAR! Nu data syncen met: node fetch-zwiftracing-rider.js <rider_id>
