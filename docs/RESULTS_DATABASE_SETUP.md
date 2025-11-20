# Results Dashboard - Database Setup Guide

## Overzicht
Deze guide helpt je om de Results Dashboard database structuur en test data op te zetten.

## Prerequisites
- ✅ Supabase account met toegang tot je project
- ✅ `zwift_api_race_results` tabel bestaat al
- ✅ `riders` tabel bestaat al

## Stap 1: Database Migration Uitvoeren

### 1.1 Open Supabase Dashboard
1. Ga naar: https://supabase.com/dashboard
2. Selecteer je project: **TeamNL Cloud9 Racing Team**
3. Klik op **SQL Editor** in de sidebar

### 1.2 Run Migration SQL
1. Klik op **New query**
2. Open bestand: `backend/migrations/SUPABASE_ADD_RESULTS_COLUMNS.sql`
3. Kopieer ALLE inhoud (244 regels)
4. Plak in de SQL Editor
5. Klik **Run** (groene knop rechtsboven)

### 1.3 Verwachte Output
```
Migration successful - Results Dashboard tables ready
total_results: <aantal>
results_with_power: 0
results_with_velo: 0
total_personal_records: 0
riders_with_prs: 0
```

### 1.4 Verificatie
Check of deze kolommen nu bestaan in `zwift_api_race_results`:
- ✅ `power_5s`, `power_15s`, `power_30s`, `power_1m`, `power_2m`, `power_5m`, `power_20m`
- ✅ `velo_rating`, `velo_previous`, `velo_change`
- ✅ `effort_score`, `race_points`
- ✅ `event_name`, `event_date`, `pen`, `total_riders`

Check of deze tabel bestaat:
- ✅ `rider_personal_records`

---

## Stap 2: Test Data Seeden

### 2.1 Open SQL Editor weer
1. Klik op **New query** (of gebruik zelfde query window)

### 2.2 Run Seed SQL
1. Open bestand: `backend/migrations/SUPABASE_SEED_RESULTS_DATA.sql`
2. Kopieer ALLE inhoud
3. Plak in de SQL Editor
4. Klik **Run**

### 2.3 Verwachte Output
```
status: "Seed successful!"
total_results: 18
unique_events: 5
unique_riders: 5
results_with_power: 18
results_with_velo: 18
```

Plus een tabel met sample data:
```
event_name                      | event_date | rider_name          | rank | avg_wkg | velo_rating
WTRL TTT - Stage 1              | 2024-11-18 | Jeroen Diepenbroek  | 1    | 4.85    | 6
WTRL TTT - Stage 1              | 2024-11-18 | Alex Johnson        | 2    | 4.72    | 6
...
```

---

## Stap 3: API Testen

### 3.1 Test Team Recent Results Endpoint
```bash
curl http://localhost:3001/api/results/team/recent?days=90&limit=50
```

**Verwachte response:**
```json
{
  "success": true,
  "count": 18,
  "events_count": 5,
  "limit": 50,
  "days": 90,
  "events": [
    {
      "event_id": "5000001",
      "event_name": "WTRL TTT - Stage 1",
      "event_date": "2024-11-18T19:00:00.000Z",
      "pen": "A",
      "total_riders": 45,
      "results": [
        {
          "rider_id": 150437,
          "rider_name": "Jeroen Diepenbroek",
          "rank": 1,
          "time_seconds": 1820,
          "avg_wkg": 4.85,
          "velo_rating": 6,
          "velo_change": 1,
          "power_5s": 8.73,
          "power_15s": 8.29,
          ...
        }
      ]
    }
  ]
}
```

### 3.2 Test in Browser
1. Open: `http://localhost:3001/results`
2. Verwachte output:
   - ✅ 5 event cards zichtbaar
   - ✅ Collapsible tables met rider results
   - ✅ vELO badges met kleuren (1-7)
   - ✅ Power curves (5s, 15s, 1m, 5m, 20m)
   - ✅ Medals voor top 3 (🏆🥈🥉)

---

## Stap 4: Production Deploy

### 4.1 Commit Changes
```bash
git add backend/migrations/SUPABASE_*.sql
git add scripts/seed-*.ts
git add docs/RESULTS_DATABASE_SETUP.md
git commit -m "docs: Database setup guide for Results Dashboard"
git push origin main
```

### 4.2 Railway Deploy
- Railway detecteert push → auto-deploy
- Wacht 1-2 minuten
- Check: `https://your-railway-url.railway.app/results`

### 4.3 Production Database Setup
1. Herhaal Stap 1 en 2 voor **production** Supabase project
2. Gebruik production Supabase credentials
3. Verify data met production API endpoint

---

## Troubleshooting

### ❌ Error: "column does not exist: power_5s"
**Probleem**: Migration niet uitgevoerd
**Oplossing**: Run `SUPABASE_ADD_RESULTS_COLUMNS.sql` in SQL Editor

### ❌ Error: "relation rider_personal_records does not exist"
**Probleem**: Migration incomplete
**Oplossing**: Run volledige migration SQL opnieuw

### ❌ API returns empty events array
**Probleem**: Geen data in database
**Oplossing**: Run `SUPABASE_SEED_RESULTS_DATA.sql`

### ❌ Frontend shows "Geen results gevonden"
**Probleem**: Data te oud (seed data is from Nov 2024)
**Oplossing**: 
- Verhoog `days` filter naar 180 of 365
- Of update `event_date` in seed data naar recente datums

---

## Data Structure Reference

### zwift_api_race_results (extended columns)
```sql
-- Race metadata
pen TEXT                      -- A/B/C/D/E
total_riders INTEGER          -- Total participants
event_name TEXT               -- Cached name
event_date TIMESTAMPTZ        -- Cached date

-- vELO tracking
velo_rating INTEGER           -- 1-7
velo_previous INTEGER         -- Previous rating
velo_change INTEGER           -- Auto-calculated delta

-- Power curves (W/kg)
power_5s DECIMAL(6,2)         -- 5 second peak
power_15s DECIMAL(6,2)        -- 15 second peak
power_30s DECIMAL(6,2)        -- 30 second peak
power_1m DECIMAL(6,2)         -- 1 minute peak
power_2m DECIMAL(6,2)         -- 2 minute peak
power_5m DECIMAL(6,2)         -- 5 minute peak
power_20m DECIMAL(6,2)        -- 20 minute peak (FTP)

-- Performance
effort_score INTEGER          -- 0-100 (% of PR)
race_points DECIMAL(6,2)      -- RP scoring
delta_winner_seconds INTEGER  -- Delta to winner
```

### rider_personal_records (new table)
```sql
id SERIAL PRIMARY KEY
rider_id INTEGER              -- Foreign key to riders
duration TEXT                 -- '5s', '15s', '30s', '1m', '2m', '5m', '20m'
best_wkg DECIMAL(6,2)         -- Best W/kg for duration
event_id TEXT                 -- Event where PR achieved
event_date TIMESTAMPTZ        -- Date of PR
previous_best DECIMAL(6,2)    -- Previous PR value
achieved_at TIMESTAMPTZ       -- Timestamp
updated_at TIMESTAMPTZ        -- Last update
```

---

## Next Steps

### Immediate
- [x] Database migration executed
- [x] Test data seeded
- [x] API tested
- [x] Frontend verified

### Future Enhancements
- [ ] Real power data sync from ZwiftRacing API
- [ ] Automatic PR detection and notifications
- [ ] Power curve charts (recharts integration)
- [ ] CSV export functionality
- [ ] Individual rider results view
- [ ] Compare riders feature
- [ ] Performance trends over time

---

## Support

**Migration files:**
- `backend/migrations/SUPABASE_ADD_RESULTS_COLUMNS.sql` - Schema changes
- `backend/migrations/SUPABASE_SEED_RESULTS_DATA.sql` - Test data

**Scripts:**
- `scripts/run-results-migration.ts` - Verify migration (optional)
- `scripts/seed-results-data.ts` - Generate test data (unused, replaced by SQL)

**API Endpoints:**
- `GET /api/results/team/recent?days=90&limit=50`
- `GET /api/results/rider/:riderId?days=90`
- `GET /api/results/rider/:riderId/stats?days=90`
- `GET /api/results/export/csv?days=90&riderId=X`

**Frontend:**
- `/results` - Results Dashboard (ResultsModern component)
