-- ===============================================
-- VERIFICATIE QUERIES NA MIGRATION 007
-- ===============================================
-- Run deze queries in Supabase SQL Editor na migration

-- Check 1: Tel aantal kolommen (verwacht: 61+)
SELECT COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'riders';
-- Expected: ~64 (61 data columns + id + created_at + updated_at)

-- Check 2: Verifieer nieuwe power kolommen
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'riders' 
  AND column_name LIKE 'power_%'
ORDER BY column_name;
-- Expected: 14 rows (power_wkg5, power_wkg15, ..., power_rating)

-- Check 3: Verifieer rider_id kolom bestaat
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'riders' 
  AND column_name = 'rider_id';
-- Expected: 1 row, data_type: bigint, is_nullable: NO

-- Check 4: Verifieer oude zwift_id kolom NIET bestaat
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'riders' 
  AND column_name = 'zwift_id';
-- Expected: 0 rows (kolom hernoemd naar rider_id)

-- Check 5: Verifieer computed view werkt
SELECT COUNT(*) as team_member_count
FROM view_my_team;
-- Expected: 1 (jouw huidige rider 150437)

-- Check 6: Test computed watts_per_kg in view
SELECT rider_id, name, zp_ftp, weight, 
       ROUND(watts_per_kg, 2) as computed_wkg
FROM riders_computed 
WHERE rider_id = 150437;
-- Expected: 1 row met berekende watts_per_kg waarde

-- Check 7: Verifieer my_team_members FK
SELECT 
    tc.constraint_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'my_team_members' 
  AND tc.constraint_type = 'FOREIGN KEY';
-- Expected: FK naar riders(rider_id)

-- ===============================================
-- SUCCESS CRITERIA
-- ===============================================
-- ✅ Check 1: column_count >= 61
-- ✅ Check 2: 14 power columns
-- ✅ Check 3: rider_id bestaat (bigint, NOT NULL)
-- ✅ Check 4: zwift_id bestaat NIET meer
-- ✅ Check 5: view_my_team returnt data
-- ✅ Check 6: watts_per_kg wordt berekend
-- ✅ Check 7: FK constraint op rider_id

-- Als ALLE checks ✅ zijn: MIGRATION SUCCESVOL! 🎉
