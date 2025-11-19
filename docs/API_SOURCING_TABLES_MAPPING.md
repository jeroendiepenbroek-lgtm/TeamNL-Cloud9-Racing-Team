# 📊 API → Database 1:1 Mapping (TeamNL Cloud9)

## Overview
Elke API endpoint heeft zijn eigen **sourcing tabel** in Supabase voor directe opslag van raw API responses.

---

## ✅ Complete Mapping

### 1. Events (Toekomstige Races)
**API Endpoint:**
```
GET /public/events (niet beschikbaar - gebruik scraping/signup discovery)
```

**Sourcing Tabel:** `events`
```sql
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT UNIQUE NOT NULL,     -- Zwift event ID
  name TEXT NOT NULL,                  -- Event naam
  event_date TIMESTAMPTZ NOT NULL,     -- Race datum/tijd
  route TEXT,                          -- Route naam
  laps INTEGER,
  distance_meters INTEGER,
  total_elevation INTEGER,
  category TEXT,                       -- A/B/C/D/Mixed
  last_synced TIMESTAMPTZ DEFAULT NOW()
);
```

**Bron Data:** Event discovery via:
- `zwift_api_event_signups` (team rider signups)
- Scraping ZwiftRacing.app

---

### 2. Event Signups (Wie doet mee?)
**API Endpoint:**
```
GET https://zwift-ranking.herokuapp.com/public/events/<eventId>/signups
Rate Limit: 1/min
```

**Sourcing Tabel:** `zwift_api_event_signups`
```sql
CREATE TABLE zwift_api_event_signups (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL,           -- FK naar events
  rider_id INTEGER NOT NULL,           -- Zwift rider ID
  rider_name TEXT NOT NULL,
  pen_name TEXT,                       -- A+/A/B/C/D/E
  power_wkg5 REAL,                     -- 5s power preview
  race_rating INTEGER,                 -- vELO rating
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, rider_id)
);
```

**Refresh Strategie:** 
- NEAR events: 4x/uur (:05,:20,:35,:50)
- FAR events: 1x/2h (:30)

---

### 3. Race Results (Afgelopen Races)
**API Endpoints:**

**Option A - ZwiftRacing.app:**
```
GET /public/results/<eventId>
Rate Limit: 1/min
```

**Option B - ZwiftPower (PREFERRED - has power curves!):**
```
GET /public/zp/<eventId>/results
Rate Limit: 1/min
```

**Sourcing Tabel:** `event_results` ⭐
```sql
CREATE TABLE event_results (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,            -- FK naar events
  rider_id BIGINT NOT NULL,            -- FK naar riders
  rider_name TEXT NOT NULL,
  
  -- Result data
  position INTEGER,                    -- Finish positie
  finish_time_seconds INTEGER,         -- Total tijd
  avg_power_watts INTEGER,             -- Gemiddeld vermogen
  avg_heart_rate INTEGER,
  avg_cadence INTEGER,
  normalized_power INTEGER,            -- NP
  watts_per_kg DECIMAL(5,2),          -- W/kg ratio
  
  -- Category
  category TEXT,                       -- A/B/C/D/E
  
  -- Status
  did_finish BOOLEAN DEFAULT true,
  dnf_reason TEXT,
  
  -- Timestamps
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, rider_id)
);
```

**Extended voor Results Dashboard (Migration 006):**
```sql
-- Power curves (from ZwiftPower API)
power_5s, power_15s, power_30s, 
power_1m, power_2m, power_5m, power_20m DECIMAL(6,2)

-- vELO tracking
velo_rating, velo_previous, velo_change INTEGER

-- Race context
pen TEXT                             -- Additional pen field
total_riders INTEGER
event_name TEXT                      -- Denormalized
event_date TIMESTAMPTZ              -- Denormalized
delta_winner_seconds INTEGER

-- Derived metrics
effort_score INTEGER                 -- 0-100 (% of PR)
race_points DECIMAL(6,2)            -- RP scoring
```

---

### 4. Riders (Profiel Data)
**API Endpoints:**

**Current rider:**
```
GET /public/riders/<riderId>
Rate Limit: 5/min
```

**Historical snapshot:**
```
GET /public/riders/<riderId>/<epochTime>
Rate Limit: 5/min
```

**Sourcing Tabellen:**

**A. Current Rider Data:** `riders`
```sql
CREATE TABLE riders (
  id BIGSERIAL PRIMARY KEY,
  zwift_id BIGINT UNIQUE NOT NULL,     -- riderId from API
  name TEXT NOT NULL,
  club_id BIGINT,
  club_name TEXT,
  category_racing TEXT,                -- A/B/C/D/E
  ftp INTEGER,
  weight DECIMAL(5,2),
  ranking INTEGER,
  ranking_score DECIMAL(10,2),
  country_code TEXT,
  gender TEXT,
  age TEXT,
  total_races INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_podiums INTEGER DEFAULT 0,
  last_synced TIMESTAMPTZ DEFAULT NOW()
);
```

**B. Historical Snapshots:** `rider_snapshots`
```sql
CREATE TABLE rider_snapshots (
  id BIGSERIAL PRIMARY KEY,
  rider_id BIGINT NOT NULL,            -- FK naar riders
  snapshot_timestamp TIMESTAMPTZ NOT NULL,
  
  -- Point-in-time data
  ranking INTEGER,
  ranking_score DECIMAL(10,2),
  ftp INTEGER,
  weight DECIMAL(5,2),
  category_racing TEXT,
  
  -- Raw JSON for future analysis
  raw_data JSONB,
  
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rider_id, snapshot_timestamp)
);
```

---

### 5. Club Data
**API Endpoint:**
```
GET /public/clubs/<clubId>
Rate Limit: 1/60min (STRICT!)
```

**Sourcing Tabellen:**

**A. Club Info:** `clubs`
```sql
CREATE TABLE clubs (
  id BIGSERIAL PRIMARY KEY,
  club_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  member_count INTEGER DEFAULT 0,
  last_synced TIMESTAMPTZ DEFAULT NOW()
);
```

**B. Club Members:** `club_members`
```sql
CREATE TABLE club_members (
  id BIGSERIAL PRIMARY KEY,
  club_id BIGINT NOT NULL,
  rider_id BIGINT NOT NULL,
  rider_name TEXT NOT NULL,
  ranking INTEGER,
  category_racing TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, rider_id)
);
```

---

## 🔄 Sync Strategy

### Rider Sync
- **Interval:** Every 6 hours (:00)
- **Source:** Bulk POST /public/riders (max 1000 IDs)
- **Rate Limit:** 1/15min
- **Target:** `riders` table

### Event Sync
- **NEAR Events (< 48h):** 4x/hour (:05,:20,:35,:50)
- **FAR Events (> 48h):** 1x/2h (:30)
- **Source:** Event signups discovery
- **Target:** `events` + `zwift_api_event_signups`

### Results Sync
- **Trigger:** Manual or post-event (event_date + 2h)
- **Source:** /public/zp/<eventId>/results (preferred voor power data)
- **Rate Limit:** 1/min
- **Target:** `event_results`

### Club Sync
- **Interval:** Weekly (Sundays 03:00)
- **Source:** /public/clubs/11818
- **Rate Limit:** 1/60min ⚠️ STRICT
- **Target:** `clubs` + `club_members`

---

## 📋 Tabel Overzicht

| Tabel | API Endpoint | Refresh | Records |
|-------|--------------|---------|---------|
| `clubs` | `/public/clubs/<id>` | Weekly | 1 |
| `club_members` | `/public/clubs/<id>` | Weekly | ~400 |
| `riders` | `/public/riders/bulk` | 6h | ~50 favs |
| `rider_snapshots` | `/public/riders/<id>/<time>` | On-demand | Historical |
| `events` | Signup discovery | 4x/h (near) | ~100 |
| `zwift_api_event_signups` | `/public/events/<id>/signups` | 4x/h | ~20k |
| `event_results` | `/public/zp/<id>/results` | Post-event | ~5k |

---

## 🎯 View: Team Recent Results

**Materialized View:** `view_team_recent_results`
- **Combines:** `event_results` + `events` + `riders`
- **Filter:** Only team members (via `view_my_team`)
- **Performance:** Pre-joined for fast dashboard queries
- **Refresh:** Hourly via cron

```sql
SELECT r.*, e.name, e.route, rid.name AS rider_name
FROM event_results r
JOIN events e ON r.event_id = e.event_id  
JOIN riders rid ON r.rider_id = rid.rider_id
WHERE r.rider_id IN (SELECT rider_id FROM view_my_team)
ORDER BY r.event_date DESC;
```

---

## ✅ Key Insights

1. **event_results is THE sourcing table** voor race results (niet race_results)
2. **events tabel** = toekomstige races (geen results)
3. **ZwiftPower API** (/public/zp/) heeft power curves - preferred voor results
4. **Kolom mapping in view:**
   - `position` → `rank`
   - `finish_time_seconds` → `time_seconds`
   - `watts_per_kg` → `avg_wkg`
   - `category` → `pen`

5. **Rate limits zijn STRICT** - vooral club endpoint (1/60min)

---

**Datum:** 2025-11-18  
**Migratie:** `backend/migrations/006_extend_race_results.sql`
