-- ====================================================================
-- FIX: Foreign Key Constraint voor Results Dashboard
-- ====================================================================
-- Probleem: PGRST200 - "Could not find relationship between 
--           'zwift_api_race_results' and 'riders'"
-- Oorzaak: Supabase PostgREST vereist FK constraint voor join syntax
-- Oplossing: Voeg FK constraint toe aan rider_id kolom
-- ====================================================================

-- Step 1: Voeg foreign key constraint toe
ALTER TABLE zwift_api_race_results
ADD CONSTRAINT fk_rider
FOREIGN KEY (rider_id) 
REFERENCES riders(zwift_id) 
ON DELETE CASCADE;

-- Step 2: Verifieer constraint is toegevoegd
SELECT 
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'zwift_api_race_results' 
  AND constraint_type = 'FOREIGN KEY';

-- Expected output:
-- ┌─────────────────────────┬──────────────────────────┬─────────────────┐
-- │ constraint_name         │ table_name               │ constraint_type │
-- ├─────────────────────────┼──────────────────────────┼─────────────────┤
-- │ fk_results_rider_id     │ zwift_api_race_results   │ FOREIGN KEY     │
-- └─────────────────────────┴──────────────────────────┴─────────────────┘

-- Step 3: Test de relatie met een query
SELECT 
  r.rider_id,
  r.rider_name,
  r.rank,
  r.event_name,
  rider.name AS rider_table_name,
  rider.category_racing
FROM zwift_api_race_results r
INNER JOIN riders rider ON r.rider_id = rider.zwift_id
LIMIT 5;

-- Step 4: Controleer of alle rider_id's bestaan in riders tabel
-- (voorkomt FK constraint errors bij toekomstige inserts)
SELECT DISTINCT r.rider_id
FROM zwift_api_race_results r
WHERE NOT EXISTS (
  SELECT 1 FROM riders WHERE zwift_id = r.rider_id
);

-- Expected output: 0 rows (betekent alle rider_id's zijn valid)

-- ====================================================================
-- ROLLBACK (indien nodig):
-- ====================================================================
-- Als de constraint problemen geeft, verwijder met:
-- ALTER TABLE zwift_api_race_results DROP CONSTRAINT fk_results_rider_id;
-- ====================================================================

-- ====================================================================
-- POST-DEPLOYMENT VERIFICATIE:
-- ====================================================================
-- 1. Run dit script in Supabase SQL Editor
-- 2. Controleer output van verificatie queries
-- 3. Test API endpoint:
--    curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/results/team/recent?days=365&limit=50
-- 4. Open Results Dashboard in browser
-- 5. Verwacht: 5 event cards zichtbaar met alle data! 🎉
-- ====================================================================
