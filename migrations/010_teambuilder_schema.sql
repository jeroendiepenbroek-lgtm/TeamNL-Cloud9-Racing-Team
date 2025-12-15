-- ============================================================================
-- TeamBuilder Database Schema
-- ============================================================================
-- Voor het creëren van competitie teams met vELO of Category validatie
-- Ondersteunt WTRL ZRL (Category) en Club Ladder (vELO spread)
-- ============================================================================

-- Teams Table
-- Bewaar team configuratie en metadata
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  
  -- Competitie type
  competition_type VARCHAR(20) NOT NULL CHECK (competition_type IN ('velo', 'category')),
  competition_name VARCHAR(100), -- e.g. "WTRL ZRL Season 5", "Club Ladder 2025"
  
  -- Validatie regels
  validation_rules JSONB NOT NULL DEFAULT '{}',
  /* Example vELO rules:
  {
    "velo_min_rank": 1,
    "velo_max_rank": 3,
    "velo_max_spread": 3,
    "allow_higher_velo": false
  }
  */
  /* Example Category rules:
  {
    "allowed_categories": ["A", "B", "C"],
    "allow_racing_up": true,
    "min_category": "C",
    "max_category": "A"
  }
  */
  
  -- Status & Metadata
  is_active BOOLEAN DEFAULT true,
  season VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  
  -- Stats
  member_count INTEGER DEFAULT 0,
  avg_velo_rank NUMERIC(3,1),
  avg_zp_power INTEGER
);

CREATE INDEX idx_teams_competition ON teams(competition_type, is_active);
CREATE INDEX idx_teams_name ON teams(name);

COMMENT ON TABLE teams IS 'Competition teams voor WTRL ZRL, Club Ladder, etc.';
COMMENT ON COLUMN teams.competition_type IS '"velo" voor Club Ladder, "category" voor WTRL ZRL';
COMMENT ON COLUMN teams.validation_rules IS 'JSON rules voor team validation (vELO spread, category restrictions)';


-- Team Lineup Table
-- Koppel riders aan teams met position tracking
CREATE TABLE IF NOT EXISTS team_lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  rider_id INTEGER NOT NULL,
  
  -- Position in lineup (voor drag & drop ordering)
  position INTEGER NOT NULL DEFAULT 0,
  
  -- Rider data snapshot (at time of adding)
  velo_rank INTEGER,
  velo_30day INTEGER,
  category VARCHAR(10),
  zp_power INTEGER,
  rider_name VARCHAR(200),
  
  -- Status tracking
  is_captain BOOLEAN DEFAULT false,
  is_substitute BOOLEAN DEFAULT false,
  validation_warnings JSONB DEFAULT '[]',
  /* Example warnings:
  [
    {"type": "velo_spread_violation", "message": "vELO rank outside allowed spread"},
    {"type": "category_too_low", "message": "Category below minimum requirement"}
  ]
  */
  
  -- Metadata
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by VARCHAR(100),
  notes TEXT,
  
  UNIQUE(team_id, rider_id),
  FOREIGN KEY (rider_id) REFERENCES team_roster(rider_id) ON DELETE CASCADE
);

CREATE INDEX idx_team_lineups_team ON team_lineups(team_id, position);
CREATE INDEX idx_team_lineups_rider ON team_lineups(rider_id);

COMMENT ON TABLE team_lineups IS 'Riders assigned to competition teams with validation tracking';
COMMENT ON COLUMN team_lineups.position IS 'Display order in team lineup (0-based)';
COMMENT ON COLUMN team_lineups.validation_warnings IS 'Array of validation issues (e.g. vELO spread violations)';


-- Team Validation Function
-- Check if team lineup complies with competition rules
CREATE OR REPLACE FUNCTION validate_team_lineup(p_team_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_team RECORD;
  v_lineup RECORD;
  v_validation JSONB := '{"valid": true, "errors": [], "warnings": []}'::JSONB;
  v_velo_ranks INTEGER[];
  v_velo_spread INTEGER;
  v_categories TEXT[];
BEGIN
  -- Get team config
  SELECT * INTO v_team FROM teams WHERE id = p_team_id;
  
  IF NOT FOUND THEN
    RETURN '{"valid": false, "errors": ["Team not found"]}'::JSONB;
  END IF;
  
  -- Get lineup riders
  IF v_team.competition_type = 'velo' THEN
    -- vELO validation (Club Ladder)
    SELECT array_agg(velo_rank ORDER BY velo_rank) 
    INTO v_velo_ranks
    FROM team_lineups 
    WHERE team_id = p_team_id AND velo_rank IS NOT NULL;
    
    IF array_length(v_velo_ranks, 1) > 0 THEN
      v_velo_spread := v_velo_ranks[array_length(v_velo_ranks, 1)] - v_velo_ranks[1];
      
      -- Check max spread (default 3 voor Club Ladder)
      IF v_velo_spread > COALESCE((v_team.validation_rules->>'velo_max_spread')::INTEGER, 3) THEN
        v_validation := jsonb_set(v_validation, '{valid}', 'false'::JSONB);
        v_validation := jsonb_set(
          v_validation, 
          '{errors}', 
          v_validation->'errors' || jsonb_build_array(
            format('vELO spread too large: %s (max %s)', 
              v_velo_spread, 
              COALESCE((v_team.validation_rules->>'velo_max_spread')::INTEGER, 3)
            )
          )
        );
      END IF;
      
      -- Add spread info
      v_validation := jsonb_set(
        v_validation,
        '{info}',
        jsonb_build_object(
          'velo_spread', v_velo_spread,
          'velo_range', format('%s-%s', v_velo_ranks[1], v_velo_ranks[array_length(v_velo_ranks, 1)])
        )
      );
    END IF;
    
  ELSIF v_team.competition_type = 'category' THEN
    -- Category validation (WTRL ZRL)
    SELECT array_agg(DISTINCT category) 
    INTO v_categories
    FROM team_lineups 
    WHERE team_id = p_team_id AND category IS NOT NULL;
    
    -- Check if racing down (not allowed in WTRL)
    IF (v_team.validation_rules->>'allow_racing_down')::BOOLEAN = false THEN
      -- Logic voor "mag niet lager rijden" check
      -- Dit kan per rider gecheckt worden bij toevoegen
      NULL;
    END IF;
    
    v_validation := jsonb_set(
      v_validation,
      '{info}',
      jsonb_build_object('categories', v_categories)
    );
  END IF;
  
  RETURN v_validation;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_team_lineup IS 'Validate team against competition rules (vELO spread, categories)';


-- View: Team Overview met Stats
CREATE OR REPLACE VIEW v_teams_overview AS
SELECT 
  t.id,
  t.name,
  t.competition_type,
  t.competition_name,
  t.validation_rules,
  t.is_active,
  t.season,
  t.created_at,
  
  -- Member count
  COUNT(tl.id) AS member_count,
  
  -- vELO stats
  ROUND(AVG(tl.velo_30day)::NUMERIC, 0) AS avg_velo_30day,
  MIN(tl.velo_rank) AS min_velo_rank,
  MAX(tl.velo_rank) AS max_velo_rank,
  CASE 
    WHEN MAX(tl.velo_rank) IS NOT NULL AND MIN(tl.velo_rank) IS NOT NULL
    THEN MAX(tl.velo_rank) - MIN(tl.velo_rank)
    ELSE NULL
  END AS velo_spread,
  
  -- Category stats
  array_agg(DISTINCT tl.category) FILTER (WHERE tl.category IS NOT NULL) AS categories,
  
  -- Power stats
  ROUND(AVG(tl.zp_power)::NUMERIC, 0) AS avg_zp_power,
  
  -- Validation
  validate_team_lineup(t.id) AS validation_status,
  
  -- Captain
  (SELECT rider_name FROM team_lineups WHERE team_id = t.id AND is_captain = true LIMIT 1) AS captain_name
  
FROM teams t
LEFT JOIN team_lineups tl ON t.id = tl.team_id
GROUP BY t.id;

COMMENT ON VIEW v_teams_overview IS 'Team overview met statistieken en validation status';


-- View: Team Lineup Detail
CREATE OR REPLACE VIEW v_team_lineups_detail AS
SELECT 
  tl.id AS lineup_id,
  tl.team_id,
  t.name AS team_name,
  t.competition_type,
  
  -- Rider info
  tl.rider_id,
  tl.rider_name,
  tl.position,
  tl.is_captain,
  tl.is_substitute,
  
  -- Current rider stats (live from v_rider_complete)
  rc.velo_live AS current_velo_live,
  rc.velo_30day AS current_velo_30day,
  rc.category AS current_category,
  rc.zp_power AS current_zp_power,
  rc.full_name AS current_full_name,
  rc.avatar_url,
  
  -- Snapshot stats (at time of adding)
  tl.velo_rank AS snapshot_velo_rank,
  tl.velo_30day AS snapshot_velo_30day,
  tl.category AS snapshot_category,
  tl.zp_power AS snapshot_zp_power,
  
  -- Changes sinds toevoegen
  CASE 
    WHEN tl.velo_rank IS NOT NULL AND rc.velo_live IS NOT NULL
    THEN rc.velo_live - tl.velo_rank
    ELSE NULL
  END AS velo_rank_change,
  
  -- Validation
  tl.validation_warnings,
  tl.added_at,
  tl.notes
  
FROM team_lineups tl
JOIN teams t ON tl.team_id = t.id
LEFT JOIN v_rider_complete rc ON tl.rider_id = rc.rider_id
ORDER BY tl.team_id, tl.position;

COMMENT ON VIEW v_team_lineups_detail IS 'Detailed team lineup met current vs snapshot comparison';


-- Trigger: Update team stats on lineup change
CREATE OR REPLACE FUNCTION update_team_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE teams SET
    member_count = (SELECT COUNT(*) FROM team_lineups WHERE team_id = COALESCE(NEW.team_id, OLD.team_id)),
    avg_velo_rank = (SELECT ROUND(AVG(velo_rank)::NUMERIC, 1) FROM team_lineups WHERE team_id = COALESCE(NEW.team_id, OLD.team_id)),
    avg_zp_power = (SELECT ROUND(AVG(zp_power)::NUMERIC, 0) FROM team_lineups WHERE team_id = COALESCE(NEW.team_id, OLD.team_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.team_id, OLD.team_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_team_stats
AFTER INSERT OR UPDATE OR DELETE ON team_lineups
FOR EACH ROW EXECUTE FUNCTION update_team_stats();


-- Grant permissions
GRANT SELECT ON teams TO anon, authenticated;
GRANT SELECT ON team_lineups TO anon, authenticated;
GRANT SELECT ON v_teams_overview TO anon, authenticated;
GRANT SELECT ON v_team_lineups_detail TO anon, authenticated;

-- Admin permissions
GRANT ALL ON teams TO service_role;
GRANT ALL ON team_lineups TO service_role;


-- ============================================================================
-- Example Data & Usage
-- ============================================================================

-- Example 1: WTRL ZRL Team (Category based)
/*
INSERT INTO teams (name, competition_type, competition_name, validation_rules, season) VALUES
('Cloud9 Racing A', 'category', 'WTRL ZRL Season 5', 
 '{"allowed_categories": ["A"], "allow_racing_up": true, "min_category": "A", "max_category": "A+"}'::JSONB,
 '2025-Q1');

-- Add riders (ze mogen hoger rijden, niet lager dan A)
INSERT INTO team_lineups (team_id, rider_id, velo_rank, category, zp_power, rider_name, position)
SELECT 
  (SELECT id FROM teams WHERE name = 'Cloud9 Racing A'),
  rider_id, velo_live, category, zp_power, full_name, 
  ROW_NUMBER() OVER (ORDER BY zp_power DESC) - 1
FROM v_rider_complete 
WHERE category IN ('A', 'A+') 
LIMIT 6;
*/

-- Example 2: Club Ladder Team (vELO based, max spread 3)
/*
INSERT INTO teams (name, competition_type, competition_name, validation_rules, season) VALUES
('Cloud9 Ladder Team 1', 'velo', 'Club Ladder 2025', 
 '{"velo_min_rank": 1, "velo_max_rank": 3, "velo_max_spread": 3}'::JSONB,
 '2025');

-- Add riders (vELO ranks 1-3, max spread 3)
INSERT INTO team_lineups (team_id, rider_id, velo_rank, velo_30day, category, zp_power, rider_name, position)
SELECT 
  (SELECT id FROM teams WHERE name = 'Cloud9 Ladder Team 1'),
  rider_id, velo_live, velo_30day, category, zp_power, full_name,
  ROW_NUMBER() OVER (ORDER BY velo_live) - 1
FROM v_rider_complete 
WHERE velo_live BETWEEN 1 AND 3
LIMIT 6;
*/

-- Test validation
-- SELECT validate_team_lineup((SELECT id FROM teams WHERE name = 'Cloud9 Ladder Team 1'));
