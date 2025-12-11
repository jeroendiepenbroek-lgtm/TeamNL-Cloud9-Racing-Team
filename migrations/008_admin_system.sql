-- ============================================================================
-- MIGRATION 008: Admin System (Auto-sync + Team Management)
-- ============================================================================
-- Purpose: Add admin functionality for team management and automated sync
-- Date: 11 december 2025
-- ============================================================================

-- ============================================================================
-- 1. ADMIN USERS TABLE
-- ============================================================================
-- Authenticated admin users for dashboard access

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email 
  ON admin_users(email);

COMMENT ON TABLE admin_users IS 
  'Admin users with bcrypt password hashes for JWT authentication';

-- ============================================================================
-- 2. TEAM ROSTER TABLE
-- ============================================================================
-- Track which riders are part of the team for dashboard display

CREATE TABLE IF NOT EXISTS team_roster (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL UNIQUE,
  zwift_id INTEGER,
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  added_by TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_synced TIMESTAMPTZ,
  
  CONSTRAINT fk_rider FOREIGN KEY (rider_id) 
    REFERENCES api_zwiftracing_riders(rider_id) 
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_roster_active 
  ON team_roster(is_active);
CREATE INDEX IF NOT EXISTS idx_team_roster_rider 
  ON team_roster(rider_id);

COMMENT ON TABLE team_roster IS 
  'Team roster - riders managed via admin dashboard';

-- ============================================================================
-- 3. SYNC CONFIGURATION TABLE
-- ============================================================================
-- Key-value store for sync configuration

CREATE TABLE IF NOT EXISTS sync_config (
  config_key TEXT PRIMARY KEY,
  config_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default configuration
INSERT INTO sync_config (config_key, config_value) VALUES
  ('auto_sync_enabled', 'false'),
  ('sync_interval_hours', '1'),
  ('sync_in_progress', 'false'),
  ('last_sync_timestamp', '0')
ON CONFLICT (config_key) DO NOTHING;

COMMENT ON TABLE sync_config IS 
  'Auto-sync configuration as key-value pairs';

-- ============================================================================
-- 4. SYNC LOGS TABLE
-- ============================================================================
-- Track all sync operations for monitoring and debugging

CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'partial')),
  
  -- Stats
  riders_synced INTEGER DEFAULT 0,
  riders_failed INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  
  -- Details
  triggered_by TEXT DEFAULT 'system',
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_started 
  ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status 
  ON sync_logs(status);

COMMENT ON TABLE sync_logs IS 
  'History of all sync operations with success/error tracking';

-- ============================================================================
-- 5. AUDIT LOG TABLE
-- ============================================================================
-- Track all admin actions for audit trail

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  admin_user TEXT NOT NULL,
  
  -- Details
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Context
  success BOOLEAN DEFAULT true NOT NULL,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp 
  ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin 
  ON audit_log(admin_user, timestamp DESC);

COMMENT ON TABLE audit_log IS 
  'Audit trail of all admin actions';

-- ============================================================================
-- 6. UPDATE v_rider_complete TO INCLUDE TEAM STATUS
-- ============================================================================

DROP VIEW IF EXISTS v_rider_complete;

CREATE VIEW v_rider_complete AS
SELECT 
  -- Identity (prefer Zwift Official for official data)
  COALESCE(zo.rider_id, zr.rider_id) AS rider_id,
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name) AS full_name,
  zr.name AS racing_name,
  zo.first_name,
  zo.last_name,
  
  -- Team Status (NEW!)
  tm.is_active AS is_team_member,
  tm.added_at AS team_member_since,
  tm.last_synced AS team_last_synced,
  
  -- Racing Metrics (combined sources)
  zr.velo_live,
  zr.velo_30day,
  zr.velo_90day,
  zo.competition_racing_score AS zwift_official_racing_score,
  zo.competition_category AS zwift_official_category,
  zr.phenotype,
  zr.category AS zwiftracing_category,
  zr.race_count,
  
  -- Race Results Statistics
  zr.race_wins,
  zr.race_podiums,
  zr.race_finishes,
  zr.race_dnfs,
  
  -- Win Rate & Success Metrics (calculated)
  CASE 
    WHEN zr.race_finishes > 0 
    THEN ROUND((zr.race_wins::NUMERIC / zr.race_finishes * 100), 1)
    ELSE 0 
  END AS win_rate_pct,
  CASE 
    WHEN zr.race_finishes > 0 
    THEN ROUND((zr.race_podiums::NUMERIC / zr.race_finishes * 100), 1)
    ELSE 0 
  END AS podium_rate_pct,
  CASE 
    WHEN zr.race_count > 0 
    THEN ROUND((zr.race_dnfs::NUMERIC / zr.race_count * 100), 1)
    ELSE 0 
  END AS dnf_rate_pct,
  
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
FULL OUTER JOIN api_zwiftracing_riders zr ON zo.rider_id = zr.rider_id
LEFT JOIN team_roster tm ON COALESCE(zo.rider_id, zr.rider_id) = tm.rider_id;

COMMENT ON VIEW v_rider_complete IS 
  'Complete rider data with team membership status.
   Now includes: is_team_member, team_member_since, team_last_synced
   Use WHERE is_team_member = true to show only team members';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON admin_users TO service_role;

GRANT SELECT ON team_roster TO authenticated;
GRANT SELECT ON team_roster TO anon;
GRANT ALL ON team_roster TO service_role;

GRANT SELECT ON sync_config TO authenticated;
GRANT SELECT ON sync_config TO anon;
GRANT ALL ON sync_config TO service_role;

GRANT SELECT ON sync_logs TO authenticated;
GRANT SELECT ON sync_logs TO anon;
GRANT ALL ON sync_logs TO service_role;

GRANT SELECT ON audit_log TO authenticated;
GRANT ALL ON audit_log TO service_role;

GRANT SELECT ON v_rider_complete TO authenticated;
GRANT SELECT ON v_rider_complete TO anon;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_admin_user TEXT,
  p_changes JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO audit_log (action, entity_type, entity_id, admin_user, changes)
  VALUES (p_action, p_entity_type, p_entity_id, p_admin_user, p_changes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update sync config timestamp
CREATE OR REPLACE FUNCTION update_sync_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_config_updated
  BEFORE UPDATE ON sync_config
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_config_timestamp();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created team_roster table';
  RAISE NOTICE '✅ Created sync_config table with default settings';
  RAISE NOTICE '✅ Created sync_logs table for monitoring';
  RAISE NOTICE '✅ Created audit_log table for audit trail';
  RAISE NOTICE '✅ Updated v_rider_complete view with team status';
  RAISE NOTICE '📊 Admin system ready for dashboard integration';
END $$;
