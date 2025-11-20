# Real-Time Results Sync - Quick Start

## Overzicht

Vervang seed data met échte race results van team members via ZwiftRacing API.

## Endpoint

```
POST /api/sync/real-results
```

## Workflow

1. **Verwijder seed data** (event IDs 5000%)
2. **Haal recente events** op (laatste 30 dagen uit `zwift_api_events`)
3. **Fetch results per event** via `/public/results/{eventId}`
4. **Filter team members** (op basis van `riders` tabel)
5. **Upsert naar database** (`zwift_api_race_results`)

## Prerequisites

- ✅ Team members in `riders` tabel (run club sync eerst)
- ✅ Events in `zwift_api_events` tabel (run event sync eerst)
- ✅ `ZWIFT_API_KEY` in `.env`

## Rate Limiting

⚠️ **ZwiftRacing API limits**:
- Event results: **1 request/minute**
- Script wacht 60 sec tussen events
- Max 10 events per run (configurable)

## Gebruik

### Via API (curl)

```bash
curl -X POST http://localhost:3000/api/sync/real-results
```

### Via Postman

```
POST http://localhost:3000/api/sync/real-results
```

## Response Format

```json
{
  "success": true,
  "events_processed": 8,
  "results_synced": 42,
  "riders_involved": 5
}
```

## Error Handling

**No riders found**:
```json
{
  "success": false,
  "error": "No riders found. Run club sync first."
}
```

**No team results**:
```json
{
  "success": true,
  "message": "No team results found in recent events",
  "results_synced": 0
}
```

## Logging

Console output tijdens sync:

```
🚀 Start real-time results sync
📊 Found 74 riders
🗑️  Deleting seed data...
📅 Found 45 recent events
🔍 Fetching results for event 5129235...
   Found 3 team results
🔍 Fetching results for event 5128901...
   Found 2 team results
...
📦 Total results collected: 42
💾 Inserting results...
✅ Synced 42 results
```

## Verificatie

Check data in database:

```sql
-- Count results
SELECT COUNT(*) FROM zwift_api_race_results;

-- Show recent results
SELECT 
  event_name,
  rider_name,
  rank,
  velo_rating,
  event_date
FROM zwift_api_race_results
ORDER BY event_date DESC
LIMIT 10;

-- Team members in results
SELECT 
  rider_name,
  COUNT(*) as race_count
FROM zwift_api_race_results
GROUP BY rider_name
ORDER BY race_count DESC;
```

## Performance

**Typical run** (10 events):
- Duration: ~10 minutes (1 min/event + processing)
- Results collected: 20-50 (afhankelijk van team participation)
- Events with team: 5-8 (niet alle events hebben team members)

## Configuration

Pas limits aan in `sync-real-results.ts`:

```typescript
// Max events per run
for (const event of events.slice(0, 10)) { // ← Change 10

// Days to sync
const events = await supabase.getRecentEvents(30); // ← Change 30
```

## Troubleshooting

### Rate Limit Errors

```
Error: Rate limit exceeded
```

**Oplossing**: Wacht 60 min voordat je opnieuw synct.

### Empty Results

```
No team results found in recent events
```

**Mogelijke oorzaken**:
1. Team members niet actief in laatste 30 dagen
2. Events in database maar nog geen signups
3. Rider IDs in `riders` tabel komen niet overeen met event signups

**Check**: 
```sql
SELECT * FROM riders LIMIT 5;
SELECT * FROM zwift_api_events ORDER BY event_start DESC LIMIT 5;
```

### Missing Power Data

Power curves (`power_5s`, `power_20m`, etc.) kunnen `null` zijn als:
- ZwiftRacing API geen power data heeft
- Event was een "ride" (geen race)
- Rider power privacy instellingen

## Next Steps

Na successvolle sync:

1. ✅ Check Results Dashboard: `http://localhost:5173/results`
2. ✅ Verify power curves visible (7 columns: 5s-20m)
3. ✅ Check vELO tier change indicators
4. ✅ Test DNF badge (als er DNF results zijn)
5. ✅ Verify route details (na route migration)

## Production Deployment

Voor Railway/Render:

```bash
# Trigger sync via Railway API
curl -X POST https://your-app.railway.app/api/sync/real-results

# Of schedule met cron (add to server.ts):
cron.schedule('0 6 * * *', async () => {
  // Run daily at 6am
  await fetch('http://localhost:3000/api/sync/real-results', {
    method: 'POST'
  });
});
```

## API Documentation

Zie ook: `docs/API.md` - Complete endpoint reference
