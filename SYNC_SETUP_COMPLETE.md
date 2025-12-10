# 🏁 TeamNL Cloud9 Racing - Data Sync Setup Complete

## ✅ Wat is er klaar?

### 1. API Verificatie
- ✅ ZwiftRacing.app API werkt perfect voor rider 150437
- ✅ Data beschikbaar: vELO (1413.91), power curve, phenotype (Sprinter)
- ✅ Zwift Official API data al aanwezig (racing_score: 553)

### 2. Database Architectuur
- ✅ Nieuwe tabel: `api_zwiftracing_riders` (direct rider lookup, geen club dependency)
- ✅ Updated view: `v_rider_complete` (FULL OUTER JOIN beide APIs)
- ✅ Scripts gereed: fetch, check, sync

### 3. Migration Files Aangemaakt
- `migrations/005_zwiftracing_riders_table.sql` - Nieuwe riders tabel
- `migrations/006_updated_views.sql` - Updated view met club-onafhankelijke JOIN
- `/tmp/run_migrations.sql` - Combined migration voor Supabase

## 🎯 Volgende Stappen (handmatig)

### Stap 1: Voer Migrations Uit in Supabase

1. Ga naar: https://supabase.com/dashboard/project/tfsepzumkireferencer/sql/new

2. Plak deze SQL:

```sql
-- ============================================================================
-- Migration 005: ZwiftRacing Riders Table
-- ============================================================================
DROP TABLE IF EXISTS api_zwiftracing_public_clubs_riders CASCADE;
DROP TABLE IF EXISTS api_zwiftracing_public_clubs CASCADE;

CREATE TABLE IF NOT EXISTS api_zwiftracing_riders (
  rider_id INTEGER PRIMARY KEY,
  source_api TEXT DEFAULT 'zwiftracing.app' NOT NULL,
  endpoint TEXT DEFAULT '/public/riders/{id}' NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  id INTEGER NOT NULL,
  name TEXT,
  country TEXT,
  velo DECIMAL(10,2),
  racing_score DECIMAL(10,2),
  category TEXT,
  ftp INTEGER,
  power_5s INTEGER,
  power_15s INTEGER,
  power_30s INTEGER,
  power_60s INTEGER,
  power_120s INTEGER,
  power_300s INTEGER,
  power_1200s INTEGER,
  power_5s_wkg DECIMAL(5,2),
  power_15s_wkg DECIMAL(5,2),
  power_30s_wkg DECIMAL(5,2),
  power_60s_wkg DECIMAL(5,2),
  power_120s_wkg DECIMAL(5,2),
  power_300s_wkg DECIMAL(5,2),
  power_1200s_wkg DECIMAL(5,2),
  weight DECIMAL(5,2),
  height INTEGER,
  phenotype TEXT,
  race_count INTEGER,
  raw_response JSONB NOT NULL
);

CREATE INDEX idx_zwiftracing_riders_velo ON api_zwiftracing_riders(velo DESC);
CREATE INDEX idx_zwiftracing_riders_racing_score ON api_zwiftracing_riders(racing_score DESC);
CREATE INDEX idx_zwiftracing_riders_fetched ON api_zwiftracing_riders(fetched_at DESC);

-- ============================================================================
-- Migration 006: Updated Views
-- ============================================================================
DROP VIEW IF EXISTS v_rider_complete CASCADE;

CREATE OR REPLACE VIEW v_rider_complete AS
SELECT 
  COALESCE(zo.rider_id, zr.rider_id) AS rider_id,
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name) AS full_name,
  zr.name AS racing_name,
  zo.first_name,
  zo.last_name,
  zr.velo,
  zr.racing_score AS zwiftracing_score,
  zo.competition_racing_score AS zwift_official_racing_score,
  zo.competition_category AS zwift_official_category,
  zr.phenotype,
  zr.category AS zwiftracing_category,
  zr.race_count,
  zr.ftp AS racing_ftp,
  zr.power_5s, zr.power_15s, zr.power_30s, zr.power_60s,
  zr.power_120s, zr.power_300s, zr.power_1200s,
  zr.power_5s_wkg, zr.power_15s_wkg, zr.power_30s_wkg,
  zr.power_60s_wkg, zr.power_120s_wkg, zr.power_300s_wkg,
  zr.power_1200s_wkg,
  COALESCE(zo.weight / 1000.0, zr.weight) AS weight_kg,
  COALESCE(zo.height, zr.height) AS height_cm,
  COALESCE(zo.ftp, zr.ftp) AS ftp_watts,
  zo.image_src AS avatar_url,
  zo.image_src_large AS avatar_url_large,
  zo.followers_count,
  zo.followees_count,
  zo.rideons_given,
  zo.age,
  zo.male AS is_male,
  zo.country_code,
  zo.country_alpha3,
  zo.achievement_level,
  zo.total_distance / 1000.0 AS total_distance_km,
  zo.total_distance_climbed AS total_elevation_m,
  zo.privacy_profile,
  zo.privacy_activities,
  zo.riding AS currently_riding,
  zo.world_id AS current_world,
  zr.fetched_at AS racing_data_updated,
  zo.fetched_at AS profile_data_updated,
  CASE 
    WHEN zr.rider_id IS NOT NULL AND zo.rider_id IS NOT NULL THEN 'complete'
    WHEN zr.rider_id IS NOT NULL THEN 'racing_only'
    WHEN zo.rider_id IS NOT NULL THEN 'profile_only'
  END AS data_completeness
FROM api_zwift_api_profiles zo
FULL OUTER JOIN api_zwiftracing_riders zr ON zo.rider_id = zr.rider_id;

GRANT SELECT ON v_rider_complete TO authenticated;
GRANT SELECT ON v_rider_complete TO anon;
```

3. Klik **RUN** ▶️

### Stap 2: Sync Data

Na succesvolle migration, run:

```bash
./sync-complete-data.sh
```

Of handmatig:
```bash
node fetch-zwiftracing-rider.js 150437
```

## 📊 Verwachte Output

```
📊 COMPLETE RIDER PROFILE - Rider 150437

👤 Identity:
   Full Name: Jeroen Diepenbroek
   Racing Name: JRøne  CloudRacer-9 @YT (TeamNL)

🏁 Racing Metrics:
   vELO: 1413.91
   ZwiftRacing Score: 1413.91
   Zwift Official Score: 553
   Category: B
   Phenotype: Sprinter
   Race Count: 23

💪 Power Curve:
   5s: 12.38 w/kg
   20min: 3.51 w/kg

📏 Physical:
   Weight: 74.0 kg
   Height: 183 cm
   FTP: 248 W

📸 Avatar: ✅ Present

✅ DATA COMPLETENESS: COMPLETE
```

## 🎯 Architectuur Wijziging

### OUD (Club-based):
```
api_zwiftracing_public_clubs
  ↓ (FK: club_id)
api_zwiftracing_public_clubs_riders
```
❌ Beperking: alleen riders in clubs beschikbaar

### NIEUW (Direct rider lookup):
```
api_zwiftracing_riders
  ↓ (direct /public/riders/{riderId} endpoint)
ANY rider_id, geen club dependency
```
✅ Voordeel: custom team samenstelling mogelijk

## 🔧 Scripts Overzicht

| Script | Doel |
|--------|------|
| `prepare-migrations.js` | Toont migration SQL voor Supabase |
| `check-setup.js` | Controleert of migrations zijn uitgevoerd |
| `fetch-zwiftracing-rider.js` | Haalt rider data op en slaat op |
| `sync-complete-data.sh` | Complete workflow: check → fetch → verify |

## 📚 API Endpoints

### ZwiftRacing.app
- **Endpoint**: `https://zwift-ranking.herokuapp.com/public/riders/{riderId}`
- **Auth**: Header `Authorization: 650c6d2fc4ef6858d74cbef1`
- **Rate**: 5 calls/min
- **Data**: vELO, power curve, phenotype, race stats

### Zwift Official API
- **Endpoint**: `https://us-or-rly101.zwift.com/api/profiles/{id}`
- **Auth**: OAuth 2.0 (credentials in scripts)
- **Data**: racing_score, avatar, social stats, FTP, weight

## ✅ Checklist

- [x] ZwiftRacing API getest → werkt
- [x] Zwift Official data aanwezig → 553 racing score
- [x] Migration 005 aangemaakt → nieuwe tabel
- [x] Migration 006 aangemaakt → updated view
- [x] Fetch script bijgewerkt → nieuwe schema mapping
- [ ] **Migrations uitvoeren in Supabase** ← DIT IS STAP 1
- [ ] Data syncen met `./sync-complete-data.sh`
- [ ] Verificatie: `data_completeness = 'complete'`

## 🎉 Resultaat

Na deze stappen heb je:
- ✅ Volledige rider data (beide APIs gecombineerd)
- ✅ Club-onafhankelijke architectuur
- ✅ Custom team management mogelijk
- ✅ Racing Matrix klaar voor Team Dashboard

## 📞 Support

Bij vragen of problemen, check:
- `check-setup.js` voor database status
- Supabase logs: https://supabase.com/dashboard/project/tfsepzumkireferencer/logs
- API responses bewaard in `raw_response` JSONB field
