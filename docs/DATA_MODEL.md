# ZwiftRacing API Data Model

## API Endpoints & Response Structure

Gebaseerd op ZwiftRacing.app Public API documentatie.

### 1. Clubs API

#### GET /public/clubs/:id
**Response**: Array van rider objecten

**Fields per rider:**
```typescript
{
  riderId: number;           // Unieke Zwift ID
  name: string;              // Rider naam
  
  // Racing categorieën
  categoryRacing: string;    // Categorie: "A", "B", "C", "D", "E"
  
  // Power metrics
  ftp: number;              // Functional Threshold Power (watts)
  powerToWeight: number;    // W/kg ratio
  
  // Ranking
  ranking: number;          // Global ranking positie
  rankingScore: number;     // Ranking score
  
  // Profiel
  countryCode: string;      // Land code (bijv. "NL", "BE")
  age: number;              // Leeftijd
  weight: number;           // Gewicht in kg
  height: number;           // Lengte in cm
  gender: string;           // "M" of "F"
  
  // Meta
  profileImageUrl: string;  // Avatar URL
  lastActive: string;       // ISO timestamp
}
```

### 2. Riders API

#### GET /public/riders/:riderId
**Response**: Single rider object (zelfde structuur als clubs)

Plus mogelijk extra velden:
```typescript
{
  // Alle club fields +
  totalEvents: number;           // Aantal events
  totalWins: number;            // Aantal overwinningen
  podiums: number;              // Aantal podium plaatsen
  avgPosition: number;          // Gemiddelde positie
  
  // Historical data
  ftpHistory: Array<{
    date: string;
    ftp: number;
  }>;
  
  rankingHistory: Array<{
    date: string;
    ranking: number;
  }>;
}
```

#### POST /public/riders
**Body**: Array van rider IDs
**Response**: Array van rider objecten

### 3. Results API

#### GET /public/results/:eventId
**Response**: Array van result objecten

```typescript
{
  eventId: number;              // Event ID
  eventName: string;            // Event naam
  eventDate: string;            // ISO timestamp
  eventType: string;            // "race", "workout", etc.
  routeName: string;            // Route naam
  
  // Per rider in results array
  riderId: number;
  name: string;
  position: number;             // Finish positie
  category: string;             // Race categorie
  
  // Performance
  time: number;                 // Tijd in seconden
  distance: number;             // Afstand in meters
  averagePower: number;         // Gemiddeld vermogen (watts)
  normalizedPower: number;      // Normalized power
  averageWkg: number;           // Gemiddeld W/kg
  averageHeartRate: number;     // Gemiddelde hartslag
  maxHeartRate: number;         // Max hartslag
  averageCadence: number;       // Gemiddelde cadans
  
  // Zwift specifiek
  zPower: number;               // Zwift calculated power
  flagged: boolean;             // Geflagged voor cheating
  disqualified: boolean;        // Gediskwalificeerd
  
  // Points & rewards
  points: number;               // Event points
  primePoints: number;          // Sprint/KOM points
}
```

#### GET /public/zp/:eventId/results
**Response**: ZwiftPower resultaten (vergelijkbare structuur)

---

## Data Relationships

```
Club (1) ─────< (M) Rider
                    │
                    ├──< (M) RaceResult
                    ├──< (M) RiderHistory (snapshots)
                    └──< (M) RiderStatistics
                    
Event (1) ─────< (M) RaceResult
```

## Business Rules

1. **Rider** kan lid zijn van 0..1 **Club**
2. **Rider** kan meerdere **RaceResults** hebben
3. **Event** heeft meerdere **RaceResults** (één per deelnemer)
4. **RiderHistory** slaat periodieke snapshots op voor trend analysis
5. **SyncLog** is onafhankelijk, gebruikt voor monitoring

---

## Data Types & Constraints

### Rider
- `riderId` (PK): Uniek, niet-null
- `name`: Niet-null, max 255 chars
- `categoryRacing`: Enum ["A", "B", "C", "D", "E"]
- `ftp`: Positief getal, > 0
- `powerToWeight`: Positief, > 0, max 10.0
- `ranking`: Positief geheel getal
- `countryCode`: ISO 3166-1 alpha-2 (2 chars)
- `gender`: Enum ["M", "F", "Other"]

### RaceResult
- Composite unique: (eventId, riderId, source)
- `position`: Positief geheel getal, >= 1
- `time`: Positief, in seconden
- `averagePower`: >= 0
- `flagged`: Boolean, default false

### Event
- `eventId` (PK): Uniek
- `eventDate`: Timestamp
- `eventType`: Enum ["race", "group_ride", "workout"]

---

## Indexing Strategy

### Primary Indexes
- `Rider.riderId` (PK)
- `Club.id` (PK)
- `RaceResult.id` (PK)
- `Event.id` (PK)

### Foreign Key Indexes
- `Rider.clubId` (FK → Club.id)
- `RaceResult.riderId` (FK → Rider.riderId)
- `RaceResult.eventId` (FK → Event.id)
- `RiderHistory.riderId` (FK → Rider.riderId)

### Query Optimization Indexes
- `Rider(clubId, ranking)` - Voor club leaderboards
- `RaceResult(eventId, position)` - Voor event resultaten
- `RaceResult(riderId, eventDate DESC)` - Voor rider resultaten history
- `RiderHistory(riderId, recordedAt DESC)` - Voor trends
- `Rider(ranking)` - Voor global rankings
- `Rider(categoryRacing, powerToWeight DESC)` - Voor categorie rankings

### Composite Unique Indexes
- `RaceResult(eventId, riderId, source)` - Voorkom duplicaten
