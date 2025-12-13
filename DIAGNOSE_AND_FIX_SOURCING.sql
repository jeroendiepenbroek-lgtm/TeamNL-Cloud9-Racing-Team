-- ============================================
-- DIAGNOSE: Check wat er mis is
-- ============================================

-- 1. Hoeveel riders in team_roster?
SELECT 'team_roster count' as check_name, COUNT(*) as value FROM team_roster;

-- 2. Hoeveel riders in api cache tables?
SELECT 'api_zwift_api_profiles count' as check_name, COUNT(*) as value FROM api_zwift_api_profiles
UNION ALL
SELECT 'api_zwiftracing_riders count', COUNT(*) FROM api_zwiftracing_riders;

-- 3. Welke riders zitten in team_roster?
SELECT 'team_roster riders' as check_name, rider_id, is_active, last_synced 
FROM team_roster 
ORDER BY last_synced DESC NULLS LAST
LIMIT 20;

-- 4. Check v_rider_complete view
SELECT 'v_rider_complete (team members)' as check_name, COUNT(*) as value 
FROM v_rider_complete 
WHERE is_team_member = true;

-- 5. Welke riders zijn NIET in team_roster maar wel in API cache?
SELECT 'Riders in API cache but NOT in team_roster' as check_name, 
       COUNT(*) as value
FROM api_zwift_api_profiles p
LEFT JOIN team_roster tr ON tr.rider_id = p.rider_id
WHERE tr.rider_id IS NULL;

-- 6. Toon die riders
SELECT p.rider_id, p.first_name, p.last_name, p.country_alpha3
FROM api_zwift_api_profiles p
LEFT JOIN team_roster tr ON tr.rider_id = p.rider_id
WHERE tr.rider_id IS NULL
LIMIT 20;

-- ============================================
-- FIX: Voeg alle riders uit API cache toe aan team_roster
-- ============================================

-- Optie 1: Voeg alleen riders toe die in BEIDE cache tables bestaan (veilig)
INSERT INTO team_roster (rider_id, is_active, last_synced)
SELECT 
    p.rider_id,
    true as is_active,
    p.fetched_at as last_synced
FROM api_zwift_api_profiles p
INNER JOIN api_zwiftracing_riders r ON r.rider_id = p.rider_id
ON CONFLICT (rider_id) DO UPDATE 
SET 
    is_active = true,
    last_synced = EXCLUDED.last_synced;

-- Optie 2: Voeg riders toe die alleen in ZwiftRacing zitten
INSERT INTO team_roster (rider_id, is_active, last_synced)
SELECT 
    rider_id,
    true as is_active,
    fetched_at as last_synced
FROM api_zwiftracing_riders
ON CONFLICT (rider_id) DO NOTHING;

-- Check resultaat
SELECT 'AFTER FIX: team_roster count' as check_name, COUNT(*) as value FROM team_roster;
