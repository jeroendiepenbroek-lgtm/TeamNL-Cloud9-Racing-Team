-- ============================================================================
-- MIGRATION 003: Hybrid Views (Combined Sources for Frontend)
-- ============================================================================
-- Principe: Views combineren source tables en transformeren data voor frontend
-- Test Rider: 150437 (Jeroen Diepenbroek)
-- Datum: 8 december 2025
-- Updated: 9 december 2025 - Added Zwift Official Racing Score
-- ============================================================================

-- Drop existing views to allow column name changes
DROP VIEW IF EXISTS v_rider_complete CASCADE;
DROP VIEW IF EXISTS v_team_rankings CASCADE;
DROP VIEW IF EXISTS v_power_rankings CASCADE;
DROP VIEW IF EXISTS v_event_results CASCADE;

-- ============================================================================
-- VIEW 1: Complete Rider Profile (Main Dashboard)
-- ============================================================================
-- Combines: ZwiftRacing clubs + Zwift Official profiles
-- Used by: RiderProfilePage
-- ============================================================================

CREATE OR REPLACE VIEW v_rider_complete AS
SELECT 
  -- Identity (prefer Zwift Official for official data)
  COALESCE(zo.rider_id, zr.rider_id) AS rider_id,
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name) AS full_name,
  zr.name AS racing_name,
  zo.first_name,
  zo.last_name,
  
  -- Racing Metrics (combined sources)
  zr.velo,
  zr.racing_score AS zwiftracing_score,
  zo.competition_racing_score AS zwift_official_racing_score,
  zo.competition_category AS zwift_official_category,
  zr.phenotype,
  zr.category AS zwiftracing_category,
  zr.race_count,
  
  -- Power Curve (only from ZwiftRacing)
  zr.ftp AS racing_ftp,
  zr.power_5s, zr.power_15s, zr.power_30s, zr.power_60s,
  zr.power_120s, zr.power_300s, zr.power_1200s,
  zr.power_5s_wkg, zr.power_15s_wkg, zr.power_30s_wkg,
  zr.power_60s_wkg, zr.power_120s_wkg, zr.power_300s_wkg,
  zr.power_1200s_wkg,
  
  -- Physical (prefer Official for accuracy, convert from grams to kg)
  COALESCE(zo.weight / 1000.0, zr.weight) AS weight_kg,
  COALESCE(zo.height, zr.height) AS height_cm,
  COALESCE(zo.ftp, zr.ftp) AS ftp_watts,
  
  -- Avatar & Visual (only from Official)
  zo.image_src AS avatar_url,
  zo.image_src_large AS avatar_url_large,
  
  -- Social Stats (only from Official)
  zo.followers_count,
  zo.followees_count,
  zo.rideons_given,
  
  -- Demographics (only from Official)
  zo.age,
  zo.male AS is_male,
  zo.country_code,
  zo.country_alpha3,
  
  -- Achievements (only from Official)
  zo.achievement_level,
  zo.total_distance / 1000.0 AS total_distance_km,
  zo.total_distance_climbed AS total_elevation_m,
  
  -- Privacy (only from Official)
  zo.privacy_profile,
  zo.privacy_activities,
  
  -- Status
  zo.riding AS currently_riding,
  zo.world_id AS current_world,
  
  -- Sync tracking
  zr.fetched_at AS racing_data_updated,
  zo.fetched_at AS profile_data_updated,
  
  -- Source indicators
  CASE 
    WHEN zr.rider_id IS NOT NULL AND zo.rider_id IS NOT NULL THEN 'complete'
    WHEN zr.rider_id IS NOT NULL THEN 'racing_only'
    WHEN zo.rider_id IS NOT NULL THEN 'profile_only'
  END AS data_completeness

FROM api_zwift_api_profiles zo
FULL OUTER JOIN api_zwiftracing_public_clubs_riders zr ON zo.rider_id = zr.rider_id;

COMMENT ON VIEW v_rider_complete IS 
  'Hybrid view combining Zwift Official (primary) + ZwiftRacing (racing metrics if available). 
   Club membership NOT required - works for any rider with Zwift profile.
   Used by: RiderProfilePage. 
   Test: SELECT * FROM v_rider_complete WHERE rider_id = 150437;';


-- ============================================================================
-- VIEW 2: Team Rankings (Main Team Dashboard)
-- ============================================================================
-- Source: ZwiftRacing clubs + Zwift Official avatars
-- Used by: TeamDashboard
-- ============================================================================

CREATE OR REPLACE VIEW v_team_rankings AS
SELECT 
  COALESCE(zo.rider_id, zr.rider_id) AS rider_id,
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name) AS full_name,
  zr.name AS racing_name,
  
  -- Racing Metrics
  zr.velo,
  zr.racing_score AS zwiftracing_score,
  zo.competition_racing_score AS zwift_official_racing_score,
  zo.competition_category AS zwift_official_category,
  
  -- Physical
  COALESCE(zo.weight / 1000.0, zr.weight) AS weight_kg,
  COALESCE(zo.ftp, zr.ftp) AS ftp_watts,
  zr.phenotype,
  zr.category AS zwiftracing_category,
  zr.race_count,
  
  -- Power highlights
  zr.power_5s_wkg AS sprint_wkg,
  zr.power_60s_wkg AS vo2max_wkg,
  zr.power_1200s_wkg AS ftp_wkg,
  
  -- Avatar from Official
  zo.image_src AS avatar_url,
  
  -- Rankings (based on available metrics)
  ROW_NUMBER() OVER (ORDER BY COALESCE(zr.velo, 0) DESC NULLS LAST) AS velo_rank,
  ROW_NUMBER() OVER (ORDER BY COALESCE(zo.competition_racing_score, zr.racing_score, 0) DESC NULLS LAST) AS racing_score_rank,
  ROW_NUMBER() OVER (ORDER BY COALESCE(zr.power_5s_wkg, 0) DESC NULLS LAST) AS sprint_rank,
  ROW_NUMBER() OVER (ORDER BY COALESCE(zr.power_1200s_wkg, 0) DESC NULLS LAST) AS ftp_rank,
  
  -- Performance grade (use Zwift Official racing score if vELO not available)
  CASE 
    WHEN zr.velo >= 1500 OR zo.competition_racing_score >= 900 THEN 'S'
    WHEN zr.velo >= 1400 OR zo.competition_racing_score >= 700 THEN 'A+'
    WHEN zr.velo >= 1300 OR zo.competition_racing_score >= 600 THEN 'A'
    WHEN zr.velo >= 1200 OR zo.competition_racing_score >= 500 THEN 'B+'
    WHEN zr.velo >= 1100 OR zo.competition_racing_score >= 400 THEN 'B'
    ELSE 'C'
  END AS performance_grade,
  
  -- Data freshness
  GREATEST(zr.fetched_at, zo.fetched_at) AS last_updated
  
FROM api_zwift_api_profiles zo
FULL OUTER JOIN api_zwiftracing_public_clubs_riders zr ON zo.rider_id = zr.rider_id
ORDER BY COALESCE(zo.competition_racing_score, zr.racing_score, zr.velo, 0) DESC NULLS LAST;

COMMENT ON VIEW v_team_rankings IS 
  'Team rankings for custom team management - NO club_id filtering.
   Ranks by: Zwift Official racing_score > ZwiftRacing vELO > other metrics.
   Works for ANY rider regardless of club membership.
   Used by: TeamDashboard (custom team composition).
   Test: SELECT * FROM v_team_rankings WHERE rider_id IN (150437);';


-- ============================================================================
-- VIEW 3: Recent Activities Feed
-- ============================================================================
-- Source: Zwift Official activities + profiles
-- Used by: ActivityFeedPage, RiderProfilePage (activities tab)
-- ============================================================================

CREATE OR REPLACE VIEW v_activities_feed AS
SELECT 
  a.activity_id,
  a.rider_id,
  
  -- Rider info
  p.first_name || ' ' || p.last_name AS rider_name,
  p.image_src AS rider_avatar,
  
  -- Activity details
  a.name AS activity_name,
  a.start_date,
  a.distance_meters / 1000.0 AS distance_km,
  a.total_elevation AS elevation_m,
  a.moving_time_ms / 60000.0 AS duration_minutes,
  
  -- Performance
  a.avg_watts,
  a.max_watts,
  a.normalized_power,
  ROUND(a.avg_watts::NUMERIC / (p.weight / 1000.0), 2) AS avg_wkg,
  a.calories,
  
  -- Heart rate
  a.avg_hr,
  a.max_hr,
  
  -- Cadence
  a.avg_cadence,
  
  -- Social engagement
  a.rideon_count,
  a.comment_count,
  
  -- World mapping
  CASE a.world_id
    WHEN 1 THEN 'Watopia'
    WHEN 2 THEN 'Richmond'
    WHEN 3 THEN 'London'
    WHEN 4 THEN 'New York'
    WHEN 5 THEN 'Innsbruck'
    WHEN 6 THEN 'Bologna'
    WHEN 7 THEN 'Yorkshire'
    WHEN 8 THEN 'Crit City'
    WHEN 9 THEN 'Makuri Islands'
    WHEN 10 THEN 'France'
    WHEN 11 THEN 'Paris'
    WHEN 12 THEN 'Gravel Mountain'
    ELSE 'Unknown'
  END AS world_name,
  
  a.fit_file_key,
  a.privacy,
  
  -- Data freshness
  a.fetched_at AS last_updated
  
FROM api_zwift_api_profiles_activities a
INNER JOIN api_zwift_api_profiles p ON a.rider_id = p.rider_id
ORDER BY a.start_date DESC;

COMMENT ON VIEW v_activities_feed IS 
  'Recent activities with rider info and performance metrics. 
   Used by: ActivityFeedPage, RiderProfilePage (activities tab).
   Test: SELECT * FROM v_activities_feed WHERE rider_id = 150437 LIMIT 10;';


-- ============================================================================
-- VIEW 4: Upcoming Races Calendar
-- ============================================================================
-- Source: ZwiftRacing events
-- Used by: RaceCalendarPage
-- ============================================================================

CREATE OR REPLACE VIEW v_race_calendar AS
SELECT 
  event_id,
  title,
  start_time,
  
  -- Event details
  type,
  sub_type,
  distance / 1000.0 AS distance_km,
  num_laps,
  
  -- Participation
  categories,
  signups,
  
  -- Parse signup counts per category
  SPLIT_PART(signups, ',', 1)::INTEGER AS signups_a,
  SPLIT_PART(signups, ',', 2)::INTEGER AS signups_b,
  SPLIT_PART(signups, ',', 3)::INTEGER AS signups_c,
  SPLIT_PART(signups, ',', 4)::INTEGER AS signups_d,
  SPLIT_PART(signups, ',', 5)::INTEGER AS signups_e,
  
  -- Total signups (handle nulls)
  COALESCE(SPLIT_PART(signups, ',', 1)::INTEGER, 0) + 
  COALESCE(SPLIT_PART(signups, ',', 2)::INTEGER, 0) + 
  COALESCE(SPLIT_PART(signups, ',', 3)::INTEGER, 0) + 
  COALESCE(SPLIT_PART(signups, ',', 4)::INTEGER, 0) + 
  COALESCE(SPLIT_PART(signups, ',', 5)::INTEGER, 0) AS total_signups,
  
  -- Flags
  staggered_start,
  
  -- Time until race
  EXTRACT(EPOCH FROM (start_time - NOW())) / 3600 AS hours_until_start,
  
  -- Categorization
  CASE 
    WHEN EXTRACT(EPOCH FROM (start_time - NOW())) / 3600 < 1 THEN 'starting_soon'
    WHEN EXTRACT(EPOCH FROM (start_time - NOW())) / 3600 < 24 THEN 'today'
    WHEN EXTRACT(EPOCH FROM (start_time - NOW())) / 3600 < 168 THEN 'this_week'
    ELSE 'later'
  END AS time_category,
  
  -- Data freshness
  fetched_at AS last_updated
  
FROM api_zwiftracing_api_events_upcoming
WHERE start_time > NOW()
ORDER BY start_time ASC;

COMMENT ON VIEW v_race_calendar IS 
  'Upcoming races with signup counts and time until start. 
   Used by: RaceCalendarPage.
   Test: SELECT * FROM v_race_calendar LIMIT 20;';


-- ============================================================================
-- VIEW 5: Event Signup Preview (Pre-Race Analysis) 🔥 KILLER FEATURE
-- ============================================================================
-- Source: ZwiftRacing event signups
-- Used by: EventPreviewPage
-- ============================================================================

CREATE OR REPLACE VIEW v_event_signup_preview AS
SELECT 
  event_id,
  category,
  
  -- Rider details
  rider_id,
  name AS rider_name,
  
  -- Power profile (relative)
  wkg5 AS sprint_5s_wkg,
  wkg15 AS sprint_15s_wkg,
  wkg60 AS vo2max_60s_wkg,
  wkg300 AS anaerobic_5min_wkg,
  wkg1200 AS ftp_20min_wkg,
  
  -- Power profile (absolute)
  w5 AS sprint_5s_watts,
  w60 AS vo2max_60s_watts,
  w1200 AS ftp_20min_watts,
  
  -- Critical Power model
  cp AS critical_power,
  awc AS anaerobic_capacity,
  compound_score,
  
  -- Race stats
  race_rating,
  race_finishes,
  race_wins,
  race_podiums,
  ROUND((race_wins::NUMERIC / NULLIF(race_finishes, 0)) * 100, 1) AS win_percentage,
  race_dnfs,
  
  -- Classification
  phenotype_value,
  phenotype_bias,
  
  -- Club affiliation
  club_name,
  club_bg_color,
  club_text_color,
  
  -- Physical
  weight / 1000.0 AS weight_kg,
  height AS height_cm,
  
  -- Category stats (window functions)
  COUNT(*) OVER (PARTITION BY event_id, category) AS riders_in_category,
  AVG(race_rating) OVER (PARTITION BY event_id, category) AS avg_category_rating,
  STDDEV(race_rating) OVER (PARTITION BY event_id, category) AS rating_stddev,
  
  -- Ranking within category (by race rating)
  ROW_NUMBER() OVER (
    PARTITION BY event_id, category 
    ORDER BY race_rating DESC NULLS LAST
  ) AS predicted_position,
  
  -- Percentile within category
  PERCENT_RANK() OVER (
    PARTITION BY event_id, category 
    ORDER BY race_rating
  ) AS rating_percentile,
  
  -- Data freshness
  fetched_at AS last_updated

FROM api_zwiftracing_api_events_signups
ORDER BY event_id, category, predicted_position;

COMMENT ON VIEW v_event_signup_preview IS 
  'Event signup details with predicted positions and power profiles. PRE-RACE ANALYSIS GOLDMINE! 
   Used by: EventPreviewPage (pre-race analysis).
   Test: SELECT * FROM v_event_signup_preview WHERE rider_id = 150437;';


-- ============================================================================
-- VIEW 6: Power Rankings Leaderboard
-- ============================================================================
-- Source: ZwiftRacing clubs
-- Used by: PowerRankingsPage
-- ============================================================================

CREATE OR REPLACE VIEW v_power_rankings AS
SELECT 
  COALESCE(zo.rider_id, zr.rider_id) AS rider_id,
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name) AS full_name,
  
  -- Physical
  COALESCE(zo.weight / 1000.0, zr.weight) AS weight_kg,
  COALESCE(zo.ftp, zr.ftp) AS ftp_watts,
  ROUND(COALESCE(zo.ftp, zr.ftp)::NUMERIC / NULLIF(COALESCE(zo.weight / 1000.0, zr.weight), 0), 2) AS ftp_wkg,
  
  -- Sprint (5s) - only from ZwiftRacing
  zr.power_5s AS sprint_watts,
  zr.power_5s_wkg AS sprint_wkg,
  ROW_NUMBER() OVER (ORDER BY zr.power_5s DESC NULLS LAST) AS sprint_rank_absolute,
  ROW_NUMBER() OVER (ORDER BY zr.power_5s_wkg DESC NULLS LAST) AS sprint_rank_relative,
  
  -- 15s power
  zr.power_15s AS power_15s_watts,
  zr.power_15s_wkg AS power_15s_wkg,
  
  -- 1-min (VO2max)
  zr.power_60s AS vo2max_watts,
  zr.power_60s_wkg AS vo2max_wkg,
  ROW_NUMBER() OVER (ORDER BY zr.power_60s DESC NULLS LAST) AS vo2max_rank_absolute,
  ROW_NUMBER() OVER (ORDER BY zr.power_60s_wkg DESC NULLS LAST) AS vo2max_rank_relative,
  
  -- 5-min (Anaerobic threshold)
  zr.power_300s AS anaerobic_watts,
  zr.power_300s_wkg AS anaerobic_wkg,
  ROW_NUMBER() OVER (ORDER BY zr.power_300s DESC NULLS LAST) AS anaerobic_rank_absolute,
  ROW_NUMBER() OVER (ORDER BY zr.power_300s_wkg DESC NULLS LAST) AS anaerobic_rank_relative,
  
  -- 20-min (FTP)
  zr.power_1200s AS ftp_20min_watts,
  zr.power_1200s_wkg AS ftp_20min_wkg,
  ROW_NUMBER() OVER (ORDER BY zr.power_1200s DESC NULLS LAST) AS ftp_rank_absolute,
  ROW_NUMBER() OVER (ORDER BY zr.power_1200s_wkg DESC NULLS LAST) AS ftp_rank_relative,
  
  -- Phenotype
  zr.phenotype,
  
  -- Avatar
  zo.image_src AS avatar_url,
  
  -- Racing Scores for context
  zr.velo,
  zr.racing_score AS zwiftracing_score,
  zo.competition_racing_score AS zwift_official_racing_score

FROM api_zwift_api_profiles zo
FULL OUTER JOIN api_zwiftracing_public_clubs_riders zr ON zo.rider_id = zr.rider_id
WHERE zr.power_5s IS NOT NULL OR zr.power_1200s IS NOT NULL OR zo.ftp IS NOT NULL
ORDER BY COALESCE(zr.velo, zo.competition_racing_score, 0) DESC NULLS LAST;

COMMENT ON VIEW v_power_rankings IS 
  'Power leaderboards for all durations (absolute + relative w/kg).
   Shows riders with ANY power data (ZwiftRacing power curve OR Zwift Official FTP).
   NO club_id filtering - works for custom team composition.
   Used by: PowerRankingsPage.
   Test: SELECT * FROM v_power_rankings WHERE rider_id = 150437;';


-- ============================================================================
-- VIEW 7: Event Results Leaderboard
-- ============================================================================
-- Source: ZwiftRacing results + riders
-- Used by: ResultsPage
-- ============================================================================

CREATE OR REPLACE VIEW v_event_results AS
SELECT 
  r.event_id,
  r.rider_id,
  r.position,
  r.category,
  r.finish_time,
  
  -- Time formatting
  CASE 
    WHEN r.finish_time IS NOT NULL THEN
      LPAD((r.finish_time / 3600)::TEXT, 2, '0') || ':' ||
      LPAD(((r.finish_time % 3600) / 60)::TEXT, 2, '0') || ':' ||
      LPAD((r.finish_time % 60)::TEXT, 2, '0')
    ELSE NULL
  END AS finish_time_formatted,
  
  r.time_gap,
  
  -- Rider info from clubs table
  cr.name AS rider_name,
  cr.velo,
  
  -- Avatar from Official
  p.image_src AS rider_avatar,
  
  -- Power data
  r.avg_power,
  r.max_power,
  r.normalized_power,
  ROUND(r.avg_power::NUMERIC / NULLIF(cr.weight, 0), 2) AS avg_wkg,
  
  -- Event info
  e.title AS event_name,
  e.start_time AS event_date,
  e.distance / 1000.0 AS event_distance_km,
  
  -- Data freshness
  r.fetched_at AS last_updated

FROM api_zwiftracing_public_results r
LEFT JOIN api_zwiftracing_public_clubs_riders cr ON r.rider_id = cr.rider_id
LEFT JOIN api_zwift_api_profiles p ON r.rider_id = p.rider_id
LEFT JOIN api_zwiftracing_api_events_upcoming e ON r.event_id = e.event_id
ORDER BY r.event_id, r.category, r.position;

COMMENT ON VIEW v_event_results IS 
  'Event results with rider info and performance data. 
   Used by: ResultsPage.
   Test: SELECT * FROM v_event_results WHERE rider_id = 150437;';


-- ============================================================================
-- VIEW 8: Social Network Graph (Optional)
-- ============================================================================
-- Source: Zwift Official followers + followees
-- Used by: SocialNetworkPage
-- ============================================================================

CREATE OR REPLACE VIEW v_social_network AS
SELECT 
  p.rider_id,
  p.first_name || ' ' || p.last_name AS name,
  p.image_src AS avatar_url,
  
  -- Follower stats
  (SELECT COUNT(*) 
   FROM api_zwift_api_profiles_followers f 
   WHERE f.rider_id = p.rider_id) AS followers_count,
  
  (SELECT COUNT(*) 
   FROM api_zwift_api_profiles_followees f 
   WHERE f.rider_id = p.rider_id) AS following_count,
  
  -- Mutual connections
  (
    SELECT COUNT(*) 
    FROM api_zwift_api_profiles_followers f1
    INNER JOIN api_zwift_api_profiles_followees f2 
      ON f1.follower_id = f2.followee_id 
      AND f1.rider_id = f2.rider_id
    WHERE f1.rider_id = p.rider_id
  ) AS mutual_connections,
  
  -- Team connections (followers who are in ANY club)
  (
    SELECT COUNT(DISTINCT f.follower_id)
    FROM api_zwift_api_profiles_followers f
    INNER JOIN api_zwiftracing_public_clubs_riders cr 
      ON f.follower_id = cr.rider_id
    WHERE f.rider_id = p.rider_id
  ) AS team_followers,
  
  -- Profile info
  p.country_alpha3,
  p.achievement_level

FROM api_zwift_api_profiles p;

COMMENT ON VIEW v_social_network IS 
  'Social network stats and team connections. 
   Used by: SocialNetworkPage (optional feature).
   Test: SELECT * FROM v_social_network WHERE rider_id = 150437;';


-- ============================================================================
-- VIEW 9: Dashboard Summary Stats
-- ============================================================================
-- Source: ZwiftRacing.app + Zwift Official API aggregated
-- Used by: MainDashboard (overview cards)
-- ============================================================================

CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT 
  -- Team stats (all riders with data from either source)
  (SELECT COUNT(DISTINCT rider_id) FROM v_rider_complete) AS total_riders,
  (SELECT COUNT(*) FROM api_zwift_api_profiles) AS total_zwift_profiles,
  (SELECT COUNT(*) FROM api_zwiftracing_public_clubs_riders) AS total_racing_profiles,
  (SELECT ROUND(AVG(velo), 0) FROM api_zwiftracing_public_clubs_riders) AS avg_velo,
  (SELECT ROUND(AVG(competition_racing_score), 0) FROM api_zwift_api_profiles WHERE competition_racing_score IS NOT NULL) AS avg_zwift_racing_score,
  
  -- Upcoming races
  (SELECT COUNT(*) FROM api_zwiftracing_api_events_upcoming WHERE start_time > NOW()) AS upcoming_races_count,
  (SELECT COUNT(*) FROM api_zwiftracing_api_events_upcoming WHERE start_time BETWEEN NOW() AND NOW() + INTERVAL '24 hours') AS races_today,
  
  -- Recent activity
  (SELECT COUNT(*) FROM api_zwift_api_profiles_activities WHERE start_date > NOW() - INTERVAL '7 days') AS activities_last_7_days,
  (SELECT SUM(distance_meters) / 1000.0 FROM api_zwift_api_profiles_activities WHERE start_date > NOW() - INTERVAL '7 days') AS total_km_last_7_days,
  
  -- Data freshness
  (SELECT MAX(fetched_at) FROM api_zwiftracing_public_clubs_riders) AS last_rider_sync,
  (SELECT MAX(fetched_at) FROM api_zwiftracing_api_events_upcoming) AS last_event_sync;

COMMENT ON VIEW v_dashboard_summary IS 
  'Aggregated summary stats for main dashboard overview cards. 
   Used by: MainDashboard (top KPI cards).
   Test: SELECT * FROM v_dashboard_summary;';


-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;


-- ============================================================================
-- TEST QUERIES (Run after data sync)
-- ============================================================================

-- Test rider: 150437 (Jeroen Diepenbroek)

-- Test 1: Complete profile
-- SELECT * FROM v_rider_complete WHERE rider_id = 150437;

-- Test 2: Team rankings
-- SELECT * FROM v_team_rankings LIMIT 10;

-- Test 3: Activities feed
-- SELECT * FROM v_activities_feed WHERE rider_id = 150437 LIMIT 10;

-- Test 4: Upcoming races
-- SELECT * FROM v_race_calendar LIMIT 20;

-- Test 5: Event signups (find events rider 150437 is signed up for)
-- SELECT * FROM v_event_signup_preview WHERE rider_id = 150437;

-- Test 6: Power rankings
-- SELECT * FROM v_power_rankings WHERE rider_id = 150437;

-- Test 7: Dashboard summary
-- SELECT * FROM v_dashboard_summary;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
DECLARE
  view_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name LIKE 'v_%';
  
  RAISE NOTICE 'Created % hybrid views for frontend', view_count;
END $$;
