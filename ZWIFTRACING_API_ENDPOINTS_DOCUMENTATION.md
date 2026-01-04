# ZwiftRacing API Endpoints - Complete Data Documentation

**Base URL**: `https://api.zwiftracing.app/api/public`  
**Authorization**: Header `Authorization: 650c6d2fc4ef6858d74cbef1` (niet Bearer!)  
**Rate Limiting**: ~5 requests per minuut (strict!)

---

## 📋 TABLE OF CONTENTS

1. [Event Results Endpoints](#event-results)
2. [Rider Endpoints](#rider-endpoints)
3. [Data Structures](#data-structures)
4. [Use Cases](#use-cases)

---

## 🏁 EVENT RESULTS

### 1. GET `/api/public/results/<eventId>`

**Purpose**: Haal volledige race results op voor een specifiek event

**Request**:
```http
GET https://api.zwiftracing.app/api/public/results/5308652
Authorization: 650c6d2fc4ef6858d74cbef1
```

**Response Structure**:
```json
{
  "eventId": "5308652",
  "title": "Club Ladder // Herd of Honey Badgers v TeamNL Cloud9 Spark",
  "time": 1735498800,
  "type": "Race",
  "subType": "Ladder",
  "distance": 23474,
  "elevation": 0,
  "routeId": "2251715424",
  "resultsFinalized": true,
  "results": [
    {
      "riderId": 150437,
      "name": "JRøne | CloudRacer-9 @YouTube",
      "position": 7,
      "positionInCategory": 7,
      "time": 2185.595,
      "gap": 45.2,
      "category": "SEE LADDER SITE",
      "rating": 1436,
      "ratingBefore": 1432,
      "ratingDelta": 4,
      "ratingMax30": 1450,
      "ratingMax90": 1480,
      "teamId": "2281",
      "teamName": "TeamNL",
      "country": "nl",
      "wkgAvg": 3.45,
      "wkg5": 7.2,
      "wkg15": 6.8,
      "wkg30": 6.1,
      "wkg60": 5.4,
      "wkg120": 4.9,
      "wkg300": 4.2,
      "wkg1200": 3.6,
      "np": 245,
      "ftp": 248,
      "load": 185,
      "heartRate": {
        "avg": 165,
        "max": 183
      },
      "power": {
        "avg": 235,
        "w5": 520,
        "w15": 485,
        "w30": 445,
        "w60": 395,
        "w120": 360,
        "w300": 310,
        "w1200": 265
      },
      "zpCat": "B"
    }
  ]
}
```

**Key Fields**:
- **Event Metadata**: eventId, title, time (epoch), type, subType, distance, elevation, routeId
- **Per Rider**: position, vELO (rating/ratingBefore/ratingDelta), time, gap, category
- **Power Data**: wkgAvg, wkg5-wkg1200 (W/kg intervals), np, ftp, load
- **Team**: teamId, teamName, country

**Use Case**: Event detail page met alle deelnemers

---

### 2. GET `/api/public/zp/<eventId>/results`

**Purpose**: Alternatief endpoint voor ZwiftPower-stijl results

**Request**:
```http
GET https://api.zwiftracing.app/api/public/zp/5308652/results
Authorization: 650c6d2fc4ef6858d74cbef1
```

**Response**: Array of rider results (zonder event metadata)

**Use Case**: Lightweight results zonder event info

---

## 👤 RIDER ENDPOINTS

### 3. GET `/api/public/riders/<riderId>`

**Purpose**: Haal aggregate rider statistics op (current state)

**Request**:
```http
GET https://api.zwiftracing.app/api/public/riders/150437
Authorization: 650c6d2fc4ef6858d74cbef1
```

**Response Structure**:
```json
{
  "riderId": 150437,
  "name": "JRøne | CloudRacer-9 @YouTube",
  "rating": 1436.05,
  "ratingMax": 1480.2,
  "ratingMax30": 1450.5,
  "ratingMax90": 1480.2,
  "finishes": 127,
  "wins": 3,
  "podiums": 12,
  "powerCurve": {
    "5": 7.2,
    "15": 6.8,
    "30": 6.1,
    "60": 5.4,
    "120": 4.9,
    "300": 4.2,
    "1200": 3.6
  },
  "category": "B",
  "ftp": 248,
  "weight": 74000,
  "height": 1830
}
```

**Key Fields**:
- **Identity**: riderId, name
- **vELO Stats**: rating (current), ratingMax (all-time), ratingMax30, ratingMax90
- **Race Stats**: finishes, wins, podiums
- **Power Curve**: Best W/kg per interval (5s, 15s, 30s, 60s, 120s, 300s, 1200s)
- **Profile**: category, ftp, weight, height

**Use Case**: Rider profile card, statistics overview

---

### 4. GET `/api/public/riders/<riderId>/<time>`

**Purpose**: Haal historical rider statistics op op specifiek tijdstip

**Request**:
```http
GET https://api.zwiftracing.app/api/public/riders/150437/1735567200
Authorization: 650c6d2fc4ef6858d74cbef1
```

**Parameters**:
- `<time>`: Unix epoch timestamp (seconds)

**Response**: Same structure as endpoint #3, maar met waarden op dat moment

**Use Case**: vELO progression tracking, historical analysis

---

### 5. POST `/api/public/riders` (BULK)

**Purpose**: Haal data voor meerdere riders tegelijk op

**Request**:
```http
POST https://api.zwiftracing.app/api/public/riders
Authorization: 650c6d2fc4ef6858d74cbef1
Content-Type: application/json

[150437, 181837, 233070, 250995]
```

**Request Body**: Array van rider IDs (integers)

**Response**: Array van rider objects (structuur zoals endpoint #3)

```json
[
  {
    "riderId": 150437,
    "name": "JRøne | CloudRacer-9 @YouTube",
    "rating": 1436.05,
    ...
  },
  {
    "riderId": 181837,
    "name": "Another Rider",
    "rating": 1520.3,
    ...
  }
]
```

**Use Case**: Team roster sync, bulk updates (GEBRUIKT IN BACKEND!)

**Performance**: ~76 riders in 1 call (50-55 seconden)

---

### 6. POST `/api/public/riders/<time>` (BULK HISTORICAL)

**Purpose**: Haal historical data voor meerdere riders op specifiek tijdstip

**Request**:
```http
POST https://api.zwiftracing.app/api/public/riders/1735567200
Authorization: 650c6d2fc4ef6858d74cbef1
Content-Type: application/json

[150437, 181837]
```

**Parameters**:
- `<time>`: Unix epoch timestamp (seconds)
- **Body**: Array van rider IDs

**Response**: Array van rider objects met historical data

**Use Case**: Team vELO progression over tijd, snapshot analysis

---

## 📊 DATA STRUCTURES

### vELO Rating Fields

| Field | Type | Description |
|-------|------|-------------|
| `rating` | number | Huidige vELO rating |
| `ratingBefore` | number | vELO voor deze race |
| `ratingDelta` | number | vELO verandering (+/-) |
| `ratingMax` | number | All-time max vELO |
| `ratingMax30` | number | Max vELO laatste 30 dagen |
| `ratingMax90` | number | Max vELO laatste 90 dagen |

### Power Metrics

| Field | Type | Description |
|-------|------|-------------|
| `wkgAvg` | number | Gemiddelde W/kg hele race |
| `wkg5` | number | Best 5 seconds W/kg |
| `wkg15` | number | Best 15 seconds W/kg |
| `wkg30` | number | Best 30 seconds W/kg |
| `wkg60` | number | Best 1 minute W/kg |
| `wkg120` | number | Best 2 minutes W/kg |
| `wkg300` | number | Best 5 minutes W/kg |
| `wkg1200` | number | Best 20 minutes W/kg |
| `np` | number | Normalized Power |
| `ftp` | number | Functional Threshold Power |
| `load` | number | Training Load / RP score |

### Race Result Fields

| Field | Type | Description |
|-------|------|-------------|
| `position` | number | Overall finish positie |
| `positionInCategory` | number | Positie binnen categorie |
| `time` | number | Race tijd in seconden |
| `gap` | number | Tijd achterstand op winnaar |
| `category` | string | Race categorie (A/B/C/D) |

---

## 🎯 USE CASES

### Use Case 1: Rider Results Page (90 dagen)
**Flow**:
1. HTML scraping ZwiftRacing.app → Extract Event IDs
2. Loop door Event IDs → `GET /api/public/results/<eventId>`
3. Filter rider uit results array
4. Display: vELO progression, positions, power data

**API Calls**: 27 calls (1 per race)  
**Data**: Complete race history met power metrics

---

### Use Case 2: Event Detail Page
**Flow**:
1. `GET /api/public/results/<eventId>` → Alle deelnemers
2. Display: Positions, vELO changes, power comparison

**API Calls**: 1 call  
**Data**: Complete event results (10-50 riders)

---

### Use Case 3: Team Roster Sync
**Flow**:
1. `POST /api/public/riders` met array van 76 rider IDs
2. Update database met vELO, stats, power curve

**API Calls**: 1 call  
**Data**: Bulk rider updates (EFFICIENT!)

---

### Use Case 4: vELO Historical Analysis
**Flow**:
1. `GET /api/public/riders/<riderId>/<timestamp>` per tijdstip
2. Plot vELO progression over tijd

**API Calls**: N calls (N = aantal datapunten)  
**Data**: Historical vELO snapshots

---

## ⚠️ RATE LIMITING

- **Limit**: ~5 requests per minuut
- **Response**: HTTP 429 (Too Many Requests)
- **Retry-After**: 60 seconden (implicit)

**Best Practices**:
- 2-3 seconden delay tussen calls
- Bij 429: wacht 60s en retry
- Gebruik BULK endpoints waar mogelijk (POST /riders)
- Cache data in database

---

## 🔑 KEY INSIGHTS

### Wat ZwiftRacing API WEL heeft:
✅ Complete event results met alle riders  
✅ vELO tracking (before/after/delta)  
✅ Power metrics (W/kg intervals)  
✅ Historical rider data (op timestamp)  
✅ Bulk rider endpoints (efficient!)  
✅ Team info per race  

### Wat ZwiftRacing API NIET heeft:
❌ Direct race history per rider (moet via HTML scraping)  
❌ Event list endpoint (moet via website scraping)  
❌ Real-time live data tijdens race  
❌ Detailed route/lap data  

### Workaround:
- **Race History**: Scrape `__NEXT_DATA__` uit https://www.zwiftracing.app/riders/{riderId} → Extract Event IDs → Fetch via `/results/<eventId>`

---

## 📝 BACKEND IMPLEMENTATIE

### Huidige Backend Endpoints:

**1. `/api/results/rider/:riderId/scrape`**
- Scrapes Event IDs uit HTML
- Fetches races via `/results/<eventId>`
- Returns array van races met power data
- Used by: rider-results-live.html

**2. `/api/results/rider/:riderId/scrape-stream`**
- Server-Sent Events streaming
- Real-time progress updates
- Used by: rider-results-stream.html

**3. Team Sync gebruikt**: `POST /api/public/riders` (BULK!)
- 76 riders in 1 call
- Efficient team roster updates

---

## 🎯 RECOMMENDED USAGE

**Voor Rider Results (90 dagen)**:
```javascript
// 1. Scrape Event IDs
const html = await fetch('https://www.zwiftracing.app/riders/150437');
const eventIds = extractEventIds(html); // 27 IDs

// 2. Fetch races
for (const eventId of eventIds) {
  const results = await fetch(`/api/public/results/${eventId}`);
  const rider = results.results.find(r => r.riderId === 150437);
  // Store race data
  await delay(2000); // Rate limiting
}
```

**Voor Team Sync**:
```javascript
// Bulk fetch (EFFICIENT!)
const riderIds = [150437, 181837, 233070, ...]; // 76 riders
const riders = await fetch('/api/public/riders', {
  method: 'POST',
  body: JSON.stringify(riderIds)
});
// 1 API call voor alle riders!
```

---

## ✅ SUMMARY

| Endpoint | Method | Use Case | Data Returned |
|----------|--------|----------|---------------|
| `/results/<eventId>` | GET | Event details | Complete race results (all riders) |
| `/zp/<eventId>/results` | GET | Lightweight results | Rider array only |
| `/riders/<riderId>` | GET | Rider profile | Current aggregate stats |
| `/riders/<riderId>/<time>` | GET | Historical data | Stats at timestamp |
| `/riders` | POST | Bulk riders | Array of current stats |
| `/riders/<time>` | POST | Bulk historical | Array of historical stats |

**Best Endpoint**: `POST /riders` voor team sync (1 call vs 76 calls!)
