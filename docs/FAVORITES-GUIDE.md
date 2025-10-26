# Favorites Management Guide

Complete gids voor het beheren van favorite riders in het TeamNL Cloud9 Dashboard.

## 📋 Overzicht

Het favorites systeem stelt je in staat om specifieke riders te volgen met volledige analytics data:
- Race ratings (current/max30/max90)
- Phenotypes (rider type classificatie)
- Power curves (5s tot 20min)
- Handicaps (terrain-specific)
- Race history (laatste 90 dagen)

**Verschil met Club Members:**
- **Club Members** (`club_members` tabel): Lightweight roster snapshot, sync 60min, basic metrics only
- **Favorites** (`riders` tabel): Full analytics data, sync 15min, priority-based, individuele tracking

---

## 🚀 Quick Start

### 1. Favorite Toevoegen

**Via CLI (aanbevolen voor bulk):**
```bash
# Enkele rider
npm run favorites:add 123456

# Meerdere riders
npm run favorites:add 123456 789012 345678

# Met priority (1=hoogste, 4=laagste)
npm run favorites:add 123456 -- --priority 1

# Vanuit bestand
echo "123456" > riders.txt
echo "789012" >> riders.txt
npm run favorites:add -- --file riders.txt --priority 2
```

**Via API:**
```bash
# Voeg favorite toe
curl -X POST http://localhost:3000/api/favorites \
  -H "Content-Type: application/json" \
  -d '{
    "zwiftId": 123456,
    "priority": 1,
    "addedBy": "admin"
  }'
```

### 2. Favorites Bekijken

**Via CLI:**
```bash
npm run favorites:list
```

**Via API:**
```bash
curl http://localhost:3000/api/favorites
```

### 3. Favorites Syncen

**Via CLI:**
```bash
npm run sync:favorites
```

**Via API:**
```bash
curl -X POST http://localhost:3000/api/sync/favorites
```

---

## 📖 Commando's

### CLI Commands

| Commando | Beschrijving | Voorbeeld |
|----------|--------------|-----------|
| `npm run favorites:add <ids>` | Voeg favorite(s) toe | `npm run favorites:add 123456` |
| `npm run favorites:add -- --file <path>` | Bulk import uit bestand | `npm run favorites:add -- --file riders.txt` |
| `npm run favorites:add -- --priority <1-4>` | Voeg toe met priority | `npm run favorites:add 123456 -- --priority 1` |
| `npm run favorites:list` | Toon alle favorites | `npm run favorites:list` |
| `npm run favorites:remove <ids>` | Verwijder favorites (hard delete) | `npm run favorites:remove 123456` |
| `npm run favorites:remove -- --soft <id>` | Soft delete (behoud data) | `npm run favorites:remove -- --soft 123456` |
| `npm run sync:favorites` | Sync alle favorites | `npm run sync:favorites` |

### API Endpoints

#### GET `/api/favorites`
Haal alle favorite riders op.

**Response:**
```json
[
  {
    "id": 1,
    "zwiftId": 123456,
    "name": "John Doe",
    "isFavorite": true,
    "syncPriority": 1,
    "addedBy": "admin",
    "addedAt": "2025-10-25T10:00:00.000Z",
    "ftp": 320,
    "ranking": 1234,
    "raceRating": {
      "currentRating": 750,
      "max30Rating": 765,
      "max90Rating": 780
    },
    "phenotype": {
      "primaryType": "Climber",
      "bias": 0.78
    }
  }
]
```

#### POST `/api/favorites`
Voeg favorite rider toe.

**Request:**
```json
{
  "zwiftId": 123456,
  "priority": 1,
  "addedBy": "admin"
}
```

**Response:**
```json
{
  "message": "Favorite rider toegevoegd",
  "rider": { ... }
}
```

#### DELETE `/api/favorites/:zwiftId`
Verwijder favorite (soft delete - data behouden).

**Response:**
```json
{
  "message": "Favorite rider verwijderd (data behouden)"
}
```

#### PATCH `/api/favorites/:zwiftId`
Update sync priority.

**Request:**
```json
{
  "priority": 2
}
```

**Response:**
```json
{
  "message": "Priority bijgewerkt"
}
```

#### POST `/api/sync/favorites`
Trigger manual sync van alle favorites.

**Response:**
```json
{
  "message": "Favorites sync voltooid"
}
```

---

## 🎯 Priority Systeem

Favorites worden gesynchroniseerd op basis van priority (1-4):

| Priority | Beschrijving | Use Case | Sync Frequentie |
|----------|--------------|----------|-----------------|
| **1** | Hoogste | Team leden, key competitors | Eerste in queue |
| **2** | Hoog | Belangrijke concurrenten | Vroeg in queue |
| **3** | Medium | Interessante riders | Midden queue |
| **4** | Laag | Archief, historisch | Laatste in queue |

**Rate Limiting:** 5 calls/min (12s delay tussen riders)

**Volgorde:** Priority 1 riders worden eerst gesynchroniseerd, dan priority 2, etc.

---

## 📊 Data Structuur

### Rider (Favorites)

**Database tabel:** `riders`

**Belangrijkste velden:**
```typescript
{
  zwiftId: number;           // Uniek Zwift ID
  name: string;              // Rider naam
  isFavorite: boolean;       // TRUE voor favorites
  syncPriority: number;      // 1-4 (1=hoogste)
  addedBy: string;           // Wie heeft toegevoegd
  addedAt: DateTime;         // Wanneer toegevoegd
  
  // Power data
  ftp: number;
  ftpWkg: number;
  power5s: number;           // 5s max power
  powerWkg5s: number;        // 5s max w/kg
  // ... tot power20min
  
  // Race stats
  totalWins: number;
  totalPodiums: number;
  totalRaces: number;
  totalDnfs: number;
  
  // Handicaps
  handicapFlat: number;
  handicapRolling: number;
  handicapHilly: number;
  handicapMountainous: number;
  
  // Relaties
  raceRating: RiderRaceRating;
  phenotype: RiderPhenotype;
  raceResults: RaceResult[];
}
```

### Race Rating

**Database tabel:** `rider_race_ratings`

```typescript
{
  riderId: number;
  
  // Current form
  currentRating: number;
  currentRatingDate: DateTime;
  
  // Last rating (vorige meting)
  lastRating: number;
  lastRatingDate: DateTime;
  
  // Max ratings
  max30Rating: number;        // Max laatste 30 dagen
  max30RatingDate: DateTime;
  max90Rating: number;        // Max laatste 90 dagen
  max90RatingDate: DateTime;
  
  // Trend indicators
  formTrend: string;          // "improving", "stable", "declining"
  ratingChange: number;       // Verschil current vs last
}
```

### Phenotype

**Database tabel:** `rider_phenotypes`

```typescript
{
  riderId: number;
  
  // Scores per type (0-100)
  sprinter: number;
  puncheur: number;
  pursuiter: number;
  climber: number;
  tt: number;
  
  // Classification
  primaryType: string;        // "Sprinter", "Climber", etc.
  bias: number;               // Confidence score (0-1)
}
```

---

## 🔄 Sync Strategie

### Automatische Sync

Favorites worden automatisch gesynchroniseerd via cron jobs:

**Configuratie in `src/server.ts`:**
```typescript
// Elke 15 minuten
cron.schedule('*/15 * * * *', async () => {
  logger.info('⏰ Scheduled favorites sync...');
  await syncService.syncFavoriteRiders();
});
```

### Handmatige Sync

Voor directe sync gebruik:
```bash
npm run sync:favorites
```

Of via API:
```bash
curl -X POST http://localhost:3000/api/sync/favorites
```

### Sync Flow

1. **Query favorites** uit database (sorteer op priority)
2. **Loop door riders** met 12s delay tussen calls
3. **Fetch data** van ZwiftRacing API (`/rider/:id`)
4. **Update rider** met full data
5. **Update analytics:**
   - Race rating (current/last/max30/max90)
   - Phenotype (rider type scores)
6. **Log results** (success/error counts)

### Error Handling

- **API errors:** Log warning, continue met volgende rider
- **Rate limits:** Automatische delay tussen calls
- **Sync logs:** Opgeslagen in `sync_logs` tabel

---

## 🛠️ Gebruik Cases

### Use Case 1: Team Management

**Doel:** Volg alle team leden met priority 1

```bash
# Voeg team leden toe
npm run favorites:add 123456 789012 345678 -- --priority 1

# Controleer lijst
npm run favorites:list

# Sync direct
npm run sync:favorites
```

### Use Case 2: Competitor Analysis

**Doel:** Monitor key competitors met verschillende priorities

```bash
# Top competitors (priority 1)
npm run favorites:add 111111 222222 -- --priority 1

# Interessante riders (priority 2)
npm run favorites:add 333333 444444 -- --priority 2

# Archief (priority 4)
npm run favorites:add 555555 -- --priority 4
```

### Use Case 3: Bulk Import

**Doel:** Import grote lijst riders uit bestand

```bash
# Maak bestand met Zwift IDs
cat > competitors.txt << EOF
123456
789012
345678
EOF

# Import met priority 2
npm run favorites:add -- --file competitors.txt --priority 2
```

### Use Case 4: API Integration

**Doel:** Integreer favorites in externe applicatie

```javascript
// Fetch favorites
const response = await fetch('http://localhost:3000/api/favorites');
const favorites = await response.json();

// Filter op priority 1
const teamMembers = favorites.filter(f => f.syncPriority === 1);

// Voeg nieuwe favorite toe
await fetch('http://localhost:3000/api/favorites', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    zwiftId: 123456,
    priority: 1,
    addedBy: 'external-app'
  })
});
```

---

## 📈 Monitoring

### Sync Logs

**Via API:**
```bash
curl http://localhost:3000/api/sync/logs?limit=20
```

**Response:**
```json
[
  {
    "id": 1,
    "syncType": "favorites",
    "status": "success",
    "itemsProcessed": 10,
    "duration": 125000,
    "error": null,
    "timestamp": "2025-10-25T10:00:00.000Z"
  }
]
```

### Sync Stats

```bash
curl http://localhost:3000/api/sync/stats
```

**Response:**
```json
{
  "recentLogs": [...],
  "lastClubSync": "2025-10-25T09:00:00.000Z",
  "lastRidersSync": "2025-10-25T09:15:00.000Z"
}
```

### Database Queries

**Controleer favorites:**
```sql
SELECT 
  zwiftId,
  name,
  syncPriority,
  isFavorite,
  addedBy,
  addedAt
FROM riders
WHERE isFavorite = 1
ORDER BY syncPriority ASC;
```

**Check race ratings:**
```sql
SELECT 
  r.zwiftId,
  r.name,
  rr.currentRating,
  rr.max30Rating,
  rr.max90Rating,
  rr.formTrend
FROM riders r
LEFT JOIN rider_race_ratings rr ON r.id = rr.riderId
WHERE r.isFavorite = 1;
```

---

## ⚠️ Best Practices

### 1. Rate Limiting

**Respecteer API limits:**
- Individual riders: 5 calls/min (12s delay automatisch)
- Sync grote aantallen favorites tijdens rustige uren
- Monitor sync logs voor errors

### 2. Priority Management

**Gebruik priorities strategisch:**
- Priority 1: Team + top 5 competitors (max ~10 riders)
- Priority 2: Belangrijke concurrenten (max ~20 riders)
- Priority 3: Interessante riders (max ~50 riders)
- Priority 4: Archief/historisch (onbeperkt)

### 3. Data Hygiene

**Ruim oude favorites op:**
```bash
# Soft delete (behoud data)
npm run favorites:remove -- --soft 123456

# Hard delete (verwijder alles)
npm run favorites:remove 123456
```

### 4. Monitoring

**Check sync health regelmatig:**
```bash
# Laatste sync logs
curl http://localhost:3000/api/sync/logs?limit=10

# Favorites status
npm run favorites:list
```

---

## 🔧 Troubleshooting

### Probleem: Favorite niet gesynchroniseerd

**Diagnose:**
```bash
# Check sync logs
curl http://localhost:3000/api/sync/logs

# Check favorite bestaat
npm run favorites:list
```

**Oplossing:**
```bash
# Handmatige sync
npm run sync:favorites
```

### Probleem: Rate limit errors

**Symptoom:** `RateLimitError: Rate limit bereikt`

**Oplossing:**
- Wacht 15 minuten (rate limit reset)
- Verklein aantal favorites met priority 1
- Spread sync over meerdere intervallen

### Probleem: Missing analytics data

**Diagnose:**
```sql
SELECT COUNT(*) FROM riders WHERE isFavorite = 1;
SELECT COUNT(*) FROM rider_race_ratings;
SELECT COUNT(*) FROM rider_phenotypes;
```

**Oplossing:**
```bash
# Re-sync favorites (haalt analytics opnieuw op)
npm run sync:favorites
```

### Probleem: Duplicate favorites

**Symptoom:** Rider bestaat al in database

**Oplossing:**
```bash
# Check bestaande rider
curl http://localhost:3000/api/riders/123456

# Soft delete en opnieuw toevoegen indien nodig
npm run favorites:remove -- --soft 123456
npm run favorites:add 123456 -- --priority 1
```

---

## 📚 Zie Ook

- [API.md](./API.md) - Volledige API documentatie
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [Copilot Instructions](../.github/copilot-instructions.md) - Development guidelines
- [Database Schema](../prisma/schema.prisma) - Prisma schema definitie
