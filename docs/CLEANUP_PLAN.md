# Cleanup Plan - Legacy Code Verwijdering
**Datum:** 17 november 2025  
**Doel:** Verwijder redundante code en voorkom toekomstige verwarring

---

## 🎯 Scope

Dit document beschrijft welke bestanden kunnen worden verwijderd en waarom. Alle legacy code is vervangen door moderne equivalenten.

---

## 📦 Phase 1: Backend Services Cleanup

### ❌ Auto Sync Service (Vervangen door Sync V2)

**Files to DELETE:**
```
backend/src/services/auto-sync.service.ts
backend/src/api/endpoints/auto-sync.ts
backend/dist/services/auto-sync.service.js
backend/dist/services/auto-sync.service.d.ts
backend/dist/api/endpoints/auto-sync.js
```

**Reason:**
- Vervangen door `sync-v2.service.ts` met coordinator
- Al disabled in `server.ts` (line 145)
- Veroorzaakte rate limit conflicts

**Verification:**
```bash
# Check for imports
grep -r "auto-sync.service" backend/src/
grep -r "AutoSyncService" backend/src/
grep -r "/api/auto-sync" backend/frontend/src/
```

**Expected:** Alleen matches in:
- `server.ts` (import, maar disabled)
- `auto-sync.ts` endpoint (wordt verwijderd)

**Server.ts cleanup:**
```typescript
// REMOVE these lines:
import { autoSyncService } from './services/auto-sync.service.js';  // Line 26
// autoSyncService.start();  // Line 145 (already commented)

// REMOVE route:
app.use('/api/auto-sync', autoSyncRouter);  // Find and remove
```

---

## 🎨 Phase 2: Frontend Pages Cleanup

### ❌ Legacy Dashboard Components

**Files to DELETE:**
```
backend/frontend/src/pages/Dashboard.tsx
backend/frontend/src/pages/RacingDataMatrix.tsx
backend/frontend/src/pages/Events.tsx
backend/frontend/src/pages/Sync.tsx
backend/frontend/src/pages/Riders.tsx (if RidersModern is complete)
backend/frontend/src/pages/Clubs.tsx (unused)
```

**Reason:**
- Vervangen door `*Modern.tsx` equivalenten
- Oude UI patterns (niet TailwindCSS v3)
- Incomplete features

**App.tsx cleanup:**
```typescript
// REMOVE these imports:
import Dashboard from './pages/Dashboard'  // Line 4
import RacingDataMatrix from './pages/RacingDataMatrix'  // Find line
import Events from './pages/Events'  // Line 8
import Sync from './pages/Sync'  // Line 10
import Clubs from './pages/Clubs'  // Line 6

// REMOVE these routes:
<Route path="/old-dashboard" element={<Dashboard />} />
<Route path="/clubs" element={<div className="max-w-7xl mx-auto"><Clubs /></div>} />
// ... any other old routes
```

**Verification before deletion:**
```bash
# Check for component usage
grep -r "import.*Dashboard[^M]" backend/frontend/src/
grep -r "import.*RacingDataMatrix[^M]" backend/frontend/src/
grep -r "import.*Events[^M]" backend/frontend/src/
grep -r "import.*Sync[^S]" backend/frontend/src/
grep -r "<Clubs" backend/frontend/src/
```

**Expected:** Alleen matches in App.tsx imports

### ⚠️ UserManagement.tsx - KEEP for now

**File:** `backend/frontend/src/pages/UserManagement.tsx`

**Status:** Niet gelinkt in UI, maar mogelijk nuttig

**Decision:** KEEP
- Goede user role management features
- Kan later geïntegreerd worden met AccessRequests
- Kleine file size (~300 lines)

---

## 🗄️ Phase 3: Database Cleanup

### ❌ Backup Tables (Oude migrations)

**Tables to DROP:**
```sql
DROP TABLE IF EXISTS riders_backup_20251106;
DROP TABLE IF EXISTS riders_backup_20251107;
```

**Reason:**
- Backups van migration 006 en 007
- Migrations zijn succesvol, backups niet meer nodig
- Bespaar database ruimte

**Verification:**
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'riders_backup%';

-- Check size
SELECT pg_size_pretty(pg_total_relation_size('riders_backup_20251106'));
SELECT pg_size_pretty(pg_total_relation_size('riders_backup_20251107'));
```

**Create migration:**
```sql
-- supabase/migrations/016_cleanup_backup_tables.sql
DROP TABLE IF EXISTS riders_backup_20251106;
DROP TABLE IF EXISTS riders_backup_20251107;
```

### ❌ Event Signups (Oude tabel)

**Table to DROP:**
```sql
DROP TABLE IF EXISTS event_signups;  -- Not zwift_api_event_signups!
```

**Reason:**
- Vervangen door `zwift_api_event_signups` (migration 014)
- Oude structure met verkeerde primary key
- Geen views of queries gebruiken deze nog

**Verification:**
```sql
-- Check for references
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name = 'event_signups' OR ccu.table_name = 'event_signups');

-- Check for views
SELECT table_name, view_definition 
FROM information_schema.views 
WHERE view_definition LIKE '%event_signups%' 
  AND view_definition NOT LIKE '%zwift_api_event_signups%';
```

**Expected:** No results

### ❌ Club Roster (Redundant)

**Table to DROP:**
```sql
DROP TABLE IF EXISTS club_roster;
```

**Reason:**
- Redundant - `riders` table heeft `club_id` kolom
- Query: `SELECT * FROM riders WHERE club_id = 2281` geeft zelfde resultaat
- Geen sync service vult deze tabel

**Verification:**
```bash
# Check for usage in code
grep -r "club_roster" backend/src/
grep -r "club_roster" backend/frontend/src/
```

**Expected:** No matches (or only in schema.sql)

### ✅ Tables to KEEP (maar niet actief)

**race_results** - KEEP
- Tabel leeg maar structuur goed
- Toekomstige implementatie mogelijk (rate limit permitting)
- Foreign keys naar events/riders

**rider_history** - KEEP
- Historical snapshots mogelijk nuttig
- Analytics features later
- Geen disk space verspilling (leeg)

**clubs** - KEEP
- Club metadata (logo, description)
- Klein tabel, geen overhead
- Mogelijk toekomstig gebruik

### ❌ Deprecated Columns (riders tabel)

**Columns to DROP:**
```sql
ALTER TABLE riders DROP COLUMN IF EXISTS ftp_deprecated;
ALTER TABLE riders DROP COLUMN IF EXISTS category_racing_deprecated;
ALTER TABLE riders DROP COLUMN IF EXISTS category_zftp_deprecated;
```

**Reason:**
- Oude namen van migration 007
- `_deprecated` suffix = niet gebruiken
- Bespaar kolom space

**Verification:**
```bash
# Check for usage in code
grep -r "ftp_deprecated" backend/src/
grep -r "category_racing_deprecated" backend/src/
grep -r "category_zftp_deprecated" backend/src/
```

**Expected:** No matches

---

## 📝 Phase 4: Migration Cleanup

### Create Comprehensive Cleanup Migration

**File:** `supabase/migrations/016_cleanup_legacy_code.sql`

```sql
-- ============================================
-- Migration 016: Cleanup Legacy Code
-- Datum: 2025-11-17
-- Doel: Verwijder redundante tables en kolommen
-- ============================================

-- Drop backup tables (migration 006/007)
DROP TABLE IF EXISTS riders_backup_20251106;
DROP TABLE IF EXISTS riders_backup_20251107;

-- Drop oude event_signups tabel (vervangen door zwift_api_event_signups)
DROP TABLE IF EXISTS event_signups;

-- Drop club_roster (redundant met riders.club_id)
DROP TABLE IF EXISTS club_roster;

-- Drop deprecated kolommen in riders
ALTER TABLE riders DROP COLUMN IF EXISTS ftp_deprecated;
ALTER TABLE riders DROP COLUMN IF EXISTS category_racing_deprecated;
ALTER TABLE riders DROP COLUMN IF EXISTS category_zftp_deprecated;

-- Verificatie
DO $$
BEGIN
  RAISE NOTICE 'Cleanup completed successfully';
  RAISE NOTICE 'Remaining tables: riders, zwift_api_events, zwift_api_event_signups, sync_logs, access_requests, user_roles, clubs, race_results, rider_history';
END $$;
```

---

## 🔍 Phase 5: Code Verification

### Automated Checks

**Script:** `scripts/verify-cleanup.sh`

```bash
#!/bin/bash
# Verify no references to deleted code exist

echo "🔍 Checking for legacy service references..."
grep -r "auto-sync.service" backend/src/ && echo "❌ FAIL: auto-sync references found" || echo "✅ PASS"
grep -r "AutoSyncService" backend/src/ && echo "❌ FAIL: AutoSyncService references found" || echo "✅ PASS"

echo "🔍 Checking for legacy page references..."
grep -r "import Dashboard from" backend/frontend/src/ && echo "❌ FAIL: Dashboard import found" || echo "✅ PASS"
grep -r "import.*RacingDataMatrix[^M]" backend/frontend/src/ && echo "❌ FAIL: old RacingDataMatrix import found" || echo "✅ PASS"

echo "🔍 Checking for deprecated column usage..."
grep -r "ftp_deprecated" backend/src/ && echo "❌ FAIL: ftp_deprecated usage found" || echo "✅ PASS"
grep -r "category_racing_deprecated" backend/src/ && echo "❌ FAIL: category_racing_deprecated usage found" || echo "✅ PASS"
grep -r "category_zftp_deprecated" backend/src/ && echo "❌ FAIL: category_zftp_deprecated usage found" || echo "✅ PASS"

echo "🔍 Checking for old table references..."
grep -r "event_signups[^_]" backend/src/ | grep -v "zwift_api_event_signups" && echo "❌ FAIL: old event_signups table found" || echo "✅ PASS"
grep -r "club_roster" backend/src/ && echo "❌ FAIL: club_roster references found" || echo "✅ PASS"

echo "✅ All checks completed"
```

### Manual Checks

**Build verification:**
```bash
cd backend
npm run build
# Should complete without errors
```

**TypeScript strict check:**
```bash
npx tsc --noEmit
# Should complete without errors
```

**Frontend build:**
```bash
cd backend/frontend
npm run build
# Should complete without errors
```

---

## 📋 Execution Checklist

### Pre-Cleanup
- [ ] Create feature branch: `git checkout -b cleanup/legacy-code`
- [ ] Backup production database: `pg_dump > backup_pre_cleanup.sql`
- [ ] Run verification script: `bash scripts/verify-cleanup.sh`
- [ ] Document current state: `git status > pre_cleanup_status.txt`

### Backend Cleanup
- [ ] Remove auto-sync service files
- [ ] Remove auto-sync endpoint file
- [ ] Update server.ts (remove import + route)
- [ ] Remove dist/ compiled versions (auto-regenerated)
- [ ] Run build: `npm run build`
- [ ] Check for TypeScript errors

### Frontend Cleanup
- [ ] Remove legacy page components
- [ ] Update App.tsx (remove imports + routes)
- [ ] Check for broken links in navigation
- [ ] Run build: `npm run build`
- [ ] Check for React errors

### Database Cleanup
- [ ] Create migration 016_cleanup_legacy_code.sql
- [ ] Test migration in development: `supabase db reset`
- [ ] Verify all views still work
- [ ] Check foreign key constraints
- [ ] Apply to production (via Supabase dashboard)

### Post-Cleanup
- [ ] Run full verification: `bash scripts/verify-cleanup.sh`
- [ ] Test all pages in UI
- [ ] Test all API endpoints
- [ ] Monitor error logs
- [ ] Create PR with changes
- [ ] Deploy to production

---

## 🚨 Rollback Plan

If issues are discovered after cleanup:

**Git Rollback:**
```bash
git revert <cleanup-commit-hash>
git push origin main
```

**Database Rollback:**
```sql
-- Restore from backup
psql < backup_pre_cleanup.sql

-- Or manually restore tables
CREATE TABLE riders_backup_20251106 AS SELECT * FROM backup_riders_20251106;
-- etc.
```

**Service Restart:**
```bash
# Railway will auto-redeploy on git push
# Or manual restart in Railway dashboard
```

---

## 📊 Expected Results

### Disk Space Saved
- Backend: ~50KB (auto-sync service + endpoint)
- Frontend: ~200KB (legacy page components)
- Database: ~500KB-2MB (backup tables)

### Code Quality Improvements
- ✅ Geen duplicate sync logic
- ✅ Geen deprecated column references
- ✅ Geen unused imports
- ✅ Cleaner routing structure
- ✅ Minder verwarring voor toekomstige developers

### Performance Impact
- 🟢 Neutral (geen actieve code verwijderd)
- 🟢 Mogelijk snellere builds (minder files)
- 🟢 Kleinere bundle size (frontend)

---

## 📅 Timeline

**Estimated Time:** 2-3 hours

1. **Verification (30 min)** - Run checks, document current state
2. **Backend cleanup (30 min)** - Remove services, update server
3. **Frontend cleanup (30 min)** - Remove pages, update routing
4. **Database cleanup (30 min)** - Create migration, test locally
5. **Testing (30 min)** - Full integration test
6. **Deployment (15 min)** - Push to production

**Recommended Time:** Off-peak hours (late evening/weekend)

---

## ✅ Success Criteria

- [ ] Zero TypeScript errors
- [ ] Zero build errors
- [ ] All pages load without console errors
- [ ] All API endpoints respond correctly
- [ ] No database query errors
- [ ] No broken links in navigation
- [ ] Sync services run successfully
- [ ] No references to deleted code in codebase

---

**Status:** 🟡 Ready for execution  
**Risk Level:** 🟢 Low (all legacy code already disabled)  
**Reviewed By:** _Pending_  
**Approved By:** _Pending_
