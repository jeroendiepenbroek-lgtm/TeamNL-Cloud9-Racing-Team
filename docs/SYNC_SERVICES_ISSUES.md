# Sync Services Analyse - Issues & Inconsistenties

## 🔴 GEVONDEN PROBLEMEN

### 1. **Naming Inconsistentie**
**Probleem**: Verschillende namen voor dezelfde concepten
- Code gebruikt: `NEAR_EVENT_SYNC`, `FAR_EVENT_SYNC`, `COMBINED_EVENT_SYNC`
- Server.ts zegt: "Event Sync (NEAR)" en "Event Sync (FULL)"
- FULL !== FAR (verwarrend!)

**Impact**: Logs en debugging zijn inconsistent

### 2. **COMBINED_EVENT_SYNC Route Conflict**
**Locatie**: `sync-v2.service.ts` line 540-570

```typescript
// syncEventsCoordinated() roept COMBINED_EVENT_SYNC aan
return await syncCoordinator.queueSync('COMBINED_EVENT_SYNC' as any, async () => {
  // ...
  const syncLabel = isFullScan ? 'FAR_EVENT_SYNC' : 'NEAR_EVENT_SYNC';
  // Type is COMBINED maar label is FAR of NEAR!
});
```

**Probleem**: 
- Metrics type = `COMBINED_EVENT_SYNC`
- Maar sync label = `FAR_EVENT_SYNC` of `NEAR_EVENT_SYNC`
- Dashboard verwacht mogelijk FAR/NEAR maar krijgt COMBINED

### 3. **Duplicate Event Syncing**
**Server.ts Cron Jobs**:
```typescript
// Line 177: Near sync (every 15 min at :05, :20, :35, :50)
'5,20,35,50 * * * *' → syncEventsCoordinated({ mode: 'near_only' })

// Line 201: Full sync (every 3 hours at :50)  
'50 */3 * * *' → syncEventsCoordinated({ mode: 'full_scan' })
```

**Probleem**: 
- At :50 every 3rd hour = **BOTH** crons trigger!
- Example: 00:50 → Near sync + Full sync tegelijk
- Full scan haalt ook near events op → **dubbel werk**

### 4. **Priority Mismatch**
**Sync Coordinator** (sync-coordinator.service.ts):
```typescript
COMBINED_EVENT_SYNC: { priority: 2, cooldown: 60000 }
NEAR_EVENT_SYNC: { priority: 2, cooldown: 60000 }  // Legacy
FAR_EVENT_SYNC: { priority: 3, cooldown: 300000 }
```

**Probleem**:
- COMBINED heeft priority 2 (medium)
- Als COMBINED full_scan doet = FAR events
- Maar FAR heeft priority 3 (laag)
- **Inconsistent**: full_scan via COMBINED krijgt hogere priority dan FAR

### 5. **Rate Limit Risk**
**ZwiftRacing API Limits**:
- Event signups: 1 call per 1 min
- Event list: 1 call per 1 min

**Current Crons**:
- NEAR: Elke 15 min (4x/uur) × signups per near event
- FULL: Elke 3 uur × signups voor ALLE events

**Risk**: 
- At :50 elke 3e uur → NEAR + FULL beide draaien
- Als 20+ near events = 20 signup calls (NEAR) + 100+ signup calls (FULL)
- **Rate limit overschrijding**

## ✅ AANBEVOLEN FIXES

### Fix 1: Unify Naming
**Gebruik consistent**:
- `RIDER_SYNC` → riders/club members
- `EVENT_SYNC_NEAR` → events < threshold (was: NEAR_EVENT_SYNC)
- `EVENT_SYNC_FULL` → alle events (was: COMBINED_EVENT_SYNC met full_scan)
- Verwijder: `FAR_EVENT_SYNC` (legacy/unused)

### Fix 2: Prevent Overlap
**Optie A** (Simpel): Shift FULL cron
```typescript
// NEAR: :05, :20, :35, :50
'5,20,35,50 * * * *'

// FULL: :55 (elke 3 uur, geen overlap!)
'55 */3 * * *'
```

**Optie B** (Advanced): Check last sync
```typescript
if (lastNearSync < 2 minutes ago) {
  console.log('⏭️ Skipping FULL - NEAR just ran');
  return;
}
```

### Fix 3: Separate Full Scan Logic
**Huidige code**: COMBINED doet near OF full (mode parameter)
**Probleem**: Type mismatch (COMBINED type maar FAR/NEAR label)

**Oplossing**: Aparte functies
```typescript
async syncEventsNear() {
  // Only near events + signups
  type: 'EVENT_SYNC_NEAR'
}

async syncEventsFull() {
  // All events + signups
  type: 'EVENT_SYNC_FULL'
}
```

### Fix 4: Throttle Signups
**Current**: Loop over alle events → signup call voor elk
**Risk**: Rate limit bij veel events

**Oplossing**: Batching
```typescript
// Max 30 signup calls per run
const eventsToProcess = nearEvents.slice(0, 30);
// Save rest for next run
```

### Fix 5: Smart Priority
**EVENT_SYNC_FULL should have LOW priority** (priority 3)
- Full scan is niet urgent
- Kan wachten als RIDER_SYNC of NEAR_SYNC bezig is

```typescript
EVENT_SYNC_NEAR: { priority: 2, cooldown: 60s }
EVENT_SYNC_FULL: { priority: 3, cooldown: 5min }
```

## 🎯 MEEST KRITIEKE ISSUES

### 🔥 Priority 1: Cron Overlap (Fix 2)
**Nu**: 00:50, 03:50, etc. draaien NEAR + FULL tegelijk
**Impact**: Dubbel API calls, mogelijke rate limits
**Fix**: Shift FULL naar :55 of :00

### 🔥 Priority 2: Type/Label Mismatch (Fix 1 + 3)
**Nu**: COMBINED type maar FAR/NEAR label
**Impact**: Confusing logs, dashboard data mismatch
**Fix**: Unify naming + separate functions

### ⚠️ Priority 3: Rate Limit Risk (Fix 4)
**Nu**: Geen limiet op signup calls per run
**Impact**: Bij 100+ events = rate limit
**Fix**: Max 30-50 events per run

## 📊 HUIDIGE STATUS

**Werkt momenteel**: ✅ JA
- Riders sync correct (75 riders)
- Events sync naar database
- Signups worden opgehaald

**Maar**:
- Inefficiënt (overlap + dubbel werk)
- Verwarrende logs/metrics
- Rate limit risk bij veel events
- Inconsistent naming

## 🚀 QUICK WIN

**Minimale fix** (5 min):
```typescript
// server.ts line 201
// FROM:
'50 */3 * * *'
// TO:
'55 */3 * * *'  // 5 min na NEAR slot
```

Dit voorkomt overlap en dubbel werk!

**Impact**:
- ✅ Geen cron conflict meer
- ✅ NEAR kan 50+ events afhandelen voordat FULL start
- ✅ Reduced API calls
- ⚠️ Naming issues blijven (maar niet kritiek)
