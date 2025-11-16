# Rate Limiter System

## Overzicht

Intelligent rate limiting systeem dat **sync conflicts voorkomt** en **ZwiftRacing API rate limits respecteert**.

### Problemen Opgelost
1. ✅ **Duplicate syncs** - Meerdere services die tegelijk dezelfde API endpoints aanroepen
2. ✅ **Rate limit errors** - 429 responses door te frequente calls
3. ✅ **API throttling** - Automatische wait times tussen calls
4. ✅ **Sync conflicts** - Lock mechanisme voorkomt simultane calls

## Rate Limits (Standard Tier)

| Endpoint Type | API Call | Limit | Window |
|--------------|----------|-------|--------|
| **Club Members** | `GET /public/clubs/:id` | 1 call | 60 min |
| **Rider (Individual)** | `GET /public/riders/:id` | 5 calls | 1 min |
| **Rider (Bulk)** | `POST /public/riders` | 1 call | 15 min |
| **Event Details** | `GET /public/events/:id` | 1 call | 1 min |
| **Event Signups** | `GET /api/events/:id/signups` | 1 call | 1 min |
| **Event Results** | `GET /public/results/:id` | 1 call | 1 min |
| **Events Upcoming** | `GET /api/events/upcoming` | 1 call | 1 min |

## Architectuur

### Components

```
┌─────────────────────────────────────────────────┐
│  Sync Services (V2)                             │
│  - RIDER_SYNC                                   │
│  - NEAR_EVENT_SYNC                              │
│  - FAR_EVENT_SYNC                               │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│  ZwiftApiClient                                 │
│  - getClubMembers()                             │
│  - getBulkRiders()                              │
│  - getUpcomingEvents()                          │
│  - getEventSignups()                            │
│  - getEventResults()                            │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│  Rate Limiter (Singleton)                       │
│  - executeWithLimit()                           │
│  - waitForSlot()                                │
│  - recordCall()                                 │
│  - Lock mechanism                               │
└─────────────────────────────────────────────────┘
```

### Flow Diagram

```
[Sync triggers API call]
         │
         ▼
[Check: Can make call?]
         │
    ┌────┴────┐
    │ YES     │ NO
    ▼         ▼
[Execute]  [Wait for slot]
    │         │
    │         ▼
    │    [Sleep until window expires]
    │         │
    └────┬────┘
         ▼
   [Record call timestamp]
         │
         ▼
   [Return result]
```

## Implementatie

### 1. ZwiftApiClient Integratie

Alle API calls zijn gewrapped met `rateLimiter.executeWithLimit()`:

```typescript
// Voor: Direct API call
async getClubMembers(clubId: number): Promise<ZwiftRider[]> {
  const response = await this.client.get(`/public/clubs/${clubId}`);
  return response.data;
}

// Na: Met rate limiting
async getClubMembers(clubId: number): Promise<ZwiftRider[]> {
  return await rateLimiter.executeWithLimit('club_members', async () => {
    const response = await this.client.get(`/public/clubs/${clubId}`);
    return response.data;
  });
}
```

### 2. Automatisch Wachten

Als rate limit bereikt is, wacht het systeem **automatisch**:

```typescript
[RateLimiter] 🚦 Rate limit voor club_members: wacht 45 min (1/60min)
[RateLimiter] ⏳ Waiting for existing lock on rider_bulk
```

### 3. Lock Mechanisme

Voorkomt dat meerdere syncs tegelijk dezelfde endpoint aanroepen:

```typescript
private locks: Map<EndpointType, Promise<void>> = new Map();

async waitForSlot(endpoint: EndpointType): Promise<void> {
  // Check of er al een lock is
  const existingLock = this.locks.get(endpoint);
  if (existingLock) {
    console.log(`[RateLimiter] ⏳ Waiting for existing lock on ${endpoint}`);
    await existingLock;
  }
  
  // Maak nieuwe lock
  const lockPromise = this._waitForSlotInternal(endpoint);
  this.locks.set(endpoint, lockPromise);
  // ...
}
```

## Monitoring

### API Endpoint

**GET** `/api/rate-limiter/status`

Returns real-time status van alle endpoints:

```json
{
  "timestamp": "2025-11-16T20:45:00.000Z",
  "endpoints": [
    {
      "endpoint": "club_members",
      "callsInWindow": 0,
      "maxCalls": 1,
      "canCall": true,
      "waitTimeMs": 0,
      "waitTimeFormatted": "Ready",
      "utilizationPercent": 0,
      "status": "available"
    },
    {
      "endpoint": "rider_bulk",
      "callsInWindow": 1,
      "maxCalls": 1,
      "canCall": false,
      "waitTimeMs": 780000,
      "waitTimeFormatted": "13min",
      "utilizationPercent": 100,
      "status": "rate_limited"
    }
  ],
  "summary": {
    "totalEndpoints": 7,
    "availableEndpoints": 5,
    "rateLimitedEndpoints": 2,
    "maxWaitTimeMs": 780000
  }
}
```

### Testing (Development Only)

**POST** `/api/rate-limiter/reset`

Reset rate limiter state (alleen in development):

```bash
curl -X POST http://localhost:3000/api/rate-limiter/reset
```

## Configuratie

Alle rate limits zijn geconfigureerd in `backend/src/utils/rate-limiter.ts`:

```typescript
private readonly configs: Record<EndpointType, RateLimitConfig> = {
  club_members: {
    maxCalls: 1,
    windowMs: 60 * 60 * 1000,  // 60 minuten
    penaltyMs: 5 * 60 * 1000,  // 5 min extra buffer
  },
  rider_bulk: {
    maxCalls: 1,
    windowMs: 15 * 60 * 1000,  // 15 minuten
    penaltyMs: 2 * 60 * 1000,  // 2 min extra buffer
  },
  // ... andere endpoints
};
```

### Penalty Buffer

Elk endpoint heeft een `penaltyMs` - extra wachttijd na rate limit bereikt:

- **Waarom?** Geeft API server ademruimte om te resetten
- **Voordeel:** Voorkomt edge cases waar je net te vroeg een nieuwe call doet

## Gebruik in Code

### Direct Gebruik

```typescript
import { rateLimiter } from '../utils/rate-limiter.js';

// Check of call mag
if (rateLimiter.canMakeCall('rider_bulk')) {
  // Veilig om te callen
}

// Get wait time
const waitMs = rateLimiter.getWaitTime('rider_bulk');
console.log(`Wait ${waitMs}ms before next call`);

// Execute met auto-wait
await rateLimiter.executeWithLimit('rider_bulk', async () => {
  return await someApiCall();
});
```

### In Sync Services

Sync services hoeven **niets te veranderen** - rate limiting is transparent:

```typescript
// Sync V2 - code blijft hetzelfde!
const clubMembers = await zwiftClient.getClubMembers(clubId);
const ridersData = await zwiftClient.getBulkRiders(riderIds);
const events = await zwiftClient.getUpcomingEvents();
```

Rate limiter handelt alles automatisch af! 🎉

## Benefits

1. ✅ **Zero 429 errors** - Voorkomt rate limit violations
2. ✅ **Automatic recovery** - Wacht automatisch tot call weer mag
3. ✅ **Sync coordination** - Lock mechanisme voorkomt conflicts
4. ✅ **Transparent** - Bestaande code werkt zonder changes
5. ✅ **Monitorable** - Real-time status via API endpoint
6. ✅ **Testable** - Reset functie voor development

## Production Deployment

Rate limiter is **automatisch actief** zodra code deployed is:

1. ✅ Alle API calls in `ZwiftApiClient` zijn gewrapped
2. ✅ Singleton instance (`rateLimiter`) shared tussen alle services
3. ✅ Lock mechanisme voorkomt race conditions
4. ✅ Monitoring endpoint beschikbaar op `/api/rate-limiter/status`

**Geen configuratie nodig!** System is plug-and-play.

## Troubleshooting

### "Still getting 429 errors"

**Mogelijke oorzaken:**
1. Legacy code die direct axios/fetch gebruikt (bypass rate limiter)
2. Rate limit config te agressief (pas `penaltyMs` aan)
3. Multiple server instances (Railway scales horizontaal)

**Oplossing:**
- Zorg dat ALLE API calls via `ZwiftApiClient` gaan
- Verhoog `penaltyMs` in config
- Railway scaling uitschakelen (single instance)

### "Syncs seem slow"

Dit is **normaal gedrag** - rate limiter wacht actief om limits te respecteren.

**Voor snellere syncs:**
- Gebruik bulk endpoints waar mogelijk (`POST /public/riders`)
- Schedule syncs met voldoende tussentijd
- Upgrade naar Premium tier (10x limits)

### "Lock timeout"

Als een lock te lang blijft bestaan:

```typescript
// Development: reset rate limiter
curl -X POST http://localhost:3000/api/rate-limiter/reset
```

Production: restart server (PM2 of Railway redeploy).

## Future Improvements

1. **Persistent state** - Store rate limiter state in Redis/database
2. **Distributed locks** - Voor multi-instance deployments
3. **Smart scheduling** - AI-based optimal sync timing
4. **Premium tier detection** - Auto-adjust limits based on API key tier
5. **Metrics export** - Prometheus/Grafana integration

## Related Documentation

- [SYNC_COORDINATION_STRATEGY.md](./SYNC_COORDINATION_STRATEGY.md) - Overall sync strategie
- [API.md](./API.md) - API endpoint documentatie
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - General troubleshooting
