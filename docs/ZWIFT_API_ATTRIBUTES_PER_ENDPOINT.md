# ZwiftRacing.app API - Complete Attribuutanalyse per Endpoint

**Datum**: 27 oktober 2025  
**Basis**: Rider 150437 (JRøne | CloudRacer-9 @YouTube)  
**API Key**: 650c6d2fc4ef6858d74cbef1  
**Methodologie**: Cascade testing startend vanaf rider 150437

---

## 📋 Inhoudsopgave

1. [Endpoint 1: GET /public/riders/{riderId}](#endpoint-1-single-rider)
2. [Endpoint 2: GET /public/riders/{riderId}/{epoch}](#endpoint-2-historical-rider)
3. [Endpoint 3: GET /public/clubs/{clubId}](#endpoint-3-club-members)
4. [Endpoint 4: POST /public/riders](#endpoint-4-bulk-riders)
5. [Endpoint 5: POST /public/riders/{epoch}](#endpoint-5-bulk-historical)
6. [Endpoint 6: GET /public/results/{eventId}](#endpoint-6-event-results)
7. [Endpoint 7: GET /public/zp/{eventId}/results](#endpoint-7-zwiftpower-results)
8. [Attribuut Vergelijking](#attribuut-vergelijking)
9. [Database Schema Mapping](#database-schema-mapping)

---

## Endpoint 1: Single Rider

**URL**: `GET /public/riders/{riderId}`  
**Rate Limit**: 5 requests/min  
**Voorbeeld**: `/public/riders/150437`  
**Gebruik**: Huidige rider data ophalen

### Response Structure (14 Top-Level Attributes)

```json
{
  "riderId": 150437,
  "name": "JRøne | CloudRacer-9 @YouTube",
  "gender": "M",
  "country": "nl",
  "age": "Vet",
  "height": 183,
  "weight": 74,
  "zpCategory": "B",
  "zpFTP": 270,
  "power": { ... },
  "race": { ... },
  "handicaps": { ... },
  "phenotype": { ... },
  "club": { ... }
}
```

### Alle Attributen (64 totaal bij full expansion)

#### 1. Basis Rider Info (9 attributen)

| Attribuut | Type | Voorbeeld | Beschrijving |
|-----------|------|-----------|--------------|
| `riderId` | number | `150437` | Uniek Zwift rider ID |
| `name` | string | `"JRøne \| CloudRacer-9 @YouTube"` | Weergavenaam |
| `gender` | string | `"M"` | Geslacht (M/F) |
| `country` | string | `"nl"` | Landcode (ISO 2-letter) |
| `age` | string | `"Vet"` | Leeftijdscategorie |
| `height` | number | `183` | Lengte in cm |
| `weight` | number | `74` | Gewicht in kg |
| `zpCategory` | string | `"B"` | ZwiftPower categorie (A/B/C/D/E) |
| `zpFTP` | number | `270` | Functional Threshold Power (Watts) |

#### 2. Power Object (18 attributen)

Nested in `power` object:

| Attribuut | Type | Voorbeeld | Beschrijving |
|-----------|------|-----------|--------------|
| `wkg5` | number | `13.027` | 5 sec power (W/kg) |
| `wkg15` | number | `12.027` | 15 sec power (W/kg) |
| `wkg30` | number | `9.1351` | 30 sec power (W/kg) |
| `wkg60` | number | `5.7703` | 1 min power (W/kg) |
| `wkg120` | number | `5.0811` | 2 min power (W/kg) |
| `wkg300` | number | `4.0541` | 5 min power (W/kg) |
| `wkg1200` | number | `3.3784` | 20 min power (W/kg) |
| `w5` | number | `964` | 5 sec power (Watts) |
| `w15` | number | `890` | 15 sec power (Watts) |
| `w30` | number | `676` | 30 sec power (Watts) |
| `w60` | number | `427` | 1 min power (Watts) |
| `w120` | number | `376` | 2 min power (Watts) |
| `w300` | number | `300` | 5 min power (Watts) |
| `w1200` | number | `250` | 20 min power (Watts) |
| `CP` | number | `229.619` | Critical Power (model) |
| `AWC` | number | `25764.15` | Anaerobic Work Capacity |
| `compoundScore` | number | `1152.42` | Totaalscore power metrics |
| `powerRating` | number | `1152.42` | Overall power rating |

**W/kg Referentie**:
- Sprinter: Hoog wkg5-wkg30
- Climber: Hoog wkg300-wkg1200
- Puncher: Balans tussen alle waarden
- Time Trialer: Hoog wkg1200 + CP

#### 3. Race Object (8 top-level + 16 nested = 24 attributen)

Nested in `race` object:

| Attribuut | Type | Voorbeeld | Beschrijving |
|-----------|------|-----------|--------------|
| `race.finishes` | number | `23` | Aantal afgeronde races |
| `race.dnfs` | number | `2` | Did Not Finish count |
| `race.wins` | number | `0` | Aantal overwinningen |
| `race.podiums` | number | `4` | Aantal podiumplaatsen (1-3) |

**Sub-object: `race.last`** (laatste race):

| Attribuut | Type | Voorbeeld | Beschrijving |
|-----------|------|-----------|--------------|
| `rating` | number | `1377.0004` | Rating na laatste race |
| `date` | number | `1761225000` | Unix timestamp (epoch) |
| `mixed.category` | string | `"Amethyst"` | Category naam |
| `mixed.number` | number | `5` | Category nummer (1-5) |

**Sub-object: `race.current`** (huidige rating):
- Zelfde structuur als `race.last`

**Sub-object: `race.max30`** (hoogste rating 30 dagen):

| Attribuut | Type | Voorbeeld | Beschrijving |
|-----------|------|-----------|--------------|
| `rating` | number | `1453.044` | Piek rating |
| `date` | number | `1759170000` | Datum van piek |
| `expires` | number | `1763817000` | Expiratie van piek |
| `mixed.category` | string | `"Sapphire"` | Categorie bij piek |
| `mixed.number` | number | `4` | Category nummer |

**Sub-object: `race.max90`** (hoogste rating 90 dagen):
- Zelfde structuur als `race.max30`

**Category System**:
1. Diamond (cat 1) - Elite
2. Ruby (cat 2) - Advanced
3. Emerald (cat 3) - Intermediate
4. Sapphire (cat 4) - Developing
5. Amethyst (cat 5) - Beginner

#### 4. Handicaps Object (1 + 4 nested = 5 attributen)

Nested in `handicaps.profile` object:

| Attribuut | Type | Voorbeeld | Beschrijving |
|-----------|------|-----------|--------------|
| `flat` | number | `134.54` | Handicap vlak parcours |
| `rolling` | number | `55.89` | Handicap glooiend |
| `hilly` | number | `-4.32` | Handicap heuvelachtig |
| `mountainous` | number | `-152.20` | Handicap bergachtig |

**Interpretatie**:
- Positief = Voordeel op dit terrein
- Negatief = Nadeel op dit terrein
- Rider 150437 = Sprinter (best op vlak)

#### 5. Phenotype Object (3 top-level + 5 nested = 8 attributen)

Nested in `phenotype` object:

| Attribuut | Type | Voorbeeld | Beschrijving |
|-----------|------|-----------|--------------|
| `value` | string | `"Sprinter"` | Primair rijderstype |
| `bias` | number | `19.22` | Sterkte van type (0-100) |

**Sub-object: `phenotype.scores`**:

| Attribuut | Type | Voorbeeld | Beschrijving |
|-----------|------|-----------|--------------|
| `sprinter` | number | `96.5` | Score als sprinter (0-100) |
| `puncheur` | number | `82.4` | Score als puncher |
| `pursuiter` | number | `70.2` | Score als pursuiter |
| `climber` | number | `60.0` | Score als klimmer |
| `tt` | number | `53.3` | Score als tijdrijder |

**Rider Types**:
- Sprinter: Explosieve korte inspanningen
- Puncheur: Korte steile klimmetjes
- Pursuiter: Steady state high power
- Climber: Lange beklimmingen
- Time Trialer: Solo tempo efforts

#### 6. Club Object (2 attributen)

Nested in `club` object:

| Attribuut | Type | Voorbeeld | Beschrijving |
|-----------|------|-----------|--------------|
| `id` | number | `2281` | Uniek club ID |
| `name` | string | `"TeamNL"` | Club naam |

### Totaal Overzicht Endpoint 1

| Categorie | Attributen | Diepte |
|-----------|------------|--------|
| Basis Info | 9 | Top-level |
| Power Metrics | 18 | 1 niveau diep |
| Race Statistics | 24 | 1-2 niveaus diep |
| Terrain Handicaps | 5 | 1 niveau diep |
| Rider Phenotype | 8 | 1 niveau diep |
| Club Info | 2 | 1 niveau diep |
| **TOTAAL** | **66** | **Max 2 niveaus** |

---

## Endpoint 2: Historical Rider

**URL**: `GET /public/riders/{riderId}/{epoch}`  
**Rate Limit**: 5 requests/min  
**Voorbeeld**: `/public/riders/150437/1760962467` (7 dagen geleden)  
**Gebruik**: Rider data op specifiek moment in verleden

### Response Structure

**IDENTIEK aan Endpoint 1** - Zelfde 66 attributen, maar met historische waarden.

### Belangrijke Verschillen

Vergelijking rider 150437 (nu vs 7 dagen geleden):

| Attribuut | Nu | 7 Dagen Geleden | Verschil |
|-----------|-----|-----------------|----------|
| `zpFTP` | 270 W | 270 W | 0 W |
| `race.current.rating` | 1377.00 | 1394.23 | **-17.23** ⬇️ |
| `race.max30.rating` | 1453.04 | ? | N/A |
| `weight` | 74 kg | 74 kg | 0 kg |

**Rating daling**: Rider heeft rating verloren in afgelopen week (-17 punten), mogelijk door slechte race of rating decay.

### Snapshot Strategie

**Aanbevolen frequentie**:
- **Dagelijks (03:00)**: Club members snapshot
- **Na elke race**: Individual rider snapshot
- **Wekelijks**: Full club snapshot (alle inactive members)

**Storage**:
```sql
CREATE TABLE rider_history (
  id INTEGER PRIMARY KEY,
  zwift_id INTEGER,
  snapshot_date TIMESTAMP,
  ftp INTEGER,
  weight REAL,
  rating REAL,
  power_data JSON,  -- Full power object
  race_stats JSON,  -- Full race object
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rider_snapshots ON rider_history(zwift_id, snapshot_date DESC);
```

---

## Endpoint 3: Club Members

**URL**: `GET /public/clubs/{clubId}`  
**Rate Limit**: 1 request/60 min ⚠️ **ZEER STRIKT**  
**Voorbeeld**: `/public/clubs/2281`  
**Gebruik**: Alle club members ophalen met volledige rider data

### Response Structure

```json
{
  "id": 2281,
  "name": "TeamNL",
  "riders": [
    { /* Rider object met ALLE 66 attributen */ },
    { /* Rider object met ALLE 66 attributen */ },
    ...
  ]
}
```

### Attributen

| Attribuut | Type | Beschrijving |
|-----------|------|--------------|
| `id` | number | Club ID |
| `name` | string | Club naam |
| `riders` | array | Array van rider objects |
| `riders[n].*` | object | **VOLLEDIGE rider data (66 attr)** |

**Belangrijke Note**: Elk rider object in de `riders` array bevat **EXACT dezelfde 66 attributen** als Endpoint 1 (single rider).

### Pagination (Endpoint 3b)

**URL**: `GET /public/clubs/{clubId}/{riderId}`  
**Rate Limit**: 5 requests/min  
**Gebruik**: Paginatie vanaf specifiek rider ID

**Response**: Zelfde als basis club endpoint, maar riders gefiltered vanaf `riderId`.

### Sync Strategie

**Problem**: Rate limit is 1/60min - te weinig voor realtime!

**Oplossing**:
```typescript
// Daily full sync (03:00)
cron.schedule('0 3 * * *', async () => {
  const club = await zwiftClient.getClub(2281);
  
  for (const rider of club.riders) {
    await riderRepo.upsertRider({
      zwiftId: rider.riderId,
      name: rider.name,
      ftp: rider.zpFTP,
      rating: rider.race.current.rating,
      // ... all 66 fields
    });
    
    // Save snapshot
    await riderHistoryRepo.createSnapshot(rider);
  }
});
```

**Warning**: Bij grote clubs (>100 members) is 1 call/60min genoeg. Bij kleine clubs kan je pagination gebruiken voor snellere updates.

---

## Endpoint 4: Bulk Riders

**URL**: `POST /public/riders`  
**Rate Limit**: 1 request/15 min  
**Body**: Array van rider IDs (max 1000)  
**Gebruik**: Multiple riders ophalen in 1 call

### Request

```json
[150437, 123456, 789012]
```

### Response

```json
[
  { /* Rider 150437 met 66 attributen */ },
  { /* Rider 123456 met 66 attributen */ },
  { /* Rider 789012 met 66 attributen */ }
]
```

### Attributen

**IDENTIEK aan Endpoint 1** - Array van rider objects, elk met 66 attributen.

### Gebruik Cases

**1. Partial Club Sync** (na race):
```typescript
// Haal alleen riders op die in laatste race zaten
const raceParticipants = [150437, 234567, 345678];
const riders = await zwiftClient.bulkRiders(raceParticipants);
```

**2. Watchlist Sync**:
```typescript
// Favoriete riders ophalen
const favorites = await db.getFavoriteRiderIds();
const riders = await zwiftClient.bulkRiders(favorites);
```

**3. Team Sync** (alternatief voor club endpoint bij rate limit):
```typescript
// TeamNL members (max 1000)
const teamMemberIds = [150437, ...]; // Array van bekende IDs
const riders = await zwiftClient.bulkRiders(teamMemberIds);
```

### Performance

| Methode | Rate Limit | Max Riders | Use Case |
|---------|------------|------------|----------|
| Single (`/riders/{id}`) | 5/min | 5 per min | Realtime updates |
| Bulk (`POST /riders`) | 1/15min | 1000 per 15min | Batch updates |
| Club (`/clubs/{id}`) | 1/60min | Unlimited | Full sync |

---

## Endpoint 5: Bulk Historical

**URL**: `POST /public/riders/{epoch}`  
**Rate Limit**: 1 request/15 min  
**Body**: Array van rider IDs (max 1000)  
**Gebruik**: Historical data voor multiple riders

### Request

```json
POST /public/riders/1760962467
[150437, 123456, 789012]
```

### Response

**IDENTIEK aan Endpoint 4** - Array van rider objects met 66 attributen, maar met historische waarden.

### Gebruik Cases

**1. Trend Analysis**:
```typescript
const now = Math.floor(Date.now() / 1000);
const week_ago = now - (7 * 24 * 3600);
const month_ago = now - (30 * 24 * 3600);

const teamIds = [150437, ...];

const ridersNow = await zwiftClient.bulkRiders(teamIds);
const ridersWeekAgo = await zwiftClient.bulkRidersHistorical(teamIds, week_ago);
const ridersMonthAgo = await zwiftClient.bulkRidersHistorical(teamIds, month_ago);

// Compare FTP, rating, weight trends
```

**2. Performance Report**:
```typescript
// Maandelijks rapport
const reportDate = new Date('2025-10-01').getTime() / 1000;
const teamSnapshot = await zwiftClient.bulkRidersHistorical(teamIds, reportDate);
```

---

## Endpoint 6: Event Results

**URL**: `GET /public/results/{eventId}`  
**Rate Limit**: 1 request/min  
**Voorbeeld**: `/public/results/4879983`  
**Gebruik**: Race results ophalen (ZwiftRacing.app data)

### Response Structure

```json
[
  {
    "riderId": 150437,
    "name": "JRøne | CloudRacer-9 @YouTube",
    "position": 12,
    "time": 1847,
    "eventId": 4879983,
    "category": "B",
    "power": 245,
    "avgHR": 165,
    "...": "..."
  },
  { /* Result 2 */ },
  { /* Result 3 */ }
]
```

### Alle Attributen (~15-20 attributen)

**Based on ZwiftRacing.app API documentation**:

| Attribuut | Type | Voorbeeld | Beschrijving |
|-----------|------|-----------|--------------|
| `riderId` | number | `150437` | Zwift rider ID |
| `name` | string | `"JRøne"` | Rider naam |
| `eventId` | number | `4879983` | Event ID |
| `position` | number | `12` | Eindpositie (1-N) |
| `positionInCat` | number | `8` | Positie binnen categorie |
| `time` | number | `1847` | Finishtijd in seconden |
| `category` | string | `"B"` | Race categorie (A/B/C/D/E) |
| `power` | number | `245` | Gemiddeld vermogen (W) |
| `powerPerKg` | number | `3.31` | W/kg gemiddeld |
| `avgHR` | number | `165` | Gemiddelde hartslag |
| `maxHR` | number | `182` | Maximale hartslag |
| `distance` | number | `32.5` | Afstand in km |
| `elevation` | number | `450` | Hoogtemeters |
| `speed` | number | `35.2` | Gemiddelde snelheid (km/h) |
| `isDQ` | boolean | `false` | Gediskwalificeerd |
| `penalty` | number | `0` | Tijdstraf in seconden |

**Note**: Exacte attributen afhankelijk van event type. Niet alle events hebben HR data.

### Event Discovery Problem

**Probleem**: Geen `/riders/{id}/events` endpoint!

**Geteste Oplossingen**:

❌ **Historical Rider Endpoint** (`/public/riders/{id}/{time}`):
- **Bevinding**: `race.current.date` verandert wel per timestamp
- **Probleem**: Geen event IDs, alleen timestamps
- **Rate limit**: 5/min = 18 minuten voor 90 dagen scan
- **Conclusie**: NIET bruikbaar voor event discovery

✓ **Event Range Scan** (AANBEVOLEN):
```typescript
// Scan events in recent bereik
const START_EVENT = 5130000;  // Schat obv huidige datum
const END_EVENT = 5135000;

for (let eventId = START_EVENT; eventId < END_EVENT; eventId++) {
  const results = await getEventResults(eventId);
  if (results.some(r => r.riderId === 150437)) {
    console.log(`Found rider in event ${eventId}`);
  }
  await sleep(60000);  // Rate limit: 1/min
}
```

✓ **Database Tracking** (BESTE STRATEGIE):
```sql
-- Save alle events waar rider in reed
CREATE TABLE rider_events (
  rider_id INTEGER,
  event_id INTEGER,
  position INTEGER,
  time INTEGER,
  event_date TIMESTAMP,
  PRIMARY KEY (rider_id, event_id)
);

-- Vul initial via event range scan
-- Update real-time via post-race sync
```

❌ **ZwiftPower API**: Geen publieke toegang zonder auth

**Aanbeveling voor Rider 150437 (23 finishes + 2 DNFs = 25 events)**:
1. Event range scan: 5100000-5135000 (~35000 events × 1min = 24 dagen)
2. Database tracking vanaf nu voor nieuwe events
3. Narrower range obv `race.max90.date` (1754330400 = 4 augustus 2025)

---

## Endpoint 7: ZwiftPower Results

**URL**: `GET /public/zp/{eventId}/results`  
**Rate Limit**: 1 request/min  
**Voorbeeld**: `/public/zp/4879983/results`  
**Gebruik**: ZwiftPower race results (kan verschillen van ZwiftRacing)

### Response Structure

**VERGELIJKBAAR met Endpoint 6**, maar ZwiftPower data source.

### Verschil ZwiftRacing vs ZwiftPower

| Aspect | ZwiftRacing (`/results`) | ZwiftPower (`/zp/results`) |
|--------|--------------------------|----------------------------|
| Data Source | ZwiftRacing.app eigen berekeningen | ZwiftPower officiele data |
| Category | ZwiftRacing categories (1-5) | ZwiftPower cats (A-E) |
| DQ Status | Mogelijk anders | Officiele DQ's |
| Ranking Impact | Used for ZwiftRacing rating | Officiele ranking |
| Update Tijd | Faster | Slower (officiele verification) |

**Aanbeveling**: Gebruik **beide** endpoints en vergelijk:
```typescript
const racingResults = await getEventResults(eventId);
const zpResults = await getZPEventResults(eventId);

// Find discrepancies (DQ's, cat changes)
const dqInZP = zpResults.filter(r => r.isDQ && !racingResults.find(rr => rr.riderId === r.riderId)?.isDQ);
```

---

## Attribuut Vergelijking

### Overzicht per Endpoint

| Endpoint | Top-Level | Nested | Totaal | Unieke Attributen |
|----------|-----------|--------|--------|-------------------|
| GET /riders/{id} | 14 | 52 | **66** | Basis rider data |
| GET /riders/{id}/{epoch} | 14 | 52 | **66** | Historical values |
| GET /clubs/{id} | 3 | 66 per rider | **3 + 66n** | Club metadata |
| POST /riders | - | 66 per rider | **66n** | Bulk rider data |
| POST /riders/{epoch} | - | 66 per rider | **66n** | Bulk historical |
| GET /results/{event} | - | ~15 per result | **15n** | Race performance |
| GET /zp/{event}/results | - | ~15 per result | **15n** | ZP race data |

### Gemeenschappelijke Attributen

**Alle rider endpoints** (1, 2, 3, 4, 5) delen:
- `riderId`, `name`, `gender`, `country`, `age`
- `height`, `weight`, `zpCategory`, `zpFTP`
- `power` object (18 attr)
- `race` object (24 attr)
- `handicaps` object (5 attr)
- `phenotype` object (8 attr)
- `club` object (2 attr)

**Race result endpoints** (6, 7) delen:
- `riderId`, `name`, `eventId`, `position`
- `time`, `category`, `power`, `powerPerKg`

### Unieke Attributen per Endpoint

**Alleen in Rider Endpoints**:
- Power curves (wkg5-wkg1200, w5-w1200)
- Critical Power (CP, AWC)
- Race statistics (finishes, wins, podiums)
- Historical ratings (max30, max90)
- Terrain handicaps (flat, rolling, hilly, mountainous)
- Phenotype scores (sprinter, climber, etc.)

**Alleen in Event Results**:
- Race performance (position, time, distance)
- Heart rate data (avgHR, maxHR)
- Disqualification status (isDQ, penalty)
- Event metadata (eventId, category)

---

## Database Schema Mapping

### Tabel 1: `riders` (Primary Data)

Mapping van **Endpoint 1** attributen:

```sql
CREATE TABLE riders (
  -- Primary Key
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zwift_id INTEGER UNIQUE NOT NULL,
  
  -- Basis Info (9 attributen)
  name TEXT NOT NULL,
  gender TEXT,
  country TEXT,
  age_category TEXT,
  height INTEGER,
  weight REAL,
  zp_category TEXT,
  ftp INTEGER,
  
  -- Power Metrics (18 → store as JSON + indexed favorites)
  power_curve_json TEXT,  -- Full power object
  power_rating REAL,      -- Indexed voor sorting
  critical_power REAL,
  awc REAL,
  
  -- Race Stats (24 → partial normalization)
  current_rating REAL,
  current_category TEXT,
  current_category_number INTEGER,
  max_30d_rating REAL,
  max_90d_rating REAL,
  race_finishes INTEGER,
  race_wins INTEGER,
  race_podiums INTEGER,
  race_dnfs INTEGER,
  
  -- Phenotype (8 → JSON + indexed primary)
  phenotype_json TEXT,
  rider_type TEXT,        -- Indexed: "Sprinter", "Climber", etc.
  type_bias REAL,
  
  -- Handicaps (5 → JSON)
  handicaps_json TEXT,
  
  -- Club (2 attributen)
  club_id INTEGER,
  club_name TEXT,
  
  -- Metadata
  last_synced TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (club_id) REFERENCES clubs(id)
);

CREATE INDEX idx_rider_zwift_id ON riders(zwift_id);
CREATE INDEX idx_rider_rating ON riders(current_rating DESC);
CREATE INDEX idx_rider_club ON riders(club_id);
CREATE INDEX idx_rider_type ON riders(rider_type);
```

**JSON Fields Structuur**:

```json
// power_curve_json
{
  "wkg": {"5": 13.027, "15": 12.027, "30": 9.135, "60": 5.770, "120": 5.081, "300": 4.054, "1200": 3.378},
  "watts": {"5": 964, "15": 890, "30": 676, "60": 427, "120": 376, "300": 300, "1200": 250},
  "compoundScore": 1152.42
}

// phenotype_json
{
  "scores": {"sprinter": 96.5, "puncheur": 82.4, "pursuiter": 70.2, "climber": 60.0, "tt": 53.3},
  "value": "Sprinter",
  "bias": 19.22
}

// handicaps_json
{
  "flat": 134.54,
  "rolling": 55.89,
  "hilly": -4.32,
  "mountainous": -152.20
}
```

### Tabel 2: `rider_history` (Snapshots)

Mapping van **Endpoint 2** (historical rider):

```sql
CREATE TABLE rider_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zwift_id INTEGER NOT NULL,
  snapshot_date TIMESTAMP NOT NULL,
  
  -- Key Metrics (selective snapshot)
  ftp INTEGER,
  weight REAL,
  rating REAL,
  category TEXT,
  power_rating REAL,
  
  -- Full Data (optional JSON)
  full_data_json TEXT,  -- Complete 66 attributen
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (zwift_id) REFERENCES riders(zwift_id)
);

CREATE INDEX idx_history_rider ON rider_history(zwift_id, snapshot_date DESC);
```

**Snapshot Strategie**:
- **Dagelijks 03:00**: FTP, weight, rating
- **Na race**: Full JSON snapshot
- **Retention**: 90 dagen detail, 1 jaar wekelijks aggregaat

### Tabel 3: `race_results` (Event Results)

Mapping van **Endpoint 6** attributen:

```sql
CREATE TABLE race_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Event Info
  event_id INTEGER NOT NULL,
  event_date TIMESTAMP,
  
  -- Rider Info
  zwift_id INTEGER NOT NULL,
  rider_name TEXT,
  
  -- Results (15 attributen)
  position INTEGER,
  position_in_category INTEGER,
  finish_time_seconds INTEGER,
  category TEXT,
  avg_power INTEGER,
  avg_power_per_kg REAL,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  distance_km REAL,
  elevation_m INTEGER,
  avg_speed_kmh REAL,
  
  -- Status
  is_dq BOOLEAN DEFAULT 0,
  penalty_seconds INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (zwift_id) REFERENCES riders(zwift_id)
);

CREATE INDEX idx_results_rider ON race_results(zwift_id, event_date DESC);
CREATE INDEX idx_results_event ON race_results(event_id);
```

### Tabel 4: `clubs`

Mapping van **Endpoint 3**:

```sql
CREATE TABLE clubs (
  id INTEGER PRIMARY KEY,  -- Club ID from API
  name TEXT NOT NULL,
  member_count INTEGER,
  
  -- Sync Info
  last_synced TIMESTAMP,
  sync_frequency_minutes INTEGER DEFAULT 60,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabel 5: `events` (Discovered Events)

Tracking van bekende events:

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY,  -- Event ID from API
  event_date TIMESTAMP,
  participant_count INTEGER,
  
  -- Discovery
  discovered_via TEXT,  -- "scan", "manual", "rider_result"
  has_results BOOLEAN DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_date ON events(event_date DESC);
```

---

## Sync Strategieën

### 1. Club Sync (Rate Limit: 1/60min)

```typescript
// Daily full sync
async function syncClub(clubId: number) {
  const club = await zwiftClient.getClub(clubId);
  
  // Update club
  await clubRepo.updateClub({
    id: club.id,
    name: club.name,
    memberCount: club.riders.length,
    lastSynced: new Date(),
  });
  
  // Upsert all riders (batch)
  for (const rider of club.riders) {
    await riderRepo.upsertRider(mapApiRiderToDb(rider));
    
    // Create daily snapshot
    await riderHistoryRepo.createSnapshot({
      zwiftId: rider.riderId,
      snapshotDate: new Date(),
      ftp: rider.zpFTP,
      weight: rider.weight,
      rating: rider.race.current.rating,
      fullDataJson: JSON.stringify(rider),
    });
  }
  
  logger.info(`Synced ${club.riders.length} riders from club ${clubId}`);
}

// Schedule: Daily at 03:00
cron.schedule('0 3 * * *', () => syncClub(2281));
```

### 2. Individual Rider Sync (Rate Limit: 5/min)

```typescript
// Real-time updates for active riders
async function syncActiveRiders(zwiftIds: number[]) {
  const batches = chunk(zwiftIds, 5);  // 5 per minute
  
  for (const batch of batches) {
    await Promise.all(
      batch.map(id => syncSingleRider(id))
    );
    await sleep(60000);  // Wait 1 minute
  }
}

async function syncSingleRider(zwiftId: number) {
  const rider = await zwiftClient.getRider(zwiftId);
  await riderRepo.updateRider(mapApiRiderToDb(rider));
}

// Use case: Na race
await syncActiveRiders([150437, 234567, 345678]);
```

### 3. Bulk Sync (Rate Limit: 1/15min)

```typescript
// Efficient batch updates
async function bulkSyncRiders(zwiftIds: number[]) {
  const batches = chunk(zwiftIds, 1000);  // Max 1000 per call
  
  for (const batch of batches) {
    const riders = await zwiftClient.bulkRiders(batch);
    
    for (const rider of riders) {
      await riderRepo.upsertRider(mapApiRiderToDb(rider));
    }
    
    await sleep(15 * 60 * 1000);  // Wait 15 minutes
  }
}

// Use case: Favorieten sync
const favorites = await db.getFavoriteRiderIds();
await bulkSyncRiders(favorites);
```

### 4. Event Results Sync (Rate Limit: 1/min)

```typescript
// Sync recent events
async function syncRecentEvents(daysBack: number = 7) {
  const knownEvents = await eventRepo.getRecentEvents(daysBack);
  
  for (const event of knownEvents) {
    const results = await zwiftClient.getEventResults(event.id);
    
    for (const result of results) {
      await resultRepo.upsertResult({
        eventId: event.id,
        zwiftId: result.riderId,
        position: result.position,
        finishTimeSeconds: result.time,
        // ... map all 15 attributes
      });
    }
    
    await sleep(60000);  // 1 minute between events
  }
}

// Schedule: Hourly
cron.schedule('0 * * * *', () => syncRecentEvents(1));
```

### 5. Historical Snapshots (Rate Limit: 1/15min)

```typescript
// Monthly trend analysis
async function createMonthlySnapshots(zwiftIds: number[]) {
  const epochMonthAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 3600);
  
  const batches = chunk(zwiftIds, 1000);
  
  for (const batch of batches) {
    const historicalRiders = await zwiftClient.bulkRidersHistorical(
      batch,
      epochMonthAgo
    );
    
    for (const rider of historicalRiders) {
      await riderHistoryRepo.createSnapshot({
        zwiftId: rider.riderId,
        snapshotDate: new Date(epochMonthAgo * 1000),
        fullDataJson: JSON.stringify(rider),
      });
    }
    
    await sleep(15 * 60 * 1000);
  }
}

// Schedule: First of month
cron.schedule('0 3 1 * *', () => createMonthlySnapshots(teamMemberIds));
```

---

## Best Practices

### 1. Rate Limit Management

```typescript
class RateLimitTracker {
  private lastCalls: Map<string, number[]> = new Map();
  
  async checkLimit(endpoint: string, maxCalls: number, windowMinutes: number): Promise<void> {
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    
    const calls = this.lastCalls.get(endpoint) || [];
    const recentCalls = calls.filter(time => now - time < windowMs);
    
    if (recentCalls.length >= maxCalls) {
      const oldestCall = Math.min(...recentCalls);
      const waitTime = windowMs - (now - oldestCall);
      throw new RateLimitError(`Wait ${waitTime}ms before next call`);
    }
    
    recentCalls.push(now);
    this.lastCalls.set(endpoint, recentCalls);
  }
}

// Usage
await rateLimitTracker.checkLimit('/clubs', 1, 60);
await zwiftClient.getClub(2281);
```

### 2. Error Handling

```typescript
async function syncWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.retryAfter) {
        logger.warn(`Rate limit hit, waiting ${error.retryAfter}s`);
        await sleep(error.retryAfter * 1000);
      } else if (i === maxRetries - 1) {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const club = await syncWithRetry(() => zwiftClient.getClub(2281));
```

### 3. Data Validation

```typescript
import { z } from 'zod';

const RiderSchema = z.object({
  riderId: z.number(),
  name: z.string(),
  gender: z.enum(['M', 'F']),
  zpFTP: z.number().min(0).max(600),
  race: z.object({
    current: z.object({
      rating: z.number(),
    }),
  }),
  // ... validate all 66 attributes
});

async function getRiderSafe(riderId: number) {
  const response = await zwiftClient.getRider(riderId);
  return RiderSchema.parse(response);  // Throws if invalid
}
```

### 4. Caching Strategy

```typescript
class RiderCache {
  private cache: Map<number, { data: Rider; timestamp: number }> = new Map();
  private ttl: number = 15 * 60 * 1000;  // 15 minutes
  
  async get(riderId: number): Promise<Rider | null> {
    const cached = this.cache.get(riderId);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    return null;
  }
  
  set(riderId: number, data: Rider): void {
    this.cache.set(riderId, { data, timestamp: Date.now() });
  }
}

// Usage
const cached = await riderCache.get(150437);
if (cached) return cached;

const rider = await zwiftClient.getRider(150437);
riderCache.set(150437, rider);
```

---

## Testen met Rider 150437

### Commando's voor Cascade Testing

```bash
API_KEY="650c6d2fc4ef6858d74cbef1"
BASE="https://zwift-ranking.herokuapp.com"

# 1. Single Rider
curl -H "Authorization: $API_KEY" "$BASE/public/riders/150437" | python3 -m json.tool

# 2. Historical Rider (7 dagen geleden)
EPOCH=$(date -d "7 days ago" +%s)
curl -H "Authorization: $API_KEY" "$BASE/public/riders/150437/$EPOCH" | python3 -m json.tool

# 3. Club (let op: 1/60min limit!)
curl -H "Authorization: $API_KEY" "$BASE/public/clubs/2281" | python3 -m json.tool

# 4. Bulk Riders
curl -H "Authorization: $API_KEY" -H "Content-Type: application/json" \
  -d '[150437, 123456, 789012]' "$BASE/public/riders" | python3 -m json.tool

# 5. Event Results (gebruik bekend event ID)
curl -H "Authorization: $API_KEY" "$BASE/public/results/5120000" | python3 -m json.tool

# 6. ZwiftPower Results
curl -H "Authorization: $API_KEY" "$BASE/public/zp/5120000/results" | python3 -m json.tool
```

### Verwachte Output Rider 150437

```json
{
  "riderId": 150437,
  "name": "JRøne | CloudRacer-9 @YouTube",
  "club": {"id": 2281, "name": "TeamNL"},
  "zpFTP": 270,
  "race": {
    "current": {"rating": 1377.00, "mixed": {"category": "Amethyst", "number": 5}},
    "max90": {"rating": 1472.78, "mixed": {"category": "Sapphire", "number": 4}}
  },
  "phenotype": {"value": "Sprinter", "bias": 19.22},
  "power": {
    "w5": 964, "w30": 676, "w1200": 250,
    "compoundScore": 1152.42
  }
}
```

---

## Conclusie & Aanbevelingen

### Datastore Inrichting

**Primaire Tabellen**:
1. `riders` - 66 attributen (normalized + JSON)
2. `rider_history` - Daily snapshots
3. `race_results` - 15 attributen per result
4. `clubs` - Club metadata
5. `events` - Event tracking

**Sync Frequentie**:
- **Club**: 1x per dag (03:00) - rate limit 1/60min
- **Actieve riders**: Na elke race (5/min)
- **Favorites**: 1x per 15min (bulk)
- **Event results**: Hourly scan (1/min)
- **Historical snapshots**: Dagelijks + maandelijks

**Storage Strategie**:
- **Normalized**: Vaak gebruikte velden (name, FTP, rating)
- **JSON**: Complexe nested data (power curves, phenotype)
- **Indexes**: zwift_id, rating, club_id, event_date

### Performance Optimalisatie

1. **Gebruik Bulk Endpoints**: 1000 riders/15min vs 5 riders/min
2. **Cache Agressief**: 15 min TTL voor rider data
3. **Smart Scheduling**: Club sync off-peak (03:00)
4. **Event Discovery**: Database tracking > API scanning

### Volgende Stappen

1. ✅ **Documentatie compleet**
2. ⏳ **Implementeer bulk sync** service
3. ⏳ **Voeg rider_history** tabel toe
4. ⏳ **Bouw event discovery** scanner
5. ⏳ **Frontend dashboard** met trends

---

**Laatste update**: 27 oktober 2025  
**Data bron**: Rider 150437 + ZwiftRacing.app API docs  
**Auteur**: GitHub Copilot voor TeamNL Cloud9
