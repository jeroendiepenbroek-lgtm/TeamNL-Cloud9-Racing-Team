-- Check Team Size en Clean Orphaned Riders
-- Run in Supabase SQL Editor

-- 1. Check huidige situatie
SELECT 
  'my_team_members' as table_name,
  COUNT(*) as rider_count
FROM my_team_members
UNION ALL
SELECT 
  'riders' as table_name,
  COUNT(*) as rider_count
FROM riders
UNION ALL
SELECT 
  'view_my_team' as table_name,
  COUNT(*) as rider_count
FROM view_my_team;

-- 2. Toon orphaned riders (riders die NIET in my_team_members staan)
SELECT 
  r.rider_id,
  r.name,
  r.club_name,
  r.last_synced,
  'ORPHANED - Not in my_team_members' as status
FROM riders r
WHERE NOT EXISTS (
  SELECT 1 
  FROM my_team_members m 
  WHERE m.rider_id = r.rider_id
)
ORDER BY r.name
LIMIT 50;

-- 3. CLEANUP: Verwijder alle riders die NIET in my_team_members staan
-- Uncomment de volgende regel om uit te voeren:
-- DELETE FROM riders WHERE rider_id NOT IN (SELECT rider_id FROM my_team_members);

-- 4. Na cleanup check:
-- SELECT COUNT(*) FROM riders;
-- Should match: SELECT COUNT(*) FROM my_team_members;
