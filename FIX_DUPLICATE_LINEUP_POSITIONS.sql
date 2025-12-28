-- ============================================================================
-- FIX: Duplicate Lineup Positions
-- ============================================================================
-- Probleem: Meerdere riders hebben dezelfde lineup_position (bijv. 2x nr. 11)
-- Dit veroorzaakt verwarring in de TeamBuilder UI
-- ============================================================================

-- STAP 1: Toon huidige duplicates
SELECT 
  ct.team_name,
  tl.lineup_position,
  COUNT(*) as rider_count,
  STRING_AGG(COALESCE(rc.racing_name, rc.full_name), ', ') as riders
FROM team_lineups tl
JOIN competition_teams ct ON tl.team_id = ct.id
LEFT JOIN v_rider_complete rc ON tl.rider_id = rc.rider_id
WHERE ct.is_active = true
GROUP BY ct.team_name, tl.team_id, tl.lineup_position
HAVING COUNT(*) > 1
ORDER BY ct.team_name, tl.lineup_position;

-- STAP 2: Fix alle lineup positions met correcte sequentiële nummering
-- Gebruikt added_at en id voor consistente volgorde
WITH numbered_riders AS (
  SELECT 
    tl.id,
    tl.team_id,
    tl.rider_id,
    ROW_NUMBER() OVER (
      PARTITION BY tl.team_id 
      ORDER BY 
        tl.added_at ASC,
        tl.id ASC
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
WHERE tl.id = nr.id;

-- STAP 3: Verificatie - Check dat er geen duplicates meer zijn
SELECT 
  ct.team_name,
  COUNT(*) as total_riders,
  MIN(tl.lineup_position) as min_pos,
  MAX(tl.lineup_position) as max_pos,
  COUNT(DISTINCT tl.lineup_position) as unique_positions,
  CASE 
    WHEN COUNT(*) = COUNT(DISTINCT tl.lineup_position) THEN '✅ OK - No duplicates'
    ELSE '❌ ERROR - Still has duplicates!'
  END as status
FROM team_lineups tl
JOIN competition_teams ct ON tl.team_id = ct.id
WHERE ct.is_active = true
GROUP BY tl.team_id, ct.team_name
ORDER BY ct.team_name;

-- STAP 4: Toon finale lineup per team
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

-- Success message
SELECT 
  '✅ Lineup positions fixed! All duplicates removed.' as result,
  COUNT(DISTINCT tl.team_id) as teams_fixed,
  COUNT(*) as total_riders_renumbered
FROM team_lineups tl
JOIN competition_teams ct ON tl.team_id = ct.id
WHERE ct.is_active = true;
