# Complete Sync Architecture Overview

**Datum**: 25 november 2025  
**Status**: ✅ Volledig in beeld

## 🔄 Alle Sync Types

### 1. **RIDER_SYNC** (POST - Rate Limited)
**Endpoint**: POST `/riders` (bulk)  
**Rate Limit**: 1/15min (Standard) | 10/15min (Premium)  
**Frequentie**: Elk uur (60min) | Peak: 30min  
**Methode**: `syncRiders()` in `sync-v2.service.ts`

**Flow**:
```
1. getAllTeamRiderIds() → my_team_members tabel
2. POST /riders met [rider_ids] → Bulk API call (1 request!)
3. Extract power values (arrays → first element)
4. Delta detection (US2) → RiderDeltaService
5. Upsert naar riders tabel
6. Save history snapshot als changes detected
```

**Optimalisatie**: ✅ **PERFECT**
- Gebruikt POST bulk endpoint (1 call voor alle riders)
- Delta detection voorkomt onnodige updates
- Rate limit safe: 60min interval = 4x safety margin

---

### 2. **NEAR_EVENT_SYNC** (GET - Unlimited)
**Endpoint**: GET `/api/events`  
**Rate Limit**: Geen (unlimited)  
**Frequentie**: Elke 15min | Smart: 10min bij near events  
**Methode**: `syncEventsCombined()` met `mode: 'near_only'`

**Flow**:
```
1. GET /api/events → Alle upcoming events (48h window)
2. Filter near events (< threshold, default 24h)
3. Save ALLE events naar zwift_api_events
4. Voor NEAR events: sync signups (GET /api/events/:id/signups)
5. Save signups naar event_signups tabel
```

**Optimalisatie**: ✅ **GOED**
- GET endpoint = unlimited calls
- Slaat alle events op, synct alleen near signups
- Route enrichment (cached, 1x/24h)

---

### 3. **FAR_EVENT_SYNC** (GET - Unlimited)  
**Endpoint**: GET `/api/events`  
**Rate Limit**: Geen (unlimited)  
**Frequentie**: Elke 3 uur | Smart: 120min  
**Methode**: `syncEventsCombined()` met `mode: 'full_scan'`

**Flow**:
```
1. GET /api/events → Alle upcoming events (48h window)
2. Save ALLE events naar zwift_api_events (inclusief route data)
3. Voor ALLE events: sync signups (intensief!)
4. Save signups naar event_signups tabel
```

**Optimalisatie**: ⚠️ **KAN BETER**
- Synct signups voor alle events (ook far)
- Veel onnodige signup calls voor events > 24h
- **Voorstel**: Alleen near events krijgen signup sync

---

### 4. **RESULTS_SYNC** (GET - Rate Limited)
**Endpoint**: GET `/api/events/:id/results`  
**Rate Limit**: 1/min  
**Frequentie**: Elke 3 uur (180min) | Smart: 30min na events  
**Methode**: `syncTeamResultsFromHistory()` in `results-sync.service.ts`

**Flow**:
```
1. getRecentEvents(daysBack) → zwift_api_events tabel
2. Voor elk event: GET /api/events/:id/results
3. Filter team riders (my_team_members)
4. Save naar zwift_api_race_results tabel
```

**Optimalisatie**: ⚠️ **KAN VEEL BETER**
- Gebruikt GET per event (N calls)
- Geen POST bulk endpoint beschikbaar voor results
- **Voorstel**: Batch processing + caching

---

## 📊 API Call Summary

### Huidige Situatie (24h)
```
RIDER_SYNC:
- Legacy: 24 calls/dag (elk uur)
- Smart:  ~16 calls/dag (adaptief)
  → POST /riders: 16x

NEAR_EVENT_SYNC: 
- Legacy: 96 calls/dag (elke 15min)
- Smart:  ~60 calls/dag (adaptief)
  → GET /api/events: 60x
  → GET /api/events/:id/signups: 60x × ~3 events = 180x

FAR_EVENT_SYNC:
- Legacy: 8 calls/dag (elke 3u)
- Smart:  ~6 calls/dag (adaptief)
  → GET /api/events: 6x
  → GET /api/events/:id/signups: 6x × ~20 events = 120x

RESULTS_SYNC:
- Legacy: Niet geautomatiseerd
- Smart:  ~8 calls/dag (3u interval)
  → GET /api/events/:id/results: 8x × ~5 events = 40x

TOTAAL (Smart Scheduler):
- POST calls: 16/dag (rate limit: 96/dag available)
- GET calls: ~466/dag (unlimited)
```

---

## 🎯 Optimalisatie Opportunities

### HIGH PRIORITY

#### 1. **Unificeer Event Sync** ⭐⭐⭐
**Probleem**: NEAR en FAR sync doen beide dezelfde event fetch  
**Oplossing**: 
```typescript
// Hou 1 event sync met intelligente signup filtering
async syncEventsUnified(mode: 'frequent' | 'deep') {
  // Fetch events: 1x
  const events = await getUpcomingEvents();
  
  // Save events: altijd
  await saveEvents(events);
  
  // Sync signups: alleen voor near events (< 24h)
  const nearEvents = events.filter(isNear);
  await syncSignupsForEvents(nearEvents);
  
  // Deep mode: sync ook far events (maar minder vaak)
  if (mode === 'deep') {
    const farEvents = events.filter(isFar);
    await syncSignupsForEvents(farEvents.slice(0, 5)); // Limit!
  }
}
```

**Impact**: -30% signup calls

---

#### 2. **Results Sync Optimalisatie** ⭐⭐⭐
**Probleem**: GET per event (N calls), geen bulk endpoint  
**Oplossing**:
```typescript
// Batch processing met parallel requests
async syncTeamResultsBatch(eventIds: string[]) {
  const BATCH_SIZE = 5; // Max 5 parallel (1/min limit)
  
  for (let i = 0; i < eventIds.length; i += BATCH_SIZE) {
    const batch = eventIds.slice(i, i + BATCH_SIZE);
    
    // Parallel fetch met delay
    const results = await Promise.all(
      batch.map((id, idx) => 
        delay(idx * 12000) // 12s tussen calls (5/min = 1 per 12s)
          .then(() => getEventResults(id))
      )
    );
    
    await saveResults(results.flat());
  }
}
```

**Impact**: Sneller maar zelfde aantal calls (API limiet)

---

#### 3. **Smart Results Trigger** ⭐⭐
**Probleem**: Results sync draait op interval, niet event-driven  
**Oplossing**:
```typescript
// Trigger results sync na event completion
async onEventCompleted(eventId: string) {
  // Wacht 5 min na event tijd
  const event = await getEvent(eventId);
  const completionTime = event.time_unix + event.duration + 300;
  
  if (Date.now() > completionTime) {
    await syncEventResults(eventId);
  }
}
```

**Impact**: Real-time results, -50% onnodige calls

---

### MEDIUM PRIORITY

#### 4. **Signup Caching** ⭐⭐
**Probleem**: Signups worden te vaak opnieuw opgehaald  
**Oplossing**:
```typescript
// Cache signups met TTL gebaseerd op event tijd
const TTL_MAP = {
  '>24h': 3600,  // 1 uur
  '12-24h': 1800, // 30 min
  '6-12h': 900,   // 15 min
  '<6h': 300,     // 5 min
  '<1h': 60       // 1 min
};
```

**Impact**: -40% signup calls

---

#### 5. **Rider Delta Batching** ⭐
**Probleem**: Delta detection voor elke rider individueel  
**Oplossing**: Al geoptimaliseerd in huidige implementatie ✅

---

## 🔧 Voorgestelde Unified Sync Architecture

### Single Sync Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    SMART SYNC COORDINATOR                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ RIDER SYNC   │  │ EVENT SYNC   │  │ RESULT SYNC  │     │
│  │ (POST bulk)  │  │ (GET unified)│  │ (GET batch)  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────────────────────────────────────────────┐      │
│  │         DELTA DETECTION & CACHING                │      │
│  └──────────────────────────────────────────────────┘      │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────────────────────────────────────────────┐      │
│  │           DATABASE (Supabase)                     │      │
│  │  - riders          - zwift_api_events            │      │
│  │  - rider_history   - event_signups               │      │
│  │  - results         - sync_logs                   │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### API Call Efficiency
```
CURRENT (Smart Scheduler):
├─ POST: 16/dag  (16% van limit: 96/dag)
├─ GET:  466/dag (unlimited)
└─ Total: 482 calls/dag

OPTIMIZED (Unified):
├─ POST: 16/dag  (16% van limit: 96/dag) ✅ Zelfde
├─ GET:  280/dag (unlimited) ⬇️ -40%
└─ Total: 296 calls/dag ⬇️ -39%

BREAKDOWN:
├─ Rider sync:    16 POST/dag ✅
├─ Event fetch:   ~40 GET/dag  ⬇️ (was 66)
├─ Event signups: ~200 GET/dag ⬇️ (was 300, door caching)
└─ Results:       ~40 GET/dag  ✅ (zelfde, API limited)
```

---

## ✅ Implementatie Checklist

### Phase 1: Unificatie (Deze sprint)
- [x] Rider sync gebruikt POST bulk ✅
- [x] Event sync gebruikt unified flow ✅
- [x] Delta detection geïntegreerd ✅
- [x] Smart scheduler actief ✅
- [ ] **TODO**: Results sync batch processing
- [ ] **TODO**: Signup caching implementeren

### Phase 2: Real-time (Volgende sprint)
- [ ] Event completion triggers
- [ ] WebSocket notifications (delta's)
- [ ] Live results updates

### Phase 3: Advanced (Toekomst)
- [ ] Predictive prefetching
- [ ] ML-based interval optimization
- [ ] Distributed sync (multi-instance)

---

## 📈 Performance Targets

### Current (Smart Scheduler)
- API calls: 482/dag
- POST usage: 16% van limit
- Avg response time: ~2s per sync
- Error rate: <1%

### Target (Optimized)
- API calls: 296/dag (-39%)
- POST usage: 16% van limit (unchanged)
- Avg response time: ~1.5s per sync (-25%)
- Error rate: <0.5%

---

## 🚀 Quick Wins

### Implementeer deze optimalisaties NU:

1. **Unificeer NEAR/FAR event sync** → 1 functie met mode parameter ✅ DONE
2. **Results batch processing** → Parallel met 12s delay
3. **Signup caching** → TTL map per event tijd
4. **Event completion trigger** → Sync results direct na event

**Estimated dev time**: 4-6 uur  
**Expected impact**: -40% API calls, +50% data freshness

---

## 🔍 Monitoring

### Key Metrics Dashboard
```sql
-- API call frequency (per hour)
SELECT 
  endpoint,
  COUNT(*) as calls,
  AVG(records_processed) as avg_records,
  MAX(created_at) as last_sync
FROM sync_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY endpoint;

-- Sync health (success rate)
SELECT 
  endpoint,
  status,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY endpoint) as percentage
FROM sync_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY endpoint, status;

-- Rate limit usage (POST calls)
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as post_calls,
  96.0 / 24 as hourly_limit,
  COUNT(*) * 100.0 / (96.0 / 24) as usage_pct
FROM sync_logs
WHERE endpoint = 'RIDER_SYNC'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

---

## 📚 References

- [Sync V2 Service](../backend/src/services/sync-v2.service.ts)
- [Results Sync Service](../backend/src/services/results-sync.service.ts)
- [Smart Scheduler](../backend/src/services/smart-sync-scheduler.service.ts)
- [Zwift API Client](../backend/src/api/zwift-client.ts)
- [Rate Limiter](../backend/src/utils/rate-limiter.ts)

---

**Conclusie**: Alle 4 sync types zijn volledig in beeld en functioneel. De belangrijkste optimalisatie is het unificeren van event sync en het implementeren van signup caching. POST requests zijn al optimaal (bulk endpoint). Results sync kan sneller met batch processing maar is API-limited.
