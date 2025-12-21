-- Fix: BEHOUD unique constraint voor multi-team support
-- Dit zorgt ervoor dat:
-- ✅ Een rider aan meerdere teams kan worden toegevoegd (verschillende team_id)
-- ❌ Een rider NIET dubbel in hetzelfde team kan zitten (unieke combinatie team_id + rider_id)

-- BELANGRIJK: Voer dit ALLEEN uit als de constraint is verwijderd!
-- Check eerst of de constraint bestaat:
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'team_lineups'
  AND constraint_name = 'team_rider_unique';

-- Als de constraint NIET bestaat, voeg hem toe:
ALTER TABLE team_lineups 
ADD CONSTRAINT team_rider_unique UNIQUE (team_id, rider_id);

-- De constraint zorgt ervoor dat:
-- (team_id=1, rider_id=100) ✅ OK
-- (team_id=2, rider_id=100) ✅ OK - rider in ander team
-- (team_id=1, rider_id=100) ❌ ERROR - rider al in team 1

-- Verificatie query - riders in meerdere teams:
SELECT 
  rider_id,
  COUNT(DISTINCT team_id) as team_count,
  string_agg(DISTINCT team_id::text, ', ') as team_ids
FROM team_lineups
GROUP BY rider_id
HAVING COUNT(DISTINCT team_id) > 1
ORDER BY team_count DESC;
