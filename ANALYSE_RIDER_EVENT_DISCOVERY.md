# 🔍 Analyse: RiderID → EventID Relatie

## Datum: 30 oktober 2025

## Onderzoeksvraag
Hoe kunnen we efficiënt de relatie leggen tussen RiderID en EventID voor US6/US7 implementatie?

---

## API Endpoint Analyse

### ❌ NIET GESCHIKT: GET /public/riders/:id/results

**Test uitgevoerd op rider 150437**:

```json
{
  "riderId": 150437,
  "name": "JRøne | CloudRacer-9 @YouTube",
  "race": {
    "finishes": 24,    // ← Alleen COUNT, geen array!
    "dnfs": 2,
    "wins": 0,
    "podiums": 4,
    "last": { ... },
    "current": { ... },
    "max30": { ... },
    "max90": { ... }
  }
}
```

**Conclusie**: Dit endpoint geeft **statistieken**, niet individual race results.
- ❌ Geen eventId field
- ❌ Geen event lijst
- ❌ Geen datum per race
- ✅ Wel handig voor race stats (finishes count, wins, podiums)

---

## Beschikbare ZwiftRacing.app Endpoints

### Rider Endpoints
1. `GET /public/riders/:id` - Rider profile (geen events)
2. `GET /public/riders/:id/results` - Race **statistieken** (geen event lijst!)
3. `GET /public/riders/:id/:time` - Historical rider profile
4. `POST /public/riders` - Bulk riders (max 1000)
5. `POST /public/riders/:time` - Bulk historical riders

### Event Endpoints
1. `GET /public/results/:eventId` - Event results (rating data)
2. `GET /public/zp/:eventId/results` - ZwiftPower results (power data)

### Club Endpoints
1. `GET /public/clubs/:id` - Club members
2. `GET /public/clubs/:id/:riderId` - Paginated club members

---

## ❓ Missing Link: Rider → Events Discovery

**Probleem**: Er is **GEEN direct endpoint** om van RiderID naar EventIDs te gaan!

### Mogelijke oplossingen:

#### Optie 1: ❌ Scan alle recente events (niet schaalbaar)
```
GET /public/results/:eventId voor ALLE mogelijke eventIds
→ Onmogelijk: we kennen de eventIds niet vooraf
```

#### Optie 2: ⚠️ Via club members (indirect)
```
1. GET /public/clubs/:id → Haal club members
2. Voor elke member: GET /public/riders/:id
3. Check welke riders recent actief waren
4. ???  
→ Nog steeds geen event lijst!
```

#### Optie 3: ✅ Database-driven approach
```
1. Sla event IDs op bij elke sync
2. Bij nieuwe events: fetch /public/results/:eventId
3. Check welke riders uit onze database deelnamen
4. Update rider_event relatie

→ Dit is wat we NU al doen!
```

---

## Huidige Implementatie Review

### Wat werkt er NU al?

**In `src/database/repositories.ts`**:
```typescript
// We HEBBEN al rider → event relatie via RaceResult tabel!
async getRiderEvents(riderId: string, days: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return await prisma.raceResult.findMany({
    where: {
      riderId,
      event: {
        eventDate: { gte: cutoffDate }
      }
    },
    include: { event: true }
  });
}
```

**In `src/api/routes.ts`**:
```typescript
// GET /api/riders/:zwiftId/events
// → Haalt events uit ONZE database, niet direct van API
```

### Het echte probleem

De **EVENT DISCOVERY** gebeurt niet via rider queries, maar via:

1. **Manual sync**: `POST /api/sync/event/:eventId`
2. **Club sync**: Events worden ontdekt bij club member sync
3. **Favorites sync**: Events worden ontdekt bij favorite rider sync

---

## 💡 Belangrijke Inzichten

### Inzicht 1: ZwiftRacing.app heeft geen "list all events" endpoint
De API is **event-centric**, niet rider-centric voor event discovery.

### Inzicht 2: Event discovery moet PROACTIEF
Je moet eventIds kennen (via externe bron of manual input) voordat je ze kunt fetchen.

### Inzicht 3: Huidige strategie is CORRECT
Onze current approach:
1. Fetch known eventIds (manual/scheduled)
2. GET /public/results/:eventId
3. Parse participants → Update rider_event relaties
4. Query database voor rider events

---

## 🎯 Optimalisatie Mogelijkheden voor US6/US7

### US6: Events laatste 90 dagen voor specifieke rider

**Huidige aanpak** (in source-data-collector.ts):
```typescript
// PROBLEEM: getRiderResults() geeft geen eventIds!
const riderResults = await this.apiClient.getRiderResults(riderId);
const recentEvents = riderResults.filter(...); // ← FAALT
```

**FIX optie A - Database first**:
```typescript
async fetchRecentEvents(riderId: number, days: number = 90) {
  // 1. Check database voor bekende events
  const existingEvents = await riderRepo.getRiderEvents(riderId, days);
  
  // 2. Voor events zonder full data: fetch van API
  for (const event of existingEvents) {
    if (!event.hasFullData) {
      await fetchEventData(event.eventId);
    }
  }
  
  // 3. Return wat we hebben
  return existingEvents;
}
```

**FIX optie B - External event source**:
```typescript
async fetchRecentEvents(riderId: number, eventIds: number[]) {
  // Input: KNOWN event IDs (van ZwiftPower, calendar, etc.)
  
  for (const eventId of eventIds) {
    // Fetch full event data
    const results = await apiClient.getResults(eventId);
    
    // Check of onze rider deelnam
    const riderResult = results.find(r => r.riderId === riderId);
    
    if (riderResult) {
      // Sla op in brondatatabellen
      await saveEventData(eventId, results);
    }
  }
}
```

### US7: Hourly scan voor nieuwe events

**Challenge**: Hoe weten we welke events er ZIJN?

**Oplossing 1 - Scheduled event list (preferred)**:
```typescript
// Externe bron: ZwiftPower, Zwift Companion, manual list
const upcomingEvents = [
  { eventId: 5200001, scheduledTime: '2025-10-30T19:00:00Z' },
  { eventId: 5200002, scheduledTime: '2025-10-30T20:00:00Z' },
  // ...
];

// Elke uur: check of events zijn afgelopen
for (const event of upcomingEvents) {
  if (isPastEvent(event.scheduledTime)) {
    await fetchEventResults(event.eventId);
  }
}
```

**Oplossing 2 - Sequential event ID scan (brute force)**:
```typescript
// WAARSCHUWING: Rate limit intensief!
const lastKnownEventId = 5199999;
const maxScanRange = 100;

for (let id = lastKnownEventId; id < lastKnownEventId + maxScanRange; id++) {
  try {
    const results = await apiClient.getResults(id);
    // Event bestaat! Sla op
    await saveEventData(id, results);
  } catch (error) {
    // Event bestaat niet of rate limit
  }
  
  await delay(65000); // 1 call/min rate limit
}
```

---

## 📊 Conclusie & Aanbevelingen

### ✅ Wat werkt NU al
1. Database-driven event queries (`GET /api/riders/:zwiftId/events`)
2. Event sync mechanisme (`POST /api/sync/event/:eventId`)
3. Brondatatabellen voor immutable storage

### ❌ Wat NIET mogelijk is via API
1. Direct RiderID → EventID lijst ophalen
2. "List all recent events" endpoint
3. "Get rider's event participation history" endpoint

### 🚀 Aanbevelingen

**Voor US6** (Events laatste 90 dagen):
```typescript
// OPTIE A: Database-first (snelst)
GET /api/riders/:zwiftId/events?days=90
→ Gebruik bestaande database data

// OPTIE B: Hybrid (compleet)
1. Check database voor bekende events
2. Fetch eventIds van externe bron (ZwiftPower, manual)
3. Voor nieuwe eventIds: fetch via API
4. Update database
```

**Voor US7** (Hourly scanner):
```typescript
// STRATEGIE: Event-centric scanning
1. Maintain list van verwachte events (manual/calendar)
2. Elke uur: scan events die recent zijn afgelopen
3. Voor elk event: fetch results + check for tracked riders
4. Update brondatatabellen + relaties

// OF: Incremental eventId scan
1. Track hoogste bekende eventId
2. Elke uur: try fetching eventId + 1, + 2, ... + 50
3. Stop bij rate limit of X consecutive 404s
4. Risico: mist events met lagere IDs
```

### 🔑 Key Takeaway

**De ZwiftRacing.app API is event-centric, niet rider-centric.**

Voor rider event history moet je:
1. Events EERST ontdekken (via externe bron, manual, incrementeel)
2. Events DAARNA fetchen (GET /public/results/:eventId)
3. Participants PARSEN (check welke riders deelnamen)
4. Relaties OPSLAAN (in database voor snelle queries)

**Onze huidige architectuur doet dit al correct!** 🎉

De brondatatabellen voegen nu toe:
- ✅ Immutable snapshots van event data
- ✅ Rate limit tracking
- ✅ Historical trend analysis
- ✅ Debugging capability

---

## 🔨 Actiepunten

### Bug fix in source-data-collector.ts
```typescript
// HUIDIGE CODE (FOUT):
const riderResults = await this.apiClient.getRiderResults(riderId);
// → Dit geeft GEEN eventIds!

// FIX:
// Gebruik database als bron voor bekende events
const knownEvents = await riderRepo.getRiderEvents(riderId, days);
// OF
// Accept eventIds als parameter (van externe bron)
```

### Nieuwe endpoints overwegen
```typescript
// POST /api/source-data/collect/rider-events
// Body: { riderId: 150437, eventIds: [5200001, 5200002] }
// → Fetch specific events voor rider (targeted approach)

// POST /api/source-data/scan/event-range
// Body: { startEventId: 5200000, endEventId: 5200100 }
// → Incremental event discovery (brute force)
```

---

**Documentatie datum**: 30 oktober 2025  
**Auteur**: TeamNL Cloud9 Development Team  
**Status**: Analyse compleet, implementatie fixes benodigd
