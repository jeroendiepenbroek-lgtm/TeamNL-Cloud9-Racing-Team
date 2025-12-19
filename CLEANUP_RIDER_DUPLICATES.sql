-- ============================================================================
-- CLEANUP: Verwijder dubbele rider_id's uit API brontabellen
-- ============================================================================
-- Probleem: Dubbele rider_id's in v_rider_complete door duplicaten in brontabellen
-- Oplossing: Behoud alleen de meest recente versie per rider in elke brontabel
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '🧹 Cleanup dubbele riders in API brontabellen...';
END $$;

-- ============================================================================
-- STAP 1: Check en toon duplicaten
-- ============================================================================

DO $$ 
DECLARE
  v_zwift_dupes INTEGER;
  v_racing_dupes INTEGER;
  v_view_total INTEGER;
  v_view_unique INTEGER;
BEGIN
  -- Count duplicates in api_zwift_api_profiles
  SELECT COUNT(*) INTO v_zwift_dupes
  FROM (
    SELECT rider_id
    FROM api_zwift_api_profiles
    GROUP BY rider_id
    HAVING COUNT(*) > 1
  ) dupes;
  
  -- Count duplicates in api_zwiftracing_riders
  SELECT COUNT(*) INTO v_racing_dupes
  FROM (
    SELECT rider_id
    FROM api_zwiftracing_riders
    GROUP BY rider_id
    HAVING COUNT(*) > 1
  ) dupes;
  
  -- Check view totals
  SELECT COUNT(*) INTO v_view_total FROM v_rider_complete;
  SELECT COUNT(DISTINCT rider_id) INTO v_view_unique FROM v_rider_complete;
  
  RAISE NOTICE '📊 Gevonden duplicaten:';
  RAISE NOTICE '   api_zwift_api_profiles: % dubbele rider_ids', v_zwift_dupes;
  RAISE NOTICE '   api_zwiftracing_riders: % dubbele rider_ids', v_racing_dupes;
  RAISE NOTICE '   v_rider_complete: % total rows, % unique rider_ids', v_view_total, v_view_unique;
  RAISE NOTICE '   Duplicaten in view: %', v_view_total - v_view_unique;
END $$;

-- ============================================================================
-- STAP 2: Cleanup api_zwift_api_profiles - behoud meest recente
-- ============================================================================

WITH duplicates AS (
  SELECT 
    rider_id,
    id,
    fetched_at,
    ROW_NUMBER() OVER (
      PARTITION BY rider_id 
      ORDER BY fetched_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM api_zwift_api_profiles
)
DELETE FROM api_zwift_api_profiles
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- ============================================================================
-- STAP 3: Cleanup api_zwiftracing_riders - behoud meest recente
-- ============================================================================

WITH duplicates AS (
  SELECT 
    rider_id,
    id,
    fetched_at,
    ROW_NUMBER() OVER (
      PARTITION BY rider_id 
      ORDER BY fetched_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM api_zwiftracing_riders
)
DELETE FROM api_zwiftracing_riders
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- ============================================================================
-- STAP 4: Verificatie
-- ============================================================================

DO $$ 
DECLARE
  v_zwift_count INTEGER;
  v_racing_count INTEGER;
  v_zwift_dupes INTEGER;
  v_racing_dupes INTEGER;
  v_view_total INTEGER;
  v_view_unique INTEGER;
BEGIN
  -- Count totals
  SELECT COUNT(*) INTO v_zwift_count FROM api_zwift_api_profiles;
  SELECT COUNT(*) INTO v_racing_count FROM api_zwiftracing_riders;
  
  -- Check remaining duplicates in source tables
  SELECT COUNT(*) INTO v_zwift_dupes
  FROM (
    SELECT rider_id
    FROM api_zwift_api_profiles
    GROUP BY rider_id
    HAVING COUNT(*) > 1
  ) dupes;
  
  SELECT COUNT(*) INTO v_racing_dupes
  FROM (
    SELECT rider_id
    FROM api_zwiftracing_riders
    GROUP BY rider_id
    HAVING COUNT(*) > 1
  ) dupes;
  
  -- Check view
  SELECT COUNT(*) INTO v_view_total FROM v_rider_complete;
  SELECT COUNT(DISTINCT rider_id) INTO v_view_unique FROM v_rider_complete;
  
  RAISE NOTICE '✅ Cleanup voltooid';
  RAISE NOTICE '   api_zwift_api_profiles: % riders (% duplicaten over)', v_zwift_count, v_zwift_dupes;
  RAISE NOTICE '   api_zwiftracing_riders: % riders (% duplicaten over)', v_racing_count, v_racing_dupes;
  RAISE NOTICE '   v_rider_complete: % total rows, % unique rider_ids', v_view_total, v_view_unique;
  
  IF v_zwift_dupes > 0 OR v_racing_dupes > 0 THEN
    RAISE WARNING '⚠️  Er zijn nog duplicaten in brontabellen!';
  END IF;
  
  IF v_view_total > v_view_unique THEN
    RAISE WARNING '⚠️  v_rider_complete heeft nog % dubbele rows!', v_view_total - v_view_unique;
  ELSE
    RAISE NOTICE '✅ v_rider_complete heeft geen duplicaten meer!';
  END IF;
END $$;

-- ============================================================================
-- OPTIONEEL: Toon details van overgebleven duplicaten
-- ============================================================================

-- Uncomment deze queries als je details wilt zien:
/*
SELECT 'api_zwift_api_profiles duplicates:' as source;
SELECT 
  rider_id, 
  COUNT(*) as count,
  STRING_AGG(id::TEXT, ', ') as ids,
  MIN(fetched_at) as first_fetch,
  MAX(fetched_at) as last_fetch
FROM api_zwift_api_profiles
GROUP BY rider_id
HAVING COUNT(*) > 1;

SELECT 'api_zwiftracing_riders duplicates:' as source;
SELECT 
  rider_id,
  COUNT(*) as count,
  STRING_AGG(id::TEXT, ', ') as ids,
  MIN(fetched_at) as first_fetch,
  MAX(fetched_at) as last_fetch
FROM api_zwiftracing_riders
GROUP BY rider_id
HAVING COUNT(*) > 1;

SELECT 'v_rider_complete duplicate rider_ids:' as view_check;
SELECT 
  rider_id,
  full_name,
  COUNT(*) as appearances
FROM v_rider_complete
GROUP BY rider_id, full_name
HAVING COUNT(*) > 1;
*/
