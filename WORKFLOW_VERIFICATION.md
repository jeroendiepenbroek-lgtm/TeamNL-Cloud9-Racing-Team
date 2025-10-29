# Workflow Verificatie - Alle Elementen Checklist

## ✅ Element 1: GUI voor Subteam (Favorieten) Uploaden/Verwijderen via Zwift ID

### Implementatie:
- **Bestand**: `public/favorites-manager.html`
- **Upload functionaliteit**:
  - ✅ Bulk upload via TXT bestand (met drag & drop)
  - ✅ Handmatig toevoegen via input veld
  - ✅ API endpoint: `POST /api/subteam/riders`
- **Verwijder functionaliteit**:
  - ✅ Delete knop per rider in de tabel
  - ✅ API endpoint: `DELETE /api/subteam/riders/:zwiftId`
- **Lijst weergave**:
  - ✅ Tabel met alle favorites
  - ✅ Real-time updates na toevoegen/verwijderen
  - ✅ API endpoint: `GET /api/subteam/riders`

### Code locaties:
```
public/favorites-manager.html    → GUI interface
src/api/routes.ts                → API endpoints (lines 207-260)
src/services/subteam.ts          → Business logic (addFavorites, removeFavorite)
```

---

## ✅ Element 2: Rider Stats Vastleggen in Datastore

### Implementatie:
- **Tabel**: `riders` in SQLite database
- **Service**: `SubteamService.syncFavoriteStats()`
- **Trigger**: 
  - ✅ Handmatig via GUI knop "Sync All Stats"
  - ✅ Handmatig via API: `POST /api/subteam/sync`
  - ✅ Automatisch via scheduler (elke 6 uur)
  - ✅ CLI: `npm run sync`

### Opgeslagen data per rider:
```typescript
{
  zwiftId: number,
  name: string,
  categoryRacing: string,      // A+, A, B, C, D
  ftp: number,                  // Functional Threshold Power
  ftpWkg: number,               // FTP per kg
  powerToWeight: number,
  power5s, power15s, power30s, power1min, power2min, power5min, power20min,
  powerWkg5s, powerWkg15s, powerWkg30s, powerWkg1min, powerWkg2min, powerWkg5min, powerWkg20min,
  criticalPower: number,
  anaerobicWork: number,
  compoundScore: number,
  powerRating: number,
  gender: string,
  age: number,
  countryCode: string,
  weight: number,
  height: number,
  totalWins: number,
  totalPodiums: number,
  totalRaces: number,
  totalDnfs: number,
  handicapFlat, handicapRolling, handicapHilly, handicapMountainous,
  ranking: number,
  rankingScore: number,
  lastRaceDate: Date,
  clubId: number,               // Link naar club
  isFavorite: boolean,          // TRUE voor subteam
  isActive: boolean,
  lastSynced: Date
}
```

### Code locaties:
```
prisma/schema.prisma             → Database schema (model Rider)
src/services/subteam.ts          → syncFavoriteStats() method
src/database/repositories.ts     → RiderRepository.upsertRider()
src/api/routes.ts                → POST /api/subteam/sync
```

---

## ✅ Element 3: ClubID's in Aparte Tabel Vastleggen

### Implementatie:
- **Tabel**: `clubs` in SQLite database
- **Automatische extractie**: Bij sync van rider stats
- **Service**: `SubteamService.extractClub()` (private method)

### Opgeslagen data per club:
```typescript
{
  id: number,                   // Club ID van ZwiftRacing
  name: string,
  source: string,               // 'favorite_rider' = geëxtraheerd uit favorite
  memberCount: number,
  lastSynced: Date
}
```

### Workflow:
1. User upload Zwift ID → riders tabel (isFavorite = TRUE)
2. Sync rider stats → haalt rider data op (inclusief clubId)
3. **Automatisch**: `extractClub()` wordt aangeroepen
4. Club wordt opgeslagen in `clubs` tabel met `source = 'favorite_rider'`

### Code locaties:
```
prisma/schema.prisma             → Database schema (model Club)
src/services/subteam.ts          → extractClub() method (line 163)
src/database/repositories.ts     → ClubRepository.upsertClub()
```

---

## ✅ Element 4: Aparte Tabel voor ALLE Club Riders (ook non-favorites)

### Implementatie:
- **Tabel**: `club_members` in SQLite database
- **Service**: `ClubService.syncAllClubRosters()`
- **Trigger**:
  - ✅ Handmatig via GUI knop "Sync Club Rosters" (in end-to-end test)
  - ✅ Handmatig via API: `POST /api/clubs/sync`
  - ✅ Automatisch via scheduler (elke 12 uur)
  - ✅ Per club: `POST /api/clubs/:clubId/sync`

### Workflow (Step 4):
1. Haal alle clubs op met `source = 'favorite_rider'`
2. Voor elke club:
   - API call naar `/public/clubs/:clubId` (rate limit: 1/60min)
   - Bulk upsert alle club members naar `club_members` tabel
   - Update `isFavorite` field (TRUE als ook in favorites)
   - Wacht 61 minuten voor volgende club
3. Result: Complete club rosters in database

### Opgeslagen data per club member:
```typescript
{
  id: number,
  zwiftId: number,
  name: string,
  clubId: number,               // Link naar club
  isFavorite: boolean,          // TRUE = ook in subteam
  categoryRacing: string,
  ftp, ftpWkg, power metrics,   // Alle rider stats
  // ... exact dezelfde velden als riders tabel
}
```

### Verschil met `riders` tabel:
- **`riders`**: Alleen subteam favorites (isFavorite = TRUE)
- **`club_members`**: ALLE club members (ook non-favorites)
  - isFavorite = TRUE → ook in subteam
  - isFavorite = FALSE → alleen club member

### Code locaties:
```
prisma/schema.prisma             → Database schema (model ClubMember)
src/services/club.ts             → ClubService (230 lines)
src/database/repositories.ts     → ClubMemberRepository.upsertClubMembersBulk()
src/api/routes.ts                → Club sync endpoints (lines 389-470)
```

---

## ✅ Element 5: Forward Scanning op Events met Subteam + Club Riders

### Implementatie:
- **Tabel**: `events` + `race_results` in SQLite database
- **Service**: `EventService.forwardScan()`
- **Trigger**:
  - ✅ Handmatig via GUI knop "Forward Scan" (in end-to-end test)
  - ✅ Handmatig via API: `POST /api/sync/forward`
  - ✅ Automatisch via scheduler (elke 6 uur)
  - ✅ CLI: `npm run sync:forward`

### Workflow (Step 5):
1. **Verzamel tracked riders**:
   ```typescript
   - Alle favorites: riders WHERE isFavorite = TRUE
   - Alle club members: club_members (isFavorite = TRUE OR FALSE)
   - Totaal: UNION van beide sets
   ```
2. **Scan events**:
   - Start bij laatste gescande event ID (+1)
   - Voor elke event:
     - API call naar `/public/events/:eventId` (rate limit: 1/min)
     - Check of er tracked riders in results zitten
     - JA → Save event + alle results naar database
     - NEE → Skip event
     - Wacht 61 seconden voor volgende event
3. **Cleanup**:
   - Soft delete events > 100 dagen oud
   - Hard delete race results van gearchiveerde events

### Opgeslagen data:
```typescript
// Events tabel
{
  id: number,                   // Event ID van ZwiftRacing
  name: string,
  eventDate: Date,
  mapName: string,
  distanceKm: number,
  laps: number,
  categoryLabel: string,
  totalEntrants: number,
  sourceType: string,           // 'forward_scan'
  deletedAt: Date | null,       // Soft delete na 100 dagen
}

// Race Results tabel (per rider per event)
{
  id: number,
  eventId: number,              // Link naar event
  clubMemberId: number,         // Link naar club_member
  zwiftId: number,
  riderName: string,
  position: number,
  time: number,                 // Finish tijd in seconden
  wkg: number,
  avgPower: number,
  teamName: string,
  categoryLabel: string,
  flagCode: string,
}
```

### Tracked riders logica:
```sql
-- Ophalen tracked riders (simplified)
SELECT DISTINCT zwiftId FROM (
  SELECT zwiftId FROM riders WHERE isFavorite = TRUE
  UNION
  SELECT zwiftId FROM club_members
) AS tracked_riders;
```

### Code locaties:
```
prisma/schema.prisma             → Database schema (Event, RaceResult)
src/services/event.ts            → EventService.forwardScan()
src/database/repositories.ts     → EventRepository, RaceResultRepository
src/api/routes.ts                → POST /api/sync/forward (lines 338-358)
```

---

## 🔄 Complete Workflow Overzicht

```
┌─────────────────────────────────────────────────────────────┐
│ 1. GUI: Upload Zwift IDs (TXT of handmatig)                │
│    → riders tabel (isFavorite = TRUE)                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Sync Rider Stats (handmatig of scheduler)               │
│    → Update riders tabel met alle stats                     │
│    → Automatisch: extractClub()                             │
│    → clubs tabel (source = 'favorite_rider')                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Sync Club Rosters (handmatig of scheduler)              │
│    → Haal alle members op per club (1/60min rate limit)    │
│    → club_members tabel (ALLE members, niet alleen favorites)│
│    → Update isFavorite field (link met riders)              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Forward Scan (handmatig of scheduler)                   │
│    → Tracked riders = riders + club_members                 │
│    → Scan events vanaf laatste ID                           │
│    → Save events waar tracked riders in zitten              │
│    → events + race_results tabellen                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema Overzicht

```
riders                  → Subteam favorites (isFavorite = TRUE)
  ├─ zwiftId (PK)
  ├─ isFavorite = TRUE
  ├─ clubId (FK → clubs)
  └─ alle rider stats

clubs                   → Clubs van favorites
  ├─ id (PK)
  ├─ name
  └─ source = 'favorite_rider'

club_members            → ALLE club riders (ook non-favorites)
  ├─ id (PK)
  ├─ zwiftId
  ├─ clubId (FK → clubs)
  ├─ isFavorite (TRUE = ook in subteam, FALSE = alleen club)
  └─ alle rider stats

events                  → Events met tracked riders
  ├─ id (PK)
  ├─ name, date, map
  └─ sourceType = 'forward_scan'

race_results            → Race results per rider per event
  ├─ id (PK)
  ├─ eventId (FK → events)
  ├─ clubMemberId (FK → club_members)
  └─ position, time, power, etc.
```

---

## ✅ Verificatie Checklist

### Element 1: GUI Subteam Upload/Verwijderen
- [x] TXT bestand upload
- [x] Handmatig toevoegen via input
- [x] Delete functionaliteit
- [x] Lijst weergave
- [x] Real-time updates

### Element 2: Rider Stats Vastleggen
- [x] API integratie met ZwiftRacing
- [x] Opslag in `riders` tabel
- [x] Alle stats velden (FTP, power, handicaps, race history)
- [x] Handmatige trigger
- [x] Automatische scheduler

### Element 3: ClubID's in Aparte Tabel
- [x] `clubs` tabel
- [x] Automatische extractie bij rider sync
- [x] Source tracking ('favorite_rider')

### Element 4: ALLE Club Riders Tabel
- [x] `club_members` tabel
- [x] Bulk sync per club
- [x] isFavorite linking
- [x] Rate limiting (61 min tussen clubs)
- [x] Handmatige trigger per club of alle clubs
- [x] Automatische scheduler

### Element 5: Forward Scanning
- [x] Tracked riders = favorites + club members
- [x] Event scanning met rate limiting
- [x] Opslag in `events` + `race_results`
- [x] 100 dagen retention
- [x] Handmatige trigger
- [x] Automatische scheduler

---

## 🎯 Conclusie

**Alle 5 elementen zijn correct geïmplementeerd!**

- ✅ GUI voor subteam management
- ✅ Rider stats in datastore
- ✅ ClubID's in aparte tabel
- ✅ Alle club riders in aparte tabel (ook non-favorites)
- ✅ Forward scanning op tracked riders (subteam + clubs)

### Test Commando:
```bash
npm run test:e2e
```

Dit test nu de complete workflow met 3 bestaande riders uit de database.
