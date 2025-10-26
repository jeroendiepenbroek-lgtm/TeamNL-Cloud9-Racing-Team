# Dashboard Implementation

Dashboard functies voor TeamNL Cloud9 Racing Team - Complete implementatie van 3 user stories.

## Status: ✅ Backend Compleet

Alle backend infrastructuur is geïmplementeerd en getest. Frontend volgt nog.

---

## User Stories Overzicht

### 📊 Story 1: Club Recent Results
**Als lid** wil ik de recente racersultaten van de rijders in mijn team zien.

**Implementatie:**
- ✅ Database: RaceResult model met club-relatie via Rider
- ✅ Service: `DashboardService.getClubRecentResults(riderId, limit)`
- ✅ API: `GET /api/dashboard/club-results/:riderId?limit=50`
- ✅ Test: `scripts/test-dashboard.ts`

**Response voorbeeld:**
```json
{
  "rider": {
    "zwiftId": 150437,
    "name": "JRøne | CloudRacer-9 @YouTube",
    "clubId": 2281
  },
  "totalResults": 1,
  "results": [
    {
      "id": 1,
      "eventId": 5129235,
      "riderName": "JRøne | CloudRacer-9 @YouTube",
      "position": 17,
      "category": "B",
      "time": 1923,
      "eventName": "Event 5129235",
      "eventDate": "2025-10-23T10:41:55.000Z"
    }
  ]
}
```

---

### ⭐ Story 2: Favorite Riders
**Als gebruiker** wil ik rider details kunnen zien van door mij gedefinieerde RiderIDs (favorieten).

**Implementatie:**
- ✅ Database: UserFavorite model met self-referential relations
- ✅ Service: `DashboardService.getFavoriteRiders(userId)`
- ✅ Service: `DashboardService.addFavorite(userId, favoriteRiderId, notes?)`
- ✅ Service: `DashboardService.removeFavorite(userId, favoriteRiderId)`
- ✅ API: 3 endpoints voor favorites management
- ✅ Test: `scripts/test-dashboard.ts`

**Endpoints:**
```
GET    /api/dashboard/favorites/:userId
POST   /api/dashboard/favorites/:userId/:favoriteId
DELETE /api/dashboard/favorites/:userId/:favoriteId
```

**Response voorbeeld:**
```json
{
  "userId": 150437,
  "totalFavorites": 2,
  "favorites": [
    {
      "zwiftId": 1813927,
      "name": "Dylan Smink5849",
      "category": "B",
      "ftp": 264,
      "ftpWkg": 3.43,
      "club": {
        "id": 2281,
        "name": "Test Club"
      },
      "statistics": null,
      "recentResults": [],
      "notes": "Test favorite for rider 1813927",
      "notificationEnabled": false,
      "addedAt": "2025-10-23T11:04:17.000Z"
    }
  ]
}
```

---

### 📅 Story 3: Rider Recent Events
**Als rider** wil ik de EventIDs kunnen zien van de evenementen waaraan ik heb deelgenomen in de afgelopen 90 dagen.

**Implementatie:**
- ✅ Database: Event model met RaceResult relaties
- ✅ Service: `DashboardService.getRiderRecentEvents(riderId, days=90)`
- ✅ API: `GET /api/dashboard/rider-events/:riderId?days=90`
- ✅ Test: `scripts/test-dashboard.ts`

**Response voorbeeld:**
```json
{
  "rider": {
    "zwiftId": 150437,
    "name": "JRøne | CloudRacer-9 @YouTube",
    "category": "B"
  },
  "period": {
    "days": 90,
    "from": "2025-07-25T11:04:17.000Z",
    "to": "2025-10-23T11:04:17.000Z"
  },
  "summary": {
    "totalEvents": 1,
    "finishedEvents": 1,
    "dnfs": 0,
    "avgPosition": 17
  },
  "events": [
    {
      "eventId": 5129235,
      "eventName": "Event 5129235",
      "eventDate": "2025-10-23T10:41:55.000Z",
      "position": 17,
      "positionCategory": 6,
      "category": "B",
      "time": 1923,
      "distance": null,
      "routeName": null,
      "averagePower": null,
      "averageWkg": null
    }
  ]
}
```

---

## Database Schema

### Nieuwe Modellen

#### UserFavorite
```prisma
model UserFavorite {
  id                    Int      @id @default(autoincrement())
  userId                Int      // Zwift ID van user
  favoriteRiderId       Int      // Zwift ID van favorite rider
  notes                 String?
  notificationEnabled   Boolean  @default(false)
  addedAt               DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  user                  Rider    @relation("UserFavorites", fields: [userId], references: [id])
  favoriteRider         Rider    @relation("FavoritedBy", fields: [favoriteRiderId], references: [id])

  @@unique([userId, favoriteRiderId], name: "unique_favorite")
  @@map("user_favorites")
}
```

**Migratie:** `20251023105746_add_user_favorites`

### Bestaande Modellen (gebruikt)
- **Rider** - Club members met profiel data
- **Club** - TeamNL Cloud9 (ID: 2281)
- **Event** - Race events
- **RaceResult** - Individuele race resultaten
- **RiderStatistics** - Statistieken (nog te berekenen)

---

## API Endpoints Overzicht

### Dashboard Endpoints (5 nieuw)

```
GET    /api/dashboard/club-results/:riderId?limit=50
       → Recent results van alle club members

GET    /api/dashboard/favorites/:userId
       → Lijst van favorite riders met stats

POST   /api/dashboard/favorites/:userId/:favoriteId
       Body: { "notes": "Optional notes" }
       → Voeg favorite toe

DELETE /api/dashboard/favorites/:userId/:favoriteId
       → Verwijder favorite

GET    /api/dashboard/rider-events/:riderId?days=90
       → Event geschiedenis van rider
```

### Sync Endpoints (bestaand)
```
POST   /api/sync/club
       → Sync alle club members

POST   /api/sync/event/:eventId
       → Sync specifiek event
```

---

## Service Layer

### DashboardService

**Locatie:** `src/services/dashboard.ts`

**Methoden:**

```typescript
class DashboardService {
  // Story 1: Club results
  async getClubRecentResults(riderId: number, limit = 50)
  
  // Story 2: Favorites
  async getFavoriteRiders(userId: number)
  async addFavorite(userId: number, favoriteRiderId: number, notes?: string)
  async removeFavorite(userId: number, favoriteRiderId: number)
  
  // Story 3: Rider events
  async getRiderRecentEvents(riderId: number, days = 90)
}
```

**Features:**
- Complex Prisma queries met nested includes (3-4 levels)
- Statistics aggregation (avg position, total events, DNFs)
- Date filtering (90-day windows)
- Comprehensive error handling
- Type-safe met TypeScript

---

## Test Scripts

### 1. Test Dashboard Functies
```bash
npx tsx scripts/test-dashboard.ts
```

**Functionaliteit:**
- Test alle 3 user stories
- Voegt test favorites toe (riders 1495, 1813927)
- Shows database status
- Valideerd API responses
- Geeft API endpoint voorbeelden

**Output:**
- ✅ Story 1: Club results (1 result gevonden)
- ✅ Story 2: Favorites (2 favorites toegevoegd)
- ✅ Story 3: Recent events (1 event gevonden)

### 2. Bulk Event Sync
```bash
npx tsx scripts/bulk-sync-events.ts
```

**Functionaliteit:**
- Sync meerdere events tegelijk
- Rate limit handling (60s tussen calls)
- Skip already synced events
- Save results voor riders in database

**Configuratie:**
- Bewerk `EVENT_IDS` array in script
- Voeg toe: evenementen van TeamNL Cloud9 members
- Respect 1 min/event rate limit

---

## Data Status

### Huidige Database
```
Riders: 3
  - 150437: JRøne | CloudRacer-9 @YouTube (B, FTP 270W)
  - 1495: Onno Aphinan (B, FTP 294W)
  - 1813927: Dylan Smink5849 (B, FTP 264W)

Events: 1
  - 5129235: Event synced met 59 API results

Race Results: 1
  - Event 5129235, Rider 150437, Position 17

Favorites: 2
  - User 150437 → Rider 1495
  - User 150437 → Rider 1813927
```

### Data Gaps
⚠️ **Beperkte data voor meaningful dashboards**

1. **Weinig events** - Alleen 1 event gesynced
   - Oplossing: Sync meer events via bulk script
   - Zoek events met TeamNL Cloud9 participants

2. **Lege statistics** - RiderStatistics tabel leeg
   - Oplossing: Implementeer statistics calculation service
   - Calculate from existing race_results

3. **Placeholder dates** - Event dates often NULL/current
   - Oplossing: Extract dates van API responses
   - Update existing events

---

## Volgende Stappen

### Prioriteit 1: Data Populatie
```bash
# 1. Zoek meer event IDs (via ZwiftRacing.app)
# 2. Voeg toe aan scripts/bulk-sync-events.ts
# 3. Run bulk sync
npx tsx scripts/bulk-sync-events.ts

# 4. Test met meer data
npx tsx scripts/test-dashboard.ts
```

### Prioriteit 2: Statistics Engine
Implementeer `src/services/statistics.ts`:
```typescript
class StatisticsService {
  async calculateRiderStats(riderId: number)
  async recalculateAllStats()
  async updateStatsOnNewResult(resultId: number)
}
```

### Prioriteit 3: Frontend Dashboard
- Next.js of React + Vite
- 3 hoofdweergaven (1 per user story)
- Real-time updates via WebSocket (optioneel)
- Responsive design voor mobiel

### Prioriteit 4: Advanced Features
- Email notifications voor favorites
- Event reminders
- Performance trends
- Club leaderboards
- Live race tracking

---

## Testing

### Manual API Testing

```bash
# Start server
npm run dev

# Test Club Results
curl http://localhost:3000/api/dashboard/club-results/150437

# Test Favorites - List
curl http://localhost:3000/api/dashboard/favorites/150437

# Test Favorites - Add
curl -X POST http://localhost:3000/api/dashboard/favorites/150437/1495 \
  -H "Content-Type: application/json" \
  -d '{"notes": "Teamgenoot"}'

# Test Rider Events
curl http://localhost:3000/api/dashboard/rider-events/150437?days=90

# Test Favorites - Remove
curl -X DELETE http://localhost:3000/api/dashboard/favorites/150437/1495
```

### Automated Testing (TODO)
- Unit tests met Vitest
- Integration tests met supertest
- E2E tests met Playwright

---

## Performance Overwegingen

### Database Queries
- **Indexes**: Prisma auto-creates op foreign keys
- **Includes**: 3-4 level nesting OK voor read queries
- **Pagination**: Implemented via `limit` parameter
- **N+1 queries**: Avoided via Prisma includes

### Rate Limiting
- **ZwiftRacing API**: Strict limits (1/min voor events)
- **Solution**: Batch sync scripts met delays
- **Caching**: Consider Redis voor frequently accessed data

### Scalability
- **SQLite**: Dev only - switch to PostgreSQL for prod
- **Connection pooling**: Prisma handles automatically
- **Background jobs**: Use node-cron voor scheduled syncs

---

## Troubleshooting

### Geen data in responses
```
Problem: Dashboard returns empty arrays
Solution: Sync more data
  1. npm run sync (club members)
  2. npx tsx scripts/bulk-sync-events.ts
```

### Rate limit errors
```
Problem: 429 Too Many Requests
Solution: Increase RATE_LIMIT_DELAY
  - Edit script: RATE_LIMIT_DELAY = 120000 (2 min)
  - Check sync logs: GET /api/sync/logs
```

### TypeScript errors after schema changes
```
Problem: Property does not exist
Solution: Regenerate Prisma client
  npx prisma generate
```

### Database locked
```
Problem: SqliteError: database is locked
Solution:
  1. Close Prisma Studio
  2. Or switch to PostgreSQL
```

---

## Referenties

- **API Docs**: `docs/API.md`
- **User Stories**: `docs/USER_STORIES_ANALYSIS.md`
- **Copilot Instructions**: `.github/copilot-instructions.md`
- **Prisma Schema**: `prisma/schema.prisma`
- **Dashboard Service**: `src/services/dashboard.ts`
- **API Routes**: `src/api/routes.ts`

---

**Laatste Update:** 2025-10-23  
**Status:** Backend compleet, frontend pending  
**Developers:** Zie git history voor contributions
