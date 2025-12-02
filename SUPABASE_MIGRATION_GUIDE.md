# Supabase Migratie Methodes

## Situatie
Je hebt 7 nieuwe tabellen in `MASTER_PLAN_3_DASHBOARDS.md` die naar Supabase moeten.

**Supabase JS Client heeft GEEN directe SQL execution** (security redenen).

---

## ✅ **Methode 1: PostgreSQL Connection String (AANBEVOLEN)**

### Voordelen
- ✅ **Volledige PostgreSQL support** (procedures, triggers, extensions)
- ✅ **Batch execution** - hele SQL file in één keer
- ✅ **Lokaal uitvoeren** - geen copy-paste
- ✅ **Scriptable** - kan in CI/CD pipeline

### Setup
```bash
# 1. Installeer PostgreSQL client
sudo apt-get install postgresql-client

# 2. Haal database password op
# → https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/settings/database
# → "Connection string" → Direct connection → Copy password

# 3. Maak migration file uitvoerbaar
chmod +x backend/scripts/migrate-supabase.sh

# 4. Run migratie
./backend/scripts/migrate-supabase.sh 018_unified_schema_poc.sql
# → Script vraagt om password (1x), voert SQL uit
```

### Connection String Format
```
postgresql://postgres.bktbeefdmrpxhsyyalvc:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

### Workflow
1. Create `supabase/migrations/018_unified_schema_poc.sql` (copy SQL from master plan)
2. Run `./backend/scripts/migrate-supabase.sh 018_unified_schema_poc.sql`
3. Enter password when prompted
4. ✅ Done! Script tracks in `_migrations` table

---

## ✅ **Methode 2: Supabase SQL Editor (Web UI)**

### Voordelen
- ✅ **Geen setup** - direct via browser
- ✅ **Visual feedback** - zie resultaten meteen
- ✅ **Makkelijk** voor one-time migraties

### Nadelen
- ❌ **Copy-paste** - hele SQL moet gekopieerd worden
- ❌ **Character limit** - editor heeft max lengte (~10k chars)
- ❌ **Niet scriptable** - handmatig elke keer

### Stappen
```bash
# 1. Open SQL Editor
https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new

# 2. Copy SQL from master plan
# → Open MASTER_PLAN_3_DASHBOARDS.md
# → Scroll to "Section 2: Database Schema" (~line 80)
# → Copy complete SQL (CREATE TABLE ... CREATE INDEX ...)

# 3. Paste in SQL Editor

# 4. Click "Run" (Ctrl+Enter)

# 5. Check output
# → Should see "Success. No rows returned"
# → Check Tables tab to verify 7 nieuwe tabellen
```

### Voor grote SQL files
Als SQL > 10k characters (onze unified schema is ~200 lines):
```sql
-- Split in chunks:

-- Chunk 1: Core tables
CREATE TABLE riders_unified (...);
CREATE TABLE rider_rating_history (...);
CREATE TABLE rider_activities (...);
-- Run

-- Chunk 2: Event tables  
CREATE TABLE events_unified (...);
CREATE TABLE event_signups_unified (...);
-- Run

-- Chunk 3: Results + sync
CREATE TABLE race_results_unified (...);
CREATE TABLE sync_status_unified (...);
-- Run

-- Chunk 4: Indices
CREATE INDEX idx_riders_club ON riders_unified(club_id);
-- ... rest of indices
-- Run
```

---

## ❌ **Methode 3: Supabase CLI (NIET AANBEVOLEN voor jou)**

### Nadelen voor deze use case
- ❌ **Extra tooling** - moet Supabase CLI installeren + init
- ❌ **Local dev database** - CLI maakt lokale Postgres via Docker
- ❌ **Two-step process** - lokaal testen → dan push naar remote
- ❌ **Overkill** - te complex voor simpele migratie

### Wanneer WEL gebruiken
- Team development met meerdere developers
- Local dev environment willen (Supabase Studio local)
- TypeScript types genereren uit database schema
- Edge Functions development

---

## 📋 **Aanbeveling voor jouw workflow**

### **Kies Methode 1: PostgreSQL Connection String**

**Waarom:**
1. ✅ Je hebt al 17 migraties in `supabase/migrations/` - past in bestaand patroon
2. ✅ Master plan SQL is 200 lines - te groot voor comfortabel copy-pasten
3. ✅ Je gaat meer migraties doen (POC → scale to 75 riders → production)
4. ✅ Script tracked automatisch in `_migrations` table
5. ✅ Eenvoudig: 1 command, geen extra tools

**Setup tijd:** 2 minuten (password ophalen + psql installeren)

---

## 🚀 **Quick Start - Methode 1**

```bash
# 1. Install psql (if not installed)
sudo apt-get update && sudo apt-get install -y postgresql-client

# 2. Maak migration file
cat > supabase/migrations/018_unified_schema_poc.sql << 'EOF'
-- Copy SQL from MASTER_PLAN_3_DASHBOARDS.md Section 2
-- (~200 lines starting at "CREATE TABLE riders_unified")
EOF

# 3. Get database password
echo "Get password from: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/settings/database"
echo "Click 'Connection string' → Direct connection → Copy password"

# 4. Run migration
chmod +x backend/scripts/migrate-supabase.sh
./backend/scripts/migrate-supabase.sh 018_unified_schema_poc.sql

# 5. Verify
psql "postgresql://postgres.bktbeefdmrpxhsyyalvc:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "\dt"
# Should see: riders_unified, rider_rating_history, rider_activities, events_unified, event_signups_unified, race_results_unified, sync_status_unified
```

---

## 🔍 **Comparison Table**

| Feature | PostgreSQL (psql) | SQL Editor (Web) | Supabase CLI |
|---------|------------------|------------------|--------------|
| Setup tijd | 2 min | 0 min | 10+ min |
| Batch SQL | ✅ Yes | ⚠️ Limited (10k) | ✅ Yes |
| Scriptable | ✅ Yes | ❌ No | ✅ Yes |
| Version control | ✅ Git | ❌ Manual | ✅ Git |
| Migration tracking | ✅ Custom | ❌ Manual | ✅ Built-in |
| Dependencies | psql | Browser | Docker + CLI |
| Best for | **Production deploys** | One-time fixes | Team dev |

---

## 💡 **Pro Tip: Hybrid Approach**

**Development:**
- Gebruik **SQL Editor** voor quick tests en prototyping
- Paste kleine queries, test snel

**Production:**
- Gebruik **psql script** voor alle official migraties
- Files in `supabase/migrations/` blijven source of truth
- Reproducible deployments

---

## 📝 **Next Steps na migratie**

```bash
# 1. Verify tables created
psql [CONNECTION_STRING] -c "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name LIKE '%unified%';
"

# 2. Verify indices
psql [CONNECTION_STRING] -c "
  SELECT indexname 
  FROM pg_indexes 
  WHERE schemaname = 'public' 
  AND tablename LIKE '%unified%';
"

# 3. Verify foreign keys
psql [CONNECTION_STRING] -c "
  SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name LIKE '%unified%';
"

# 4. Run POC sync
npx tsx backend/test-poc-sync.ts

# 5. Verify data
psql [CONNECTION_STRING] -c "
  SELECT * FROM riders_unified WHERE rider_id = 150437;
  SELECT COUNT(*) FROM rider_rating_history WHERE rider_id = 150437;
  SELECT COUNT(*) FROM rider_activities WHERE rider_id = 150437;
"
```
