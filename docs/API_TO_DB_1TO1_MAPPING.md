# ZwiftRacing API ↔ Database 1:1 Mapping

## Datum: 2025-11-06
## Doel: Pure 1:1 mapping tussen alle 6 API endpoints en database tabellen

**Principe**: Elke API response veld → exact 1 database kolom, geen computed/transformed velden.

---

## 1. RIDERS - GET /public/riders/:riderId

### API Response Structuur (live test rider 150437):
```json
{
  "riderId": 150437,
  "name": "JRøne | CloudRacer-9 @YouTube",
  "age": "Vet",
  "gender": "M",
  "country": "nl",
  "height": 183,
  "weight": 74,
  "zpCategory": "B",
  "zpFTP": 270,
  "club": {
    "id": 2281,
    "name": "TeamNL"
  },
  "race": {
    "last": { "rating": 1374.74, "date": 1762282800, "mixed": {...} },
    "current": { "rating": 1374.74, "date": 1762282800, "mixed": {...} },
    "max30": { "rating": 1415.90, "date": 1759932600, "expires": 1764874800, "mixed": {...} },
    "max90": { "rating": 1462.71, "date": 1755195300, "expires": 1770058800, "mixed": {...} },
    "finishes": 24,
    "dnfs": 2,
    "wins": 0,
    "podiums": 4
  },
  "power": {
    "wkg5": 13.027, "wkg15": 12.027, "wkg30": 9.1351, "wkg60": 5.7703,
    "wkg120": 5.0811, "wkg300": 4.0541, "wkg1200": 3.3784,
    "w5": 964, "w15": 890, "w30": 676, "w60": 427,
    "w120": 376, "w300": 300, "w1200": 250,
    "CP": 229.62, "AWC": 25764.15,
    "compoundScore": 1152.42, "powerRating": 1152.42
  },
  "handicaps": {
    "profile": {
      "flat": 135.01, "rolling": 57.91, "hilly": -2.02, "mountainous": -153.70
    }
  },
  "phenotype": {
    "scores": {
      "sprinter": 96.6, "puncheur": 82.7, "pursuiter": 70.5,
      "climber": 59.8, "tt": 53.1
    },
    "value": "Sprinter",
    "bias": 19.20
  }
}
```

### Database Table: `riders`

#### Huidige Kolommen (moet aangepast):
```sql
-- CURRENT (heeft computed/extra velden die NIET van API komen):
id                   bigserial PRIMARY KEY,
zwift_id             bigint NOT NULL UNIQUE,  -- ✅ API: riderId
name                 text NOT NULL,           -- ✅ API: name
club_id              bigint NULL,             -- ✅ API: club.id
club_name            text NULL,               -- ❌ DENORMALIZED (moet weg of VIEW)
ranking              integer NULL,            -- ❌ WAAR KOMT DIT VANDAAN?
ranking_score        numeric NULL,            -- ❌ WAAR KOMT DIT VANDAAN?
ftp                  integer NULL,            -- ❌ API heeft zpFTP (270)
weight               numeric NULL,            -- ✅ API: weight (74)
watts_per_kg         numeric NULL,            -- ❌ COMPUTED (ftp/weight) - NIET IN API!
category_racing      text NULL,               -- ❌ API heeft race.current.mixed.category ("Amethyst")
category_zftp        text NULL,               -- ✅ API: zpCategory ("B")
age                  integer NULL,            -- ⚠️ API: age ("Vet" = STRING!)
gender               text NULL,               -- ✅ API: gender ("M")
country              text NULL,               -- ✅ API: country ("nl")
total_races          integer DEFAULT 0,       -- ✅ API: race.finishes (24)
total_wins           integer DEFAULT 0,       -- ✅ API: race.wins (0)
total_podiums        integer DEFAULT 0,       -- ✅ API: race.podiums (4)
last_synced          timestamptz,             -- ❌ META (niet van API)
created_at           timestamptz,             -- ❌ META (niet van API)
updated_at           timestamptz              -- ❌ META (niet van API)
```

#### 🎯 **GEWENSTE 1:1 Mapping (NEW)**:

**Core Identity** (van API root):
- `zwift_id` BIGINT → API: `riderId`
- `name` TEXT → API: `name`
- `age` TEXT → API: `age` (STRING! niet integer)
- `gender` TEXT → API: `gender`
- `country` TEXT → API: `country`
- `height` INTEGER → API: `height`
- `weight` NUMERIC → API: `weight`

**ZwiftPower Category** (van API root):
- `zp_category` TEXT → API: `zpCategory` ("B")
- `zp_ftp` INTEGER → API: `zpFTP` (270)

**Club** (van API.club):
- `club_id` BIGINT → API: `club.id`
- `club_name` TEXT → API: `club.name` (denormalized OK als van API)

**Race Stats** (van API.race):
- `race_rating_current` NUMERIC → API: `race.current.rating`
- `race_rating_last` NUMERIC → API: `race.last.rating`
- `race_rating_max30` NUMERIC → API: `race.max30.rating`
- `race_rating_max90` NUMERIC → API: `race.max90.rating`
- `race_category_current` TEXT → API: `race.current.mixed.category`
- `race_category_number` INTEGER → API: `race.current.mixed.number`
- `race_finishes` INTEGER → API: `race.finishes`
- `race_dnfs` INTEGER → API: `race.dnfs`
- `race_wins` INTEGER → API: `race.wins`
- `race_podiums` INTEGER → API: `race.podiums`
- `race_last_date` BIGINT → API: `race.last.date` (unix epoch)
- `race_max30_expires` BIGINT → API: `race.max30.expires`
- `race_max90_expires` BIGINT → API: `race.max90.expires`

**Power Curve** (van API.power):
- `power_wkg5` NUMERIC → API: `power.wkg5`
- `power_wkg15` NUMERIC → API: `power.wkg15`
- `power_wkg30` NUMERIC → API: `power.wkg30`
- `power_wkg60` NUMERIC → API: `power.wkg60`
- `power_wkg120` NUMERIC → API: `power.wkg120`
- `power_wkg300` NUMERIC → API: `power.wkg300`
- `power_wkg1200` NUMERIC → API: `power.wkg1200`
- `power_w5` INTEGER → API: `power.w5`
- `power_w15` INTEGER → API: `power.w15`
- `power_w30` INTEGER → API: `power.w30`
- `power_w60` INTEGER → API: `power.w60`
- `power_w120` INTEGER → API: `power.w120`
- `power_w300` INTEGER → API: `power.w300`
- `power_w1200` INTEGER → API: `power.w1200`
- `power_cp` NUMERIC → API: `power.CP`
- `power_awc` NUMERIC → API: `power.AWC`
- `power_compound_score` NUMERIC → API: `power.compoundScore`
- `power_rating` NUMERIC → API: `power.powerRating`

**Handicaps** (van API.handicaps.profile):
- `handicap_flat` NUMERIC → API: `handicaps.profile.flat`
- `handicap_rolling` NUMERIC → API: `handicaps.profile.rolling`
- `handicap_hilly` NUMERIC → API: `handicaps.profile.hilly`
- `handicap_mountainous` NUMERIC → API: `handicaps.profile.mountainous`

**Phenotype** (van API.phenotype):
- `phenotype_value` TEXT → API: `phenotype.value` ("Sprinter")
- `phenotype_bias` NUMERIC → API: `phenotype.bias`
- `phenotype_sprinter` NUMERIC → API: `phenotype.scores.sprinter`
- `phenotype_puncheur` NUMERIC → API: `phenotype.scores.puncheur`
- `phenotype_pursuiter` NUMERIC → API: `phenotype.scores.pursuiter`
- `phenotype_climber` NUMERIC → API: `phenotype.scores.climber`
- `phenotype_tt` NUMERIC → API: `phenotype.scores.tt`

**Metadata** (NIET van API - housekeeping):
- `id` BIGSERIAL PRIMARY KEY (internal)
- `last_synced` TIMESTAMPTZ (when data was fetched)
- `created_at` TIMESTAMPTZ (first insert)
- `updated_at` TIMESTAMPTZ (last update)

---

## 2. CLUBS - GET /public/clubs/:clubId

### API Response Structure:
```typescript
// Returns array of riders (same as riders endpoint)
// NO separate club metadata endpoint!
// Club info komt FROM riders: rider.club.id, rider.club.name
```

### Database Table: `clubs`

#### 🎯 **GEWENSTE 1:1 Mapping**:
```sql
-- Club data komt VIA riders endpoint, niet standalone!
id              bigint PRIMARY KEY,     -- ✅ API: club.id (van riders response)
name            text NOT NULL,          -- ✅ API: club.name (van riders response)
member_count    integer,                -- ❌ COMPUTED (COUNT van riders met club_id)
-- Metadata:
last_synced     timestamptz,
created_at      timestamptz,
updated_at      timestamptz
```

**Note**: ZwiftRacing heeft GEEN `/public/clubs/:id` endpoint voor club metadata! Club info komt alleen via riders.

---

## 3. EVENTS - GET /public/events (MISSING IN CURRENT API?)

**TODO**: Verify if events endpoint exists in ZwiftRacing API.

```sql
-- CURRENT TABLE (check if API exists):
zwift_event_id   bigint PRIMARY KEY,
name             text,
event_date       timestamptz,
event_type       text,
club_id          bigint,
last_synced      timestamptz,
created_at       timestamptz,
updated_at       timestamptz
```

---

## 4. RESULTS - GET /public/results/:eventId (MISSING IN CURRENT API?)

**TODO**: Verify if results endpoint exists in ZwiftRacing API.

```sql
-- CURRENT TABLE (check if API exists):
id               bigserial PRIMARY KEY,
event_id         bigint,
rider_id         bigint,
position         integer,
time_seconds     integer,
points           integer
```

---

## 5. RIDER HISTORY - GET /public/riders/:riderId/:timestamp

### API Response Structure:
```typescript
// Returns rider snapshot at given timestamp
// Same structure as /public/riders/:riderId but at historical moment
```

### Database Table: `rider_history`

#### 🎯 **GEWENSTE 1:1 Mapping**:
```sql
-- Store historical snapshots van riders data:
id                   bigserial PRIMARY KEY,
rider_id             bigint NOT NULL,        -- FK to riders.id
snapshot_date        timestamptz NOT NULL,   -- Timestamp van snapshot
-- ALLE velden van riders tabel (zie boven), exact zelfde mapping!
-- Plus:
created_at           timestamptz
```

---

## 6. SYNC LOGS - Internal housekeeping

### Database Table: `sync_logs`

**NOT from API** - internal tracking:
```sql
id                   bigserial PRIMARY KEY,
endpoint             text,
status               text,
records_processed    integer,
error_message        text,
created_at           timestamptz
```

---

## 🚨 CRITICAL ISSUES IN CURRENT SCHEMA

### ❌ **Te Verwijderen** (NIET in API):
1. `riders.watts_per_kg` - **COMPUTED** (ftp/weight) → MOET WEG!
2. `riders.ranking` - WAAR KOMT DIT VANDAAN? Niet in API!
3. `riders.ranking_score` - WAAR KOMT DIT VANDAAN? Niet in API!
4. `riders.club_name` - Dubbel (denormalized OK maar moet van API komen)

### ⚠️ **Verkeerd Type**:
1. `riders.age` - Is INTEGER maar API geeft STRING ("Vet", "40-44", etc.)!
2. `riders.ftp` - Moet `zp_ftp` heten (van zpFTP)
3. `riders.category_racing` - Moet `race_category_current` heten
4. `riders.category_zftp` - Moet `zp_category` heten

### ➕ **Ontbrekende Velden** (WEL in API):
1. Alle `power.*` velden (18 kolommen!)
2. Alle `handicaps.*` velden (4 kolommen)
3. Alle `phenotype.*` velden (6 kolommen)
4. Alle `race.*` detail velden (13+ kolommen)
5. `height` kolom

---

## 🎯 ACTION PLAN

### Stap 1: Backup Current Data
```sql
CREATE TABLE riders_backup_20251106 AS SELECT * FROM riders;
```

### Stap 2: Drop Computed Columns
```sql
ALTER TABLE riders DROP COLUMN IF EXISTS watts_per_kg;
ALTER TABLE riders DROP COLUMN IF EXISTS ranking;
ALTER TABLE riders DROP COLUMN IF EXISTS ranking_score;
```

### Stap 3: Rename Mismatched Columns
```sql
ALTER TABLE riders RENAME COLUMN ftp TO zp_ftp;
ALTER TABLE riders RENAME COLUMN category_racing TO race_category_current;
ALTER TABLE riders RENAME COLUMN category_zftp TO zp_category;
ALTER TABLE riders ALTER COLUMN age TYPE text;  -- STRING not INTEGER!
```

### Stap 4: Add Missing API Columns
```sql
-- Power curve (18 kolommen)
ALTER TABLE riders ADD COLUMN power_wkg5 NUMERIC;
-- ... (zie volledige lijst boven)

-- Handicaps (4 kolommen)
ALTER TABLE riders ADD COLUMN handicap_flat NUMERIC;
-- ...

-- Phenotype (6 kolommen)
ALTER TABLE riders ADD COLUMN phenotype_value TEXT;
-- ...

-- Race details (13 kolommen)
ALTER TABLE riders ADD COLUMN race_rating_current NUMERIC;
-- ...
```

### Stap 5: Update TypeScript Types
```typescript
// backend/src/types/index.ts
export interface DbRider {
  // Exact match met API response!
  zwift_id: number;
  name: string;
  age: string;  // NOT number!
  gender: string;
  country: string;
  height: number;
  weight: number;
  zp_category: string;
  zp_ftp: number;
  club_id: number;
  club_name: string;
  // Power curve (18 velden)
  power_wkg5: number;
  // ... etc
}
```

### Stap 6: Update Sync Code
```typescript
// Pure 1:1 mapping zonder transformaties:
const rider: DbRider = {
  zwift_id: apiResponse.riderId,
  name: apiResponse.name,
  age: apiResponse.age,  // STRING!
  gender: apiResponse.gender,
  country: apiResponse.country,
  height: apiResponse.height,
  weight: apiResponse.weight,
  zp_category: apiResponse.zpCategory,
  zp_ftp: apiResponse.zpFTP,
  club_id: apiResponse.club?.id,
  club_name: apiResponse.club?.name,
  power_wkg5: apiResponse.power.wkg5,
  // ... etc - NO COMPUTED FIELDS!
};
```

---

## 📊 SUMMARY

**Current riders table**: 21 kolommen  
**Needed for 1:1 API mapping**: ~65 kolommen!

**Missing**: 44+ kolommen (power curve, handicaps, phenotype, race details)  
**Wrong**: 5 kolommen (type mismatch, wrong names)  
**To remove**: 3 kolommen (computed/unknown source)

**Impact**: Database migration + TypeScript types + sync code update
**Benefit**: Pure API replica, no constraint errors, full data richness!
