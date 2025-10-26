# Relatietabel - Database Tabellen & API Endpoints

## 📊 Database Relatie Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLUBS (clubs)                               │
│  PK: id (int)                                                       │
│  - name, description, memberCount, countryCode                      │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      │ 1:M (één club heeft meerdere riders)
                      │
┌─────────────────────▼───────────────────────────────────────────────┐
│                        RIDERS (riders)                              │
│  PK: id (int, auto)                                                 │
│  UK: zwiftId (int, unique)                                          │
│  FK: clubId → clubs.id                                              │
│  - name, ftp, weight, height, gender, categoryRacing               │
│  - totalRaces, totalWins, totalPodiums                              │
│  - 40+ velden totaal                                                │
└─┬────────────────┬────────────────┬─────────────────┬───────────────┘
  │                │                │                 │
  │ 1:M            │ 1:M            │ 1:1             │ 1:M
  │                │                │                 │
  ▼                ▼                ▼                 ▼
┌─────────────┐ ┌──────────────┐ ┌────────────────┐ ┌──────────────┐
│ RACE        │ │ RIDER        │ │ RIDER          │ │ SYNC         │
│ RESULTS     │ │ HISTORY      │ │ STATISTICS     │ │ LOGS         │
│             │ │              │ │                │ │              │
│ race_       │ │ rider_       │ │ rider_         │ │ sync_logs    │
│ results     │ │ history      │ │ statistics     │ │              │
└──┬──────────┘ └──────────────┘ └────────────────┘ └──────────────┘
   │
   │ M:1 (veel results naar één event)
   │
   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         EVENTS (events)                              │
│  PK: id (int)                                                        │
│  - name, eventDate, routeName, distance, elevation                   │
│  - eventType, categories, seriesName                                 │
└──────────────────────────────────────────────────────────────────────┘
```

## 🔗 Relatie Details

### 1. **Club → Riders** (1:M)
```typescript
// Database
Club.members → Rider[]
Rider.club → Club
Rider.clubId → Club.id (FK)

// API Endpoint
GET /api/club              // Club + alle members
GET /api/club/members      // Alleen members lijst
```

**Use case**: Haal alle riders van een club op
```sql
SELECT * FROM riders WHERE clubId = 2281;
```

---

### 2. **Rider → RaceResults** (1:M)
```typescript
// Database
Rider.raceResults → RaceResult[]
RaceResult.rider → Rider
RaceResult.riderId → Rider.id (FK)

// API Endpoints
GET /api/riders/:zwiftId/results    // Rider's race results
GET /api/club/results               // Alle club results
```

**Use case**: Haal alle race resultaten van een rider op
```sql
SELECT rr.*, e.name as eventName, e.eventDate 
FROM race_results rr
JOIN events e ON rr.eventId = e.id
WHERE rr.riderId = 2
ORDER BY e.eventDate DESC;
```

---

### 3. **Event → RaceResults** (1:M)
```typescript
// Database
Event.results → RaceResult[]
RaceResult.event → Event
RaceResult.eventId → Event.id (FK)

// API Endpoint
GET /api/results/:eventId    // Alle results van een event
```

**Use case**: Haal alle deelnemers en resultaten van een event op
```sql
SELECT rr.*, r.name as riderName, r.categoryRacing
FROM race_results rr
JOIN riders r ON rr.riderId = r.id
WHERE rr.eventId = 123456
ORDER BY rr.position;
```

---

### 4. **Rider → RiderHistory** (1:M)
```typescript
// Database
Rider.historicalData → RiderHistory[]
RiderHistory.rider → Rider
RiderHistory.riderId → Rider.id (FK)

// API Endpoint
GET /api/riders/:zwiftId/history?days=90
```

**Use case**: Bekijk hoe FTP en gewicht over tijd veranderd zijn
```sql
SELECT recordedAt, ftp, weight, ranking
FROM rider_history
WHERE riderId = 2
ORDER BY recordedAt DESC;
```

---

### 5. **Rider → RiderStatistics** (1:1)
```typescript
// Database
Rider.statistics → RiderStatistics | null
RiderStatistics.rider → Rider
RiderStatistics.riderId → Rider.id (FK, UNIQUE)

// API Endpoint
GET /api/riders/:zwiftId    // Inclusief statistics
```

**Use case**: Pre-calculated aggregates voor snelle queries
```sql
SELECT r.name, rs.totalRaces, rs.totalWins, rs.avgPosition
FROM riders r
LEFT JOIN rider_statistics rs ON r.id = rs.riderId
WHERE r.clubId = 2281;
```

---

### 6. **Club → SyncLogs** (1:M - indirect via targetId)
```typescript
// Database
SyncLog.targetId → Club.id (optioneel)
Geen directe relatie, maar logisch gekoppeld

// API Endpoints
GET /api/sync/logs          // Alle sync logs
GET /api/sync/stats         // Sync statistieken
```

**Use case**: Monitor sync geschiedenis
```sql
SELECT syncType, status, recordsProcessed, duration, startedAt
FROM sync_logs
WHERE syncType = 'club' AND targetId = 2281
ORDER BY startedAt DESC;
```

---

## 🎯 Composite Relatie: Rider met Alles

### Via API Endpoint
```bash
GET /api/riders/150437
```

### Database Query (met alle relaties)
```sql
-- Rider basis info
SELECT * FROM riders WHERE zwiftId = 150437;

-- + Club info
SELECT c.* FROM clubs c 
JOIN riders r ON r.clubId = c.id 
WHERE r.zwiftId = 150437;

-- + Race results met events
SELECT rr.*, e.name, e.eventDate, e.routeName
FROM race_results rr
JOIN events e ON rr.eventId = e.id
JOIN riders r ON rr.riderId = r.id
WHERE r.zwiftId = 150437
ORDER BY e.eventDate DESC;

-- + Historical data
SELECT * FROM rider_history
WHERE riderId = (SELECT id FROM riders WHERE zwiftId = 150437)
ORDER BY recordedAt DESC;

-- + Statistics
SELECT * FROM rider_statistics
WHERE riderId = (SELECT id FROM riders WHERE zwiftId = 150437);
```

### Via Prisma (1 query met includes)
```typescript
const completeProfile = await prisma.rider.findUnique({
  where: { zwiftId: 150437 },
  include: {
    club: true,                    // 🏆 Club relatie
    raceResults: {                 // 🏁 Race results relatie
      include: { event: true }     //    └─ Event details
    },
    historicalData: true,          // 📈 History relatie
    statistics: true,              // 📊 Statistics relatie
  }
});
```

---

## 📋 Relatie Matrix

| Van Tabel | Naar Tabel | Type | Foreign Key | Cascade |
|-----------|------------|------|-------------|---------|
| **Club** | Rider | 1:M | Rider.clubId | SET NULL |
| **Rider** | RaceResult | 1:M | RaceResult.riderId | CASCADE |
| **Rider** | RiderHistory | 1:M | RiderHistory.riderId | CASCADE |
| **Rider** | RiderStatistics | 1:1 | RiderStatistics.riderId | CASCADE |
| **Event** | RaceResult | 1:M | RaceResult.eventId | CASCADE |
| (logisch) | SyncLog | 1:M | SyncLog.targetId | - |

**Cascade betekent:**
- `CASCADE` - Als parent wordt verwijderd, worden children ook verwijderd
- `SET NULL` - Als parent wordt verwijderd, wordt FK op NULL gezet

---

## 🔍 Unique Constraints & Composite Keys

### Unique Constraints
```sql
-- Rider kan maar 1x voorkomen
riders.zwiftId UNIQUE

-- Statistics 1:1 relatie
rider_statistics.riderId UNIQUE

-- Race result uniek per event + rider + source
race_results(eventId, riderId, source) UNIQUE
```

### Voorbeelden

**1. Haal rider op met zwiftId (via unique key)**
```sql
SELECT * FROM riders WHERE zwiftId = 150437;
```

**2. Voorkom duplicate race results**
```sql
-- Dit faalt als al exists
INSERT INTO race_results (eventId, riderId, source, position)
VALUES (123456, 2, 'zwiftranking', 15);
-- Error: UNIQUE constraint failed
```

**3. Upsert pattern (update of insert)**
```sql
INSERT INTO race_results (eventId, riderId, source, position)
VALUES (123456, 2, 'zwiftranking', 15)
ON CONFLICT(eventId, riderId, source) 
DO UPDATE SET position = excluded.position;
```

---

## 🌐 API Endpoints → Database Mappings

### Club Endpoints
| Endpoint | Tabellen | Relaties |
|----------|----------|----------|
| `GET /api/club` | clubs, riders | Club → Riders (include) |
| `GET /api/club/members` | riders | Filter op clubId |
| `GET /api/club/results` | race_results, riders, events | Rider → RaceResults → Events |

### Rider Endpoints
| Endpoint | Tabellen | Relaties |
|----------|----------|----------|
| `GET /api/riders/:zwiftId` | riders, clubs, race_results, rider_statistics | Rider + alle relaties |
| `GET /api/riders/:zwiftId/history` | rider_history, riders | Rider → History |
| `GET /api/riders/:zwiftId/results` | race_results, riders, events | Rider → Results → Events |

### Results Endpoints
| Endpoint | Tabellen | Relaties |
|----------|----------|----------|
| `GET /api/results/:eventId` | race_results, events, riders | Event → Results → Riders |

### Sync Endpoints
| Endpoint | Tabellen | Relaties |
|----------|----------|----------|
| `POST /api/sync/club` | clubs, riders | Sync naar Club + Riders |
| `POST /api/sync/event/:eventId` | events, race_results | Sync naar Event + Results |
| `GET /api/sync/logs` | sync_logs | Standalone tabel |

---

## 💡 Query Voorbeelden Met Relaties

### 1. Top 10 Riders van een Club
```sql
SELECT 
  r.name,
  r.ftp,
  r.ftpWkg,
  r.totalWins,
  c.name as clubName
FROM riders r
JOIN clubs c ON r.clubId = c.id
WHERE c.id = 2281
ORDER BY r.ranking ASC
LIMIT 10;
```

### 2. Rider Performance Over Tijd
```sql
SELECT 
  rh.recordedAt,
  rh.ftp,
  rh.weight,
  rh.ranking,
  r.name
FROM rider_history rh
JOIN riders r ON rh.riderId = r.id
WHERE r.zwiftId = 150437
ORDER BY rh.recordedAt ASC;
```

### 3. Event Leaderboard Met Rider Details
```sql
SELECT 
  rr.position,
  r.name,
  r.categoryRacing,
  rr.averagePower,
  rr.averageWkg,
  rr.time,
  e.name as eventName
FROM race_results rr
JOIN riders r ON rr.riderId = r.id
JOIN events e ON rr.eventId = e.id
WHERE e.id = 123456
ORDER BY rr.position ASC;
```

### 4. Club Member Stats Met Recent Results
```sql
SELECT 
  r.name,
  r.ftp,
  r.totalRaces,
  r.totalWins,
  COUNT(rr.id) as recentRaces,
  MAX(e.eventDate) as lastRace
FROM riders r
LEFT JOIN race_results rr ON rr.riderId = r.id
LEFT JOIN events e ON rr.eventId = e.id
  AND e.eventDate > datetime('now', '-30 days')
WHERE r.clubId = 2281
GROUP BY r.id
ORDER BY r.ranking ASC;
```

### 5. Complete Rider Profile (alles)
```sql
-- Rider basis
SELECT * FROM riders WHERE zwiftId = 150437;

-- Met club
SELECT r.*, c.name as clubName, c.memberCount
FROM riders r
LEFT JOIN clubs c ON r.clubId = c.id
WHERE r.zwiftId = 150437;

-- Met statistics
SELECT r.*, rs.*
FROM riders r
LEFT JOIN rider_statistics rs ON rs.riderId = r.id
WHERE r.zwiftId = 150437;

-- Met laatste 5 races
SELECT r.name, rr.*, e.name as eventName, e.eventDate
FROM riders r
JOIN race_results rr ON rr.riderId = r.id
JOIN events e ON rr.eventId = e.id
WHERE r.zwiftId = 150437
ORDER BY e.eventDate DESC
LIMIT 5;
```

---

## 🎯 Samenvatting

**Kern Relaties:**
1. **Club ← Rider** - Een club heeft meerdere riders
2. **Rider → RaceResult** - Een rider heeft meerdere race results
3. **Event → RaceResult** - Een event heeft meerdere results
4. **Rider → RiderHistory** - Een rider heeft meerdere snapshots
5. **Rider ↔ RiderStatistics** - Één-op-één relatie voor aggregates

**Via API:**
- Alle endpoints gebruiken deze relaties automatisch
- Prisma `include` zorgt voor eager loading
- Foreign keys garanderen data integriteit
- Cascade rules zorgen voor consistente deletes

**Query Performance:**
- 20+ indexes op foreign keys en vaak gebruikte velden
- Composite unique constraints voorkomen duplicates
- Pre-calculated statistics tabel voor snelle aggregates
