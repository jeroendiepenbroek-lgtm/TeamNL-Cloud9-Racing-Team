# TeamNL Cloud9 Dashboard API Documentatie

## Overzicht

REST API voor het TeamNL Cloud9 Racing Team Dashboard. Biedt toegang tot club data, rider statistieken, race resultaten en sync functionaliteit.

**Base URL**: `http://localhost:3000/api`

## Authenticatie

Momenteel geen authenticatie vereist voor lokale development. Voor production: implementeer API key of JWT tokens.

## Rate Limiting

Let op: Endpoints die direct met ZwiftRacing API communiceren hebben specifieke rate limits:
- Club sync: 1x per 60 minuten
- Rider sync: 5x per minuut
- Bulk rider sync: 1x per 15 minuten
- Results sync: 1x per minuut

## Endpoints

### Health Check

#### GET /api/health

Controleer of de API beschikbaar is.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-22T12:00:00.000Z"
}
```

---

### Club Endpoints

#### GET /api/club

Haal complete club data op inclusief members.

**Response:**
```json
{
  "id": 11818,
  "name": "TeamNL Cloud9",
  "memberCount": 45,
  "lastSync": "2025-10-22T12:00:00.000Z",
  "members": [
    {
      "id": 150437,
      "zwiftId": 150437,
      "name": "John Doe",
      "categoryRacing": "B",
      "ftp": 285,
      "powerToWeight": 3.8,
      "ranking": 1250,
      "countryCode": "NL"
    }
  ]
}
```

#### GET /api/club/members

Haal alle club members op.

**Response:**
```json
[
  {
    "id": 150437,
    "zwiftId": 150437,
    "name": "John Doe",
    "categoryRacing": "B",
    "ftp": 285,
    "powerToWeight": 3.8,
    "ranking": 1250,
    "raceResults": [...]
  }
]
```

#### GET /api/club/results

Haal recente race resultaten van club members op.

**Query Parameters:**
- `limit` (optional): Aantal resultaten (default: 50)

**Response:**
```json
[
  {
    "id": "clxx1234567890",
    "eventId": 4879983,
    "eventName": "TeamNL Race Series",
    "eventDate": "2025-10-20T19:00:00.000Z",
    "position": 5,
    "category": "B",
    "averagePower": 275,
    "averageWkg": 3.7,
    "rider": {
      "name": "John Doe",
      "categoryRacing": "B"
    }
  }
]
```

---

### Rider Endpoints

#### GET /api/riders/:zwiftId

Haal gedetailleerde rider informatie op.

**Path Parameters:**
- `zwiftId`: Zwift rider ID

**Response:**
```json
{
  "id": 150437,
  "zwiftId": 150437,
  "name": "John Doe",
  "categoryRacing": "B",
  "ftp": 285,
  "powerToWeight": 3.8,
  "ranking": 1250,
  "rankingScore": 850.5,
  "countryCode": "NL",
  "weight": 75,
  "height": 180,
  "club": {
    "id": 11818,
    "name": "TeamNL Cloud9"
  },
  "raceResults": [...]
}
```

#### GET /api/riders/:zwiftId/history

Haal rider geschiedenis op voor trend analyse.

**Path Parameters:**
- `zwiftId`: Zwift rider ID

**Query Parameters:**
- `days` (optional): Aantal dagen terug (default: 30)

**Response:**
```json
[
  {
    "id": "clxx1234567890",
    "riderId": 150437,
    "ftp": 285,
    "powerToWeight": 3.8,
    "ranking": 1250,
    "rankingScore": 850.5,
    "recordedAt": "2025-10-22T12:00:00.000Z"
  }
]
```

#### GET /api/riders/:zwiftId/results

Haal race resultaten voor specifieke rider op.

**Path Parameters:**
- `zwiftId`: Zwift rider ID

**Query Parameters:**
- `limit` (optional): Aantal resultaten (default: 20)

**Response:**
```json
[
  {
    "id": "clxx1234567890",
    "eventId": 4879983,
    "eventName": "TeamNL Race Series",
    "position": 5,
    "averagePower": 275,
    "time": 3600
  }
]
```

---

### Results Endpoints

#### GET /api/results/:eventId

Haal alle resultaten voor een specifiek event op.

**Path Parameters:**
- `eventId`: Zwift event ID

**Response:**
```json
[
  {
    "id": "clxx1234567890",
    "eventId": 4879983,
    "riderId": 150437,
    "position": 5,
    "category": "B",
    "rider": {
      "name": "John Doe",
      "categoryRacing": "B",
      "club": {
        "name": "TeamNL Cloud9"
      }
    }
  }
]
```

---

### Sync Endpoints

#### POST /api/sync/club

Trigger handmatige club synchronisatie.

**⚠️ Rate Limit:** 1 call per 60 minuten

**Response:**
```json
{
  "message": "Club sync voltooid"
}
```

#### POST /api/sync/event/:eventId

Trigger handmatige event results synchronisatie.

**Path Parameters:**
- `eventId`: Zwift event ID

**Query Parameters:**
- `source` (optional): "zwiftpower" of "zwiftranking" (default: "zwiftranking")

**⚠️ Rate Limit:** 1 call per minuut

**Response:**
```json
{
  "message": "Event sync voltooid"
}
```

#### GET /api/sync/stats

Haal sync statistieken en status op.

**Response:**
```json
{
  "recentLogs": [...],
  "lastClubSync": {
    "id": "clxx1234567890",
    "syncType": "club",
    "status": "success",
    "recordsProcessed": 45,
    "duration": 2500,
    "createdAt": "2025-10-22T12:00:00.000Z"
  },
  "lastRidersSync": {...}
}
```

#### GET /api/sync/logs

Haal recente sync logs op.

**Query Parameters:**
- `limit` (optional): Aantal logs (default: 50)

**Response:**
```json
[
  {
    "id": "clxx1234567890",
    "syncType": "club",
    "status": "success",
    "recordsProcessed": 45,
    "duration": 2500,
    "errorMessage": null,
    "createdAt": "2025-10-22T12:00:00.000Z"
  }
]
```

---

## Error Responses

Alle endpoints kunnen de volgende error responses teruggeven:

### 400 Bad Request
```json
{
  "error": "Ongeldige rider ID"
}
```

### 404 Not Found
```json
{
  "error": "Rider niet gevonden"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit bereikt voor endpoint: /public/clubs/11818",
  "statusCode": 429
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Details alleen in development mode"
}
```

---

## Voorbeelden

### cURL

```bash
# Haal club members op
curl http://localhost:3000/api/club/members

# Haal rider details op
curl http://localhost:3000/api/riders/150437

# Trigger club sync
curl -X POST http://localhost:3000/api/sync/club

# Haal event resultaten op
curl http://localhost:3000/api/results/4879983
```

### JavaScript (Fetch)

```javascript
// Haal club data op
const club = await fetch('http://localhost:3000/api/club')
  .then(res => res.json());

// Haal rider history op
const history = await fetch('http://localhost:3000/api/riders/150437/history?days=60')
  .then(res => res.json());

// Trigger sync
await fetch('http://localhost:3000/api/sync/club', {
  method: 'POST'
});
```

### Python

```python
import requests

# Haal club members op
response = requests.get('http://localhost:3000/api/club/members')
members = response.json()

# Haal rider details op
rider = requests.get('http://localhost:3000/api/riders/150437').json()

# Trigger event sync
requests.post('http://localhost:3000/api/sync/event/4879983')
```

---

## Source Data Endpoints (Brondatatabellen)

**Nieuwe Feature**: Direct toegang tot ruwe API data voor analyse en debugging.

### Rate Limit Monitoring

#### GET /api/source-data/rate-limits

Haal rate limit status op voor alle endpoints.

**Query Parameters:**
- `hours` (optional): Aantal uren terug te kijken (default: 24)

**Response:**
```json
{
  "period": "24 hours",
  "stats": {
    "/public/clubs/:id": {
      "totalCalls": 2,
      "avgResponseTime": 1250,
      "limitReached": 0
    },
    "/public/riders/:id": {
      "totalCalls": 15,
      "avgResponseTime": 450,
      "limitReached": 0
    }
  },
  "activeRateLimits": [
    {
      "endpoint": "/public/results/:eventId",
      "limitMax": 60,
      "limitRemaining": 0,
      "limitResetAt": "2025-10-30T15:00:00.000Z",
      "minutesUntilReset": 45
    }
  ]
}
```

### Club Source Data

#### GET /api/source-data/clubs/:clubId

Haal alle opgeslagen club data snapshots op.

**Query Parameters:**
- `limit` (optional): Max aantal snapshots (default: 10)

**Response:**
```json
{
  "clubId": 11818,
  "snapshotCount": 5,
  "snapshots": [
    {
      "id": "cm39...",
      "name": "TeamNL",
      "memberCount": 424,
      "countryCode": null,
      "fetchedAt": "2025-10-30T14:17:10.000Z",
      "rateLimitRemaining": null,
      "responseTime": 1258
    }
  ]
}
```

#### GET /api/source-data/clubs/:clubId/latest

Haal laatste club data snapshot op inclusief raw JSON.

**Response:**
```json
{
  "id": "cm39...",
  "clubId": 11818,
  "name": "TeamNL",
  "memberCount": 424,
  "fetchedAt": "2025-10-30T14:17:10.000Z",
  "responseTime": 1258,
  "rawData": {
    "clubId": 11818,
    "name": "TeamNL",
    "riders": [...]
  }
}
```

### Event Source Data

#### GET /api/source-data/events/:eventId/results

Haal event results data op van `/public/results/:eventId` endpoint.

**Response:**
```json
{
  "id": "cm39...",
  "eventId": 5163788,
  "eventName": "ZwiftNL Racing League - Race 2",
  "eventDate": "2025-10-15T19:00:00.000Z",
  "participantsCount": 52,
  "finishersCount": 48,
  "fetchedAt": "2025-10-30T14:20:00.000Z",
  "responseTime": 890,
  "rawData": [
    {
      "riderId": 150437,
      "name": "JRøne | CloudRacer-9 @YouTube",
      "position": 48,
      "category": "B",
      "time": 2144.784,
      "rating": 1377.65
    }
  ]
}
```

#### GET /api/source-data/events/:eventId/zp

Haal ZwiftPower event data op van `/public/zp/:eventId/results` endpoint.

**Note**: Dit endpoint bevat power curves, FTP, en hartslag data die niet in results endpoint zit.

**Response:**
```json
{
  "id": "cm39...",
  "eventId": 5163788,
  "eventName": "ZwiftNL Racing League - Race 2",
  "participantsCount": 52,
  "fetchedAt": "2025-10-30T14:21:00.000Z",
  "rawData": [
    {
      "pos": 48,
      "zwid": 150437,
      "name": "JRøne | CloudRacer-9 @YouTube",
      "ftp": "270",
      "avg_power": [227, 0],
      "avg_wkg": ["3.1", 0],
      "wkg15": [10.3, 0],
      "wkg30": [7.0, 0],
      "wkg60": [4.8, 0]
    }
  ]
}
```

#### GET /api/source-data/events/recent

Haal recente events op van beide endpoints (results + zp).

**Query Parameters:**
- `days` (optional): Aantal dagen terug (default: 90)

**Response:**
```json
{
  "days": 90,
  "resultsEndpoint": {
    "count": 26,
    "events": [
      {
        "eventId": 5163788,
        "eventName": "ZwiftNL Racing League - Race 2",
        "eventDate": "2025-10-15T19:00:00.000Z",
        "participantsCount": 52,
        "fetchedAt": "2025-10-30T14:20:00.000Z"
      }
    ]
  },
  "zpEndpoint": {
    "count": 26,
    "events": [...]
  }
}
```

### Rider Source Data

#### GET /api/source-data/riders/:riderId

Haal alle rider data snapshots op.

**Query Parameters:**
- `limit` (optional): Max aantal snapshots (default: 10)

**Response:**
```json
{
  "riderId": 150437,
  "snapshotCount": 3,
  "snapshots": [
    {
      "id": "cm39...",
      "name": "JRøne | CloudRacer-9 @YouTube",
      "ranking": null,
      "categoryRacing": null,
      "ftp": 270,
      "fetchedAt": "2025-10-30T14:17:12.000Z",
      "responseTime": 523
    }
  ]
}
```

#### GET /api/source-data/riders/:riderId/latest

Haal laatste rider data snapshot op inclusief raw JSON.

**Response:**
```json
{
  "id": "cm39...",
  "riderId": 150437,
  "name": "JRøne | CloudRacer-9 @YouTube",
  "ftp": 270,
  "fetchedAt": "2025-10-30T14:17:12.000Z",
  "rawData": {
    "riderId": 150437,
    "name": "JRøne | CloudRacer-9 @YouTube",
    "ftp": 270,
    "club": {
      "id": 2281,
      "name": "TeamNL"
    },
    "power": {...},
    "race": {...}
  }
}
```

### Data Collection Endpoints (POST)

#### POST /api/source-data/collect/rider/:riderId

**US5**: Verzamel alle data voor een specific rider (rider data + club data).

**Rate Limits**:
- Rider data: 5 calls/min
- Club data: 1 call/60min

**Response:**
```json
{
  "success": true,
  "riderId": 150437,
  "results": {
    "riderDataSaved": true,
    "clubDataSaved": true
  },
  "errors": []
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/source-data/collect/rider/150437
```

#### POST /api/source-data/collect/events/:riderId

**US6**: Verzamel alle events van rider uit afgelopen N dagen via BEIDE endpoints.

**Request Body:**
```json
{
  "days": 90
}
```

**Response:**
```json
{
  "success": true,
  "riderId": 150437,
  "days": 90,
  "results": {
    "eventsProcessed": 26,
    "resultsDataSaved": 26,
    "zpDataSaved": 26
  },
  "errors": []
}
```

**Rate Limits**: Respecteert automatisch 1 call/min voor beide event endpoints.

**Example:**
```bash
curl -X POST http://localhost:3000/api/source-data/collect/events/150437 \
  -H "Content-Type: application/json" \
  -d '{"days": 90}'
```

**Note**: Voor 26 events duurt dit ~52+ minuten vanwege rate limits (2 calls per event × 61s delay).

#### POST /api/source-data/scan/events

**US7**: Scan multiple riders op nieuwe events (voor hourly cron job).

**Request Body:**
```json
{
  "riderIds": [150437, 123456, 789012]
}
```

**Response:**
```json
{
  "success": true,
  "riderCount": 3,
  "results": {
    "ridersScanned": 3,
    "newEventsFound": 5
  },
  "errors": []
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/source-data/scan/events \
  -H "Content-Type: application/json" \
  -d '{"riderIds": [150437, 123456]}'
```

---

## Data Types

### Rider
- `id`: number - Interne database ID
- `zwiftId`: number - Zwift platform ID
- `name`: string - Rider naam
- `categoryRacing`: string | null - Race categorie (A, B, C, D, E)
- `ftp`: number | null - Functional Threshold Power
- `powerToWeight`: number | null - W/kg ratio
- `ranking`: number | null - Global ranking
- `rankingScore`: number | null - Ranking score
- `countryCode`: string | null - Land code (bijv. "NL")
- `weight`: number | null - Gewicht in kg
- `height`: number | null - Lengte in cm

### RaceResult
- `id`: string - Unieke result ID
- `eventId`: number - Event ID
- `riderId`: number - Rider ID
- `eventName`: string | null - Event naam
- `eventDate`: string | null - ISO timestamp
- `position`: number | null - Finish positie
- `category`: string | null - Race categorie
- `averagePower`: number | null - Gemiddeld vermogen in watts
- `averageWkg`: number | null - Gemiddeld W/kg
- `time`: number | null - Tijd in seconden
- `distance`: number | null - Afstand in meters

### SyncLog
- `id`: string - Log entry ID
- `syncType`: string - Type sync (club, riders, results)
- `status`: string - Status (success, error, partial)
- `recordsProcessed`: number - Aantal verwerkte records
- `duration`: number | null - Duur in milliseconden
- `errorMessage`: string | null - Error bericht indien gefaald
- `createdAt`: string - ISO timestamp

---

## Notities

- Alle timestamps zijn in ISO 8601 formaat (UTC)
- Rate limits zijn gebaseerd op ZwiftRacing.app Standard tier
- Automatische sync draait elke 60 minuten (configureerbaar)
- Database gebruikt SQLite voor development, PostgreSQL voor production
