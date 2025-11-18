# TeamNL Cloud9 - Complete Architectuur

**Gegenereerd**: 18 november 2025  
**Status**: Production (Railway deployed)

---

## 📐 Systeem Overzicht

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EXTERNE API                                     │
│  🌐 ZwiftRacing.app API (https://zwift-ranking.herokuapp.com)           │
│     Rate Limits: rider_bulk (1/15min), event_signups (1/min)            │
└─────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ HTTP GET/POST
                                    │
┌───────────────────────────────────┼─────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                           │
│                                   │                                      │
│  ┌────────────────────────────────▼──────────────────────────────────┐  │
│  │  API CLIENT LAYER (src/api/zwift-client.ts)                       │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │  • getBulkRiders(riderIds[]) → POST /public/riders                │  │
│  │  • getUpcomingEvents() → GET /api/events/upcoming                 │  │
│  │  • getEventSignups(eventId) → GET /api/events/{id}/signups        │  │
│  │  • Rate limiter wrapper (axios-rate-limit)                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                   │                                      │
│  ┌────────────────────────────────▼──────────────────────────────────┐  │
│  │  SYNC SERVICES (src/services/)                                    │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │                                                                    │  │
│  │  🔄 RIDER_SYNC (sync-v2.service.ts)                               │  │
│  │     Cron: */6 * * * * (elke 6 min)                                │  │
│  │     Flow:                                                          │  │
│  │     1. Haal team rider IDs uit view_my_team                       │  │
│  │     2. POST bulk riders (max 1000, batch 50)                      │  │
│  │     3. Upsert naar riders tabel                                   │  │
│  │     4. Log naar sync_logs                                         │  │
│  │                                                                    │  │
│  │  🔄 NEAR_EVENT_SYNC (sync-v2.service.ts)                          │  │
│  │     Cron: 5,20,35,50 * * * * (4x per uur)                         │  │
│  │     Flow:                                                          │  │
│  │     1. GET events (upcoming, 48h window)                          │  │
│  │     2. Upsert events → zwift_api_events                           │  │
│  │     3. Filter "near" events (<120 min)                            │  │
│  │     4. Sync signups per event → zwift_api_event_signups           │  │
│  │     5. Wait 2 min tussen signups (rate limit)                     │  │
│  │                                                                    │  │
│  │  🔄 FAR_EVENT_SYNC (sync-v2.service.ts)                           │  │
│  │     Cron: 30 */2 * * * (elke 2 uur om :30)                        │  │
│  │     Flow:                                                          │  │
│  │     1. GET events (upcoming, 48h window)                          │  │
│  │     2. Upsert events → zwift_api_events                           │  │
│  │     3. Filter "far" events (>120 min)                             │  │
│  │     4. Check welke events NEW zijn                                │  │
│  │     5. Sync alleen NEW events (efficiency)                        │  │
│  │     6. Unless force=true → sync all                               │  │
│  │                                                                    │  │
│  │  🧹 WEEKLY_CLEANUP (event-cleanup.service.ts)                     │  │
│  │     Cron: 0 3 * * 0 (Zondag 03:00)                                │  │
│  │     Flow:                                                          │  │
│  │     1. Delete events >100 dagen oud                               │  │
│  │     2. Delete past events zonder team participation               │  │
│  │     3. Keep events met team riders <100 dagen                     │  │
│  │     4. Delete future events >48h zonder team signups              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                   │                                      │
│  ┌────────────────────────────────▼──────────────────────────────────┐  │
│  │  SUPABASE SERVICE (src/services/supabase.service.ts)              │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │  Repository pattern voor alle database operaties                  │  │
│  │  • upsertRiders(), getRider(), getAllTeamRiderIds()               │  │
│  │  • upsertEvents(), getEvents(), getUpcomingEvents()               │  │
│  │  • upsertEventSignups(), getSignupCountsForEvents()               │  │
│  │  • createSyncLog(), getSyncLogs()                                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                   │                                      │
│  ┌────────────────────────────────▼──────────────────────────────────┐  │
│  │  REST API ENDPOINTS (src/api/endpoints/)                          │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │                                                                    │  │
│  │  📡 /api/riders (riders.ts)                                       │  │
│  │     GET  /               - List all riders                        │  │
│  │     GET  /:riderId       - Single rider details                   │  │
│  │     POST /sync           - Manual rider sync                      │  │
│  │                                                                    │  │
│  │  📡 /api/events (events.ts)                                       │  │
│  │     GET  /               - All events                             │  │
│  │     GET  /upcoming       - Upcoming events (36h window)           │  │
│  │     POST /sync           - Manual event sync                      │  │
│  │                                                                    │  │
│  │  📡 /api/results (results.ts)                                     │  │
│  │     GET  /               - All race results                       │  │
│  │     GET  /:eventId       - Results for event                      │  │
│  │     POST /:eventId/sync  - Sync event results                     │  │
│  │                                                                    │  │
│  │  📡 /api/sync (sync-v2.ts) - MANUAL TRIGGERS                      │  │
│  │     POST /riders         - Trigger RIDER_SYNC                     │  │
│  │     POST /events/near    - Trigger NEAR_EVENT_SYNC                │  │
│  │     POST /events/far     - Trigger FAR_EVENT_SYNC                 │  │
│  │                                                                    │  │
│  │  📡 /api/cleanup (cleanup.ts)                                     │  │
│  │     POST /events         - Full cleanup (past + stale)            │  │
│  │     POST /events/past    - Cleanup old events only                │  │
│  │     POST /events/stale   - Cleanup stale future only              │  │
│  │     GET  /stats          - Dry-run statistics                     │  │
│  │                                                                    │  │
│  │  📡 /api/sync-logs (sync-logs.ts)                                 │  │
│  │     GET  /               - Sync history & metrics                 │  │
│  │                                                                    │  │
│  │  📡 /api/clubs (clubs.ts)                                         │  │
│  │     GET  /               - Club info                              │  │
│  │                                                                    │  │
│  │  📡 /api/history (rider-history.ts)                               │  │
│  │     GET  /:riderId       - Rider historical snapshots             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      │ Supabase Client (PostgreSQL)
                                      │
┌─────────────────────────────────────▼───────────────────────────────────┐
│                       DATABASE (Supabase PostgreSQL)                     │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  📊 CORE TABLES (Physical storage)                               │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │                                                                   │  │
│  │  🏢 clubs                                                         │  │
│  │     PK: id                                                        │  │
│  │     • club_id (Zwift club ID)                                    │  │
│  │     • name, description                                          │  │
│  │     • member_count                                               │  │
│  │                                                                   │  │
│  │  👤 riders (Team members data)                                   │  │
│  │     PK: id                                                        │  │
│  │     UK: rider_id (Zwift rider ID)                                │  │
│  │     FK: club_id → clubs.club_id                                  │  │
│  │     • name, weight, height                                       │  │
│  │     • ftp, power_wkg_5min, power_wkg_30min                       │  │
│  │     • race_category, race_ranking                                │  │
│  │     • last_synced                                                │  │
│  │     Generated: watts_per_kg (ftp/weight)                         │  │
│  │                                                                   │  │
│  │  📅 zwift_api_events (All Zwift events)                          │  │
│  │     PK: id                                                        │  │
│  │     UK: event_id (Zwift event ID, TEXT)                          │  │
│  │     • time_unix (event start timestamp)                          │  │
│  │     • title, event_type, sub_type                                │  │
│  │     • distance_meters, elevation_meters                          │  │
│  │     • route_id, route_name, route_world                          │  │
│  │     • organizer, category_enforcement                            │  │
│  │     • raw_response (JSON), last_synced                           │  │
│  │                                                                   │  │
│  │  📝 zwift_api_event_signups (Event registrations)                │  │
│  │     PK: id                                                        │  │
│  │     UK: (event_id, rider_id, pen_name)                           │  │
│  │     FK: event_id → zwift_api_events.event_id (TEXT)              │  │
│  │     • rider_id, rider_name                                       │  │
│  │     • pen_name (category: A/B/C/D/E)                             │  │
│  │     • weight, height                                             │  │
│  │     • club_id, club_name                                         │  │
│  │     • power_wkg5, power_wkg30, power_cp                          │  │
│  │     • race_rating, race_finishes, race_wins, race_podiums       │  │
│  │     • raw_data (JSON)                                            │  │
│  │                                                                   │  │
│  │  🏆 zwift_api_race_results (Race outcomes)                       │  │
│  │     PK: id                                                        │  │
│  │     UK: (event_id, rider_id)                                     │  │
│  │     • event_id, rider_id, rider_name                             │  │
│  │     • rank, category, time_seconds                               │  │
│  │     • avg_power, avg_wkg, is_disqualified                        │  │
│  │     • raw_response (JSON)                                        │  │
│  │                                                                   │  │
│  │  📜 sync_logs (Sync monitoring)                                  │  │
│  │     PK: id                                                        │  │
│  │     • endpoint (RIDER_SYNC, NEAR_EVENT_SYNC, FAR_EVENT_SYNC)    │  │
│  │     • status (success, partial, error, running)                  │  │
│  │     • records_processed                                          │  │
│  │     • error_message (bevat ook success metrics!)                 │  │
│  │     • synced_at                                                  │  │
│  │                                                                   │  │
│  │  🗂️ rider_history_snapshots (Historical tracking)               │  │
│  │     PK: id                                                        │  │
│  │     UK: (rider_id, snapshot_date)                                │  │
│  │     • rider_id, name, ftp, weight                                │  │
│  │     • race_category, race_ranking                                │  │
│  │     • snapshot_date                                              │  │
│  │                                                                   │  │
│  │  ⚙️ sync_config (Dynamic sync settings)                          │  │
│  │     PK: id                                                        │  │
│  │     UK: key                                                       │  │
│  │     • key, value, description                                    │  │
│  │     Keys: lookforwardHours, nearEventThresholdMinutes, etc.      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  👁️ VIEWS (Virtual tables - queries only)                        │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │                                                                   │  │
│  │  🏆 view_my_team                                                 │  │
│  │     SELECT riders.* FROM riders                                  │  │
│  │     JOIN my_team_members ON riders.rider_id = my_team_members... │  │
│  │     ⚠️ Gebruikt my_team_members tabel (handmatig beheerd)        │  │
│  │                                                                   │  │
│  │  📅 view_upcoming_events                                         │  │
│  │     SELECT * FROM zwift_api_events                               │  │
│  │     WHERE time_unix >= now AND time_unix <= (now + 36h)          │  │
│  │     ORDER BY time_unix ASC                                       │  │
│  │                                                                   │  │
│  │  🎯 view_team_events (Events met team participation)             │  │
│  │     SELECT events.*, COUNT(signups) as team_count                │  │
│  │     FROM zwift_api_events events                                 │  │
│  │     JOIN zwift_api_event_signups signups                         │  │
│  │     JOIN view_my_team team ON signups.rider_id = team.rider_id  │  │
│  │     WHERE time_unix >= now AND time_unix <= (now + 36h)          │  │
│  │     GROUP BY events.id                                           │  │
│  │     HAVING COUNT(signups) > 0                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ REST API calls
                                      │
┌─────────────────────────────────────▼───────────────────────────────────┐
│                        FRONTEND (React + Vite)                           │
│                                                                          │
│  📱 Pages (frontend/src/pages/)                                          │
│     • Dashboard.tsx           - Overview met sync status                 │
│     • Events.tsx              - Upcoming events lijst                    │
│     • EventDetail.tsx         - Event details + signups                  │
│     • Riders.tsx              - Team roster                              │
│     • RiderDetail.tsx         - Rider profiel + stats                    │
│                                                                          │
│  🔧 Utilities                                                            │
│     • sync-scheduler.html     - Manual sync triggers (admin)             │
│     • event-debugger.html     - Event sync troubleshooting               │
│     • favorites-manager.html  - Rider favorites beheer                   │
│                                                                          │
│  📊 API Calls (via fetch/axios)                                          │
│     GET  /api/events/upcoming → Events.tsx                               │
│     GET  /api/riders          → Riders.tsx                               │
│     GET  /api/sync-logs       → Dashboard.tsx                            │
│     POST /api/sync/events/far → sync-scheduler.html                      │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: Event Sync (Voorbeeld)

### Scenario: FAR_EVENT_SYNC draait (automatisch elk 2 uur)

```
1️⃣ CRON TRIGGER (server.ts)
   └─> cron.schedule('30 */2 * * *')
       └─> syncServiceV2.syncFarEventsCoordinated()

2️⃣ SYNC SERVICE (sync-v2.service.ts)
   └─> zwiftClient.getEvents48Hours()
       └─> GET https://zwift-ranking.herokuapp.com/api/events/upcoming
           ✅ Response: 800+ events (JSON array)
   
   └─> Filter events: time > (now + 120 min) = "far events"
       ✅ Result: 301 far events
   
   └─> supabase.upsertEvents(eventsToSave)
       └─> INSERT INTO zwift_api_events (...)
           ON CONFLICT (event_id) DO UPDATE
           ✅ 301 events saved/updated
   
   └─> Check which events are NEW
       └─> Compare with existing event_ids in DB
           ✅ 0 new (all 301 already existed)
   
   └─> Skip signups for existing events (efficiency)
       ⚠️ Unless force=true parameter
   
   └─> supabase.createSyncLog()
       └─> INSERT INTO sync_logs (
             endpoint: 'FAR_EVENT_SYNC',
             status: 'success',
             records_processed: 301,
             error_message: 'Events: 305 | Far: 301 | New: 0 | Skipped: 301'
           )

3️⃣ FRONTEND REFRESH (Events.tsx)
   └─> useEffect(() => fetch('/api/events/upcoming'))
       └─> GET /api/events/upcoming
           └─> supabase.client
                 .from('view_upcoming_events')
                 .select('*')
           ✅ Returns 305 events
   
   └─> Display in UI: Event cards with tijd, titel, type
```

---

## ⚠️ KRITIEKE WAARSCHUWING: Dubbele Rider Sync

### ❌ PROBLEEM: Er zijn 2 rider sync mechanismen actief!

**1. OUDE SYNC (deprecated maar mogelijk nog actief):**
```typescript
// Locatie: mogelijk in oude sync.service.ts of events.ts
syncService.syncClubMembers()  // ❌ VEROUDERD
  └─> GET /public/clubs/11818/riders
      └─> Sync riders obv club membership
```

**2. NIEUWE SYNC V2 (correct, nu actief):**
```typescript
// Locatie: sync-v2.service.ts
syncServiceV2.syncRiders()  // ✅ CORRECT
  └─> view_my_team → rider_id lijst
  └─> POST /public/riders (bulk, max 1000)
      └─> Sync only team members
```

### 🔍 Hoe te detecteren:

```bash
# Check sync logs voor dubbele rider syncs
curl https://your-app.railway.app/api/sync-logs | jq '.logs[] | select(.endpoint | contains("rider") or contains("bulk"))'

# Zoek in codebase naar oude sync calls
grep -r "syncClubMembers\|/public/clubs/.*/riders" backend/src/
```

### ✅ Oplossing:

1. **Verwijder oude sync mechanisme:**
   - Zoek oude `syncClubMembers()` calls
   - Verwijder oude club-based rider sync routes
   - Check `server.ts` voor oude cron jobs

2. **Gebruik alleen RIDER_SYNC V2:**
   - Sync via `view_my_team` (centrale bron van waarheid)
   - Bulk POST endpoint (1000 riders per call)
   - Rate limit 1/15min (efficiënt)

---

## 📊 Database Relaties (ERD)

```
┌─────────────┐
│   clubs     │
│─────────────│
│ id (PK)     │◄────┐
│ club_id (UK)│     │
│ name        │     │ FK
│ member_count│     │
└─────────────┘     │
                    │
┌─────────────┐     │
│   riders    │     │
│─────────────│     │
│ id (PK)     │     │
│ rider_id(UK)│     │
│ club_id     │─────┘
│ name        │
│ ftp         │
│ weight      │
│ race_ranking│
└─────────────┘
       ▲
       │ FK (via view_my_team)
       │
┌──────────────────────┐
│ zwift_api_event_     │
│      signups         │
│──────────────────────│
│ id (PK)              │
│ event_id (FK) ───────┼─────┐
│ rider_id             │     │
│ pen_name             │     │
│ weight, power_wkg5   │     │
│ club_id, club_name   │     │
└──────────────────────┘     │
                             │
                             │
┌──────────────────────┐     │
│ zwift_api_events     │     │
│──────────────────────│     │
│ id (PK)              │◄────┘
│ event_id (UK, TEXT)  │
│ time_unix            │
│ title                │
│ event_type           │
│ route_id             │
└──────────────────────┘
       ▲
       │ FK
       │
┌──────────────────────┐
│ zwift_api_race_      │
│      results         │
│──────────────────────│
│ id (PK)              │
│ event_id (FK)        │
│ rider_id             │
│ rank, category       │
│ time_seconds         │
│ avg_power, avg_wkg   │
└──────────────────────┘
```

---

## 🔐 Belangrijke Configuratie

### Environment Variables (.env)
```bash
# Database
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_ANON_KEY=eyJ...

# ZwiftRacing API
ZWIFT_API_TOKEN=650c6d2fc4...

# Server
PORT=3000
NODE_ENV=production
```

### Sync Config (sync_config table)
```sql
-- Dynamic runtime config
INSERT INTO sync_config (key, value) VALUES
  ('lookforwardHours', '36'),
  ('nearEventThresholdMinutes', '120'),
  ('farEventSyncIntervalMinutes', '120'),
  ('nearEventSyncIntervalMinutes', '15'),
  ('riderSyncIntervalMinutes', '6');
```

---

## 📝 Belangrijke Opmerkingen

### 1. Team Member Source of Truth
- **Centrale bron**: `my_team_members` tabel (handmatig beheerd)
- **View**: `view_my_team` (join riders + my_team_members)
- **Sync gebruikt**: view_my_team voor rider_id lijst
- **⚠️ Nooit** direct `riders` tabel gebruiken voor team logic!

### 2. Event ID Consistency
- `zwift_api_events.event_id` = **TEXT** (Zwift format: "5144485")
- `zwift_api_event_signups.event_id` = **TEXT** (matching)
- Foreign key relatie via TEXT field

### 3. Rate Limiting Strategy
- **rider_bulk**: 1 call per 15 min (1000 riders max)
- **event_signups**: 1 call per 1 min (per event)
- **Far events**: 2 min delay tussen signups calls
- **Near events**: 200ms delay (sneller voor urgente data)

### 4. Sync Efficiency
- **FAR_EVENT_SYNC**: Sync alleen NEW events (behalve force=true)
- **NEAR_EVENT_SYNC**: Sync altijd (frequent updates nodig)
- **RIDER_SYNC**: Batch 50 riders per API call

### 5. Cleanup Strategy (NEW)
- **Weekly**: Zondag 03:00 (laag verkeer)
- **Keep**: Past events met team participation (<100 dagen)
- **Delete**: Events >100 dagen oud
- **Delete**: Past events zonder team
- **Delete**: Future events >48h zonder team signups

---

## 🚀 Deployment Flow

```
LOCAL DEVELOPMENT
    │
    │ git commit + push
    ▼
GITHUB REPOSITORY (main branch)
    │
    │ webhook
    ▼
RAILWAY (Auto-deploy)
    │
    ├─> Build: npm run build
    ├─> Start: npm start
    └─> Deploy: https://teamnl-cloud9-backend.up.railway.app
         │
         ├─> Cron schedulers start automatically
         ├─> Connect to Supabase via env vars
         └─> Serve frontend + API endpoints
```

---

## 🔍 Troubleshooting Tools

### Admin Interfaces (backend/public/)
1. **sync-scheduler.html** - Manual sync triggers
   - Rider sync, Near events, Far events
   - Force parameter support
   - Real-time status updates

2. **event-debugger.html** - Event sync debugging
   - Total events count
   - Upcoming events filter
   - Last sync timestamp
   - Raw API endpoint testing

3. **favorites-manager.html** - Team roster management
   - Add/remove favorite riders
   - View current team members
   - Sync with my_team_members

### API Health Checks
```bash
# Backend health
curl https://your-app.railway.app/api/health

# Sync logs (laatste 10)
curl https://your-app.railway.app/api/sync-logs?limit=10

# Event count
curl https://your-app.railway.app/api/events | jq '.count'

# Rider count
curl https://your-app.railway.app/api/riders | jq '.count'
```

---

**Last Updated**: 18 november 2025  
**Version**: 2.0.0-clean (post-cleanup implementation)
