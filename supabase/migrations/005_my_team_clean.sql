-- ============================================================================
-- MY TEAM MEMBERS - Clean Relational Table + View
-- ============================================================================
-- Filosofie:
-- 1. SOURCE TABLES (6) = Raw data from ZwiftRacing API
-- 2. RELATION TABLE (1) = my_team_members (minimaal: alleen zwift_id)
-- 3. VIEWS = Computed data via JOINs (geen duplicatie!)
-- ============================================================================

-- Relation Table: my_team_members
-- Alleen de relatie: "Deze zwift_id hoort in mijn team"
CREATE TABLE IF NOT EXISTS my_team_members (
  zwift_id INTEGER PRIMARY KEY,  -- Direct reference naar riders.zwift_id
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_favorite BOOLEAN DEFAULT FALSE,
  
  -- Foreign key constraint
  CONSTRAINT fk_my_team_rider FOREIGN KEY (zwift_id) 
    REFERENCES riders(zwift_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_my_team_added_at ON my_team_members(added_at);
CREATE INDEX IF NOT EXISTS idx_my_team_favorite ON my_team_members(is_favorite);

-- ============================================================================
-- VIEW: view_my_team
-- Combineert my_team_members + riders + clubs via JOINs
-- Dit is waar alle data vandaan komt - GEEN duplicatie!
-- ============================================================================
CREATE OR REPLACE VIEW view_my_team AS
SELECT 
  -- Rider identifiers
  r.id as rider_id,
  r.zwift_id,
  r.name,
  
  -- Club info (automatisch geëxtraheerd)
  r.club_id,
  c.name as club_name,
  
  -- Racing info
  r.category_racing,
  r.ranking,
  r.ranking_score,
  
  -- Power metrics (computed watts/kg here!)
  r.ftp,
  r.weight,
  CASE 
    WHEN r.weight > 0 THEN ROUND((r.ftp / r.weight)::numeric, 2)
    ELSE NULL 
  END as watts_per_kg,
  
  -- Personal info
  r.country_code,
  r.gender,
  r.age,
  
  -- Stats
  r.total_races,
  r.total_wins,
  r.total_podiums,
  r.total_dnfs,
  
  -- Timestamps
  r.created_at as rider_created_at,
  r.last_synced as rider_last_synced,
  
  -- Team membership info
  tm.added_at as team_added_at,
  tm.is_favorite
  
FROM my_team_members tm
INNER JOIN riders r ON tm.zwift_id = r.zwift_id
LEFT JOIN clubs c ON r.club_id = c.id
ORDER BY r.ranking ASC NULLS LAST;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE my_team_members ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all with service_role (backend gebruikt service_role_key)
CREATE POLICY "Allow service_role full access to my_team_members"
ON my_team_members
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- Permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON my_team_members TO service_role;
GRANT SELECT ON view_my_team TO service_role, authenticated, anon;

-- ============================================================================
-- Comments (documentatie)
-- ============================================================================
COMMENT ON TABLE my_team_members IS 'Relationele tabel: welke riders zitten in mijn team (alleen zwift_id, geen duplicatie van rider data)';
COMMENT ON VIEW view_my_team IS 'View die my_team_members combineert met riders en clubs - dit is de source voor GET /api/riders/team';
COMMENT ON COLUMN my_team_members.zwift_id IS 'Primary key + Foreign key naar riders(zwift_id)';
COMMENT ON COLUMN my_team_members.is_favorite IS 'Mark rider als favoriet (voor filtering in frontend)';
