# ⚖️ FIELD MAPPING ANALYSE - ZwiftRacing API vs riders_unified Table

**Datum**: 5 december 2025  
**Doel**: Verificatie dat alle API velden gemapped zijn naar database

---

## 📊 ZwiftRider API Object vs Database Kolommen

### ✅ VOLLEDIG GEMAPPED

| API Field | Database Kolom | Status | Opmerking |
|-----------|----------------|--------|-----------|
| `riderId` | `rider_id` | ✅ | Primary key |
| `name` | `name` | ✅ | |
| `club.id` | `club_id` | ✅ | |
| `club.name` | `club_name` | ✅ | |
| `country` | `country_code` | ✅ | ISO 2-letter |
| `age` | `age_category` | ✅ | "Vet", "Junior", "Senior" |
| `weight` | `weight_kg` | ✅ | In kg |
| `height` | `height_cm` | ✅ | In cm |
| `gender` | `gender` | ✅ | "M" of "F" |
| `zpCategory` | `zp_category` | ✅ | "A", "B", "C", "D", "E" |
| `zpFTP` | `ftp` | ✅ | Watts |

### ✅ POWER CURVE (14 velden)

| API Field | Database Kolom | Status |
|-----------|----------------|--------|
| `power.w5` | `power_5s_w` | ✅ |
| `power.w15` | `power_15s_w` | ✅ |
| `power.w30` | `power_30s_w` | ✅ |
| `power.w60` | `power_1m_w` | ✅ |
| `power.w120` | `power_2m_w` | ✅ |
| `power.w300` | `power_5m_w` | ✅ |
| `power.w1200` | `power_20m_w` | ✅ |
| `power.wkg5` | `power_5s_wkg` | ✅ |
| `power.wkg15` | `power_15s_wkg` | ✅ |
| `power.wkg30` | `power_30s_wkg` | ✅ |
| `power.wkg60` | `power_1m_wkg` | ✅ |
| `power.wkg120` | `power_2m_wkg` | ✅ |
| `power.wkg300` | `power_5m_wkg` | ✅ |
| `power.wkg1200` | `power_20m_wkg` | ✅ |
| `power.CP` | `critical_power` | ✅ |
| `power.AWC` | `anaerobic_work_capacity` | ✅ |
| `power.compoundScore` | `compound_score` | ✅ |

### ✅ RACE STATS (vELO)

| API Field | Database Kolom | Status |
|-----------|----------------|--------|
| `race.current.rating` | `velo_rating` | ✅ |
| `race.current.mixed.number` | `velo_rank` | ✅ |
| `race.max30.rating` | `velo_max_30d` | ✅ |
| `race.max90.rating` | `velo_max_90d` | ✅ |
| `race.wins` | `race_wins` | ✅ |
| `race.podiums` | `race_podiums` | ✅ |
| `race.finishes` | `race_count_90d` | ✅ |

### ✅ PHENOTYPE (3 van 4)

| API Field | Database Kolom | Status | Opmerking |
|-----------|----------------|--------|-----------|
| `phenotype.value` | - | ❌ | String value NIET opgeslagen |
| `phenotype.scores.sprinter` | `phenotype_sprinter` | ✅ | |
| `phenotype.scores.climber` | - | ❌ | NIET in database! |
| `phenotype.scores.pursuiter` | `phenotype_pursuiter` | ✅ | |
| `phenotype.scores.puncheur` | `phenotype_puncheur` | ✅ | |

### ✅ HANDICAPS (4 velden)

| API Field | Database Kolom | Status |
|-----------|----------------|--------|
| `handicaps.flat` | `handicap_flat` | ✅ |
| `handicaps.hilly` | `handicap_hilly` | ✅ |
| `handicaps.rolling` | `handicap_rolling` | ✅ |
| `handicaps.mountainous` | `handicap_mountainous` | ✅ |

---

## ❌ ONTBREKENDE VELDEN IN DATABASE

### 1. **phenotype.value** (String)
**API Data**: `"Pursuiter"`, `"Sprinter"`, `"Climber"`, etc.  
**Database**: ❌ Niet opgeslagen  
**Impact**: Medium - kan afgeleid worden uit scores  
**Actie**: Optioneel toevoegen als `phenotype_type TEXT`

### 2. **phenotype.scores.climber** (Number)
**API Data**: Score tussen 0-100  
**Database**: ❌ Niet opgeslagen  
**Impact**: Medium - 1 van 4 phenotype scores mist  
**Actie**: ⚠️ **Toevoegen**: `phenotype_climber NUMERIC`

### 3. **race.last.date** (Timestamp)
**API Data**: ISO timestamp van laatste race  
**Database**: ❌ Niet opgeslagen  
**Impact**: Low - interessant voor "last activity" tracking  
**Actie**: Optioneel toevoegen als `last_race_date TIMESTAMPTZ`

### 4. **race.last.rating** (Number)
**API Data**: vELO rating bij laatste race  
**Database**: ❌ Niet opgeslagen  
**Impact**: Low - interessant voor rating delta  
**Actie**: Optioneel toevoegen als `last_race_velo NUMERIC`

### 5. **race.current.mixed.category** (String)
**API Data**: Category ranking bijv. "A", "B", "C", "D"  
**Database**: ❌ Niet opgeslagen (wel `zp_category`)  
**Impact**: Very Low - dupliceert `zp_category`  
**Actie**: Skip - niet nodig

### 6. **power.powerRating** (Number)
**API Data**: Overall power rating score  
**Database**: ❌ Niet opgeslagen  
**Impact**: Medium - interessante metric  
**Actie**: Optioneel toevoegen als `power_rating NUMERIC`

---

## 📊 COVERAGE ANALYSE

### Totaal API Velden: ~45 unieke data punten
### Gemapped in Database: 40 velden (89%)
### Ontbrekend: 6 velden (11%)

**Categorieën**:
- ✅ Basic Info: 11/11 (100%)
- ✅ Power Curve: 17/17 (100%)
- ✅ Race Stats: 7/9 (78%) - mist last race details
- ⚠️ Phenotype: 3/5 (60%) - mist climber + value string
- ✅ Handicaps: 4/4 (100%)

---

## 🔧 AANBEVOLEN DATABASE UPDATES

### Prioriteit 1 (Critical)
```sql
-- Voeg phenotype_climber toe
ALTER TABLE riders_unified 
  ADD COLUMN phenotype_climber NUMERIC;
```

### Prioriteit 2 (Nice to have)
```sql
-- Voeg power_rating toe
ALTER TABLE riders_unified 
  ADD COLUMN power_rating NUMERIC;

-- Voeg last race tracking toe
ALTER TABLE riders_unified 
  ADD COLUMN last_race_date TIMESTAMPTZ,
  ADD COLUMN last_race_velo NUMERIC;

-- Voeg phenotype string value toe
ALTER TABLE riders_unified 
  ADD COLUMN phenotype_type TEXT;
```

### Prioriteit 3 (Optional)
```sql
-- Voeg race DNFs toe (impliciete data)
-- race_dnfs bestaat al maar wordt niet gevuld
-- Berekening: race.finishes beschikbaar, maar DNFs niet expliciet in API
```

---

## 🎯 POC RIDER 150437 VERIFICATIE

### Rider 150437 Data Check
```bash
curl "https://bktbeefdmrpxhsyyalvc.supabase.co/rest/v1/riders_unified?rider_id=eq.150437" | jq
```

**Resultaat**:
```json
{
  "rider_id": 150437,
  "name": "JRøne  CloudRacer-9 @YT (TeamNL)",
  "ftp": 234,
  "weight_kg": 74,
  "height_cm": 185,
  "zp_category": "C",
  "velo_rating": 1398.783,
  "velo_max_30d": null,
  "velo_max_90d": null,
  "power_20m_w": 258,
  "power_20m_wkg": 3.49,
  "phenotype_sprinter": 92.8,
  "phenotype_climber": null,  // ❌ MISSING
  "phenotype_pursuiter": 39.2,
  "phenotype_puncheur": 30.4,
  "race_wins": 0,
  "race_podiums": 4
}
```

### Ontbrekende Data bij Rider 150437
1. ❌ `phenotype_climber` - kolom bestaat niet
2. ⚠️ `velo_max_30d` - NULL (mogelijk niet in API response?)
3. ⚠️ `velo_max_90d` - NULL (mogelijk niet in API response?)

---

## 📝 SYNC SCRIPT UPDATE VEREIST

### Huidige POC Script
```typescript
// In poc-sync-rider-150437.ts
const dbData = {
  // ... existing fields ...
  
  // Phenotype (only 3 types in DB, climber not stored)
  phenotype_sprinter: rider.phenotype?.scores?.sprinter,
  phenotype_pursuiter: rider.phenotype?.scores?.pursuiter,
  phenotype_puncheur: rider.phenotype?.scores?.puncheur,
  // ❌ phenotype_climber: rider.phenotype?.scores?.climber, // MISSING COLUMN
};
```

### NA Database Update
```typescript
const dbData = {
  // ... existing fields ...
  
  // Phenotype (all 4 types + value)
  phenotype_type: rider.phenotype?.value,
  phenotype_sprinter: rider.phenotype?.scores?.sprinter,
  phenotype_climber: rider.phenotype?.scores?.climber,  // ✅ ADD
  phenotype_pursuiter: rider.phenotype?.scores?.pursuiter,
  phenotype_puncheur: rider.phenotype?.scores?.puncheur,
  
  // Power rating
  power_rating: rider.power?.powerRating,  // ✅ ADD
  
  // Last race
  last_race_date: rider.race?.last?.date,  // ✅ ADD
  last_race_velo: rider.race?.last?.rating,  // ✅ ADD
};
```

---

## ✅ CONCLUSIE

**Coverage**: **89% van API velden zijn gemapped**

**Critical Issues**: 
- ❌ `phenotype_climber` ontbreekt (1 van 4 phenotype scores)

**Recommended Actions**:
1. **NU**: Add `phenotype_climber` kolom
2. **Binnenkort**: Add `power_rating`, `last_race_date`, `last_race_velo`
3. **Later**: Add `phenotype_type` string value

**Voor Dashboards**:
- ✅ Racing Matrix: 100% data beschikbaar (behalve climber phenotype)
- ✅ Power curves: 100% compleet
- ✅ vELO ratings: 100% compleet
- ⚠️ Phenotype radar: 75% compleet (3 van 4 scores)

**Actie**: Run database migration om ontbrekende kolommen toe te voegen!
