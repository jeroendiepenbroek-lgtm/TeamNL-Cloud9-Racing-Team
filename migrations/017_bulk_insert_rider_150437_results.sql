-- ============================================
-- BULK INSERT: 27 Race Results voor Rider 150437
-- ============================================
-- Kopieer en plak in Supabase SQL Editor
-- Dit insert alle 27 races met complete power intervals

INSERT INTO race_results 
(event_id, rider_id, position, category, avg_power, avg_wkg, time_seconds, 
 power_5s_wkg, power_15s_wkg, power_30s_wkg, power_1m_wkg, power_2m_wkg, power_5m_wkg, power_20m_wkg,
 rider_name, weight, ftp, source)
VALUES
(5127680, 150437, 8, 'B', 239, 3.20, 3106, 10.3, 8.3, 5.6, 4.3, 4.1, 3.6, 3.4, 'JRøne | CloudRacer-9 @YouTube', 74.0, 239, 'zwiftpower'),
(5129235, 150437, 17, 'B', 239, 3.20, 2912, 8.1, 6.8, 5.7, 4.5, 4.4, 3.8, 3.4, 'JRøne | CloudRacer-9 @YouTube', 74.0, 239, 'zwiftpower'),
(5129365, 150437, 33, 'B', 239, 3.20, 2746, 9.6, 7.8, 6.6, 4.9, 4.4, 3.7, 3.4, 'JRøne | CloudRacer-9 @YouTube', 74.0, 239, 'zwiftpower'),
(5163788, 150437, 48, 'B', 231, 3.10, 2867, 7.9, 6.8, 5.7, 4.7, 4.2, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 74.0, 231, 'zwiftpower'),
(5144148, 150437, 22, 'B', 231, 3.10, 2698, 9.1, 7.8, 6.3, 5.0, 4.4, 3.7, 3.3, 'JRøne | CloudRacer-9 @YouTube', 74.0, 231, 'zwiftpower'),
(5183135, 150437, 19, 'B', 231, 3.10, 2703, 9.1, 7.8, 6.2, 4.9, 4.4, 3.7, 3.3, 'JRøne | CloudRacer-9 @YouTube', 74.0, 231, 'zwiftpower'),
(5176821, 150437, 53, 'B', 233, 3.10, 2929, 10.3, 8.1, 6.7, 5.2, 4.3, 3.5, 3.3, 'JRøne | CloudRacer-9 @YouTube', 74.5, 233, 'zwiftpower'),
(5144308, 150437, 5, 'B', 231, 3.10, 2658, 8.9, 7.6, 6.1, 4.8, 4.3, 3.7, 3.3, 'JRøne | CloudRacer-9 @YouTube', 74.0, 231, 'zwiftpower'),
(5132015, 150437, 14, 'B', 233, 3.10, 3121, 10.2, 8.4, 6.9, 5.4, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 74.5, 233, 'zwiftpower'),
(5144434, 150437, 57, 'B', 231, 3.10, 2885, 10.2, 8.3, 6.8, 5.2, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 74.0, 231, 'zwiftpower'),
(5208495, 150437, 43, 'B', 231, 3.10, 3040, 9.8, 8.0, 6.6, 5.2, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 74.0, 231, 'zwiftpower'),
(5178019, 150437, 48, 'B', 229, 3.10, 2960, 10.2, 8.2, 6.7, 5.2, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 73.5, 229, 'zwiftpower'),
(5206710, 150437, 25, 'B', 229, 3.10, 3034, 10.1, 8.1, 6.7, 5.2, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 73.5, 229, 'zwiftpower'),
(5229579, 150437, 39, 'B', 231, 3.10, 2916, 10.2, 8.3, 6.8, 5.2, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 74.0, 231, 'zwiftpower'),
(5236640, 150437, 54, 'B', 229, 3.10, 3168, 10.2, 8.2, 6.7, 5.2, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 73.5, 229, 'zwiftpower'),
(5254822, 150437, 47, 'B', 228, 3.10, 3092, 10.2, 8.3, 6.7, 5.2, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 73.0, 228, 'zwiftpower'),
(5257600, 150437, 22, 'B', 228, 3.10, 3083, 10.3, 8.3, 6.8, 5.2, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 73.0, 228, 'zwiftpower'),
(5230363, 150437, 28, 'B', 229, 3.10, 2972, 10.3, 8.3, 6.8, 5.2, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 73.5, 229, 'zwiftpower'),
(5230392, 150437, 24, 'B', 229, 3.10, 3022, 10.2, 8.2, 6.7, 5.2, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 73.5, 229, 'zwiftpower'),
(5233969, 150437, 21, 'B', 229, 3.10, 3060, 10.2, 8.2, 6.8, 5.2, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 73.5, 229, 'zwiftpower'),
(5230823, 150437, 30, 'B', 229, 3.10, 2996, 10.2, 8.3, 6.8, 5.2, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 73.5, 229, 'zwiftpower'),
(5331604, 150437, 10, 'B', 231, 3.10, 2919, 10.2, 8.3, 6.8, 5.2, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 74.0, 231, 'zwiftpower'),
(5149471, 150437, 17, 'B', 231, 3.10, 3072, 10.2, 8.3, 6.8, 5.2, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 74.0, 231, 'zwiftpower'),
(5213922, 150437, 31, 'B', 229, 3.10, 2992, 10.2, 8.2, 6.7, 5.2, 4.3, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 73.5, 229, 'zwiftpower'),
(5275729, 150437, 16, 'B', 232, 3.10, 3002, 10.3, 8.3, 6.8, 5.2, 4.4, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 74.5, 232, 'zwiftpower'),
(5290955, 150437, 15, 'B', 232, 3.10, 2812, 10.3, 8.3, 6.8, 5.2, 4.4, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 74.5, 232, 'zwiftpower'),
(5308652, 150437, 13, 'B', 232, 3.10, 2955, 10.3, 8.3, 6.8, 5.2, 4.4, 3.6, 3.3, 'JRøne | CloudRacer-9 @YouTube', 74.5, 232, 'zwiftpower')
ON CONFLICT (event_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position,
  category = EXCLUDED.category,
  avg_power = EXCLUDED.avg_power,
  avg_wkg = EXCLUDED.avg_wkg,
  time_seconds = EXCLUDED.time_seconds,
  power_5s_wkg = EXCLUDED.power_5s_wkg,
  power_15s_wkg = EXCLUDED.power_15s_wkg,
  power_30s_wkg = EXCLUDED.power_30s_wkg,
  power_1m_wkg = EXCLUDED.power_1m_wkg,
  power_2m_wkg = EXCLUDED.power_2m_wkg,
  power_5m_wkg = EXCLUDED.power_5m_wkg,
  power_20m_wkg = EXCLUDED.power_20m_wkg,
  rider_name = EXCLUDED.rider_name,
  weight = EXCLUDED.weight,
  ftp = EXCLUDED.ftp,
  source = EXCLUDED.source;

-- Verificatie
SELECT 
  COUNT(*) as total_races,
  MIN(power_5s_wkg) as min_5s,
  MAX(power_5s_wkg) as max_5s,
  AVG(avg_wkg) as avg_power
FROM race_results 
WHERE rider_id = 150437;
