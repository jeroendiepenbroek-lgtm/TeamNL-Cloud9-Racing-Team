-- Migration 010: Team Builder
-- Adds tables for creating competition teams with vELO/Category validation
-- Features: WTRL ZRL (category-based), Club Ladder (vELO spread-based)

BEGIN;

-- ============================================================================
-- COMPETITION TEAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS competition_teams (
  id SERIAL PRIMARY KEY,
  team_name VARCHAR(100) NOT NULL,
  competition_type VARCHAR(20) NOT NULL CHECK (competition_type IN ('velo', 'category')),
  
  -- Competition config
  competition_name VARCHAR(100), -- e.g. "WTRL ZRL Season 5", "Club Ladder 2025"
  
  -- vELO config (for Club Ladder)
  velo_min_rank INTEGER, -- e.g. 1 for rank 1,2,3
  velo_max_rank INTEGER, -- e.g. 3 for rank 1,2,3
  velo_max_spread INTEGER DEFAULT 3, -- max 3 ranks spread
  
  -- Category config (for WTRL)
  allowed_categories TEXT[], -- e.g. ['A', 'B'] means A/B riders can join
  allow_category_up BOOLEAN DEFAULT true, -- riders can race in higher category
  
  -- Team constraints
  min_riders INTEGER DEFAULT 1,
  max_riders INTEGER DEFAULT 10,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT team_name_unique UNIQUE(team_name)
);

CREATE INDEX idx_competition_teams_type ON competition_teams(competition_type);
CREATE INDEX idx_competition_teams_active ON competition_teams(is_active);

COMMENT ON TABLE competition_teams IS 
'Competition teams for WTRL ZRL (category) and Club Ladder (vELO). Created via Team Builder.';

-- ============================================================================
-- TEAM LINEUPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_lineups (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES competition_teams(id) ON DELETE CASCADE,
  rider_id INTEGER NOT NULL,
  
  -- Position in team
  lineup_position INTEGER, -- 1,2,3,4 for display order
  
  -- Validation snapshot (at time of adding)
  rider_category VARCHAR(10), -- Category at time of add
  rider_velo_rank INTEGER, -- vELO rank at time of add
  
  -- Status
  is_valid BOOLEAN DEFAULT true, -- becomes false if rider moves outside allowed range
  validation_warning TEXT, -- e.g. "Rider moved from vELO 3 to 4 - exceeds spread"
  
  -- Metadata
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT team_rider_unique UNIQUE(team_id, rider_id)
);

CREATE INDEX idx_team_lineups_team ON team_lineups(team_id);
CREATE INDEX idx_team_lineups_rider ON team_lineups(rider_id);
CREATE INDEX idx_team_lineups_valid ON team_lineups(is_valid);

COMMENT ON TABLE team_lineups IS 
'Riders assigned to competition teams. Validates vELO spread and category rules.';

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Team lineup with rider details
CREATE OR REPLACE VIEW v_team_lineups_full AS
SELECT 
  tl.id AS lineup_id,
  tl.team_id,
  ct.team_name,
  ct.competition_type,
  ct.competition_name,
  
  -- Team constraints
  ct.velo_min_rank,
  ct.velo_max_rank,
  ct.velo_max_spread,
  ct.allowed_categories,
  ct.allow_category_up,
  ct.min_riders,
  ct.max_riders,
  
  -- Rider info
  tl.rider_id,
  tl.lineup_position,
  rc.name,
  rc.full_name,
  rc.category,
  rc.velo_live AS current_velo_rank,
  rc.country_alpha3,
  rc.avatar_url,
  
  -- Validation snapshot
  tl.rider_category AS category_at_add,
  tl.rider_velo_rank AS velo_rank_at_add,
  tl.is_valid,
  tl.validation_warning,
  
  -- Timestamps
  tl.added_at,
  tl.updated_at,
  ct.created_at AS team_created_at
  
FROM team_lineups tl
JOIN competition_teams ct ON tl.team_id = ct.id
LEFT JOIN v_rider_complete rc ON tl.rider_id = rc.rider_id
WHERE ct.is_active = true
ORDER BY ct.team_name, tl.lineup_position NULLS LAST;

COMMENT ON VIEW v_team_lineups_full IS 
'Complete team lineups with rider details and validation status';

-- View: Team summary with rider counts
CREATE OR REPLACE VIEW v_team_summary AS
SELECT 
  ct.id AS team_id,
  ct.team_name,
  ct.competition_type,
  ct.competition_name,
  ct.is_active,
  
  -- Team config
  ct.velo_min_rank,
  ct.velo_max_rank,
  ct.velo_max_spread,
  ct.allowed_categories,
  ct.min_riders,
  ct.max_riders,
  
  -- Rider counts
  COUNT(tl.rider_id) AS current_riders,
  COUNT(tl.rider_id) FILTER (WHERE tl.is_valid = true) AS valid_riders,
  COUNT(tl.rider_id) FILTER (WHERE tl.is_valid = false) AS invalid_riders,
  
  -- vELO spread validation (for vELO teams)
  CASE 
    WHEN ct.competition_type = 'velo' THEN
      MAX(rc.velo_live) - MIN(rc.velo_live)
    ELSE NULL
  END AS current_velo_spread,
  
  -- Team status
  CASE 
    WHEN COUNT(tl.rider_id) < ct.min_riders THEN 'incomplete'
    WHEN COUNT(tl.rider_id) > ct.max_riders THEN 'overfilled'
    WHEN COUNT(tl.rider_id) FILTER (WHERE tl.is_valid = false) > 0 THEN 'warning'
    ELSE 'ready'
  END AS team_status,
  
  ct.created_at,
  ct.updated_at
  
FROM competition_teams ct
LEFT JOIN team_lineups tl ON ct.id = tl.team_id
LEFT JOIN v_rider_complete rc ON tl.rider_id = rc.rider_id
WHERE ct.is_active = true
GROUP BY ct.id, ct.team_name, ct.competition_type, ct.competition_name, 
         ct.is_active, ct.velo_min_rank, ct.velo_max_rank, ct.velo_max_spread,
         ct.allowed_categories, ct.min_riders, ct.max_riders, ct.created_at, ct.updated_at
ORDER BY ct.team_name;

COMMENT ON VIEW v_team_summary IS 
'Team overview with rider counts, validation status, and vELO spread';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Validate team lineup
CREATE OR REPLACE FUNCTION validate_team_lineup(p_team_id INTEGER)
RETURNS TABLE(
  rider_id INTEGER,
  is_valid BOOLEAN,
  validation_message TEXT
) AS $$
DECLARE
  v_team_type VARCHAR(20);
  v_velo_min INTEGER;
  v_velo_max INTEGER;
  v_allowed_cats TEXT[];
  v_allow_up BOOLEAN;
BEGIN
  -- Get team config
  SELECT competition_type, velo_min_rank, velo_max_rank, allowed_categories, allow_category_up
  INTO v_team_type, v_velo_min, v_velo_max, v_allowed_cats, v_allow_up
  FROM competition_teams
  WHERE id = p_team_id;
  
  IF v_team_type = 'velo' THEN
    -- vELO validation
    RETURN QUERY
    SELECT 
      tl.rider_id,
      (rc.velo_live >= v_velo_min AND rc.velo_live <= v_velo_max) AS is_valid,
      CASE 
        WHEN rc.velo_live < v_velo_min THEN 'vELO rank ' || rc.velo_live || ' below minimum ' || v_velo_min
        WHEN rc.velo_live > v_velo_max THEN 'vELO rank ' || rc.velo_live || ' exceeds maximum ' || v_velo_max
        ELSE 'Valid'
      END AS validation_message
    FROM team_lineups tl
    JOIN v_rider_complete rc ON tl.rider_id = rc.rider_id
    WHERE tl.team_id = p_team_id;
    
  ELSIF v_team_type = 'category' THEN
    -- Category validation
    RETURN QUERY
    SELECT 
      tl.rider_id,
      (rc.category = ANY(v_allowed_cats)) AS is_valid,
      CASE 
        WHEN rc.category = ANY(v_allowed_cats) THEN 'Valid'
        ELSE 'Category ' || rc.category || ' not allowed in this team'
      END AS validation_message
    FROM team_lineups tl
    JOIN v_rider_complete rc ON tl.rider_id = rc.rider_id
    WHERE tl.team_id = p_team_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_team_lineup IS 
'Validates all riders in a team against vELO or category rules';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update timestamps
CREATE OR REPLACE FUNCTION update_team_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER competition_teams_updated
  BEFORE UPDATE ON competition_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_team_timestamp();

CREATE TRIGGER team_lineups_updated
  BEFORE UPDATE ON team_lineups
  FOR EACH ROW
  EXECUTE FUNCTION update_team_timestamp();

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Example: WTRL ZRL Team (Category-based)
INSERT INTO competition_teams (
  team_name, competition_type, competition_name,
  allowed_categories, allow_category_up, min_riders, max_riders
) VALUES (
  'TeamNL ZRL A/B', 'category', 'WTRL ZRL Season 5',
  ARRAY['A', 'B'], true, 4, 6
) ON CONFLICT (team_name) DO NOTHING;

-- Example: Club Ladder Team (vELO-based)
INSERT INTO competition_teams (
  team_name, competition_type, competition_name,
  velo_min_rank, velo_max_rank, velo_max_spread, min_riders, max_riders
) VALUES (
  'TeamNL Ladder 1-2-3', 'velo', 'Club Ladder 2025',
  1, 3, 3, 4, 8
) ON CONFLICT (team_name) DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 010 completed successfully!';
  RAISE NOTICE '   Tables: competition_teams, team_lineups';
  RAISE NOTICE '   Views: v_team_lineups_full, v_team_summary';
  RAISE NOTICE '   Function: validate_team_lineup(team_id)';
  RAISE NOTICE '';
  RAISE NOTICE '🏆 Team Builder ready!';
  RAISE NOTICE '   - Create vELO teams (Club Ladder)';
  RAISE NOTICE '   - Create category teams (WTRL ZRL)';
  RAISE NOTICE '   - Automatic validation on add/update';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Test queries:';
  RAISE NOTICE '   SELECT * FROM v_team_summary;';
  RAISE NOTICE '   SELECT * FROM v_team_lineups_full;';
  RAISE NOTICE '   SELECT * FROM validate_team_lineup(1);';
END $$;
