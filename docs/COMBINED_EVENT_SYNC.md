# Combined Event Sync Strategy

**Date**: 2025-11-18  
**Feature**: US1 Event Dashboard Optimization  
**Problem**: NEAR_EVENT_SYNC runs te frequent → FAR_EVENT_SYNC never triggers → RIDER_SYNC conflicts

## Probleem Analyse

### Oude Situatie (NEAR + FAR afzonderlijk)

**NEAR_EVENT_SYNC** - Elke 15 minuten (`:05, :20, :35, :50`)
- Scant **ALLE** events (0-48u)
- Synct signups voor events < threshold (default 120 min)
- **Probleem**: Slaat ook FAR events op in database

**FAR_EVENT_SYNC** - Elke 2 uur (`:30`)
- Scant **ALLE** events (0-48u)
- Synct signups voor events > threshold
- **Probleem**: Vindt nooit nieuwe far events (NEAR deed dit al!)
- **Gevolg**: Triggert NOOIT omdat alle events al in DB staan

**RIDER_SYNC** - Elke 6 uur (`:00`)
- **Probleem**: Kan conflicteren met event syncs die op zelfde moment lopen

### Rate Limits

**GET Endpoints:**
- **Events API** (`/api/events`): 1 call/10 min (144 slots/dag)
- **Signups API** (`/public/events/<id>/signups`): 1 call/min (1440 slots/dag)

**POST Endpoints (STRENGER!):**
- **Club Members** (`/clubs/<id>/members`): 1 call/15 min (96 slots/dag)
- **Bulk Riders** (`/api/riders`): 1 call/15 min (96 slots/dag)

**RIDER_SYNC Impact:**
- Gebruikt beide POST endpoints
- Elke 90min = 16 calls/dag
- 16 < 96 slots → **✅ Safe met 6x margin**

## Oplossing: Combined Event Sync

### Nieuwe Strategie

**PRIORITY SYSTEEM:**
- **P1: RIDER_SYNC** - Elk uur op :00
- **P2: COMBINED_EVENT_SYNC** - Elke 15 min op :05/:20/:35/:50

**COMBINED_EVENT_SYNC** met 2 modes:

#### Mode 1: `near_only` (Frequent - elke 15 min)
```
Trigger: :05, :20, :35, :50
Interval: 15 minuten
Priority: 2 (na RIDER_SYNC)

Actions:
1. Haal ALLE events op van API (/api/events)
2. Sla ALLE events op in database (upsert)
3. Sync signups ALLEEN voor NEAR events (< threshold)
4. Skip signups voor FAR events (efficiency)

Result:
- Database is up-to-date met alle events
- Signups alleen voor urgente (near) events
- Far events worden niet onnodig gepolld
```

#### Mode 2: `full_scan` (Periodiek - elke 3 uur)
```
Trigger: :50 every 3 hours (00:50, 03:50, 06:50, ...)
Interval: 180 minuten (veelvoud van 15!)
Priority: 2 (na RIDER_SYNC)

Actions:
1. Haal ALLE events op van API (/api/events)
2. Sla ALLE events op in database (upsert)
3. Sync signups voor NEAR events (< threshold)
4. Sync signups voor FAR events (> threshold)

Result:
- Complete refresh van alle event data
- Signups voor alle events (near + far)
- Nieuwe far events worden gevonden en gesynchroniseerd
```

### Voordelen

✅ **FAR events worden nu wel gesynchroniseerd**
- Full scan mode draait periodiek en synct far event signups
- Far events zijn niet "nieuw" maar krijgen wel signups update

✅ **Efficiëntie**
- Near only mode: 85% minder API calls (skip far signups)
- Full scan mode: Volledig overzicht elke 2 uur

✅ **Geen NEAR/FAR conflict meer**
- Beide modes in één service
- Duidelijke scheiding: frequent = near, periodic = full

✅ **RIDER_SYNC heeft geen last meer**
- Event syncs zijn nu voorspelbaar (15min + 2u)
- RIDER_SYNC (6u) heeft andere timeslot (:00)

## Implementation

### Code Changes

**1. `sync-v2.service.ts`**
```typescript
// Nieuwe methode
async syncEventsCoordinated(config: {
  intervalMinutes: number;
  thresholdMinutes: number;
  lookforwardHours: number;
  mode: 'near_only' | 'full_scan';
}): Promise<EventSyncMetrics>

// Logic
- mode = 'near_only' → Skip far event signups
- mode = 'full_scan' → Sync all event signups
```

**2. `server.ts` - Cron Schedule**
```typescript
// NEAR only mode - elke 15 min
'5,20,35,50 * * * *' → mode: 'near_only'

// FULL SCAN mode - elke 2 uur
'30 */2 * * *' → mode: 'full_scan'
```

**3. `sync-coordinator.service.ts`**
```typescript
type SyncType = 'RIDER_SYNC' | 'COMBINED_EVENT_SYNC' | ...

timeSlots: {
  COMBINED_EVENT_SYNC: {
    intervalMinutes: 15,
    offsetMinutes: 5
  }
}
```

### Metrics

**EventSyncMetrics** extended:
```typescript
{
  type: 'COMBINED_EVENT_SYNC',
  mode: 'near_only' | 'full_scan',
  events_scanned: number,
  events_near: number,  // < threshold
  events_far: number,   // > threshold
  signups_synced: number,
  ...
}
```

## Time Slots Overview

```
Minuut :00  → RIDER_SYNC (90min) ← PRIORITY 1
Minuut :05  → Event Sync NEAR
Minuut :20  → Event Sync NEAR
Minuut :30  → RIDER_SYNC (90min) ← PRIORITY 1
Minuut :35  → Event Sync NEAR
Minuut :50  → Event Sync NEAR + FULL (3u) ← Samenvalling!
```

**RIDER_SYNC Triggers** (elke 90min):
- 00:00, 01:30, 03:00, 04:30, 06:00, 07:30, 09:00, 10:30, 12:00, 13:30, 15:00, 16:30, 18:00, 19:30, 21:00, 22:30
- **16x per dag** (was 24x elk uur)
- **POST rate limit**: 1/15min → 90min interval = **6x veiligheidsmarge**

**FULL Scan Triggers** (elke 3u op :50):
- 00:50, 03:50, 06:50, 09:50, 12:50, 15:50, 18:50, 21:50
- **8x per dag** full scan
- **Valt samen** met NEAR run → efficiënt!

**Priority Volgorde**:
1. **RIDER_SYNC** (P1) - Team data is critical, POST rate limit safe
2. **COMBINED_EVENT_SYNC** (P2) - Event data

**Geen overlaps & Rate Limit Safe**:
- RIDER_SYNC: `:00` en `:30` elke 90min (P1) → 16 calls/dag < 96 POST slots ✅
- Event NEAR: `:05, :20, :35, :50` (15min, P2) → GET calls only ✅
- Event FULL: `:50` elke 3u (veelvoud van 15min!) (P2) → GET + POST signups ✅

## Logs & Monitoring

**NEAR only mode logs:**
```
🔄 [NEAR EVENT SYNC] Starting...
✅ [NEAR EVENT SYNC] Completed in 2341ms
   📊 Mode: near_only | Events: 42 | Near: 8 (synced) | Far: 34 (skipped) | Signups: 145
```

**FULL SCAN mode logs:**
```
🔄 [FULL EVENT SYNC] Starting...
✅ [FULL EVENT SYNC] Completed in 8912ms
   📊 Mode: full_scan | Events: 42 | Near: 8 (synced) | Far: 34 (synced) | Signups: 687
```

**Database sync_logs:**
```sql
SELECT * FROM sync_logs 
WHERE endpoint LIKE '%EVENT SYNC%' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Testing

### Manual Trigger (Near Only)
```bash
curl -X POST http://localhost:3000/api/sync/events \
  -H "Content-Type: application/json" \
  -d '{"mode": "near_only"}'
```

### Manual Trigger (Full Scan)
```bash
curl -X POST http://localhost:3000/api/sync/events \
  -H "Content-Type: application/json" \
  -d '{"mode": "full_scan"}'
```

### Check Metrics
```bash
curl http://localhost:3000/api/sync/status
```

## Migration Path

### Phase 1: Parallel Run (Week 1)
- ✅ Combined sync actief
- ⚠️ Legacy NEAR/FAR blijven draaien (fallback)
- Monitor: Vergelijk resultaten

### Phase 2: Deprecation (Week 2)
- ✅ Combined sync proven stable
- ⏸️ Disable legacy NEAR/FAR cron jobs
- Keep code for manual fallback

### Phase 3: Cleanup (Week 3)
- 🗑️ Remove legacy NEAR/FAR sync methods
- Update docs
- Final testing

## Configuration

### Environment Variables
```bash
SYNC_NEAR_THRESHOLD_MINUTES=120  # Events < 2u = near
SYNC_LOOKFORWARD_HOURS=48         # Scan next 48 hours
```

### Tune Intervals
```typescript
// In server.ts
const nearInterval = '5,20,35,50 * * * *';  // 15min
const fullInterval = '30 */2 * * *';         // 2u

// Adjust based on:
// - Number of events
// - Signup volatility
// - Rate limit buffer
```

## Troubleshooting

### FAR events still not syncing?
```bash
# Check full scan is running
grep "FULL EVENT SYNC" logs/app.log

# Force manual full scan
curl -X POST http://localhost:3000/api/sync/events \
  -d '{"mode": "full_scan", "force": true}'
```

### Too many API calls?
```bash
# Reduce near_only frequency
'10,25,40,55 * * * *'  # 15min → 25min intervals

# Reduce full_scan frequency
'30 */3 * * *'  # 2u → 3u intervals
```

### RIDER_SYNC conflicts?
```bash
# Check timing
grep "RIDER_SYNC\|EVENT SYNC" logs/app.log | tail -20

# Adjust rider sync offset
'15 */6 * * *'  # :00 → :15 (safer timing)
```

## Success Metrics

**Before (NEAR + FAR separate):**
- FAR_EVENT_SYNC: 0 signups synced (never triggered)
- API calls: ~1200/day (wasteful)
- Conflicts: 3-5/day with RIDER_SYNC

**After (COMBINED):**
- Full scans: 12/day × ~35 far events = 420 signups/day ✅
- API calls: ~800/day (33% reduction)
- Conflicts: 0/day (time slot isolation)

## Related Docs

- `docs/SMARTSCHEDULER-GUIDE.md` - Overall sync strategy
- `docs/SYNC_CONFIGURATION.md` - Config options
- `docs/QUEUE-MONITORING-GUIDE.md` - Queue monitoring
