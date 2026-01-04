# Zwift Events voor Rider 150437 via ZwiftRacing.app API

**Datum**: 2026-01-03  
**Rider**: 150437 (JRøne | CloudRacer-9 @YouTube)  
**Totaal Events**: 27 (gevonden via HTML scraping)

## Strategie

1. **HTML Scraping** → Extract Event IDs van https://www.zwiftracing.app/riders/150437
2. **API Calls** → Haal per Event ID de results op via `/api/public/results/{eventId}`
3. **Filter Rider** → Zoek rider 150437 in de results array
4. **Parse Data** → Extract race details (position, vELO, time, etc.)

## Event IDs (27 totaal)

```
5308652, 5233969, 5290955, 5230392, 5275729, 5230363, 5257600, 5254822,
5236640, 5229579, 5206710, 5178019, 5213922, 5208495, 5144434, 5132015,
5144308, 5176821, 5183135, 5144148, 5163788, 5129365, 5129235, 5149471,
5127680, 5128997, 5135610
```

## Opgehaalde Race Results (Sample: 3 events)

### 1. Event 5308652 - Club Ladder (29 dec 2025)
```json
{
  "eventId": "5308652",
  "eventName": "Club Ladder // Herd of Honey Badgers v TeamNL Cloud9 Spark",
  "date": "2025-12-29 19:00",
  "position": 7,
  "totalRiders": 10,
  "category": "SEE LADDER SITE",
  "timeSeconds": 2185.595,
  "veloRating": 1436,
  "veloBefore": 1432,
  "veloChange": +4,
  "distance": 23474m,
  "elevation": 0m,
  "route": "2251715424",
  "type": "Race",
  "subType": "Ladder"
}
```

**Performance**: 7e van 10 riders, vELO +4 punten (1432 → 1436)

---

### 2. Event 5290955 - Club Ladder (22 dec 2025)
```json
{
  "eventId": "5290955",
  "eventName": "Club Ladder // GTR Krakens v TeamNL Cloud9 Spark",
  "date": "2025-12-22 19:00",
  "position": 8,
  "totalRiders": 10,
  "category": "SEE LADDER SITE",
  "timeSeconds": 2577.817,
  "veloRating": 1410,
  "veloBefore": 1423,
  "veloChange": -12,
  "distance": 21520.4m,
  "elevation": 392m,
  "route": "3523806426",
  "type": "Race",
  "subType": "Ladder"
}
```

**Performance**: 8e van 10 riders, vELO -12 punten (1423 → 1410)

---

### 3. Event 5275729 - Club Ladder (16 dec 2025)
```json
{
  "eventId": "5275729",
  "eventName": "Club Ladder // Smarties Germany v TeamNL Cloud9 Spark",
  "date": "2025-12-16 19:00",
  "position": 9,
  "totalRiders": 10,
  "category": "SEE LADDER SITE",
  "timeSeconds": 2038.829,
  "veloRating": 1415,
  "veloBefore": 1434,
  "veloChange": -19,
  "distance": 20150m,
  "elevation": 0m,
  "route": "1793712753",
  "type": "Race",
  "subType": "Ladder"
}
```

**Performance**: 9e van 10 riders, vELO -19 punten (1434 → 1415)

---

## API Response Structuur

Elk event result object bevat:

### Event Info
- `eventId` - Uniek event ID (gebruikt voor API calls)
- `title` - Event naam
- `time` - Epoch timestamp
- `type` - "Race", "TTT", etc.
- `subType` - "Ladder", "Scratch", "Points", etc.
- `distance` - Afstand in meters
- `elevation` - Hoogtemeters
- `routeId` - Zwift route ID
- `resultsFinalized` - Boolean

### Rider Result (in `results` array)
- `riderId` - 150437
- `name` - "JRøne | CloudRacer-9 @YouTube"
- `position` - Finish positie
- `positionInCategory` - Positie binnen categorie
- `time` - Race tijd in seconden
- `gap` - Tijd achterstand op winnaar
- `category` - Race categorie
- `rating` - vELO rating na race
- `ratingBefore` - vELO rating voor race
- `ratingDelta` - vELO verandering
- `ratingMax30` - Max vELO laatste 30 dagen
- `ratingMax90` - Max vELO laatste 90 dagen

### Team Info (indien aanwezig)
- `teamId` - "2281"
- `teamName` - "TeamNL"
- `country` - "nl"

### Performance Metrics (indien aanwezig)
- `wkgAvg` - Gemiddelde W/kg
- `wkg5`, `wkg15`, `wkg30`, `wkg60`, `wkg120`, `wkg300`, `wkg1200` - Power W/kg per interval
- `np` - Normalized Power
- `ftp` - FTP waarde
- `zpCat` - ZwiftPower categorie
- `load` - Training load
- `heartRate` - {avg, max}
- `power` - {avg, w5, w15, w30, w60, w120, w300, w1200}

## Rate Limiting

- **Limit**: ~5 requests per minuut
- **Retry-After**: 60 seconden
- **Strategy**: 
  - 3 seconden delay tussen calls
  - Bij 429: wacht 60 seconden en retry
  - Batch processing voor meerdere events

## Implementatie in Backend

De `/api/results/rider/:riderId/scrape` endpoint (server.ts line 2470):

1. **Fetch HTML** van ZwiftRacing.app
2. **Parse `__NEXT_DATA__`** JSON uit HTML
3. **Extract Event IDs** uit history array
4. **Loop door Event IDs** met rate limiting
5. **Fetch `/api/public/results/{eventId}`** per event
6. **Filter rider 150437** uit results array
7. **Return JSON** met race array

## Voorbeeld API Call

```bash
# Single event
curl -s "https://api.zwiftracing.app/api/public/results/5308652" \
  -H "Authorization: 650c6d2fc4ef6858d74cbef1" | jq .

# Via backend scraper (max 10 events)
curl "http://localhost:8080/api/results/rider/150437/scrape?limit=10"
```

## Conclusie

✅ **Werkt Perfect:**
- 27 Event IDs beschikbaar via HTML scraping
- Elk event bevat complete race data
- vELO tracking werkt (rating before/after/delta)
- Position data accuraat (7/10, 8/10, 9/10)
- Distance, elevation, route info beschikbaar

⚠️ **Beperkingen:**
- Rate limiting (5 calls/min)
- Geen bulk endpoint voor alle races tegelijk
- HTML scraping nodig voor Event ID discovery
- Power metrics niet altijd beschikbaar

🎯 **Aanbeveling:**
- Cache race data in database (rider_race_history tabel)
- Periodic sync (dagelijks) voor nieuwe races
- Display cached data + recent races via scraper
- Rate limit aware implementation (delays + retries)
