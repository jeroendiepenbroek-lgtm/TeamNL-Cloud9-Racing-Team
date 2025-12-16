-- ============================================================================
-- TEAM BUILDER - SUPABASE MIGRATION
-- Run this in Supabase SQL Editor to create Team Builder tables
-- ============================================================================

BEGIN;

-- Create competition_teams table
CREATE TABLE IF NOT EXISTS public.competition_teams (
  id SERIAL PRIMARY KEY,
  team_name VARCHAR(100) NOT NULL UNIQUE,
  competition_type VARCHAR(20) NOT NULL CHECK (competition_type IN ('velo', 'category')),
  competition_name VARCHAR(100),
  velo_min_rank INTEGER,
  velo_max_rank INTEGER,
  velo_max_spread INTEGER DEFAULT 3,
  allowed_categories TEXT[],
  allow_category_up BOOLEAN DEFAULT true,
  min_riders INTEGER DEFAULT 1,
  max_riders INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create team_lineups table
CREATE TABLE IF NOT EXISTS public.team_lineups (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES public.competition_teams(id) ON DELETE CASCADE,
  rider_id INTEGER NOT NULL,
  lineup_position INTEGER,
  rider_category VARCHAR(10),
  rider_velo_rank INTEGER,
  is_valid BOOLEAN DEFAULT true,
  validation_warning TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT team_rider_unique UNIQUE(team_id, rider_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_competition_teams_type ON public.competition_teams(competition_type);
CREATE INDEX IF NOT EXISTS idx_competition_teams_active ON public.competition_teams(is_active);
CREATE INDEX IF NOT EXISTS idx_team_lineups_team ON public.team_lineups(team_id);
CREATE INDEX IF NOT EXISTS idx_team_lineups_rider ON public.team_lineups(rider_id);
CREATE INDEX IF NOT EXISTS idx_team_lineups_valid ON public.team_lineups(is_valid);

-- Create view: Team lineup with rider details
CREATE OR REPLACE VIEW public.v_team_lineups_full AS
SELECT 
  tl.id AS lineup_id,
  tl.team_id,
  ct.team_name,
  ct.competition_type,
  ct.competition_name,
  ct.velo_min_rank,
  ct.velo_max_rank,
  ct.velo_max_spread,
  ct.allowed_categories,
  ct.allow_category_up,
  ct.min_riders,
  ct.max_riders,
  tl.rider_id,
  tl.lineup_position,
  rc.racing_name AS name,
  rc.full_name,
  COALESCE(rc.zwiftracing_category, rc.zwift_official_category) AS category,
  rc.velo_live AS current_velo_rank,
  rc.velo_30day,
  rc.country_alpha3,
  rc.avatar_url,
  rc.phenotype,
  rc.zwift_official_racing_score,
  rc.ftp_watts,
  rc.weight_kg,
  tl.rider_category AS category_at_add,
  tl.rider_velo_rank AS velo_rank_at_add,
  tl.is_valid,
  tl.validation_warning,
  tl.added_at,
  tl.updated_at,
  ct.created_at AS team_created_at
FROM public.team_lineups tl
JOIN public.competition_teams ct ON tl.team_id = ct.id
LEFT JOIN public.v_rider_complete rc ON tl.rider_id = rc.rider_id
WHERE ct.is_active = true
ORDER BY ct.team_name, tl.lineup_position NULLS LAST;

-- Create view: Team summary with rider counts
CREATE OR REPLACE VIEW public.v_team_summary AS
SELECT 
  ct.id AS team_id,
  ct.team_name,
  ct.competition_type,
  ct.competition_name,
  ct.is_active,
  ct.velo_min_rank,
  ct.velo_max_rank,
  ct.velo_max_spread,
  ct.allowed_categories,
  ct.min_riders,
  ct.max_riders,
  COUNT(tl.rider_id) AS current_riders,
  COUNT(tl.rider_id) FILTER (WHERE tl.is_valid = true) AS valid_riders,
  COUNT(tl.rider_id) FILTER (WHERE tl.is_valid = false) AS invalid_riders,
  CASE 
    WHEN ct.competition_type = 'velo' THEN
      MAX(rc.velo_live) - MIN(rc.velo_live)
    ELSE NULL
  END AS current_velo_spread,
  CASE 
    WHEN COUNT(tl.rider_id) < ct.min_riders THEN 'incomplete'
    WHEN COUNT(tl.rider_id) > ct.max_riders THEN 'overfilled'
    WHEN COUNT(tl.rider_id) FILTER (WHERE tl.is_valid = false) > 0 THEN 'warning'
    ELSE 'ready'
  END AS team_status,
  ct.created_at,
  ct.updated_at
FROM public.competition_teams ct
LEFT JOIN public.team_lineups tl ON ct.id = tl.team_id
LEFT JOIN public.v_rider_complete rc ON tl.rider_id = rc.rider_id
WHERE ct.is_active = true
GROUP BY ct.id
ORDER BY ct.team_name;

-- Create validation function
CREATE OR REPLACE FUNCTION public.validate_team_lineup(p_team_id INTEGER)
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
BEGIN
  SELECT competition_type, velo_min_rank, velo_max_rank, allowed_categories
  INTO v_team_type, v_velo_min, v_velo_max, v_allowed_cats
  FROM public.competition_teams
  WHERE id = p_team_id;
  
  IF v_team_type = 'velo' THEN
    RETURN QUERY
    SELECT 
      tl.rider_id,
      (rc.velo_live >= v_velo_min AND rc.velo_live <= v_velo_max) AS is_valid,
      CASE 
        WHEN rc.velo_live < v_velo_min THEN 'vELO rank ' || rc.velo_live || ' below minimum ' || v_velo_min
        WHEN rc.velo_live > v_velo_max THEN 'vELO rank ' || rc.velo_live || ' exceeds maximum ' || v_velo_max
        ELSE 'Valid'
      END AS validation_message
    FROM public.team_lineups tl
    JOIN public.v_rider_complete rc ON tl.rider_id = rc.rider_id
    WHERE tl.team_id = p_team_id;
    
  ELSIF v_team_type = 'category' THEN
    RETURN QUERY
    SELECT 
      tl.rider_id,
      (COALESCE(rc.zwiftracing_category, rc.zwift_official_category) = ANY(v_allowed_cats)) AS is_valid,
      CASE 
        WHEN COALESCE(rc.zwiftracing_category, rc.zwift_official_category) = ANY(v_allowed_cats) THEN 'Valid'
        ELSE 'Category ' || COALESCE(rc.zwiftracing_category, rc.zwift_official_category) || ' not allowed'
      END AS validation_message
    FROM public.team_lineups tl
    JOIN public.v_rider_complete rc ON tl.rider_id = rc.rider_id
    WHERE tl.team_id = p_team_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_team_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS competition_teams_updated ON public.competition_teams;
CREATE TRIGGER competition_teams_updated
  BEFORE UPDATE ON public.competition_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_team_timestamp();

DROP TRIGGER IF EXISTS team_lineups_updated ON public.team_lineups;
CREATE TRIGGER team_lineups_updated
  BEFORE UPDATE ON public.team_lineups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_team_timestamp();

-- Insert sample teams
INSERT INTO public.competition_teams (
  team_name, competition_type, competition_name,
  allowed_categories, allow_category_up, min_riders, max_riders
) VALUES (
  'TeamNL ZRL A/B', 'category', 'WTRL ZRL Season 5',
  ARRAY['A', 'B'], true, 4, 6
) ON CONFLICT (team_name) DO NOTHING;

INSERT INTO public.competition_teams (
  team_name, competition_type, competition_name,
  velo_min_rank, velo_max_rank, velo_max_spread, min_riders, max_riders
) VALUES (
  'TeamNL Ladder 1-2-3', 'velo', 'Club Ladder 2025',
  1, 3, 3, 4, 8
) ON CONFLICT (team_name) DO NOTHING;

COMMIT;

-- Verification
SELECT '✅ Team Builder tables created!' AS status;
SELECT 'Tables: competition_teams, team_lineups' AS info;
SELECT 'Views: v_team_summary, v_team_lineups_full' AS info;
SELECT 'Function: validate_team_lineup(team_id)' AS info;

-- Test query
SELECT * FROM public.v_team_summary;
