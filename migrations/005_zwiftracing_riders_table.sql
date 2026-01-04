-- ============================================================================
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
-- API: GET https://api.zwiftracing.app/api/public/riders/{riderId}
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
