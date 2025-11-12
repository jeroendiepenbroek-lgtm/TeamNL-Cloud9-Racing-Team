# API → Database Mapping (1:1 Sourcing Tables)

**Datum**: 2025-11-12  
**Status**: ⚠️ INCOMPLETE - Events table mist sourcing van API data

## Principe: Elke ZwiftRacing API endpoint moet een dedicated sourcing table hebben

Alle data van externe APIs moet 1-op-1 worden opgeslagen in een "sourcing table" voordat we er views of transformaties op loslaten. Dit garandeert:
- **Data historiciteit**: Originele API responses blijven behouden
- **Debugging**: Kunnen terug naar raw data
- **Compliance**: Audit trail voor alle externe data
- **Performance**: Views kunnen efficientgecached worden

---

## ✅ Compliant Mappings

### 1. Clubs API → `clubs` table

**ZwiftRacing Endpoint**:
```
GET /public/clubs/{clubId}
```

**Response Fields** (van API):
```json
{
  "id": 11818,
  "name": "TeamNL Cloud9 Racing Team",
  "description": "...",
  "tag": "TNLC9",
  "members": 74,
  "created_at": "2024-01-15",
  ...
}
```

**Sourcing Table**: `clubs`
```sql
CREATE TABLE clubs (
  id BIGINT PRIMARY KEY,              -- clubs.id (API)
  name TEXT NOT NULL,                 -- clubs.name
  description TEXT,                   -- clubs.description
  tag TEXT,                           -- clubs.tag
  member_count INTEGER,               -- clubs.members
  club_created_at TIMESTAMPTZ,        -- clubs.created_at (parsed)
  last_synced TIMESTAMPTZ,            -- Metadata: wanneer gesynct
  created_at TIMESTAMPTZ,             -- Metadata: eerste import
  updated_at TIMESTAMPTZ              -- Metadata: laatste update
);
```

**Sync Method**: `syncService.syncClubMembers()`  
**Sync Frequency**: 1x per 60 minuten (rate limit)  
**Status**: ✅ **COMPLIANT**

---

### 2. Riders API → `riders` table

**ZwiftRacing Endpoint**:
```
GET /public/riders/{riderId}
POST /public/riders (bulk - max 1000)
```

**Response Fields** (van API):
```json
{
  "riderId": 150437,
  "name": "John Doe",
  "male": true,
  "imageSrc": "https://...",
  "countryAlpha3": "NLD",
  "countryCode": 528,
  "ftp": 285,
  "weight": 75000,  // grams
  "height": 180,
  "age": 35,
  "zFtp": 290,
  "zFtpWkg": 3.87,
  "zPower60": 270,
  "zPowerWkg60": 3.6,
  "zCategory": "B",
  ...
}
```

**Sourcing Table**: `riders`
```sql
CREATE TABLE riders (
  rider_id BIGINT PRIMARY KEY,        -- riderId (API)
  name TEXT NOT NULL,                 -- name
  male BOOLEAN,                       -- male
  image_src TEXT,                     -- imageSrc
  country_alpha3 TEXT,                -- countryAlpha3
  country_code INTEGER,               -- countryCode
  ftp INTEGER,                        -- ftp
  weight INTEGER,                     -- weight (grams)
  height INTEGER,                     -- height (cm)
  age INTEGER,                        -- age
  zp_ftp INTEGER,                     -- zFtp (ZwiftPower calculated)
  zp_ftp_wkg DECIMAL(4,2),            -- zFtpWkg
  zp_power_60min INTEGER,             -- zPower60
  zp_power_60min_wkg DECIMAL(4,2),    -- zPowerWkg60
  zp_category TEXT,                   -- zCategory (A/B/C/D/E)
  race_last_rating DECIMAL(5,2),      -- raceLastRating
  race_win_ratio DECIMAL(5,4),        -- raceWinRatio
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Sync Methods**:
- `syncService.syncClubMembers()` - Bulk sync alle club members
- `syncService.syncRider(riderId)` - Individuele rider update

**Sync Frequency**:
- Club members: 1x per 60 min
- Individual riders: On-demand (max 5/min)

**Status**: ✅ **COMPLIANT**

---

### 3. Results API → `results` table

**ZwiftRacing Endpoint**:
```
GET /public/events/{eventId}/results
```

**Response Fields** (van API):
```json
{
  "results": [
    {
      "rank": 1,
      "riderId": 150437,
      "name": "John Doe",
      "time": 3456,  // seconds
      "timeGun": 3460,
      "power": 280,
      "wattsPerKg": 3.73,
      "heartRate": 165,
      "weight": 75000,
      "power20min": 285,
      "power5min": 320,
      "category": "B",
      "point": 950,
      ...
    }
  ]
}
```

**Sourcing Table**: `results`
```sql
CREATE TABLE results (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,           -- eventId (FK naar events)
  rider_id BIGINT NOT NULL,           -- riderId (FK naar riders)
  rank INTEGER,                       -- rank
  time_seconds INTEGER,               -- time
  time_gun INTEGER,                   -- timeGun
  avg_power INTEGER,                  -- power
  avg_power_wkg DECIMAL(4,2),         -- wattsPerKg
  avg_heart_rate INTEGER,             -- heartRate
  weight INTEGER,                     -- weight (grams)
  power_20min INTEGER,                -- power20min
  power_5min INTEGER,                 -- power5min
  category TEXT,                      -- category
  zp_points INTEGER,                  -- point (ZwiftPower points)
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  UNIQUE(event_id, rider_id)
);
```

**Sync Method**: `syncService.syncEventResults(eventId)`  
**Sync Frequency**: 1x per minuut per event (rate limit)  
**Status**: ✅ **COMPLIANT**

---

## ❌ NON-COMPLIANT: Events

### 4. Events API → ⚠️ MISSING SOURCING TABLE

**ZwiftRacing Endpoint**:
```
GET /api/events?from={unix}&to={unix}&limit={n}
GET /api/events/{eventId}
```

**Response Fields** (van API):
```json
{
  "events": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
      "eventId": "5129235",
      "time": 1731427200,  // Unix timestamp
      "title": "WTRL TTT Americas & EMEA (B)",
      "type": "Race",
      "subType": "Scratch",
      "distance": 35000,  // meters
      "elevation": 450,   // meters
      "route": {
        "name": "Watopia Flat Route",
        "world": "Watopia"
      },
      "organizer": "WTRL",
      "categoryEnforcement": "zPower",
      "pens": [
        {
          "id": "pen_a",
          "name": "A",
          "rangeLabel": "570-725",
          "startTime": 1731427200,
          "results": {
            "count": 45,
            "signups": [
              {
                "riderId": 150437,
                "name": "John Doe",
                "category": "B",
                "team": "TeamNL Cloud9"
              }
            ]
          }
        }
      ]
    }
  ],
  "totalResults": 287
}
```

**Current Table** (`events`): ❌ INCOMPLETE
```sql
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL UNIQUE,    -- eventId (maar is STRING in API!)
  name TEXT NOT NULL,                 -- title (verkeerde naam!)
  event_date TIMESTAMPTZ NOT NULL,    -- time (converted)
  event_type TEXT,                    -- type
  route TEXT,                         -- route.name (verliest route.world!)
  laps INTEGER,                       -- MISSING in API!
  distance_meters INTEGER,            -- distance ✅
  total_elevation INTEGER,            -- elevation ✅
  category TEXT,                      -- UNCLEAR wat dit is
  description TEXT,                   -- MISSING in API response!
  event_url TEXT,                     -- MISSING in API response!
  category_enforcement BOOLEAN,       -- categoryEnforcement (type mismatch!)
  organizer TEXT,                     -- organizer ✅
  zwift_event_id BIGINT,              -- Duplicate of event_id?
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Problems**:
1. ❌ **event_id type mismatch**: API returns STRING ("5129235"), table has BIGINT
2. ❌ **Missing fields**: `_id`, `subType`, `route.world`, `pens` structure
3. ❌ **Wrong names**: `name` should be `title`
4. ❌ **Invented fields**: `laps`, `description`, `event_url` don't exist in API
5. ❌ **Type mismatch**: `category_enforcement` is STRING in API ("zPower"), BOOLEAN in table
6. ❌ **No pens data**: Entire `pens[]` array wordt genegeerd!

---

## 🔧 REQUIRED FIX: Create Proper Events Sourcing Table

### Proposed: `zwift_api_events` (Raw API Data)

```sql
-- Raw events data from /api/events endpoint
CREATE TABLE zwift_api_events (
  id BIGSERIAL PRIMARY KEY,
  mongo_id TEXT UNIQUE,               -- _id (MongoDB ID van ZwiftRacing API)
  event_id TEXT NOT NULL UNIQUE,      -- eventId (STRING!)
  time_unix BIGINT NOT NULL,          -- time (Unix timestamp)
  title TEXT NOT NULL,                -- title
  event_type TEXT,                    -- type (Race, Group Ride, Workout)
  sub_type TEXT,                      -- subType (Scratch, Time Trial, etc)
  distance_meters INTEGER,            -- distance
  elevation_meters INTEGER,           -- elevation
  route_name TEXT,                    -- route.name
  route_world TEXT,                   -- route.world
  organizer TEXT,                     -- organizer
  category_enforcement TEXT,          -- categoryEnforcement (zPower, category, none)
  pens JSONB,                         -- pens[] - RAW JSON array
  raw_response JSONB,                 -- Full API response voor debugging
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_zwift_events_event_id ON zwift_api_events(event_id);
CREATE INDEX idx_zwift_events_time ON zwift_api_events(time_unix);
CREATE INDEX idx_zwift_events_type ON zwift_api_events(event_type);
```

### Proposed: `event_signups` (Extracted Signups from pens[])

**Already exists!** ✅ Migration 010 created this.

```sql
CREATE TABLE event_signups (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,             -- SHOULD BE TEXT to match API!
  rider_id BIGINT NOT NULL,           -- riderId from pens[].results.signups[]
  pen_name TEXT,                      -- pen.name (A/B/C/D)
  pen_range_label TEXT,               -- pen.rangeLabel (570-725)
  category TEXT,                      -- signup.category
  team_name TEXT,                     -- signup.team
  status TEXT DEFAULT 'confirmed',
  signup_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, rider_id)
);
```

**⚠️ CRITICAL FIX NEEDED**: `event_id` moet TEXT zijn, niet BIGINT!

---

## 📊 Recommended Views (After Fixing Sourcing)

### View: `events` (Application-friendly view)

```sql
CREATE VIEW events AS
SELECT 
  id,
  event_id,
  title as name,                      -- Rename voor app compatibility
  TO_TIMESTAMP(time_unix) as event_date,
  event_type,
  sub_type,
  distance_meters,
  elevation_meters,
  route_name as route,
  route_world,
  organizer,
  category_enforcement,
  last_synced,
  created_at
FROM zwift_api_events;
```

### View: `view_upcoming_events` (Met signup counts)

```sql
CREATE VIEW view_upcoming_events AS
SELECT 
  e.*,
  COUNT(DISTINCT es.rider_id) FILTER (WHERE es.status = 'confirmed') as confirmed_signups,
  COUNT(DISTINCT es.rider_id) as total_signups,
  -- Team riders count (join met riders table)
  COUNT(DISTINCT r.rider_id) FILTER (WHERE r.rider_id IS NOT NULL) as team_signups
FROM zwift_api_events e
LEFT JOIN event_signups es ON e.event_id = es.event_id
LEFT JOIN riders r ON es.rider_id = r.rider_id
WHERE TO_TIMESTAMP(e.time_unix) BETWEEN NOW() AND (NOW() + INTERVAL '48 hours')
GROUP BY e.id
ORDER BY e.time_unix ASC;
```

---

## 🚨 CRITICAL ACTION ITEMS

### 1. **Rename Current `events` Table**
```sql
-- Backup huidige (incomplete) events table
ALTER TABLE events RENAME TO events_old_backup;
```

### 2. **Create Proper Sourcing Table**
```sql
-- Run migration: 011_zwift_api_events_sourcing.sql
-- Creates zwift_api_events with correct field types
```

### 3. **Fix event_signups event_id Type**
```sql
-- Run migration: 012_fix_event_signups_event_id_type.sql
ALTER TABLE event_signups 
  ALTER COLUMN event_id TYPE TEXT;
```

### 4. **Update Sync Service**
```typescript
// backend/src/services/sync.service.ts
async bulkImportUpcomingEvents() {
  const events = await zwiftClient.getEvents48Hours();
  
  // Store RAW API response
  const apiEvents = events.map(event => ({
    mongo_id: event._id,
    event_id: event.eventId,  // Keep as STRING
    time_unix: event.time,
    title: event.title,
    event_type: event.type,
    sub_type: event.subType,
    distance_meters: event.distance,
    elevation_meters: event.elevation,
    route_name: event.route?.name,
    route_world: event.route?.world,
    organizer: event.organizer,
    category_enforcement: event.categoryEnforcement,
    pens: JSON.stringify(event.pens),  // Store as JSONB
    raw_response: JSON.stringify(event),  // Full backup
  }));
  
  await supabase.upsertZwiftApiEvents(apiEvents);
  
  // Extract signups from pens
  for (const event of events) {
    if (event.pens) {
      for (const pen of event.pens) {
        if (pen.results?.signups) {
          for (const signup of pen.results.signups) {
            await supabase.upsertEventSignup({
              event_id: event.eventId,  // TEXT!
              rider_id: signup.riderId,
              pen_name: pen.name,
              pen_range_label: pen.rangeLabel,
              category: signup.category,
              team_name: signup.team,
            });
          }
        }
      }
    }
  }
}
```

### 5. **Update Frontend to Use View**
```typescript
// frontend/src/pages/Events.tsx
// No changes needed if view is named 'events' or 'view_upcoming_events'
// Backend endpoint already uses supabase.getUpcomingEvents() which can query view
```

---

## 📋 Complete API → Database Mapping Summary

| ZwiftRacing API Endpoint | Sourcing Table | View/Transformed Table | Status |
|---|---|---|---|
| `GET /public/clubs/{id}` | `clubs` | - | ✅ Compliant |
| `GET /public/riders/{id}` | `riders` | - | ✅ Compliant |
| `POST /public/riders` (bulk) | `riders` | - | ✅ Compliant |
| `GET /public/events/{id}/results` | `results` | - | ✅ Compliant |
| `GET /api/events` | ❌ **MISSING** `zwift_api_events` | `events` (view) | ❌ Non-compliant |
| `GET /api/events/{id}` | ❌ **MISSING** `zwift_api_events` | `events` (view) | ❌ Non-compliant |

---

## 🎯 Next Steps

1. **Create migration 011**: `zwift_api_events` sourcing table
2. **Create migration 012**: Fix `event_signups.event_id` type (BIGINT → TEXT)
3. **Update sync service**: Store raw API response in `zwift_api_events`
4. **Create views**: `events`, `view_upcoming_events`, `view_team_events`
5. **Test data flow**: API → zwift_api_events → views → frontend
6. **Delete old table**: Drop `events_old_backup` after validation

**ETA**: 30 minuten voor complete compliance

---

## 📚 References

- [ZwiftRacing API Docs](https://zwift-ranking.herokuapp.com)
- [Supabase JSONB Best Practices](https://supabase.com/docs/guides/database/json)
- [Copilot Instructions](.github/copilot-instructions.md) - Section: "1:1 API Mapping"
