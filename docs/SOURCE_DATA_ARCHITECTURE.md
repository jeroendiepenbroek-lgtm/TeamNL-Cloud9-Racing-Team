# Source Data Architecture - Brondatatabellen

## Overzicht

Het TeamNL Cloud9 Dashboard gebruikt een **brondatatabellen architectuur** voor het opslaan van ruwe API data. Dit zorgt voor volledige traceerbaarheid, historische snapshots, en maakt data-analyse mogelijk zonder afhankelijkheid van externe APIs.

## Architectuur Principes

### 1. Immutable Data
- **Nooit updaten, alleen toevoegen**: Elke API call wordt opgeslagen als een nieuwe rij
- **Volledige geschiedenis**: Alle snapshots blijven bewaard
- **Time-travel queries**: Query data zoals die was op een specifiek moment

### 2. Complete API Responses
- **Raw JSON opslag**: Volledige API response wordt opgeslagen in `rawData` veld
- **Geen data verlies**: Zelfs velden die nu niet gebruikt worden blijven beschikbaar
- **Future-proof**: Nieuwe API velden zijn automatisch beschikbaar in historische data

### 3. Automatic Rate Limit Tracking
- **Per-endpoint tracking**: Elke API call logt rate limit status
- **Proactive warnings**: Systeem waarschuwt voordat limit bereikt is
- **Query scheduling**: Services kunnen rate limit status checken voor optimale timing

### 4. Indexed Key Fields
- **Snelle queries**: Belangrijke velden worden uitgepakt en geïndexeerd
- **Efficiënte filtering**: Filter op datum, rider ID, event ID zonder JSON parsing
- **Performance**: Combinatie van gestructureerde indexen en flexibele raw data

## Database Schema

### Brondatatabellen Overzicht

```
┌─────────────────────────────────────────────────────────────┐
│                    BRONDATATABELLEN                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CLUB DATA                  │  EVENT DATA                   │
│  ├─ club_source_data        │  ├─ event_results_source_data│
│  └─ club_roster_source_data │  └─ event_zp_source_data     │
│                                                              │
│  RIDER DATA                  │  RATE LIMITING               │
│  ├─ rider_source_data        │  └─ rate_limit_logs          │
│  ├─ rider_history_source_data│                              │
│  ├─ rider_bulk_source_data   │                              │
│  └─ rider_bulk_history_...   │                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1. Club Source Data

**Tabel**: `club_source_data`  
**Endpoint**: `GET /public/clubs/:id`  
**Rate Limit**: 1 call / 60 minuten

```typescript
{
  id: string              // Unique snapshot ID
  clubId: number          // Club identifier
  endpoint: string        // API endpoint gebruikt
  
  // Parsed key fields (indexed)
  name: string?
  memberCount: number?
  countryCode: string?
  
  // Raw data
  rawData: string         // Complete JSON response
  
  // Rate limit tracking
  rateLimitRemaining: number?
  rateLimitReset: DateTime?
  
  // Metadata
  responseStatus: number  // HTTP status
  responseTime: number?   // milliseconden
  fetchedAt: DateTime     // Timestamp
}
```

**Gebruik**:
```typescript
// Haal laatste club snapshot op
const latest = await clubSourceRepo.getLatestClubData(11818);

// Parse raw data
const clubData = JSON.parse(latest.rawData);
console.log(`Club ${clubData.name} heeft ${clubData.riders.length} members`);

// Historische trend
const history = await clubSourceRepo.getAllClubSnapshots(11818, 30);
const growth = history.map(snap => ({
  date: snap.fetchedAt,
  members: snap.memberCount
}));
```

### 2. Club Roster Source Data

**Tabel**: `club_roster_source_data`  
**Endpoint**: `GET /public/clubs/:id/:riderId`  
**Rate Limit**: 1 call / 60 minuten

Paginated club member data - gebruikt voor grote clubs.

### 3. Event Results Source Data

**Tabel**: `event_results_source_data`  
**Endpoint**: `GET /public/results/:eventId`  
**Rate Limit**: 1 call / minuut

```typescript
{
  id: string
  eventId: number
  endpoint: string
  
  // Parsed fields
  eventName: string?
  eventDate: DateTime?
  participantsCount: number
  finishersCount: number
  
  // Raw data (array van results)
  rawData: string         // Complete results array
  
  // Rate limiting
  rateLimitRemaining: number?
  rateLimitReset: DateTime?
  
  // Metadata
  responseTime: number?
  fetchedAt: DateTime
}
```

**Data Structuur**:
```json
// rawData bevat array van:
{
  "riderId": 150437,
  "name": "JRøne | CloudRacer-9 @YouTube",
  "category": "B",
  "position": 48,
  "positionInCategory": 32,
  "time": 2144.784,
  "gap": 133.552,
  "rating": 1377.65,
  "ratingDelta": 0.654
}
```

### 4. Event ZwiftPower Source Data

**Tabel**: `event_zp_source_data`  
**Endpoint**: `GET /public/zp/:eventId/results`  
**Rate Limit**: 1 call / minuut

**Waarom Beide Endpoints?**
- `/public/results/:eventId` - Zwift Racing League data, focus op ratings
- `/public/zp/:eventId/results` - ZwiftPower format, **bevat power curves en FTP**

```json
// ZP endpoint extra data:
{
  "ftp": "270",
  "avg_power": [227, 0],
  "avg_wkg": ["3.1", 0],
  "avg_hr": [166, 0],
  "max_hr": [182, 0],
  
  // Power curves
  "wkg15": [10.3, 0],  // 15sec peak
  "wkg30": [7.0, 0],
  "wkg60": [4.8, 0],
  "wkg300": [3.8, 0],
  "wkg1200": [3.2, 0],
  
  // Absolute watts
  "w15": [762, 0],
  "w30": [516, 0],
  "w60": [358, 0]
}
```

### 5. Rider Source Data

**Tabel**: `rider_source_data`  
**Endpoint**: `GET /public/riders/:riderId`  
**Rate Limit**: 5 calls / minuut

Current rider profile data - meest recente stats en power metrics.

### 6. Rider History Source Data

**Tabel**: `rider_history_source_data`  
**Endpoint**: `GET /public/riders/:riderId/:time`  
**Rate Limit**: 5 calls / minuut

Historical snapshots van rider data op specifiek tijdstip.

**Gebruik**:
```typescript
// Haal rider data op van 30 dagen geleden
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const historicalData = await riderHistorySourceRepo.getRiderDataAtTime(
  150437, 
  thirtyDaysAgo
);

// Vergelijk met huidige data
const currentData = await riderSourceRepo.getLatestRiderData(150437);

console.log(`FTP progression: ${historicalData.ftp} → ${currentData.ftp}`);
```

### 7. Rider Bulk Source Data

**Tabel**: `rider_bulk_source_data`  
**Endpoint**: `POST /public/riders`  
**Rate Limit**: 1 call / 15 minuten  
**Max**: 1000 rider IDs per request

Efficiënte manier om veel riders tegelijk op te halen.

```typescript
// Request
POST /public/riders
Body: [150437, 123456, 789012, ...]

// Response
[
  { riderId: 150437, name: "JRøne", ... },
  { riderId: 123456, name: "OtherRider", ... }
]
```

### 8. Rider Bulk History Source Data

**Tabel**: `rider_bulk_history_source_data`  
**Endpoint**: `POST /public/riders/:time`  
**Rate Limit**: 1 call / 15 minuten

Bulk historical snapshots - voor trend analysis van teams.

## Rate Limit Tracking

**Tabel**: `rate_limit_logs`

```typescript
{
  id: string
  endpoint: string        // "/public/clubs/:id", etc.
  method: string          // "GET", "POST"
  
  // Rate limit status
  limitMax: number        // Max requests per periode
  limitRemaining: number  // Requests over
  limitResetAt: DateTime  // Wanneer reset
  
  // Request details
  requestUrl: string?     // Volledige URL
  responseStatus: number?
  responseTime: number?   // milliseconden
  
  recordedAt: DateTime
}
```

**Automatische Tracking**:
```typescript
// In ZwiftApiClient - automatic tracking via interceptor
this.client.interceptors.response.use(async (response) => {
  if (this.trackRateLimits) {
    await this.trackRateLimitFromResponse(response);
  }
  return response;
});
```

**Query Rate Limit Status**:
```typescript
// Check of endpoint binnen rate limit is
const canCall = await rateLimitRepo.isWithinRateLimit('/public/clubs/:id');

if (!canCall) {
  const latest = await rateLimitRepo.getLatestRateLimit('/public/clubs/:id');
  const waitMinutes = Math.ceil((latest.limitResetAt - new Date()) / 60000);
  console.log(`Rate limit bereikt, wacht ${waitMinutes} minuten`);
}
```

## Data Flow Architectuur

### US5: Single Rider Data Collection

```
┌──────────────────────────────────────────────────────────┐
│ POST /api/source-data/collect/rider/:riderId            │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │ SourceDataCollector │
         └─────────┬───────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────┐      ┌──────────────┐
│GET /riders/:id│      │GET /clubs/:id│
│Rate: 5/min   │      │Rate: 1/60min │
└──────┬───────┘      └──────┬───────┘
       │                     │
       ▼                     ▼
┌──────────────┐      ┌──────────────┐
│rider_source  │      │club_source   │
│_data         │      │_data         │
└──────────────┘      └──────────────┘
```

### US6: Event Data Collection (90 dagen)

```
┌──────────────────────────────────────────────────────────┐
│ POST /api/source-data/collect/events/:riderId           │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │ SourceDataCollector │
         │ .fetchRecentEvents  │
         └─────────┬───────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │GET /riders/:id      │
         │/results             │
         │Rate: 1/min          │
         └─────────┬───────────┘
                   │
                   ▼ (lijst van eventIds)
        ┌──────────┴──────────┐
        │   Voor elk event:   │
        ├──────────┬──────────┤
        │          │          │
        ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│GET        │ │GET        │ │GET        │
│/results/  │ │/zp/       │ │/results/  │
│:eventId   │ │:eventId   │ │:eventId+1 │
│           │ │/results   │ │           │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘
      │             │             │
      ▼             ▼             ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│event_    │ │event_zp_ │ │event_    │
│results_  │ │source_   │ │results_  │
│source_   │ │data      │ │source_   │
│data      │ │          │ │data      │
└──────────┘ └──────────┘ └──────────┘

  ⏱ 61s delay    ⏱ 61s delay   ⏱ 61s delay
```

**Rate Limit Management**:
- Check `rate_limit_logs` voor elke call
- Wacht indien limiet bereikt
- Log elke call automatisch

### US7: Hourly Event Scanner

```
┌─────────────────────────────────────┐
│ Cron Job: Elk uur                   │
│ POST /api/source-data/scan/events  │
└──────────────┬──────────────────────┘
               │
               ▼
     ┌─────────────────────┐
     │ Voor elke tracked   │
     │ rider:              │
     └─────────┬───────────┘
               │
               ▼
     ┌─────────────────────┐
     │ GET /riders/:id     │
     │ /results            │
     └─────────┬───────────┘
               │
               ▼
     ┌─────────────────────┐
     │ Check nieuwe events │
     │ tegen database      │
     └─────────┬───────────┘
               │
        ┌──────┴─────┐
        │            │
        ▼            ▼
┌──────────────┐  ┌──────────────┐
│Already in DB │  │Nieuwe events │
│Skip          │  │Fetch beide   │
└──────────────┘  │endpoints     │
                  └──────────────┘
```

## Data Queries & Analysis

### Voorbeeld Queries

**1. Rider Performance Trend**:
```sql
-- FTP progressie laatste 90 dagen
SELECT 
  datetime(fetchedAt) as datum,
  ftp,
  ranking
FROM rider_source_data
WHERE riderId = 150437
  AND fetchedAt >= datetime('now', '-90 days')
ORDER BY fetchedAt ASC;
```

**2. Event Participation Rate**:
```sql
-- Hoeveel events per week laatste 3 maanden
SELECT 
  strftime('%Y-W%W', eventDate) as week,
  COUNT(*) as events,
  AVG(participantsCount) as avg_participants
FROM event_results_source_data
WHERE eventDate >= datetime('now', '-90 days')
GROUP BY week
ORDER BY week DESC;
```

**3. Rate Limit Monitoring**:
```sql
-- Endpoints die rate limit hebben bereikt vandaag
SELECT 
  endpoint,
  COUNT(*) as hits,
  MIN(limitRemaining) as min_remaining,
  MAX(datetime(limitResetAt)) as next_reset
FROM rate_limit_logs
WHERE date(recordedAt) = date('now')
  AND limitRemaining < 2
GROUP BY endpoint;
```

**4. Data Completeness Check**:
```sql
-- Events met BEIDE endpoints (results + ZP)
SELECT 
  r.eventId,
  r.eventName,
  r.participantsCount as results_count,
  z.participantsCount as zp_count,
  datetime(r.fetchedAt) as results_fetched,
  datetime(z.fetchedAt) as zp_fetched
FROM event_results_source_data r
INNER JOIN event_zp_source_data z ON r.eventId = z.eventId
WHERE r.eventDate >= datetime('now', '-30 days')
ORDER BY r.eventDate DESC;
```

## API Endpoints

### Read Endpoints (GET)

```bash
# Club data
GET /api/source-data/clubs/:clubId                 # Alle snapshots
GET /api/source-data/clubs/:clubId/latest          # Laatste snapshot

# Event data
GET /api/source-data/events/:eventId/results       # Results endpoint data
GET /api/source-data/events/:eventId/zp            # ZwiftPower endpoint data
GET /api/source-data/events/recent?days=90         # Recente events (beide endpoints)

# Rider data
GET /api/source-data/riders/:riderId               # Alle snapshots
GET /api/source-data/riders/:riderId/latest        # Laatste snapshot

# Rate limiting
GET /api/source-data/rate-limits?hours=24          # Rate limit stats
```

### Collection Endpoints (POST)

```bash
# US5: Single rider data collection
POST /api/source-data/collect/rider/:riderId
# Response:
{
  "success": true,
  "riderId": 150437,
  "results": {
    "riderDataSaved": true,
    "clubDataSaved": true
  },
  "errors": []
}

# US6: Event collection (90 dagen)
POST /api/source-data/collect/events/:riderId
Body: { "days": 90 }
# Response:
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

# US7: Hourly event scan
POST /api/source-data/scan/events
Body: { "riderIds": [150437, 123456, ...] }
# Response:
{
  "success": true,
  "riderCount": 5,
  "results": {
    "ridersScanned": 5,
    "newEventsFound": 3
  },
  "errors": []
}
```

## Best Practices

### 1. Rate Limit Management

**✅ DO**:
```typescript
// Check rate limit voor API call
const canCall = await rateLimitRepo.isWithinRateLimit(endpoint);
if (!canCall) {
  logger.warn(`Rate limit bereikt voor ${endpoint}, skip call`);
  return;
}

// Maak API call (automatic tracking via interceptor)
const data = await apiClient.getSomeData();
```

**❌ DON'T**:
```typescript
// Nooit direct fetch/axios zonder rate limit check
const response = await fetch('https://api.example.com/data');
```

### 2. Data Parsing

**✅ DO**:
```typescript
// Parse raw data on-demand
const snapshot = await clubSourceRepo.getLatestClubData(clubId);
const clubData = JSON.parse(snapshot.rawData);

// Access parsed key fields zonder parsing
console.log(snapshot.name, snapshot.memberCount);
```

**❌ DON'T**:
```typescript
// Nooit raw data in applicatie logic
const hardcodedData = { clubId: 11818, name: "TeamNL" };
```

### 3. Batch Processing

**✅ DO**:
```typescript
// Gebruik bulk endpoints voor efficiency
const riderIds = [1, 2, 3, ..., 1000]; // Max 1000
const riders = await apiClient.getRidersBulk(riderIds);

// Save in één batch
await riderBulkSourceRepo.saveBulkRiderData({
  riderIds,
  rawData: riders
});
```

**❌ DON'T**:
```typescript
// Nooit individuele calls in loop zonder delay
for (const id of riderIds) {
  await apiClient.getRider(id); // Rate limit violation!
}
```

### 4. Historical Analysis

**✅ DO**:
```typescript
// Query snapshots voor trend analysis
const history = await riderSourceRepo.getAllRiderSnapshots(riderId, 30);

const trend = history.map(snap => {
  const data = JSON.parse(snap.rawData);
  return {
    date: snap.fetchedAt,
    ftp: data.ftp,
    ranking: data.ranking
  };
});
```

## Monitoring & Maintenance

### Daily Checks

```bash
# 1. Check rate limit status
curl http://localhost:3000/api/source-data/rate-limits

# 2. Verify data freshness
sqlite3 dev.db "
SELECT 
  'Rider snapshots: ' || COUNT(*) 
FROM rider_source_data 
WHERE datetime(fetchedAt) >= datetime('now', '-24 hours');
"

# 3. Check for errors in sync logs
sqlite3 dev.db "
SELECT * FROM sync_logs 
WHERE status = 'error' 
AND datetime(createdAt) >= datetime('now', '-24 hours');
"
```

### Storage Management

```sql
-- Oude snapshots verwijderen (optioneel - bewaar meestal alles)
DELETE FROM rider_source_data
WHERE datetime(fetchedAt) < datetime('now', '-365 days');

-- Vacuum database voor ruimte
VACUUM;
```

### Performance Monitoring

```sql
-- Langzame API calls identificeren
SELECT 
  endpoint,
  AVG(responseTime) as avg_ms,
  MAX(responseTime) as max_ms,
  COUNT(*) as calls
FROM (
  SELECT endpoint, responseTime FROM club_source_data
  UNION ALL
  SELECT endpoint, responseTime FROM event_results_source_data
  UNION ALL
  SELECT endpoint, responseTime FROM rider_source_data
)
WHERE responseTime IS NOT NULL
GROUP BY endpoint
HAVING avg_ms > 1000  -- Langzamer dan 1 seconde
ORDER BY avg_ms DESC;
```

## Troubleshooting

### Problem: Rate Limit Exceeded

**Symptoom**: `429 Too Many Requests`

**Oplossing**:
```typescript
// Check wanneer rate limit reset
const latest = await rateLimitRepo.getLatestRateLimit(endpoint);
const resetIn = latest.limitResetAt.getTime() - Date.now();
const minutes = Math.ceil(resetIn / 60000);

logger.info(`Wacht ${minutes} minuten tot rate limit reset`);
await new Promise(resolve => setTimeout(resolve, resetIn));
```

### Problem: Missing Data in Raw JSON

**Symptoom**: Key field is `null` maar data zou aanwezig moeten zijn

**Oplossing**:
```typescript
// Inspect raw data
const snapshot = await repo.getLatest(id);
const raw = JSON.parse(snapshot.rawData);
console.log('Complete raw data:', JSON.stringify(raw, null, 2));

// Check API response structuur
// Mogelijk is veldnaam gewijzigd of genest
```

### Problem: Database Growing Too Large

**Symptoom**: SQLite database >1GB

**Oplossing**:
```sql
-- Analyseer tabel sizes
SELECT 
  name as table_name,
  SUM(pgsize) / 1024.0 / 1024.0 as size_mb
FROM dbstat
GROUP BY name
ORDER BY size_mb DESC;

-- Archive oude data naar apart bestand
.backup archive_2024.db

-- Verwijder gearchiveerde data
DELETE FROM [table] WHERE fetchedAt < '2024-01-01';
VACUUM;
```

## Toekomstige Uitbreidingen

### 1. Streaming Updates
```typescript
// WebSocket voor real-time event updates
ws.on('new_event', async (eventId) => {
  await fetchEventDetails(eventId);
});
```

### 2. Predictive Analysis
```typescript
// ML model training van historical snapshots
const trainingData = await riderHistorySourceRepo
  .getAllHistorySnapshots(riderId, 1000);

const model = trainFtpPredictionModel(trainingData);
```

### 3. Data Export
```typescript
// Export naar analytics platform
exportToDataWarehouse({
  tables: ['rider_source_data', 'event_results_source_data'],
  dateRange: { start: '2024-01-01', end: '2024-12-31' },
  format: 'parquet'
});
```

---

**Versie**: 1.0  
**Laatst geupdate**: 30 oktober 2025  
**Auteur**: TeamNL Cloud9 Development Team
