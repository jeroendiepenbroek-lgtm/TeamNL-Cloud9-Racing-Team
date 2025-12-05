-- ============================================================================
-- INSERT TEAM MEMBERS: TeamNL Cloud9 Racing Team (75 riders)
-- ============================================================================
-- Date: 5 december 2025
-- Purpose: Voeg alle 75 team members toe aan my_team_members tabel
-- Execute: Via Supabase Dashboard SQL Editor
-- ============================================================================

-- Verwijder eventuele duplicaten eerst
DELETE FROM my_team_members 
WHERE rider_id IN (
  SELECT rider_id 
  FROM my_team_members 
  GROUP BY rider_id 
  HAVING COUNT(*) > 1
);

-- Insert alle 75 TeamNL Cloud9 members
INSERT INTO my_team_members (rider_id, is_favorite, nickname, notes, added_at)
VALUES
  -- Core Team (Top performers)
  (150437, true, 'JRøne', 'Team Captain', NOW()),
  
  -- Alle andere team members (voeg hier de andere 74 rider IDs toe)
  -- Format: (rider_id, false, NULL, NULL, NOW())
  
  -- Placeholder voor nu - deze IDs moeten uit ZwiftRacing Club API komen
  -- Via: GET https://zwift-ranking.herokuapp.com/api/club/11818/members
  (999999, false, NULL, 'Placeholder - vervang met echte IDs', NOW())

ON CONFLICT (rider_id) 
DO UPDATE SET
  updated_at = NOW();

-- ============================================================================
-- VERIFY INSERT
-- ============================================================================

SELECT COUNT(*) as total_team_members 
FROM my_team_members;

-- Expected: 75 (of hoeveel je hebt ingevoerd)

-- Show top 10 riders
SELECT 
  rider_id,
  nickname,
  is_favorite,
  added_at
FROM my_team_members
ORDER BY added_at DESC
LIMIT 10;

-- ============================================================================
-- ALTERNATIEF: Haal team members via API
-- ============================================================================

-- Als je de 75 rider IDs niet hebt, gebruik dan de sync service:
-- 1. Fix de Supabase service key eerst
-- 2. Run: npx tsx sync-runner.ts --fetch-club-members
-- Dit haalt alle club members op en insert ze in my_team_members

-- ============================================================================
-- NEXT STEP: Sync alle riders naar riders_unified
-- ============================================================================

-- Na insert, run de sync:
-- npx tsx sync-runner.ts --all

-- Dit zal alle 75 riders synchroniseren met ZwiftRacing + Zwift Official API
-- Estimated duration: ~15 minutes (75 × 12s rate limit)
