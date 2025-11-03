# EventID ↔ RiderID Relatie Documentatie

## 📊 Database Schema

### Tabel Structuur
```
┌─────────┐         ┌──────────────┐         ┌─────────┐
│ events  │◄────────│ race_results │────────►│ riders  │
│         │         │              │         │         │
│ id (PK) │         │ eventId (FK) │         │ id (PK) │
│ name    │         │ riderId (FK) │         │ zwiftId │
│ date    │         │ position     │         │ name    │
│ ...     │         │ power        │         │ ...     │
└─────────┘         │ speed        │         └─────────┘
                    │ ...          │
                    └──────────────┘
```

### race_results - De Relatie Tabel
Dit is de **koppeltabel** (many-to-many relatie):
- `eventId` → Verwijst naar `events.id`
- `riderId` → Verwijst naar `riders.id`  
- Bevat ook race data: `position`, `averagePower`, `averageSpeed`, etc.

## 🔗 Relaties in de API

### 1. Event → Riders ophalen
**Endpoint**: `GET /api/events/:eventId/results`
```typescript
// Haal alle riders op die in een event gereden hebben
const results = await prisma.race_results.findMany({
  where: { eventId: 5163788 },
  include: { 
    rider: true  // Join met riders tabel
  }
});
```

**Response**:
```json
{
  "eventId": 5163788,
  "eventName": "ZwiftNL Racing League - Race 2",
  "results": [
    {
      "position": 48,
      "riderId": 1,
      "riderName": "JRøne | CloudRacer-9 @YouTube",
      "zwiftId": 150437,
      "averagePower": null,
      "time": "00:32:15"
    }
  ]
}
```

### 2. Rider → Events ophalen
**Endpoint**: `GET /api/riders/:riderId/events`
```typescript
// Haal alle events op waar een rider in gereden heeft
const results = await prisma.race_results.findMany({
  where: { riderId: 1 },
  include: { 
    event: true  // Join met events tabel
  },
  orderBy: { event: { eventDate: 'desc' } }
});
```

**Response**:
```json
{
  "riderId": 1,
  "riderName": "JRøne | CloudRacer-9 @YouTube",
  "events": [
    {
      "eventId": 5163788,
      "eventName": "ZwiftNL Racing League - Race 2",
      "eventDate": "2025-10-25T19:00:00Z",
      "position": 48,
      "distance": 32000
    }
  ]
}
```

### 3. Event + Rider samen opslaan (US1)
**Endpoint**: `POST /api/riders/:riderId/fetch-events`
```typescript
// Service: RiderEventsService.fetchRiderEvents()

// 1. Fetch rider history van ZwiftRacing.app
const response = await zwiftApi.getRiderResults(riderId);

// 2. Extract events uit race.history[]
const events = response.race.history.map(h => ({
  id: h.event.id,
  name: h.event.name,
  eventDate: h.eventDate,
  // ...
}));

// 3. Save events (upsert)
for (const event of events) {
  await prisma.events.upsert({
    where: { id: event.id },
    create: { ...event, dataSource: 'zwiftracing_scrape' },
    update: { ...event }
  });

  // 4. Create race_result (DE RELATIE!)
  await prisma.race_results.upsert({
    where: { id: `${riderId}-${event.id}` },
    create: {
      eventId: event.id,      // ← Event koppeling
      riderId: riderId,       // ← Rider koppeling
      position: h.position,
      category: h.category,
      // ...
    }
  });
}
```

## 🎯 Key Insights

### De relatie wordt ALTIJD via race_results gelegd

❌ **Fout**: Direct events aan riders linken
```typescript
await prisma.riders.update({
  where: { id: riderId },
  data: { events: [eventId] }  // Dit bestaat niet!
});
```

✅ **Correct**: Via race_results koppelen
```typescript
await prisma.race_results.create({
  data: {
    eventId: eventId,
    riderId: riderId,
    position: 12,
    // ... meer race data
  }
});
```

### Waarom deze structuur?
1. **Many-to-many**: Meerdere riders per event, meerdere events per rider
2. **Extra data**: race_results bevat ook position, power, speed, etc.
3. **Flexibiliteit**: Events kunnen bestaan zonder riders (nog niet ingeschreven)
4. **Historie**: Race results blijven bewaard, ook als rider deleted wordt

## 📝 Huidige Status (na mock cleanup)

```sql
-- Database bevat nu:
Total events: 26         -- Alle real data van ZwiftRacing.app
Total race_results: 26   -- Alle gekoppeld aan rider 150437
Total riders: 1          -- JRøne | CloudRacer-9 @YouTube

-- Mock events (5001-5005) zijn verwijderd ✅
```

## 🔄 Data Flow Diagram

```
ZwiftRacing.app API
       ↓
GET /public/riders/150437/results
       ↓
    {
      race: {
        history: [
          { event: { id, name }, position, date }
        ]
      }
    }
       ↓
RiderEventsService.fetchRiderEvents()
       ↓
    ┌────────────────────┐
    │ 1. Save to events  │
    └────────┬───────────┘
             ↓
    ┌────────────────────────────┐
    │ 2. Create race_results     │
    │    - eventId (FK)          │
    │    - riderId (FK)          │
    │    - position, category    │
    └────────────────────────────┘
             ↓
    Database heeft nu:
    - Event record (id=5163788)
    - Race result (eventId=5163788, riderId=1, position=48)
    - Rider kan events ophalen via JOIN
```

## 🚀 API Endpoints Overzicht

| Endpoint | Relatie | Beschrijving |
|----------|---------|--------------|
| `POST /api/riders/:riderId/fetch-events` | Rider → Events | Fetch events voor rider, create race_results |
| `GET /api/riders/:riderId/events` | Rider → Events | Haal alle events op van een rider |
| `GET /api/events/:eventId/results` | Event → Riders | Haal alle riders op van een event |
| `POST /api/riders/scan-all-events` | Bulk Rider → Events | Scan alle favorite riders |
| `DELETE /api/events/cleanup` | N/A | Cleanup oude events + results |

## 💡 Praktijk Voorbeelden

### Voorbeeld 1: Fetch nieuwe events voor een rider
```bash
curl -X POST http://localhost:3000/api/riders/150437/fetch-events
```
Dit doet:
1. Haalt race history op van ZwiftRacing.app
2. Slaat events op in `events` tabel
3. **Legt relatie** via `race_results` tabel met `eventId` + `riderId`

### Voorbeeld 2: Zie alle events van een rider
```bash
curl http://localhost:3000/api/riders/150437/events
```
Query achter de schermen:
```sql
SELECT e.*, rr.position, rr.category
FROM race_results rr
JOIN events e ON rr.eventId = e.id
WHERE rr.riderId = 1
ORDER BY e.eventDate DESC;
```

### Voorbeeld 3: Zie alle deelnemers van een event
```bash
curl http://localhost:3000/api/events/5163788/results
```
Query achter de schermen:
```sql
SELECT r.*, rr.position, rr.averagePower
FROM race_results rr
JOIN riders r ON rr.riderId = r.id
WHERE rr.eventId = 5163788
ORDER BY rr.position ASC;
```

## 🔍 Database Queries Cheat Sheet

### Hoeveel events heeft rider X?
```sql
SELECT COUNT(*) FROM race_results WHERE riderId = 1;
```

### Hoeveel riders in event X?
```sql
SELECT COUNT(*) FROM race_results WHERE eventId = 5163788;
```

### Top 10 posities van rider X?
```sql
SELECT e.name, rr.position, e.eventDate
FROM race_results rr
JOIN events e ON rr.eventId = e.id
WHERE rr.riderId = 1
ORDER BY rr.position ASC
LIMIT 10;
```

### Events zonder results (nog niemand gestart)?
```sql
SELECT e.* FROM events e
LEFT JOIN race_results rr ON e.id = rr.eventId
WHERE rr.id IS NULL;
```

## ✅ Conclusie

De **Event ↔ Rider relatie** wordt gelegd via de `race_results` tabel:
- **Foreign Keys**: `eventId` + `riderId`
- **Extra Data**: position, power, speed, time, etc.
- **API Pattern**: Fetch rider history → Save events → Create race_results (relatie)
- **Database Pattern**: Many-to-many met extra attributen

**Mock data is volledig verwijderd** - Alle 26 events zijn nu real data! 🎉
