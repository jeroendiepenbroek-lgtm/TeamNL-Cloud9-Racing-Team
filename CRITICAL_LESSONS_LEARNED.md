# ⚠️ KRITIEKE LESSEN - LEES DIT EERST!

**Voor**: AI Assistant / Toekomstige ontwikkelaars  
**Laatst bijgewerkt**: 4 december 2025  
**Aanleiding**: Herhaalde fouten door vergeten context

---

## 🎯 TL;DR - Onthoud DIT

1. **ZwiftPower werkt NIET** voor rider 150437 (geen profiel)
2. **Rider endpoint heeft GEEN history** field (alleen race.last.date)
3. **Rate limit = 1/min** voor event results (65 sec wachten!)
4. **Database kolom `raw_data` bestaat NIET** in productie
5. **Sync events handmatig** via `sync-specific-events.ts`

---

## ❌ Fout #1: ZwiftPower gebruiken

### Symptoom
```typescript
await zwiftPowerClient.getRiderResults(150437, 100);
// → Returns: [] (empty array)
```

### Waarom het faalt
- Rider 150437 heeft **GEEN ZwiftPower profiel**
- ZwiftPower API authenticated correct (cookies OK)
- API returnt gewoon 0 results

### Bewijs (getest 4 dec 2025)
```bash
$ npx tsx test-zwiftpower-direct.ts
✅ Logged in, got cookies
2. Fetching rider 150437 results...
✅ Got 0 results  # ← PROBLEEM
```

### ✅ Oplossing
Gebruik **ALLEEN** ZwiftRacing.app API:
```typescript
const results = await zwiftClient.getEventResults(5229579);
// → Werkt! Returns array met alle deelnemers
```

---

## ❌ Fout #2: Rider history verwachten

### Symptoom
```typescript
const rider = await zwiftClient.getRider(150437);
console.log(rider.history); // → undefined ❌
```

### Waarom het faalt
ZwiftRacing.app `/public/riders/{id}` endpoint returnt:
```json
{
  "riderId": 150437,
  "name": "JRøne CloudRacer-9",
  "race": {
    "last": { "date": 1764513000, "rating": 1398.78 },
    "current": { ... },
    "finishes": 22,
    "wins": 0
  }
  // ❌ GEEN "history" field!
}
```

### Bewijs (getest 4 dec 2025)
```bash
$ npx tsx get-rider-history.ts
Available fields: age, club, country, gender, race, riderId, weight
⚠️  No history field found
```

### ✅ Oplossing
Sync events **per event ID**:
```typescript
const eventIds = [5229579, 5206710]; // Handmatig verzamelen
for (const id of eventIds) {
  const results = await zwiftClient.getEventResults(id);
  await saveToDatabase(results);
  await sleep(65000); // Rate limit!
}
```

---

## ❌ Fout #3: Rate limit negeren

### Symptoom
```
AxiosError: Rate limit exceeded: Event results sync
[ZwiftAPI] 🚫 RATE LIMIT (429) - Too many requests
```

### Rate Limits (STRIKT!)
```
getRider()         → 5/min
getEventResults()  → 1/min   ⚠️ CRITICAL
getClubMembers()   → 1/60min
```

### Bewijs (getest 4 dec 2025)
```bash
$ npx tsx sync-missing-events.ts
Event 5206710: ✅ Success
# Zonder sleep(65000)
Event 5229579: ❌ 429 Rate Limit Error
```

### ✅ Oplossing
**ALTIJD** wachten tussen calls:
```typescript
await zwiftClient.getEventResults(5229579);
await sleep(65000); // 65 seconden = veilig
await zwiftClient.getEventResults(5206710);
```

---

## ❌ Fout #4: `raw_data` kolom gebruiken

### Symptoom
```
Error: Could not find the 'raw_data' column of 'zwift_api_race_results' in the schema cache
```

### Waarom het faalt
Database schema (productie) heeft **geen** `raw_data` kolom:
```sql
-- ✅ Bestaat WEL
CREATE TABLE zwift_api_race_results (
  id, event_id, rider_id, event_name, rank, time_seconds, ...
);

-- ❌ Bestaat NIET
raw_data JSONB
```

### Bewijs (getest 4 dec 2025)
```bash
$ npx tsx sync-missing-events.ts
Insert failed: Could not find the 'raw_data' column
```

### ✅ Oplossing
Verwijder `raw_data` uit insert:
```typescript
// ❌ FOUT
const data = { ..., raw_data: riderResult };

// ✅ CORRECT
const data = {
  event_id: String(eventId),
  rider_id: result.riderId,
  rank: result.rank,
  time_seconds: result.finishTimeSeconds,
  // etc - maar GEEN raw_data
};
```

---

## ✅ Bewezen Werkende Aanpak

### Stap 1: Identificeer ontbrekende events

```bash
npx tsx backend/check-missing-events.ts
```

Output toont:
- Huidige events in database (met datums)
- Welke events ontbreken (5206710, 5229579)

### Stap 2: Sync events met rate limiting

```typescript
// backend/sync-specific-events.ts
const EVENTS_TO_SYNC = [
  { id: 5206710, date: '2025-11-27' },
  { id: 5229579, date: '2025-11-30' }
];

for (const event of EVENTS_TO_SYNC) {
  const results = await zwiftClient.getEventResults(event.id);
  
  // Map naar database format (ZONDER raw_data!)
  const mapped = results.map(r => ({
    event_id: String(event.id),
    rider_id: r.riderId,
    event_name: r.eventName,
    rank: r.rank,
    time_seconds: r.finishTimeSeconds,
    avg_wkg: r.avgWkg,
    // ... alle velden BEHALVE raw_data
  }));
  
  await supabase.upsert(mapped);
  
  await sleep(65000); // ⚠️ CRITICAL!
}
```

**Duurt**: ~2 minuten voor 2 events (door rate limit)

### Stap 3: Verify

```bash
npx tsx backend/show-results-direct.ts
# Moet nu 30 results tonen (was 28, +2 nieuwe)
```

---

## 📋 Checklist: Nieuwe Event Toevoegen

Gebruik deze checklist **elke keer**:

- [ ] Event ID verzamelen (bijv. van Zwift Companion app)
- [ ] Check of event al in DB: `check-missing-events.ts`
- [ ] Voeg toe aan `EVENTS_TO_SYNC` in `sync-specific-events.ts`
- [ ] Verwijder `raw_data` uit insert statement (als nog aanwezig)
- [ ] Run sync: `npx tsx sync-specific-events.ts`
- [ ] Wacht geduldig (~65 sec per event)
- [ ] Verify: `check-missing-events.ts` → event moet er zijn
- [ ] Test API: `curl .../api/results/rider/150437?days=30`
- [ ] Check frontend: Results page moet event tonen

---

## 🧠 Voor de AI Assistant

**Start ELKE sessie met dit bestand lezen!**

Wanneer gebruiker vraagt over:
- "ZwiftPower data" → Verwijzen naar Fout #1
- "Rider history" → Verwijzen naar Fout #2  
- "429 error" → Verwijzen naar Fout #3
- "raw_data error" → Verwijzen naar Fout #4

**Test commando's (altijd beschikbaar)**:
```bash
cd /workspaces/TeamNL-Cloud9-Racing-Team/backend

# Status check
npx tsx check-missing-events.ts

# Direct DB query (omzeilt API)
npx tsx show-results-direct.ts

# Test endpoints
npx tsx test-production-api.ts
npx tsx test-http-request.ts

# Sync (rate limited - duurt lang!)
npx tsx sync-specific-events.ts
```

---

## ❌ Fout #5: Unified Tables zijn leeg

### Symptoom
```bash
riders_unified: 1 row   # Alleen POC rider 150437
my_team_members: 75 rows  # Alle team members
# Gap: 74 riders missing!
```

### Waarom het faalt
**Code sync mismatch**:
- Sync service schrijft naar `riders` table (NULL rows)
- Frontend leest van `riders_unified` (1 row)
- Unified architectuur NIET actief sinds POC (3 dec)

**Bewijs (getest 4 dec 2025)**:
```typescript
// backend/src/services/supabase.service.ts line 126
.from('riders')  // ❌ FOUT - zou riders_unified moeten zijn
.upsert(cleaned, { onConflict: 'rider_id' })
```

### ✅ Oplossing
1. Fix `supabase.service.ts` → gebruik `riders_unified`
2. Run full team sync: `POST /api/riders/sync`
3. Verify: `SELECT COUNT(*) FROM riders_unified` → moet 75+ zijn

**Multi-source sync**: Gebruikt 3 APIs zoals gedocumenteerd in `CLEAN_SOURCING_STRATEGY_V2.md`

---

## 📊 Huidige Status (4 dec 2025)

**Database**:
- `zwift_api_race_results`: **28 events** (t/m 24-11-2025)
- `riders_unified`: **1 rider** (❌ moet 75+ zijn!)
- `my_team_members`: **75 riders**
- Ontbreekt: Event 5206710 (27-11), Event 5229579 (30-11)

**API Status**:
- Production: ✅ https://teamnl-cloud9-racing-team-production.up.railway.app
- Endpoint: ✅ GET /api/results/rider/150437?days=30 → 200 OK
- Local: ✅ http://localhost:3000 (running)

**Sync Status**:
- ❌ **KRITIEK**: Unified sync inactief sinds 3 dec (POC)
- `riders` table target ≠ `riders_unified` frontend source
- 74 riders NOT synced to unified table

**Action Required**:
1. Fix table mismatch in `supabase.service.ts`
2. Run team sync om unified te vullen
3. Sync events 5206710 en 5229579

---

**Dit document is de waarheid. Bij twijfel, lees dit opnieuw.**
