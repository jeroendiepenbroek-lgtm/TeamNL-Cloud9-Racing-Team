-- Fix: Verwijder unique constraint voor multi-team support
-- Riders moeten aan meerdere teams kunnen worden toegevoegd

-- Stap 1: Drop de unique constraint
ALTER TABLE team_lineups 
DROP CONSTRAINT IF EXISTS team_rider_unique;

-- Stap 2: Voeg nieuwe constraint toe (alleen primary key op id)
-- team_lineups.id blijft primary key
-- Meerdere combinaties van (team_id, rider_id) zijn nu toegestaan

-- Verificatie query:
SELECT 
  rider_id,
  COUNT(DISTINCT team_id) as team_count,
  string_agg(DISTINCT team_id::text, ', ') as team_ids
FROM team_lineups
GROUP BY rider_id
HAVING COUNT(DISTINCT team_id) > 1
ORDER BY team_count DESC;

-- Deze query toont riders die aan meerdere teams zijn toegewezen
