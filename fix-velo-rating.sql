-- Quick fix: Update velo_rating from velo_max_30d (current rating is same as max in this case)
UPDATE riders_unified 
SET velo_rating = velo_max_30d 
WHERE rider_id = 150437 AND velo_rating IS NULL AND velo_max_30d IS NOT NULL;

-- Verify
SELECT rider_id, name, velo_rating, velo_max_30d, velo_max_90d, velo_rank
FROM riders_unified
WHERE rider_id = 150437;
