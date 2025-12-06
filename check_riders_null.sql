-- Check NULL velden in riders_unified voor team members
SELECT 
  COUNT(*) as total_riders,
  COUNT(CASE WHEN race_count IS NULL THEN 1 END) as null_race_count,
  COUNT(CASE WHEN race_wins IS NULL THEN 1 END) as null_race_wins,
  COUNT(CASE WHEN race_finishes IS NULL THEN 1 END) as null_race_finishes,
  COUNT(CASE WHEN velo_rating IS NULL THEN 1 END) as null_velo,
  COUNT(CASE WHEN zp_category IS NULL THEN 1 END) as null_category,
  COUNT(CASE WHEN phenotype_sprinter IS NULL THEN 1 END) as null_phenotype_sprinter,
  COUNT(CASE WHEN phenotype_climber IS NULL THEN 1 END) as null_phenotype_climber,
  COUNT(CASE WHEN weight IS NULL THEN 1 END) as null_weight,
  COUNT(CASE WHEN zp_ftp IS NULL THEN 1 END) as null_ftp
FROM riders_unified
WHERE is_team_member = true;

-- Sample van riders met missing data
SELECT 
  rider_id,
  name,
  race_count,
  race_wins,
  race_finishes,
  velo_rating,
  zp_category,
  weight,
  zp_ftp,
  last_synced_zwift_racing,
  last_synced_zwift_official
FROM riders_unified
WHERE is_team_member = true
ORDER BY last_synced_zwift_racing DESC NULLS LAST
LIMIT 10;
