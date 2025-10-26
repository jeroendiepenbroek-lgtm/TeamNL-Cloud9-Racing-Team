# Entity Relationship Diagram (ERD)

## Overzicht Database Architectuur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TeamNL Cloud9 Database Schema                        │
│                         Versie 2.0 - Optimized                          │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│     Club     │
├──────────────┤
│ PK  id       │───┐
│     name     │   │
│     country  │   │ 1:M
│     members  │   │
└──────────────┘   │
                   │
                   ├──> ┌───────────────┐        ┌─────────────┐
                   │    │     Rider     │        │    Event    │
                   │    ├───────────────┤        ├─────────────┤
                   └───<│ FK  clubId    │        │ PK  id      │
                        │ PK  id        │        │     name    │
                        │ UQ  zwiftId   │        │     date    │
                        │     name      │        │ FK  clubId  │
                        │     ftp       │        │     type    │
                        │     w/kg      │        └─────────────┘
                        │     ranking   │              │
                        │     category  │              │
                        └───────────────┘              │
                             │    │                    │
                    ┌────────┘    └────────┐           │
                    │ 1:M              1:M │           │
                    ▼                      ▼           │
          ┌──────────────────┐   ┌─────────────────┐  │
          │  RiderHistory    │   │ RiderStatistics │  │
          ├──────────────────┤   ├─────────────────┤  │
          │ PK  id           │   │ PK  id          │  │
          │ FK  riderId      │   │ FK  riderId UQ  │  │
          │     ftp          │   │     totalRaces  │  │
          │     ranking      │   │     totalWins   │  │
          │     recordedAt   │   │     avgPosition │  │
          └──────────────────┘   │     bestResult  │  │
                                 └─────────────────┘  │
                                                      │
                    ┌─────────────────────────────────┘
                    │ M:1                    1:M
                    ▼                        ▼
          ┌─────────────────────────────────────────┐
          │            RaceResult                    │
          ├─────────────────────────────────────────┤
          │ PK  id                                   │
          │ FK  riderId                              │
          │ FK  eventId                              │
          │ UQ  (eventId, riderId, source)          │
          │     position                             │
          │     time                                 │
          │     avgPower                             │
          │     avgWkg                               │
          │     points                               │
          │     flagged                              │
          └─────────────────────────────────────────┘

┌──────────────┐
│   SyncLog    │  (Independent - monitoring only)
├──────────────┤
│ PK  id       │
│     type     │
│     status   │
│     duration │
└──────────────┘
```

---

## Detailed Relationships

### 1. Club ↔ Rider (1:M)
**Relatie**: Een club heeft meerdere riders, een rider hoort bij maximaal één club

**Foreign Key**: `Rider.clubId → Club.id`

**Cascade Rules**:
- `onDelete: SetNull` - Als club wordt verwijderd, blijft rider bestaan (clubId = null)
- `onUpdate: Cascade` - Als club ID wijzigt, update riders automatisch

**Queries**:
```sql
-- Alle riders van een club
SELECT * FROM riders WHERE clubId = ? ORDER BY ranking;

-- Club met member count
SELECT c.*, COUNT(r.id) as actualMembers 
FROM clubs c 
LEFT JOIN riders r ON r.clubId = c.id 
GROUP BY c.id;
```

---

### 2. Rider ↔ RaceResult (1:M)
**Relatie**: Een rider heeft meerdere race resultaten

**Foreign Key**: `RaceResult.riderId → Rider.id`

**Cascade Rules**:
- `onDelete: Cascade` - Als rider wordt verwijderd, verwijder alle resultaten
- `onUpdate: Cascade` - Update resultaten bij rider ID wijziging

**Queries**:
```sql
-- Alle resultaten van een rider
SELECT * FROM race_results 
WHERE riderId = ? 
ORDER BY eventDate DESC 
LIMIT 20;

-- Rider performance summary
SELECT 
  r.name,
  COUNT(rr.id) as totalRaces,
  AVG(rr.position) as avgPosition,
  MIN(rr.position) as bestPosition,
  AVG(rr.averagePower) as avgPower
FROM riders r
JOIN race_results rr ON rr.riderId = r.id
WHERE r.id = ?
GROUP BY r.id;
```

---

### 3. Event ↔ RaceResult (1:M)
**Relatie**: Een event heeft meerdere resultaten (één per deelnemer)

**Foreign Key**: `RaceResult.eventId → Event.id`

**Cascade Rules**:
- `onDelete: Cascade` - Als event wordt verwijderd, verwijder alle resultaten
- `onUpdate: Cascade` - Update resultaten bij event ID wijziging

**Queries**:
```sql
-- Event leaderboard
SELECT 
  rr.position,
  r.name,
  r.categoryRacing,
  rr.time,
  rr.averagePower,
  rr.averageWkg
FROM race_results rr
JOIN riders r ON r.id = rr.riderId
WHERE rr.eventId = ?
ORDER BY rr.position;

-- Event statistics
SELECT 
  e.*,
  COUNT(rr.id) as finishers,
  AVG(rr.averagePower) as avgPower,
  MAX(rr.averagePower) as maxPower
FROM events e
LEFT JOIN race_results rr ON rr.eventId = e.id
WHERE e.id = ?
GROUP BY e.id;
```

---

### 4. Rider ↔ RiderHistory (1:M)
**Relatie**: Een rider heeft meerdere historische snapshots

**Foreign Key**: `RiderHistory.riderId → Rider.id`

**Cascade Rules**:
- `onDelete: Cascade` - Verwijder history bij rider verwijdering
- Geen updates nodig (history is immutable)

**Queries**:
```sql
-- FTP progressie over tijd
SELECT recordedAt, ftp, powerToWeight
FROM rider_history
WHERE riderId = ?
ORDER BY recordedAt;

-- Ranking trend
SELECT 
  DATE(recordedAt) as date,
  MIN(ranking) as bestRanking,
  AVG(ranking) as avgRanking
FROM rider_history
WHERE riderId = ? 
  AND recordedAt >= date('now', '-90 days')
GROUP BY DATE(recordedAt)
ORDER BY date;
```

---

### 5. Rider ↔ RiderStatistics (1:1)
**Relatie**: Een rider heeft één statistics record (pre-calculated aggregates)

**Foreign Key**: `RiderStatistics.riderId → Rider.id (UNIQUE)`

**Cascade Rules**:
- `onDelete: Cascade` - Verwijder statistics bij rider verwijdering
- Auto-calculated, wordt periodiek ge-update

**Queries**:
```sql
-- Rider met statistics
SELECT 
  r.*,
  rs.totalRaces,
  rs.totalWins,
  rs.avgPosition,
  rs.recent30dWins
FROM riders r
LEFT JOIN rider_statistics rs ON rs.riderId = r.id
WHERE r.id = ?;

-- Top performers (using pre-calculated stats)
SELECT 
  r.name,
  rs.totalWins,
  rs.totalPodiums,
  rs.avgPosition
FROM riders r
JOIN rider_statistics rs ON rs.riderId = r.id
WHERE r.clubId = ?
ORDER BY rs.totalWins DESC
LIMIT 10;
```

---

### 6. Club ↔ Event (1:M)
**Relatie**: Een club organiseert meerdere events

**Foreign Key**: `Event.clubId → Club.id`

**Cascade Rules**:
- `onDelete: SetNull` - Event blijft bestaan zonder club
- Optioneel - niet alle events hebben een organizing club

**Queries**:
```sql
-- Club events
SELECT * FROM events
WHERE clubId = ?
ORDER BY eventDate DESC;

-- Upcoming club events
SELECT * FROM events
WHERE clubId = ? 
  AND eventDate > datetime('now')
ORDER BY eventDate;
```

---

## Composite Keys & Unique Constraints

### RaceResult Unique Constraint
**Constraint**: `UNIQUE(eventId, riderId, source)`

**Reden**: 
- Eén rider kan maar één result hebben per event per bron
- Verschillende bronnen (zwiftranking vs zwiftpower) kunnen verschillende data hebben
- Voorkomt duplicate resultaten

**Voorbeeld**:
```sql
-- ✅ Toegestaan
INSERT INTO race_results (eventId, riderId, source) 
VALUES (123, 456, 'zwiftranking');

INSERT INTO race_results (eventId, riderId, source) 
VALUES (123, 456, 'zwiftpower');

-- ❌ Geweigerd (duplicate)
INSERT INTO race_results (eventId, riderId, source) 
VALUES (123, 456, 'zwiftranking');
```

---

## Indexes Overview

### Primary Keys (Clustered Indexes)
- `Club.id`
- `Rider.id`
- `Event.id`
- `RaceResult.id`
- `RiderHistory.id`
- `RiderStatistics.id`
- `SyncLog.id`

### Unique Indexes
- `Rider.zwiftId` - Zwift platform ID is uniek
- `RiderStatistics.riderId` - Eén stats record per rider
- `RaceResult(eventId, riderId, source)` - Composite unique

### Foreign Key Indexes (Auto-created)
- `Rider.clubId`
- `Event.clubId`
- `RaceResult.riderId`
- `RaceResult.eventId`
- `RiderHistory.riderId`
- `RiderStatistics.riderId`

### Query Optimization Indexes

#### Leaderboards & Rankings
```prisma
@@index([clubId, ranking])      // Club leaderboard
@@index([ranking])               // Global leaderboard
@@index([categoryRacing])        // Per-category rankings
@@index([powerToWeight])         // W/kg rankings
```

#### Event & Results
```prisma
@@index([eventId, position])     // Event leaderboard
@@index([riderId, eventId])      // Rider's results lookup
@@index([position])              // Overall position queries
@@index([category])              // Category-specific results
```

#### Time-based Queries
```prisma
@@index([eventDate])             // Events by date
@@index([lastActive])            // Active riders
@@index([recordedAt])            // Historical trends
@@index([createdAt])             // Sync logs timeline
```

#### Filtering & Search
```prisma
@@index([isActive])              // Active/inactive riders
@@index([countryCode])           // By country
@@index([flagged])               // Flagged results
@@index([status])                // Sync status
```

---

## Data Integrity Rules

### NOT NULL Constraints
**Rider**:
- `zwiftId` - Altijd vereist
- `name` - Altijd vereist
- `id` - Auto-increment PK

**Event**:
- `id` - Vereist (van API)
- `name` - Vereist
- `eventDate` - Vereist

**RaceResult**:
- `eventId`, `riderId` - Vereist (FKs)
- Andere velden optioneel (afhankelijk van data availability)

### CHECK Constraints (Application Level)
```typescript
// Zod validation in application layer
- ftp > 0
- powerToWeight >= 0 && <= 10.0
- weight > 0 && < 200
- height > 0 && < 250
- ranking > 0
- position >= 1
- categoryRacing in ['A','B','C','D','E']
```

---

## Referential Integrity

### Cascade Delete Chains

**Scenario: Rider wordt verwijderd**
```
Rider (deleted)
  ├─> RaceResult (CASCADE DELETE)
  ├─> RiderHistory (CASCADE DELETE)
  └─> RiderStatistics (CASCADE DELETE)
```

**Scenario: Club wordt verwijderd**
```
Club (deleted)
  ├─> Rider.clubId (SET NULL) - Riders blijven bestaan
  └─> Event.clubId (SET NULL) - Events blijven bestaan
```

**Scenario: Event wordt verwijderd**
```
Event (deleted)
  └─> RaceResult (CASCADE DELETE) - Alle resultaten verwijderd
```

### Orphan Prevention
- Rider kan bestaan zonder club (clubId = NULL)
- Event kan bestaan zonder club (clubId = NULL)
- RaceResult kan NIET bestaan zonder Rider of Event (CASCADE DELETE)
- RiderHistory kan NIET bestaan zonder Rider (CASCADE DELETE)

---

## Query Performance Guidelines

### ✅ Efficient Queries (Using Indexes)

```sql
-- Gebruikt index: (clubId, ranking)
SELECT * FROM riders 
WHERE clubId = 11818 
ORDER BY ranking LIMIT 10;

-- Gebruikt index: (eventId, position)
SELECT * FROM race_results 
WHERE eventId = 123 
ORDER BY position;

-- Gebruikt index: (riderId, recordedAt)
SELECT * FROM rider_history 
WHERE riderId = 456 
  AND recordedAt > '2025-01-01'
ORDER BY recordedAt DESC;
```

### ❌ Inefficient Queries (Full Table Scan)

```sql
-- Geen index op name (full scan)
SELECT * FROM riders WHERE name LIKE '%John%';

-- Functie op indexed column (index niet gebruikt)
SELECT * FROM riders WHERE LOWER(countryCode) = 'nl';

-- OR condition over niet-indexed fields
SELECT * FROM riders WHERE age > 30 OR weight < 70;
```

### 🎯 Optimization Tips

1. **Altijd** filter op indexed columns waar mogelijk
2. **Vermijd** functies op indexed columns in WHERE clause
3. **Gebruik** EXPLAIN QUERY PLAN om indexes te verifiëren
4. **Limiteer** resultaten met LIMIT/OFFSET voor paginatie
5. **Pre-calculate** aggregates in RiderStatistics table
