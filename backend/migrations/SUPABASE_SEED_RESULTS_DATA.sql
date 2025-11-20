-- Seed Data: Test Results voor Results Dashboard
-- Run dit in Supabase SQL Editor NA de migration (SUPABASE_ADD_RESULTS_COLUMNS.sql)

-- Insert test results met power curves en vELO data
INSERT INTO zwift_api_race_results (
  event_id, event_name, event_date, rider_id, rider_name, rank, time_seconds, avg_wkg,
  pen, total_riders, velo_rating, velo_previous, velo_change,
  power_5s, power_15s, power_30s, power_1m, power_2m, power_5m, power_20m,
  effort_score, race_points, delta_winner_seconds
) VALUES
-- Event 1: WTRL TTT - Stage 1 (PEN A) - Vorige week!
('5000001', 'WTRL TTT - Stage 1', '2025-11-18 19:00:00+00', 150437, 'Jeroen Diepenbroek', 1, 1820, 4.85, 'A', 45, 6, 5, 1, 8.73, 8.29, 7.46, 5.34, 5.10, 4.87, 4.61, 95, 1005.5, 0),
('5000001', 'WTRL TTT - Stage 1', '2025-11-18 19:00:00+00', 123456, 'Alex Johnson', 2, 1845, 4.72, 'A', 45, 6, 6, 0, 8.50, 8.07, 7.26, 5.19, 4.96, 4.74, 4.48, 92, 985.2, 25),
('5000001', 'WTRL TTT - Stage 1', '2025-11-18 19:00:00+00', 123457, 'Sarah Miller', 3, 1890, 4.55, 'A', 45, 5, 6, -1, 8.19, 7.78, 7.00, 5.01, 4.78, 4.57, 4.32, 89, 965.8, 70),

-- Event 2: ZRL Premier - Watopia Flat (PEN B)
('5000002', 'ZRL Premier - Watopia Flat', '2025-11-17 20:00:00+00', 150437, 'Jeroen Diepenbroek', 2, 1925, 3.95, 'B', 38, 5, 5, 0, 6.71, 6.38, 5.74, 4.35, 4.15, 3.96, 3.67, 91, 980.3, 18),
('5000002', 'ZRL Premier - Watopia Flat', '2025-11-17 20:00:00+00', 123458, 'Mike Chen', 1, 1910, 4.12, 'B', 38, 6, 5, 1, 7.00, 6.66, 5.99, 4.53, 4.33, 4.13, 3.83, 97, 1002.1, 0),
('5000002', 'ZRL Premier - Watopia Flat', '2025-11-17 20:00:00+00', 123459, 'Emma Davis', 4, 1975, 3.78, 'B', 38, 5, 5, 0, 6.43, 6.11, 5.50, 4.16, 3.97, 3.79, 3.51, 86, 940.5, 65),

-- Event 3: Club Race - Volcano Circuit (PEN C)
('5000003', 'Club Race - Volcano Circuit', '2025-11-16 18:30:00+00', 150437, 'Jeroen Diepenbroek', 1, 2015, 3.42, 'C', 52, 5, 5, 0, 5.47, 5.20, 4.68, 3.76, 3.59, 3.43, 3.15, 94, 998.7, 0),
('5000003', 'Club Race - Volcano Circuit', '2025-11-16 18:30:00+00', 123456, 'Alex Johnson', 3, 2085, 3.18, 'C', 52, 4, 4, 0, 5.09, 4.84, 4.35, 3.50, 3.34, 3.19, 2.93, 87, 960.2, 70),
('5000003', 'Club Race - Volcano Circuit', '2025-11-16 18:30:00+00', 123457, 'Sarah Miller', 2, 2050, 3.28, 'C', 52, 4, 3, 1, 5.25, 4.99, 4.49, 3.61, 3.44, 3.29, 3.02, 90, 979.5, 35),
('5000003', 'Club Race - Volcano Circuit', '2025-11-16 18:30:00+00', 123459, 'Emma Davis', 5, 2135, 3.05, 'C', 52, 3, 3, 0, 4.88, 4.64, 4.17, 3.36, 3.20, 3.06, 2.81, 82, 920.8, 120),

-- Event 4: KISS Race - Alpe du Zwift (PEN A)
('5000004', 'KISS Race - Alpe du Zwift', '2025-11-15 19:30:00+00', 123456, 'Alex Johnson', 1, 1795, 4.92, 'A', 28, 6, 6, 0, 8.86, 8.42, 7.58, 5.41, 5.17, 4.94, 4.67, 96, 1008.3, 0),
('5000004', 'KISS Race - Alpe du Zwift', '2025-11-15 19:30:00+00', 123457, 'Sarah Miller', 2, 1825, 4.68, 'A', 28, 5, 5, 0, 8.42, 8.00, 7.20, 5.15, 4.91, 4.70, 4.45, 93, 987.9, 30),
('5000004', 'KISS Race - Alpe du Zwift', '2025-11-15 19:30:00+00', 150437, 'Jeroen Diepenbroek', 4, 1880, 4.48, 'A', 28, 5, 6, -1, 8.06, 7.66, 6.89, 4.93, 4.70, 4.50, 4.26, 88, 948.1, 85),

-- Event 5: SZR Sprint Series - Crit City (PEN B)
('5000005', 'SZR Sprint Series - Crit City', '2025-11-14 20:30:00+00', 123458, 'Mike Chen', 1, 1935, 4.05, 'B', 41, 6, 6, 0, 6.89, 6.55, 5.89, 4.46, 4.25, 4.06, 3.76, 98, 1004.8, 0),
('5000005', 'SZR Sprint Series - Crit City', '2025-11-14 20:30:00+00', 123459, 'Emma Davis', 2, 1960, 3.88, 'B', 41, 5, 4, 1, 6.60, 6.27, 5.64, 4.27, 4.07, 3.89, 3.60, 91, 982.4, 25),
('5000005', 'SZR Sprint Series - Crit City', '2025-11-14 20:30:00+00', 150437, 'Jeroen Diepenbroek', 3, 2005, 3.72, 'B', 41, 5, 5, 0, 6.32, 6.01, 5.40, 4.09, 3.91, 3.73, 3.46, 87, 962.7, 70);

-- Verificatie query: Check inserted data
SELECT 
  'Seed successful!' as status,
  COUNT(*) as total_results,
  COUNT(DISTINCT event_id) as unique_events,
  COUNT(DISTINCT rider_id) as unique_riders,
  COUNT(*) FILTER (WHERE power_5s IS NOT NULL) as results_with_power,
  COUNT(*) FILTER (WHERE velo_rating IS NOT NULL) as results_with_velo
FROM zwift_api_race_results
WHERE event_id::text LIKE '5000%';

-- Show sample data
SELECT 
  event_name,
  event_date::date,
  rider_name,
  rank,
  avg_wkg,
  velo_rating,
  power_5s,
  power_20m
FROM zwift_api_race_results
WHERE event_id::text LIKE '5000%'
ORDER BY event_date DESC, event_id, rank
LIMIT 10;
