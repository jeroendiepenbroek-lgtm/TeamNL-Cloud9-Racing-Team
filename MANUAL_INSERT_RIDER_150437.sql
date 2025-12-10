-- ============================================================================
-- MANUAL DATA SYNC voor Rider 150437
-- ============================================================================
-- Run deze SQL in Supabase na de migrations
-- Dit voegt rider 150437 handmatig toe aan api_zwiftracing_riders
-- ============================================================================

INSERT INTO api_zwiftracing_riders (
  rider_id,
  id,
  name,
  country,
  velo_live,
  velo_30day,
  velo_90day,
  category,
  ftp,
  power_5s,
  power_15s,
  power_30s,
  power_60s,
  power_120s,
  power_300s,
  power_1200s,
  power_5s_wkg,
  power_15s_wkg,
  power_30s_wkg,
  power_60s_wkg,
  power_120s_wkg,
  power_300s_wkg,
  power_1200s_wkg,
  weight,
  height,
  phenotype,
  race_count,
  raw_response,
  fetched_at
) VALUES (
  150437,
  150437,
  'JRøne  CloudRacer-9 @YT (TeamNL)',
  'nl',
  1413.91,
  1413.91,
  1461.01,
  'B',
  239,
  916,
  762,
  586,
  440,
  371,
  312,
  260,
  12.38,
  10.30,
  7.92,
  5.95,
  5.01,
  4.22,
  3.51,
  74.0,
  183,
  'Sprinter',
  23,
  '{"riderId": 150437, "name": "JRøne  CloudRacer-9 @YT (TeamNL)", "country": "nl", "race": {"current": {"rating": 1413.91}, "finishes": 23}, "power": {"w5": 916, "w15": 762, "w30": 586, "w60": 440, "w120": 371, "w300": 312, "w1200": 260, "wkg5": 12.38, "wkg15": 10.30, "wkg30": 7.92, "wkg60": 5.95, "wkg120": 5.01, "wkg300": 4.22, "wkg1200": 3.51}, "phenotype": {"value": "Sprinter"}, "zpFTP": 239, "zpCategory": "B", "weight": 74, "height": 183}'::jsonb,
  NOW()
)
ON CONFLICT (rider_id) DO UPDATE SET
  velo = EXCLUDED.velo,
  velo_live = EXCLUDED.velo_live,
  velo_30day = EXCLUDED.velo_30day,
  velo_90day = EXCLUDED.velo_90day,
  category = EXCLUDED.category,
  ftp = EXCLUDED.ftp,
  power_5s = EXCLUDED.power_5s,
  power_15s = EXCLUDED.power_15s,
  power_30s = EXCLUDED.power_30s,
  power_60s = EXCLUDED.power_60s,
  power_120s = EXCLUDED.power_120s,
  power_300s = EXCLUDED.power_300s,
  power_1200s = EXCLUDED.power_1200s,
  power_5s_wkg = EXCLUDED.power_5s_wkg,
  power_15s_wkg = EXCLUDED.power_15s_wkg,
  power_30s_wkg = EXCLUDED.power_30s_wkg,
  power_60s_wkg = EXCLUDED.power_60s_wkg,
  power_120s_wkg = EXCLUDED.power_120s_wkg,
  power_300s_wkg = EXCLUDED.power_300s_wkg,
  power_1200s_wkg = EXCLUDED.power_1200s_wkg,
  weight = EXCLUDED.weight,
  height = EXCLUDED.height,
  phenotype = EXCLUDED.phenotype,
  race_count = EXCLUDED.race_count,
  raw_response = EXCLUDED.raw_response,
  fetched_at = NOW();

-- ============================================================================
-- VERIFICATION: Check complete rider profile
-- ============================================================================

SELECT 
  rider_id,
  full_name,
  racing_name,
  velo,
  velo_live,
  velo_30day,
  velo_90day,
  zwift_official_racing_score,
  phenotype,
  zwiftracing_category,
  race_count,
  power_5s_wkg,
  power_1200s_wkg,
  weight_kg,
  height_cm,
  ftp_watts,
  data_completeness
FROM v_rider_complete 
WHERE rider_id = 150437;

-- ============================================================================
-- Expected Result:
-- ============================================================================
-- rider_id: 150437
-- full_name: Jeroen Diepenbroek
-- racing_name: JRøne  CloudRacer-9 @YT (TeamNL)
-- velo: 1413.91
-- velo_live: 1413.91 (current)
-- velo_30day: 1413.91 (max in last 30 days)
-- velo_90day: 1461.01 (max in last 90 days)
-- zwift_official_racing_score: 553
-- phenotype: Sprinter
-- zwiftracing_category: B
-- race_count: 23
-- power_5s_wkg: 12.38
-- power_1200s_wkg: 3.51
-- weight_kg: 74.0
-- height_cm: 183
-- ftp_watts: 248
-- data_completeness: complete
-- ============================================================================
