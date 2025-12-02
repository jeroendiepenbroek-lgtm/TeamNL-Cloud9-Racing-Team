-- Migration 021: Update view_my_team with Power Profile fields
-- Datum: 2025-12-02
-- Doel: Racing Matrix kan nu power intervals tonen (geen NULL meer!)

DROP VIEW IF EXISTS view_my_team;

CREATE VIEW view_my_team AS
SELECT 
  r.rider_id,
  r.name,
  r.zp_category,
  r.ftp as zp_ftp,
  r.weight_kg as weight,
  
  -- vELO ratings
  r.velo_rating as race_last_rating,
  r.velo_max_30d as race_max30_rating,
  
  -- Race stats
  COALESCE(r.race_wins, 0) as race_wins,
  COALESCE(r.race_podiums, 0) as race_podiums,
  r.race_count_90d as race_finishes,
  COALESCE(r.race_dnfs, 0) as race_dnfs,
  
  -- W/kg calculation
  CASE 
    WHEN r.ftp IS NOT NULL AND r.weight_kg IS NOT NULL AND r.weight_kg > 0 
    THEN ROUND(r.ftp::numeric / r.weight_kg, 2)
    ELSE NULL
  END as watts_per_kg,
  
  -- Power intervals (mapped to MatrixRider interface)
  r.power_5s_w as power_w5,
  r.power_15s_w as power_w15,
  r.power_30s_w as power_w30,
  r.power_1m_w as power_w60,
  r.power_2m_w as power_w120,
  r.power_5m_w as power_w300,
  r.power_20m_w as power_w1200

FROM riders_unified r
WHERE r.is_team_member = true
ORDER BY r.velo_rating DESC NULLS LAST;

COMMENT ON VIEW view_my_team IS 'Racing Matrix data view - includes power profile from ZwiftRacing.app';
