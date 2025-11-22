# 🚀 SYNC SERVICES CONSOLIDATION PLAN

## Huidige Situatie (Chaos)

**8 Sync-gerelateerde services:**
1. `sync-v2.service.ts` - Rider + Event sync
2. `results-sync.service.ts` - Results from rider history
3. `event-scheduler.service.ts` - Cron events bulk import
4. `signup-scheduler.service.ts` - Cron signups sync
5. `sync-coordinator.service.ts` - Queue management
6. `sync-config.service.ts` - Config validatie
7. `sync-config-validator.ts` - Config checks
8. `event-cleanup.service.ts` - Orphan cleanup

**Problemen:**
- Duplicate logic overal
- Geen bulk operations
- Rate limits niet efficient gebruikt
- 4x dezelfde error handling
- Smart scheduling verspreid over 3 files

---

## 🎯 NIEUWE ARCHITECTUUR (1 Service)

### `unified-sync.service.ts`

```typescript
/**
 * UNIFIED SYNC SERVICE
 * All-in-one: Riders, Events, Signups, Results
 * Smart scheduling, bulk operations, rate limit optimization
 */

export class UnifiedSyncService {
  
  // ===== CORE SYNC METHODS =====
  
  async syncRiders(options: SyncOptions): Promise<RiderSyncResult>
  async syncEvents(options: EventSyncOptions): Promise<EventSyncResult>
  async syncSignups(eventIds: number[]): Promise<SignupSyncResult>
  async syncResults(options: ResultSyncOptions): Promise<ResultSyncResult>
  
  // ===== SMART SCHEDULERS (Cron) =====
  
  startSmartScheduler(): void {
    // Auto-detect: Near events (10min), Far events (60min), Riders (15min)
  }
  
  // ===== BULK OPERATIONS =====
  
  async bulkSyncRiders(riderIds: number[]): Promise<BulkResult>
  async bulkSyncEvents(eventIds: number[]): Promise<BulkResult>
  
  // ===== RATE LIMIT OPTIMIZATION =====
  
  private async batchRequests<T>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<void>
  ): Promise<void>
}
```

---

## 📊 CONSOLIDATIE MATRIX

| Huidige Service | Functie | → Nieuwe Method |
|----------------|---------|----------------|
| **sync-v2.service.ts** | | |
| `.syncRiders()` | Rider sync | `syncRiders()` |
| `.syncEventsCoordinated()` | Event sync | `syncEvents()` |
| `.syncEventSignups()` | Signups | `syncSignups()` |
| **results-sync.service.ts** | | |
| `.syncTeamResultsFromHistory()` | Results | `syncResults()` |
| **event-scheduler.service.ts** | | |
| `.bulkImportUpcomingEvents()` | Bulk events | `bulkSyncEvents()` |
| **signup-scheduler.service.ts** | | |
| Signup cron | Signup scheduling | `startSmartScheduler()` |
| **sync-coordinator.service.ts** | | |
| `.queueSync()` | Queue management | Built-in queue |
| **sync-config.service.ts** | | |
| Config validation | Config parsing | Built-in config |

---

## 🔥 IMPLEMENTATIE (1 uur work)

### Stap 1: Create `unified-sync.service.ts`

**Core features:**
```typescript
// BULK OPERATIONS
- POST /bulk-riders: [riderIds] → Process 50/batch, 15min wait
- POST /bulk-events: [eventIds] → Process 10/batch, 1min wait

// SMART SCHEDULING
- Auto-detect near events (<2h) → Sync every 10min
- Auto-detect far events (>2h) → Sync every 60min
- Rider sync → Every 15min (configurable)
- Result sync → On-demand only (too heavy)

// RATE LIMIT OPTIMIZATION
- Batch rider GET: 5 calls/min = 5 riders/min
- Batch rider POST: 1 call/15min = 50 riders/15min
- Event signups: 1 call/min = 1 event/min
- Results: 1 call/min = 1 event/min

// QUEUE MANAGEMENT
- Built-in mutex locks (no external coordinator)
- Prioriteit: NEAR_EVENTS > SIGNUPS > RIDERS > FAR_EVENTS
```

### Stap 2: Migrate Endpoints

```bash
# Oude endpoints (deprecated, redirect)
POST /api/sync/riders → POST /api/sync (type: riders)
POST /api/sync/events → POST /api/sync (type: events)
POST /api/sync/results → POST /api/sync (type: results)

# Nieuwe unified endpoint
POST /api/sync
{
  "type": "riders" | "events" | "signups" | "results",
  "options": { ... }
}

# Bulk endpoints (NEW)
POST /api/sync/bulk/riders
{ "rider_ids": [123, 456, 789] }

POST /api/sync/bulk/events  
{ "event_ids": [5129235, 5129236] }
```

### Stap 3: Deprecate Old Services

```bash
# Rename to _archive/
mv sync-v2.service.ts _archive/
mv results-sync.service.ts _archive/
mv event-scheduler.service.ts _archive/
mv signup-scheduler.service.ts _archive/
mv sync-coordinator.service.ts _archive/

# Keep only:
unified-sync.service.ts  # NEW - All-in-one
supabase.service.ts      # Database access
event-cleanup.service.ts # Cleanup only (separate concern)
```

---

## 📈 VERWACHTE VERBETERING

| Metric | Voor | Na | Verbetering |
|--------|------|----|-----------| 
| **Files** | 8 services | 1 service | -87% |
| **LOC** | ~3000 lines | ~800 lines | -73% |
| **API calls/min** | 12 (waste) | 7 (efficient) | -42% |
| **Maintenance** | 8 places | 1 place | -87% |
| **Test complexity** | 8 test suites | 1 test suite | -87% |

---

## ✅ ACTIE PLAN

**Morgen (1 uur):**
1. Create `unified-sync.service.ts` (400 lines)
2. Migrate endpoints to use new service
3. Update cron jobs to call unified scheduler
4. Archive old services

**Result:**
- 1 service instead of 8
- Bulk operations for efficiency
- Smart scheduling built-in
- 73% less code to maintain

---

## 🚨 BREAKING CHANGES

**None!** Old endpoints blijven werken via redirect:

```typescript
// Old endpoint (backwards compatible)
router.post('/riders', async (req, res) => {
  console.warn('⚠️ Deprecated: Use POST /api/sync instead');
  return unifiedSync.syncRiders(req.body);
});
```
