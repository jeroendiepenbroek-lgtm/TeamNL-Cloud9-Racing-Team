# Event Scanning Strategie voor Rider 150437

## Probleem

We willen alle 25 events (23 finishes + 2 DNFs) vinden van rider 150437 over de afgelopen 90 dagen.

**Bekende informatie:**
- Laatste event: `5129365` (23 oktober 2025)
- Eerste event (binnen 90d): `5067681` (ongeveer 29 juli 2025)
- Event range: `61,684` events

## API Limitaties

**ZwiftRacing.app endpoints:**
- ❌ Geen `/public/riders/{id}/events` endpoint
- ❌ Historical rider endpoint (`/public/riders/{id}/{epoch}`) bevat geen event IDs
- ✅ Event results endpoint (`/public/results/{eventId}`) werkt, maar 1/min rate limit

**Rate limits:**
- GET `/public/results/{eventId}`: **1 request per minuut**
- Volledige scan: `61,684 events × 1 min = 42.8 dagen`

## Strategieën

### ❌ Strategie 1: Volledige Range Scan
```typescript
for (let eventId = 5067681; eventId <= 5129365; eventId++) {
  const results = await getEventResults(eventId);
  if (results.find(r => r.riderId === 150437)) {
    saveResult(eventId, result);
  }
}
```

**Probleem:** 42 dagen wachttijd - niet praktisch.

### ⚠️  Strategie 2: Sample Scan (elke 500e event)
```typescript
for (let eventId = 5067681; eventId <= 5129365; eventId += 500) {
  const results = await getEventResults(eventId);
  // Check rider...
}
```

**Voordelen:**
- Sneller: ~123 events = 2 uur
- Geeft hit rate indicatie

**Nadelen:**
- Mist events tussen samples
- Nog steeds incomplete data

### ✅ Strategie 3: Background Scanner + Database Tracking (AANBEVOLEN)

**Implementatie:**
1. **Script:** `scripts/scan-rider-events.ts`
2. **Run:** `npm run scan-rider-events`
3. **Features:**
   - Resume support (herstart waar je stopte)
   - Progress tracking (save elke 100 events)
   - Database opslag (events + race_results tabellen)
   - Rate limit handling
   - Error recovery

**Gebruik:**
```bash
# Start scanner op achtergrond
nohup npm run scan-rider-events > logs/event-scan.log 2>&1 &

# Check progress
tail -f logs/event-scan.log

# Of gebruik screen/tmux
screen -S event-scanner
npm run scan-rider-events
# Ctrl+A, D to detach
```

**Progress tracking:**
- Saved in `./data/scan-progress.json`
- Herstart automatisch vanaf laatste event
- ETA based on scan speed

### ✅ Strategie 4: Forward-Looking Tracking (BESTE LONG-TERM)

**Voor nieuwe events:**
1. Daily cron job: check laatste ~100 events
2. Real-time: POST webhook na race (toekomstige integratie)
3. Manual trigger: na bekende race

```typescript
// In cron (dagelijks 04:00)
const latestEvent = await getLatestKnownEvent();
for (let eventId = latestEvent; eventId <= latestEvent + 1000; eventId++) {
  const results = await getEventResults(eventId);
  // Check alle club members...
}
```

## Praktische Aanpak

### Voor Historical Data (90 dagen terug)

**Optie A: Accepteer incomplete data**
- Gebruik alleen bekende events (5067681, 5129365)
- Sample scan (2-10 uur) voor extra events
- Voldoende voor trends & statistieken

**Optie B: Langzame complete scan**
- Run background scanner (42 dagen)
- Check progress wekelijks
- Complete data na 6 weken

### Voor Nieuwe Events (vanaf nu)

**Implementeer tracking:**
1. ✅ Database schema (events + race_results) - DONE
2. ✅ Sync service - DONE
3. ⏳ Daily cron voor nieuwe events
4. ⏳ Manual sync endpoint: `POST /api/sync/event/:eventId`

```typescript
// Daily sync (04:00)
cron.schedule('0 4 * * *', async () => {
  const lastEvent = await getLastKnownEventId();
  const newEvents = await scanEventRange(lastEvent, lastEvent + 1000);
  logger.info(`Found ${newEvents.length} new events`);
});
```

## Aanbeveling voor TeamNL

### Fase 1: Quick Win (nu - 1 uur)
```bash
# Manual sync van bekende events
npm run sync:event 5067681
npm run sync:event 5129365
# ... andere bekende event IDs
```

### Fase 2: Sample Data (optioneel - 2-10 uur)
```bash
# Sample scan voor extra discovery
npm run scan-rider-events -- --sample 500
```

### Fase 3: Forward Tracking (permanent)
```bash
# Setup daily cron
npm run setup:cron
# Of manual: add to crontab
0 4 * * * cd /app && npm run sync:recent-events
```

### Fase 4: Background Complete Scan (optioneel - 42 dagen)
```bash
# Voor volledige historical data
nohup npm run scan-rider-events > logs/full-scan.log 2>&1 &
```

## Database Schema

```sql
-- Events worden automatisch aangemaakt via upsertResult
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  name TEXT,
  event_date TIMESTAMP,
  route_name TEXT
);

-- Race results
CREATE TABLE race_results (
  id INTEGER PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  rider_id INTEGER REFERENCES riders(zwift_id),
  position INTEGER,
  category TEXT,
  time INTEGER,
  distance REAL,
  average_power REAL,
  average_wkg REAL,
  source TEXT -- 'zwiftranking' or 'zwiftpower'
);
```

## API Calls Budget

**Per dag beschikbaar:**
- 1 call/min × 60 min × 24 uur = **1,440 calls/dag**

**Gebruik verdeling:**
- Club sync (1/60min): 24 calls/dag
- Individual riders (5/min): flexibel
- Event scanning: **~1,400 calls/dag beschikbaar**

**Optimalisatie:**
- Scan 's nachts (00:00 - 06:00) = 360 events
- Scan overdag (non-peak) = 1000+ events
- Total: **~1,360 events/dag mogelijk**

**Complete scan in:** 61,684 / 1,360 = **45 dagen**

## Conclusie

**Voor rider 150437 (25 events):**
1. ✅ Gebruik bekende event IDs voor quick data
2. ⚠️  Sample scan voor 80% coverage (2-10 uur)
3. ⏳ Background scan voor 100% coverage (42 dagen)
4. ✅ **BESTE**: Forward tracking vanaf nu + accepteer incomplete history

**Implementatie status:**
- ✅ Scanner script: `scripts/scan-rider-events.ts`
- ✅ Database schema: events + race_results
- ✅ Repository: ResultRepository.upsertResult()
- ⏳ Cron job: daily new events sync
- ⏳ Manual sync endpoint: POST /api/sync/event/:id

**Next steps:**
1. Test scanner met small range (100 events)
2. Setup daily cron voor forward tracking
3. Decide: complete scan JA/NEE?
