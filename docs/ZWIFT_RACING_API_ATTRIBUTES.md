# ZwiftRacing.app Public API - Complete Attributen Documentatie

**API Key**: `650c6d2fc4ef6858d74cbef1`  
**Base URL**: `https://zwift-ranking.herokuapp.com`  
**Test Rider ID**: `150437`  
**Test Club ID**: `11818`

---

## 📋 ENDPOINT OVERZICHT

| Endpoint | Method | Rate Limit (Standard) | Beschrijving |
|----------|--------|----------------------|--------------|
| `/public/clubs/<id>` | GET | 1/60min | Active club members (max 1000) |
| `/public/clubs/<id>/<riderId>` | GET | 1/60min | Club members met riderId > X (pagination) |
| `/public/results/<eventId>` | GET | 1/min | ZwiftRacing.app event results |
| `/public/zp/<eventId>/results` | GET | 1/min | ZwiftPower event results |
| `/public/riders/<riderId>` | GET | 5/min | Current rider data |
| `/public/riders/<riderId>/<time>` | GET | 5/min | Historical rider data (epoch) |
| `/public/riders` | POST | 1/15min | Bulk rider data (max 1000 IDs) |
| `/public/riders/<time>` | POST | 1/15min | Bulk historical rider data |

---

## 1️⃣ GET /public/clubs/\<id\>

**Voorbeeld**: `https://zwift-ranking.herokuapp.com/public/clubs/11818`  
**Beschrijving**: Haalt active club members op, gesorteerd op riderId  
**Limiet**: Max 1000 riders  
**Rate Limit**: 1 call per 60 minuten

### Response Structuur

```json
{
  "clubId": 11818,
  "name": "RHINO",
  "riders": [ /* array van rider objecten */ ]
}
```

### Rider Object Attributen (per rider in array)

#### Basis Identificatie (7 attributen)
| Attribuut | Type | Voorbeeld | Beschrijving |
|-----------|------|-----------|--------------|
| `riderId` | number | 150437 | Unieke Zwift rider ID |
| `name` | string | "John Doe" | Rider naam |
| `gender` | string | "M" / "F" | Geslacht |
| `country` | string | "nl" | Land code (lowercase) |
| `age` | string | "30-40" / "50+" / "Vet" | Leeftijdsgroep |
| `height` | number | 183 | Lengte in cm |
| `weight` | number | 74 | Gewicht in kg |

#### ZwiftPower Categorie (2 attributen)
| Attribuut | Type | Voorbeeld | Beschrijving |
|-----------|------|-----------|--------------|
| `zpCategory` | string | "B" | ZwiftPower categorie (A/B/C/D/E) |
| `zpFTP` | number | 294 | ZwiftPower FTP (watts) |

#### Power Object (17 attributen)

**W/kg Power Curve**:
| Attribuut | Type | Beschrijving |
|-----------|------|--------------|
| `wkg5` | number | 5-second max power (W/kg) - sprint |
| `wkg15` | number | 15-second max power (W/kg) |
| `wkg30` | number | 30-second max power (W/kg) |
| `wkg60` | number | 1-minute max power (W/kg) |
| `wkg120` | number | 2-minute max power (W/kg) |
| `wkg300` | number | 5-minute max power (W/kg) - VO2max |
| `wkg1200` | number | 20-minute max power (W/kg) - FTP |

**Absolute Power Curve (watts)**:
| Attribuut | Type | Beschrijving |
|-----------|------|--------------|
| `w5` | number | 5-second max power (watts) |
| `w15` | number | 15-second max power (watts) |
| `w30` | number | 30-second max power (watts) |
| `w60` | number | 1-minute max power (watts) |
| `w120` | number | 2-minute max power (watts) |
| `w300` | number | 5-minute max power (watts) |
| `w1200` | number | 20-minute max power (watts) |

**Performance Metrics**:
| Attribuut | Type | Beschrijving |
|-----------|------|--------------|
| `CP` | number | Critical Power (watts) |
| `AWC` | number | Anaerobic Work Capacity (joules) |
| `compoundScore` | number | Compound performance score |
| `powerRating` | number | Overall power rating |

#### Race Object (27 attributen)

**Last Race**:
| Attribuut | Path | Type | Beschrijving |
|-----------|------|------|--------------|
| `last.rating` | number | number | Rating na laatste race |
| `last.date` | number | number | Datum (epoch timestamp) |
| `last.mixed.category` | string | string | Categorie naam (bijv. "Amethyst") |
| `last.mixed.number` | number | number | Categorie nummer |

**Current Rating**:
| Attribuut | Path | Type | Beschrijving |
|-----------|------|------|--------------|
| `current.rating` | number | number | Huidige rating |
| `current.date` | number | number | Datum huidige rating |
| `current.mixed.category` | string | string | Huidige categorie |
| `current.mixed.number` | number | number | Categorie nummer |

**Max 30 Days**:
| Attribuut | Path | Type | Beschrijving |
|-----------|------|------|--------------|
| `max30.rating` | number | number | Hoogste rating laatste 30 dagen |
| `max30.date` | number | number | Datum van max rating |
| `max30.expires` | number | number | Vervaldatum (epoch) |
| `max30.mixed.category` | string | string | Categorie bij max rating |
| `max30.mixed.number` | number | number | Categorie nummer |

**Max 90 Days**:
| Attribuut | Path | Type | Beschrijving |
|-----------|------|------|--------------|
| `max90.rating` | number | number | Hoogste rating laatste 90 dagen |
| `max90.date` | number | number | Datum van max rating |
| `max90.expires` | number | number | Vervaldatum (epoch) |
| `max90.mixed.category` | string | string | Categorie bij max rating |
| `max90.mixed.number` | number | number | Categorie nummer |

**Race Statistics**:
| Attribuut | Type | Beschrijving |
|-----------|------|--------------|
| `finishes` | number | Totaal aantal finishes |
| `dnfs` | number | Totaal aantal DNFs |
| `wins` | number | Totaal aantal overwinningen |
| `podiums` | number | Totaal aantal podiums (top 3) |

#### Handicaps Object (4 attributen)

| Attribuut | Path | Type | Beschrijving |
|-----------|------|------|--------------|
| `profile.flat` | number | number | Handicap voor vlakke routes |
| `profile.rolling` | number | number | Handicap voor golvende routes |
| `profile.hilly` | number | number | Handicap voor heuvelachtige routes |
| `profile.mountainous` | number | number | Handicap voor bergachtige routes |

#### Phenotype Object (7 attributen)

**Rider Type Scores**:
| Attribuut | Path | Type | Beschrijving |
|-----------|------|------|--------------|
| `scores.sprinter` | number | number | Sprinter score (0-100) |
| `scores.puncheur` | number | number | Puncheur score (0-100) |
| `scores.pursuiter` | number | number | Pursuiter score (0-100) |
| `scores.climber` | number | number | Climber score (0-100) |
| `scores.tt` | number | number | Time trialist score (0-100) |

**Classification**:
| Attribuut | Type | Beschrijving |
|-----------|------|--------------|
| `value` | string | Rider type: "Sprinter", "Puncheur", "Climber", "Pursuiter", "TT" |
| `bias` | number | Bias score (hoe uitgesproken het type is) |

### Totaal Attributen per Rider
- **Basis**: 7
- **ZwiftPower**: 2
- **Power**: 17
- **Race**: 27
- **Handicaps**: 4
- **Phenotype**: 7
- **TOTAAL**: **64 attributen per rider**

---

## 2️⃣ GET /public/clubs/\<id\>/\<riderId\>

**Voorbeeld**: `https://zwift-ranking.herokuapp.com/public/clubs/11818/150437`  
**Beschrijving**: Pagination endpoint - haalt club members op met riderId > 150437  
**Use Case**: Voor clubs met >1000 members, haal volgende batch op

### Response Structuur
Identiek aan endpoint 1, maar alleen riders met `riderId > 150437`

---

## 3️⃣ GET /public/results/\<eventId\>

**Voorbeeld**: `https://zwift-ranking.herokuapp.com/public/results/4879983`  
**Beschrijving**: ZwiftRacing.app resultaten voor specifiek event  
**Rate Limit**: 1 call per minuut

### Response Structuur
Array van result objecten:

```json
[
  {
    "riderId": 150437,
    "name": "John Doe",
    "category": "B",
    "position": 5,
    "time": 2730,
    "rating": 1250.5,
    "ratingBefore": 1245.3,
    "ratingDelta": 5.2,
    ...
  }
]
```

### Result Object Attributen

#### Identificatie (3 attributen)
| Attribuut | Type | Beschrijving |
|-----------|------|--------------|
| `riderId` | number | Rider ID |
| `name` | string | Rider naam |
| `category` | string | Race categorie (A/B/C/D/E) |

#### Position & Timing (4 attributen)
| Attribuut | Type | Beschrijving |
|-----------|------|--------------|
| `position` | number | Overall finish positie |
| `positionInCategory` | number | Positie binnen categorie |
| `time` | number | Race tijd in seconden |
| `gap` | number \| null | Gap to winner (seconden) |

#### Rating Data (5 attributen)
| Attribuut | Type | Beschrijving |
|-----------|------|--------------|
| `rating` | number | Rating na race |
| `ratingBefore` | number | Rating voor race |
| `ratingDelta` | number | Rating change (+/-) |
| `ratingMax30` | number | Max rating laatste 30 dagen |
| `ratingMax90` | number | Max rating laatste 90 dagen |

#### Performance (optioneel, indien beschikbaar)
| Attribuut | Type | Beschrijving |
|-----------|------|--------------|
| `averagePower` | number | Gemiddeld vermogen (watts) |
| `averageWkg` | number | Gemiddeld W/kg |
| `distance` | number | Afstand in meters |

### Totaal Attributen per Result
**Minimaal**: 12-15 attributen (afhankelijk van beschikbare data)

---

## 4️⃣ GET /public/zp/\<eventId\>/results

**Voorbeeld**: `https://zwift-ranking.herokuapp.com/public/zp/4879983/results`  
**Beschrijving**: ZwiftPower resultaten voor specifiek event  
**Rate Limit**: 1 call per minuut

### Response Structuur
Vergelijkbaar met endpoint 3, maar kan aanvullende ZwiftPower-specifieke velden hebben zoals:
- `zPower` - Power data van ZPower (geschat, geen power meter)
- `flagged` - Result geflagged door ZwiftPower
- `disqualified` - Gediskwalificeerd status

---

## 5️⃣ GET /public/riders/\<riderId\>

**Voorbeeld**: `https://zwift-ranking.herokuapp.com/public/riders/150437`  
**Beschrijving**: Current rider data (identiek aan rider object in clubs endpoint)  
**Rate Limit**: 5 calls per minuut

### Response Structuur
Single rider object met **64 attributen** (zie endpoint 1 voor volledige lijst)

---

## 6️⃣ GET /public/riders/\<riderId\>/\<time\>

**Voorbeeld**: `https://zwift-ranking.herokuapp.com/public/riders/150437/1735689600`  
**Beschrijving**: Historical rider data op specifiek moment (epoch timestamp)  
**Rate Limit**: 5 calls per minuut  
**Time Format**: Epoch zonder milliseconds (bijv. 1735689600 = 1 jan 2025)

### Response Structuur
Identiek aan endpoint 5, maar data zoals het was op het opgegeven tijdstip.

**Use Case**: 
- Track rider progressie over tijd
- Vergelijk stats voor/na training period
- Historical trend analyse

---

## 7️⃣ POST /public/riders

**Voorbeeld**: `https://zwift-ranking.herokuapp.com/public/riders`  
**Body**: `[150437, 5574, 8]`  
**Beschrijving**: Bulk rider data (max 1000 rider IDs)  
**Rate Limit**: 1 call per 15 minuten

### Request Format
```json
[150437, 5574, 8, 12345, ...]  // Max 1000 IDs
```

### Response Structuur
Array van rider objecten (elk met 64 attributen zoals endpoint 5)

**Performance**: 
- Single call voor 1000 riders vs 1000 individual calls
- Gebruik voor club roster sync of bulk updates

---

## 8️⃣ POST /public/riders/\<time\>

**Voorbeeld**: `https://zwift-ranking.herokuapp.com/public/riders/1735689600`  
**Body**: `[150437, 5574]`  
**Beschrijving**: Bulk historical rider data op specifiek tijdstip  
**Rate Limit**: 1 call per 15 minuten

### Request Format
```json
[150437, 5574, 8]  // Max 1000 IDs
```

### Response Structuur
Array van rider objecten zoals ze waren op het opgegeven tijdstip.

---

## 🔑 ATTRIBUTEN MAPPING NAAR DATABASE

### Riders Tabel (69 velden in database)

**Mapping van API naar Database**:

| API Attribuut | Database Veld | Transformatie |
|---------------|---------------|---------------|
| `riderId` | `zwiftId` | Direct |
| `name` | `name` | Direct |
| `gender` | `gender` | Direct |
| `country` | `countryCode` | Direct |
| `age` | `age` | Direct |
| `height` | `height` | Direct |
| `weight` | `weight` | Direct |
| `zpCategory` | `categoryRacing` | Direct |
| `zpFTP` | `ftp` | Direct |
| `power.wkg5` | `powerWkg5s` | Direct |
| `power.wkg15` | `powerWkg15s` | Direct |
| `power.wkg30` | `powerWkg30s` | Direct |
| `power.wkg60` | `powerWkg1min` | Direct |
| `power.wkg120` | `powerWkg2min` | Direct |
| `power.wkg300` | `powerWkg5min` | Direct |
| `power.wkg1200` | `powerWkg20min` | Direct |
| `power.w5` | `power5s` | Direct |
| `power.w15` | `power15s` | Direct |
| `power.w30` | `power30s` | Direct |
| `power.w60` | `power1min` | Direct |
| `power.w120` | `power2min` | Direct |
| `power.w300` | `power5min` | Direct |
| `power.w1200` | `power20min` | Direct |
| `power.CP` | `criticalPower` | Direct |
| `power.AWC` | `anaerobicWork` | Direct |
| `power.compoundScore` | `compoundScore` | Direct |
| `power.powerRating` | `powerRating` | Direct |
| `race.current.rating` | `ranking` / `rankingScore` | Mapping afhankelijk van rating system |
| `race.finishes` | `totalRaces` | Direct |
| `race.wins` | `totalWins` | Direct |
| `race.podiums` | `totalPodiums` | Direct |
| `race.dnfs` | `totalDnfs` | Direct |
| `handicaps.profile.flat` | `handicapFlat` | Direct |
| `handicaps.profile.rolling` | `handicapRolling` | Direct |
| `handicaps.profile.hilly` | `handicapHilly` | Direct |
| `handicaps.profile.mountainous` | `handicapMountainous` | Direct |
| `phenotype.value` | `phenotype` | Direct |

### Race Results Tabel (42 velden in database)

**Mapping van API naar Database**:

| API Attribuut | Database Veld | Transformatie |
|---------------|---------------|---------------|
| `riderId` | `riderId` | FK naar riders.zwiftId |
| (event ID in URL) | `eventId` | Van URL parameter |
| `position` | `position` | Direct |
| `positionInCategory` | `positionCategory` | Direct |
| `time` | `time` | Direct (seconden) |
| `gap` | `timeGap` | Direct |
| `category` | `category` | Direct |
| `rating` | Custom field | Kan als `rating` worden opgeslagen |
| `ratingDelta` | Custom field | Kan als `ratingDelta` worden opgeslagen |
| `averagePower` | `averagePower` | Direct |
| `averageWkg` | `averageWkg` | Direct |

### Rider History Tabel (12 velden)

**Voor Historical Snapshots** (endpoints 6 & 8):

| API Attribuut | Database Veld | Notes |
|---------------|---------------|-------|
| `zpFTP` | `ftp` | Snapshot waarde |
| `weight` | `weight` | Snapshot waarde |
| `power.wkg1200` | `powerToWeight` | Calculated: FTP / weight |
| `race.current.rating` | `ranking` | Snapshot waarde |
| `race.current.rating` | `rankingScore` | Snapshot waarde |
| `zpCategory` | `categoryRacing` | Snapshot waarde |
| (epoch from URL) | `recordedAt` | Timestamp van snapshot |

---

## 📊 DATA COLLECTION STRATEGIE

### Daily Snapshot Workflow

```typescript
// 1. Haal current rider data op
GET /public/riders/150437

// 2. Sla op in riders tabel (upsert)
await riderRepo.upsertRider(riderData);

// 3. Maak historical snapshot
await riderRepo.saveRiderHistory({
  riderId: rider.id,
  ftp: riderData.zpFTP,
  weight: riderData.weight,
  powerToWeight: riderData.zpFTP / riderData.weight,
  ranking: riderData.race.current.rating,
  categoryRacing: riderData.zpCategory,
  snapshotType: 'daily',
  triggeredBy: 'scheduler'
});
```

### Club Sync Workflow

```typescript
// 1. Haal alle club members op
GET /public/clubs/11818

// 2. Process batch
for (const rider of response.riders) {
  await riderRepo.upsertRider(rider, clubId);
}

// 3. If >1000 members, fetch next batch
if (response.riders.length === 1000) {
  const lastRiderId = response.riders[999].riderId;
  GET /public/clubs/11818/${lastRiderId}
}
```

### Event Results Sync

```typescript
// 1. Haal event results op
GET /public/results/4879983

// 2. Sla event op
await prisma.event.upsert({
  where: { id: 4879983 },
  create: { id: 4879983, name: 'Event Name', eventDate: new Date() },
  update: {}
});

// 3. Sla alle results op
for (const result of results) {
  await prisma.raceResult.create({
    data: {
      eventId: 4879983,
      riderId: result.riderId,
      position: result.position,
      time: result.time,
      rating: result.rating,
      ratingDelta: result.ratingDelta,
      // ... meer velden
    }
  });
}
```

### Bulk Historical Analysis

```typescript
// Voor 90-dagen trend analyse van multiple riders
const riderIds = [150437, 5574, 8, ...]; // Max 1000
const days = 90;
const epochs = [];

// Generate epoch timestamps voor elke dag
for (let i = 0; i < days; i++) {
  const date = new Date();
  date.setDate(date.getDate() - i);
  epochs.push(Math.floor(date.getTime() / 1000));
}

// Haal data op voor alle riders op alle tijdstippen
for (const epoch of epochs) {
  POST /public/riders/${epoch}
  Body: riderIds
  
  // Process en sla op als historical snapshots
  for (const rider of response) {
    await saveHistoricalSnapshot(rider, epoch);
  }
  
  await sleep(15 * 60 * 1000); // Rate limit: 15 min
}
```

---

## ⚠️ RATE LIMIT BEST PRACTICES

### Prioritering

1. **Club Sync**: 1/60min - Run 1x per dag (off-peak hours)
2. **Favorites Sync**: 5/min - Run elke 10 min voor 50 favorites (10 min cycle)
3. **Event Results**: 1/min - On-demand na races
4. **Bulk Riders**: 1/15min - Voor backfill operations (off-peak)

### Optimal Sync Schedule

```
00:00 - Daily snapshot job (all favorites, 1 per 12s = 50 in 10 min)
03:00 - Club sync (1 call, max 1000 members)
06:00 - Bulk historical backfill (indien nodig)
After each race - Event results sync
```

---

## 📝 TESTING COMMANDS

```bash
# Set API key
API_KEY="650c6d2fc4ef6858d74cbef1"

# Test club endpoint
curl -s -H "Authorization: $API_KEY" \
  "https://zwift-ranking.herokuapp.com/public/clubs/11818" | jq '.riders[0]'

# Test rider endpoint
curl -s -H "Authorization: $API_KEY" \
  "https://zwift-ranking.herokuapp.com/public/riders/150437" | jq '.'

# Test historical rider
curl -s -H "Authorization: $API_KEY" \
  "https://zwift-ranking.herokuapp.com/public/riders/150437/1735689600" | jq '.'

# Test event results
curl -s -H "Authorization: $API_KEY" \
  "https://zwift-ranking.herokuapp.com/public/results/4879983" | jq '.[0]'

# Test bulk riders
curl -s -H "Authorization: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '[150437, 5574, 8]' \
  "https://zwift-ranking.herokuapp.com/public/riders" | jq '.'
```

---

## 🎯 SAMENVATTING

| Endpoint | Attributen | Primary Use | Rate Limit |
|----------|------------|-------------|------------|
| Clubs | 64/rider | Club roster sync | 1/60min |
| Results | 12-15/result | Race leaderboard | 1/min |
| Single Rider | 64 | Individual updates | 5/min |
| Historical Rider | 64 | Trend analysis | 5/min |
| Bulk Riders | 64/rider | Mass updates | 1/15min |
| Bulk Historical | 64/rider | Backfill operations | 1/15min |

**Totaal unieke attributen beschikbaar**: **~70 velden** (rider data + race data + historical)
