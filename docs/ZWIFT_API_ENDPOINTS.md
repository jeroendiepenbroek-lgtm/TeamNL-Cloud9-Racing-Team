# ZwiftRacing.app API - Complete Endpoint Reference

**Base URL:** `https://zwift-ranking.herokuapp.com`  
**Authentication:** `x-api-key` header vereist

---

## 📊 Rate Limits Overzicht

| Category | Standard Tier | Premium Tier |
|----------|--------------|--------------|
| **Clubs** | 1 call / 60 min | 10 calls / 60 min |
| **Results** | 1 call / 1 min | 1 call / 1 min |
| **Riders (GET)** | 5 calls / 1 min | 10 calls / 1 min |
| **Riders (POST)** | 1 call / 15 min | 10 calls / 15 min |

⚠️ **Let op:** POST endpoints zijn veel efficiënter voor bulk operations!

---

## 🏆 Clubs Endpoints

### GET `/public/clubs/<id>`
Haal actieve club members op, gesorteerd op riderId.

**Rate limit:** 1/60min (Standard) | 10/60min (Premium)  
**Max results:** 1000

**Voorbeeld:**
```bash
curl -H "x-api-key: YOUR_KEY" \
  https://zwift-ranking.herokuapp.com/public/clubs/11818
```

**Response:** Array van `ZwiftRider` objecten

**Implementation:**
```typescript
await zwiftClient.getClubMembers(11818);
```

---

### GET `/public/clubs/<id>/<riderId>`
Haal club members op met riderId > `<riderId>` (voor paginatie bij grote clubs).

**Rate limit:** 1/60min (Standard) | 10/60min (Premium)  
**Max results:** 1000 per page

**Voorbeeld:**
```bash
curl -H "x-api-key: YOUR_KEY" \
  https://zwift-ranking.herokuapp.com/public/clubs/11818/100000
```

**Use case:** Als een club > 1000 leden heeft, kun je pagina's ophalen:
```typescript
const page1 = await zwiftClient.getClubMembers(11818);
const lastId = page1[page1.length - 1].riderId;
const page2 = await zwiftClient.getClubMembersPaginated(11818, lastId);
```

---

## 🏁 Results Endpoints

### GET `/public/results/<eventId>`
Haal ZwiftRacing.app resultaten op voor een event.

**Rate limit:** 1/1min (beide tiers)

**Voorbeeld:**
```bash
curl -H "x-api-key: YOUR_KEY" \
  https://zwift-ranking.herokuapp.com/public/results/4879983
```

**Implementation:**
```typescript
await zwiftClient.getEventResults(4879983);
```

---

### GET `/public/zp/<eventId>/results`
Haal ZwiftPower resultaten op voor een event.

**Rate limit:** 1/1min (beide tiers)

**Voorbeeld:**
```bash
curl -H "x-api-key: YOUR_KEY" \
  https://zwift-ranking.herokuapp.com/public/zp/4879983/results
```

**Implementation:**
```typescript
await zwiftClient.getEventResultsZwiftPower(4879983);
```

**Verschil met `/public/results`:**
- ZwiftPower heeft stricter DQ-regels en cat enforcement
- ZwiftRacing.app toont "raw" resultaten zoals ze binnenkomen

---

## 🚴 Riders Endpoints (GET)

### GET `/public/riders/<riderId>`
Haal huidige rider data op voor een enkele rider.

**Rate limit:** 5/1min (Standard) | 10/1min (Premium)

**Voorbeeld:**
```bash
curl -H "x-api-key: YOUR_KEY" \
  https://zwift-ranking.herokuapp.com/public/riders/5574
```

**Implementation:**
```typescript
await zwiftClient.getRider(5574);
```

---

### GET `/public/riders/<riderId>/<time>`
Haal rider data op zoals deze was op een specifiek tijdstip (historische snapshot).

**Rate limit:** 5/1min (Standard) | 10/1min (Premium)

**Parameters:**
- `<time>` = Unix epoch timestamp **zonder milliseconden** (10 cijfers)

**Voorbeeld:**
```bash
# 1 januari 2025 00:00:00 UTC = 1735689600
curl -H "x-api-key: YOUR_KEY" \
  https://zwift-ranking.herokuapp.com/public/riders/5574/1735689600
```

**Implementation:**
```typescript
const epochTime = Math.floor(Date.now() / 1000); // Huidige tijd
const historicTime = 1735689600; // 1 jan 2025

await zwiftClient.getRiderAtTime(5574, historicTime);
```

**Use case:** Vergelijk rider stats over tijd:
```typescript
const now = await zwiftClient.getRider(5574);
const monthAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
const past = await zwiftClient.getRiderAtTime(5574, monthAgo);

console.log(`Ranking progression: ${past.ranking} → ${now.ranking}`);
```

---

## 🚴 Riders Endpoints (POST) ⚡ BULK

### POST `/public/riders`
Haal huidige rider data op voor **meerdere riders tegelijk** (tot 1000!).

**Rate limit:** 1/15min (Standard) | 10/15min (Premium)  
**Max:** 1000 rider IDs per call

**Voorbeeld:**
```bash
curl -X POST \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '[8, 5574, 150437]' \
  https://zwift-ranking.herokuapp.com/public/riders
```

**Request body:** JSON array van rider IDs
```json
[8, 5574, 150437, 100000, ...]
```

**Implementation:**
```typescript
const riderIds = [8, 5574, 150437];
const riders = await zwiftClient.getBulkRiders(riderIds);
// Returns array of ZwiftRider objects
```

**Performance vergelijking:**
```
❌ Individuele GET (5/min): 200 riders = 40 minuten
✅ Bulk POST (1/15min): 200 riders = 1 call = 15 seconden
```

---

### POST `/public/riders/<time>`
Haal rider data op voor meerdere riders zoals deze waren op een specifiek tijdstip.

**Rate limit:** 1/15min (Standard) | 10/15min (Premium)  
**Max:** 1000 rider IDs per call

**Voorbeeld:**
```bash
curl -X POST \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '[8, 5574, 150437]' \
  https://zwift-ranking.herokuapp.com/public/riders/1735689600
```

**Implementation:**
```typescript
const riderIds = [8, 5574, 150437];
const historicTime = 1735689600; // 1 jan 2025
const riders = await zwiftClient.getBulkRidersAtTime(riderIds, historicTime);
```

**Use case:** Bulk historische snapshots voor team analytics:
```typescript
// Haal team rankings op van 1 maand geleden
const teamIds = [150437, 8, 5574, ...]; // Alle team members
const monthAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
const historicData = await zwiftClient.getBulkRidersAtTime(teamIds, monthAgo);

// Vergelijk met huidige data
const currentData = await zwiftClient.getBulkRiders(teamIds);
```

---

## 💡 Best Practices

### 1. Gebruik POST voor bulk operations
```typescript
// ❌ Inefficiënt - 200 API calls
for (const id of riderIds) {
  await zwiftClient.getRider(id);
  await sleep(12000); // 5/min rate limit
}

// ✅ Efficiënt - 1 API call
const riders = await zwiftClient.getBulkRiders(riderIds);
```

### 2. Batch grote datasets
```typescript
const allIds = [...]; // 2500 rider IDs

// Split in chunks van 1000 (API maximum)
const chunks = [];
for (let i = 0; i < allIds.length; i += 1000) {
  chunks.push(allIds.slice(i, i + 1000));
}

// Haal elke chunk op met rate limit tussentijd
for (const chunk of chunks) {
  const riders = await zwiftClient.getBulkRiders(chunk);
  // Process riders...
  
  if (chunks.indexOf(chunk) < chunks.length - 1) {
    await sleep(15 * 60 * 1000); // 15 min wachten (rate limit)
  }
}
```

### 3. Gebruik paginatie voor grote clubs
```typescript
async function getAllClubMembers(clubId: number): Promise<ZwiftRider[]> {
  let allMembers: ZwiftRider[] = [];
  let lastRiderId = 0;
  
  while (true) {
    const page = lastRiderId === 0 
      ? await zwiftClient.getClubMembers(clubId)
      : await zwiftClient.getClubMembersPaginated(clubId, lastRiderId);
    
    if (page.length === 0) break;
    
    allMembers = allMembers.concat(page);
    lastRiderId = page[page.length - 1].riderId;
    
    if (page.length < 1000) break; // Laatste pagina
    
    await sleep(60 * 60 * 1000); // 1 uur wachten (rate limit!)
  }
  
  return allMembers;
}
```

### 4. Logging en monitoring
Alle calls worden automatisch gelogd via axios interceptors:
```
[ZwiftAPI] POST /public/riders
[ZwiftAPI] ✅ /public/riders → 200
```

Bij errors:
```
[ZwiftAPI] ❌ /public/riders → 429
```

---

## 🔍 Endpoint Status in Codebase

| Endpoint | Status | Method Name |
|----------|--------|-------------|
| `GET /public/clubs/<id>` | ✅ Implemented | `getClubMembers()` |
| `GET /public/clubs/<id>/<riderId>` | ✅ Implemented | `getClubMembersPaginated()` |
| `GET /public/results/<eventId>` | ✅ Implemented | `getEventResults()` |
| `GET /public/zp/<eventId>/results` | ✅ Implemented | `getEventResultsZwiftPower()` |
| `GET /public/riders/<riderId>` | ✅ Implemented | `getRider()` |
| `GET /public/riders/<riderId>/<time>` | ✅ Implemented | `getRiderAtTime()` |
| `POST /public/riders` | ✅ Implemented | `getBulkRiders()` |
| `POST /public/riders/<time>` | ✅ Implemented | `getBulkRidersAtTime()` |

### Legacy/Deprecated Methods
- `getClub()` → gebruik `getClubMembers()`
- `getClubRiders()` → gebruik `getClubMembers()`
- `getClubEvents()` → ❌ endpoint bestaat niet in API
- `getRiderHistory()` → ❌ endpoint bestaat niet in API

---

## 📚 Gerelateerde Documentatie

- **Type definities:** `backend/src/types/index.ts`
- **Service layer:** `backend/src/services/sync.service.ts`
- **Rate limiting configuratie:** Axios interceptors in `zwift-client.ts`

---

## 🎯 Use Cases

### Team Bulk Import (US3)
```typescript
// Parse CSV met rider IDs
const riderIds = parseCSV(file); // [150437, 8, 5574, ...]

// Haal alle rider data op in 1 call
const riders = await zwiftClient.getBulkRiders(riderIds);

// Insert in database
for (const rider of riders) {
  await supabaseService.addMyTeamMember(rider.zwiftId, rider.name);
}
```

### Historische Snapshots voor Analytics
```typescript
// Maak maandelijkse snapshot van team
const teamIds = await supabaseService.getMyTeamMemberIds();
const epochTime = Math.floor(Date.now() / 1000);
const snapshot = await zwiftClient.getBulkRidersAtTime(teamIds, epochTime);

// Sla op in rider_snapshots table
await supabaseService.saveRiderSnapshots(snapshot, epochTime);
```

### Club Sync met Paginatie
```typescript
// Haal alle 2500+ club members op
const allMembers = await getAllClubMembers(11818); // Gebruikt paginatie
await supabaseService.bulkUpsertRiders(allMembers);
```
