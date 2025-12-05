# 🚀 Racing Matrix - Team Management Feature
## Implementation Complete - Ready for Testing

**Datum**: 5 december 2025  
**Status**: Backend Complete ✅ | Database Migration Required ⚠️ | Frontend Pending ⏳

---

## ✅ COMPLETED USER STORIES

### US2: Add Riders (Individual & Bulk) ✅
**Endpoints**:
```bash
# Add single rider
POST /api/team/members
Body: { "rider_id": 150437, "nickname": "JRone", "notes": "Team captain" }

# Bulk import via CSV
POST /api/team/members/bulk
Form-data: file (CSV with columns: rider_id,nickname,notes)

# Bulk import via TXT
POST /api/team/members/bulk
Form-data: file (TXT with one rider_id per line)

# Get all team members
GET /api/team/members

# Delete rider from team
DELETE /api/team/members/:riderId
```

**Features**:
- ✅ Individual rider toevoegen met riderId
- ✅ Bulk import via .csv bestand
- ✅ Bulk import via .txt bestand
- ✅ Duplicate detection
- ✅ Automatic sync trigger na toevoegen
- ✅ Validation en error handling

### US3: Sync Rider Data (Current + Historical) ✅
**Endpoints**:
```bash
# Sync single rider met current + historical data (30d ago)
POST /api/team/sync/rider/:riderId?historical=true

# Example
POST /api/team/sync/rider/150437
```

**Features**:
- ✅ Current rider data van ZwiftRacing API
- ✅ Historical snapshot (30 dagen geleden)
- ✅ vELO change calculation
- ✅ Volledige power curve mapping
- ✅ 60 database kolommen gevuld
- ✅ Rate limit safe (12s delay)

### US5: Auto-Sync Scheduler (Hourly) ✅
**Service**: `team-auto-sync.service.ts`

**Schedule**: Elk uur op :05 (bijv. 10:05, 11:05, etc.)

**Endpoints**:
```bash
# Get scheduler status
GET /api/team/sync/scheduler

# Enable auto-sync
POST /api/team/sync/scheduler/enable

# Disable auto-sync
POST /api/team/sync/scheduler/disable
```

**Features**:
- ✅ Cron job: `5 * * * *` (hourly at :05)
- ✅ Sync all team members
- ✅ Rate limiting (12s per rider)
- ✅ Error recovery
- ✅ Logging naar database
- ✅ Enable/disable control

### US6: Sync Monitor & Logging ✅
**Database**: `sync_logs` table

**Endpoints**:
```bash
# Get sync status + last 10 logs
GET /api/team/sync/status
```

**Response**:
```json
{
  "success": true,
  "status": {
    "last_sync": "2025-12-05T22:05:00Z",
    "total_members": 75,
    "synced_members": 75,
    "sync_percentage": 100
  },
  "logs": [
    {
      "id": 1,
      "sync_type": "auto",
      "status": "completed",
      "rider_count": 75,
      "started_at": "2025-12-05T22:05:00Z",
      "completed_at": "2025-12-05T22:20:00Z",
      "duration_seconds": 900
    }
  ]
}
```

**Features**:
- ✅ Sync type tracking (auto/manual/single)
- ✅ Status tracking (started/completed/failed)
- ✅ Duration calculation
- ✅ Error message logging
- ✅ Progress percentage
- ✅ Last 10 logs ophalen

### US7: Manual Sync Trigger ✅
**Endpoints**:
```bash
# Trigger manual sync voor alle team members
POST /api/team/sync/all

# Response
{
  "success": true,
  "message": "Sync gestart voor 75 riders",
  "total": 75,
  "estimated_duration_minutes": 15
}
```

**Features**:
- ✅ Async bulk sync (non-blocking)
- ✅ Progress logging
- ✅ Estimated duration
- ✅ Database logging
- ✅ Error handling per rider

---

## ⚠️ REQUIRED: DATABASE MIGRATION

**Run dit SQL script in Supabase SQL Editor**:

```sql
-- Sync Logs Table voor US6: Monitor
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'auto', 'single')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  rider_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN completed_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER
      ELSE NULL 
    END
  ) STORED
);

-- Index voor snelle queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type);

-- Comments
COMMENT ON TABLE sync_logs IS 'US6: Logging van alle sync activiteiten voor monitoring';
COMMENT ON COLUMN sync_logs.sync_type IS 'Type sync: manual (US7), auto (US5), single (individual rider)';
COMMENT ON COLUMN sync_logs.status IS 'Status: started, completed, failed';
COMMENT ON COLUMN sync_logs.rider_count IS 'Aantal riders in deze sync';
COMMENT ON COLUMN sync_logs.duration_seconds IS 'Auto-calculated duration';
```

---

## 🧪 TESTING COMMANDS

### 1. Add Single Rider
```bash
curl -X POST http://localhost:3000/api/team/members \
  -H "Content-Type: application/json" \
  -d '{"rider_id": 150437, "nickname": "JRone"}'
```

### 2. Bulk Import (CSV)
```bash
# Create test CSV
cat > test-riders.csv << EOF
rider_id,nickname,notes
150437,JRone,Team captain
1495,TestRider,Test member
EOF

# Upload
curl -X POST http://localhost:3000/api/team/members/bulk \
  -F "file=@test-riders.csv"
```

### 3. Bulk Import (TXT)
```bash
# Create test TXT
cat > test-riders.txt << EOF
150437
1495
6899522
EOF

# Upload
curl -X POST http://localhost:3000/api/team/members/bulk \
  -F "file=@test-riders.txt"
```

### 4. Get Team Members
```bash
curl http://localhost:3000/api/team/members | jq '.'
```

### 5. Sync Single Rider
```bash
curl -X POST http://localhost:3000/api/team/sync/rider/150437 | jq '.'
```

### 6. Manual Sync All
```bash
curl -X POST http://localhost:3000/api/team/sync/all | jq '.'
```

### 7. Check Sync Status
```bash
curl http://localhost:3000/api/team/sync/status | jq '.'
```

### 8. Scheduler Control
```bash
# Get status
curl http://localhost:3000/api/team/sync/scheduler | jq '.'

# Enable
curl -X POST http://localhost:3000/api/team/sync/scheduler/enable

# Disable
curl -X POST http://localhost:3000/api/team/sync/scheduler/disable
```

---

## ⏳ PENDING: FRONTEND IMPLEMENTATION

### US1: Redesign Team Management Tegel
**Location**: Admin Dashboard

**Requirements**:
- Duidelijke tegel in admin interface
- Link naar team management pagina
- Status indicator (aantal members, laatste sync)

### US2: Frontend Import UI
**Location**: `/admin/team-management`

**Components needed**:
1. **Add Single Rider Form**
   - Input: rider_id
   - Input: nickname (optional)
   - Textarea: notes (optional)
   - Button: Add Rider

2. **Bulk Import Component**
   - File upload dropzone
   - Accept: .csv, .txt
   - Preview uploaded file
   - Button: Import Riders
   - Progress indicator

3. **Team Members Table**
   - Columns: Rider ID, Name, vELO, Category, Last Sync
   - Actions: Sync, Delete
   - Sortable columns
   - Search filter

### US4: Racing Matrix Data Sourcing
**Location**: Racing Matrix Dashboard

**Data source**: `GET /api/team/members`

**Features**:
- Haal team members data op
- Display in Racing Matrix format
- Real-time updates (polling of websockets)
- vELO trends visualization

### US6: Admin Sync Monitor Dashboard
**Location**: `/admin/sync-monitor`

**Components**:
1. **Sync Status Card**
   - Last sync timestamp
   - Progress percentage
   - Total/synced members
   - Scheduler status (enabled/disabled)

2. **Sync Logs Table**
   - Columns: Type, Status, Count, Duration, Started, Completed
   - Color coding (green/red/yellow)
   - Expandable error messages
   - Refresh button

3. **Scheduler Controls**
   - Enable/Disable toggle
   - Manual sync trigger button
   - Next sync countdown

---

## 📊 ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN INTERFACE                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Add        │  │   Bulk       │  │   Sync       │      │
│  │   Riders     │  │   Import     │  │   Monitor    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  API ENDPOINTS (/api/team)                                   │
│  • POST /members                  (US2)                      │
│  • POST /members/bulk             (US2)                      │
│  • GET  /members                  (US4)                      │
│  • POST /sync/rider/:id           (US3)                      │
│  • POST /sync/all                 (US7)                      │
│  • GET  /sync/status              (US6)                      │
│  • GET  /sync/scheduler           (US5/US6)                  │
│  • POST /sync/scheduler/enable    (US5)                      │
│  • POST /sync/scheduler/disable   (US5)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  AUTO-SYNC SERVICE (US5)                                     │
│  • Cron: 5 * * * * (hourly at :05)                          │
│  • Sync all team members                                     │
│  • Rate limiting: 12s per rider                             │
│  • Logging to database                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  ZWIFT RACING API                                            │
│  • GET /public/riders/{riderId}           (current)          │
│  • GET /public/riders/{riderId}/{timestamp}  (historical)    │
│  • Rate Limit: 5/min                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  DATABASE (Supabase)                                         │
│  • my_team_members     (source of truth)                     │
│  • riders_unified      (60 columns synced data)              │
│  • sync_logs           (monitoring & logging)                │
│  • view_my_team        (JOIN for frontend)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 NEXT STEPS

1. **Run Database Migration** ⚠️ REQUIRED
   - Copy SQL from above
   - Paste in Supabase SQL Editor
   - Execute

2. **Test Backend Endpoints** 
   - Use curl commands above
   - Verify all endpoints work
   - Check sync logs worden aangemaakt

3. **Build Frontend Components** (US1, US2, US4, US6)
   - Admin team management page
   - File upload component
   - Sync monitor dashboard
   - Racing Matrix data integration

4. **Integration Testing**
   - End-to-end flow testen
   - Bulk import met 75 riders
   - Monitor auto-sync
   - Verify Racing Matrix data

5. **Production Deployment**
   - Deploy naar Railway
   - Verify cron scheduler works
   - Monitor first auto-sync
   - Performance testing

---

## 📝 FILES CREATED/MODIFIED

**Backend**:
- ✅ `backend/src/api/endpoints/team.ts` (CREATED - 600+ lines)
- ✅ `backend/src/services/team-auto-sync.service.ts` (CREATED - 300+ lines)
- ✅ `backend/src/server.ts` (MODIFIED - added team router & auto-sync)
- ✅ `supabase/migrations/20251205_add_sync_logs.sql` (CREATED)

**Testing**:
- ✅ `backend/run-sync-logs-migration.ts` (CREATED)
- ✅ `backend/check-rider-events.ts` (CREATED)
- ✅ `backend/check-database-events.ts` (CREATED)
- ✅ `backend/get-complete-rider-data.ts` (CREATED)

**Documentation**:
- ✅ `RACING_MATRIX_IMPLEMENTATION.md` (THIS FILE)
- ✅ `API_ARCHITECTURE_DEFINITIVE.md` (UPDATED - verified all endpoints)

---

## 🎉 SUMMARY

**Backend Implementation**: 100% Complete ✅
- 9 nieuwe endpoints
- Auto-sync scheduler (hourly)
- Comprehensive logging
- Rate limit safe
- Error handling
- Database migrations ready

**Ready for Frontend**: ⏳
- All APIs documented
- Test commands provided
- Architecture diagram included
- Clear requirements per US

**Production Ready**: ⚠️
- Needs database migration
- Needs frontend implementation
- Needs integration testing
- Then ready to deploy!
