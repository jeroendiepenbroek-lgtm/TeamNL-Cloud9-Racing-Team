-- Verify Power Profile Data for Rider 150437
-- Check that power intervals are populated (NOT NULL)

SELECT 
  rider_id,
  name,
  
  -- vELO ratings
  velo_rating,
  velo_max_30d,
  velo_max_90d,
  velo_rank,
  
  -- Power intervals (watts)
  power_5s_w,
  power_15s_w,
  power_1m_w,
  power_5m_w,
  power_20m_w,
  
  -- Power intervals (W/kg)
  power_5s_wkg,
  power_20m_wkg,
  
  -- Phenotype
  phenotype_sprinter,
  phenotype_puncheur,
  phenotype_pursuiter,
  
  -- Handicaps
  handicap_flat,
  handicap_rolling,
  handicap_hilly,
  handicap_mountainous,
  
  -- Physical
  ftp,
  weight_kg,
  height_cm,
  
  -- Race stats
  race_wins,
  race_podiums,
  race_count_90d,
  race_dnfs

FROM riders_unified
WHERE rider_id = 150437;
