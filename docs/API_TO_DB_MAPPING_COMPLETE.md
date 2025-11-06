# ZwiftRacing API → Database 1:1 Mapping

**Datum:** 2025-11-06  
**Doel:** Complete 1:1 mapping tussen alle 6 ZwiftRacing API endpoints en database tabellen  
**Status:** 🚧 Analyse - Ready voor implementation morgen

---

## 📋 Overzicht 6 API Endpoints → 6 Database Tabellen

| API Endpoint | Database Tabel | Mapping Status | Notities |
|--------------|----------------|----------------|----------|
| `GET /public/clubs/<id>` | `clubs` | ⚠️ Partial | API geeft geen club detail, alleen members |
| `GET /public/riders/<id>` | `riders` | ❌ Mismatch | Veel computed fields, geneste objecten |
| `POST /public/riders` | `riders` | ❌ Mismatch | Zelfde als GET maar bulk |
| `GET /public/results/<eventId>` | `results` | ❓ Unknown | Nog niet getest |
| `GET /public/events/<clubId>` | `events` | ❓ Unknown | Endpoint bestaat niet? |
| Rider history | `rider_history` | ❓ Unknown | Geen direct endpoint? |

---

## 1️⃣ RIDERS - GET/POST `/public/riders/<id>`

### 🔍 Exacte API Response (Rider 150437)

```json
{
  "riderId": 150437,
  "name": "JRøne | CloudRacer-9 @YouTube",
  "gender": "M",
  "country": "nl",
  "age": "Vet",
  "height": 183,
  "weight": 74,
  "zpCategory": "B",
  "zpFTP": 270,
  "power": {
    "wkg5": 13.027,
    "wkg15": 12.027,
    "wkg30": 9.1351,
    "wkg60": 5.7703,
    "wkg120": 5.0811,
    "wkg300": 4.0541,
    "wkg1200": 3.3784,
    "w5": 964,
    "w15": 890,
    "w30": 676,
    "w60": 427,
    "w120": 376,
    "w300": 300,
    "w1200": 250,
    "CP": 229.61940938203404,
    "AWC": 25764.15034769949,
    "compoundScore": 1152.4175795349856,
    "powerRating": 1152.4175795349856
  },
  "race": {
    "last": {
      "rating": 1397.8074155465263,
      "date": 1762456500,
      "mixed": {
        "category": "Amethyst",
        "number": 5
      }
    },
    "current": {
      "rating": 1397.8074155465263,
      "date": 1762456500,
      "mixed": {
        "category": "Amethyst",
        "number": 5
      }
    },
    "max30": {
      "rating": 1415.904014983724,
      "date": 1759932600,
      "expires": 1765048500,
      "mixed": {
        "category": "Amethyst",
        "number": 5
      }
    },
    "max90": {
      "rating": 1462.7125165070242,
      "date": 1755195300,
      "expires": 1770232500,
      "mixed": {
        "category": "Sapphire",
        "number": 4
      }
    },
    "finishes": 24,
    "dnfs": 2,
    "wins": 0,
    "podiums": 4
  },
  "handicaps": {
    "profile": {
      "flat": 135.63954911126783,
      "rolling": 58.19708776651679,
      "hilly": -1.7286263693024608,
      "mountainous": -154.17042379019037
    }
  },
  "phenotype": {
    "scores": {
      "sprinter": 96.6,
      "puncheur": 82.7,
      "pursuiter": 70.5,
      "climber": 59.7,
      "tt": 53
    },
    "value": "Sprinter",
    "bias": 19.224999999999994
  },
  "club": {
    "id": 2281,
    "name": "TeamNL"
  }
}
```

### 📊 Huidige Database Schema (`riders`)

```sql
CREATE TABLE riders (
  id BIGSERIAL PRIMARY KEY,
  zwift_id BIGINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  
  -- Club info
  club_id BIGINT,
  club_name TEXT,  -- ⚠️ DENORMALIZED
  
  -- Racing stats
  ranking INTEGER,
  ranking_score NUMERIC,
  category_racing TEXT,
  category_zftp TEXT,
  
  -- Physical stats
  ftp INTEGER,
  weight NUMERIC,
  watts_per_kg NUMERIC,  -- ⚠️ COMPUTED (ftp/weight)
  
  -- Demographics
  age INTEGER,
  gender TEXT,
  country TEXT,
  
  -- Totals
  total_races INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_podiums INTEGER DEFAULT 0,
  
  -- Timestamps
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 🔴 Probleem: Huidige mapping is NIET 1:1

**Ontbrekende API velden** (niet in DB):
- `height` (number)
- `zpCategory` (string: A/B/C/D)
- `zpFTP` (number)
- `power.*` (14 velden: wkg5, wkg15, wkg30, ..., CP, AWC, compoundScore, powerRating)
- `race.*` (complex object met 4 sub-objecten)
- `handicaps.profile.*` (flat, rolling, hilly, mountainous)
- `phenotype.*` (scores, value, bias)

**Velden in DB die NIET in API zitten:**
- `ranking` - ❓ Waar komt dit vandaan?
- `ranking_score` - ❓ Waar komt dit vandaan?
- `category_racing` - ❓ Misschien `race.current.mixed.category`?
- `category_zftp` - ❓ Misschien `zpCategory`?
- `ftp` - ❓ Misschien `zpFTP`?
- `watts_per_kg` - ⚠️ COMPUTED (moet weg!)
- `total_races` - ✅ Van API: `race.finishes`
- `total_wins` - ✅ Van API: `race.wins`
- `total_podiums` - ✅ Van API: `race.podiums`
- `club_name` - ✅ Van API: `club.name`

### ✅ Voorgestelde Pure 1:1 Mapping

```sql
CREATE TABLE riders (
  -- Primary Key
  id BIGSERIAL PRIMARY KEY,
  
  -- Identity (van API)
  rider_id BIGINT NOT NULL UNIQUE,  -- API: riderId
  name TEXT NOT NULL,                -- API: name
  
  -- Demographics (van API)
  gender TEXT,                       -- API: gender
  country TEXT,                      -- API: country (2-char code)
  age TEXT,                          -- API: age (kan "Vet" zijn!)
  height INTEGER,                    -- API: height
  weight NUMERIC,                    -- API: weight
  
  -- Zwift Power Category (van API)
  zp_category TEXT,                  -- API: zpCategory (A/B/C/D)
  zp_ftp INTEGER,                    -- API: zpFTP
  
  -- Power Profile (van API - 14 velden)
  power_wkg5 NUMERIC,                -- API: power.wkg5
  power_wkg15 NUMERIC,               -- API: power.wkg15
  power_wkg30 NUMERIC,               -- API: power.wkg30
  power_wkg60 NUMERIC,               -- API: power.wkg60
  power_wkg120 NUMERIC,              -- API: power.wkg120
  power_wkg300 NUMERIC,              -- API: power.wkg300
  power_wkg1200 NUMERIC,             -- API: power.wkg1200
  power_w5 INTEGER,                  -- API: power.w5
  power_w15 INTEGER,                 -- API: power.w15
  power_w30 INTEGER,                 -- API: power.w30
  power_w60 INTEGER,                 -- API: power.w60
  power_w120 INTEGER,                -- API: power.w120
  power_w300 INTEGER,                -- API: power.w300
  power_w1200 INTEGER,               -- API: power.w1200
  power_cp NUMERIC,                  -- API: power.CP (Critical Power)
  power_awc NUMERIC,                 -- API: power.AWC (Anaerobic Work Capacity)
  power_compound_score NUMERIC,      -- API: power.compoundScore
  power_rating NUMERIC,              -- API: power.powerRating
  
  -- Race Stats - Last Race (van API)
  race_last_rating NUMERIC,          -- API: race.last.rating
  race_last_date INTEGER,            -- API: race.last.date (epoch)
  race_last_category TEXT,           -- API: race.last.mixed.category
  race_last_category_number INTEGER, -- API: race.last.mixed.number
  
  -- Race Stats - Current Rating (van API)
  race_current_rating NUMERIC,       -- API: race.current.rating
  race_current_date INTEGER,         -- API: race.current.date
  race_current_category TEXT,        -- API: race.current.mixed.category
  race_current_category_number INTEGER, -- API: race.current.mixed.number
  
  -- Race Stats - 30 Day Max (van API)
  race_max30_rating NUMERIC,         -- API: race.max30.rating
  race_max30_date INTEGER,           -- API: race.max30.date
  race_max30_expires INTEGER,        -- API: race.max30.expires
  race_max30_category TEXT,          -- API: race.max30.mixed.category
  race_max30_category_number INTEGER, -- API: race.max30.mixed.number
  
  -- Race Stats - 90 Day Max (van API)
  race_max90_rating NUMERIC,         -- API: race.max90.rating
  race_max90_date INTEGER,           -- API: race.max90.date
  race_max90_expires INTEGER,        -- API: race.max90.expires
  race_max90_category TEXT,          -- API: race.max90.mixed.category
  race_max90_category_number INTEGER, -- API: race.max90.mixed.number
  
  -- Race Totals (van API)
  race_finishes INTEGER,             -- API: race.finishes
  race_dnfs INTEGER,                 -- API: race.dnfs
  race_wins INTEGER,                 -- API: race.wins
  race_podiums INTEGER,              -- API: race.podiums
  
  -- Handicaps (van API)
  handicap_flat NUMERIC,             -- API: handicaps.profile.flat
  handicap_rolling NUMERIC,          -- API: handicaps.profile.rolling
  handicap_hilly NUMERIC,            -- API: handicaps.profile.hilly
  handicap_mountainous NUMERIC,      -- API: handicaps.profile.mountainous
  
  -- Phenotype (van API)
  phenotype_sprinter NUMERIC,        -- API: phenotype.scores.sprinter
  phenotype_puncheur NUMERIC,        -- API: phenotype.scores.puncheur
  phenotype_pursuiter NUMERIC,       -- API: phenotype.scores.pursuiter
  phenotype_climber NUMERIC,         -- API: phenotype.scores.climber
  phenotype_tt NUMERIC,              -- API: phenotype.scores.tt
  phenotype_value TEXT,              -- API: phenotype.value (Sprinter/Climber/etc)
  phenotype_bias NUMERIC,            -- API: phenotype.bias
  
  -- Club (van API)
  club_id BIGINT,                    -- API: club.id
  club_name TEXT,                    -- API: club.name
  
  -- Metadata (NIET van API)
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index voor snelle lookups
CREATE INDEX idx_riders_rider_id ON riders(rider_id);
CREATE INDEX idx_riders_club_id ON riders(club_id);
```

### 📈 Telling: 61 API velden → 61 DB kolommen

**Huidige DB:** 21 kolommen (waarvan 3 computed/denormalized)  
**Pure 1:1 DB:** 64 kolommen (61 API + 3 metadata)

---

## 2️⃣ CLUBS - GET `/public/clubs/<id>`

### 🔍 API Response Type

**LET OP:** Dit endpoint geeft GEEN club details, alleen een array van riders!

```json
[
  {
    "riderId": 150437,
    "name": "...",
    // ... alle rider velden
  },
  // ... tot 1000 riders
]
```

### 📊 Huidige Database Schema (`clubs`)

```sql
CREATE TABLE clubs (
  id BIGINT PRIMARY KEY,
  club_id BIGINT NOT NULL,
  club_name TEXT NOT NULL,
  description TEXT,
  member_count INTEGER,
  country TEXT,
  created_date TIMESTAMPTZ,
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 🔴 Probleem: Er IS GEEN club detail endpoint!

De `/public/clubs/<id>` endpoint geeft alleen riders terug, geen club metadata.

**Oplossingen:**
1. ✅ **Haal club info uit rider data** (`club.id`, `club.name`)
2. ❌ Vraag ZwiftRacing API team om club detail endpoint
3. ✅ **Minimale clubs tabel** met alleen wat we weten

### ✅ Voorgestelde Pure Mapping (based on rider.club)

```sql
CREATE TABLE clubs (
  id BIGSERIAL PRIMARY KEY,
  club_id BIGINT NOT NULL UNIQUE,  -- Van rider.club.id
  club_name TEXT NOT NULL,         -- Van rider.club.name
  
  -- Metadata (NIET van API)
  member_count INTEGER,            -- Berekend via COUNT(riders)
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3️⃣ EVENTS - Status: ❓ Endpoint Unclear

### 🔍 Mogelijke Endpoints

Niet duidelijk welke endpoint events geeft. Opties:
1. `/public/events/<clubId>` - bestaat niet?
2. Via results endpoint afleiden?
3. Geen direct events endpoint?

### 📊 Huidige Database Schema (`events`)

```sql
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  zwift_event_id BIGINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  event_date TIMESTAMPTZ,
  event_type TEXT,
  club_id BIGINT,
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ⚠️ TODO MORGEN: Test events endpoint

```bash
# Test verschillende endpoints:
curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  https://zwift-ranking.herokuapp.com/public/events/11818

curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  https://zwift-ranking.herokuapp.com/public/clubs/11818/events
```

---

## 4️⃣ RESULTS - GET `/public/results/<eventId>`

### 🔍 API Response Type

**TODO MORGEN:** Test met bestaand event ID

```bash
curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  https://zwift-ranking.herokuapp.com/public/results/4879983 \
  | jq '.[0]'  # Show first result
```

### 📊 Huidige Database Schema (`results`)

```sql
CREATE TABLE results (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,
  rider_id BIGINT NOT NULL,
  position INTEGER,
  time_seconds INTEGER,
  points INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ⚠️ TODO MORGEN: Krijg exacte API response en map 1:1

---

## 5️⃣ RIDER_HISTORY - Status: ❓ No Direct Endpoint?

### 📊 Huidige Database Schema (`rider_history`)

```sql
CREATE TABLE rider_history (
  id BIGSERIAL PRIMARY KEY,
  rider_id BIGINT NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL,
  ranking INTEGER,
  points INTEGER,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 🤔 Vraag: Hoe vullen?

**Opties:**
1. GET `/public/riders/<id>/<timestamp>` - Historische snapshots handmatig ophalen
2. Eigen snapshots maken via cron job (huidige state opslaan)
3. Geen history - alleen current state

### ✅ Voorgestelde Aanpak

**Gebruik rider_history voor eigen snapshots:**

```sql
-- Simpel: sla huidige state periodiek op
INSERT INTO rider_history (
  rider_id,
  snapshot_date,
  race_current_rating,
  race_current_category,
  zp_ftp,
  weight
)
SELECT 
  rider_id,
  NOW(),
  race_current_rating,
  race_current_category,
  zp_ftp,
  weight
FROM riders
WHERE rider_id IN (SELECT zwift_id FROM my_team_members);
```

**Cron:** Elke dag om 00:00 UTC snapshot maken.

---

## 6️⃣ SYNC_LOGS - Pure Metadata Table

### 📊 Huidige Database Schema (`sync_logs`)

```sql
CREATE TABLE sync_logs (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ✅ Status: GEEN API endpoint - Pure applicatie metadata

Deze tabel blijft zoals hij is. Geen 1:1 mapping nodig.

---

## 📝 Actie Plan voor Morgen

### Fase 1: API Response Testing (30 min)
```bash
# Test alle endpoints en sla responses op:
curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  https://zwift-ranking.herokuapp.com/public/riders/150437 \
  > /tmp/api_rider.json

curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  https://zwift-ranking.herokuapp.com/public/results/4879983 \
  > /tmp/api_results.json

# Test events endpoints (find correct URL)
```

### Fase 2: Database Migration Script (1 uur)
Creëer `007_pure_api_mapping.sql`:

```sql
-- 1. Backup huidige data
CREATE TABLE riders_backup AS SELECT * FROM riders;

-- 2. Drop computed columns
ALTER TABLE riders DROP COLUMN IF EXISTS watts_per_kg;
ALTER TABLE riders DROP COLUMN IF EXISTS ranking;
ALTER TABLE riders DROP COLUMN IF EXISTS ranking_score;

-- 3. Rename voor API consistency
ALTER TABLE riders RENAME COLUMN zwift_id TO rider_id;
ALTER TABLE riders RENAME COLUMN ftp TO zp_ftp;

-- 4. Add alle nieuwe API velden
ALTER TABLE riders ADD COLUMN height INTEGER;
ALTER TABLE riders ADD COLUMN zp_category TEXT;
ALTER TABLE riders ADD COLUMN power_wkg5 NUMERIC;
-- ... (58 meer kolommen)

-- 5. Update TypeScript types om te matchen
```

### Fase 3: TypeScript Types Update (30 min)
```typescript
// backend/src/types/index.ts
export interface DbRider {
  // Exact 1:1 met API
  rider_id: number;         // API: riderId
  name: string;             // API: name
  gender: string | null;    // API: gender
  country: string | null;   // API: country
  age: string | null;       // API: age (kan "Vet" zijn!)
  height: number | null;    // API: height
  weight: number | null;    // API: weight
  zp_category: string | null; // API: zpCategory
  zp_ftp: number | null;    // API: zpFTP
  
  // Power profile (18 velden)
  power_wkg5: number | null;
  // ... etc
  
  // Race stats (24 velden)
  race_current_rating: number | null;
  // ... etc
  
  // Metadata
  last_synced: string;
  created_at: string;
  updated_at: string;
}
```

### Fase 4: Sync Code Aanpassen (1 uur)
```typescript
// backend/src/services/auto-sync.service.ts
const upsertData = ridersData.map(apiRider => ({
  // Pure 1:1 mapping - GEEN transformaties!
  rider_id: apiRider.riderId,
  name: apiRider.name,
  gender: apiRider.gender,
  country: apiRider.country,
  age: apiRider.age,
  height: apiRider.height,
  weight: apiRider.weight,
  zp_category: apiRider.zpCategory,
  zp_ftp: apiRider.zpFTP,
  
  // Power profile
  power_wkg5: apiRider.power.wkg5,
  power_wkg15: apiRider.power.wkg15,
  // ... alle 18 power velden
  
  // Race stats
  race_current_rating: apiRider.race.current.rating,
  race_current_date: apiRider.race.current.date,
  // ... alle 24 race velden
  
  // Handicaps
  handicap_flat: apiRider.handicaps.profile.flat,
  // ... alle 4 handicap velden
  
  // Phenotype
  phenotype_sprinter: apiRider.phenotype.scores.sprinter,
  // ... alle 7 phenotype velden
  
  // Club
  club_id: apiRider.club?.id,
  club_name: apiRider.club?.name,
}));
```

### Fase 5: Testing (30 min)
1. Run migration in Supabase
2. Deploy nieuwe code
3. Trigger manual sync
4. Verify: `SELECT * FROM riders LIMIT 1` - alle 61 velden gevuld?

---

## ✅ Voordelen Pure 1:1 Mapping

1. **Geen constraint errors** - Geen computed columns die problemen geven
2. **Complete data** - Alle 61 API velden opgeslagen
3. **Toekomstbestendig** - Als API nieuwe velden toevoegt, simpel extra kolom
4. **Geen data loss** - Alles wat API geeft wordt bewaard
5. **Eenvoudige sync** - Pure mapping zonder business logic
6. **Debugging** - Makkelijk om API vs DB te vergelijken

## ⚠️ Nadelen / Overwegingen

1. **Grote tabel** - 64 kolommen (vs 21 nu)
2. **Storage** - Meer disk space nodig
3. **Indexes** - Moet zorgvuldig gekozen worden
4. **Migration** - Eenmalige effort om te migreren
5. **Views needed** - Voor UI misschien calculated columns als VIEW

### Oplossing: Views voor Computed Fields

```sql
-- View met calculated fields voor UI
CREATE VIEW riders_computed AS
SELECT 
  *,
  -- Computed: watts per kg
  CASE 
    WHEN weight > 0 THEN zp_ftp::numeric / weight
    ELSE NULL
  END AS watts_per_kg,
  
  -- Computed: current category readable
  race_current_category || ' ' || race_current_category_number AS category_display,
  
  -- Computed: days since last race
  EXTRACT(DAY FROM NOW() - TO_TIMESTAMP(race_last_date)) AS days_since_last_race
  
FROM riders;
```

**Frontend gebruikt `riders_computed` view**  
**Backend sync gebruikt `riders` table (pure)**

---

## 🎯 Success Criteria Morgen

- [ ] Alle 6 API endpoints getest en responses gedocumenteerd
- [ ] Migration script `007_pure_api_mapping.sql` compleet
- [ ] TypeScript types updated met alle 61 velden
- [ ] Sync code aangepast voor pure 1:1 mapping
- [ ] Manual sync test succesvol (0 errors)
- [ ] Rider 150437 heeft alle 61 velden gevuld in DB
- [ ] View `riders_computed` werkt voor frontend

---

## 📚 Referenties

- API Docs: `docs/ZWIFT_API_ENDPOINTS.md`
- Current Schema: `docs/COMPLETE_SUPABASE_SCHEMA.md`
- Huidige Types: `backend/src/types/index.ts`
- Sync Service: `backend/src/services/auto-sync.service.ts`
- Supabase Service: `backend/src/services/supabase.service.ts`

**Git commit voor morgen:**
```
feat: Pure 1:1 API-to-DB mapping voor alle 6 ZwiftRacing endpoints

- riders: 21 → 64 kolommen (61 API velden + 3 metadata)
- Verwijder computed columns (watts_per_kg, ranking)
- Add views voor calculated fields (riders_computed)
- Update TypeScript types voor pure mapping
- Migration: 007_pure_api_mapping.sql

Closes: Pure API foundation requirement
```

---

**Klaar voor morgen! 🚀**
