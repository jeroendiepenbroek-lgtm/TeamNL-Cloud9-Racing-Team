# 📋 Complete Supabase Schema - All SOURCE Tables

**Date**: 2025-11-05  
**Database**: TeamNL Cloud9 Racing Team - Supabase PostgreSQL  
**Total Tables**: 4 (results & rider_history do NOT exist yet)

---

## Table of Contents
1. [clubs](#1-clubs-table) (10 columns)
2. [riders](#2-riders-table) (21 columns) 
3. [events](#3-events-table) (12 columns)
4. [sync_logs](#4-sync_logs-table) (9 columns)

---

## 1. CLUBS Table
**Purpose**: Store Zwift racing club information  
**Total Columns**: 10  
**Primary Key**: `id` (auto-increment)  
**Unique Key**: `club_id` (Zwift external ID)

### Schema
| # | Column | Type | Nullable | Default | Notes |
|---|--------|------|----------|---------|-------|
| 1 | `id` | bigint | NO | nextval('clubs_id_seq') | Internal PK |
| 2 | `club_id` | bigint | NO | null | Zwift club ID (unique) |
| 3 | `club_name` | text | NO | null | Official club name |
| 4 | `description` | text | YES | null | Club description |
| 5 | `member_count` | integer | YES | 0 | Total members |
| 6 | `country` | text | YES | null | Club country |
| 7 | `created_date` | timestamptz | YES | null | Club creation date |
| 8 | `last_synced` | timestamptz | YES | now() | Last API sync |
| 9 | `created_at` | timestamptz | YES | now() | Record created |
| 10 | `updated_at` | timestamptz | YES | now() | Record updated |

### Key Insights
- ✅ Has both `id` (internal) and `club_id` (Zwift external ID)
- ✅ `club_name` is NOT NULL (required)
- ✅ `member_count` defaults to 0

---

## 2. RIDERS Table
**Purpose**: Store Zwift rider profiles and racing stats  
**Total Columns**: 21  
**Primary Key**: `id` (auto-increment)  
**Unique Key**: `zwift_id` (Zwift external ID)  
**Foreign Key**: `club_id` → clubs.club_id (nullable)

### Schema
| # | Column | Type | Nullable | Default | Notes |
|---|--------|------|----------|---------|-------|
| 1 | `id` | bigint | NO | nextval('riders_id_seq') | Internal PK |
| 2 | `zwift_id` | bigint | NO | null | Zwift rider ID (unique) |
| 3 | `name` | text | NO | null | Rider display name |
| 4 | `club_id` | bigint | YES | null | FK to clubs |
| 5 | `club_name` | text | YES | null | **DENORMALIZED!** |
| 6 | `ranking` | integer | YES | null | Global ranking position |
| 7 | `ranking_score` | numeric | YES | null | Ranking score value |
| 8 | `ftp` | integer | YES | null | Functional Threshold Power |
| 9 | `weight` | numeric | YES | null | Weight in kg |
| 10 | `watts_per_kg` | numeric | YES | null | **PRE-COMPUTED!** |
| 11 | `category_racing` | text | YES | null | Racing category (A/B/C/D) |
| 12 | `category_zftp` | text | YES | null | zFTP category |
| 13 | `age` | integer | YES | null | Rider age |
| 14 | `gender` | text | YES | null | Rider gender |
| 15 | `country` | text | YES | null | Rider country |
| 16 | `total_races` | integer | YES | 0 | Total races participated |
| 17 | `total_wins` | integer | YES | 0 | Total race wins |
| 18 | `total_podiums` | integer | YES | 0 | Total podium finishes |
| 19 | `last_synced` | timestamptz | YES | now() | Last API sync |
| 20 | `created_at` | timestamptz | YES | now() | Record created |
| 21 | `updated_at` | timestamptz | YES | now() | Record updated |

### Key Insights
- ✅ **DENORMALIZED**: `club_name` stored directly (no JOIN needed!)
- ✅ **PRE-COMPUTED**: `watts_per_kg` already calculated
- ✅ Uses `country` (NOT `country_code`)
- ❌ **NO `total_dnfs` column** (doesn't exist)
- ✅ Stats default to 0 (total_races, total_wins, total_podiums)

### Denormalization Rationale
The `club_name` is stored directly in riders table (duplicated from clubs) for:
- ⚡ **Performance**: No JOIN needed for basic queries
- 🔒 **Historical accuracy**: Club name frozen at sync time
- 📊 **Simplified views**: Direct access to club name

---

## 3. EVENTS Table
**Purpose**: Store Zwift racing event information  
**Total Columns**: 12  
**Primary Key**: `id` (auto-increment)  
**Unique Key**: `event_id` (Zwift external ID)

### Schema
| # | Column | Type | Nullable | Default | Notes |
|---|--------|------|----------|---------|-------|
| 1 | `id` | bigint | NO | nextval('events_id_seq') | Internal PK |
| 2 | `event_id` | bigint | NO | null | Zwift event ID (unique) |
| 3 | `event_name` | text | NO | null | Event name |
| 4 | `event_date` | timestamptz | NO | null | Event date/time |
| 5 | `route_name` | text | YES | null | Zwift route name |
| 6 | `laps` | integer | YES | null | Number of laps |
| 7 | `distance_meters` | integer | YES | null | Total distance |
| 8 | `elevation_meters` | integer | YES | null | Total elevation gain |
| 9 | `category` | text | YES | null | Event category |
| 10 | `source` | text | YES | 'api' | Data source (api/manual) |
| 11 | `last_synced` | timestamptz | YES | now() | Last API sync |
| 12 | `created_at` | timestamptz | YES | now() | Record created |

### Key Insights
- ✅ `event_name` and `event_date` are required (NOT NULL)
- ✅ `source` defaults to 'api' (track data origin)
- ✅ No `updated_at` column (events are immutable)
- 📏 Metrics in meters (distance, elevation)

---

## 4. SYNC_LOGS Table
**Purpose**: Track all data synchronization operations  
**Total Columns**: 9  
**Primary Key**: `id` (auto-increment)

### Schema
| # | Column | Type | Nullable | Default | Notes |
|---|--------|------|----------|---------|-------|
| 1 | `id` | bigint | NO | nextval('sync_logs_id_seq') | Internal PK |
| 2 | `operation` | text | NO | null | Sync operation type |
| 3 | `entity_type` | text | NO | null | Entity being synced |
| 4 | `entity_id` | bigint | YES | null | Specific entity ID |
| 5 | `status` | text | NO | null | success/error/pending |
| 6 | `message` | text | YES | null | Log message |
| 7 | `error_details` | jsonb | YES | null | Error stack/details |
| 8 | `duration_ms` | integer | YES | null | Operation duration |
| 9 | `synced_at` | timestamptz | YES | now() | Timestamp |

### Key Insights
- ✅ `error_details` uses **JSONB** (structured error data)
- ✅ Tracks performance via `duration_ms`
- ✅ Generic design: works for any entity_type
- 📊 Use for monitoring and debugging sync issues

---

---

## 5. CLUB_MEMBERS Table
**Purpose**: Store club membership relationships (many-to-many)  
**Total Columns**: 8  
**Primary Key**: `id` (auto-increment)  
**Composite Natural Key**: (`club_id`, `rider_id`)

### Schema
| # | Column | Type | Nullable | Default | Notes |
|---|--------|------|----------|---------|-------|
| 1 | `id` | bigint | NO | nextval('club_members_id_seq') | Internal PK |
| 2 | `club_id` | bigint | NO | null | FK to clubs |
| 3 | `rider_id` | bigint | NO | null | FK to riders (zwift_id) |
| 4 | `rider_name` | text | NO | null | Denormalized name |
| 5 | `ranking` | integer | YES | null | Rider ranking at join |
| 6 | `category_racing` | text | YES | null | Racing category |
| 7 | `joined_date` | timestamptz | YES | null | When joined club |
| 8 | `synced_at` | timestamptz | YES | now() | Last sync |

### Key Insights
- ✅ **Bridge table**: Links clubs ↔ riders (many-to-many)
- ✅ **Denormalized**: `rider_name` stored for historical accuracy
- 📸 **Snapshot data**: `ranking` and `category_racing` at time of sync
- 🔑 **rider_id** is Zwift ID (not internal riders.id!)

---

## 6. EVENT_RESULTS Table
**Purpose**: Store individual race results per rider per event  
**Total Columns**: 15  
**Primary Key**: `id` (auto-increment)  
**Composite Natural Key**: (`event_id`, `rider_id`)

### Schema
| # | Column | Type | Nullable | Default | Notes |
|---|--------|------|----------|---------|-------|
| 1 | `id` | bigint | NO | nextval('event_results_id_seq') | Internal PK |
| 2 | `event_id` | bigint | NO | null | FK to events |
| 3 | `rider_id` | bigint | NO | null | FK to riders (zwift_id) |
| 4 | `rider_name` | text | NO | null | Denormalized name |
| 5 | `position` | integer | YES | null | Finish position |
| 6 | `finish_time_seconds` | integer | YES | null | Total time in seconds |
| 7 | `avg_power_watts` | integer | YES | null | Average power output |
| 8 | `avg_heart_rate` | integer | YES | null | Average HR |
| 9 | `avg_cadence` | integer | YES | null | Average cadence |
| 10 | `normalized_power` | integer | YES | null | NP metric |
| 11 | `watts_per_kg` | numeric | YES | null | Power-to-weight ratio |
| 12 | `category` | text | YES | null | Race category |
| 13 | `did_finish` | boolean | YES | true | Completed race |
| 14 | `dnf_reason` | text | YES | null | Did Not Finish reason |
| 15 | `synced_at` | timestamptz | YES | now() | Last sync |

### Key Insights
- 🏁 **Performance metrics**: Complete race telemetry data
- 💪 **Power analysis**: avg_power, normalized_power, watts_per_kg
- ❤️ **Physiological**: heart_rate, cadence
- ❌ **DNF tracking**: `did_finish` + `dnf_reason` fields
- 📸 **Denormalized**: `rider_name` for historical accuracy

---

## 7. RIDER_SNAPSHOTS Table
**Purpose**: Store historical snapshots of rider stats over time  
**Total Columns**: 10  
**Primary Key**: `id` (auto-increment)  
**Time-series Key**: (`rider_id`, `snapshot_timestamp`)

### Schema
| # | Column | Type | Nullable | Default | Notes |
|---|--------|------|----------|---------|-------|
| 1 | `id` | bigint | NO | nextval('rider_snapshots_id_seq') | Internal PK |
| 2 | `rider_id` | bigint | NO | null | FK to riders (zwift_id) |
| 3 | `snapshot_timestamp` | timestamptz | NO | null | When snapshot taken |
| 4 | `ranking` | integer | YES | null | Ranking at time |
| 5 | `ranking_score` | numeric | YES | null | Score at time |
| 6 | `ftp` | integer | YES | null | FTP at time |
| 7 | `weight` | numeric | YES | null | Weight at time |
| 8 | `category_racing` | text | YES | null | Category at time |
| 9 | `raw_data` | jsonb | YES | null | Complete API response |
| 10 | `synced_at` | timestamptz | YES | now() | Snapshot created |

### Key Insights
- 📈 **Time-series data**: Track rider progression over time
- 🎯 **Key metrics**: ranking, FTP, weight, category evolution
- 📦 **JSONB archive**: `raw_data` preserves complete API response
- 🔍 **Query patterns**: Time-based analytics (trends, improvements)
- ⏰ **snapshot_timestamp**: When data was captured (NOT synced_at!)

---

## Summary Statistics

| Table | Columns | Status | Purpose |
|-------|---------|--------|---------|
| **clubs** | 10 | ✅ Active | Club data from ZwiftRacing API |
| **riders** | 21 | ✅ Active | Rider profiles + stats (denormalized) |
| **events** | 12 | ✅ Active | Racing event metadata |
| **sync_logs** | 9 | ✅ Active | Sync operation tracking |
| **club_members** | 8 | ✅ Active | Club ↔ Rider relationships |
| **event_results** | 15 | ✅ Active | Individual race results + telemetry |
| **rider_snapshots** | 10 | ✅ Active | Historical rider data (time-series) |
| **my_team_members** | 3 | ✅ Active | Custom team selection |

**Total Active Tables**: 8 (7 SOURCE + 1 RELATION)  
**Total Columns**: 88  
**Missing Tables**: 0

---

## Architecture Notes

### Complete Table Overview
```
SOURCE TABLES (7):
├── clubs (10 cols)           → Club metadata
├── riders (21 cols)          → Rider profiles (denormalized with club_name)
├── events (12 cols)          → Race event metadata
├── club_members (8 cols)     → Club ↔ Rider relationships (bridge table)
├── event_results (15 cols)   → Individual race results + telemetry
├── rider_snapshots (10 cols) → Historical time-series data
└── sync_logs (9 cols)        → Sync monitoring

RELATION TABLES (1):
└── my_team_members (3 cols)  → Custom team selection

VIEWS (5):
├── club_stats               → Aggregated club statistics
├── recent_events            → Latest events
├── top_riders_ranking       → Top riders by ranking
├── top_riders_wkg           → Top riders by watts/kg
└── view_my_team             → Custom team with full rider data
```

### Denormalization Strategy
The database uses **selective denormalization** for performance:

```
riders.club_name = clubs.club_name
  ↓
Allows querying riders WITHOUT joining clubs table
```

**Trade-off**: Data duplication vs query performance  
**Winner**: Performance (club names rarely change)

### Pre-Computed Fields
Some calculations are done at sync time and stored:

```
riders.watts_per_kg = ftp / weight
  ↓
No need to compute in queries
```

**Trade-off**: Storage vs computation  
**Winner**: Storage (disk is cheap, CPU is expensive)

### Key Relationships
```
clubs (1) ----< (∞) club_members >---- (∞) riders
  ↑                                        ↑
  |                                        |
club_id                                zwift_id
                                           |
                                           |
events (1) ----< (∞) event_results >---- (∞) riders
  ↑                                        ↑
  |                                        |
event_id                              zwift_id
                                           |
                                           |
riders (1) ----< (∞) rider_snapshots (time-series)
  ↑                     ↑
  |                     |
zwift_id          snapshot_timestamp


my_team_members >---- (∞) riders
        ↑                  ↑
        |                  |
    zwift_id          zwift_id (FK)
```

**Note**: Most FKs use `zwift_id` (external ID), not internal `id` columns

---

## Usage Examples

### Get all riders with club info (no JOIN needed!)
```sql
SELECT zwift_id, name, club_name, watts_per_kg, ranking
FROM riders
WHERE club_id = 11818
ORDER BY ranking ASC NULLS LAST;
```

### Get club member count with actual riders
```sql
SELECT 
  c.club_name,
  c.member_count as reported_count,
  COUNT(r.zwift_id) as actual_count
FROM clubs c
LEFT JOIN riders r ON c.club_id = r.club_id
GROUP BY c.club_id, c.club_name, c.member_count;
```

### Monitor sync performance
```sql
SELECT 
  entity_type,
  status,
  AVG(duration_ms) as avg_duration,
  COUNT(*) as total_syncs
FROM sync_logs
WHERE synced_at > NOW() - INTERVAL '7 days'
GROUP BY entity_type, status
ORDER BY avg_duration DESC;
```

### Find events for specific rider (needs results table)
```sql
-- ⚠️ This will work once results table is created
-- SELECT e.event_name, e.event_date, r.position, r.time_seconds
-- FROM events e
-- JOIN results r ON e.event_id = r.event_id
-- WHERE r.zwift_id = 150437
-- ORDER BY e.event_date DESC;
```

---

## Metadata

**Schema Retrieved**: 2025-11-05  
**Query Used**:
```sql
SELECT table_name, column_name, data_type, is_nullable, column_default, ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('clubs', 'riders', 'events', 'results', 'rider_history', 'sync_logs')
ORDER BY 
  CASE table_name
    WHEN 'clubs' THEN 1
    WHEN 'riders' THEN 2
    WHEN 'events' THEN 3
    WHEN 'results' THEN 4
    WHEN 'rider_history' THEN 5
    WHEN 'sync_logs' THEN 6
  END,
  ordinal_position;
```

**Location**: `/docs/COMPLETE_SUPABASE_SCHEMA.md`  
**Related Files**:
- `/supabase/migrations/005_my_team_clean.sql` - Uses this schema for view_my_team
- `/PRODUCTION_WORKFLOW.md` - Architecture documentation
- `/SUPABASE_SCHEMA_VERIFIED.md` - Schema verification log

---

## ✅ Verification Checklist

- [x] clubs table (10 columns) - Complete
- [x] riders table (21 columns) - Complete  
- [x] events table (12 columns) - Complete
- [x] sync_logs table (9 columns) - Complete
- [x] club_members table (8 columns) - Complete
- [x] event_results table (15 columns) - Complete
- [x] rider_snapshots table (10 columns) - Complete
- [x] my_team_members table (3 columns) - Complete ✅ CREATED!
- [x] view_my_team - Complete ✅ CREATED!

**Total Tables**: 8 (7 SOURCE + 1 RELATION)  
**Total Columns**: 88  
**Total Views**: 5

**Next Steps**:
1. ✅ SQL migration executed - `my_team_members` + `view_my_team` exist!
2. ⏳ Test backend endpoints with view_my_team
3. ⏳ Fix Riders.tsx frontend component
4. ⏳ Deploy to Railway production
