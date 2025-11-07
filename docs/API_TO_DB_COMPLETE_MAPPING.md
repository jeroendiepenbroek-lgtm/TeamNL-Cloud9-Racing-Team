# Complete 1:1 API → Database Mapping
**Datum**: 2025-11-07  
**Status**: Implementation Ready  
**Doel**: Pure 1:1 relatie tussen ZwiftRacing API responses en database tabellen

## Principe: Source of Truth = API

- **Geen berekende velden in source tabellen** (wel in views)
- **Alle API velden opslaan** (ook als we ze nu niet gebruiken)
- **Exacte veldnamen** van API → snake_case in DB
- **Nullable fields** = alles nullable behalve primary keys

---

## 1. RIDERS TABLE (61 velden)

### API Endpoint: GET /public/riders/:riderId

**Current**: 21 kolommen  
**Target**: 61 kolommen (40 nieuwe velden)

### API Response Structuur:
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
    "CP": 229.619,
    "AWC": 25764.150,
    "compoundScore": 1152.417,
    "powerRating": 1152.417
  },
  "race": {
    "last": {...},
    "current": {...},
    "max30": {...},
    "max90": {...},
    "finishes": 24,
    "dnfs": 2,
    "wins": 0,
    "podiums": 4
  },
  "handicaps": {
    "profile": {
      "flat": 135.639,
      "rolling": 58.197,
      "hilly": -1.728,
      "mountainous": -154.170
    }
  },
  "phenotype": {
    "scores": {
      "sprinter": 96.6,
      "puncheur": 82.7,
      "pursuiter": 70.5,
      "climber": 59.7,
      "tt": 53.0
    },
    "value": "Sprinter",
    "bias": 19.224
  },
  "club": {
    "id": 2281,
    "name": "TeamNL"
  }
}
```

### Complete Column Mapping (61 velden):

| # | DB Column (snake_case) | API Field | Type | Nullable | Notes |
|---|---|---|---|---|---|
| **Core Identity** |||||
| 1 | `id` | - | BIGSERIAL | NO | PK auto-increment |
| 2 | `rider_id` | riderId | BIGINT | NO | UNIQUE (was: zwift_id) |
| 3 | `name` | name | TEXT | YES | |
| 4 | `gender` | gender | TEXT | YES | M/F |
| 5 | `country` | country | TEXT | YES | ISO 2-letter |
| 6 | `age` | age | TEXT | YES | "Vet"/"40-49"/etc |
| 7 | `height` | height | INTEGER | YES | cm |
| 8 | `weight` | weight | NUMERIC | YES | kg |
| **Zwift Performance** |||||
| 9 | `zp_category` | zpCategory | TEXT | YES | A/B/C/D/E |
| 10 | `zp_ftp` | zpFTP | INTEGER | YES | Zwift FTP |
| **Power Data (14 velden)** |||||
| 11 | `power_wkg5` | power.wkg5 | NUMERIC | YES | 5s W/kg |
| 12 | `power_wkg15` | power.wkg15 | NUMERIC | YES | 15s W/kg |
| 13 | `power_wkg30` | power.wkg30 | NUMERIC | YES | 30s W/kg |
| 14 | `power_wkg60` | power.wkg60 | NUMERIC | YES | 1min W/kg |
| 15 | `power_wkg120` | power.wkg120 | NUMERIC | YES | 2min W/kg |
| 16 | `power_wkg300` | power.wkg300 | NUMERIC | YES | 5min W/kg |
| 17 | `power_wkg1200` | power.wkg1200 | NUMERIC | YES | 20min W/kg |
| 18 | `power_w5` | power.w5 | INTEGER | YES | 5s Watts |
| 19 | `power_w15` | power.w15 | INTEGER | YES | 15s Watts |
| 20 | `power_w30` | power.w30 | INTEGER | YES | 30s Watts |
| 21 | `power_w60` | power.w60 | INTEGER | YES | 1min Watts |
| 22 | `power_w120` | power.w120 | INTEGER | YES | 2min Watts |
| 23 | `power_w300` | power.w300 | INTEGER | YES | 5min Watts |
| 24 | `power_w1200` | power.w1200 | INTEGER | YES | 20min Watts |
| 25 | `power_cp` | power.CP | NUMERIC | YES | Critical Power |
| 26 | `power_awc` | power.AWC | NUMERIC | YES | Anaerobic Work Capacity |
| 27 | `power_compound_score` | power.compoundScore | NUMERIC | YES | |
| 28 | `power_rating` | power.powerRating | NUMERIC | YES | |
| **Race Stats (12 velden)** |||||
| 29 | `race_last_rating` | race.last.rating | NUMERIC | YES | |
| 30 | `race_last_date` | race.last.date | BIGINT | YES | Unix epoch |
| 31 | `race_last_category` | race.last.mixed.category | TEXT | YES | Ruby/Sapphire/etc |
| 32 | `race_last_number` | race.last.mixed.number | INTEGER | YES | |
| 33 | `race_current_rating` | race.current.rating | NUMERIC | YES | |
| 34 | `race_current_date` | race.current.date | BIGINT | YES | |
| 35 | `race_max30_rating` | race.max30.rating | NUMERIC | YES | |
| 36 | `race_max30_expires` | race.max30.expires | BIGINT | YES | |
| 37 | `race_max90_rating` | race.max90.rating | NUMERIC | YES | |
| 38 | `race_max90_expires` | race.max90.expires | BIGINT | YES | |
| 39 | `race_finishes` | race.finishes | INTEGER | YES | Total races |
| 40 | `race_dnfs` | race.dnfs | INTEGER | YES | Did Not Finish |
| 41 | `race_wins` | race.wins | INTEGER | YES | |
| 42 | `race_podiums` | race.podiums | INTEGER | YES | |
| **Handicaps (4 velden)** |||||
| 43 | `handicap_flat` | handicaps.profile.flat | NUMERIC | YES | |
| 44 | `handicap_rolling` | handicaps.profile.rolling | NUMERIC | YES | |
| 45 | `handicap_hilly` | handicaps.profile.hilly | NUMERIC | YES | |
| 46 | `handicap_mountainous` | handicaps.profile.mountainous | NUMERIC | YES | |
| **Phenotype (7 velden)** |||||
| 47 | `phenotype_sprinter` | phenotype.scores.sprinter | NUMERIC | YES | |
| 48 | `phenotype_puncheur` | phenotype.scores.puncheur | NUMERIC | YES | |
| 49 | `phenotype_pursuiter` | phenotype.scores.pursuiter | NUMERIC | YES | |
| 50 | `phenotype_climber` | phenotype.scores.climber | NUMERIC | YES | |
| 51 | `phenotype_tt` | phenotype.scores.tt | NUMERIC | YES | |
| 52 | `phenotype_value` | phenotype.value | TEXT | YES | "Sprinter"/etc |
| 53 | `phenotype_bias` | phenotype.bias | NUMERIC | YES | |
| **Club Info (2 velden)** |||||
| 54 | `club_id` | club.id | BIGINT | YES | |
| 55 | `club_name` | club.name | TEXT | YES | |
| **Metadata (6 velden)** |||||
| 56 | `is_active` | - | BOOLEAN | YES | Default true |
| 57 | `total_races` | - | INTEGER | YES | Deprecated (use race_finishes) |
| 58 | `total_wins` | - | INTEGER | YES | Deprecated (use race_wins) |
| 59 | `total_podiums` | - | INTEGER | YES | Deprecated (use race_podiums) |
| 60 | `last_synced` | - | TIMESTAMPTZ | YES | |
| 61 | `created_at` | - | TIMESTAMPTZ | YES | |

### ❌ REMOVED Columns (waren berekend):
- `ranking` - was computed, niet in API
- `ranking_score` - was computed
- `ftp` - vervangen door `zp_ftp`
- `watts_per_kg` - was computed (nu in view)
- `category_racing` - vervangen door race velden
- `category_zftp` - vervangen door `zp_category`
- `updated_at` - niet nodig (gebruik last_synced)

---

## 2. RESULTS TABLE (14 velden)

### API Endpoint: GET /public/results/:eventId

**Current**: ~8 kolommen  
**Target**: 14 kolommen (pure API mapping)

### API Response:
```json
{
  "riderId": 165997,
  "name": "Jesper Agertoft Pihl",
  "category": "A",
  "time": 1750.364,
  "gap": 0,
  "position": 1,
  "positionInCategory": 1,
  "rating": 1874.239,
  "ratingBefore": 1849.484,
  "ratingDelta": 24.755,
  "ratingMax30": 1874.239,
  "ratingMax90": 1874.239
}
```

### Complete Column Mapping:

| # | DB Column | API Field | Type | Nullable |
|---|---|---|---|---|
| 1 | `id` | - | BIGSERIAL | NO |
| 2 | `event_id` | - | BIGINT | NO |
| 3 | `rider_id` | riderId | BIGINT | NO |
| 4 | `rider_name` | name | TEXT | YES |
| 5 | `category` | category | TEXT | YES |
| 6 | `time_seconds` | time | NUMERIC | YES |
| 7 | `gap_seconds` | gap | NUMERIC | YES |
| 8 | `position` | position | INTEGER | YES |
| 9 | `position_in_category` | positionInCategory | INTEGER | YES |
| 10 | `rating` | rating | NUMERIC | YES |
| 11 | `rating_before` | ratingBefore | NUMERIC | YES |
| 12 | `rating_delta` | ratingDelta | NUMERIC | YES |
| 13 | `rating_max30` | ratingMax30 | NUMERIC | YES |
| 14 | `rating_max90` | ratingMax90 | NUMERIC | YES |

---

## 3. EVENTS TABLE (API structuur onbekend)

**TODO**: Haal sample op via GET /public/events/:clubId

---

## 4. CLUBS TABLE (OK - al 1:1)

Huidige structuur is al pure API mapping.

---

## 5. RIDER_HISTORY TABLE (API structuur onbekend)

**TODO**: Verifieer structuur

---

## 6. SYNC_LOGS TABLE (internal - geen API)

Blijft zoals het is.

---

## Implementation Strategy

### Phase 1: Database Migration (007_pure_api_mapping.sql)
```sql
-- 1. Drop computed columns
ALTER TABLE riders DROP COLUMN IF EXISTS watts_per_kg;
ALTER TABLE riders DROP COLUMN IF EXISTS ranking;
ALTER TABLE riders DROP COLUMN IF EXISTS ranking_score;

-- 2. Rename voor API consistency
ALTER TABLE riders RENAME COLUMN zwift_id TO rider_id;
ALTER TABLE riders RENAME COLUMN ftp TO zp_ftp_old; -- backup
ALTER TABLE riders RENAME COLUMN category_racing TO category_racing_old;
ALTER TABLE riders RENAME COLUMN category_zftp TO category_zftp_old;

-- 3. Add 40 nieuwe API velden
ALTER TABLE riders ADD COLUMN zp_category TEXT;
ALTER TABLE riders ADD COLUMN zp_ftp INTEGER;
-- ... (alle 40 velden)

-- 4. Create computed view
CREATE OR REPLACE VIEW riders_computed AS
SELECT 
  *,
  CASE 
    WHEN weight > 0 THEN zp_ftp / weight 
    ELSE NULL 
  END AS watts_per_kg
FROM riders;
```

### Phase 2: TypeScript Updates
- `backend/src/types/index.ts`: DbRider interface met 61 velden
- `backend/src/services/auto-sync.service.ts`: Map alle API velden
- `backend/src/services/supabase.service.ts`: Query riders_computed view

### Phase 3: Testing
1. Run migration in Supabase
2. Deploy code
3. Trigger sync
4. Verify: `SELECT COUNT(*) FROM riders WHERE power_wkg5 IS NOT NULL;`

---

## Benefits

✅ **Pure source of truth**: DB = exact copy van API  
✅ **Future proof**: Alle API velden beschikbaar voor analytics  
✅ **No magic**: Geen hidden computed columns  
✅ **Flexible views**: Computed velden in views, niet in tables  
✅ **Easy debugging**: DB data = API data, 1:1 traceable

---

## Next Steps

1. ✅ Documenteer complete mapping (dit document)
2. ⏳ Create migration SQL script
3. ⏳ Update TypeScript types
4. ⏳ Update sync service
5. ⏳ Test end-to-end
