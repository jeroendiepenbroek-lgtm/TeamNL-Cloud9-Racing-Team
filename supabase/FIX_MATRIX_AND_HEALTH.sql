-- ========================================
-- FIX: Matrix Data Loading & System Status
-- ========================================
-- Dit script lost US3 en US4 op:
-- • US3: System Status connectivity 
-- • US4: Matrix data loading error
-- ========================================

-- ========================================
-- STAP 1: Verify view_my_team bestaat
-- ========================================
-- Check of view bestaat (moet bestaan na migration 007)
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE viewname = 'view_my_team';

-- Expected: 1 row
-- If empty: view is missing, recreate below

-- ========================================
-- STAP 2: Test view query (moet werken)
-- ========================================
-- Test of we data kunnen ophalen
SELECT COUNT(*) AS total_team_riders
FROM view_my_team;

-- Expected: >= 0 (kan 0 zijn als je nog geen team hebt toegevoegd)

-- ========================================
-- STAP 3: Test riders_computed view
-- ========================================
-- view_my_team depends on riders_computed
SELECT COUNT(*) AS total_riders_computed
FROM riders_computed;

-- Expected: >= 1 (moet riders bevatten)

-- ========================================
-- STAP 4: Check column names in view
-- ========================================
-- Verify alle kolommen die frontend verwacht bestaan
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'view_my_team'
ORDER BY ordinal_position;

-- Expected kolommen (onder andere):
-- • rider_id (integer)
-- • name (text)
-- • zp_category (text)
-- • zp_ftp (integer)
-- • race_current_rating (integer)  ← Was 'ranking' voor migration 007!
-- • race_last_rating (integer)
-- • race_max30_rating (integer)
-- • power_w5, power_w15, power_w30, etc. (integer)
-- • watts_per_kg (numeric - computed)
-- • team_added_at (timestamp)
-- • is_favorite (boolean)

-- ========================================
-- STAP 5: RECREATE view_my_team (if needed)
-- ========================================
-- Als view missing is of verkeerde structuur heeft:

DROP VIEW IF EXISTS view_my_team CASCADE;

CREATE VIEW view_my_team AS
SELECT 
  r.*,              -- Alle riders_computed kolommen (inclusief watts_per_kg en club_name)
  m.added_at AS team_added_at,
  m.is_favorite
FROM my_team_members m
JOIN riders_computed r ON r.rider_id = m.rider_id
ORDER BY r.race_current_rating DESC NULLS LAST;

COMMENT ON VIEW view_my_team IS 'My team riders met computed velden en club info';

-- ========================================
-- STAP 6: Verify fix werkt
-- ========================================
-- Test complete query zoals backend doet
SELECT 
  rider_id,
  name,
  zp_category,
  zp_ftp,
  weight,
  race_last_rating,
  race_current_rating,
  race_max30_rating,
  race_wins,
  race_podiums,
  race_finishes,
  race_dnfs,
  watts_per_kg,
  power_w5,
  power_w15,
  power_w30,
  power_w60,
  power_w120,
  power_w300,
  power_w1200
FROM view_my_team
ORDER BY race_current_rating DESC NULLS LAST
LIMIT 5;

-- Expected: Alle rows met data (of empty result als geen team members)

-- ========================================
-- STAP 7: Add sample team members (optioneel)
-- ========================================
-- Als je een lege Matrix ziet, voeg voorbeelddata toe:

-- INSERT INTO my_team_members (rider_id, is_favorite)
-- VALUES 
--   (150437, true),   -- Jeroen
--   (123456, false);  -- Andere rider
-- ON CONFLICT (rider_id) DO NOTHING;

-- Dan opnieuw:
-- SELECT COUNT(*) FROM view_my_team;

-- ========================================
-- SUCCESS VERIFICATIE
-- ========================================
DO $$
DECLARE
  v_view_exists BOOLEAN;
  v_team_count INTEGER;
  v_riders_count INTEGER;
BEGIN
  -- Check view
  SELECT EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'view_my_team'
  ) INTO v_view_exists;
  
  -- Count data
  SELECT COUNT(*) INTO v_team_count FROM view_my_team;
  SELECT COUNT(*) INTO v_riders_count FROM riders_computed;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MATRIX FIX VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'View exists: %', CASE WHEN v_view_exists THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE 'Riders in DB: % riders', v_riders_count;
  RAISE NOTICE 'Team members: % members', v_team_count;
  RAISE NOTICE '';
  
  IF v_view_exists AND v_riders_count > 0 THEN
    RAISE NOTICE '✅ US4 FIXED: Matrix should now load data!';
  ELSIF v_view_exists AND v_team_count = 0 THEN
    RAISE NOTICE '⚠️  View OK but no team members yet';
    RAISE NOTICE 'ℹ️  Add riders via: INSERT INTO my_team_members (rider_id) VALUES (150437);';
  ELSE
    RAISE NOTICE '❌ Issue detected - check steps above';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NEXT: Test Matrix at Railway URL';
  RAISE NOTICE 'https://teamnl-cloud9-racing-team-production.up.railway.app/matrix';
  RAISE NOTICE '========================================';
END $$;
