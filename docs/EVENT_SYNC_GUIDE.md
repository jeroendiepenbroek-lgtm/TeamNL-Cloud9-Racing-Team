# Event Results Sync - Quick Guide

## 📊 Status
- ✅ Server draait op http://localhost:3000
- ✅ Rider 150437 (JRøne) in database
- ✅ Club data gesynchroniseerd  
- ✅ 4 historical snapshots aanwezig
- ⚠️  0 race results (nog te syncen)

## 🎯 Hoe Race Results Te Syncen

### Optie 1: Via API Endpoint (Recommended)

**Stap 1:** Vind een geldig event ID
- Bezoek https://zwiftracing.app
- Zoek naar rider: JRøne / 150437
- Klik op race history
- Event IDs staan in de URL: `/event/XXXXX`

**Stap 2:** Sync het event
```bash
curl -X POST http://localhost:3000/api/sync/event/YOUR_EVENT_ID
```

**Stap 3:** Check resultaten
```bash
# Via database query
npx tsx scripts/test-rider-relations.ts

# Via API
curl http://localhost:3000/api/riders/150437/results
```

### Optie 2: Via Script

```bash
# Met specifiek event ID
npx tsx scripts/sync-event-manual.ts 4200000

# Check resultaten
npx tsx scripts/test-rider-relations.ts
```

### Optie 3: Direct via API Client

```bash
# Start Node REPL met TypeScript support
node --loader tsx
```

```javascript
// In REPL:
import { ZwiftApiClient } from './src/api/zwift-client.js';
import { ResultRepository } from './src/database/repositories.js';

const client = new ZwiftApiClient({
  apiKey: '650c6d2fc4ef6858d74cbef1',
  baseUrl: 'https://zwift-ranking.herokuapp.com'
});

// Test een event ID
const eventId = 4200000; // Vervang met echte ID
const results = await client.getResults(eventId);
console.log(`${results.length} results gevonden`);

// Sla op in database
const repo = new ResultRepository();
await repo.upsertResultsBulk(results, 'zwiftranking');
console.log('Results opgeslagen!');
```

## 📋 Beschikbare API Endpoints

### Sync Endpoints
- `POST /api/sync/event/:eventId` - Sync event results
- `POST /api/sync/club` - Sync club members
- `GET /api/sync/logs` - Bekijk sync logs
- `GET /api/sync/stats` - Sync statistieken

### Results Endpoints  
- `GET /api/results/:eventId` - Event results uit database
- `GET /api/riders/:zwiftId/results` - Rider results
- `GET /api/club/results` - Club results

### Rider Endpoints
- `GET /api/riders/:zwiftId` - Rider profile
- `GET /api/riders/:zwiftId/history` - Historical data
- `GET /api/club/members` - All club members

## ⚠️ Rate Limits

- **Event Results Sync**: 1 call per minuut
- **Club Sync**: 1 call per 60 minuten
- **Individual Rider**: 5 calls per minuut

## 🔍 Event ID voorbeelden

Omdat we geen directe API hebben om events van een rider op te halen, moet je event IDs handmatig vinden via:

1. **ZwiftRacing.app**
   - https://zwiftracing.app/rider/150437
   - Bekijk race history
   - Event IDs in URL

2. **ZwiftPower** (alternatief)
   - https://zwiftpower.com
   - Zoek rider
   - Event IDs in results

3. **Common Event Series** (voorbeeld ranges):
   - WTRL events: 4000000 - 4100000
   - ZRL events: 3900000 - 4000000
   - Community: 3800000 - 3900000
   - Recent events: 4100000+

## 📊 Test Flow

```bash
# 1. Check huidige status
npx tsx scripts/test-rider-relations.ts

# 2. Sync een event (vervang EVENT_ID)
curl -X POST http://localhost:3000/api/sync/event/EVENT_ID

# 3. Check opnieuw
npx tsx scripts/test-rider-relations.ts

# 4. Bekijk logs
curl http://localhost:3000/api/sync/logs | jq '.[0:5]'
```

## 💡 Tips

1. **Vind recente events**: Rider 150437 was laatst actief op 2025-10-23, dus zoek events rond die datum

2. **Test met kleine events**: Begin met een klein event (< 50 deelnemers) om snel te testen

3. **Check logs**: Bij errors, check `/api/sync/logs` voor details

4. **Bulk sync**: Voor meerdere events, wacht 65 seconden tussen calls (rate limit)

## 🚀 Volgende Stappen

Na successful event sync:
1. **Statistics worden automatisch berekend** (via RiderStatistics model)
2. **Historical snapshots** worden bijgewerkt bij grote wijzigingen
3. **Leaderboards** kunnen worden gegenereerd via SQL queries (zie docs/SQL_QUERIES.md)
4. **Frontend dashboard** kan results tonen

## 📚 Meer Informatie

- API documentatie: `docs/API.md`
- Endpoint overview: `docs/ENDPOINTS_OVERVIEW.md`
- SQL queries: `docs/SQL_QUERIES.md`
- Relatie tabel: `docs/RELATIE_TABEL.md`
