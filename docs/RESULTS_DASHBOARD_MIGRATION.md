# Results Dashboard - Database Migration Guide

## Overzicht
Dit document beschrijft de database wijzigingen voor de Results Dashboard feature (Feature 2).

## Migratie uitvoeren

### Via Supabase SQL Editor
1. Open Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT
2. Navigeer naar: SQL Editor
3. Maak nieuwe query aan
4. Plak de inhoud van `backend/migrations/006_extend_race_results.sql`
5. Klik "Run" om migratie uit te voeren

### Belangrijke wijzigingen

#### 1. Extend `zwift_api_race_results` tabel
Toevoegen van 15+ nieuwe kolommen:

```sql
ALTER TABLE zwift_api_race_results
  ADD COLUMN pen TEXT,                      -- A/B/C/D/E category
  ADD COLUMN total_riders INTEGER,          -- Total participants in race
  ADD COLUMN event_name TEXT,               -- Cached event name
  ADD COLUMN event_date TIMESTAMPTZ,        -- Cached event date
  ADD COLUMN delta_winner_seconds INTEGER,  -- Delta to winner (+/- seconds)
  
  -- vELO Rating (Club Ladder 1-7)
  ADD COLUMN velo_rating INTEGER,
  ADD COLUMN velo_previous INTEGER,
  ADD COLUMN velo_change INTEGER,           -- Auto-calculated via trigger
  
  -- Power Curves (all W/kg)
  ADD COLUMN power_5s DECIMAL(6,2),
  ADD COLUMN power_15s DECIMAL(6,2),
  ADD COLUMN power_30s DECIMAL(6,2),
  ADD COLUMN power_1m DECIMAL(6,2),
  ADD COLUMN power_2m DECIMAL(6,2),
  ADD COLUMN power_5m DECIMAL(6,2),
  ADD COLUMN power_20m DECIMAL(6,2),
  
  -- Performance Metrics
  ADD COLUMN effort_score INTEGER,          -- 0-100 (% of personal record)
  ADD COLUMN race_points DECIMAL(6,2);      -- RP scoring
```

#### 2. Nieuwe tabel: `rider_personal_records`
Tracking van personal bests per power duration:

```sql
CREATE TABLE rider_personal_records (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL REFERENCES riders(rider_id) ON DELETE CASCADE,
  duration TEXT NOT NULL,                   -- '5s', '15s', '30s', '1m', '2m', '5m', '20m'
  best_wkg DECIMAL(6,2) NOT NULL,          -- Best W/kg
  event_id TEXT,                            -- Event where PR was achieved
  event_date TIMESTAMPTZ,
  previous_best DECIMAL(6,2),              -- Previous PR for progression tracking
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(rider_id, duration)
);

CREATE INDEX idx_pr_rider ON rider_personal_records(rider_id);
CREATE INDEX idx_pr_duration ON rider_personal_records(duration);
```

#### 3. Automatische PR Tracking (Trigger)
Auto-update personal records bij nieuwe resultaten:

```sql
CREATE OR REPLACE FUNCTION update_personal_records()
RETURNS TRIGGER AS $$
BEGIN
  -- Update PRs voor alle power durations
  -- Alleen als nieuwe waarde beter is dan huidige PR
  ...
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prs
  AFTER INSERT OR UPDATE ON zwift_api_race_results
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_records();
```

#### 4. vELO Trend Calculation (Trigger)
Auto-calculate vELO change (↑↓→):

```sql
CREATE OR REPLACE FUNCTION calculate_velo_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.velo_rating IS NOT NULL AND NEW.velo_previous IS NOT NULL THEN
    NEW.velo_change := NEW.velo_rating - NEW.velo_previous;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_velo_change
  BEFORE INSERT OR UPDATE ON zwift_api_race_results
  FOR EACH ROW
  EXECUTE FUNCTION calculate_velo_change();
```

#### 5. Materialized View: `view_team_recent_results`
Performance optimization voor team queries:

```sql
CREATE MATERIALIZED VIEW view_team_recent_results AS
SELECT 
  r.*,
  e.title AS event_name,
  e.event_type,
  e.sub_type,
  e.route_name,
  e.time_unix AS event_time,
  rid.name AS rider_name
FROM zwift_api_race_results r
  INNER JOIN zwift_api_events e ON r.event_id = e.event_id
  INNER JOIN riders rid ON r.rider_id = rid.rider_id
WHERE r.rider_id IN (
  SELECT rider_id FROM view_my_team
)
ORDER BY r.event_date DESC;

-- Index voor snelle lookups
CREATE INDEX idx_team_results_event_date 
  ON view_team_recent_results(event_date DESC);
CREATE INDEX idx_team_results_event_id 
  ON view_team_recent_results(event_id);
CREATE INDEX idx_team_results_rider 
  ON view_team_recent_results(rider_id);
```

## Materialized View Refreshen

De materialized view moet periodiek ge-refreshed worden:

### Handmatig
```sql
REFRESH MATERIALIZED VIEW view_team_recent_results;
```

### Automatisch (via cron)
Voeg toe aan `backend/src/server.ts`:

```typescript
import cron from 'node-cron';

// Refresh view elk uur
cron.schedule('0 * * * *', async () => {
  try {
    await supabase.client.rpc('refresh_team_results_view');
    console.log('[Cron] ✅ Materialized view refreshed');
  } catch (error) {
    console.error('[Cron] ❌ View refresh failed:', error);
  }
});
```

**Alternatief**: Maak PostgreSQL functie:

```sql
CREATE OR REPLACE FUNCTION refresh_team_results_view()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW view_team_recent_results;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_team_results_view() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_team_results_view() TO anon;
```

## Verificatie

### 1. Check nieuwe kolommen
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'zwift_api_race_results'
  AND column_name IN ('pen', 'velo_rating', 'power_5s', 'power_20m', 'effort_score');
```

Verwacht: 5 rijen

### 2. Check PR tabel
```sql
SELECT * FROM rider_personal_records LIMIT 5;
```

Verwacht: Leeg (wordt gevuld bij eerste result sync)

### 3. Check materialized view
```sql
SELECT COUNT(*), MAX(event_date) 
FROM view_team_recent_results;
```

Verwacht: Aantal resultaten + meest recente datum

### 4. Check triggers
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'zwift_api_race_results';
```

Verwacht: 
- `trigger_velo_change` (BEFORE INSERT OR UPDATE)
- `trigger_update_prs` (AFTER INSERT OR UPDATE)

## API Endpoints

Na migratie zijn deze endpoints beschikbaar:

### Team Results (Grouped by Event)
```bash
GET /api/results/team?limit=20&days=90
```

Response:
```json
{
  "count": 150,
  "events_count": 15,
  "limit": 20,
  "days": 90,
  "events": [
    {
      "event_id": "5129235",
      "event_name": "ZRL S8 Div 3 - Race 1",
      "event_date": "2024-11-15T19:00:00Z",
      "event_type": "RACE",
      "sub_type": "ZRL",
      "route_name": "Watopia - Volcano Circuit",
      "results": [
        {
          "rider_id": 123,
          "rider_name": "John Doe",
          "pen": "B",
          "rank": 9,
          "total_riders": 20,
          "velo_rating": 3,
          "velo_change": 1,
          "time_seconds": 1234,
          "delta_winner_seconds": 45,
          "avg_wkg": 3.45,
          "power_5s": 6.78,
          "power_20m": 3.21,
          "effort_score": 95
        }
      ]
    }
  ]
}
```

### Individual Rider Results
```bash
GET /api/results/rider/123?days=90&limit=50
```

Response:
```json
{
  "rider_id": 123,
  "count": 25,
  "days": 90,
  "results": [...],
  "personal_records": [
    {
      "duration": "5s",
      "best_wkg": 6.89,
      "event_id": "5129235",
      "event_date": "2024-11-15T19:00:00Z",
      "previous_best": 6.45
    }
  ]
}
```

### Rider Stats
```bash
GET /api/results/rider/123/stats?days=90
```

Response:
```json
{
  "rider_id": 123,
  "period_days": 90,
  "total_races": 25,
  "wins": 2,
  "podiums": 8,
  "top10": 18,
  "avg_rank": 7.5,
  "avg_wkg": 3.45,
  "avg_effort_score": 92
}
```

## Rollback

Als migratie moet worden teruggedraaid:

```sql
-- Drop view
DROP MATERIALIZED VIEW IF EXISTS view_team_recent_results;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_velo_change ON zwift_api_race_results;
DROP TRIGGER IF EXISTS trigger_update_prs ON zwift_api_race_results;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_velo_change();
DROP FUNCTION IF EXISTS update_personal_records();
DROP FUNCTION IF EXISTS refresh_team_results_view();

-- Drop PR table
DROP TABLE IF EXISTS rider_personal_records;

-- Remove columns (DESTRUCTIVE - data loss!)
ALTER TABLE zwift_api_race_results
  DROP COLUMN IF EXISTS pen,
  DROP COLUMN IF EXISTS total_riders,
  DROP COLUMN IF EXISTS event_name,
  DROP COLUMN IF EXISTS event_date,
  DROP COLUMN IF EXISTS delta_winner_seconds,
  DROP COLUMN IF EXISTS velo_rating,
  DROP COLUMN IF EXISTS velo_previous,
  DROP COLUMN IF EXISTS velo_change,
  DROP COLUMN IF EXISTS power_5s,
  DROP COLUMN IF EXISTS power_15s,
  DROP COLUMN IF EXISTS power_30s,
  DROP COLUMN IF EXISTS power_1m,
  DROP COLUMN IF EXISTS power_2m,
  DROP COLUMN IF EXISTS power_5m,
  DROP COLUMN IF EXISTS power_20m,
  DROP COLUMN IF EXISTS effort_score,
  DROP COLUMN IF EXISTS race_points;
```

## Volgende Stappen

1. ✅ Voer migratie uit via Supabase SQL Editor
2. ✅ Verifieer alle wijzigingen (zie Verificatie sectie)
3. ⏳ Test API endpoints met Postman/curl
4. ⏳ Sync results voor recent events om data te vullen
5. ⏳ Refresh materialized view
6. ⏳ Test frontend componenten (ResultsDashboard, RiderResultsView)
7. ⏳ Deploy naar production

## Frontend Routes

Nieuwe pagina's toegevoegd:
- `/results` - Team Recent Results Dashboard
- `/results/rider/:riderId` - Individual Rider Results

Navigatie link toegevoegd: 🏆 Resultaten

## Troubleshooting

### Error: relation "view_team_recent_results" does not exist
**Oplossing**: Run migratie SQL bestand opnieuw, zorg dat view wordt gecreëerd

### Error: column "power_5s" does not exist
**Oplossing**: ALTER TABLE statements zijn niet uitgevoerd, check migratie logs

### Personal records blijven leeg
**Oplossing**: Sync event results opnieuw, trigger zal PRs automatisch updaten

### Materialized view is outdated
**Oplossing**: Run `REFRESH MATERIALIZED VIEW view_team_recent_results;`

## Support

Zie ook:
- `backend/migrations/006_extend_race_results.sql` - Volledige migratie SQL
- `docs/FEATURE_IMPLEMENTATION_PLAN.md` - Complete feature specificatie
- `docs/ARCHITECTURE_DIAGRAM.md` - Systeem architectuur
