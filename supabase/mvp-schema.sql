-- ============================================================================
-- MVP PRODUCTIE SCHEMA - TeamNL Cloud9 Racing
-- ============================================================================
-- Alignment: 6 API Endpoints → 6 Database Tables
-- 
-- Sourcing Strategy:
--   1. clubs           ← /public/clubs/<id>
--   2. club_members    ← /public/clubs/<id> (members array)
--   3. riders          ← /public/riders/<riderId>
--   4. rider_snapshots ← /public/riders/<riderId>/<time>
--   5. events          ← /public/results/<eventId> + scraping
--   6. event_results   ← /public/zp/<eventId>/results
--
-- Run dit in Supabase SQL Editor:
-- https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/sql
-- ============================================================================

-- ============================================================================
-- TABLE 1: CLUBS
-- Source: /public/clubs/<id>
-- ============================================================================

CREATE TABLE IF NOT EXISTS clubs (
  id BIGSERIAL PRIMARY KEY,
  club_id BIGINT UNIQUE NOT NULL,           -- Zwift club ID
  club_name TEXT NOT NULL,
  description TEXT,
  member_count INTEGER DEFAULT 0,
  country TEXT,
  created_date TIMESTAMPTZ,
  
  -- Metadata
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clubs_club_id ON clubs(club_id);
CREATE INDEX idx_clubs_name ON clubs(club_name);

-- ============================================================================
-- TABLE 2: CLUB_MEMBERS (denormalized roster)
-- Source: /public/clubs/<id> → members array
-- ============================================================================

CREATE TABLE IF NOT EXISTS club_members (
  id BIGSERIAL PRIMARY KEY,
  club_id BIGINT NOT NULL,                  -- FK naar clubs
  rider_id BIGINT NOT NULL,                 -- Zwift rider ID
  rider_name TEXT NOT NULL,
  ranking INTEGER,
  category_racing TEXT,
  joined_date TIMESTAMPTZ,
  
  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, rider_id)
);

CREATE INDEX idx_members_club_id ON club_members(club_id);
CREATE INDEX idx_members_rider_id ON club_members(rider_id);
CREATE INDEX idx_members_ranking ON club_members(ranking DESC NULLS LAST);

-- ============================================================================
-- TABLE 3: RIDERS
-- Source: /public/riders/<riderId>
-- ============================================================================

CREATE TABLE IF NOT EXISTS riders (
  id BIGSERIAL PRIMARY KEY,
  zwift_id BIGINT UNIQUE NOT NULL,          -- Zwift rider ID
  name TEXT NOT NULL,
  
  -- Club info (extracted from rider data)
  club_id BIGINT,
  club_name TEXT,
  
  -- Performance metrics
  ranking INTEGER,
  ranking_score DECIMAL(10,2),
  ftp INTEGER,
  weight DECIMAL(5,2),
  watts_per_kg DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN weight > 0 THEN ROUND((ftp / weight)::NUMERIC, 2)
      ELSE NULL 
    END
  ) STORED,
  
  -- Racing category
  category_racing TEXT,                     -- A, B, C, D, E
  category_zftp TEXT,
  
  -- Demographics
  age INTEGER,
  gender TEXT,
  country TEXT,
  
  -- Race stats (aggregated)
  total_races INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_podiums INTEGER DEFAULT 0,
  
  -- Metadata
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_riders_zwift_id ON riders(zwift_id);
CREATE INDEX idx_riders_club_id ON riders(club_id);
CREATE INDEX idx_riders_ranking ON riders(ranking DESC NULLS LAST);
CREATE INDEX idx_riders_wkg ON riders(watts_per_kg DESC NULLS LAST);
CREATE INDEX idx_riders_category ON riders(category_racing);

-- ============================================================================
-- TABLE 4: RIDER_SNAPSHOTS (historical time-series)
-- Source: /public/riders/<riderId>/<time>
-- ============================================================================

CREATE TABLE IF NOT EXISTS rider_snapshots (
  id BIGSERIAL PRIMARY KEY,
  rider_id BIGINT NOT NULL,                 -- FK naar riders
  snapshot_timestamp TIMESTAMPTZ NOT NULL,  -- Unix epoch from API
  
  -- Snapshot data (point-in-time)
  ranking INTEGER,
  ranking_score DECIMAL(10,2),
  ftp INTEGER,
  weight DECIMAL(5,2),
  category_racing TEXT,
  
  -- Raw JSON (voor future analysis)
  raw_data JSONB,
  
  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rider_id, snapshot_timestamp)
);

CREATE INDEX idx_snapshots_rider_id ON rider_snapshots(rider_id);
CREATE INDEX idx_snapshots_timestamp ON rider_snapshots(snapshot_timestamp DESC);

-- ============================================================================
-- TABLE 5: EVENTS
-- Source: /public/results/<eventId> + scraping https://zwiftracing.app/riders/<riderId>
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT UNIQUE NOT NULL,          -- Zwift event ID
  event_name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  
  -- Route details
  route_name TEXT,
  laps INTEGER,
  distance_meters INTEGER,
  elevation_meters INTEGER,
  
  -- Category
  category TEXT,                            -- A, B, C, D, Mixed, etc.
  
  -- Metadata
  source TEXT DEFAULT 'api',                -- 'api' or 'scraping'
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_event_id ON events(event_id);
CREATE INDEX idx_events_date ON events(event_date DESC);
CREATE INDEX idx_events_category ON events(category);

-- ============================================================================
-- TABLE 6: EVENT_RESULTS
-- Source: /public/zp/<eventId>/results
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_results (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,                 -- FK naar events
  rider_id BIGINT NOT NULL,                 -- FK naar riders
  rider_name TEXT NOT NULL,
  
  -- Result data
  position INTEGER,
  finish_time_seconds INTEGER,
  avg_power_watts INTEGER,
  avg_heart_rate INTEGER,
  avg_cadence INTEGER,
  
  -- Performance
  normalized_power INTEGER,
  watts_per_kg DECIMAL(5,2),
  
  -- Category
  category TEXT,
  
  -- Status
  did_finish BOOLEAN DEFAULT true,
  dnf_reason TEXT,
  
  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, rider_id)
);

CREATE INDEX idx_results_event_id ON event_results(event_id);
CREATE INDEX idx_results_rider_id ON event_results(rider_id);
CREATE INDEX idx_results_position ON event_results(position);
CREATE INDEX idx_results_wkg ON event_results(watts_per_kg DESC NULLS LAST);

-- ============================================================================
-- AUDIT/MONITORING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_logs (
  id BIGSERIAL PRIMARY KEY,
  operation TEXT NOT NULL,                  -- 'sync_club', 'sync_rider', 'scrape_events'
  entity_type TEXT NOT NULL,                -- 'club', 'rider', 'event'
  entity_id BIGINT,
  status TEXT NOT NULL,                     -- 'success', 'failed', 'partial'
  message TEXT,
  error_details JSONB,
  duration_ms INTEGER,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_operation ON sync_logs(operation);
CREATE INDEX idx_logs_status ON sync_logs(status);
CREATE INDEX idx_logs_date ON sync_logs(synced_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Public read access (anon users can read)
CREATE POLICY "Public read clubs" ON clubs FOR SELECT USING (true);
CREATE POLICY "Public read members" ON club_members FOR SELECT USING (true);
CREATE POLICY "Public read riders" ON riders FOR SELECT USING (true);
CREATE POLICY "Public read snapshots" ON rider_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read events" ON events FOR SELECT USING (true);
CREATE POLICY "Public read results" ON event_results FOR SELECT USING (true);
CREATE POLICY "Public read logs" ON sync_logs FOR SELECT USING (true);

-- Authenticated write access (service_role via backend)
CREATE POLICY "Service write clubs" ON clubs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write members" ON club_members FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write riders" ON riders FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write snapshots" ON rider_snapshots FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write events" ON events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write results" ON event_results FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write logs" ON sync_logs FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TRIGGERS (auto-update timestamps)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clubs_updated_at BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER riders_updated_at BEFORE UPDATE ON riders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- VIEWS (analytics helpers)
-- ============================================================================

-- Top riders by ranking
CREATE OR REPLACE VIEW top_riders_ranking AS
SELECT 
  zwift_id,
  name,
  club_name,
  ranking,
  category_racing,
  watts_per_kg,
  total_races,
  total_wins
FROM riders
WHERE ranking IS NOT NULL
ORDER BY ranking ASC
LIMIT 100;

-- Top riders by W/kg
CREATE OR REPLACE VIEW top_riders_wkg AS
SELECT 
  zwift_id,
  name,
  club_name,
  ftp,
  weight,
  watts_per_kg,
  category_racing,
  ranking
FROM riders
WHERE watts_per_kg IS NOT NULL
ORDER BY watts_per_kg DESC
LIMIT 100;

-- Club leaderboard
CREATE OR REPLACE VIEW club_stats AS
SELECT 
  c.club_id,
  c.club_name,
  c.member_count,
  COUNT(DISTINCT r.zwift_id) as tracked_riders,
  ROUND(AVG(r.watts_per_kg)::NUMERIC, 2) as avg_wkg,
  ROUND(AVG(r.ftp)::NUMERIC, 0) as avg_ftp,
  SUM(r.total_wins) as total_wins,
  MAX(r.last_synced) as last_updated
FROM clubs c
LEFT JOIN riders r ON c.club_id = r.club_id
GROUP BY c.club_id, c.club_name, c.member_count
ORDER BY avg_wkg DESC;

-- Recent events (last 30 days)
CREATE OR REPLACE VIEW recent_events AS
SELECT 
  e.event_id,
  e.event_name,
  e.event_date,
  e.category,
  COUNT(er.id) as participant_count,
  MAX(er.synced_at) as results_synced
FROM events e
LEFT JOIN event_results er ON e.event_id = er.event_id
WHERE e.event_date > NOW() - INTERVAL '30 days'
GROUP BY e.event_id, e.event_name, e.event_date, e.category
ORDER BY e.event_date DESC;

-- ============================================================================
-- GRANTS (allow anon read, service_role write)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- SETUP VERIFICATION
-- ============================================================================

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) as column_count
FROM pg_tables
WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;

-- Verify indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- MVP SCHEMA COMPLETE ✅
-- ============================================================================
-- 
-- Next steps:
-- 1. Run dit script in Supabase SQL Editor
-- 2. Verify tables met: SELECT * FROM clubs; (etc.)
-- 3. Update backend scripts om deze tabellen te gebruiken
-- 4. Test met AdminPanel upload (US2)
--
-- API Endpoint Mapping:
--   /public/clubs/<id>              → clubs + club_members
--   /public/riders/<riderId>        → riders (+ auto-detect club_id)
--   /public/riders/<riderId>/<time> → rider_snapshots
--   /public/results/<eventId>       → events
--   /public/zp/<eventId>/results    → event_results
--   Scraping zwiftracing.app        → events (discovery)
-- ============================================================================
