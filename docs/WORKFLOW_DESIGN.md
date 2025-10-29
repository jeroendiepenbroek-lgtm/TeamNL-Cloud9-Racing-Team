# TeamNL Cloud9 - Workflow Design
## API → Business Logic → Datastore

**Versie**: 1.0  
**Datum**: 27 oktober 2025  
**Doel**: Complete data tracking workflow voor subteam en club riders

---

## Overzicht

```
┌─────────────────────────────────────────────────────────────────┐
│                         GUI (Frontend)                          │
│         Subteam Management + Dashboard Visualisatie            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Backend)                        │
│  /api/subteam/riders (POST/DELETE) - Manage favorites          │
│  /api/sync/subteam - Trigger volledige sync                    │
│  /api/sync/forward - Scan nieuwe events (daily cron)           │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer (Logic)                        │
│  SubteamService   - Manage favorites & sync orchestration       │
│  RiderService     - Rider stats sync                            │
│  ClubService      - Club roster sync                            │
│  EventService     - Forward event scanning                      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Repository Layer (Data Access)                 │
│  FavoriteRiderRepo - Subteam CRUD                              │
│  RiderStatsRepo    - Full rider data                           │
│  ClubRepo          - Club metadata                             │
│  ClubMemberRepo    - Complete club rosters                     │
│  EventRepo         - Event tracking                            │
│  RaceResultRepo    - Result details                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database (Prisma + SQLite)                   │
│  favorite_riders  - Jouw subteam (Zwift IDs)                   │
│  rider_stats      - Volledige stats van favorites              │
│  clubs            - Unieke clubs van favorites                 │
│  club_members     - Alle riders per club                       │
│  events           - Events waar subteam/club in racet          │
│  race_results     - Resultaten per rider per event             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflow Steps - Gedetailleerd

### **Step 1: Subteam Management via GUI**

**User Story**: Als gebruiker wil ik mijn favoriete riders (subteam) kunnen beheren

**GUI Acties**:
- Upload Zwift ID(s) via form input of CSV import
- Verwijder Zwift ID uit subteam
- Bekijk lijst van alle subteam riders met status

**API Endpoints**:
```typescript
POST /api/subteam/riders
Body: { zwiftIds: [150437, 123456, 789012] }
Response: { added: 3, failed: 0, riders: [...] }

DELETE /api/subteam/riders/:zwiftId
Response: { success: true, deleted: 150437 }

GET /api/subteam/riders
Response: { total: 15, riders: [...] }
```

**Database Mutatie**:
```sql
-- Nieuwe tabel: favorite_riders
INSERT INTO favorite_riders (zwift_id, added_at, added_by)
VALUES (150437, NOW(), 'manual_gui');
```

**Huidige Status**: ❌ Nog te implementeren
- Tabel: `favorite_riders` moet worden toegevoegd aan schema
- Service: `SubteamService` moet worden gecreëerd
- Routes: `/api/subteam/*` endpoints toevoegen

---

### **Step 2: Rider Stats Sync van Subteam**

**User Story**: Van elke favorite rider wil ik volledige stats (power, ranking, phenotype)

**Trigger**:
- Automatisch na toevoegen nieuwe rider in Step 1
- Handmatig via "Sync All" knop in GUI
- Scheduled: Dagelijks om 03:00 (update stats)

**API Call naar ZwiftRacing**:
```typescript
GET https://zwift-ranking.herokuapp.com/api/public/riders/150437
Headers: { x-api-key: "650c6d2fc4ef6858d74cbef1" }
```

**Data Opslag**:
```sql
-- Bestaande tabel: rider_stats (of uitbreiden van riders)
INSERT OR REPLACE INTO rider_stats (
  zwift_id, name, category, ftp, ftp_wkg, 
  power_5s, power_1min, power_5min, power_20min,
  ranking, race_count, win_rate,
  weight, height, phenotype,
  club_id,  -- BELANGRIJK: Voor Step 3
  updated_at
) VALUES (...);
```

**Rate Limiting**: 5 requests/min (ZwiftRacing API limit voor riders)

**Huidige Status**: ⚠️ Deels geïmplementeerd
- Tabel: `riders` tabel bestaat al met 66+ attributen
- Service: Logica bestaat in `src/services/sync.ts` maar moet worden aangepast
- TODO: Koppel aan `favorite_riders` tabel ipv `clubs` tabel

---

### **Step 3: Club ID Extractie**

**User Story**: Ik wil weten bij welke clubs mijn subteam riders horen

**Logica**:
```typescript
// Na Step 2: Voor elke rider in favorite_riders
const riderStats = await getRiderStats(zwiftId);
const clubId = riderStats.club?.id;

if (clubId && clubId !== null) {
  // Voeg club toe aan aparte tabel
  await upsertClub({
    id: clubId,
    name: riderStats.club.name,
    source: 'favorite_rider',
    tracked_since: new Date()
  });
  
  // Update link
  await linkRiderToClub(zwiftId, clubId);
}
```

**Database**:
```sql
-- Bestaande tabel: clubs
INSERT OR IGNORE INTO clubs (id, name, source, tracked_since)
VALUES (2281, 'TeamNL Cloud9', 'favorite_rider', NOW());

-- Link in rider_stats
UPDATE rider_stats SET club_id = 2281 WHERE zwift_id = 150437;
```

**Unieke Clubs**:
```sql
-- Query voor alle unieke clubs van subteam
SELECT DISTINCT c.* 
FROM clubs c
JOIN rider_stats rs ON rs.club_id = c.id
JOIN favorite_riders fr ON fr.zwift_id = rs.zwift_id;
```

**Huidige Status**: ✅ Tabel bestaat, ⚠️ Logica aanpassen
- Tabel: `clubs` bestaat al
- TODO: Automatisch clubs toevoegen bij rider sync
- TODO: `source` veld toevoegen aan clubs tabel (favorite_rider, manual, etc.)

---

### **Step 4: Club Roster Sync**

**User Story**: Van elke club uit Step 3 wil ik ALLE members zien, niet alleen mijn favorites

**Trigger**:
- Automatisch na nieuwe club in Step 3
- Scheduled: Elke 60 minuten (rate limit!)
- Handmatig via "Sync Club Roster" knop

**API Call**:
```typescript
GET https://zwift-ranking.herokuapp.com/api/public/clubs/2281
Headers: { x-api-key: "..." }
Response: {
  club: { id: 2281, name: "TeamNL Cloud9", ... },
  riders: [
    { riderId: 150437, name: "Jeroen", ... },
    { riderId: 999999, name: "Jan", ... },  // NIET in subteam
    // ... 50+ riders
  ]
}
```

**Database**:
```sql
-- Nieuwe tabel: club_members (aparte tabel!)
CREATE TABLE club_members (
  id INTEGER PRIMARY KEY,
  club_id INTEGER NOT NULL,
  zwift_id INTEGER NOT NULL,
  name TEXT,
  category TEXT,
  ftp REAL,
  ranking INTEGER,
  
  is_favorite BOOLEAN DEFAULT FALSE,  -- Link naar subteam
  
  synced_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(club_id, zwift_id),
  FOREIGN KEY (club_id) REFERENCES clubs(id)
);

-- Voorbeeld data
INSERT INTO club_members (club_id, zwift_id, name, category, is_favorite)
VALUES 
  (2281, 150437, 'Jeroen', 'B', TRUE),   -- In subteam
  (2281, 999999, 'Jan', 'A', FALSE);     -- Niet in subteam
```

**Verschil met rider_stats**:
- `rider_stats`: Volledige 66 attributen, alleen voor subteam favorites
- `club_members`: Basis info (15 attributen), alle club leden

**Rate Limiting**: 1 request per 60 min per club (strict!)

**Huidige Status**: ⚠️ Tabel bestaat, logica herstructureren
- Tabel: `club_members` bestaat al
- TODO: Automatisch sync na Step 3
- TODO: `is_favorite` boolean toevoegen voor filtering

---

### **Step 5: Forward Event Scanning**

**User Story**: Track alle events waar mijn subteam of hun club members in racen

**Scope**:
```typescript
// Riders om te tracken = Subteam + Club Members
const trackedRiders = [
  ...await getAllFavoriteRiders(),      // Subteam (Prio 1)
  ...await getAllClubMembers()           // Club leden (Prio 2)
];

// Voorbeeld: 15 favorites + 200 club members = 215 tracked riders
```

**Forward Scanning Strategie**:

**Daily Scan** (04:00 uur via cron):
```typescript
// 1. Haal laatste bekende event ID op
const lastEventId = await getMaxEventId(); // Bijv: 5129365

// 2. Scan volgende 1000 events
for (let eventId = lastEventId + 1; eventId <= lastEventId + 1000; eventId++) {
  
  // API call (rate limit: 1/min = 61 sec delay)
  const event = await zwiftApi.getEventResults(eventId);
  
  if (!event) continue; // Event bestaat niet
  
  // 3. Filter: Bevat het event tracked riders?
  const trackedResults = event.results.filter(result => 
    trackedRiders.includes(result.riderId)
  );
  
  if (trackedResults.length > 0) {
    // 4. Opslaan in database
    await saveEvent({
      id: eventId,
      name: event.name,
      eventDate: event.date,
      clubId: event.clubId,
      totalFinishers: event.results.length
    });
    
    await saveRaceResults(trackedResults); // Alleen tracked riders
  }
}
```

**Database**:
```sql
-- Events tabel
INSERT INTO events (id, name, event_date, club_id, total_finishers)
VALUES (5129400, 'WTRL TTT', '2025-10-27', 2281, 45);

-- Race results (alleen tracked riders!)
INSERT INTO race_results (event_id, rider_id, position, time, category)
VALUES 
  (5129400, 150437, 12, 3245, 'B'),  -- Jeroen (favorite)
  (5129400, 999999, 5, 3100, 'A');   -- Jan (club member)
```

**Data Retention**: 100 dagen
```typescript
// Daily cleanup (na forward scan)
await softDeleteOldEvents(100); // deletedAt = NOW()
await hardDeleteOldResults(100); // DELETE FROM race_results
```

**Performance**:
- 1000 events/dag × 1 min = ~17 uur scan tijd
- Daarna: 23 uur idle tot volgende dag
- Filtering happens in-memory (geen extra API calls)

**Huidige Status**: ⚠️ Basis bestaat, herstructureren
- Script: `scripts/forward-tracking.ts` bestaat (compile errors gefixed)
- TODO: Gebruik `favorite_riders` + `club_members` als bron
- TODO: Soft delete met `deletedAt` (schema update gedaan)

---

## Database Schema - Volledig Overzicht

### **Nieuwe Tabellen** (toe te voegen):

```prisma
/// Subteam - Handmatig toegevoegde favorite riders
model FavoriteRider {
  id              Int           @id @default(autoincrement())
  zwiftId         Int           @unique
  
  // Metadata
  addedAt         DateTime      @default(now())
  addedBy         String        @default("manual")  // manual, csv_import, api
  notes           String?                           // User notities
  
  // Relaties
  stats           RiderStats?   @relation(fields: [zwiftId], references: [zwiftId])
  
  @@map("favorite_riders")
  @@index([addedAt])
}

/// Volledige rider stats (66+ attributen)
model RiderStats {
  zwiftId         Int           @id
  name            String
  
  // Power metrics (18 velden)
  ftp             Float?
  ftpWkg          Float?
  power5s         Float?
  power1min       Float?
  power5min       Float?
  power20min      Float?
  // ... rest van power curve
  
  // Racing (15 velden)
  category        String?
  ranking         Int?
  raceCount       Int           @default(0)
  winRate         Float?
  // ... rest van race stats
  
  // Phenotype (7 velden)
  weight          Float?
  height          Float?
  phenotype       String?
  // ...
  
  // Club link (BELANGRIJK voor Step 3)
  clubId          Int?
  club            Club?         @relation(fields: [clubId], references: [id])
  
  // Sync metadata
  lastSync        DateTime      @updatedAt
  
  // Relaties
  favorite        FavoriteRider?
  
  @@map("rider_stats")
  @@index([clubId])
  @@index([category])
  @@index([ranking])
}
```

### **Uitbreidingen Bestaande Tabellen**:

```prisma
model Club {
  id              Int           @id
  name            String?
  
  // SOURCE TRACKING (NIEUW)
  source          String        @default("manual")  // favorite_rider, manual, api
  trackedSince    DateTime      @default(now())
  
  // Sync settings
  syncEnabled     Boolean       @default(true)
  lastSync        DateTime      @updatedAt
  
  // Relaties
  riderStats      RiderStats[]
  clubMembers     ClubMember[]
  events          Event[]
  
  @@map("clubs")
}

model ClubMember {
  id              Int           @id @default(autoincrement())
  clubId          Int
  zwiftId         Int
  
  // Basis info (15 attributen - niet alle 66!)
  name            String
  category        String?
  ftp             Float?
  ranking         Int?
  raceCount       Int           @default(0)
  
  // FAVORITE LINK (NIEUW)
  isFavorite      Boolean       @default(false)
  
  // Sync
  syncedAt        DateTime      @default(now())
  
  // Relaties
  club            Club          @relation(fields: [clubId], references: [id])
  
  @@unique([clubId, zwiftId])
  @@map("club_members")
  @@index([isFavorite])
}

model Event {
  id              Int           @id
  name            String
  eventDate       DateTime
  clubId          Int?
  
  // Metadata
  totalFinishers  Int           @default(0)
  
  // SOFT DELETE (NIEUW - net toegevoegd)
  deletedAt       DateTime?
  
  // Relaties
  club            Club?         @relation(fields: [clubId], references: [id])
  results         RaceResult[]
  
  @@map("events")
  @@index([eventDate])
  @@index([deletedAt])
}

model RaceResult {
  id              Int           @id @default(autoincrement())
  eventId         Int
  riderId         Int           // Zwift ID
  
  // Result data
  position        Int
  time            Int?          // seconden
  category        String?
  
  // Relaties
  event           Event         @relation(fields: [eventId], references: [id])
  
  @@unique([eventId, riderId])
  @@map("race_results")
  @@index([riderId])
}
```

---

## Implementatie Roadmap

### **Phase 1: Subteam Management** (Step 1-3)

**Prioriteit**: Hoog  
**Tijd**: 2-3 dagen

**Taken**:
1. ✅ Schema update met `FavoriteRider` model
2. ✅ Schema update met `RiderStats` model
3. ✅ Schema update Club.source veld
4. ✅ Migratie: `npx prisma migrate dev`
5. ⏳ Repository: `FavoriteRiderRepository` maken
6. ⏳ Repository: `RiderStatsRepository` maken
7. ⏳ Service: `SubteamService` met logica:
   - `addFavorites(zwiftIds[])`
   - `removeFavorite(zwiftId)`
   - `syncFavoriteStats()` → Calls Step 2
   - `extractClubs()` → Calls Step 3
8. ⏳ Routes: `/api/subteam/*` endpoints
9. ⏳ Frontend: GUI voor rider management

**Dependencies**: Geen

---

### **Phase 2: Club Roster Sync** (Step 4)

**Prioriteit**: Hoog  
**Tijd**: 1-2 dagen

**Taken**:
1. ✅ Schema update ClubMember.isFavorite veld
2. ✅ Migratie: `npx prisma migrate dev`
3. ⏳ Service: `ClubService.syncRoster(clubId)`
4. ⏳ Update `club_members` met `isFavorite` flag
5. ⏳ Scheduled sync: Elke 60 min voor alle tracked clubs
6. ⏳ Route: `POST /api/clubs/:clubId/sync`

**Dependencies**: Phase 1 (club extractie)

---

### **Phase 3: Forward Event Scanning** (Step 5)

**Prioriteit**: Medium  
**Tijd**: 2 dagen

**Taken**:
1. ✅ Schema update Event.deletedAt veld (DONE)
2. ✅ Migratie: `npx prisma migrate dev`
3. ⏳ Fix `scripts/forward-tracking.ts`:
   - Gebruik `FavoriteRider` + `ClubMember` als bron
   - Implementeer 100-day cleanup
4. ⏳ Service: `EventService.forwardScan()`
5. ⏳ Cron job: Daily 04:00
6. ⏳ Route: `POST /api/sync/forward` (handmatig)

**Dependencies**: Phase 2 (club members als bron)

---

### **Phase 4: Frontend Dashboard**

**Prioriteit**: Medium  
**Tijd**: 3-5 dagen

**Taken**:
1. ⏳ Next.js setup
2. ⏳ Subteam management UI
3. ⏳ Rider stats dashboard
4. ⏳ Club roster visualisatie
5. ⏳ Event calendar + results

**Dependencies**: Phases 1-3 (API endpoints)

---

## API Rate Limits - Samenvatting

| Endpoint | Rate Limit | Use Case |
|----------|------------|----------|
| `/public/riders/{id}` | 5/min | Step 2: Rider stats sync |
| `/public/clubs/{id}` | 1/60min | Step 4: Club roster sync |
| `/public/results/{eventId}` | 1/min | Step 5: Forward event scan |

**Daily API Budget**:
- Rider stats: 15 favorites × 1 req = 3 min
- Club rosters: 5 clubs × 1 req = 5 min (spread over hour)
- Event scan: 1000 events × 1 req = 1000 min (~17 uur)

**Totaal**: ~17 uur API tijd per dag (sustainable)

---

## Query Voorbeelden

### **Alle subteam riders met hun stats**:
```typescript
const subteam = await prisma.favoriteRider.findMany({
  include: {
    stats: {
      include: { club: true }
    }
  }
});
```

### **Alle clubs van subteam**:
```typescript
const clubs = await prisma.club.findMany({
  where: { source: 'favorite_rider' },
  include: {
    _count: { select: { clubMembers: true } }
  }
});
```

### **Alle club members (inclusief favorites)**:
```typescript
const allTracked = await prisma.clubMember.findMany({
  where: { club: { source: 'favorite_rider' } },
  include: { club: true },
  orderBy: { isFavorite: 'desc' }  // Favorites eerst
});
```

### **Recent events met subteam deelnemers**:
```typescript
const events = await prisma.event.findMany({
  where: {
    deletedAt: null,  // Niet gearchiveerd
    eventDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  },
  include: {
    results: {
      where: {
        riderId: { in: favoriteZwiftIds }
      }
    }
  }
});
```

---

## Volgende Stappen

1. **Schema wijzigingen doorvoeren** (FavoriteRider, RiderStats models)
2. **Migratie draaien** zonder data verlies
3. **Repositories implementeren** voor nieuwe modellen
4. **SubteamService bouwen** met Step 1-3 logica
5. **API endpoints** toevoegen
6. **Testen** met kleine dataset (5 favorites, 2 clubs)
7. **Forward scanning** herstructureren voor nieuwe data model

**Geschatte totale tijd**: 1-2 weken voor volledige implementatie

