# 🌐 Complete API Endpoints Overzicht - Alle 3 APIs

**Datum**: 8 december 2025  
**Status**: ✅ Volledig getest  
**Test Rider**: 150437 (JRøne CloudRacer-9 @YouTube)

---

## 📊 Executive Summary

| API | Werkende Endpoints | Status | Prioriteit |
|-----|-------------------|--------|------------|
| **ZwiftRacing.app** | 3/3 | ✅ 100% | 🏆 PRIMARY |
| **Zwift Official** | 2/2 | ✅ 100% | ⭐ ENRICHMENT |
| **ZwiftPower** | 1/7 | ⚠️ 14% | ❌ SKIP |

---

## 1️⃣ ZWIFTRACING.APP API - Primary Source

### Base URL
```
https://zwift-ranking.herokuapp.com
```

### Authentication
```bash
Authorization: 650c6d2fc4ef6858d74cbef1
```

---

### ✅ ENDPOINT 1: Individual Rider Profile

**URL Pattern**:
```
GET /public/riders/{riderId}
```

**Purpose**: Volledige racing data voor 1 rider

**Data**: 51 velden
- vELO rating (uniek)
- Racing score
- Power curve (7 durations: 5s, 15s, 30s, 60s, 120s, 300s, 1200s)
- FTP
- Weight, height
- Race count
- Phenotype classification
- Category

**Rate Limit**: 5 requests/min

**Example**:
```bash
curl "https://zwift-ranking.herokuapp.com/public/riders/150437" \
  -H "Authorization: 650c6d2fc4ef6858d74cbef1"
```

**Response Sample**:
```json
{
  "id": 150437,
  "name": "JRøne | CloudRacer-9 @YouTube",
  "velo": 1247.02,
  "racingScore": 56.40,
  "ftp": 241,
  "weight": 78.7,
  "power15s": 576,
  "power60s": 383,
  "phenotype": "Sprinter",
  "raceCount": 425
}
```

**Database Table**: `zwift_racing_riders`  
**View**: `v_rider_profile` (individual)  
**Dashboard**: "Rider Profile" page

---

### ✅ ENDPOINT 2: Bulk Riders

**URL Pattern**:
```
POST /public/riders/bulk
Content-Type: application/json
```

**Purpose**: Bulk fetch voor meerdere riders (MOST IMPORTANT!)

**Data**: 51 velden per rider (zelfde als endpoint 1)

**Rate Limit**: 1 request per 15 minutes

**Max Riders**: 1000 per call

**Request Body**:
```json
{
  "ids": [150437, 123456, 789012, ...]
}
```

**Example**:
```bash
curl -X POST "https://zwift-ranking.herokuapp.com/public/riders/bulk" \
  -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  -H "Content-Type: application/json" \
  -d '{"ids": [150437, 123456, 789012]}'
```

**Response**:
```json
[
  {
    "id": 150437,
    "name": "JRøne | CloudRacer-9 @YouTube",
    "velo": 1247.02,
    ...
  },
  {
    "id": 123456,
    ...
  }
]
```

**Database Table**: `zwift_racing_riders` (bulk insert/update)  
**View**: `v_team_rankings` (all riders sorted)  
**Dashboard**: "Team Dashboard" (main page with 80 riders)

---

### ✅ ENDPOINT 3: Team Riders

**URL Pattern**:
```
GET /public/teams/{teamId}
```

**Purpose**: Lijst van alle riders in een team

**Data**: Team info + rider IDs list

**Example**:
```bash
curl "https://zwift-ranking.herokuapp.com/public/teams/11818" \
  -H "Authorization: 650c6d2fc4ef6858d74cbef1"
```

**Response**:
```json
{
  "id": 11818,
  "name": "TeamNL Cloud9",
  "riders": [
    {
      "id": 150437,
      "name": "JRøne | CloudRacer-9 @YouTube",
      "velo": 1247.02
    },
    // ... 79 more riders
  ]
}
```

**Database Table**: `team_riders` (mapping table)  
**View**: `v_team_roster`  
**Dashboard**: "Team Roster" management page

---

## 2️⃣ ZWIFT OFFICIAL API - Enrichment Source

### Base URL
```
https://us-or-rly101.zwift.com/api
```

### Authentication
```bash
Authorization: Bearer {oauth_token}

# Get token:
POST https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token
  client_id=Zwift_Mobile_Link
  username=jeroen.diepenbroek@gmail.com
  password=CloudRacer-9
  grant_type=password
```

**Token Lifetime**: 6 hours (21600s)  
**Refresh**: 24 hours (86400s)

---

### ✅ ENDPOINT 1: Rider Profile

**URL Pattern**:
```
GET /profiles/{zwiftId}
```

**Purpose**: Official profile met social stats en avatars

**Data**: 92 velden
- Avatar URLs (high-res)
- Followers/followees counts
- RideOns given/received
- Total distance, elevation
- Achievement level
- Age, gender, country
- Weight, height, FTP
- Racing score
- Privacy settings

**Rate Limit**: Unknown (wees conservatief, max 1/sec)

**Example**:
```bash
curl "https://us-or-rly101.zwift.com/api/profiles/150437" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response Sample**:
```json
{
  "id": 150437,
  "publicId": "c123...",
  "firstName": "JRøne",
  "lastName": "CloudRacer-9",
  "imageSrc": "https://static-cdn.zwift.com/prod/profile/...",
  "imageSrcLarge": "https://static-cdn.zwift.com/prod/profile/...",
  "male": true,
  "countryCode": 158,
  "age": 51,
  "weight": 80720,
  "height": 174,
  "ftp": 248,
  "followerStatusOfLoggedInPlayer": {
    "followersCount": 4259,
    "followeesCount": 1
  },
  "totalGiveRideons": 16373,
  "achievementLevel": 37,
  "totalDistance": 51813109,
  "totalDistanceClimbed": 1071867
}
```

**Database Table**: `zwift_official_profiles`  
**View**: `v_rider_social` (social stats only)  
**Dashboard**: "Rider Profile" page (avatar + social section)

---

### ✅ ENDPOINT 2: Rider Activities

**URL Pattern**:
```
GET /profiles/{zwiftId}/activities?start={offset}&limit={count}
```

**Purpose**: Recent activities/races met details

**Data**: 28 velden per activity
- Activity ID, name
- Start/end dates
- Distance, elevation
- Duration (moving time)
- Average watts, max watts
- Calories burned
- RideOns count
- Comment count
- World ID
- FIT file download URL
- Privacy flags
- **BONUS**: Nested 92-field profile per activity

**Rate Limit**: Unknown

**Default Limit**: 20 activities

**Example**:
```bash
curl "https://us-or-rly101.zwift.com/api/profiles/150437/activities?start=0&limit=10" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response Sample**:
```json
[
  {
    "id_str": "3857086858394112772",
    "id": 3857086858394112772,
    "profileId": 150437,
    "name": "Zwift - Race: Zwift Epic Race - Snowman (B) on Snowman in Watopia",
    "startDate": "2025-12-06T14:56:44.732+0000",
    "endDate": "2025-12-06T16:13:23.732+0000",
    "distanceInMeters": 44571.9,
    "totalElevation": 584.712,
    "avgWatts": 213.04,
    "maxWatts": 679,
    "calories": 966.0,
    "activityRideOnCount": 133,
    "activityCommentCount": 0,
    "movingTimeInMs": 4639281,
    "worldId": 1,
    "fitFileKey": "https://cdn.zwift.com/fit/...",
    "profile": {
      // Full 92-field profile nested here
    }
  }
  // ... more activities
]
```

**Database Table**: `zwift_activities`  
**View**: `v_rider_recent_activities`  
**Dashboard**: "Activity Feed" / "Rider History" page

---

## 3️⃣ ZWIFTPOWER API - Historical Only (SKIP)

### Base URL
```
https://zwiftpower.com
```

### Authentication
```python
# Requires Python library
pip install zpdatafetch

from zpdatafetch import ZP
with ZP() as zp:
    zp.login()  # Uses keyring
```

---

### ❌ ENDPOINT 1: Profile Results (Empty)

**URL Pattern**:
```
GET /api3.php?do=profile_results&zwift_id={riderId}
```

**Status**: ⚠️ Returns empty data array

**Example**:
```bash
# Via library only
data = zp.fetch_json("https://zwiftpower.com/api3.php?do=profile_results&zwift_id=150437")
```

**Response**:
```json
{
  "data": []
}
```

**Conclusion**: ❌ DON'T USE

---

### ✅ ENDPOINT 2: Rider History (ONLY WORKING ONE!)

**URL Pattern**:
```
GET /cache3/profile/{riderId}_all.json
```

**Purpose**: Complete race history (historical archive)

**Data**: 85 velden per race × 427 races
- Race positions (overall + category)
- Timing (finish time, gap to leader)
- Power metrics (avg, FTP, w/kg)
- Heart rate (6 metrics)
- Physical stats (weight, height)
- Team info + colors (RGB hex)
- Event details
- Skill ratings

**Status**: ✅ WORKS via library

**Example**:
```python
from zpdatafetch import ZP

with ZP() as zp:
    zp.login()
    data = zp.fetch_json(
        "https://zwiftpower.com/cache3/profile/150437_all.json"
    )
    races = data['data']  # 427 race entries
```

**Response Sample**:
```json
{
  "data": [
    {
      "zwid": 150437,
      "name": "JRøne | CloudRacer-9 @YouTube",
      "pos": 31,
      "position_in_cat": 31,
      "category": "E",
      "ftp": "241",
      "avg_power": [160, 0],
      "avg_wkg": ["2.1", 0],
      "weight": ["76.0", 0],
      "tname": "TeamNL",
      "tc": "ffffff",
      "tbc": "ffa500",
      "event_title": "Group Workout: GC Coachings Ham Sandwich",
      "event_date": 1509886800,
      "time": [3424.545, 0],
      "gap": 4.622
    }
    // ... 426 more races
  ]
}
```

**Database Table**: `zwift_power_race_history` (OPTIONAL)  
**View**: `v_rider_historical_races` (OPTIONAL)  
**Dashboard**: "Historical Analysis" (OPTIONAL - manual only)

**Recommendation**: ❌ **SKIP** - Too complex, use for manual analysis only

---

### ❌ ENDPOINT 3-7: All Blocked

**Failed Endpoints**:
```
❌ /cache3/results/{riderId}_all.json       → 403 Forbidden
❌ /cache3/stats/{riderId}_all.json         → 403 Forbidden
❌ /api3.php?do=rider_results&zwift_id=...  → Empty response
❌ /api3.php?do=rider_info&zwift_id=...     → Empty response
❌ /profile.php?z={riderId}                 → HTML (not JSON)
```

**Conclusion**: ZwiftPower heeft geen betrouwbare API, skip volledig

---

## 🗄️ Database Schema - Tabel & View Naming Convention

### Naming Strategy

**Principe**: API endpoint → Database table → View → Dashboard  
**Pattern**: Consistente naming voor herkenbaarheid

```
API Endpoint Name
    ↓
Database Table Name (snake_case)
    ↓
View Name (v_{purpose}_{context})
    ↓
Dashboard/Page Name (PascalCase)
```

---

## 📋 Complete Mapping Table

| API Endpoint | Database Table | View Name | Dashboard/Component | Sync Freq |
|--------------|----------------|-----------|---------------------|-----------|
| **ZwiftRacing.app** | | | | |
| `GET /public/riders/{id}` | `zwift_racing_riders` | `v_rider_profile` | RiderProfilePage | 15 min |
| `POST /public/riders/bulk` | `zwift_racing_riders` | `v_team_rankings` | TeamDashboard | 15 min |
| `GET /public/teams/{id}` | `team_riders` | `v_team_roster` | TeamRosterPage | Daily |
| **Zwift Official** | | | | |
| `GET /profiles/{id}` | `zwift_official_profiles` | `v_rider_social` | RiderProfilePage (social) | Daily |
| `GET /profiles/{id}/activities` | `zwift_activities` | `v_rider_recent_activities` | ActivityFeedPage | On-demand |
| **ZwiftPower** | | | | |
| `/cache3/profile/{id}_all.json` | `zwift_power_race_history` | `v_rider_historical_races` | HistoricalAnalysis | SKIP |

---

## 🏗️ Proposed Database Schema

### Core Tables (Source Data)

```sql
-- ============================================================================
-- ZWIFT RACING RIDERS (Primary Source)
-- Endpoint: POST /public/riders/bulk
-- Sync: Every 15 minutes (bulk for all 80 TeamNL riders)
-- ============================================================================
CREATE TABLE zwift_racing_riders (
  -- Identity
  rider_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  
  -- Racing Metrics (unique to ZwiftRacing)
  velo DECIMAL(10,2),              -- vELO rating (1247.02)
  racing_score DECIMAL(10,2),      -- Racing score (56.40)
  
  -- Power Data
  ftp INTEGER,                      -- Functional Threshold Power (241W)
  power_5s INTEGER,                 -- 5-second max power (576W)
  power_15s INTEGER,                -- 15-second max power (576W)
  power_30s INTEGER,                -- 30-second max power (483W)
  power_60s INTEGER,                -- 1-minute max power (383W)
  power_120s INTEGER,               -- 2-minute max power (311W)
  power_300s INTEGER,               -- 5-minute max power (290W)
  power_1200s INTEGER,              -- 20-minute max power (244W)
  
  -- Power Relative (w/kg)
  power_5s_wkg DECIMAL(5,2),       -- 7.31 w/kg
  power_15s_wkg DECIMAL(5,2),      -- 7.31 w/kg
  power_30s_wkg DECIMAL(5,2),      -- 6.13 w/kg
  power_60s_wkg DECIMAL(5,2),      -- 4.87 w/kg
  power_120s_wkg DECIMAL(5,2),     -- 3.95 w/kg
  power_300s_wkg DECIMAL(5,2),     -- 3.68 w/kg
  power_1200s_wkg DECIMAL(5,2),    -- 3.10 w/kg
  
  -- Physical
  weight DECIMAL(5,2),              -- 78.7 kg
  height INTEGER,                   -- 174 cm
  
  -- Classification
  phenotype TEXT,                   -- "Sprinter"
  category TEXT,                    -- "B"
  
  -- Stats
  race_count INTEGER,               -- 425 races
  
  -- Metadata
  last_synced TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_velo CHECK (velo >= 0),
  CONSTRAINT valid_weight CHECK (weight > 0),
  CONSTRAINT valid_ftp CHECK (ftp > 0)
);

CREATE INDEX idx_racing_velo ON zwift_racing_riders(velo DESC);
CREATE INDEX idx_racing_score ON zwift_racing_riders(racing_score DESC);
CREATE INDEX idx_racing_synced ON zwift_racing_riders(last_synced);


-- ============================================================================
-- ZWIFT OFFICIAL PROFILES (Enrichment Source)
-- Endpoint: GET /profiles/{id}
-- Sync: Daily or on-demand (when viewing rider profile)
-- ============================================================================
CREATE TABLE zwift_official_profiles (
  -- Identity
  rider_id INTEGER PRIMARY KEY,
  public_id TEXT,                   -- Zwift public UUID
  first_name TEXT,
  last_name TEXT,
  
  -- Avatar URLs
  avatar_url TEXT,                  -- Standard resolution
  avatar_url_large TEXT,            -- High resolution
  
  -- Demographics
  male BOOLEAN,
  age INTEGER,
  country_code INTEGER,             -- 158 = Netherlands
  
  -- Physical (official)
  weight INTEGER,                   -- 80720 grams = 80.72 kg
  height INTEGER,                   -- 174 cm
  ftp INTEGER,                      -- 248W (official)
  
  -- Social Metrics
  followers_count INTEGER,          -- 4259 followers
  followees_count INTEGER,          -- 1 followee
  rideons_given INTEGER,            -- 16373 total
  
  -- Achievements
  achievement_level INTEGER,        -- 37
  total_distance BIGINT,            -- 51813109 meters
  total_elevation BIGINT,           -- 1071867 meters
  
  -- Privacy
  privacy_profile BOOLEAN,
  privacy_activities BOOLEAN,
  
  -- Metadata
  last_synced TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_age CHECK (age > 0 AND age < 150),
  CONSTRAINT valid_followers CHECK (followers_count >= 0)
);

CREATE INDEX idx_official_synced ON zwift_official_profiles(last_synced);


-- ============================================================================
-- ZWIFT ACTIVITIES (Event Details)
-- Endpoint: GET /profiles/{id}/activities
-- Sync: On-demand (when viewing rider activity feed)
-- ============================================================================
CREATE TABLE zwift_activities (
  -- Identity
  activity_id BIGINT PRIMARY KEY,
  rider_id INTEGER NOT NULL,
  
  -- Event Info
  name TEXT NOT NULL,               -- "Zwift - Race: Snowman (B)..."
  world_id INTEGER,                 -- 1 = Watopia
  
  -- Timing
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  moving_time_ms BIGINT,            -- 4639281 ms = 77 min
  
  -- Distance & Elevation
  distance_meters DECIMAL(10,2),    -- 44571.9 m = 44.6 km
  elevation_meters DECIMAL(10,2),   -- 584.712 m
  
  -- Power
  avg_watts INTEGER,                -- 213W
  max_watts INTEGER,                -- 679W
  
  -- Energy
  calories DECIMAL(10,2),           -- 966.0
  
  -- Social
  rideon_count INTEGER,             -- 133 RideOns
  comment_count INTEGER,            -- 0 comments
  
  -- Files
  fit_file_url TEXT,                -- FIT file download link
  
  -- Privacy
  privacy TEXT,                     -- "private", "public", "followers"
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (rider_id) REFERENCES zwift_racing_riders(rider_id),
  
  CONSTRAINT valid_distance CHECK (distance_meters >= 0),
  CONSTRAINT valid_watts CHECK (avg_watts > 0)
);

CREATE INDEX idx_activities_rider ON zwift_activities(rider_id);
CREATE INDEX idx_activities_date ON zwift_activities(start_date DESC);
CREATE INDEX idx_activities_rideons ON zwift_activities(rideon_count DESC);


-- ============================================================================
-- TEAM RIDERS (Mapping Table)
-- Endpoint: GET /public/teams/{id}
-- Sync: Daily (team composition changes rarely)
-- ============================================================================
CREATE TABLE team_riders (
  team_id INTEGER NOT NULL,
  rider_id INTEGER NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  
  PRIMARY KEY (team_id, rider_id),
  FOREIGN KEY (rider_id) REFERENCES zwift_racing_riders(rider_id)
);

CREATE INDEX idx_team_riders_team ON team_riders(team_id);
```

---

## 📊 Views (Dashboard Data)

### View 1: Rider Profile (Complete)
**Purpose**: Single rider met alle data (racing + social)  
**Dashboard**: RiderProfilePage

```sql
CREATE VIEW v_rider_profile AS
SELECT 
  -- Identity
  r.rider_id,
  r.name,
  
  -- Racing Metrics
  r.velo,
  r.racing_score,
  r.ftp AS racing_ftp,
  r.race_count,
  r.phenotype,
  r.category,
  
  -- Power Curve
  r.power_5s, r.power_15s, r.power_30s, r.power_60s,
  r.power_120s, r.power_300s, r.power_1200s,
  r.power_5s_wkg, r.power_15s_wkg, r.power_30s_wkg,
  r.power_60s_wkg, r.power_120s_wkg, r.power_300s_wkg,
  r.power_1200s_wkg,
  
  -- Physical (prefer Official for accuracy)
  COALESCE(o.weight / 1000.0, r.weight) AS weight_kg,
  COALESCE(o.height, r.height) AS height_cm,
  COALESCE(o.ftp, r.ftp) AS ftp_watts,
  
  -- Social (from Official)
  o.avatar_url,
  o.avatar_url_large,
  o.followers_count,
  o.followees_count,
  o.rideons_given,
  o.achievement_level,
  o.total_distance / 1000.0 AS total_distance_km,
  o.total_elevation AS total_elevation_m,
  
  -- Demographics
  o.age,
  o.male,
  o.country_code,
  
  -- Sync Status
  r.last_synced AS racing_synced,
  o.last_synced AS official_synced
  
FROM zwift_racing_riders r
LEFT JOIN zwift_official_profiles o ON r.rider_id = o.rider_id;
```

**Query**:
```sql
-- Get complete rider profile
SELECT * FROM v_rider_profile WHERE rider_id = 150437;
```

---

### View 2: Team Rankings
**Purpose**: Alle TeamNL riders gesorteerd op vELO  
**Dashboard**: TeamDashboard (main page)

```sql
CREATE VIEW v_team_rankings AS
SELECT 
  r.rider_id,
  r.name,
  r.velo,
  r.racing_score,
  r.ftp,
  r.weight,
  r.phenotype,
  r.category,
  r.race_count,
  o.avatar_url,
  
  -- Rank
  ROW_NUMBER() OVER (ORDER BY r.velo DESC) AS velo_rank,
  ROW_NUMBER() OVER (ORDER BY r.racing_score DESC) AS score_rank,
  
  -- Performance Grade
  CASE 
    WHEN r.velo >= 1500 THEN 'S'
    WHEN r.velo >= 1400 THEN 'A+'
    WHEN r.velo >= 1300 THEN 'A'
    WHEN r.velo >= 1200 THEN 'B+'
    WHEN r.velo >= 1100 THEN 'B'
    ELSE 'C'
  END AS performance_grade
  
FROM zwift_racing_riders r
LEFT JOIN zwift_official_profiles o ON r.rider_id = o.rider_id
INNER JOIN team_riders t ON r.rider_id = t.rider_id
WHERE t.team_id = 11818  -- TeamNL Cloud9
ORDER BY r.velo DESC;
```

**Query**:
```sql
-- Get all team members ranked
SELECT * FROM v_team_rankings;

-- Top 10 riders
SELECT * FROM v_team_rankings LIMIT 10;
```

---

### View 3: Rider Recent Activities
**Purpose**: Recent races/rides met social engagement  
**Dashboard**: ActivityFeedPage

```sql
CREATE VIEW v_rider_recent_activities AS
SELECT 
  a.activity_id,
  a.rider_id,
  r.name AS rider_name,
  o.avatar_url,
  
  -- Activity Details
  a.name AS activity_name,
  a.start_date,
  a.distance_meters / 1000.0 AS distance_km,
  a.elevation_meters AS elevation_m,
  a.moving_time_ms / 60000.0 AS duration_minutes,
  
  -- Performance
  a.avg_watts,
  a.max_watts,
  ROUND(a.avg_watts::NUMERIC / (o.weight / 1000.0), 2) AS avg_wkg,
  a.calories,
  
  -- Social
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
  
  a.fit_file_url
  
FROM zwift_activities a
INNER JOIN zwift_racing_riders r ON a.rider_id = r.rider_id
LEFT JOIN zwift_official_profiles o ON a.rider_id = o.rider_id
ORDER BY a.start_date DESC;
```

**Query**:
```sql
-- Get rider's last 10 activities
SELECT * FROM v_rider_recent_activities 
WHERE rider_id = 150437 
LIMIT 10;

-- Get team's recent activities
SELECT * FROM v_rider_recent_activities 
WHERE rider_id IN (SELECT rider_id FROM team_riders WHERE team_id = 11818)
ORDER BY start_date DESC
LIMIT 20;
```

---

### View 4: Team Roster
**Purpose**: Team members lijst  
**Dashboard**: TeamRosterPage

```sql
CREATE VIEW v_team_roster AS
SELECT 
  t.team_id,
  t.rider_id,
  r.name,
  r.velo,
  r.racing_score,
  r.category,
  o.avatar_url,
  o.country_code,
  t.joined_at
  
FROM team_riders t
INNER JOIN zwift_racing_riders r ON t.rider_id = r.rider_id
LEFT JOIN zwift_official_profiles o ON t.rider_id = o.rider_id
ORDER BY r.name;
```

**Query**:
```sql
-- Get all team members
SELECT * FROM v_team_roster WHERE team_id = 11818;
```

---

### View 5: Power Rankings
**Purpose**: Riders gesorteerd op power metrics  
**Dashboard**: PowerRankingsPage

```sql
CREATE VIEW v_power_rankings AS
SELECT 
  r.rider_id,
  r.name,
  r.ftp,
  r.weight,
  ROUND(r.ftp::NUMERIC / r.weight, 2) AS ftp_wkg,
  
  -- Sprint Power
  r.power_5s,
  r.power_5s_wkg,
  ROW_NUMBER() OVER (ORDER BY r.power_5s DESC) AS sprint_rank,
  
  -- 1-min Power
  r.power_60s,
  r.power_60s_wkg,
  ROW_NUMBER() OVER (ORDER BY r.power_60s DESC) AS vo2max_rank,
  
  -- 5-min Power
  r.power_300s,
  r.power_300s_wkg,
  ROW_NUMBER() OVER (ORDER BY r.power_300s DESC) AS anaerobic_rank,
  
  -- 20-min Power (FTP proxy)
  r.power_1200s,
  r.power_1200s_wkg,
  ROW_NUMBER() OVER (ORDER BY r.power_1200s DESC) AS ftp_rank,
  
  -- Phenotype
  r.phenotype,
  o.avatar_url
  
FROM zwift_racing_riders r
LEFT JOIN zwift_official_profiles o ON r.rider_id = o.rider_id
INNER JOIN team_riders t ON r.rider_id = t.rider_id
WHERE t.team_id = 11818
ORDER BY r.power_60s DESC;
```

**Query**:
```sql
-- Get power rankings
SELECT * FROM v_power_rankings;

-- Top sprinters
SELECT * FROM v_power_rankings ORDER BY sprint_rank LIMIT 10;

-- Top climbers (best w/kg)
SELECT * FROM v_power_rankings ORDER BY ftp_wkg DESC LIMIT 10;
```

---

## 🔄 Sync Strategy Per Endpoint

### Automated Syncs

```typescript
// ============================================================================
// BULK SYNC: ZwiftRacing Riders (Every 15 minutes)
// ============================================================================
async function syncTeamRacingData() {
  const teamRiderIds = await db.query(
    'SELECT rider_id FROM team_riders WHERE team_id = $1',
    [11818]
  );
  
  // One bulk call for all 80 riders
  const racingData = await zwiftRacingAPI.bulkFetch(
    teamRiderIds.map(r => r.rider_id)
  );
  
  // Upsert to database
  for (const rider of racingData) {
    await db.query(`
      INSERT INTO zwift_racing_riders (
        rider_id, name, velo, racing_score, ftp, weight,
        power_5s, power_15s, power_30s, power_60s, 
        power_120s, power_300s, power_1200s,
        power_5s_wkg, power_15s_wkg, power_30s_wkg,
        power_60s_wkg, power_120s_wkg, power_300s_wkg,
        power_1200s_wkg, height, phenotype, category,
        race_count, last_synced
      ) VALUES ($1, $2, $3, ..., NOW())
      ON CONFLICT (rider_id) DO UPDATE SET
        velo = EXCLUDED.velo,
        racing_score = EXCLUDED.racing_score,
        -- ... all fields
        last_synced = NOW()
    `, [rider.id, rider.name, ...]);
  }
  
  console.log(`✅ Synced ${racingData.length} riders from ZwiftRacing.app`);
}

// Run every 15 minutes
setInterval(syncTeamRacingData, 15 * 60 * 1000);


// ============================================================================
// DAILY SYNC: Zwift Official Profiles
// ============================================================================
async function syncOfficialProfiles() {
  const riders = await db.query(
    'SELECT rider_id FROM team_riders WHERE team_id = $1',
    [11818]
  );
  
  for (const rider of riders) {
    try {
      const profile = await zwiftOfficialAPI.getProfile(rider.rider_id);
      
      await db.query(`
        INSERT INTO zwift_official_profiles (
          rider_id, public_id, first_name, last_name,
          avatar_url, avatar_url_large, male, age, country_code,
          weight, height, ftp, followers_count, followees_count,
          rideons_given, achievement_level, total_distance,
          total_elevation, last_synced
        ) VALUES ($1, $2, $3, ..., NOW())
        ON CONFLICT (rider_id) DO UPDATE SET
          -- ... all fields
          last_synced = NOW()
      `, [profile.id, profile.publicId, ...]);
      
      // Rate limit: 1 per second
      await sleep(1000);
    } catch (error) {
      console.error(`Failed to sync rider ${rider.rider_id}:`, error);
    }
  }
  
  console.log('✅ Synced official profiles');
}

// Run once per day (4 AM)
cron.schedule('0 4 * * *', syncOfficialProfiles);


// ============================================================================
// ON-DEMAND: Activities (when viewing rider page)
// ============================================================================
async function fetchRiderActivities(riderId: number, limit = 10) {
  const activities = await zwiftOfficialAPI.getActivities(riderId, limit);
  
  for (const activity of activities) {
    await db.query(`
      INSERT INTO zwift_activities (
        activity_id, rider_id, name, world_id,
        start_date, end_date, moving_time_ms,
        distance_meters, elevation_meters,
        avg_watts, max_watts, calories,
        rideon_count, comment_count, fit_file_url
      ) VALUES ($1, $2, $3, ..., NOW())
      ON CONFLICT (activity_id) DO UPDATE SET
        rideon_count = EXCLUDED.rideon_count,
        comment_count = EXCLUDED.comment_count
    `, [activity.id, riderId, ...]);
  }
  
  return activities;
}
```

---

## 📱 Dashboard → View → Table Mapping

### Dashboard 1: Team Dashboard (Main Page)
**Route**: `/`

**Data Source**: `v_team_rankings` view

**Features**:
- 80 TeamNL riders ranked by vELO
- Avatar display
- Performance grades (S/A+/A/B+/B/C)
- Quick stats (FTP, weight, race count)
- Search & filter

**API Sync**: ZwiftRacing bulk (15 min) + Zwift Official (daily)

---

### Dashboard 2: Rider Profile Page
**Route**: `/rider/:id`

**Data Source**: `v_rider_profile` view

**Features**:
- Complete rider info (racing + social)
- Avatar (high-res)
- Power curve chart (7 durations)
- Social stats (followers, RideOns)
- Recent activities list (from `v_rider_recent_activities`)

**API Sync**: On page load (if data > 1 hour old)

---

### Dashboard 3: Activity Feed
**Route**: `/activities`

**Data Source**: `v_rider_recent_activities` view

**Features**:
- Team's recent rides/races (last 50)
- RideOn counts
- Distance, elevation, watts
- World badges
- Filter by rider/world/date

**API Sync**: On-demand (when viewing)

---

### Dashboard 4: Power Rankings
**Route**: `/rankings/power`

**Data Source**: `v_power_rankings` view

**Features**:
- Sprint leaderboard (5s power)
- VO2max leaderboard (1min power)
- FTP leaderboard (20min power)
- Phenotype distribution
- w/kg rankings

**API Sync**: ZwiftRacing bulk (15 min)

---

### Dashboard 5: Team Roster
**Route**: `/roster`

**Data Source**: `v_team_roster` view

**Features**:
- All team members list
- Add/remove members
- Invite links
- Member management

**API Sync**: Daily team fetch

---

## ✅ Complete Endpoint Summary

### Working Endpoints: 5 total

| # | API | Endpoint | Status | Priority | Data Fields | Sync |
|---|-----|----------|--------|----------|-------------|------|
| 1 | ZwiftRacing | `POST /public/riders/bulk` | ✅ | 🏆 CRITICAL | 51 | 15 min |
| 2 | ZwiftRacing | `GET /public/riders/{id}` | ✅ | ⭐ HIGH | 51 | On-demand |
| 3 | ZwiftRacing | `GET /public/teams/{id}` | ✅ | ⭐ HIGH | Team + IDs | Daily |
| 4 | Zwift Official | `GET /profiles/{id}` | ✅ | ⭐ HIGH | 92 | Daily |
| 5 | Zwift Official | `GET /profiles/{id}/activities` | ✅ | ⚠️ MEDIUM | 28 per activity | On-demand |

### Skipped Endpoints: 7 total (ZwiftPower)

All ZwiftPower endpoints marked as ❌ SKIP due to complexity and redundancy.

---

## 🎯 Implementation Priority

### Week 1: Core Racing Data
- ✅ Setup tables: `zwift_racing_riders`, `team_riders`
- ✅ Implement bulk sync (15 min interval)
- ✅ Create `v_team_rankings` view
- ✅ Build Team Dashboard

### Week 2: Profile Enrichment
- ✅ Setup table: `zwift_official_profiles`
- ✅ Implement daily sync
- ✅ Create `v_rider_profile` view
- ✅ Build Rider Profile page with avatars

### Week 3: Activities
- ✅ Setup table: `zwift_activities`
- ✅ Implement on-demand fetch
- ✅ Create `v_rider_recent_activities` view
- ✅ Build Activity Feed page

### Week 4: Polish
- ✅ Power rankings view
- ✅ Search & filters
- ✅ Error handling
- ✅ Performance optimization

---

## 📝 Summary

**Total Endpoints Discovered**: 12  
**Working Endpoints**: 5 (42%)  
**Production Endpoints**: 5 (ZwiftRacing × 3 + Zwift Official × 2)  
**Skipped**: 7 (all ZwiftPower)

**Database Tables**: 4 core tables  
**Views**: 5 optimized views  
**Dashboards**: 5 main pages

**Naming Convention**: ✅ Consistent API → Table → View → Dashboard mapping
