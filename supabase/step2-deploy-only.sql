-- ============================================================================
-- STAP 2: DEPLOY ONLY
-- ============================================================================
-- Run dit NA step1-cleanup-only.sql
-- ============================================================================

-- TABLE 1: CLUBS
CREATE TABLE clubs (
  id BIGSERIAL PRIMARY KEY,
  club_id BIGINT UNIQUE NOT NULL,
  club_name TEXT NOT NULL,
  description TEXT,
  member_count INTEGER DEFAULT 0,
  country TEXT,
  created_date TIMESTAMPTZ,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clubs_club_id ON clubs(club_id);
CREATE INDEX idx_clubs_name ON clubs(club_name);

-- TABLE 2: CLUB_MEMBERS
CREATE TABLE club_members (
  id BIGSERIAL PRIMARY KEY,
  club_id BIGINT NOT NULL,
  rider_id BIGINT NOT NULL,
  rider_name TEXT NOT NULL,
  ranking INTEGER,
  category_racing TEXT,
  joined_date TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, rider_id)
);

CREATE INDEX idx_members_club_id ON club_members(club_id);
CREATE INDEX idx_members_rider_id ON club_members(rider_id);
CREATE INDEX idx_members_ranking ON club_members(ranking DESC NULLS LAST);

-- TABLE 3: RIDERS
CREATE TABLE riders (
  id BIGSERIAL PRIMARY KEY,
  zwift_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  club_id BIGINT,
  club_name TEXT,
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
  category_racing TEXT,
  category_zftp TEXT,
  age INTEGER,
  gender TEXT,
  country TEXT,
  total_races INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_podiums INTEGER DEFAULT 0,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_riders_zwift_id ON riders(zwift_id);
CREATE INDEX idx_riders_club_id ON riders(club_id);
CREATE INDEX idx_riders_ranking ON riders(ranking DESC NULLS LAST);
CREATE INDEX idx_riders_wkg ON riders(watts_per_kg DESC NULLS LAST);
CREATE INDEX idx_riders_category ON riders(category_racing);

-- TABLE 4: RIDER_SNAPSHOTS
CREATE TABLE rider_snapshots (
  id BIGSERIAL PRIMARY KEY,
  rider_id BIGINT NOT NULL,
  snapshot_timestamp TIMESTAMPTZ NOT NULL,
  ranking INTEGER,
  ranking_score DECIMAL(10,2),
  ftp INTEGER,
  weight DECIMAL(5,2),
  category_racing TEXT,
  raw_data JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rider_id, snapshot_timestamp)
);

CREATE INDEX idx_snapshots_rider_id ON rider_snapshots(rider_id);
CREATE INDEX idx_snapshots_timestamp ON rider_snapshots(snapshot_timestamp DESC);

-- TABLE 5: EVENTS
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT UNIQUE NOT NULL,
  event_name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  route_name TEXT,
  laps INTEGER,
  distance_meters INTEGER,
  elevation_meters INTEGER,
  category TEXT,
  source TEXT DEFAULT 'api',
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_event_id ON events(event_id);
CREATE INDEX idx_events_date ON events(event_date DESC);
CREATE INDEX idx_events_category ON events(category);

-- TABLE 6: EVENT_RESULTS
CREATE TABLE event_results (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,
  rider_id BIGINT NOT NULL,
  rider_name TEXT NOT NULL,
  position INTEGER,
  finish_time_seconds INTEGER,
  avg_power_watts INTEGER,
  avg_heart_rate INTEGER,
  avg_cadence INTEGER,
  normalized_power INTEGER,
  watts_per_kg DECIMAL(5,2),
  category TEXT,
  did_finish BOOLEAN DEFAULT true,
  dnf_reason TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, rider_id)
);

CREATE INDEX idx_results_event_id ON event_results(event_id);
CREATE INDEX idx_results_rider_id ON event_results(rider_id);
CREATE INDEX idx_results_position ON event_results(position);
CREATE INDEX idx_results_wkg ON event_results(watts_per_kg DESC NULLS LAST);

-- TABLE 7: SYNC_LOGS
CREATE TABLE sync_logs (
  id BIGSERIAL PRIMARY KEY,
  operation TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id BIGINT,
  status TEXT NOT NULL,
  message TEXT,
  error_details JSONB,
  duration_ms INTEGER,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_operation ON sync_logs(operation);
CREATE INDEX idx_logs_status ON sync_logs(status);
CREATE INDEX idx_logs_date ON sync_logs(synced_at DESC);

-- RLS
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read clubs" ON clubs FOR SELECT USING (true);
CREATE POLICY "Public read members" ON club_members FOR SELECT USING (true);
CREATE POLICY "Public read riders" ON riders FOR SELECT USING (true);
CREATE POLICY "Public read snapshots" ON rider_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read events" ON events FOR SELECT USING (true);
CREATE POLICY "Public read results" ON event_results FOR SELECT USING (true);
CREATE POLICY "Public read logs" ON sync_logs FOR SELECT USING (true);

CREATE POLICY "Service write clubs" ON clubs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write members" ON club_members FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write riders" ON riders FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write snapshots" ON rider_snapshots FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write events" ON events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write results" ON event_results FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write logs" ON sync_logs FOR ALL USING (auth.role() = 'service_role');

-- TRIGGERS
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

-- VIEWS
CREATE OR REPLACE VIEW top_riders_ranking AS
SELECT 
  zwift_id, name, club_name, ranking, category_racing,
  watts_per_kg, total_races, total_wins
FROM riders
WHERE ranking IS NOT NULL
ORDER BY ranking ASC
LIMIT 100;

CREATE OR REPLACE VIEW top_riders_wkg AS
SELECT 
  zwift_id, name, club_name, ftp, weight,
  watts_per_kg, category_racing, ranking
FROM riders
WHERE watts_per_kg IS NOT NULL
ORDER BY watts_per_kg DESC
LIMIT 100;

CREATE OR REPLACE VIEW club_stats AS
SELECT 
  c.club_id, c.club_name, c.member_count,
  COUNT(DISTINCT r.zwift_id) as tracked_riders,
  ROUND(AVG(r.watts_per_kg)::NUMERIC, 2) as avg_wkg,
  ROUND(AVG(r.ftp)::NUMERIC, 0) as avg_ftp,
  SUM(r.total_wins) as total_wins,
  MAX(r.last_synced) as last_updated
FROM clubs c
LEFT JOIN riders r ON c.club_id = r.club_id
GROUP BY c.club_id, c.club_name, c.member_count
ORDER BY avg_wkg DESC;

CREATE OR REPLACE VIEW recent_events AS
SELECT 
  e.event_id, e.event_name, e.event_date, e.category,
  COUNT(er.id) as participant_count,
  MAX(er.synced_at) as results_synced
FROM events e
LEFT JOIN event_results er ON e.event_id = er.event_id
WHERE e.event_date > NOW() - INTERVAL '30 days'
GROUP BY e.event_id, e.event_name, e.event_date, e.category
ORDER BY e.event_date DESC;

-- GRANTS
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- VERIFY
SELECT 
  schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) as column_count
FROM pg_tables
WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;
