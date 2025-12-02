# Database Cleanup Plan - Migration 019

## ✅ Uitvoeren van Cleanup

**Status:** ⚠️  REVIEW REQUIRED - Destructive operation

### Stap 1: Review Cleanup SQL
Open: `supabase/migrations/019_cleanup_legacy_tables.sql`

**Verwijdert:**
- ❌ `riders` → vervangen door `riders_unified`
- ❌ `clubs` → data gemerged in `riders_unified`
- ❌ `events` → vervangen door `events_unified`
- ❌ `event_signups` → vervangen door `event_signups_unified`
- ❌ `event_results` → vervangen door `race_results_unified`
- ❌ `sync_logs` → vervangen door `sync_status_unified`
- ❌ `routes` → (indien niet gebruikt)
- ❌ Alle views (`riders_computed`, `view_upcoming_events`, etc.)
- ❌ Backup tables (`riders_backup_*`)

**Behoudt:**
- ✅ Unified schema (7 nieuwe tables)
- ✅ Sourcing tables (`zwift_api_*`) - nodig voor sync

### Stap 2: Check Frontend Dependencies

**VOOR cleanup uitvoeren:**

```bash
# Check welke oude tables nog gebruikt worden
grep -r "from('riders')" backend/src/
grep -r "from('events')" backend/src/
grep -r "from('clubs')" backend/src/

# Check frontend
grep -r "from('riders')" frontend/src/
grep -r "riders_computed" frontend/src/
```

**Gevonden dependencies (moeten eerst gemigreerd):**
- `backend/src/services/supabase.service.ts` - 9x `from('riders')`
- `backend/src/services/supabase.service.ts` - 2x `from('clubs')`
- `backend/src/services/supabase.service.ts` - 1x `from('events')`
- `backend/src/api/endpoints/zwiftpower.ts` - 3x `from('riders')`
- `backend/src/api/endpoints/riders.ts` - 1x `from('riders')`

### Stap 3: Migrate Backend Code FIRST

**Voor elke `from('riders')` call:**

```typescript
// ❌ OUD
const { data } = await supabase.from('riders').select('*');

// ✅ NIEUW
const { data } = await supabase.from('riders_unified').select('*');
```

**Column name mappings:**
- `rider_id` → blijft `rider_id`
- `name` → blijft `name`
- `ftp` → blijft `ftp`
- `weight` → `weight_kg`
- `rating` → `velo_rating`
- `category` → blijft `category`

### Stap 4: Execute Cleanup Migration

**Pas uitvoeren NA code migratie!**

```bash
# Via Supabase SQL Editor
https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new

# Copy SQL from:
supabase/migrations/019_cleanup_legacy_tables.sql
```

### Stap 5: Verify

```sql
-- Check alle tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Should see:
-- event_signups_unified ✅
-- events_unified ✅
-- race_results_unified ✅
-- rider_activities ✅
-- rider_rating_history ✅
-- riders_unified ✅
-- sync_status_unified ✅
-- zwift_api_* (sourcing) ✅
```

---

## 🔄 Alternatief: Stapsgewijze Cleanup

Als je voorzichtiger wil zijn:

### Plan A: Rename → Monitor → Drop

```sql
-- Week 1: Rename legacy tables
ALTER TABLE riders RENAME TO riders_deprecated;
ALTER TABLE events RENAME TO events_deprecated;
-- etc.

-- Week 2: Monitor errors in logs
-- Check: queries falen op riders_deprecated?

-- Week 3: Drop after verification
DROP TABLE riders_deprecated;
DROP TABLE events_deprecated;
```

### Plan B: Maak Views als Bridge

```sql
-- Backwards compatibility views
CREATE VIEW riders AS 
SELECT 
  rider_id,
  name,
  velo_rating as rating,
  category,
  ftp,
  weight_kg as weight
FROM riders_unified;

-- Oude code blijft werken!
-- Later: DROP VIEW riders;
```

---

## ⚡ Recommended Approach

**Snelste en veiligste:**

1. **NU:** Run migration 019 (cleanup) - tables droppen
2. **DAARNA:** Fix code errors die opduiken
3. Frontend/Backend zien errors → quick fix met find/replace

**Voordeel:**
- Code moet toch aangepast → errors forceren alle aanpassingen
- Database clean vanaf begin POC
- Geen verwarring tussen oude/nieuwe tables

**Of conservatief:**

1. **NU:** Migrate alle backend code eerst
2. **TEST:** Verify alles werkt met unified tables
3. **DAARNA:** Run migration 019

---

## 🎯 Je Keuze

**Optie 1 (Rigoureus):**
✅ Run 019 nu → Fix code errors
- Database direct clean
- Errors = duidelijke todo list

**Optie 2 (Veilig):**
✅ Migrate code eerst → Test → Dan 019
- Geen downtime
- Meer werk vooraf

**Mijn advies:** Optie 1 - je bent toch in POC fase, en unified schema is ready. Code fixes zijn straightforward find/replace.

Welke kies je?
