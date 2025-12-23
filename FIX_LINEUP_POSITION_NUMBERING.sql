-- ============================================================================
-- FIX LINEUP POSITION NUMBERING
-- ============================================================================
-- Probleem: Sommige riders in team lineups hebben geen lineup_position of 0
-- Oplossing: Assigneer sequentiële nummering per team
-- ============================================================================

-- STAP 1: Bekijk huidige situatie
-- Run dit eerst om het probleem te zien:
SELECT 
  ct.team_name,
  tl.team_id,
  tl.rider_id,
  COALESCE(rc.racing_name, rc.full_name) as rider_name,
  tl.lineup_position,
  tl.added_at
FROM team_lineups tl
JOIN competition_teams ct ON tl.team_id = ct.id
LEFT JOIN v_rider_complete rc ON tl.rider_id = rc.rider_id
WHERE ct.is_active = true
ORDER BY ct.team_name, tl.added_at;

-- STAP 2: Update lineup_position met correcte sequentiële nummering
-- Dit gebruikt ROW_NUMBER() om elke rider per team een nummer te geven
WITH numbered_riders AS (
  SELECT 
    tl.id,
    tl.team_id,
    ROW_NUMBER() OVER (
      PARTITION BY tl.team_id 
      ORDER BY 
        -- Behoud bestaande volgorde waar mogelijk
        CASE WHEN tl.lineup_position > 0 THEN tl.lineup_position ELSE 999 END,
        tl.added_at
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

-- STAP 3: Verificatie - Check of alle positions nu gevuld zijn
SELECT 
  ct.team_name,
  COUNT(*) as rider_count,
  MIN(tl.lineup_position) as min_pos,
  MAX(tl.lineup_position) as max_pos,
  COUNT(DISTINCT tl.lineup_position) as unique_positions,
  ARRAY_AGG(tl.lineup_position ORDER BY tl.lineup_position) as positions
FROM team_lineups tl
JOIN competition_teams ct ON tl.team_id = ct.id
WHERE ct.is_active = true
GROUP BY tl.team_id, ct.team_name
ORDER BY ct.team_name;

-- STAP 4: (Optioneel) Maak lineup_position NOT NULL voor toekomst
-- Uncomment deze regels als je wilt dat lineup_position verplicht wordt:
-- ALTER TABLE team_lineups 
-- ALTER COLUMN lineup_position SET NOT NULL;

-- ALTER TABLE team_lineups 
-- ALTER COLUMN lineup_position SET DEFAULT 0;

-- STAP 5: Check de view output
SELECT 
  team_name,
  rider_id,
  COALESCE(name, full_name) as rider_name,
  lineup_position,
  category,
  current_velo_rank
FROM v_team_lineups_full
ORDER BY team_name, lineup_position;
