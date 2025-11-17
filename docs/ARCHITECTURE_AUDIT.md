# Architecture Audit - TeamNL Cloud9 Racing Team Dashboard
**Datum:** 17 november 2025  
**Doel:** Complete mapping van database → API → frontend + identificatie van redundantie

---

## 📊 Database Layer

### Core Tables (Source of Truth)

#### 1. **riders** - Team member data
- **Source:** ZwiftRacing API (`/public/riders`)
- **Primary Key:** `id` (auto-increment)
- **Unique Key:** `rider_id` (Zwift ID)
- **Sync:** RIDER_SYNC (elke 6u)
- **Key Columns:**
  - `rider_id` - Zwift player ID
  - `name` - Rider naam
  - `zp_category` - ZwiftPower categorie (A+/A/B/C/D/E)
  - `zp_ftp` - ZwiftPower FTP
  - `power_*` - Power curves (wkg5, wkg30, w5, w30, CP, AWC, etc.)
  - `race_*` - Race ratings (current, last, max30, max90, finishes, wins, podiums)
  - `handicap_*` - Terrain handicaps (flat, rolling, hilly, mountainous)
  - `phenotype_*` - Rider type scores (sprinter, puncheur, pursuiter, climber, tt)
  - `club_id`, `club_name` - Club affiliation
  - `weight`, `height`, `age`, `gender`, `country` - Physical attributes

**Deprecated columns (oude namen, niet gebruiken):**
- ❌ `ftp_deprecated` (was `ftp`)
- ❌ `category_racing_deprecated` (was `category_racing`)
- ❌ `category_zftp_deprecated` (was `category_zftp`)

#### 2. **zwift_api_events** - Event metadata (sourcing table)
- **Source:** ZwiftRacing API (`/api/events/upcoming`, `/api/events/{id}`)
- **Primary Key:** `event_id` (Zwift event ID, string)
- **Sync:** NEAR_EVENT_SYNC (elke 15min) + FAR_EVENT_SYNC (elke 2u)
- **Key Columns:**
  - `event_id` - Zwift event UUID
  - `name` - Event naam
  - `event_start` - Start timestamp
  - `duration_minutes` - Race duur
  - `distance_km` - Afstand
  - `laps` - Aantal ronden
  - `club_id`, `club_name` - Organisator
  - `organizer` - Organizer naam
  - `route_name`, `route_world` - Parcours info
  - `category_enforcement` - Category enforcement type
  - `raw_data` - Volledige API response (JSONB)

#### 3. **zwift_api_event_signups** - Event sign-ups (sourcing table)
- **Source:** ZwiftRacing API (`/api/events/{id}/signups`)
- **Primary Key:** `id` (auto-increment)
- **Unique Key:** `(event_id, pen_name, rider_id)`
- **Sync:** NEAR_EVENT_SYNC (elke 15min) + FAR_EVENT_SYNC (elke 2u)
- **Key Columns:**
  - `event_id` - Verwijzing naar event
  - `pen_name` - Category/pen (A/B/C/D/E)
  - `rider_id` - Zwift rider ID
  - `rider_name` - Rider naam (denormalized)
  - `weight`, `height` - Physical attributes
  - `club_id`, `club_name` - Club info
  - `power_*` - Power metrics (wkg5, wkg30, CP)
  - `race_*` - Race stats (rating, finishes, wins, podiums)
  - `phenotype` - Rider type
  - `raw_data` - Volledige rider object (JSONB)

#### 4. **sync_logs** - Sync operation tracking
- **Source:** Backend sync services
- **Primary Key:** `id` (auto-increment)
- **Key Columns:**
  - `endpoint` - Sync type (RIDER_SYNC, NEAR_EVENT_SYNC, FAR_EVENT_SYNC)
  - `status` - success/error
  - `records_processed` - Aantal verwerkte records
  - `message` - Details
  - `timestamp` - Sync tijd
  - `sync_type`, `interval_minutes`, `threshold_minutes` - V2 metadata

#### 5. **access_requests** - Discord access aanvragen
- **Source:** Discord OAuth + frontend
- **Primary Key:** `id` (UUID)
- **Key Columns:**
  - `user_id` - Supabase auth user
  - `discord_id`, `discord_username`, `discord_avatar_url` - Discord info
  - `status` - pending/approved/rejected
  - `requested_at`, `reviewed_at` - Timestamps
  - `reviewed_by`, `review_notes` - Admin review

#### 6. **user_roles** - User permission management
- **Source:** Admin actions
- **Primary Key:** `(user_id, role)`
- **Key Columns:**
  - `user_id` - Supabase auth user
  - `role` - admin/rider/captain/viewer
  - `granted_by` - Admin who granted
  - `granted_at` - Timestamp

---

### Views (Derived Data)

#### 1. **view_my_team** - Team roster met laatste data
**Purpose:** Riders tabel met fallback voor missing riders  
**Source:** `riders` table  
**Used by:** RacingDataMatrixModern, Riders pagina  
**Query:**
```sql
SELECT 
  r.id, r.rider_id, r.name, r.zp_category, r.zp_ftp,
  r.power_wkg5, r.power_wkg30, r.power_cp,
  r.race_current_rating, r.race_finishes, r.race_wins,
  r.phenotype_value, r.club_id, r.club_name,
  r.weight, r.height, r.age, r.gender, r.country,
  r.last_synced
FROM riders r
ORDER BY r.name;
```

#### 2. **view_upcoming_events** - Upcoming events met signup counts
**Purpose:** Events in de komende 36u met totaal aantal sign-ups per pen  
**Source:** `zwift_api_events` + `zwift_api_event_signups`  
**Used by:** EventsModern, DashboardModern  
**Query:**
```sql
SELECT 
  e.*,
  COUNT(DISTINCT s.rider_id) FILTER (WHERE s.pen_name = 'A') as signups_a,
  COUNT(DISTINCT s.rider_id) FILTER (WHERE s.pen_name = 'B') as signups_b,
  -- ... more pens
  COUNT(DISTINCT s.rider_id) as total_signups
FROM zwift_api_events e
LEFT JOIN zwift_api_event_signups s ON e.event_id = s.event_id
WHERE e.event_start > NOW() 
  AND e.event_start < NOW() + INTERVAL '36 hours'
GROUP BY e.event_id;
```

#### 3. **view_team_events** - Team events met team member sign-ups
**Purpose:** Events waar TeamNL leden zijn ingeschreven  
**Source:** `zwift_api_events` + `zwift_api_event_signups` + `riders`  
**Used by:** EventsModern (team filter)  
**Query:**
```sql
SELECT 
  e.*,
  json_agg(json_build_object(
    'rider_id', s.rider_id,
    'rider_name', s.rider_name,
    'pen_name', s.pen_name,
    'team_rider_category', r.zp_category
  )) as team_signups
FROM zwift_api_events e
JOIN zwift_api_event_signups s ON e.event_id = s.event_id
JOIN riders r ON s.rider_id = r.rider_id
GROUP BY e.event_id;
```

#### 4. **view_event_signups_with_team** - Signups met team member flag
**Purpose:** Alle sign-ups met indicator of rider in ons team zit  
**Source:** `zwift_api_event_signups` + `riders`  
**Used by:** Event signup details  
**Query:**
```sql
SELECT 
  s.*,
  CASE WHEN r.rider_id IS NOT NULL THEN true ELSE false END as is_team_member,
  r.zp_category as team_rider_category
FROM zwift_api_event_signups s
LEFT JOIN riders r ON s.rider_id = r.rider_id;
```

---

### Legacy/Deprecated Tables (NIET GEBRUIKEN)

#### ❌ **events** (oude events tabel)
- **Replaced by:** `zwift_api_events`
- **Reden:** Niet in sync met API structure, incomplete data
- **Status:** View bestaat nog als alias naar `zwift_api_events` (migration 011)
- **Actie:** Kan worden verwijderd, maar eerst check of oude code dit gebruikt

#### ❌ **event_signups** (oude signups tabel)
- **Replaced by:** `zwift_api_event_signups`
- **Reden:** Verkeerde primary key structure, incomplete rider data
- **Status:** Waarschijnlijk nog in database maar ongebruikt
- **Actie:** Kan worden verwijderd na verificatie

#### ❌ **clubs** (club metadata)
- **Status:** Tabel bestaat maar wordt niet actief gebruikt
- **Data:** Statische club info (naam, logo, etc.)
- **Reden:** Club data komt nu embedded in rider/event responses
- **Actie:** Behouden voor toekomstig gebruik

#### ❌ **club_roster** (club members)
- **Status:** Redundant - club members zijn nu in `riders` tabel
- **Reden:** `riders.club_id = 2281` filter geeft zelfde resultaat
- **Actie:** Kan worden verwijderd

#### ❌ **race_results** (race uitslag)
- **Status:** Tabel bestaat maar wordt niet gesynchroniseerd
- **Reden:** Results sync niet geïmplementeerd (API rate limit te strikt)
- **Actie:** Behouden voor toekomstige implementatie

#### ❌ **rider_history** (historical snapshots)
- **Status:** Tabel bestaat, wordt niet actief gebruikt
- **Reden:** Historical tracking niet geïmplementeerd
- **Actie:** Behouden voor toekomstige analytics

---

## 🔌 API Layer

### Active Endpoints

#### Riders API (`/api/riders`)

**GET /api/riders**
- **Purpose:** Haal alle riders op
- **Database:** `riders` table direct
- **Used by:** Riders pagina (legacy), admin tools
- **Query:** `SELECT * FROM riders ORDER BY name`

**GET /api/riders/team**
- **Purpose:** Haal TeamNL members op
- **Database:** `view_my_team`
- **Used by:** RacingDataMatrixModern, RidersModern
- **Query:** `SELECT * FROM view_my_team`

**GET /api/riders/:zwiftId**
- **Purpose:** Haal specifieke rider op
- **Database:** `riders` table
- **Used by:** Rider detail views
- **Query:** `SELECT * FROM riders WHERE rider_id = :zwiftId`

#### Events API (`/api/events`)

**GET /api/events**
- **Purpose:** Haal alle events op
- **Database:** `zwift_api_events` table
- **Used by:** EventsModern (all events view)
- **Query:** `SELECT * FROM zwift_api_events ORDER BY event_start`

**GET /api/events/upcoming**
- **Purpose:** Upcoming events in komende 48u
- **Database:** `view_upcoming_events`
- **Used by:** EventsModern, DashboardModern
- **Query:** `SELECT * FROM view_upcoming_events`

**GET /api/events/:eventId**
- **Purpose:** Event details
- **Database:** `zwift_api_events`
- **Used by:** Event detail page
- **Query:** `SELECT * FROM zwift_api_events WHERE event_id = :eventId`

**GET /api/events/:eventId/signups**
- **Purpose:** Event sign-ups met pen breakdown
- **Database:** `zwift_api_event_signups`
- **Used by:** Event signup modal, EventsModern
- **Query:** 
```sql
SELECT 
  pen_name,
  json_agg(json_build_object(
    'rider_id', rider_id,
    'rider_name', rider_name,
    'power_wkg30', power_wkg30,
    'race_rating', race_rating
  ) ORDER BY race_rating DESC) as riders
FROM zwift_api_event_signups
WHERE event_id = :eventId
GROUP BY pen_name
ORDER BY pen_name;
```

#### Sync API (`/api/sync-v2`)

**POST /api/sync-v2/riders**
- **Purpose:** Trigger manual rider sync
- **Service:** `syncServiceV2.syncRiders()`
- **Updates:** `riders` table
- **Response:** Metrics (processed, new, updated)

**POST /api/sync-v2/near-events**
- **Purpose:** Trigger near event sync
- **Service:** `syncServiceV2.syncNearEvents()`
- **Updates:** `zwift_api_events` + `zwift_api_event_signups`
- **Response:** Metrics (events_near, signups_synced)

**POST /api/sync-v2/far-events**
- **Purpose:** Trigger far event sync
- **Service:** `syncServiceV2.syncFarEvents()`
- **Updates:** `zwift_api_events` + `zwift_api_event_signups`
- **Response:** Metrics (events_far, signups_synced)

**GET /api/sync-v2/metrics**
- **Purpose:** Laatste sync metrics
- **Database:** `sync_logs` table
- **Used by:** SyncStatusModern
- **Query:** `SELECT * FROM sync_logs ORDER BY timestamp DESC LIMIT 50`

**GET /api/sync-v2/coordinator/status**
- **Purpose:** Sync coordinator queue status
- **Service:** `syncCoordinator.getStatus()`
- **Used by:** Admin monitoring
- **Returns:** Queue state, time slots, current sync

#### Rate Limiter API (`/api/rate-limiter`)

**GET /api/rate-limiter/status**
- **Purpose:** API rate limit status
- **Service:** `rateLimiter.getStatus()`
- **Used by:** SyncStatusModern, admin debug
- **Returns:** Per-endpoint status (calls, wait time, utilization)

**POST /api/rate-limiter/reset**
- **Purpose:** Reset rate limiter (dev only)
- **Service:** `rateLimiter.reset()`
- **Used by:** Development testing

#### Access Management API

**GET /api/access-requests**
- **Purpose:** Haal access requests op
- **Database:** `access_requests` + `auth.users`
- **Used by:** AccessRequests pagina
- **Query:** `SELECT * FROM access_requests ORDER BY requested_at DESC`

**GET /api/user-access/access-status**
- **Purpose:** Check user's access status
- **Database:** `access_requests` + `user_roles`
- **Used by:** AuthContext, ProtectedRoute
- **Query:** Check if user has approved request + roles

**POST /api/access-requests/:id/approve**
- **Purpose:** Goedkeuren access request
- **Database:** Update `access_requests`, insert `user_roles`
- **Used by:** AccessRequests pagina (admin)

**POST /api/access-requests/:id/reject**
- **Purpose:** Afwijzen access request
- **Database:** Update `access_requests`
- **Used by:** AccessRequests pagina (admin)

#### Admin Stats API (`/api/admin-stats`)

**GET /api/admin-stats**
- **Purpose:** Dashboard statistics
- **Database:** Aggregates van `riders`, `zwift_api_events`, `sync_logs`
- **Used by:** DashboardModern
- **Returns:** Totals, averages, last sync times

---

### Deprecated/Unused Endpoints

#### ❌ Auto Sync API (`/api/auto-sync`)
- **Status:** Legacy, vervangen door sync-v2
- **Endpoints:** `/api/auto-sync/status`, `/api/auto-sync/force`
- **Service:** `autoSyncService` (disabled in server.ts line 143)
- **Actie:** Kan worden verwijderd

#### ❌ Clubs API (`/api/clubs/:id`)
- **Status:** Tabel bestaat maar endpoint ongebruikt
- **Reden:** Club data embedded in rider/event responses
- **Actie:** Kan worden verwijderd of behouden voor toekomst

#### ❌ Rider History API (`/api/rider-history/:riderId`)
- **Status:** Endpoint bestaat maar geen data sync
- **Database:** `rider_history` table (empty)
- **Actie:** Verwijderen of implementeren

#### ❌ Results API (`/api/results/:eventId`)
- **Status:** Endpoint bestaat maar geen data sync
- **Database:** `race_results` table (empty)
- **Reden:** Results API rate limit te strikt (1/min)
- **Actie:** Behouden voor toekomstige implementatie

---

## 🎨 Frontend Layer

### Active Pages

#### 1. **RacingDataMatrixModern** - Landing page
**Route:** `/`  
**Purpose:** Team member grid met power/race data  
**API Calls:**
- `GET /api/riders/team` → `view_my_team`
- `GET /api/admin-stats` → Dashboard stats

**Data Flow:**
```
view_my_team → GET /api/riders/team → RacingDataMatrixModern
riders table → (sync) → view_my_team
```

#### 2. **EventsModern** - Event overview
**Route:** `/events`  
**Purpose:** Upcoming events met sign-ups  
**API Calls:**
- `GET /api/events/upcoming` → `view_upcoming_events`
- `GET /api/events/:eventId/signups` → `zwift_api_event_signups`

**Data Flow:**
```
zwift_api_events + zwift_api_event_signups → view_upcoming_events → EventsModern
ZwiftRacing API → (NEAR/FAR_EVENT_SYNC) → zwift_api_events + zwift_api_event_signups
```

#### 3. **Riders / RidersModern** - Team roster
**Route:** `/riders`  
**Purpose:** Team member management  
**API Calls:**
- `GET /api/riders/team` → `view_my_team`
- `GET /api/riders/:zwiftId` → `riders` table

**Data Flow:**
```
riders → view_my_team → GET /api/riders/team → Riders
ZwiftRacing API → (RIDER_SYNC) → riders
```

#### 4. **SyncStatusModern** - Sync monitoring
**Route:** `/sync`  
**Purpose:** Monitor sync operations  
**API Calls:**
- `GET /api/sync-v2/metrics` → `sync_logs`
- `GET /api/sync-v2/coordinator/status` → Coordinator state
- `GET /api/rate-limiter/status` → Rate limiter state
- `POST /api/sync-v2/riders` → Trigger manual sync
- `POST /api/sync-v2/near-events` → Trigger event sync

**Data Flow:**
```
Sync services → sync_logs → GET /api/sync-v2/metrics → SyncStatusModern
Rate limiter → GET /api/rate-limiter/status → SyncStatusModern
```

#### 5. **DashboardModern** - Admin dashboard
**Route:** `/admin/dashboard`  
**Purpose:** System overview  
**API Calls:**
- `GET /api/admin-stats` → Aggregated stats
- `GET /api/sync-v2/metrics` → Recent syncs

**Data Flow:**
```
riders + zwift_api_events + sync_logs → GET /api/admin-stats → DashboardModern
```

#### 6. **AccessRequests** - User management
**Route:** `/admin/access-requests`  
**Purpose:** Goedkeuren/afwijzen Discord aanvragen  
**API Calls:**
- `GET /api/access-requests` → `access_requests`
- `POST /api/access-requests/:id/approve` → Update `access_requests` + `user_roles`
- `POST /api/access-requests/:id/reject` → Update `access_requests`

**Data Flow:**
```
Discord OAuth → access_requests → GET /api/access-requests → AccessRequests
Admin action → POST approve/reject → access_requests + user_roles
```

#### 7. **AdminHome** - Admin landing
**Route:** `/admin`  
**Purpose:** Admin tegel dashboard  
**API Calls:** Geen (alleen navigatie)  
**Links naar:**
- System Dashboard (`/admin/dashboard`)
- Sync Status (`/sync`)
- Team Management (`/riders`)
- Gebruikersbeheer (`/admin/access-requests`)

---

### Legacy/Deprecated Pages

#### ❌ **Dashboard** (oude versie)
**Route:** `/dashboard` (waarschijnlijk verwijderd)  
**Status:** Vervangen door DashboardModern  
**Actie:** Verwijderen

#### ❌ **RacingDataMatrix** (oude versie)
**Route:** Onbekend (vervangen door Modern versie)  
**Status:** Vervangen door RacingDataMatrixModern  
**Actie:** Verwijderen

#### ❌ **Events** (oude versie)
**Route:** Waarschijnlijk `/events` (vervangen)  
**Status:** Vervangen door EventsModern  
**Actie:** Verwijderen

#### ❌ **Sync** (oude versie)
**Route:** Waarschijnlijk `/sync` (vervangen)  
**Status:** Vervangen door SyncStatusModern  
**Actie:** Verwijderen

#### ❌ **Debug / AuthDebug**
**Route:** `/debug`, `/auth/debug`  
**Purpose:** Development debugging  
**Status:** Dev only, niet voor productie  
**Actie:** Behouden voor development

#### ❌ **UserManagement**
**Route:** `/admin/users`  
**Status:** Pagina bestaat maar niet gelinkt in UI  
**Purpose:** User role management (apart van access requests)  
**Actie:** Integreren met AccessRequests of verwijderen

---

## 🔄 Sync Architecture

### Sync Coordinator (Rate Limit Orchestration)

**File:** `backend/src/services/sync-coordinator.service.ts`

**Purpose:** Voorkomt sync conflicts en respecteert API rate limits

**Time Slots:**
- **RIDER_SYNC:** Elke 360 min (6u), offset 0 min → draait op :00
- **NEAR_EVENT_SYNC:** Elke 15 min, offset 5 min → draait op :05, :20, :35, :50
- **FAR_EVENT_SYNC:** Elke 120 min (2u), offset 30 min → draait op :30

**Priority Queue:**
1. NEAR_EVENT_SYNC (priority 1) - Events binnen 24u zijn urgent
2. RIDER_SYNC (priority 2) - Team data
3. FAR_EVENT_SYNC (priority 3) - Events ver weg

**Rate Limits:**
- `club_members` → 1 call / 60 min
- `rider_bulk` → 1 call / 15 min
- `events_upcoming` → 1 call / 1 min
- `event_signups` → 1 call / 1 min

### Sync Services

#### Sync V2 Service (Active)
**File:** `backend/src/services/sync-v2.service.ts`

**Methods:**
- `syncRiders()` - TeamNL members sync
  - API: `/public/clubs/11818` + `/public/riders` (POST bulk)
  - Updates: `riders` table
  - Rate limits: club_members (60min) + rider_bulk (15min)

- `syncNearEvents()` - Events binnen 24u
  - API: `/api/events/upcoming` + `/api/events/{id}/signups`
  - Updates: `zwift_api_events` + `zwift_api_event_signups`
  - Rate limits: events_upcoming (1min) + event_signups (1min per event)

- `syncFarEvents()` - Events buiten 24u
  - API: `/api/events/upcoming` + `/api/events/{id}/signups`
  - Updates: `zwift_api_events` + `zwift_api_event_signups`
  - Rate limits: events_upcoming (1min) + event_signups (1min per event)

**Coordinated Wrappers:**
- `syncRidersCoordinated()` - Queue via coordinator
- `syncNearEventsCoordinated()` - Queue via coordinator
- `syncFarEventsCoordinated()` - Queue via coordinator

#### Auto Sync Service (Deprecated)
**File:** `backend/src/services/auto-sync.service.ts`  
**Status:** ❌ Disabled in server.ts line 143  
**Reden:** Vervangen door sync-v2 met coordinator  
**Actie:** Kan worden verwijderd

---

## 🧹 Cleanup Opportunities

### 1. Legacy Code Verwijderen

#### Backend Services
- ❌ `backend/src/services/auto-sync.service.ts` - Disabled, vervangen door sync-v2
- ❌ `backend/src/api/endpoints/auto-sync.ts` - API voor oude service

#### Frontend Pages
- ❌ `backend/frontend/src/pages/Dashboard.tsx` - Vervangen door DashboardModern
- ❌ `backend/frontend/src/pages/RacingDataMatrix.tsx` - Vervangen door RacingDataMatrixModern
- ❌ `backend/frontend/src/pages/Events.tsx` - Vervangen door EventsModern
- ❌ `backend/frontend/src/pages/Sync.tsx` - Vervangen door SyncStatusModern
- ⚠️ `backend/frontend/src/pages/UserManagement.tsx` - Niet gelinkt, maar mogelijk nuttig later

### 2. Database Cleanup

#### Tables om te verwijderen (na verificatie):
- ❌ `event_signups` (oude signups tabel)
- ❌ `club_roster` (redundant, riders tabel bevat club_id)

#### Tables om te behouden (toekomstig gebruik):
- ✅ `clubs` - Voor club metadata (logo, description)
- ✅ `race_results` - Voor results sync (later implementeren)
- ✅ `rider_history` - Voor historical tracking (later implementeren)

#### Deprecated Columns (riders tabel):
- `ftp_deprecated`
- `category_racing_deprecated`
- `category_zftp_deprecated`

**Actie:** Kunnen worden verwijderd in volgende migration

### 3. Redundante Endpoints

#### API Endpoints om te verwijderen:
- ❌ `/api/auto-sync/*` - Legacy sync API
- ❌ `/api/clubs/:id` - Ongebruikt (of behouden voor toekomst)
- ❌ `/api/rider-history/:riderId` - Geen data, ongebruikt
- ❌ `/api/results/:eventId` - Geen data, ongebruikt

### 4. Migration Cleanup

#### Oude backups verwijderen:
- `riders_backup_20251106` - Backup vóór migration 006
- `riders_backup_20251107` - Backup vóór migration 007

**Actie:** Drop tables als migrations geverifieerd zijn

---

## ✅ Verification Checklist

### Database Schema
- [x] Alle actieve tabellen gedocumenteerd
- [x] Alle views gedocumenteerd
- [x] Deprecated kolommen geïdentificeerd
- [ ] Legacy tables geverifieerd als ongebruikt
- [ ] Foreign keys gedocumenteerd

### API Layer
- [x] Alle actieve endpoints gedocumenteerd
- [x] Database queries per endpoint gedocumenteerd
- [x] Deprecated endpoints geïdentificeerd
- [ ] Rate limits per endpoint geverifieerd
- [ ] Error handling geverifieerd

### Frontend Layer
- [x] Alle actieve pagina's gedocumenteerd
- [x] API calls per pagina gedocumenteerd
- [x] Data flow gedocumenteerd
- [ ] Legacy pagina's geverifieerd als ongebruikt
- [ ] Routing volledig gedocumenteerd

### Sync Architecture
- [x] Sync coordinator gedocumenteerd
- [x] Time slots gedocumenteerd
- [x] Priority queue gedocumenteerd
- [x] Rate limits gedocumenteerd
- [ ] Error recovery gedocumenteerd
- [ ] Monitoring gedocumenteerd

---

## 📋 Next Steps

### Immediate Actions (Priority 1)
1. **Verify legacy code usage** - Grep codebase voor references naar deprecated code
2. **Test redundancy removal** - Maak feature branch, verwijder legacy code, test volledig
3. **Update routing** - Verwijder oude routes uit App.tsx
4. **Database cleanup** - Drop oude backup tables

### Short Term (Priority 2)
5. **Consolidate user management** - Merge UserManagement features in AccessRequests
6. **Document foreign keys** - Add foreign key constraints waar missing
7. **Add indexes** - Optimize queries met indexes op vaak-gebruikte kolommen
8. **Error monitoring** - Setup Sentry of equivalent voor productie errors

### Long Term (Priority 3)
9. **Results sync implementation** - Implementeer race_results sync (rate limit permitting)
10. **Historical tracking** - Implementeer rider_history snapshots
11. **Club metadata** - Gebruik clubs tabel voor richer club info
12. **Performance optimization** - Add caching layer, optimize queries

---

## 🎯 Success Metrics

### Code Cleanliness
- ✅ Geen deprecated code in active paths
- ✅ Alle imports resolven (geen unused imports)
- ✅ Geen console warnings over missing data
- ✅ TypeScript strict mode zonder errors

### Data Consistency
- ✅ Alle views gebruiken correcte source tables
- ✅ Alle API endpoints gebruiken juiste kolommen
- ✅ Sync services updaten correcte tabellen
- ✅ Foreign keys enforced waar nodig

### Performance
- ✅ API response times < 500ms
- ✅ Page load times < 2s
- ✅ Database queries < 100ms
- ✅ Sync operations binnen rate limits

---

**Document Status:** 🟡 In Progress  
**Laatst Geüpdatet:** 17 november 2025  
**Volgende Review:** Na cleanup implementatie
