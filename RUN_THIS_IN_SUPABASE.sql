╔══════════════════════════════════════════════════════════════════════════╗
║                    COMPLETE DATA SYNC - ACTION REQUIRED                  ║
╚══════════════════════════════════════════════════════════════════════════╝

📋 STAP 1: RUN MIGRATIONS IN SUPABASE (HANDMATIG)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Dev container heeft geen internet naar Supabase
⚠️  Migrations moeten handmatig worden uitgevoerd

1. Open Supabase SQL Editor:
   🔗 https://supabase.com/dashboard/project/tfsepzumkireferencer/sql/new

2. Kopieer de SQL hieronder en plak in editor

3. Klik op de RUN ▶️ button

4. Controleer output: "Success. No rows returned"

5. Kom terug en run: ./sync-complete-data.sh


╔══════════════════════════════════════════════════════════════════════════╗
║                         MIGRATION SQL (COPY THIS)                        ║
╚══════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- Migration 005: ZwiftRacing Riders Table
-- ============================================================================
DROP TABLE IF EXISTS api_zwiftracing_public_clubs_riders CASCADE;
DROP TABLE IF EXISTS api_zwiftracing_public_clubs CASCADE;
DROP TABLE IF EXISTS api_zwiftracing_riders CASCADE;

CREATE TABLE api_zwiftracing_riders (
  rider_id INTEGER PRIMARY KEY,
  source_api TEXT DEFAULT 'zwiftracing.app' NOT NULL,
  endpoint TEXT DEFAULT '/public/riders/{id}' NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  id INTEGER NOT NULL,
  name TEXT,
  country TEXT,
  velo_live DECIMAL(10,2),
  velo_30day DECIMAL(10,2),
  velo_90day DECIMAL(10,2),
  category TEXT,
  ftp INTEGER,
  power_5s INTEGER,
  power_15s INTEGER,
  power_30s INTEGER,
  power_60s INTEGER,
  power_120s INTEGER,
  power_300s INTEGER,
  power_1200s INTEGER,
  power_5s_wkg DECIMAL(5,2),
  power_15s_wkg DECIMAL(5,2),
  power_30s_wkg DECIMAL(5,2),
  power_60s_wkg DECIMAL(5,2),
  power_120s_wkg DECIMAL(5,2),
  power_300s_wkg DECIMAL(5,2),
  power_1200s_wkg DECIMAL(5,2),
  weight DECIMAL(5,2),
  height INTEGER,
  phenotype TEXT,
  race_count INTEGER,
  raw_response JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_zwiftracing_riders_velo_live ON api_zwiftracing_riders(velo_live DESC);
CREATE INDEX IF NOT EXISTS idx_zwiftracing_riders_velo_90day ON api_zwiftracing_riders(velo_90day DESC);
CREATE INDEX IF NOT EXISTS idx_zwiftracing_riders_fetched ON api_zwiftracing_riders(fetched_at DESC);

-- ============================================================================
-- Migration 006: Updated Views
-- ============================================================================
DROP VIEW IF EXISTS v_rider_complete CASCADE;

CREATE OR REPLACE VIEW v_rider_complete AS
SELECT 
  COALESCE(zo.rider_id, zr.rider_id) AS rider_id,
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name) AS full_name,
  zr.name AS racing_name,
  zo.first_name,
  zo.last_name,
  zr.velo_live,
  zr.velo_30day,
  zr.velo_90day,
  zo.competition_racing_score AS zwift_official_racing_score,
  zo.competition_category AS zwift_official_category,
  zr.phenotype,
  zr.category AS zwiftracing_category,
  zr.race_count,
  zr.ftp AS racing_ftp,
  zr.power_5s, zr.power_15s, zr.power_30s, zr.power_60s,
  zr.power_120s, zr.power_300s, zr.power_1200s,
  zr.power_5s_wkg, zr.power_15s_wkg, zr.power_30s_wkg,
  zr.power_60s_wkg, zr.power_120s_wkg, zr.power_300s_wkg,
  zr.power_1200s_wkg,
  COALESCE(zo.weight / 1000.0, zr.weight) AS weight_kg,
  COALESCE(zo.height, zr.height) AS height_cm,
  COALESCE(zo.ftp, zr.ftp) AS ftp_watts,
  zo.image_src AS avatar_url,
  zo.image_src_large AS avatar_url_large,
  zo.followers_count,
  zo.followees_count,
  zo.rideons_given,
  zo.age,
  zo.male AS is_male,
  zo.country_code,
  zo.country_alpha3,
  zo.achievement_level,
  zo.total_distance / 1000.0 AS total_distance_km,
  zo.total_distance_climbed AS total_elevation_m,
  zo.privacy_profile,
  zo.privacy_activities,
  zo.riding AS currently_riding,
  zo.world_id AS current_world,
  zr.fetched_at AS racing_data_updated,
  zo.fetched_at AS profile_data_updated,
  CASE 
    WHEN zr.rider_id IS NOT NULL AND zo.rider_id IS NOT NULL THEN 'complete'
    WHEN zr.rider_id IS NOT NULL THEN 'racing_only'
    WHEN zo.rider_id IS NOT NULL THEN 'profile_only'
  END AS data_completeness
FROM api_zwift_api_profiles zo
FULL OUTER JOIN api_zwiftracing_riders zr ON zo.rider_id = zr.rider_id;

GRANT SELECT ON v_rider_complete TO authenticated;
GRANT SELECT ON v_rider_complete TO anon;
