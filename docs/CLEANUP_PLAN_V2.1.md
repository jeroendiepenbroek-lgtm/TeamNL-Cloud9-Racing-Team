# Code Cleanup Plan - Version 2.1
**Datum**: 19 november 2025  
**Status**: PLAN (NOG NIET UITGEVOERD)

## ⚠️ BELANGRIJK
Dit document beschrijft **potentiële** cleanup acties. **NIETS is verwijderd** totdat expliciet goedgekeurd door gebruiker.

## 🔍 Deprecated Code (Geïdentificeerd)

### 1. ZwiftAPI Client - Legacy Methods
**Locatie**: `backend/src/api/zwift-client.ts` (lines 269-315)

**Deprecated methods:**
- ❌ `getClub()` → Gebruik `getClubMembers()`
- ❌ `getClubRiders()` → Gebruik `getClubMembers()`
- ❌ `getRiderProfileNew()` → Endpoint bestaat niet
- ❌ `getResultsForRider()` → Endpoint bestaat niet
- ❌ `getRiderUpcomingEvents()` → Gebruik `getEvents48Hours()`

**Status**: Methodes zijn nog aanwezig voor backwards compatibility  
**Risico**: LAAG - hebben console.warn() maar geen functionaliteit  
**Actie**: ⏸️ **NIET VERWIJDEREN** - mogelijk gebruikt in oude scripts

### 2. Supabase Service - Deprecated Method
**Locatie**: `backend/src/services/supabase.service.ts` (line 287)

**Deprecated method:**
- ❌ `upsertEvents()` → Gebruik `upsertZwiftApiEvents()`

**Status**: ✅ **AL VERVANGEN** in sync-v2.service.ts (commit c843bdd)  
**Risico**: GEEN - geen usages meer gevonden  
**Actie**: ✅ **KAN VERWIJDERD** na verificatie

### 3. Type Definitions - Deprecated Fields
**Locatie**: `backend/src/types/index.ts`

**Deprecated fields:**
- `total_races` → Gebruik `race_finishes`
- `total_wins` → Gebruik `race_wins`
- `total_podiums` → Gebruik `race_podiums`
- `ZwiftEventSimple` interface → Gebruik `ZwiftEvent`

**Status**: Behouden voor backwards compatibility  
**Risico**: MEDIUM - mogelijk gebruikt in oude database queries  
**Actie**: ⏸️ **NIET VERWIJDEREN** - type safety behouden

## 🔧 Endpoints Analyse

### Actief Gebruikt (✅ BEHOUDEN)

**Events:**
- ✅ `GET /api/events/upcoming` - EventsModern.tsx
- ✅ `POST /api/events/sync` - Manual sync + cron
- ✅ `GET /api/events/:eventId` - Event details
- ✅ `GET /api/events/:eventId/signups` - Signup details

**Riders:**
- ✅ `GET /api/riders/team` - RacingDataMatrixModern.tsx
- ✅ `POST /api/riders/sync` - Manual rider sync
- ✅ `GET /api/riders/:zwiftId` - Rider details

**Sync V2:**
- ✅ `POST /api/sync-v2/riders` - Cron scheduler
- ✅ `POST /api/sync-v2/events/near` - Cron scheduler
- ✅ `GET /api/sync-v2/metrics` - DashboardModern.tsx

**Config:**
- ✅ `GET /api/sync/config` - Frontend config polling
- ✅ `PUT /api/sync/config` - Config updates

### Mogelijk Ongebruikt (⚠️ VERIFICATIE NODIG)

**Events:**
- ⚠️ `GET /api/events/` - Root endpoint (lijkt duplicate van /upcoming)
- ⚠️ `GET /api/events/debug` - Debug endpoint (dev only?)
- ⚠️ `POST /api/events/sync/rider-events` - Alternatieve sync?

**Sync V2:**
- ⚠️ `POST /api/sync-v2/events/far` - **FAR sync solo** (wordt gecovered door FULL sync!)
- ⚠️ `GET /api/sync-v2/coordinator/status` - Coordinator status (gebruikt?)

**Signups:**
- ⚠️ `POST /api/signups/sync/:eventId` - Single event signup sync (manual?)
- ⚠️ `POST /api/signups/sync-batch` - Batch signup sync (gebruikt door FULL?)
- ⚠️ `GET /api/signups/debug/:eventId` - Debug endpoint (dev only?)

**Cleanup:**
- ⚠️ `POST /api/cleanup/events` - Manual cleanup (admin?)
- ⚠️ `POST /api/cleanup/events/past` - Past events cleanup (cron?)
- ⚠️ `POST /api/cleanup/events/stale` - Stale events cleanup (cron?)
- ⚠️ `GET /api/cleanup/stats` - Cleanup stats (monitoring?)

**Admin/Access:**
- ⚠️ `GET /api/admin-stats` - Admin statistics
- ⚠️ `/api/user-access/*` - User access management (hele feature gebruikt?)
- ⚠️ `/api/access-requests/*` - Access requests (hele feature gebruikt?)

**Other:**
- ⚠️ `GET /api/results/*` - Results endpoints (gebruikt door frontend?)
- ⚠️ `/api/rider-history/*` - Rider history (gebruikt?)
- ⚠️ `/api/clubs/*` - Clubs endpoints (gebruikt?)
- ⚠️ `/api/sync-logs/*` - Sync logs (monitoring?)

## 🎯 Veilige Cleanup Actions (Voorstel)

### Phase 1: Documentatie Cleanup ✅ VEILIG
**Geen code changes, alleen comments toevoegen**

1. ✅ Tag deprecated methods met `@deprecated` JSDoc
2. ✅ Add comments: "// V2.1: Verify usage before removal"
3. ✅ Update API docs met endpoint status

**Risico**: GEEN  
**Approval**: Kan direct

### Phase 2: Usage Verification 🔍 ONDERZOEK
**Analyse zonder wijzigingen**

1. Grep search voor alle endpoint calls in frontend
2. Check cron scheduler voor endpoint usage
3. Analyze server logs voor traffic patterns
4. Document welke endpoints 0 traffic hebben

**Risico**: GEEN  
**Approval**: Kan direct

### Phase 3: Safe Deprecation Warnings ⚠️ LAAG RISICO
**Add warnings, maar verwijder niets**

1. Add console.warn voor ongebruikte endpoints
2. Return deprecation headers: `X-Deprecated: true`
3. Log usage van deprecated endpoints
4. Monitor logs 1 week

**Risico**: LAAG (alleen logging)  
**Approval**: Gebruiker goedkeuring

### Phase 4: Actual Removal 🚨 HOOG RISICO
**Remove confirmed unused code**

**ALLEEN NA:**
- ✅ Phase 2 completed (usage verified)
- ✅ Phase 3 completed (1 week monitoring)
- ✅ Backup gemaakt (git tag v2.0)
- ✅ Expliciete gebruiker approval PER endpoint

**Risico**: HOOG  
**Approval**: **VERPLICHT** per item

## 📊 Recommendations

### DO NOW (Veilig):
1. ✅ Commit VERSION_2.0_SNAPSHOT.md
2. ✅ Git tag current state: `git tag v2.0.0-stable`
3. ✅ Add JSDoc @deprecated tags
4. ✅ Update API documentation

### DO NEXT (Met approval):
1. ⏸️ Phase 2: Usage verification scan
2. ⏸️ Create endpoint usage report
3. ⏸️ Identify zero-traffic endpoints

### DO LATER (Na monitoring):
1. ⏸️ Phase 3: Add deprecation warnings
2. ⏸️ Monitor 1 week
3. ⏸️ Present removal proposal
4. ⏸️ Execute cleanup (alleen met approval)

## 🚫 NEVER DO (Zonder approval)

- ❌ Remove any endpoint
- ❌ Remove any method
- ❌ Change any interface
- ❌ Modify working sync logic
- ❌ Delete any service
- ❌ Remove any database migration

## ✅ Safe Changes (Altijd OK)

- ✅ Add comments
- ✅ Add console.log for debugging
- ✅ Add @deprecated tags
- ✅ Update documentation
- ✅ Fix typos in comments
- ✅ Add type definitions
- ✅ Improve error messages

---

## 🎯 Next Steps

**Immediate:**
1. Commit deze documentatie
2. Git tag v2.0.0-stable
3. Vraag gebruiker: "Wil je Phase 2 (usage verification) starten?"

**If approved:**
1. Run grep scans voor endpoint usage
2. Check Railway logs voor traffic
3. Create usage report
4. Present findings voor approval

**If not approved:**
1. Stop hier
2. Huidige code blijft volledig intact
3. Documentatie is up-to-date
4. V2.0 is stable en production ready ✅
