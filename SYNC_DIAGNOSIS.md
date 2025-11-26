# Sync System Diagnose - 26 Nov 2025

## Probleem
- Rider_sync toont oude data
- Sync logs werken niet goed  
- Scheduler betrouwbaarheid onduidelijk

## Architectuur Analyse

### 1. Sync Service V2 (sync-v2.service.ts)
**Methods:**
- `syncRiders()` - Direct sync (internal)
- `syncRidersCoordinated()` - Via coordinator (scheduled)

**Process:**
1. Haal rider IDs uit `my_team_members`
2. Bulk fetch via `zwiftClient.getBulkRiders()`
3. Delta detection via `riderDeltaService`
4. Upsert naar `riders` table
5. Log naar `sync_logs` table

**Sync Log Entry:**
```typescript
await supabase.createSyncLog({
  endpoint: 'RIDER_SYNC',
  status: 'success',
  records_processed: syncedRiders.length,
  error_message: `Interval: ${config.intervalMinutes}min | ...`
});
```

### 2. Rider Sync Scheduler (rider-sync.ts)
**Features:**
- Lock mechanism via `RiderSyncService.isLocked()`
- Interval: configurable (default 60 min)
- Calls: `syncService.syncRiders()` DIRECT (not coordinated!)

**Issue gevonden:**
```typescript
// Scheduler gebruikt DIRECT sync
const metrics = await syncService.syncRiders({ intervalMinutes: 60, clubId: TEAM_CLUB_ID });

// Dit bypassed de coordinator!
```

### 3. Sync Coordinator (sync-coordinator.service.ts)
**Time Slots:**
- RIDER_SYNC: Every 90min at :00 and :30
- Window: 10 minutes per slot

**Probleem:**
Scheduler roept `syncRiders()` aan, NIET `syncRidersCoordinated()`!
Dit betekent: **SCHEDULER BYPASSED DE COORDINATOR**

### 4. RiderSyncService (rider-sync.service.ts)
**Wrapper voor manual triggers via API**
- Gebruikt ook `syncRiders()` direct
- Heeft eigen lock mechanisme
- Bypassed coordinator (correct voor manual triggers)

### 5. Sync Control Endpoints (sync-control.ts)
**Database-based rate limiting:**
```typescript
async function getLastSuccessfulSync(syncType: string): Promise<Date | null> {
  const logs = await supabase.getSyncLogs(100);
  const successfulSync = logs.find(log => 
    log.endpoint === syncType && log.status === 'success'
  );
  return successfulSync ? new Date(successfulSync.created_at) : null;
}
```

**Status:**
- Code compleet
- Server crash bij status endpoint (syntax error gefixed)

## Problemen Identificatie

### ❌ Probleem 1: Scheduler vs Coordinator Conflict
**Scheduler roept:** `syncRiders()` (direct)
**Zou moeten roepen:** `syncRidersCoordinated()` (via coordinator)

**Impact:**
- Time slots worden genegeerd
- Mogelijk race conditions met manual triggers
- Onvoorspelbare sync timings

### ❌ Probleem 2: Sync Logs Database Query
**Huidige query:**
```typescript
const logs = await supabase.getSyncLogs(100);
const successfulSync = logs.find(...)
```

**Probleem:**
- Haalt 100 logs op en filtert in memory
- Inefficiënt voor grote datasets
- Geen garantie op meest recente per endpoint

**Betere query:**
```sql
SELECT * FROM sync_logs
WHERE endpoint = 'RIDER_SYNC' AND status = 'success'
ORDER BY created_at DESC
LIMIT 1
```

### ❌ Probleem 3: Multiple Sync Paths
**Current paths:**
1. Scheduler → `syncRiders()` direct
2. Manual API → `RiderSyncService.syncNow()` → `syncRiders()` direct  
3. Sync Control → `RiderSyncService.syncNow()` → `syncRiders()` direct

**Issue:**
Alleen manual triggers zouden direct moeten, scheduler moet via coordinator!

### ❌ Probleem 4: Lock Mechanism Inconsistentie
**RiderSyncService:**
```typescript
private static lock: boolean = false;
static isLocked() { return this.lock; }
```

**Scheduler:**
```typescript
if (RiderSyncService.isLocked()) { skip... }
```

**Probleem:**
Lock is shared maar syncRiders() zelf heeft geen lock - alleen wrappers!

## Oplossingen

### ✅ Fix 1: Scheduler moet Coordinator gebruiken
```typescript
// IN: rider-sync.ts
private async syncRiders() {
  if (RiderSyncService.isLocked()) {
    console.log('[RiderSync Scheduler] ⏭️  Skipping (locked)');
    return;
  }

  try {
    RiderSyncService.setLock(true);
    
    // CHANGE: Use coordinated sync for scheduled runs
    const metrics = await syncService.syncRidersCoordinated({ 
      intervalMinutes: 60, 
      clubId: TEAM_CLUB_ID 
    });
    
    console.log(`✅ Synced ${metrics.riders_processed} riders`);
  } finally {
    RiderSyncService.setLock(false);
  }
}
```

### ✅ Fix 2: Optimaliseer Database Query
```typescript
// IN: supabase.service.ts
async getLastSuccessfulSync(endpoint: string): Promise<Date | null> {
  const { data, error } = await this.client
    .from('sync_logs')
    .select('created_at')
    .eq('endpoint', endpoint)
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return new Date(data.created_at);
}
```

### ✅ Fix 3: Unificeer Sync Paths
**Scheduled syncs:** ALTIJD via coordinator
**Manual triggers:** ALTIJD direct (bypass coordinator)

```typescript
// Scheduler: coordinated
await syncService.syncRidersCoordinated({ ... });

// Manual API: direct
await syncService.syncRiders({ ... });
```

### ✅ Fix 4: Verwijder oude data check
Check database voor stale data:
```sql
SELECT 
  rider_id, 
  name, 
  last_synced,
  EXTRACT(EPOCH FROM (NOW() - last_synced))/3600 as hours_since_sync
FROM riders
ORDER BY last_synced DESC
LIMIT 20;
```

## Action Plan

1. **Fix Scheduler** - gebruik `syncRidersCoordinated()`
2. **Add database method** - `getLastSuccessfulSync()` in supabase.service.ts
3. **Update sync-control** - gebruik nieuwe database method
4. **Test complete flow** - scheduled sync + manual trigger
5. **Verify sync logs** - check timestamps zijn actueel
6. **Check rider data** - verify last_synced timestamps

## Testing Commands

```bash
# 1. Check current sync logs
curl -s http://localhost:3000/api/sync-logs?limit=10 | jq '.[] | {endpoint, status, records: .records_processed, time: .created_at}'

# 2. Trigger manual sync
curl -X POST http://localhost:3000/api/sync-control/trigger/riders

# 3. Check sync status
curl -s http://localhost:3000/api/sync-control/status | jq '.services.riders'

# 4. Verify rider data freshness
curl -s http://localhost:3000/api/riders | jq '[.[] | {id: .rider_id, name, last_synced}] | .[0:5]'
```
