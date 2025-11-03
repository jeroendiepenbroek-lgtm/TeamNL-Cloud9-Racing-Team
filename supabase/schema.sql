-- TeamNL Cloud9 Racing - Supabase Schema
-- PostgreSQL database schema voor Zwift racing data
-- 
-- Zero-cost tier: 500MB database, real-time subscriptions included
-- 
-- Run this in Supabase SQL Editor:
-- https://app.supabase.com/project/YOUR_PROJECT/sql

-- ============================================================================
-- RIDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS riders (
  id BIGSERIAL PRIMARY KEY,
  zwift_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  club_id BIGINT,
  club_name TEXT,
  category_racing TEXT,
  ftp INTEGER,
  weight DECIMAL(5,2),
  ranking INTEGER,
  ranking_score DECIMAL(10,2),
  country_code TEXT,
  gender TEXT,
  age TEXT,
  total_races INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_podiums INTEGER DEFAULT 0,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes voor performance
CREATE INDEX IF NOT EXISTS idx_riders_zwift_id ON riders(zwift_id);
CREATE INDEX IF NOT EXISTS idx_riders_club_id ON riders(club_id);
CREATE INDEX IF NOT EXISTS idx_riders_ranking ON riders(ranking DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_riders_ftp ON riders(ftp DESC NULLS LAST);

-- Real-time enable (voor frontend subscriptions)
ALTER PUBLICATION supabase_realtime ADD TABLE riders;

-- Row Level Security (RLS)
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can read)
CREATE POLICY "Public riders read access" ON riders
  FOR SELECT USING (true);

-- Authenticated write access (only authenticated users can write)
CREATE POLICY "Authenticated riders write access" ON riders
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- CLUBS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS clubs (
  id BIGSERIAL PRIMARY KEY,
  club_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  member_count INTEGER DEFAULT 0,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clubs_club_id ON clubs(club_id);

ALTER PUBLICATION supabase_realtime ADD TABLE clubs;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public clubs read access" ON clubs
  FOR SELECT USING (true);

CREATE POLICY "Authenticated clubs write access" ON clubs
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- CLUB ROSTER (denormalized for performance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS club_roster (
  id BIGSERIAL PRIMARY KEY,
  club_id BIGINT NOT NULL,
  rider_id BIGINT NOT NULL,
  rider_name TEXT NOT NULL,
  ranking INTEGER,
  category_racing TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, rider_id)
);

CREATE INDEX IF NOT EXISTS idx_roster_club_id ON club_roster(club_id);
CREATE INDEX IF NOT EXISTS idx_roster_rider_id ON club_roster(rider_id);

ALTER PUBLICATION supabase_realtime ADD TABLE club_roster;
ALTER TABLE club_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public roster read access" ON club_roster
  FOR SELECT USING (true);

CREATE POLICY "Authenticated roster write access" ON club_roster
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  route TEXT,
  laps INTEGER,
  distance_meters INTEGER,
  total_elevation INTEGER,
  category TEXT,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_event_id ON events(event_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public events read access" ON events
  FOR SELECT USING (true);

CREATE POLICY "Authenticated events write access" ON events
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- RACE RESULTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS race_results (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,
  rider_id BIGINT NOT NULL,
  rider_name TEXT NOT NULL,
  position INTEGER,
  finish_time_ms BIGINT,
  avg_watts INTEGER,
  avg_heart_rate INTEGER,
  category TEXT,
  did_finish BOOLEAN DEFAULT true,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, rider_id)
);

CREATE INDEX IF NOT EXISTS idx_results_event_id ON race_results(event_id);
CREATE INDEX IF NOT EXISTS idx_results_rider_id ON race_results(rider_id);
CREATE INDEX IF NOT EXISTS idx_results_position ON race_results(position);

ALTER PUBLICATION supabase_realtime ADD TABLE race_results;
ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public results read access" ON race_results
  FOR SELECT USING (true);

CREATE POLICY "Authenticated results write access" ON race_results
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- RIDER HISTORY (time-series snapshots)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rider_history (
  id BIGSERIAL PRIMARY KEY,
  rider_id BIGINT NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL,
  ranking INTEGER,
  ranking_score DECIMAL(10,2),
  ftp INTEGER,
  weight DECIMAL(5,2),
  raw_data JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rider_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_history_rider_id ON rider_history(rider_id);
CREATE INDEX IF NOT EXISTS idx_history_date ON rider_history(snapshot_date DESC);

ALTER TABLE rider_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public history read access" ON rider_history
  FOR SELECT USING (true);

CREATE POLICY "Authenticated history write access" ON rider_history
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- SYNC LOGS (audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_logs (
  id BIGSERIAL PRIMARY KEY,
  operation TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id BIGINT,
  status TEXT NOT NULL, -- 'success', 'failed', 'partial'
  message TEXT,
  error_details JSONB,
  duration_ms INTEGER,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_operation ON sync_logs(operation);
CREATE INDEX IF NOT EXISTS idx_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_logs_date ON sync_logs(synced_at DESC);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public logs read access" ON sync_logs
  FOR SELECT USING (true);

CREATE POLICY "Authenticated logs write access" ON sync_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- Top riders by W/kg
CREATE OR REPLACE VIEW top_riders_wkg AS
SELECT 
  zwift_id,
  name,
  club_name,
  ftp,
  weight,
  ROUND((ftp / NULLIF(weight, 0))::NUMERIC, 2) as w_per_kg,
  category_racing,
  ranking,
  total_races,
  total_wins
FROM riders
WHERE ftp IS NOT NULL AND weight IS NOT NULL AND weight > 0
ORDER BY (ftp / NULLIF(weight, 0)) DESC
LIMIT 100;

-- Club leaderboard
CREATE OR REPLACE VIEW club_leaderboard AS
SELECT 
  c.club_id,
  c.name as club_name,
  c.member_count,
  COUNT(r.id) as active_riders,
  ROUND(AVG(r.ftp)::NUMERIC, 0) as avg_ftp,
  ROUND(AVG(r.ftp / NULLIF(r.weight, 0))::NUMERIC, 2) as avg_w_per_kg,
  SUM(r.total_wins) as total_wins,
  MAX(r.last_synced) as last_updated
FROM clubs c
LEFT JOIN riders r ON c.club_id = r.club_id
WHERE r.ftp IS NOT NULL AND r.weight IS NOT NULL
GROUP BY c.club_id, c.name, c.member_count
ORDER BY avg_w_per_kg DESC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_riders_updated_at BEFORE UPDATE ON riders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL SETUP COMPLETE
-- ============================================================================

-- Verify tables
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Grant usage to anon role (for public access via API)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
