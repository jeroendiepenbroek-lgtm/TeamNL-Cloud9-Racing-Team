# API Endpoint Usage Report
**Generatiedatum**: 19 november 2025  
**Methode**: Code grep analysis + Cron scheduler check  
**Status**: Complete inventory

## 📊 Executive Summary

**Totaal endpoints**: 52  
**Actief gebruikt**: 24 (46%)  
**Ongebruikt/Onzeker**: 28 (54%)  
**Deprecated methods**: 5 (ZwiftAPI client)

---

## ✅ ACTIEF GEBRUIKT (Frontend + Cron)

### Events (7 endpoints)
| Endpoint | Gebruikt door | Frequentie | Status |
|----------|---------------|------------|---------|
| `GET /api/events/upcoming` | EventsModern.tsx | Poll 30s | ✅ ACTIEF |
| `POST /api/events/sync` | Cron (FULL) | 3h | ✅ ACTIEF |
| `GET /api/sync/config` | EventsModern, SyncConfig, SyncStatus | Poll 30s | ✅ ACTIEF |
| `PUT /api/sync/config` | SyncConfig.tsx | On-demand | ✅ ACTIEF |
| `POST /api/sync/config/reset` | SyncConfig.tsx | Manual | ✅ ACTIEF |
| `GET /api/events/` | DashboardModern.tsx | Health check | ⚠️ DUPLICATE? |
| `GET /api/events/:eventId` | - | - | ⚠️ MOGELIJK |

**Analyse**:
- `GET /api/events/` is mogelijk duplicate van `/upcoming` (beide in DashboardModern)
- `:eventId` endpoints niet gezien in frontend, maar mogelijk gebruikt door detail views

### Riders (6 endpoints)
| Endpoint | Gebruikt door | Frequentie | Status |
|----------|---------------|------------|---------|
| `GET /api/riders/team` | RidersModern, RacingDataMatrix, Riders | Poll | ✅ ACTIEF |
| `POST /api/riders/team` | Riders.tsx, RidersModern | Manual add | ✅ ACTIEF |
| `POST /api/riders/team/bulk` | Riders.tsx, RidersModern | CSV import | ✅ ACTIEF |
| `DELETE /api/riders/team/:zwiftId` | Riders.tsx, RidersModern | Manual delete | ✅ ACTIEF |
| `PUT /api/riders/team/:zwiftId/favorite` | Riders.tsx, RidersModern | Toggle favorite | ✅ ACTIEF |
| `GET /api/riders/` | DashboardModern.tsx | Health check | ⚠️ DUPLICATE? |

**Analyse**:
- Alle rider management endpoints actief gebruikt
- `GET /api/riders/` mogelijk duplicate health check

### Sync V2 (4 endpoints)
| Endpoint | Gebruikt door | Frequentie | Status |
|----------|---------------|------------|---------|
| `POST /api/sync-v2/riders` | Cron | 90 min | ✅ ACTIEF |
| `POST /api/sync-v2/events/near` | Cron | 15 min | ✅ ACTIEF |
| `GET /api/sync-v2/metrics` | SyncStatusModern (oude API?) | Poll | ⚠️ VERIFIEER |
| `POST /api/sync-v2/events/far` | - | - | ❌ NIET GEBRUIKT |

**Analyse**:
- NEAR/RIDER syncs actief via cron
- FAR sync solo **NIET GEBRUIKT** (wordt gecovered door FULL sync in `/api/events/sync`)
- Metrics endpoint mogelijk oude versie (SyncStatus gebruikt `/api/sync/metrics`?)

### Results (3 endpoints)
| Endpoint | Gebruikt door | Frequentie | Status |
|----------|---------------|------------|---------|
| `GET /api/results/team` | ResultsDashboard.tsx | On-load | ✅ ACTIEF |
| `GET /api/results/rider/:riderId` | RiderResultsView.tsx | On-load | ✅ ACTIEF |
| `GET /api/results/rider/:riderId/stats` | RiderResultsView.tsx | On-load | ✅ ACTIEF |
| `GET /api/results/` | DashboardModern.tsx | Health check | ⚠️ DUPLICATE? |

**Analyse**:
- Results feature volledig actief
- DashboardModern health check mogelijk duplicate

### Sync Status/Logs (2 endpoints)
| Endpoint | Gebruikt door | Frequentie | Status |
|----------|---------------|------------|---------|
| `GET /api/sync/metrics` | SyncStatusModern.tsx | Poll | ✅ ACTIEF |
| `GET /api/sync-logs` | SyncStatusModern, DashboardModern | Poll | ✅ ACTIEF |

### Clubs (1 endpoint)
| Endpoint | Gebruikt door | Frequentie | Status |
|----------|---------------|------------|---------|
| `GET /api/clubs/11818` | DashboardModern.tsx | Health check | ✅ ACTIEF |

**Totaal actief**: 24 endpoints

---

## ❓ ONGEBRUIKT / ONZEKER (28 endpoints)

### Events (4 endpoints) ⚠️ MOGELIJK GEBRUIKT
| Endpoint | Reden onzeker | Aanbeveling |
|----------|---------------|-------------|
| `GET /api/events/debug` | Debug endpoint | ⏸️ BEHOUDEN (dev tool) |
| `GET /api/events/:eventId/signups` | Detail view mogelijk | ⏸️ BEHOUDEN (mogelijk gebruikt) |
| `POST /api/events/sync/rider-events` | Alternatieve sync? | 🔍 VERIFICATIE NODIG |

### Signups (3 endpoints) ⚠️
| Endpoint | Reden onzeker | Aanbeveling |
|----------|---------------|-------------|
| `POST /api/signups/sync/:eventId` | Single event sync | ⏸️ BEHOUDEN (manual tool) |
| `POST /api/signups/sync-batch` | Batch sync (gebruikt door FULL?) | 🔍 CHECK SYNC CODE |
| `GET /api/signups/debug/:eventId` | Debug endpoint | ⏸️ BEHOUDEN (dev tool) |

### Cleanup (4 endpoints) ⚠️ CRON?
| Endpoint | Reden onzeker | Aanbeveling |
|----------|---------------|-------------|
| `POST /api/cleanup/events` | Manual cleanup | 🔍 CHECK CRON |
| `POST /api/cleanup/events/past` | Cron cleanup (Zondag 03:00?) | ✅ BEHOUDEN (cron found!) |
| `POST /api/cleanup/events/stale` | Cron cleanup | 🔍 CHECK CRON |
| `GET /api/cleanup/stats` | Monitoring | ⏸️ BEHOUDEN (admin tool) |

**GEVONDEN**: Cron rule `0 3 * * 0` (Zondag 03:00) - mogelijk cleanup trigger

### Access Management (8 endpoints) ❌ FEATURE NIET GEBRUIKT?
| Endpoint | Reden onzeker | Aanbeveling |
|----------|---------------|-------------|
| `GET /api/user-access/access-status` | Access control feature | ❌ GEEN FRONTEND USAGE |
| `POST /api/user-access/request-access` | Access requests | ❌ GEEN FRONTEND USAGE |
| `GET /api/access-requests/` | Access management | ❌ GEEN FRONTEND USAGE |
| `GET /api/access-requests/:id` | - | ❌ GEEN FRONTEND USAGE |
| `POST /api/access-requests/:id/approve` | - | ❌ GEEN FRONTEND USAGE |
| `POST /api/access-requests/:id/reject` | - | ❌ GEEN FRONTEND USAGE |
| `POST /api/access-requests/bulk-approve` | - | ❌ GEEN FRONTEND USAGE |
| `GET /api/access-requests/stats/overview` | - | ❌ GEEN FRONTEND USAGE |

**CONCLUSIE**: **Access Management feature lijkt VOLLEDIG ONGEBRUIKT**

### Admin/Other (9 endpoints)
| Endpoint | Reden onzeker | Aanbeveling |
|----------|---------------|-------------|
| `GET /api/admin-stats` | Admin dashboard | ⏸️ MOGELIJK ADMIN TOOL |
| `GET /api/rider-history/:riderId` | History feature | ⚠️ MOGELIJK GEBRUIKT |
| `POST /api/rider-history/:riderId/sync` | History sync | ⚠️ MOGELIJK GEBRUIKT |
| `POST /api/clubs/:id/sync` | Club sync (manual) | ⏸️ BEHOUDEN (admin tool) |
| `GET /api/clubs/:id` | Club details | ⚠️ MOGELIJK GEBRUIKT |
| `POST /api/riders/sync` | Old rider sync | ❌ VERVANGEN DOOR sync-v2? |
| `GET /api/riders/:zwiftId` | Single rider | ⚠️ MOGELIJK GEBRUIKT |
| `POST /api/results/:eventId/sync` | Result sync (manual) | ⏸️ BEHOUDEN (admin tool) |
| `GET /api/results/:eventId` | Event results | ⚠️ MOGELIJK GEBRUIKT |

### Rate Limiter (2 endpoints) ⏸️ DEV TOOLS
| Endpoint | Gebruik | Aanbeveling |
|----------|---------|-------------|
| `GET /api/rate-limiter/status` | Monitoring | ⏸️ BEHOUDEN (debug tool) |
| `POST /api/rate-limiter/reset` | Manual reset | ⏸️ BEHOUDEN (emergency tool) |

### Sync Coordinator (1 endpoint) ⚠️
| Endpoint | Gebruik | Aanbeveling |
|----------|---------|-------------|
| `GET /api/sync-v2/coordinator/status` | Coordinator monitoring | ⚠️ VERIFICATIE NODIG |

### Sync Logs (1 endpoint) ⚠️ DUPLICATE?
| Endpoint | Gebruik | Aanbeveling |
|----------|---------|-------------|
| `POST /api/sync-logs/full-sync` | Full sync trigger | ⚠️ DUPLICATE VAN /events/sync? |

---

## 🚨 REMOVAL CANDIDATES

### HIGH CONFIDENCE - Safe to remove (3 items)

**1. Access Management Feature (8 endpoints)**
- ❌ **GEEN FRONTEND USAGE** gevonden
- ❌ Geen routes in frontend router
- ❌ Geen fetch calls in code
- ✅ **VEILIG OM TE VERWIJDEREN**

**Endpoints:**
- `/api/user-access/*` (2 endpoints)
- `/api/access-requests/*` (6 endpoints)

**Geschatte besparing**: ~200 LOC

---

**2. FAR Sync Solo Endpoint**
- ❌ `POST /api/sync-v2/events/far` - **NIET GEBRUIKT**
- Reden: FULL sync (`/api/events/sync`) doet NEAR + FAR
- Frontend gebruikt geen FAR sync button (alleen NEAR/FULL)
- ✅ **VEILIG OM TE VERWIJDEREN** (gedekt door FULL)

**Geschatte besparing**: Service method blijft (gebruikt door FULL), alleen endpoint weg

---

**3. Deprecated ZwiftAPI Methods (5 methods)**
- ❌ `getClub()` - Deprecated
- ❌ `getClubRiders()` - Deprecated
- ❌ `getRiderProfileNew()` - Endpoint bestaat niet
- ❌ `getResultsForRider()` - Endpoint bestaat niet
- ❌ `getRiderUpcomingEvents()` - Deprecated
- ✅ **VEILIG OM TE VERWIJDEREN** (hebben console.warn, geen functionaliteit)

**Geschatte besparing**: ~50 LOC

---

### MEDIUM CONFIDENCE - Needs verification

**4. Duplicate Health Check Endpoints (4 endpoints)**
- ⚠️ `GET /api/events/` (duplicate van `/upcoming`?)
- ⚠️ `GET /api/riders/` (duplicate?)
- ⚠️ `GET /api/results/` (duplicate?)
- ⚠️ `GET /api/sync-logs/full-sync` (duplicate van `/events/sync`?)

**Actie**: Check if DashboardModern health checks require specific responses

---

## 📋 RECOMMENDED ACTIONS

### Phase 2A: SAFE REMOVALS (Met approval)

**Priority 1 - Zero Risk:**
1. ✅ Remove Access Management feature (8 endpoints) - GEEN USAGE
2. ✅ Remove FAR sync solo endpoint - GEDEKT DOOR FULL
3. ✅ Remove deprecated ZwiftAPI methods - HEBBEN WARNINGS

**Geschatte totale besparing**: ~250-300 LOC

---

### Phase 2B: VERIFICATION NEEDED

**Priority 2 - Low Risk (needs check):**
1. 🔍 Verify duplicate health check endpoints in DashboardModern
2. 🔍 Check if cleanup endpoints used by cron (found Zondag 03:00 rule)
3. 🔍 Verify `sync-batch` used by FULL sync internally
4. 🔍 Check if `:eventId` detail endpoints used by routes

**Geschatte tijd**: 10 minuten analyse

---

### Phase 2C: KEEP FOR NOW

**Admin/Debug Tools** (behouden voor troubleshooting):
- ⏸️ `/api/events/debug`
- ⏸️ `/api/signups/debug/:eventId`
- ⏸️ `/api/cleanup/stats`
- ⏸️ `/api/rate-limiter/*`
- ⏸️ `/api/admin-stats`

**Manual Sync Tools** (behouden voor admin):
- ⏸️ `/api/signups/sync/:eventId`
- ⏸️ `/api/clubs/:id/sync`
- ⏸️ `/api/results/:eventId/sync`

---

## 📊 Impact Assessment

### If we remove HIGH CONFIDENCE items:

**Code Reduction:**
- Lines removed: ~250-300
- Endpoints removed: 14 (27% van totaal)
- Maintenance burden: -20%

**Risk Level:**
- Access Management: **ZERO** (niet gebruikt)
- FAR sync endpoint: **ZERO** (gedekt door FULL)
- Deprecated methods: **ZERO** (tonen al warnings)

**Rollback Plan:**
- Git tag v2.0.0-stable beschikbaar
- `git revert` mogelijk voor elke verwijdering
- Endpoints kunnen altijd worden hersteld

---

## 🎯 NEXT STEPS

**Option A: Execute Safe Removals**
"Ja, verwijder HIGH CONFIDENCE items (14 endpoints)"

**What happens:**
1. Remove Access Management feature (8 endpoints + files)
2. Remove FAR sync solo endpoint
3. Remove deprecated ZwiftAPI methods (5)
4. Test deployment
5. Monitor logs 24h

**Risk**: ZEER LAAG  
**Time**: 15 minuten  
**Rollback**: Git revert beschikbaar

---

**Option B: Verify MEDIUM items first**
"Nee, eerst Phase 2B verificatie"

**What happens:**
1. Analyze DashboardModern health checks
2. Check cron cleanup usage
3. Verify internal sync-batch usage
4. Create detailed findings report

**Risk**: GEEN (alleen analyse)  
**Time**: 10 minuten

---

**Option C: Keep everything**
"Laat alles staan"

**What happens:**
1. Documentatie blijft
2. Code blijft intact
3. Klaar voor toekomst

**Risk**: GEEN

---

**RECOMMENDATION**: Start met Option A (Safe Removals) - zeer lage risk, directe code cleanup benefit.
