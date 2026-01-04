# ZwiftRacing.app API Discovery

## Datum: 2026-01-03

## ✅ WERKENDE STRATEGIE GEVONDEN!

**Race history kan worden opgebouwd via Event IDs:**
1. Scrape Event IDs uit ZwiftRacing.app website HTML (via `__NEXT_DATA__` JSON)
2. Voor elk Event ID: call `/api/public/results/{eventId}`
3. Filter rider data uit results array
4. Build complete race history

## Ontdekte Endpoints

### ✅ Werkende Public Endpoints

1. **`GET /api/public/riders/{riderId}`** ⭐⭐
   - Returns: Rider profile met aggregate stats
   - Keys: age, club, country, gender, handicaps, height, name, phenotype, power, race, riderId, weight, zpCategory, zpFTP
   - Rate limit: ~1 request/minute
   - Status: ✅ Werkt
   - Example: https://api.zwiftracing.app/api/public/riders/150437

2. **`GET /api/public/riders/{riderId}/{epochTime}`** ⭐⭐⭐
   - Returns: Rider data at specific point in time
   - Requires: Epoch timestamp (zonder milliseconds)
   - Rate limit: 5 calls/minute (Standard), 10 calls/minute (Premium)
   - Status: ✅ Werkt
   - Example: https://api.zwiftracing.app/api/public/riders/150437/1767034800
   - Response includes: race stats (rating, finishes, wins, podiums) at that timestamp
   - Useful for: Historical vELO tracking, rating progression

3. **`GET /api/public/results/{eventId}`** ⭐⭐⭐⭐⭐
   - Returns: Complete event results with all riders
   - Requires: Event ID
   - Status: ✅ WERKT PERFECT!
   - Rate limit: Standard (needs testing)
   - Example: https://api.zwiftracing.app/api/public/results/5308652
   - Response structure:
     ```json
     {
       "eventId": "5308652",
       "time": 1767034800,
       "title": "Club Ladder // Herd of Honey Badgers v TeamNL Cloud9 Spark",
       "type": "Race",
       "subType": "Ladder",
       "distance": 23474,
       "elevation": 0,
       "routeId": "2251715424",
       "results": [
         {
           "riderId": 150437,
           "name": "JRøne | CloudRacer-9 @YouTube",
           "category": "SEE LADDER SITE",
           "time": 2185.595,
           "gap": 0,
           "position": 7,
           "positionInCategory": 7,
           "rating": 1436.0483156301843,
           "ratingBefore": 1432.411130282907,
           "ratingDelta": 3.6371853472773474,
           "ratingMax30": 1436.0483156301843,
           "ratingMax90": 1439.308476317986
         }
       ]
     }
     ```

4. **`GET /api/public/zp/{eventId}/results`**
   - Alternative event results endpoint
   - Status: ✅ Werkt (met eventId)

### ❌ Niet-werkende Endpoints (Getest)

Deze endpoints bestaan NIET in de public API:
- `/api/public/riders/{riderId}/events` - Invalid request data
- `/api/public/riders/{riderId}/race-history` - Invalid request data  
- `/api/public/riders/{riderId}/races-recent` - Invalid request data
- `/api/public/riders/{riderId}/races-all` - Invalid request data

**Conclusie:** Er is GEEN direct endpoint voor race history per rider. 
We moeten Event IDs verzamelen en per event de results ophalen.

### ❌ Niet-bestaande Endpoints

- `/api/public/riders/{riderId}/history` - Invalid request data
- `/api/public/riders/{riderId}/races` - Invalid request data
- `/api/public/riders/{riderId}/results` - Invalid request data
- `/api/public/riders/{riderId}/activities` - Invalid request data
- `/api/public/riders/{riderId}/performances` - Invalid request data
- `/api/public/riders/{riderId}/results-history` - Invalid request data

### 🔐 Private API (Unauthorized)

- `/api/riders/{riderId}` - Unauthorized (requires different auth)

## Rate Limiting

- **Window**: 1 minute
- **Limit**: 5 requests per window (Standard)
- **Premium Limit**: 10 requests per window
- **Retry-After**: 10-60 seconds (varies per endpoint)

## Bewezen Event IDs (Rider 150437)

Alle geteste Event IDs werken met `/api/public/results/{eventId}`:

| Date | Event ID | Title | Position | vELO |
|------|----------|-------|----------|------|
| Dec 29, 2025 | 5308652 | Club Ladder // Herd of Honey Badgers v TeamNL Cloud9 Spark | 7/10 | 1436 |
| Dec 27, 2025 | 5233969 | HISP WINTER TOUR 2025 STAGE 2 | 13/36 | 1432 |
| Dec 22, 2025 | 5290955 | Club Ladder // GTR Krakens v TeamNL Cloud9 Spark | 8/10 | 1410 |
| Dec 20, 2025 | 5230392 | Stage 3: Fresh Outta '25: Hell of the North | 9/24 | 1422 |
| Dec 16, 2025 | 5275729 | Club Ladder // Smarties Germany v TeamNL Cloud9 Spark | 9/10 | 1415 |

## Implementatie Strategie

### Methode 1: HTML Scraping (Aanbevolen)

```python
# 1. Fetch ZwiftRacing.app HTML
html = requests.get(f"https://www.zwiftracing.app/riders/{riderId}")

# 2. Extract __NEXT_DATA__ JSON
match = re.search(r'<script id="__NEXT_DATA__".*?>(.*?)</script>', html.text)
data = json.loads(match.group(1))

# 3. Extract Event IDs from history
history = data['props']['pageProps']['rider']['history']
event_ids = [race['event']['id'] for race in history]

# 4. Fetch each event result
for event_id in event_ids:
    results = api.get(f"/public/results/{event_id}")
    rider_data = [r for r in results['results'] if r['riderId'] == riderId][0]
    # Store in database
```

### Methode 2: Known Event IDs Database

- Maintain database of event IDs from races
- Query `/public/results/{eventId}` for each event
- Build rider history from event results

### Methode 3: Historical Polling (/-{time})

- Poll `/public/riders/{riderId}/{time}` at different timestamps
- Track rating changes to identify race occurrences
- Requires many API calls (rate limit challenge)

## Conclusie

**✅ OPLOSSING GEVONDEN:**

De ZwiftRacing.app public API heeft **GEEN** direct endpoint voor race history per rider, 
MAAR we kunnen race history reconstrueren via:

1. **Event IDs scrapen** uit ZwiftRacing.app website (27 races beschikbaar in HTML)
2. **Per Event ID** de complete results ophalen via `/api/public/results/{eventId}`
3. **Filter rider data** uit de results array
4. **Store in database** voor caching

**Voordelen:**
- Volledige race data (position, time, gap, rating changes, etc.)
- Alle riders in event beschikbaar
- Officiële API, geen reverse engineering
- Event metadata included (title, route, distance, elevation)

**Nadelen:**
- Requires initial HTML scraping voor Event IDs
- Rate limiting (5 calls/minute standard)
- No direct "give me all races for rider X" endpoint

**Next Steps:**
1. Build HTML scraper voor Event IDs extraction
2. Implement event results fetcher met rate limit handling
3. Create database schema voor caching
4. Schedule periodic updates

## Authorization

```
Header: Authorization: 650c6d2fc4ef6858d74cbef1
```
(Geen Bearer prefix)
