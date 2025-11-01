# Event Discovery & Data Collection Architectuur

## 🎯 Overzicht

**Probleem**: Hoe vinden we alle events waar een rider aan heeft deelgenomen?

**Oude oplossing**: Backward event ID scanning (3+ uur, brute force)

**Nieuwe oplossing**: Web scraping + API data enrichment (2 seconden + API calls)

---

## ✅ Use Cases

### US1: Event Discovery via Scraping
**Doel**: Verkrijg alle event IDs van een rider (laatste 90 dagen)

**Methode**: Scrape `https://www.zwiftracing.app/riders/:riderId`

**Output**: Event IDs + basis info in database

**Voordelen**:
- ⚡ Snelheid: 2 seconden vs 3+ uur
- 🎯 Compleet: Alle events in 1 HTTP call
- 📊 Betrouwbaar: ZwiftRacing.app heeft al alle data geïndexeerd
- 🔄 Geen rate limit issues

### US2: Data Enrichment via API
**Doel**: Verkrijg volledige event data voor bekende event IDs

**Methode**: Voor elk event ID:
- `GET /public/results/:eventId` → Rating data, positions, times
- `GET /public/zp/:eventId/results` → Power curves, FTP, heart rate

**Output**: Brondatatabellen (immutable source-of-truth)

**Rate limits**: 61s tussen API calls (1/min)

### US3: Opslaan in Datastore
**Doel**: Persisteer complete API responses

**Tabellen**:
- `event_results_source_data` - Rating data
- `event_zp_source_data` - Power data

**Kenmerken**:
- ✅ Immutable: Nooit updaten, alleen nieuwe snapshots
- ✅ Complete: Volledige JSON responses
- ✅ Traceable: fetchedAt timestamps

### US7: Incremental Scanning
**Doel**: Detecteer nieuwe events (hourly)

**Workflow**:
1. Re-scrape tracked riders
2. Detect nieuwe events (laatste 24h)
3. Fetch missing brondatatabellen data

**Trigger**: Cron job (elk uur)

### US8: Nieuwe Rider Onboarding
**Doel**: Laad complete history voor nieuwe rider

**Workflow**:
1. Run US1 (scrape 90 dagen)
2. Run US2+US3 (fetch all event data)
3. Add to US7 scanner (hourly updates)

**Duration**: ~52 minuten (26 events × 2 endpoints × 61s)

---

## 🏗️ Architectuur

```
┌─────────────────────────────────────────────────────────────┐
│  1. EVENT DISCOVERY (Web Scraping)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Service: EventDiscoveryService                             │
│  Method: scrapeRiderEvents(riderId, days)                   │
│                                                              │
│  Input:  Rider ID + aantal dagen                            │
│  Source: https://www.zwiftracing.app/riders/:riderId        │
│  Parse:  JSON uit <script id="__NEXT_DATA__">               │
│  Output: Event IDs in database (events + race_results)      │
│                                                              │
│  Duration: ~2 seconden                                       │
│  Rate limit: Geen (website scraping)                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  2. DATA ENRICHMENT (API Calls)                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Service: SourceDataCollectorService                        │
│  Method: fetchRecentEvents(riderId, days)                   │
│                                                              │
│  Voor elk event ID:                                         │
│                                                              │
│    A. GET /public/results/:eventId                          │
│       → Rating data, positions, finish times                │
│       → Save: event_results_source_data                     │
│       → Wait: 61s (rate limit 1/min)                        │
│                                                              │
│    B. GET /public/zp/:eventId/results                       │
│       → Power curves (5s, 15s, 30s, 1min, 5min, 20min)     │
│       → FTP, heart rate, cadence                            │
│       → Save: event_zp_source_data                          │
│       → Wait: 61s (rate limit 1/min)                        │
│                                                              │
│  Duration: ~52 minuten (26 events × 2 × 61s)                │
│  Rate limit: Strict (1 call per 61 seconds)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  3. INCREMENTAL UPDATES (Scheduled)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Service: SourceDataCollectorService                        │
│  Method: scanForNewEvents(riderIds)                         │
│  Trigger: Cron job (hourly)                                 │
│                                                              │
│  Voor elke tracked rider:                                   │
│    1. Re-scrape event list                                  │
│    2. Detect nieuwe events (laatste 24h)                    │
│    3. Fetch missing brondatatabellen data                   │
│                                                              │
│  Duration: ~122 seconden per rider (2s scrape + 2min API)   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow

### 1. Event Discovery (Scraping)
```typescript
// Input
riderId: 150437
days: 90

// HTTP Request
GET https://www.zwiftracing.app/riders/150437
→ Parse HTML
→ Extract <script id="__NEXT_DATA__">
→ Parse JSON

// Output
{
  riderId: 150437,
  riderName: "JRøne | CloudRacer-9",
  history: [
    {
      event: {
        id: "5163788",
        time: 1761764400,
        title: "ZwiftNL Racing League - Race 2",
        type: "Race",
        distance: 23.67,
        elevation: 205,
        route: {
          world: "Watopia",
          name: "Power Punches"
        }
      },
      position: 48,
      time: 2144
    },
    // ... 25 more events
  ]
}

// Database inserts
INSERT INTO events (id, name, eventDate, ...)
INSERT INTO race_results (riderId, eventId, position, time, ...)
```

### 2. Data Enrichment (API)
```typescript
// Voor elk event ID uit database
eventId: 5163788

// API Call #1
GET /public/results/5163788
→ [
  {
    "riderId": 150437,
    "position": 48,
    "time": 2144,
    "rating": 1377.65,
    "ratingDelta": 0.654,
    // ... more fields
  },
  // ... 100+ participants
]

// Save to brondatatabellen
INSERT INTO event_results_source_data (
  eventId: 5163788,
  rawData: JSON,
  participantsCount: 100,
  fetchedAt: NOW()
)

// Wait 61 seconds...

// API Call #2
GET /public/zp/5163788/results
→ [
  {
    "riderId": 150437,
    "wkg5": 12.04,
    "wkg15": 10.29,
    "wkg30": 6.97,
    "wkg60": 4.83,
    "wkg300": 3.75,
    "wkg1200": 3.21,
    "ftp": 270,
    // ... power curve data
  },
  // ... 100+ participants
]

// Save to brondatatabellen
INSERT INTO event_zp_source_data (
  eventId: 5163788,
  rawData: JSON,
  participantsCount: 100,
  fetchedAt: NOW()
)
```

---

## 🔧 Implementation

### Service: EventDiscoveryService

```typescript
// Location: src/services/event-discovery.service.ts

class EventDiscoveryService {
  // US1: Scrape rider events (90 dagen)
  async scrapeRiderEvents(riderId: number, days: number): Promise<{
    riderId: number;
    riderName: string;
    totalEvents: number;
    newEvents: number;
    newResults: number;
  }>
  
  // US8: Onboard nieuwe rider
  async onboardNewRider(riderId: number): Promise<{
    riderId: number;
    riderName: string;
    eventsDiscovered: number;
    eventIdsNeedingData: number[];
  }>
  
  // Detect nieuwe events sinds datum
  async detectNewEvents(riderId: number, sinceDate: Date): Promise<number[]>
}
```

### Service: SourceDataCollectorService

```typescript
// Location: src/services/source-data-collector.ts

class SourceDataCollectorService {
  // US2+US3: Fetch event data (API enrichment)
  async fetchRecentEvents(riderId: number, days: number): Promise<{
    riderId: number;
    eventsProcessed: number;
    resultsDataSaved: number;
    zpDataSaved: number;
    errors: string[];
  }>
  
  // US7: Hourly scanner
  async scanForNewEvents(riderIds: number[]): Promise<{
    ridersScanned: number;
    newEventsFound: number;
    dataFetched: number;
  }>
}
```

---

## 🚀 API Endpoints

### POST /api/source-data/collect/events/:riderId
**US6**: Fetch 90-day event data voor rider

**Request**:
```bash
curl -X POST http://localhost:3000/api/source-data/collect/events/150437 \
  -H "Content-Type: application/json" \
  -d '{"days": 90}'
```

**Response**:
```json
{
  "riderId": 150437,
  "riderName": "JRøne | CloudRacer-9",
  "scraping": {
    "totalEvents": 26,
    "newEvents": 0,
    "newResults": 0,
    "duration": "2s"
  },
  "enrichment": {
    "eventsProcessed": 26,
    "resultsDataSaved": 26,
    "zpDataSaved": 26,
    "duration": "52min"
  }
}
```

### POST /api/source-data/scan/events
**US7**: Hourly scan voor nieuwe events

**Request**:
```bash
curl -X POST http://localhost:3000/api/source-data/scan/events \
  -H "Content-Type: application/json" \
  -d '{"riderIds": [150437, 123456]}'
```

**Response**:
```json
{
  "ridersScanned": 2,
  "newEventsFound": 3,
  "dataFetched": {
    "resultsData": 3,
    "zpData": 3
  },
  "duration": "6min"
}
```

### POST /api/source-data/onboard/rider/:riderId
**US8**: Onboard nieuwe rider

**Request**:
```bash
curl -X POST http://localhost:3000/api/source-data/onboard/rider/150437
```

**Response**:
```json
{
  "riderId": 150437,
  "riderName": "JRøne | CloudRacer-9",
  "eventsDiscovered": 26,
  "dataEnrichmentNeeded": 26,
  "estimatedDuration": "52 minutes"
}
```

---

## ⏱️ Performance

### Event Discovery (Scraping)
- **Methode**: Web scraping
- **Duur**: ~2 seconden
- **Rate limit**: Geen
- **Output**: Alle events (90 dagen)

### Data Enrichment (API)
- **Methode**: API calls
- **Duur**: 26 events × 2 endpoints × 61s = **52 minuten**
- **Rate limit**: Strict (1/min)
- **Output**: Complete brondatatabellen

### Totaal (US6 complete flow)
- **Discovery**: 2s
- **Enrichment**: 52min
- **Totaal**: ~52 minuten voor 90 dagen history

---

## 🔒 Rate Limit Management

### API Endpoints
```
GET /public/results/:eventId
→ Rate limit: 1 per minute
→ Wachttijd: 61 seconden

GET /public/zp/:eventId/results  
→ Rate limit: 1 per minute
→ Wachttijd: 61 seconden
```

### Strategy
1. Check rate limit VÓÓRdat API call
2. Wacht 61s tussen calls (60s + 1s buffer)
3. Log rate limit logs naar database
4. Continue on error (skip event, log error)

### Database Tracking
```sql
-- Rate limit logs
INSERT INTO rate_limit_logs (
  endpoint,
  requestedAt,
  allowed,
  resetAt
)

-- Query recent rate limits
SELECT * FROM rate_limit_logs 
WHERE endpoint = '/public/results/:eventId'
ORDER BY requestedAt DESC
LIMIT 5
```

---

## 📝 TODO: Integration Steps

### 1. Update source-data-collector.ts ✅
- [x] Import eventDiscoveryService
- [ ] Update fetchRecentEvents() to use scraping
- [ ] Update scanForNewEvents() to use scraping
- [ ] Test US6 met rider 150437

### 2. Add API Endpoints
- [ ] POST /api/source-data/collect/events/:riderId (US6)
- [ ] POST /api/source-data/scan/events (US7)
- [ ] POST /api/source-data/onboard/rider/:riderId (US8)

### 3. Testing
- [ ] Test scraping voor bestaande rider
- [ ] Test scraping voor nieuwe rider
- [ ] Test data enrichment (beide endpoints)
- [ ] Test hourly scanner

### 4. Documentation
- [x] Architecture document
- [ ] API documentation update
- [ ] README update

---

## 🎓 Lessons Learned

### ✅ Web Scraping is Perfect Voor Deze Use Case

**Waarom?**
1. ZwiftRacing.app heeft al alle data geïndexeerd
2. Next.js SSP embed complete data in HTML
3. JSON parsing is betrouwbaar (gestructureerde data)
4. Geen authenticatie nodig
5. Veel sneller dan brute force API scanning

**Limitations**:
1. Afhankelijk van website structuur (kan breken bij updates)
2. Geen officiële API (geen support)
3. Ethical: respecteer robots.txt en rate limits

### ✅ Separation of Concerns

**Event Discovery** (scraping):
- Snel, compleet, geen rate limits
- Verkrijg event IDs

**Data Enrichment** (API):
- Langzaam, strict rate limits
- Verkrijg volledige event data

**Voordelen**:
- Modulair: Services zijn onafhankelijk
- Testbaar: Makkelijk te mocken
- Flexibel: Kan scraping vervangen door andere methode
- Schaalbaar: Parallel scraping mogelijk

---

## 🚦 Next Steps

1. **Integreer scraping in fetchRecentEvents()**
   - Update method om eerst te scrapen
   - Dan data enrichment via API

2. **Test complete flow**
   - Run US6 voor rider 150437
   - Verify brondatatabellen
   - Check rate limits

3. **Implement US7 scanner**
   - Hourly cron job
   - Multi-rider support
   - Error handling

4. **Implement US8 onboarding**
   - New rider workflow
   - Progress tracking
   - Email notification (optional)

5. **Monitor & Optimize**
   - Track scraping success rate
   - Monitor API rate limits
   - Optimize batch processing
