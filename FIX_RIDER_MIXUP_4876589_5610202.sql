-- =============================================
-- FIX: Rider Mix-up tussen 4876589 en 5610202
-- Run this in Supabase SQL Editor
-- =============================================

-- PROBLEEM: 
-- Rider 5610202 heeft de ZwiftRacing data van rider 4876589
-- full_name: "Dolf Zonneveld" (correct van Zwift Official)
-- racing_name: "dylan riou [CTZ]" (verkeerd - dit hoort bij 4876589)

-- STAP 1: Check huidige data
SELECT 
  rider_id,
  COALESCE(first_name || ' ' || last_name, 'N/A') AS zwift_official_name,
  weight,
  ftp,
  fetched_at
FROM api_zwift_api_profiles
WHERE rider_id IN (4876589, 5610202)
ORDER BY rider_id;

SELECT 
  rider_id,
  name AS racing_name,
  weight,
  ftp,
  category,
  fetched_at
FROM api_zwiftracing_riders
WHERE rider_id IN (4876589, 5610202)
ORDER BY rider_id;

-- VERWACHTE CORRECTE DATA (van ZwiftRacing API):
-- 4876589: "dylan riou [CTZ]", weight 79 kg
-- 5610202: "Dolf Zonneveld", weight 92 kg

-- STAP 2: Verwijder verkeerde ZwiftRacing data
DELETE FROM api_zwiftracing_riders 
WHERE rider_id IN (4876589, 5610202);

-- STAP 3: Forceer re-sync van beide riders via backend
-- Dit moet via de backend API gedaan worden:
-- POST /api/admin/riders
-- Body: {"rider_ids": [4876589, 5610202]}

-- STAP 4: Verificatie na re-sync
-- Run dit na de re-sync:
SELECT 
  rider_id,
  full_name,
  racing_name,
  weight_kg,
  ftp_watts,
  zwift_official_category,
  data_completeness
FROM v_rider_complete
WHERE rider_id IN (4876589, 5610202)
ORDER BY rider_id;
