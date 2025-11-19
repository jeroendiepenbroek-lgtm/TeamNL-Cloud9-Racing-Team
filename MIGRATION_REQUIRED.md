# ⚠️ DATABASE MIGRATION REQUIRED

## Error
```
ERROR: 42P01: relation "zwift_api_race_results" does not exist
```

## Probleem
De Results Dashboard feature verwacht extended kolommen in de **`event_results`** tabel (de echte sourcing tabel voor race results uit `/public/zp/<eventId>/results` API).

## Oplossing

### Stap 1: Open Supabase SQL Editor
1. Ga naar: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql
2. Klik "New Query"

### Stap 2: Kopieer Migratie SQL
Open het bestand:
```
backend/migrations/006_extend_race_results.sql
```

Kopieer de VOLLEDIGE inhoud (174 regels)

### Stap 3: Plak en Execute
1. Plak de SQL in de Supabase SQL Editor
2. Klik "Run" (of Ctrl/Cmd + Enter)

### Stap 4: Verificatie
Run deze query om te verifiëren dat de kolommen zijn toegevoegd:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'event_results'
  AND column_name IN ('pen', 'velo_rating', 'power_5s', 'power_20m', 'effort_score', 'event_name', 'event_date')
ORDER BY column_name;
```

Verwacht resultaat: **7 rijen**

**Check bestaande kolommen:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'event_results'
ORDER BY ordinal_position;
```

Moet bevatten: `position`, `finish_time_seconds`, `watts_per_kg`, `avg_power_watts`, `category`, `did_finish`

### Stap 5: Refresh Materialized View
```sql
REFRESH MATERIALIZED VIEW view_team_recent_results;
```

### Stap 6: Test API
```bash
curl http://localhost:3000/api/results/team?limit=5
```

## Wat doet de migratie?

### Extend `event_results` tabel (sourcing voor `/public/zp/<eventId>/results`)

**BESTAANDE kolommen (blijven intact):**
- `position` → wordt gemapped naar `rank` in view
- `finish_time_seconds` → wordt gemapped naar `time_seconds` in view
- `watts_per_kg` → wordt gemapped naar `avg_wkg` in view
- `category` → wordt gemapped naar `pen` in view
- `did_finish` → boolean status

**NIEUWE kolommen:**
1. ✅ Power curve kolommen: `power_5s`, `power_15s`, `power_30s`, `power_1m`, `power_2m`, `power_5m`, `power_20m`
2. ✅ vELO tracking: `velo_rating`, `velo_previous`, `velo_change`
3. ✅ Race context: `pen` (extra), `total_riders`, `event_name`, `event_date`
4. ✅ Derived metrics: `effort_score`, `race_points`, `delta_winner_seconds`

**NIEUWE tabellen:**
5. ✅ `rider_personal_records` - Auto-tracking van PRs per duration
6. ✅ Auto-update triggers (vELO change calculation, PR updates)
7. ✅ Materialized view `view_team_recent_results` met kolom mapping
8. ✅ Indexes voor performance

## Na migratie

### Data vullen
De nieuwe kolommen zijn leeg. Om ze te vullen:

1. **Sync event results opnieuw**:
   ```bash
   curl -X POST http://localhost:3000/api/results/:eventId/sync
   ```

2. **Power data komt van ZwiftPower API** - indien beschikbaar
3. **vELO data** - handmatig invoeren of van Club Ladder scraping
4. **Effort scores** - worden automatisch berekend door trigger na PRs

### Onderhoud

**Materialized view refreshen** (1x per uur aanbevolen):
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY view_team_recent_results;
```

Of via cron job in `backend/src/server.ts`:
```typescript
cron.schedule('0 * * * *', async () => {
  await supabase.client.rpc('refresh_team_results_view');
});
```

## Troubleshooting

### "column already exists"
Normaal - migratie gebruikt `ADD COLUMN IF NOT EXISTS`, skip deze errors

### "materialized view already exists"  
Run: `DROP MATERIALIZED VIEW IF EXISTS view_team_recent_results CASCADE;`

### "trigger already exists"
Run: `DROP TRIGGER IF EXISTS trigger_name ON race_results;`

## Rollback (als nodig)
Zie `docs/RESULTS_DASHBOARD_MIGRATION.md` sectie "Rollback"

---

**Status**: ⏳ Waiting for manual SQL execution in Supabase Dashboard
