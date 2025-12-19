-- ============================================================================
-- CLEANUP: Verwijder dubbele rider_id's uit tabellen
-- ============================================================================
-- Probleem: Dubbele riders in team_roster of team_lineups
-- Oplossing: Behoud alleen de meest recente versie per rider
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '🧹 Cleanup dubbele riders...';
END $$;

-- ============================================================================
-- STAP 1: Check en toon duplicaten
-- ============================================================================

DO $$ 
DECLARE
  v_roster_dupes INTEGER;
  v_lineup_dupes INTEGER;
BEGIN
  -- Count duplicates in team_roster
  SELECT COUNT(*) INTO v_roster_dupes
  FROM (
    SELECT rider_id
    FROM team_roster
    GROUP BY rider_id
    HAVING COUNT(*) > 1
  ) dupes;
  
  -- Count duplicates in team_lineups (same rider, same team)
  SELECT COUNT(*) INTO v_lineup_dupes
  FROM (
    SELECT rider_id, team_id
    FROM team_lineups
    GROUP BY rider_id, team_id
    HAVING COUNT(*) > 1
  ) dupes;
  
  RAISE NOTICE '📊 Gevonden duplicaten:';
  RAISE NOTICE '   team_roster: % dubbele rider_ids', v_roster_dupes;
  RAISE NOTICE '   team_lineups: % dubbele combinaties', v_lineup_dupes;
END $$;

-- ============================================================================
-- STAP 2: Cleanup team_roster - behoud meest recente
-- ============================================================================

WITH duplicates AS (
  SELECT 
    rider_id,
    id,
    added_at,
    ROW_NUMBER() OVER (
      PARTITION BY rider_id 
      ORDER BY added_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM team_roster
)
DELETE FROM team_roster
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- ============================================================================
-- STAP 3: Cleanup team_lineups - behoud meest recente per team
-- ============================================================================

WITH duplicates AS (
  SELECT 
    id,
    rider_id,
    team_id,
    added_at,
    ROW_NUMBER() OVER (
      PARTITION BY rider_id, team_id 
      ORDER BY added_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM team_lineups
)
DELETE FROM team_lineups
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- ============================================================================
-- STAP 4: Verificatie
-- ============================================================================

DO $$ 
DECLARE
  v_roster_count INTEGER;
  v_lineup_count INTEGER;
  v_roster_dupes INTEGER;
  v_lineup_dupes INTEGER;
BEGIN
  -- Count totals
  SELECT COUNT(*) INTO v_roster_count FROM team_roster;
  SELECT COUNT(*) INTO v_lineup_count FROM team_lineups;
  
  -- Check remaining duplicates
  SELECT COUNT(*) INTO v_roster_dupes
  FROM (
    SELECT rider_id
    FROM team_roster
    GROUP BY rider_id
    HAVING COUNT(*) > 1
  ) dupes;
  
  SELECT COUNT(*) INTO v_lineup_dupes
  FROM (
    SELECT rider_id, team_id
    FROM team_lineups
    GROUP BY rider_id, team_id
    HAVING COUNT(*) > 1
  ) dupes;
  
  RAISE NOTICE '✅ Cleanup voltooid';
  RAISE NOTICE '   team_roster: % riders (% duplicaten over)', v_roster_count, v_roster_dupes;
  RAISE NOTICE '   team_lineups: % assignments (% duplicaten over)', v_lineup_count, v_lineup_dupes;
  
  IF v_roster_dupes > 0 OR v_lineup_dupes > 0 THEN
    RAISE WARNING '⚠️  Er zijn nog duplicaten over! Check handmatig.';
  END IF;
END $$;

-- ============================================================================
-- OPTIONEEL: Toon details van overgebleven duplicaten
-- ============================================================================

-- Uncomment deze queries als je details wilt zien:
/*
SELECT 'team_roster duplicates:' as table_name;
SELECT 
  rider_id, 
  COUNT(*) as count,
  STRING_AGG(id::TEXT, ', ') as ids,
  MIN(added_at) as first_added,
  MAX(added_at) as last_added
FROM team_roster
GROUP BY rider_id
HAVING COUNT(*) > 1;

SELECT 'team_lineups duplicates:' as table_name;
SELECT 
  rider_id,
  team_id,
  COUNT(*) as count,
  STRING_AGG(id::TEXT, ', ') as ids,
  MIN(added_at) as first_added,
  MAX(added_at) as last_added
FROM team_lineups
GROUP BY rider_id, team_id
HAVING COUNT(*) > 1;
*/
