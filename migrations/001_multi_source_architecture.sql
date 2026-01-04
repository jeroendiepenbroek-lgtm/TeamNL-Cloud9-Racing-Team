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
-- API: ZwiftRacing.app (https://api.zwiftracing.app/api)
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
