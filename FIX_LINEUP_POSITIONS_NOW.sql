-- ============================================================================
-- URGENT FIX: Lineup Position Numbering
-- ============================================================================
-- Probleem: Bestaande riders hebben geen lineup_position (NULL of 0)
-- Nieuwe riders krijgen wel een nummer
-- Run dit in Supabase SQL Editor om alle positions te fixen
-- ============================================================================

-- Fix alle lineup positions met sequentiële nummering per team
WITH numbered_riders AS (
  SELECT 
    tl.id,
    tl.team_id,
    tl.rider_id,
    ROW_NUMBER() OVER (
      PARTITION BY tl.team_id 
      ORDER BY 
        -- Behoud bestaande volgorde waar mogelijk
        CASE 
          WHEN tl.lineup_position IS NOT NULL AND tl.lineup_position > 0 
          THEN tl.lineup_position 
          ELSE 999 
        END,
        tl.added_at,
        tl.id
    ) AS new_position
  FROM team_lineups tl
  JOIN competition_teams ct ON tl.team_id = ct.id
  WHERE ct.is_active = true
)
UPDATE team_lineups tl
SET 
  lineup_position = nr.new_position,
  updated_at = NOW()
FROM numbered_riders nr
WHERE tl.id = nr.id
  AND (tl.lineup_position IS NULL OR tl.lineup_position != nr.new_position);

-- Verificatie
SELECT 
  ct.team_name,
  tl.lineup_position,
  COALESCE(rc.racing_name, rc.full_name) as rider_name,
  tl.added_at
FROM team_lineups tl
JOIN competition_teams ct ON tl.team_id = ct.id
LEFT JOIN v_rider_complete rc ON tl.rider_id = rc.rider_id
WHERE ct.is_active = true
ORDER BY ct.team_name, tl.lineup_position;

-- Resultaat message
SELECT 
  '✅ Lineup positions fixed!' as status,
  COUNT(*) as total_riders_updated,
  COUNT(DISTINCT team_id) as teams_updated
FROM team_lineups tl
JOIN competition_teams ct ON tl.team_id = ct.id
WHERE ct.is_active = true;
