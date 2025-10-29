# Event Discovery Oplossing - Rider Race History

## Probleem

Je wilt weten **welke events rider 150437 in de afgelopen 90 dagen heeft gereden**, maar:

❌ **ZwiftRacing.app API heeft GEEN direct endpoint** voor:
- `GET /public/riders/{riderId}/events` - Bestaat niet
- `GET /public/riders/{riderId}/results` - Bestaat niet  
- `POST /public/riders` (bulk) - Geeft alleen rider data, geen event IDs

## Oplossingen

### Oplossing 1: Event Range Scanning ✅ (Geïmplementeerd)

**Script**: `scripts/find-recent-rider-events.ts`

**Hoe het werkt**:
1. Start bij geschat huidig event ID (~5110000)
2. Scan dekrementeel terug in tijd
3. Voor elk event: haal `/public/results/{eventId}` op
4. Zoek naar `riderId: 150437` in results array
5. Stop na 50 events zonder match of max events bereikt

**Voordelen**:
- ✅ 100% betrouwbaar - vindt alle events waar rider geraced heeft
- ✅ Geen externe dependencies (alleen ZwiftRacing.app API)
- ✅ Configureerbaar (start ID, max events, stop criteria)

**Nadelen**:
- ⏱️ Langzaam: 1 event/minuut rate limit (50 events = 50 minuten)
- 📊 Niet weten welke range te scannen (events zijn niet sequentieel per tijd)

**Usage**:
```bash
# Scan 100 recente events voor rider 150437
npx tsx scripts/find-recent-rider-events.ts 150437 100

# Output: lijst van event IDs + bulk sync commands
```

**Optimalisaties**:
- **Start bij bekend event ID**: Als je weet waar je moet beginnen
- **Stop criteria**: Script stopt na 50 events zonder match
- **Batch processing**: Output geeft bulk sync commands

### Oplossing 2: ZwiftPower Profile Scraping 🚧 (Niet geïmplementeerd)

**Concept**: Scrape rider profiel van ZwiftPower.com

**URL**: `https://zwiftpower.com/profile.php?z=150437`

**Voordelen**:
- ⚡ Snel - 1 request voor alle recente events
- 📅 Events gesorteerd op datum
- 🎯 Alleen events waar rider echt in zat

**Nadelen**:
- 🔒 **ZwiftPower vereist login** (sinds 2024)
- 🕸️ HTML parsing - fragiel bij layout changes
- ⚖️ Mogelijk tegen ToS

**Status**: Niet bruikbaar door login requirement

### Oplossing 3: Club Events Tracking 🎯 (Aanbevolen)

**Concept**: Maintain lijst van TeamNL races

**Implementatie**:
```typescript
const TEAM_EVENTS = {
  '2025-10': [5109123, 5109456, 5109789],  // Oktober 2025
  '2025-09': [5098123, 5098456, 5098789],  // September 2025
  // etc.
};
```

**Voordelen**:
- ⚡ Instant - geen scanning nodig
- 🎯 Alleen relevante team races
- 📊 Metadata (race naam, datum, type) kan toegevoegd worden

**Nadelen**:
- 📝 Handmatig onderhoud vereist
- 🔍 Mist non-team races

**Action Items**:
1. Maak lijst van bekende TeamNL race event IDs
2. Update lijst maandelijks met nieuwe races
3. Sync automatisch na race (via scheduler)

### Oplossing 4: Manual Event Input ✅ (Huidig werkend)

**Script**: `scripts/sync-event-results.ts`

**Usage**:
```bash
# Sync enkel event
npx tsx scripts/sync-event-results.ts 4879983

# Bulk sync meerdere events
for id in 4879983 4880123 4880456; do
  npx tsx scripts/sync-event-results.ts $id
  sleep 61  # Rate limit
done
```

**Wanneer gebruiken**:
- Je kent specifieke event IDs
- Post-race sync van bekende events
- Testen met sample events

## Praktische Workflow voor 90-Dagen Historie

### Stap 1: Bepaal Event ID Range

**Schatting**: Events zijn sequentieel, ~1000-5000 per maand

```bash
# Huidige event ID (oktober 2025): ~5110000
# 90 dagen terug: ~5110000 - (3 * 3000) = ~5101000

# Dus scan range: 5101000 - 5110000
```

### Stap 2: Run Event Discovery

```bash
# Scan 200 events (start bij 5110000, ga terug)
npx tsx scripts/find-recent-rider-events.ts 150437 200

# Dit duurt ~200 minuten (3.3 uur)
# Laat draaien in achtergrond met nohup:
nohup npx tsx scripts/find-recent-rider-events.ts 150437 200 > scan.log 2>&1 &

# Monitor progress:
tail -f scan.log
```

**Output voorbeeld**:
```
✅ SCAN VOLTOOID
Rider ID: 150437
Events gescand: 200
Events gevonden: 15

📋 GEVONDEN EVENTS:
1. Event ID: 5109456
   Position: 5 | Category: B | Time: 45.3 min
   Rating: 1250.5 (+5.2)

2. Event ID: 5108123
   Position: 8 | Category: B | Time: 48.1 min
   Rating: 1245.3 (+2.8)
...

🚀 BULK SYNC COMMANDS:
for id in 5109456 5108123 5107890 ...; do
  npx tsx scripts/sync-event-results.ts $id && sleep 61
done
```

### Stap 3: Sync Gevonden Events

```bash
# Kopieer bulk sync command uit output
for id in 5109456 5108123 5107890; do
  npx tsx scripts/sync-event-results.ts $id && sleep 61
done
```

### Stap 4: Query Database

```sql
-- Haal alle race results van rider 150437 op
SELECT 
  e.id as eventId,
  e.name,
  e.eventDate,
  rr.position,
  rr.category,
  rr.time / 60.0 as timeMinutes,
  rr.rating,
  rr.ratingDelta
FROM race_results rr
JOIN riders r ON rr.riderId = r.zwiftId
JOIN events e ON rr.eventId = e.id
WHERE r.zwiftId = 150437
ORDER BY e.eventDate DESC;
```

## API Limitation: Waarom is dit zo complex?

**ZwiftRacing.app API design**:
- ✅ `/public/results/{eventId}` - Haal ALL results voor 1 event
- ❌ Geen inverse query: "events voor rider X"

**Reden**: Performance & cost
- Event results = beperkt (50-200 riders per event)
- Rider events = onbeperkt (1000s races over tijd)
- Inverse index = te duur om te hosten

**Vergelijking met SQL**:
```sql
-- Dit bestaat (efficient):
SELECT * FROM results WHERE eventId = 4879983;

-- Dit bestaat NIET (zou duur zijn):
SELECT DISTINCT eventId FROM results WHERE riderId = 150437;
```

## Aanbevolen Aanpak

### Voor TeamNL Cloud9 Dashboard:

1. **Korte termijn** (deze week):
   - Gebruik manual sync voor bekende races
   - Sync post-race via `sync-event-results.ts`

2. **Middellange termijn** (deze maand):
   - Run `find-recent-rider-events.ts` 1x voor historical backfill
   - Scan laatste 500 events (8 uur) voor alle favorite riders
   - Store results in database

3. **Lange termijn** (volgende maand):
   - Maintain TeamNL events calendar (oplossing 3)
   - Auto-sync na elke bekende race
   - Schedule weekly scan voor nieuwe events (50 events = ~1 uur)

### Automation Strategy:

```typescript
// Pseudo-code voor geautomatiseerde sync
class EventDiscoveryScheduler {
  
  // Wekelijkse scan voor nieuwe events
  async weeklyEventScan() {
    const favoriteRiders = await getRiderFavorites();
    const lastScanEventId = await getLastScannedEventId();
    const currentEventId = lastScanEventId + 500; // ~1 week events
    
    for (const rider of favoriteRiders) {
      const events = await scanEventRange(
        rider.zwiftId,
        lastScanEventId,
        currentEventId
      );
      
      await syncEventsBulk(events);
    }
  }
  
  // Post-race sync voor bekende events
  async syncKnownEvents() {
    const teamEvents = TEAM_EVENTS[currentMonth()];
    
    for (const eventId of teamEvents) {
      await syncEventResults(eventId);
    }
  }
}
```

## Script Parameters Reference

### `find-recent-rider-events.ts`

```bash
npx tsx scripts/find-recent-rider-events.ts <zwiftId> [maxEvents]
```

**Parameters**:
- `zwiftId` (required): Rider ID om te zoeken
- `maxEvents` (optional, default 200): Max events te scannen

**Configuratie in script**:
- `ESTIMATED_EVENT_ID_NOW`: Start event ID (5110000)
- `MAX_EMPTY_STREAK`: Stop na X events zonder match (50)
- `RATE_LIMIT_DELAY`: Delay tussen calls in ms (61000 = 61s)

**Output**:
- Console log met progress
- Lijst van gevonden events
- Bulk sync commands

## Conclusie

**Direct antwoord op je vraag**:

> "Kan dit met een POST request snel opgehaald worden?"

**NEE** ❌ - Er is geen POST endpoint die event IDs voor een rider retourneert.

**Alternatief**:
- ✅ Event range scanning (langzaam maar betrouwbaar)
- ✅ Manual event tracking (snel maar handmatig)
- ✅ Combinatie: scan 1x voor historie, track manueel daarna

**Voor 90-dagen historie van rider 150437**:
```bash
# Run dit commando (duurt ~3-4 uur):
npx tsx scripts/find-recent-rider-events.ts 150437 200

# Wacht op output met event IDs
# Sync die events met bulk command
```

**Trade-off**:
- ⏱️ Tijd: 3-4 uur voor 90-dagen scan
- 🎯 Accuraatheid: 100% van events in gescande range
- 💰 Cost: Free (binnen rate limits)
