# Endpoint Overzicht - TeamNL Cloud9 Dashboard

## 🏠 Backend REST API Endpoints

**Base URL**: `http://localhost:3000/api`

---

## 📋 Health & Status

### `GET /api/health`
**Beschrijving**: Health check endpoint  
**Rate Limit**: Geen  
**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-23T07:33:09.193Z"
}
```

---

## 🏆 Club Endpoints

### `GET /api/club`
**Beschrijving**: Haal club data op inclusief alle members  
**Rate Limit**: Geen (database query)  
**Response**: Club object met nested members array
```json
{
  "id": 2281,
  "name": "TeamNL",
  "memberCount": 50,
  "members": [...]
}
```

### `GET /api/club/members`
**Beschrijving**: Haal alle club members op  
**Rate Limit**: Geen (database query)  
**Response**: Array van rider objecten met 30+ velden
```json
[
  {
    "id": 1,
    "zwiftId": 150437,
    "name": "JRøne | CloudRacer-9 @YouTube",
    "categoryRacing": "B",
    "ftp": 294,
    "ftpWkg": 3.46,
    "weight": 74,
    "height": 176,
    "gender": "M",
    "countryCode": "nl",
    "totalRaces": 33,
    "totalWins": 3,
    "totalPodiums": 10,
    ...
  }
]
```

### `GET /api/club/results?limit=50`
**Beschrijving**: Haal recente race resultaten van club members op  
**Query Parameters**:
- `limit` (optional, default: 50) - Aantal resultaten

**Rate Limit**: Geen (database query)  
**Response**: Array van race results met event en rider details

---

## 👤 Rider Endpoints

### `GET /api/riders/:zwiftId`
**Beschrijving**: Haal specifieke rider op met volledige details  
**Parameters**:
- `zwiftId` (required) - Zwift ID van de rider

**Example**: `/api/riders/150437`  
**Rate Limit**: Geen (database query)  
**Response**: Rider object met race results (laatste 10)
```json
{
  "id": 1,
  "zwiftId": 150437,
  "name": "JRøne | CloudRacer-9 @YouTube",
  "categoryRacing": "B",
  "ftp": 294,
  "ftpWkg": 3.97,
  "weight": 74,
  "gender": "M",
  "totalRaces": 33,
  "raceResults": [...],
  "statistics": {...}
}
```

### `GET /api/riders/:zwiftId/history?days=30`
**Beschrijving**: Haal historische snapshots van rider op  
**Parameters**:
- `zwiftId` (required) - Zwift ID van de rider

**Query Parameters**:
- `days` (optional, default: 30) - Aantal dagen terug

**Example**: `/api/riders/150437/history?days=90`  
**Rate Limit**: Geen (database query)  
**Response**: Array van historische rider snapshots
```json
[
  {
    "id": 1,
    "riderId": 1,
    "ftp": 290,
    "weight": 75,
    "ranking": 1234,
    "snapshotType": "daily",
    "snapshotDate": "2025-10-20T00:00:00.000Z"
  }
]
```

### `GET /api/riders/:zwiftId/results?limit=20`
**Beschrijving**: Haal race resultaten van specifieke rider op  
**Parameters**:
- `zwiftId` (required) - Zwift ID van de rider

**Query Parameters**:
- `limit` (optional, default: 20) - Aantal resultaten

**Example**: `/api/riders/150437/results?limit=50`  
**Rate Limit**: Geen (database query)  
**Response**: Array van race results met event details

---

## 🏁 Results Endpoints

### `GET /api/results/:eventId`
**Beschrijving**: Haal alle resultaten van een specifiek event op  
**Parameters**:
- `eventId` (required) - Event ID

**Example**: `/api/results/123456`  
**Rate Limit**: Geen (database query)  
**Response**: Array van race results met rider details
```json
[
  {
    "id": 1,
    "eventId": 123456,
    "riderId": 1,
    "position": 15,
    "positionCategory": 3,
    "category": "B",
    "time": 3600,
    "averagePower": 280,
    "averageWkg": 3.5,
    "rider": {
      "name": "JRøne",
      "categoryRacing": "B"
    },
    "event": {
      "name": "ZRL Round 1",
      "eventDate": "2025-10-20T19:00:00.000Z",
      "routeName": "Alpe du Zwift"
    }
  }
]
```

---

## 🔄 Sync Endpoints

### `POST /api/sync/club`
**Beschrijving**: Trigger handmatige club members sync  
**Rate Limit**: **1 call per 60 minuten** (ZwiftRacing API limit)  
**Response**:
```json
{
  "message": "Club sync voltooid"
}
```

**Let op**: Deze endpoint gebruikt de externe ZwiftRacing API en is onderworpen aan strikte rate limits. Wacht minimaal 60 minuten tussen calls.

### `POST /api/sync/event/:eventId?source=zwiftranking`
**Beschrijving**: Trigger handmatige event results sync  
**Parameters**:
- `eventId` (required) - Event ID om te syncen

**Query Parameters**:
- `source` (optional, default: 'zwiftranking') - Bron: 'zwiftpower' of 'zwiftranking'

**Example**: `/api/sync/event/123456?source=zwiftpower`  
**Rate Limit**: **1 call per minuut** (ZwiftRacing API limit)  
**Response**:
```json
{
  "message": "Event sync voltooid"
}
```

### `GET /api/sync/stats`
**Beschrijving**: Haal sync statistieken op  
**Rate Limit**: Geen (database query)  
**Response**: Statistieken over laatste syncs
```json
{
  "lastSync": "2025-10-23T07:22:31.667Z",
  "totalSyncs": 5,
  "successRate": 80.0,
  "lastError": null
}
```

### `GET /api/sync/logs?limit=50`
**Beschrijving**: Haal sync logs op  
**Query Parameters**:
- `limit` (optional, default: 50) - Aantal logs

**Rate Limit**: Geen (database query)  
**Response**: Array van sync log entries
```json
[
  {
    "id": 1,
    "syncType": "club",
    "status": "success",
    "recordsProcessed": 50,
    "recordsCreated": 5,
    "recordsUpdated": 45,
    "duration": 2500,
    "startedAt": "2025-10-23T07:22:31.667Z",
    "completedAt": "2025-10-23T07:22:34.167Z"
  }
]
```

---

## 🌐 Externe ZwiftRacing API Endpoints

**Base URL**: `https://zwift-ranking.herokuapp.com`  
**Authentication**: Header `Authorization: <API_KEY>`

### `GET /public/clubs/:clubId`
**Beschrijving**: Haal club info en alle members op (RIJKSTE DATA)  
**Rate Limit**: **1 call per 60 minuten**  
**Response**: Club object met volledige rider data (power curves, race stats, phenotype)
```json
{
  "clubId": 2281,
  "name": "TeamNL",
  "riders": [
    {
      "riderId": 150437,
      "name": "JRøne",
      "zpFTP": 294,
      "zpCategory": "B",
      "weight": 74,
      "power": {
        "w5": 1086,
        "w15": 932,
        "wkg5": 12.77,
        "CP": 293.77,
        ...
      },
      "race": {
        "finishes": 33,
        "wins": 3,
        "podiums": 10,
        ...
      },
      "phenotype": {
        "value": "Sprinter",
        "scores": {
          "sprinter": 98.3,
          "climber": 75.6,
          ...
        }
      }
    }
  ]
}
```

### `GET /public/clubs/:clubId/:fromRiderId`
**Beschrijving**: Haal club members op vanaf specifieke rider ID  
**Rate Limit**: **1 call per 60 minuten**

### `GET /public/riders/:riderId`
**Beschrijving**: Haal enkele rider op (MINIMALE DATA)  
**Rate Limit**: **5 calls per minuut**  
**Response**: Basis rider info (naam, FTP, weight, etc.)

### `GET /public/riders/:riderId/:epochTime`
**Beschrijving**: Haal rider data op specifiek tijdstip  
**Rate Limit**: **5 calls per minuut**

### `POST /public/riders`
**Beschrijving**: Haal meerdere riders op (bulk, max 1000 IDs)  
**Rate Limit**: **1 call per 15 minuten**  
**Body**: Array van rider IDs
```json
[150437, 1495, 1813927]
```

### `GET /public/riders/:riderId/results`
**Beschrijving**: Haal race results van rider op  
**Rate Limit**: **1 call per minuut**

### `GET /public/results/:eventId/zwiftpower`
**Beschrijving**: Haal event results van ZwiftPower  
**Rate Limit**: **1 call per minuut**

### `GET /public/results/:eventId`
**Beschrijving**: Haal event results van ZwiftRanking  
**Rate Limit**: **1 call per minuut**

---

## 🔒 Rate Limit Overzicht

| Endpoint Type | Rate Limit | Notes |
|---------------|------------|-------|
| Club sync | 1/60 min | Meest beperkend |
| Bulk riders | 1/15 min | Max 1000 IDs |
| Single rider | 5/min | Voor individuele queries |
| Event results | 1/min | Per event |
| Database queries | Geen | Alle GET endpoints zonder sync |

---

## 🧪 Test Endpoints

### Via cURL
```bash
# Health check
curl http://localhost:3000/api/health

# Haal club members op
curl http://localhost:3000/api/club/members

# Haal specifieke rider op
curl http://localhost:3000/api/riders/150437

# Trigger club sync (LET OP: Rate limit!)
curl -X POST http://localhost:3000/api/sync/club

# Bekijk sync logs
curl http://localhost:3000/api/sync/logs?limit=10
```

### Via Browser
- Health: http://localhost:3000/api/health
- Club members: http://localhost:3000/api/club/members
- Jouw profiel: http://localhost:3000/api/riders/150437
- Sync logs: http://localhost:3000/api/sync/logs

---

## 🚀 Server Starten

```bash
# Development mode (met auto-reload)
npm run dev

# Production build
npm run build
npm start

# Server draait op: http://localhost:3000
```

---

## 📊 Data Flow

```
Externe API → Backend Sync → Database → REST API → Frontend
   (60min)      (Service)    (SQLite)   (Express)   (React)
```

1. **Externe API** - ZwiftRacing.app Public API (rate limited)
2. **Backend Sync** - Automatische sync elke 60 min of handmatig via `/sync/*`
3. **Database** - Lokale cache in SQLite (dev) / PostgreSQL (prod)
4. **REST API** - Express endpoints zonder rate limits
5. **Frontend** - Dashboard (nog te implementeren)

---

## 💡 Best Practices

### Voor Development
- **Gebruik database endpoints** voor quick queries (geen rate limit)
- **Sync handmatig** via `/api/sync/club` alleen als nodig
- **Check sync logs** via `/api/sync/logs` voor debug info
- **Prisma Studio** voor directe database access: `npm run db:studio`

### Voor Production
- **Automatische sync** draait elke 60 minuten via cron
- **Gebruik cache** - alle GET endpoints lezen uit database
- **Monitor sync logs** voor failures
- **PostgreSQL** voor betere performance en concurrency

---

## 🔧 Configuratie

In `.env`:
```bash
# API Configuration
ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1
ZWIFT_API_BASE_URL=https://zwift-ranking.herokuapp.com
ZWIFT_CLUB_ID=2281

# Server
PORT=3000
NODE_ENV=development

# Sync
SYNC_INTERVAL_MINUTES=60
ENABLE_AUTO_SYNC=true
```

---

## 📚 Documentatie Links

- **API Docs**: `docs/API.md`
- **Database Schema**: `docs/DATA_MODEL.md`
- **ERD**: `docs/ERD.md`
- **SQL Queries**: `docs/SQL_QUERIES.md`
- **Quickstart**: `QUICKSTART.md`
