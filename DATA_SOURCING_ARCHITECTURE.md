# 🗄️ Data Sourcing Architecture - 1:1 API to Database Mapping

**Datum**: 8 december 2025  
**Principe**: Elke API endpoint → Eigen source tabel → Hybride views voor frontend

---

## 📊 Sourcing Strategy Overview

```
┌─────────────────────────────────────────────────────────┐
│                    API ENDPOINTS                        │
│                     (Sources)                           │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓ 1:1 Mapping
┌─────────────────────────────────────────────────────────┐
│               SOURCE TABLES                             │
│          (Exact copy of API data)                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓ JOIN + Transform
┌─────────────────────────────────────────────────────────┐
│               HYBRID VIEWS                              │
│         (Combined data for frontend)                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓ Used by
┌─────────────────────────────────────────────────────────┐
│            FRONTEND DASHBOARDS                          │
│         (React components consume views)                │
└─────────────────────────────────────────────────────────┘
```

---

## 1️⃣ ZWIFTRACING.APP - Source Tables

### Source 1: Individual Rider Data
**API**: `GET /public/riders/{id}`  
**Frequency**: On-demand (5/min limit)  
**Fields**: 51

```sql
-- TABLE NAME = API endpoint name
CREATE TABLE api_zwiftracing_riders (
  -- Meta
  rider_id INTEGER PRIMARY KEY,
  source_api TEXT DEFAULT 'zwiftracing.app',
  endpoint TEXT DEFAULT '/public/riders/{id}',
  fetched_at TIMESTAMP DEFAULT NOW(),
  
  -- API Response (51 fields) - Exact copy
  id INTEGER NOT NULL,
  name TEXT,
  velo DECIMAL(10,2),
  racing_score DECIMAL(10,2),
  
  -- Power absolute
  ftp INTEGER,
  power_5s INTEGER,
  power_15s INTEGER,
  power_30s INTEGER,
  power_60s INTEGER,
  power_120s INTEGER,
  power_300s INTEGER,
  power_1200s INTEGER,
  
  -- Power relative (w/kg)
  power_5s_wkg DECIMAL(5,2),
  power_15s_wkg DECIMAL(5,2),
  power_30s_wkg DECIMAL(5,2),
  power_60s_wkg DECIMAL(5,2),
  power_120s_wkg DECIMAL(5,2),
  power_300s_wkg DECIMAL(5,2),
  power_1200s_wkg DECIMAL(5,2),
  
  -- Physical
  weight DECIMAL(5,2),
  height INTEGER,
  
  -- Classification
  phenotype TEXT,
  category TEXT,
  
  -- Stats
  race_count INTEGER,
  
  -- Raw JSON backup
  raw_response JSONB
);

CREATE INDEX idx_zwiftracing_riders_velo ON api_zwiftracing_riders(velo DESC);
CREATE INDEX idx_zwiftracing_riders_fetched ON api_zwiftracing_riders(fetched_at);
```

**Sync**: Manual/on-demand per rider

---

### Source 2: Bulk Rider Data
**API**: `POST /public/riders/bulk`  
**Frequency**: Every 15 minutes  
**Fields**: 51 (same as individual)

```sql
-- TABLE NAME = API endpoint name
CREATE TABLE api_zwiftracing_riders_bulk (
  -- Meta
  rider_id INTEGER PRIMARY KEY,
  source_api TEXT DEFAULT 'zwiftracing.app',
  endpoint TEXT DEFAULT '/public/riders/bulk',
  bulk_request_id UUID,
  fetched_at TIMESTAMP DEFAULT NOW(),
  
  -- API Response (51 fields) - SAME structure as individual
  id INTEGER NOT NULL,
  name TEXT,
  velo DECIMAL(10,2),
  racing_score DECIMAL(10,2),
  
  -- ... same 51 fields as api_zwiftracing_riders ...
  
  raw_response JSONB
);

-- Track bulk requests
CREATE TABLE api_zwiftracing_bulk_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_at TIMESTAMP DEFAULT NOW(),
  rider_ids INTEGER[],
  total_riders INTEGER,
  successful_count INTEGER,
  failed_count INTEGER,
  duration_ms INTEGER
);
```

**Sync**: Automated cron job (every 15 min)

---

### Source 3: Club/Team Data
**API**: `GET /public/clubs/{id}` ⭐ PREFERRED  
**Alternative**: `GET /public/teams/{id}`  
**Frequency**: Every 60 minutes (rate limit!)

```sql
-- TABLE NAME = API endpoint name
CREATE TABLE api_zwiftracing_clubs (
  -- Meta
  club_id INTEGER PRIMARY KEY,
  source_api TEXT DEFAULT 'zwiftracing.app',
  endpoint TEXT DEFAULT '/public/clubs/{id}',
  fetched_at TIMESTAMP DEFAULT NOW(),
  
  -- API Response
  id INTEGER NOT NULL,
  name TEXT,
  description TEXT,
  member_count INTEGER,
  
  raw_response JSONB
);

-- Club members with FULL rider data (51 fields each!)
CREATE TABLE api_zwiftracing_club_riders (
  -- Meta
  club_id INTEGER,
  rider_id INTEGER PRIMARY KEY,
  source_api TEXT DEFAULT 'zwiftracing.app',
  endpoint TEXT DEFAULT '/public/clubs/{id}',
  fetched_at TIMESTAMP DEFAULT NOW(),
  
  -- FULL 51 rider fields (same as /public/riders)
  id INTEGER NOT NULL,
  name TEXT,
  velo DECIMAL(10,2),
  racing_score DECIMAL(10,2),
  
  -- Power absolute
  ftp INTEGER,
  power_5s INTEGER,
  power_15s INTEGER,
  power_30s INTEGER,
  power_60s INTEGER,
  power_120s INTEGER,
  power_300s INTEGER,
  power_1200s INTEGER,
  
  -- Power relative (w/kg)
  power_5s_wkg DECIMAL(5,2),
  power_15s_wkg DECIMAL(5,2),
  power_30s_wkg DECIMAL(5,2),
  power_60s_wkg DECIMAL(5,2),
  power_120s_wkg DECIMAL(5,2),
  power_300s_wkg DECIMAL(5,2),
  power_1200s_wkg DECIMAL(5,2),
  
  -- Physical
  weight DECIMAL(5,2),
  height INTEGER,
  
  -- Classification
  phenotype TEXT,
  category TEXT,
  
  -- Stats
  race_count INTEGER,
  
  raw_response JSONB,
  
  FOREIGN KEY (club_id) REFERENCES api_zwiftracing_clubs(club_id)
);

-- Pagination support for clubs > 1000 members
CREATE TABLE api_zwiftracing_club_pagination (
  club_id INTEGER,
  last_rider_id INTEGER,
  page_number INTEGER,
  fetched_at TIMESTAMP DEFAULT NOW(),
  member_count INTEGER,
  
  PRIMARY KEY (club_id, page_number)
);
```

**Sync**: Every 60 minutes (Standard rate limit: 1/60min)  
**Pagination**: For clubs > 1000 members, use `/public/clubs/{id}/{lastRiderId}`

---

### Source 4: Upcoming Events
**API**: `GET /api/events/upcoming`  
**Frequency**: Every hour

```sql
-- TABLE NAME = API endpoint name
CREATE TABLE api_zwiftracing_events_upcoming (
  -- Meta
  event_id TEXT PRIMARY KEY,
  source_api TEXT DEFAULT 'zwiftracing.app',
  endpoint TEXT DEFAULT '/api/events/upcoming',
  fetched_at TIMESTAMP DEFAULT NOW(),
  
  -- API Response
  time BIGINT,                    -- Unix timestamp
  start_time TIMESTAMP,            -- Converted timestamp
  route_id TEXT,
  distance INTEGER,                -- meters
  title TEXT,
  num_laps TEXT,
  type TEXT,                       -- Race/Workout/GroupRide
  sub_type TEXT,                   -- Scratch/Points/TT
  staggered_start BOOLEAN,
  categories TEXT,                 -- "A,B,C,D,E"
  signups TEXT,                    -- "25,34,57,44,16"
  
  raw_response JSONB
);

CREATE INDEX idx_events_upcoming_start ON api_zwiftracing_events_upcoming(start_time);
CREATE INDEX idx_events_upcoming_type ON api_zwiftracing_events_upcoming(type);
```

**Sync**: Hourly cron job

---

### Source 5: Event Signups
**API**: `GET /api/events/{eventId}/signups`  
**Frequency**: On-demand (when viewing event)

```sql
-- TABLE NAME = API endpoint name
CREATE TABLE api_zwiftracing_event_signups (
  -- Meta
  signup_id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  rider_id INTEGER NOT NULL,
  category TEXT NOT NULL,          -- A/B/C/D/E
  source_api TEXT DEFAULT 'zwiftracing.app',
  endpoint TEXT DEFAULT '/api/events/{id}/signups',
  fetched_at TIMESTAMP DEFAULT NOW(),
  
  -- Rider data from signup (50+ fields)
  name TEXT,
  
  -- Power
  wkg5 DECIMAL(5,2),
  wkg15 DECIMAL(5,2),
  wkg30 DECIMAL(5,2),
  wkg60 DECIMAL(5,2),
  wkg120 DECIMAL(5,2),
  wkg300 DECIMAL(5,2),
  wkg1200 DECIMAL(5,2),
  w5 INTEGER,
  w15 INTEGER,
  w30 INTEGER,
  w60 INTEGER,
  w120 INTEGER,
  w300 INTEGER,
  w1200 INTEGER,
  
  -- Race stats
  race_rating DECIMAL(10,2),
  race_finishes INTEGER,
  race_wins INTEGER,
  race_podiums INTEGER,
  race_dnfs INTEGER,
  
  -- Physical
  weight INTEGER,
  height INTEGER,
  
  -- Classification
  phenotype_value TEXT,
  phenotype_bias DECIMAL(5,2),
  
  -- Club
  club_id INTEGER,
  club_name TEXT,
  club_bg_color TEXT,
  club_text_color TEXT,
  club_border_color TEXT,
  
  raw_response JSONB,
  
  UNIQUE(event_id, rider_id, category)
);

CREATE INDEX idx_event_signups_event ON api_zwiftracing_event_signups(event_id);
CREATE INDEX idx_event_signups_rider ON api_zwiftracing_event_signups(rider_id);
CREATE INDEX idx_event_signups_category ON api_zwiftracing_event_signups(category);
```

**Sync**: On-demand when user views event page

---

### Source 6: Event Results
**API**: `GET /public/results/{eventId}`  
**Frequency**: After event completion

```sql
-- TABLE NAME = API endpoint name
CREATE TABLE api_zwiftracing_event_results (
  -- Meta
  result_id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  rider_id INTEGER NOT NULL,
  source_api TEXT DEFAULT 'zwiftracing.app',
  endpoint TEXT DEFAULT '/public/results/{id}',
  fetched_at TIMESTAMP DEFAULT NOW(),
  
  -- Results data (structure TBD - needs testing)
  position INTEGER,
  category TEXT,
  finish_time INTEGER,           -- seconds
  
  raw_response JSONB,
  
  UNIQUE(event_id, rider_id)
);

CREATE INDEX idx_event_results_event ON api_zwiftracing_event_results(event_id);
CREATE INDEX idx_event_results_rider ON api_zwiftracing_event_results(rider_id);
```

**Sync**: Post-race webhook or scheduled check

---

## 2️⃣ ZWIFT OFFICIAL API - Source Tables

### Source 7: Profile Data
**API**: `GET /profiles/{id}`  
**Frequency**: Daily  
**Fields**: 92

```sql
-- TABLE NAME = API endpoint name
CREATE TABLE api_zwift_profiles (
  -- Meta
  rider_id INTEGER PRIMARY KEY,
  source_api TEXT DEFAULT 'zwift.com',
  endpoint TEXT DEFAULT '/api/profiles/{id}',
  fetched_at TIMESTAMP DEFAULT NOW(),
  
  -- API Response (92 fields)
  id INTEGER NOT NULL,
  public_id TEXT,
  first_name TEXT,
  last_name TEXT,
  
  -- Avatar
  image_src TEXT,
  image_src_large TEXT,
  
  -- Demographics
  male BOOLEAN,
  age INTEGER,
  country_code INTEGER,
  country_alpha3 TEXT,
  
  -- Physical (in grams/mm from API)
  weight INTEGER,                  -- grams
  height INTEGER,                  -- cm
  ftp INTEGER,
  
  -- Social
  followers_count INTEGER,
  followees_count INTEGER,
  rideons_given INTEGER,
  
  -- Achievements
  achievement_level INTEGER,
  total_distance BIGINT,           -- meters
  total_elevation BIGINT,          -- meters
  
  -- Privacy
  privacy_profile BOOLEAN,
  privacy_activities BOOLEAN,
  privacy_display_weight BOOLEAN,
  privacy_display_age BOOLEAN,
  
  -- Status
  riding BOOLEAN,
  world_id INTEGER,
  
  raw_response JSONB
);

CREATE INDEX idx_zwift_profiles_fetched ON api_zwift_profiles(fetched_at);
```

**Sync**: Daily cron job

---

### Source 8: Activities Data
**API**: `GET /profiles/{id}/activities`  
**Frequency**: On-demand  
**Fields**: 28 per activity

```sql
-- TABLE NAME = API endpoint name
CREATE TABLE api_zwift_activities (
  -- Meta
  activity_id BIGINT PRIMARY KEY,
  rider_id INTEGER NOT NULL,
  source_api TEXT DEFAULT 'zwift.com',
  endpoint TEXT DEFAULT '/api/profiles/{id}/activities',
  fetched_at TIMESTAMP DEFAULT NOW(),
  
  -- API Response (28 fields)
  id BIGINT NOT NULL,
  id_str TEXT,
  profile_id INTEGER,
  name TEXT,
  
  -- Timing
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  moving_time_ms BIGINT,
  
  -- Distance
  distance_meters DECIMAL(10,2),
  total_elevation DECIMAL(10,2),
  
  -- Power
  avg_watts INTEGER,
  max_watts INTEGER,
  
  -- Energy
  calories DECIMAL(10,2),
  
  -- Social
  rideon_count INTEGER,
  comment_count INTEGER,
  
  -- World
  world_id INTEGER,
  
  -- Files
  fit_file_key TEXT,
  
  -- Privacy
  privacy TEXT,
  
  raw_response JSONB,
  
  FOREIGN KEY (rider_id) REFERENCES api_zwift_profiles(rider_id)
);

CREATE INDEX idx_zwift_activities_rider ON api_zwift_activities(rider_id);
CREATE INDEX idx_zwift_activities_date ON api_zwift_activities(start_date DESC);
```

**Sync**: On-demand when viewing rider profile

---

### Source 9: Followers Data
**API**: `GET /profiles/{id}/followers`  
**Frequency**: Weekly (optional)

```sql
-- TABLE NAME = API endpoint name
CREATE TABLE api_zwift_followers (
  -- Meta
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL,          -- followee (person being followed)
  follower_id INTEGER NOT NULL,       -- follower (person following)
  source_api TEXT DEFAULT 'zwift.com',
  endpoint TEXT DEFAULT '/api/profiles/{id}/followers',
  fetched_at TIMESTAMP DEFAULT NOW(),
  
  -- API Response
  status TEXT,                         -- "IS_FOLLOWING"
  is_favorite BOOLEAN,
  
  -- Follower profile summary (nested)
  follower_name TEXT,
  follower_avatar TEXT,
  follower_country_code INTEGER,
  follower_followers_count INTEGER,
  follower_followees_count INTEGER,
  followees_in_common INTEGER,
  
  raw_response JSONB,
  
  UNIQUE(rider_id, follower_id)
);

CREATE INDEX idx_zwift_followers_rider ON api_zwift_followers(rider_id);
CREATE INDEX idx_zwift_followers_fetched ON api_zwift_followers(fetched_at);
```

**Sync**: Weekly cron job (optional feature)

---

### Source 10: Followees Data
**API**: `GET /profiles/{id}/followees`  
**Frequency**: Weekly (optional)

```sql
-- TABLE NAME = API endpoint name
CREATE TABLE api_zwift_followees (
  -- Meta
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL,          -- follower (person following)
  followee_id INTEGER NOT NULL,       -- followee (person being followed)
  source_api TEXT DEFAULT 'zwift.com',
  endpoint TEXT DEFAULT '/api/profiles/{id}/followees',
  fetched_at TIMESTAMP DEFAULT NOW(),
  
  -- API Response
  status TEXT,
  is_favorite BOOLEAN,
  
  -- Followee profile summary (nested)
  followee_name TEXT,
  followee_avatar TEXT,
  followee_country_code INTEGER,
  followee_followers_count INTEGER,
  followee_followees_count INTEGER,
  followees_in_common INTEGER,
  
  raw_response JSONB,
  
  UNIQUE(rider_id, followee_id)
);

CREATE INDEX idx_zwift_followees_rider ON api_zwift_followees(rider_id);
```

**Sync**: Weekly cron job (optional feature)

---

## 3️⃣ HYBRID VIEWS - Frontend Data Layer

### View 1: Complete Rider Profile (Main)
**Purpose**: Alles voor rider profile page  
**Combines**: ZwiftRacing riders + Zwift Official profiles

```sql
CREATE OR REPLACE VIEW v_rider_complete AS
SELECT 
  -- Identity (prefer Zwift Official for official data)
  COALESCE(zr.rider_id, zo.rider_id) AS rider_id,
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name) AS full_name,
  zr.name AS racing_name,
  
  -- Racing Metrics (only from ZwiftRacing)
  zr.velo,
  zr.racing_score,
  zr.phenotype,
  zr.category,
  zr.race_count,
  
  -- Power Curve (only from ZwiftRacing)
  zr.ftp AS racing_ftp,
  zr.power_5s, zr.power_15s, zr.power_30s, zr.power_60s,
  zr.power_120s, zr.power_300s, zr.power_1200s,
  zr.power_5s_wkg, zr.power_15s_wkg, zr.power_30s_wkg,
  zr.power_60s_wkg, zr.power_120s_wkg, zr.power_300s_wkg,
  zr.power_1200s_wkg,
  
  -- Physical (prefer Official for accuracy)
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
  zo.male,
  zo.country_code,
  zo.country_alpha3,
  
  -- Achievements (only from Official)
  zo.achievement_level,
  zo.total_distance / 1000.0 AS total_distance_km,
  zo.total_elevation AS total_elevation_m,
  
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

FROM api_zwiftracing_riders_bulk zr
FULL OUTER JOIN api_zwift_profiles zo ON zr.rider_id = zo.rider_id;

-- Add comment
COMMENT ON VIEW v_rider_complete IS 
  'Hybrid view combining ZwiftRacing (racing data) + Zwift Official (social/avatar). 
   Used by: RiderProfilePage';
```

**Used by**: `RiderProfilePage` component

---

### View 2: Team Rankings
**Purpose**: Team dashboard met rankings  
**Combines**: ZwiftRacing bulk + Official avatars

```sql
CREATE OR REPLACE VIEW v_team_rankings AS
SELECT 
  zr.rider_id,
  zr.name,
  zr.velo,
  zr.racing_score,
  zr.ftp,
  zr.weight,
  zr.phenotype,
  zr.category,
  zr.race_count,
  
  -- Avatar from Official
  zo.image_src AS avatar_url,
  
  -- Rankings
  ROW_NUMBER() OVER (ORDER BY zr.velo DESC) AS velo_rank,
  ROW_NUMBER() OVER (ORDER BY zr.racing_score DESC) AS score_rank,
  
  -- Performance grade
  CASE 
    WHEN zr.velo >= 1500 THEN 'S'
    WHEN zr.velo >= 1400 THEN 'A+'
    WHEN zr.velo >= 1300 THEN 'A'
    WHEN zr.velo >= 1200 THEN 'B+'
    WHEN zr.velo >= 1100 THEN 'B'
    ELSE 'C'
  END AS performance_grade,
  
  -- Team membership
  tr.team_id,
  t.name AS team_name
  
FROM api_zwiftracing_riders_bulk zr
INNER JOIN api_zwiftracing_team_riders tr ON zr.rider_id = tr.rider_id
INNER JOIN api_zwiftracing_teams t ON tr.team_id = t.team_id
LEFT JOIN api_zwift_profiles zo ON zr.rider_id = zo.rider_id
WHERE t.team_id = 11818  -- TeamNL Cloud9
ORDER BY zr.velo DESC;

COMMENT ON VIEW v_team_rankings IS 
  'Team leaderboard ranked by vELO with avatars. 
   Used by: TeamDashboard (main page)';
```

**Used by**: `TeamDashboard` component

---

### View 3: Recent Activities Feed
**Purpose**: Activity timeline met rider info  
**Combines**: Zwift activities + profiles

```sql
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
  ROUND(a.avg_watts::NUMERIC / (p.weight / 1000.0), 2) AS avg_wkg,
  a.calories,
  
  -- Social engagement
  a.rideon_count,
  a.comment_count,
  
  -- World
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
  
  a.fit_file_key
  
FROM api_zwift_activities a
INNER JOIN api_zwift_profiles p ON a.rider_id = p.rider_id
ORDER BY a.start_date DESC;

COMMENT ON VIEW v_activities_feed IS 
  'Recent activities with rider info and performance metrics. 
   Used by: ActivityFeedPage, RiderProfilePage (activities tab)';
```

**Used by**: `ActivityFeedPage`, `RiderProfilePage`

---

### View 4: Upcoming Races Calendar
**Purpose**: Race calendar met event details  
**Source**: ZwiftRacing events

```sql
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
  
  -- Parse signup counts
  SPLIT_PART(signups, ',', 1)::INTEGER AS signups_a,
  SPLIT_PART(signups, ',', 2)::INTEGER AS signups_b,
  SPLIT_PART(signups, ',', 3)::INTEGER AS signups_c,
  SPLIT_PART(signups, ',', 4)::INTEGER AS signups_d,
  SPLIT_PART(signups, ',', 5)::INTEGER AS signups_e,
  
  -- Total signups
  (SPLIT_PART(signups, ',', 1)::INTEGER + 
   SPLIT_PART(signups, ',', 2)::INTEGER + 
   SPLIT_PART(signups, ',', 3)::INTEGER + 
   SPLIT_PART(signups, ',', 4)::INTEGER + 
   SPLIT_PART(signups, ',', 5)::INTEGER) AS total_signups,
  
  -- Flags
  staggered_start,
  
  -- Time until race
  EXTRACT(EPOCH FROM (start_time - NOW())) / 3600 AS hours_until_start
  
FROM api_zwiftracing_events_upcoming
WHERE start_time > NOW()
ORDER BY start_time ASC;

COMMENT ON VIEW v_race_calendar IS 
  'Upcoming races with signup counts and time until start. 
   Used by: RaceCalendarPage';
```

**Used by**: `RaceCalendarPage` component

---

### View 5: Event Signup Preview
**Purpose**: Pre-race analysis - who's racing?  
**Source**: ZwiftRacing event signups

```sql
CREATE OR REPLACE VIEW v_event_signup_preview AS
SELECT 
  event_id,
  category,
  
  -- Rider details
  rider_id,
  name AS rider_name,
  
  -- Power profile
  wkg5, wkg15, wkg30, wkg60, wkg120, wkg300, wkg1200,
  w5, w15, w30, w60, w120, w300, w1200,
  
  -- Race stats
  race_rating,
  race_finishes,
  race_wins,
  race_podiums,
  
  -- Classification
  phenotype_value,
  
  -- Club
  club_name,
  club_bg_color,
  club_text_color,
  
  -- Physical
  weight,
  height,
  
  -- Category stats
  COUNT(*) OVER (PARTITION BY event_id, category) AS riders_in_category,
  AVG(race_rating) OVER (PARTITION BY event_id, category) AS avg_category_rating,
  
  -- Ranking within category
  ROW_NUMBER() OVER (
    PARTITION BY event_id, category 
    ORDER BY race_rating DESC
  ) AS predicted_position

FROM api_zwiftracing_event_signups
ORDER BY event_id, category, predicted_position;

COMMENT ON VIEW v_event_signup_preview IS 
  'Event signup details with predicted positions based on rating. 
   Used by: EventPreviewPage (pre-race analysis)';
```

**Used by**: `EventPreviewPage` component

---

### View 6: Power Rankings
**Purpose**: Power leaderboards  
**Source**: ZwiftRacing riders

```sql
CREATE OR REPLACE VIEW v_power_rankings AS
SELECT 
  rider_id,
  name,
  
  -- FTP
  ftp,
  weight,
  ROUND(ftp::NUMERIC / weight, 2) AS ftp_wkg,
  
  -- Sprint (5s)
  power_5s,
  power_5s_wkg,
  ROW_NUMBER() OVER (ORDER BY power_5s DESC) AS sprint_rank_absolute,
  ROW_NUMBER() OVER (ORDER BY power_5s_wkg DESC) AS sprint_rank_relative,
  
  -- 1-min (VO2max)
  power_60s,
  power_60s_wkg,
  ROW_NUMBER() OVER (ORDER BY power_60s DESC) AS vo2max_rank_absolute,
  ROW_NUMBER() OVER (ORDER BY power_60s_wkg DESC) AS vo2max_rank_relative,
  
  -- 5-min (Anaerobic)
  power_300s,
  power_300s_wkg,
  ROW_NUMBER() OVER (ORDER BY power_300s DESC) AS anaerobic_rank_absolute,
  ROW_NUMBER() OVER (ORDER BY power_300s_wkg DESC) AS anaerobic_rank_relative,
  
  -- 20-min (FTP)
  power_1200s,
  power_1200s_wkg,
  ROW_NUMBER() OVER (ORDER BY power_1200s DESC) AS ftp_rank_absolute,
  ROW_NUMBER() OVER (ORDER BY power_1200s_wkg DESC) AS ftp_rank_relative,
  
  -- Phenotype
  phenotype,
  
  -- Avatar
  (SELECT image_src FROM api_zwift_profiles p WHERE p.rider_id = r.rider_id) AS avatar_url

FROM api_zwiftracing_riders_bulk r
WHERE rider_id IN (
  SELECT rider_id FROM api_zwiftracing_team_riders WHERE team_id = 11818
);

COMMENT ON VIEW v_power_rankings IS 
  'Power leaderboards for all durations (absolute + relative). 
   Used by: PowerRankingsPage';
```

**Used by**: `PowerRankingsPage` component

---

### View 7: Social Network Graph (Optional)
**Purpose**: Follower network visualization  
**Combines**: Followers + followees

```sql
CREATE OR REPLACE VIEW v_social_network AS
SELECT 
  rider_id,
  
  -- Follower stats
  (SELECT COUNT(*) FROM api_zwift_followers f WHERE f.rider_id = p.rider_id) AS followers_count,
  (SELECT COUNT(*) FROM api_zwift_followees f WHERE f.rider_id = p.rider_id) AS following_count,
  
  -- Mutual connections
  (
    SELECT COUNT(*) 
    FROM api_zwift_followers f1
    INNER JOIN api_zwift_followees f2 
      ON f1.follower_id = f2.followee_id 
      AND f1.rider_id = f2.rider_id
    WHERE f1.rider_id = p.rider_id
  ) AS mutual_connections,
  
  -- Team connections
  (
    SELECT COUNT(DISTINCT f.follower_id)
    FROM api_zwift_followers f
    INNER JOIN api_zwiftracing_team_riders tr 
      ON f.follower_id = tr.rider_id
    WHERE f.rider_id = p.rider_id 
      AND tr.team_id = 11818
  ) AS team_followers,
  
  -- Profile info
  first_name || ' ' || last_name AS name,
  image_src AS avatar_url

FROM api_zwift_profiles p;

COMMENT ON VIEW v_social_network IS 
  'Social network stats and team connections. 
   Used by: SocialNetworkPage (optional feature)';
```

**Used by**: `SocialNetworkPage` (optional)

---

## 🔄 Sync Strategy & Schedule

### Automated Syncs (Cron Jobs)

```typescript
// ============================================================================
// HIGH FREQUENCY: Every 15 minutes
// ============================================================================
cron.schedule('*/15 * * * *', async () => {
  // CRITICAL: Bulk rider data for team
  await syncBulkRiders([...80_team_rider_ids]);
  // Populates: api_zwiftracing_riders_bulk
});


// ============================================================================
// MEDIUM FREQUENCY: Hourly
// ============================================================================
cron.schedule('0 * * * *', async () => {
  // Event calendar
  await syncUpcomingEvents();
  // Populates: api_zwiftracing_events_upcoming
});


// ============================================================================
// MEDIUM FREQUENCY: Every 60 minutes (rate limit!)
// ============================================================================
cron.schedule('0 * * * *', async () => {
  // Club roster with FULL rider data (replaces bulk!)
  await syncClubRiders(11818);
  // Populates: api_zwiftracing_clubs, api_zwiftracing_club_riders
  // Returns: 51 fields × up to 1000 members
  // NOTE: This is MORE efficient than bulk POST (same data, fewer calls)
});


// ============================================================================
// LOW FREQUENCY: Daily (4 AM)
// ============================================================================
cron.schedule('0 4 * * *', async () => {
  // Official profiles (avatars, social stats)
  for (const riderId of team_rider_ids) {
    await syncZwiftProfile(riderId);
    await sleep(1000); // Rate limit: 1/sec
  }
  // Populates: api_zwift_profiles
});


// ============================================================================
// OPTIONAL: Weekly (social features)
// ============================================================================
cron.schedule('0 2 * * 0', async () => {
  // Followers/followees (if enabled)
  for (const riderId of team_rider_ids) {
    await syncFollowers(riderId);
    await syncFollowees(riderId);
    await sleep(2000); // Rate limit: 1/2sec
  }
  // Populates: api_zwift_followers, api_zwift_followees
});
```

---

### On-Demand Syncs (User Actions)

```typescript
// ============================================================================
// TRIGGER: User views rider profile page
// ============================================================================
app.get('/api/riders/:id/profile', async (req, res) => {
  const riderId = req.params.id;
  
  // Check if data is stale (> 1 hour old)
  const profile = await db.query(
    'SELECT * FROM api_zwift_profiles WHERE rider_id = $1 AND fetched_at > NOW() - INTERVAL \'1 hour\'',
    [riderId]
  );
  
  if (!profile.rows.length) {
    // Fetch fresh data
    await syncZwiftProfile(riderId);
  }
  
  // Return from view
  const complete = await db.query(
    'SELECT * FROM v_rider_complete WHERE rider_id = $1',
    [riderId]
  );
  
  res.json(complete.rows[0]);
});


// ============================================================================
// TRIGGER: User views rider activity feed
// ============================================================================
app.get('/api/riders/:id/activities', async (req, res) => {
  const riderId = req.params.id;
  
  // Always fetch fresh activities (quick endpoint)
  await syncRiderActivities(riderId, 20);
  
  // Return from view
  const activities = await db.query(
    'SELECT * FROM v_activities_feed WHERE rider_id = $1 LIMIT 20',
    [riderId]
  );
  
  res.json(activities.rows);
});


// ============================================================================
// TRIGGER: User views event preview page
// ============================================================================
app.get('/api/events/:eventId/preview', async (req, res) => {
  const eventId = req.params.eventId;
  
  // Check if signups already fetched (last 10 min)
  const cached = await db.query(
    'SELECT COUNT(*) FROM api_zwiftracing_event_signups WHERE event_id = $1 AND fetched_at > NOW() - INTERVAL \'10 minutes\'',
    [eventId]
  );
  
  if (cached.rows[0].count === 0) {
    // Fetch signups
    await syncEventSignups(eventId);
  }
  
  // Return from view
  const preview = await db.query(
    'SELECT * FROM v_event_signup_preview WHERE event_id = $1',
    [eventId]
  );
  
  res.json(preview.rows);
});
```

---

## 📊 Summary Table

| Source Table | API Endpoint | Sync Frequency | Records | Use Case |
|--------------|--------------|----------------|---------|----------|
| `api_zwiftracing_clubs` | GET /clubs/{id} | 60 min | 1 | Club info |
| `api_zwiftracing_club_riders` | GET /clubs/{id} | 60 min | 80-1000 | **PRIMARY SOURCE** ⭐ |
| `api_zwiftracing_riders_bulk` | POST /riders/bulk | On-demand | 1000 | Backup/補完 |
| `api_zwiftracing_events_upcoming` | GET /events/upcoming | Hourly | 856 | Calendar |
| `api_zwiftracing_event_signups` | GET /events/{id}/signups | On-demand | Varies | Pre-race |
| `api_zwiftracing_event_results` | GET /results/{id} | Post-race | Varies | Results |
| `api_zwift_profiles` | GET /profiles/{id} | Daily | 80 | Avatars |
| `api_zwift_activities` | GET /profiles/{id}/activities | On-demand | 20/rider | Feed |
| `api_zwift_followers` | GET /profiles/{id}/followers | Weekly | Optional | Social |
| `api_zwift_followees` | GET /profiles/{id}/followees | Weekly | Optional | Social |

**Total Source Tables**: 10  
**Hybrid Views**: 7  
**Frontend Components**: 9

---

## ✅ Implementation Checklist

### Week 1: Core Racing Infrastructure
- [ ] Create 6 ZwiftRacing source tables
- [ ] Implement bulk sync (15 min cron)
- [ ] Create `v_rider_complete` hybrid view
- [ ] Create `v_team_rankings` hybrid view
- [ ] Build TeamDashboard component
- [ ] Build RiderProfilePage component

### Week 2: Social & Avatar Enrichment
- [ ] Create 2 Zwift Official source tables (profiles, activities)
- [ ] Implement daily profile sync
- [ ] Implement on-demand activity sync
- [ ] Create `v_activities_feed` hybrid view
- [ ] Build ActivityFeedPage component

### Week 3: Events & Calendar
- [ ] Add events source tables
- [ ] Implement hourly event sync
- [ ] Create `v_race_calendar` hybrid view
- [ ] Create `v_event_signup_preview` hybrid view
- [ ] Build RaceCalendarPage component
- [ ] Build EventPreviewPage component

### Week 4: Optional Features
- [ ] Add followers/followees tables (optional)
- [ ] Create `v_social_network` hybrid view
- [ ] Create `v_power_rankings` hybrid view
- [ ] Build PowerRankingsPage component
- [ ] Build SocialNetworkPage component (optional)

---

## 🎯 Key Principles

1. **1:1 API → Table Mapping**
   - Table name mirrors endpoint: `api_{source}_{endpoint_path}`
   - Exact field replication from API
   - Always store raw JSON backup

2. **Source Tables = Raw Data**
   - No transformations in source tables
   - Include metadata (source_api, endpoint, fetched_at)
   - Enable data lineage tracking

3. **Hybrid Views = Frontend Layer**
   - Combine multiple sources
   - Transform/compute derived fields
   - Optimize for component needs
   - Add comments explaining usage

4. **Sync Strategy = Smart Frequency**
   - Critical data: 15 min (bulk riders)
   - Supporting data: Hourly/daily
   - User-triggered: On-demand with caching
   - Optional features: Weekly or disabled

5. **Rate Limit Awareness**
   - ZwiftRacing bulk: 1/15min (perfect match!)
   - ZwiftRacing individual: 5/min
   - Zwift Official: 1/sec recommended
   - Always add sleep() between requests

---

**Next Step**: Implement Week 1 - Core racing infrastructure?
