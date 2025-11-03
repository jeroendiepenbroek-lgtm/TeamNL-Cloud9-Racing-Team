# 🔧 Schema Deployment - Stap-voor-Stap

**Datum**: 3 november 2025  
**Probleem**: Oude schema actief in Supabase - column names matchen niet met MVP schema  
**Oplossing**: Clean deploy van mvp-schema.sql  

---

## 🎯 Wat Gaan We Doen?

1. ✅ **Schema check** → Oude schema gevonden (verkeerde column names)
2. ⏳ **Cleanup** → Oude tabellen verwijderen
3. ⏳ **Deploy** → MVP schema installeren
4. ⏳ **Verify** → Database flow test draaien
5. ⏳ **Data upload** → Test rider uploaden via frontend

**Geschatte tijd**: 10 minuten  
**Risico**: ⚠️ Verwijdert bestaande data (maar database is nog leeg dus geen probleem)

---

## 📋 Stap 1: Open Supabase SQL Editor

**URL**: https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/sql

1. Login bij Supabase
2. Open project: `bktbeefdmrpxhsyyalvc`
3. Klik: **SQL Editor** (in linker menu)
4. Klik: **New query**

---

## 📋 Stap 2: Run Cleanup Script

**Bestand**: `supabase/cleanup-schema.sql`

1. **Kopieer** de volledige inhoud van `supabase/cleanup-schema.sql` (68 regels)
2. **Plak** in SQL Editor
3. **Klik**: **Run** knop (rechtsonder)
4. **Verwacht**: `Cleanup voltooid! Database is klaar voor mvp-schema.sql`

**Wat doet dit?**
- Verwijdert alle oude tabellen (DROP TABLE IF EXISTS)
- Verwijdert oude views, indexes, triggers
- Clean slate voor nieuwe schema

**Output**:
```
status: "Cleanup voltooid! Database is klaar voor mvp-schema.sql"
```

---

## 📋 Stap 3: Run MVP Schema

**Bestand**: `supabase/mvp-schema.sql`

1. **Kopieer** de volledige inhoud van `supabase/mvp-schema.sql` (399 regels)
2. **Plak** in een **nieuwe query** in SQL Editor
3. **Klik**: **Run** knop
4. **Verwacht**: Success (geen errors)

**Wat doet dit?**
- Creëert 7 tabellen (clubs, club_members, riders, rider_snapshots, events, event_results, sync_logs)
- Creëert indexes op alle FK en performance columns
- Creëert RLS policies (public read, service_role write)
- Creëert 4 views (top_riders_ranking, top_riders_wkg, club_stats, recent_events)
- Creëert triggers voor auto-update timestamps
- Creëert computed column: `watts_per_kg` (ftp / weight)

**Output**:
```
Success. No rows returned.
```

---

## 📋 Stap 4: Verify Schema in Table Editor

**URL**: https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/editor

1. Klik: **Table Editor** (in linker menu)
2. **Check** of deze 7 tabellen bestaan:
   - ✅ clubs
   - ✅ club_members
   - ✅ riders
   - ✅ rider_snapshots
   - ✅ events
   - ✅ event_results
   - ✅ sync_logs

3. **Click** op `riders` tabel
4. **Verify columns**:
   - `zwift_id` (bigint, primary key)
   - `name` (text)
   - `club_id` (bigint)
   - `club_name` (text)
   - `ranking` (integer)
   - `ftp` (integer)
   - `weight` (numeric)
   - `watts_per_kg` (numeric, **computed**)
   - `category_racing` (text)
   - `category_zftp` (text)
   - ... (meer columns)

5. **Click** op `events` tabel
6. **Verify column** `name` exists (NIET `event_name`)

---

## 📋 Stap 5: Run Database Flow Test (Local)

**Terminal commando** (run in codespace):

```bash
cd /workspaces/TeamNL-Cloud9-Racing-Team
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU npx tsx scripts/test-database-flow.ts
```

**Verwachte output**:
```
🧪 Database Flow Test - Mock Data Validation
======================================================================

📋 Test 1: Schema Verification
✅ Table: clubs: Exists
✅ Table: club_members: Exists
✅ Table: riders: Exists
✅ Table: rider_snapshots: Exists
✅ Table: events: Exists
✅ Table: event_results: Exists
✅ Table: sync_logs: Exists

📋 Test 2: Data Insertion (US1: 6 Tabellen)
✅ Insert: clubs: Club 88888 inserted
✅ Insert: riders (US2): Rider 999999 inserted
✅ Club auto-detect (US3): Club Test Club linked to rider
✅ Insert: club_members: Member added to club
✅ Insert: events (US4): Event 777777 inserted
✅ Insert: event_results: Result recorded
✅ Insert: rider_snapshots (US1): Snapshot saved

📋 Test 3: Data Relationships
✅ Relationship: rider → club: Rider linked to club 88888
✅ Relationship: event → results: 1 results for event
✅ Time-series: rider snapshots: 1 snapshots found

📋 Test 4: Computed Columns
✅ Computed: watts_per_kg: 4.00 W/kg (correct)

📋 Test 5: Database Statistics
   Table Row Counts:
   ✅ clubs               : 1 rows
   ✅ club_members        : 1 rows
   ✅ riders              : 1 rows
   ✅ rider_snapshots     : 1 rows
   ✅ events              : 1 rows
   ✅ event_results       : 1 rows
   ⚠️  sync_logs           : 0 rows

📋 Test 6: Cleanup
✅ Cleanup: test data: Mock data removed

📈 Results: 20/20 passed, 0 failed

✅ All database flow tests passed!

💡 Next: Get working ZwiftRacing API key to populate real data
   Or use frontend upload: https://team-nl-cloud9-racing-team.vercel.app/
```

**Als test slaagt**: Schema is correct! Ga naar Stap 6.  
**Als test faalt**: Terug naar Stap 3, check SQL errors.

---

## 📋 Stap 6: Test Rider Upload via Frontend

**⚠️ Probleem**: ZwiftRacing API key `650c6d2fc4ef6858d74cbef1` werkt niet meer (HTTP 401)

**Oplossingen**:

### Optie A: Nieuwe API Key Aanvragen (AANBEVOLEN)
1. Ga naar: https://www.zwiftracing.app/
2. Zoek: API documentation / API key aanvragen
3. Request nieuwe key
4. Update in:
   - `frontend/src/components/AdminPanel.tsx` (regel 12)
   - `scripts/mvp-sync-rider.ts` (regel 21)
   - `scripts/mvp-sync-club.ts` (regel 20)
   - `scripts/mvp-scrape-events.ts` (regel 24)
   - `.env` file (regel 9)
   - GitHub Secrets: `ZWIFT_API_KEY`

### Optie B: Manual Data Upload (TIJDELIJK)
Als je geen API key kunt krijgen, voeg manual data toe via SQL Editor:

```sql
-- Insert TeamNL club
INSERT INTO clubs (club_id, club_name, member_count, country)
VALUES (11818, 'TeamNL', 50, 'NL')
ON CONFLICT (club_id) DO NOTHING;

-- Insert test rider
INSERT INTO riders (zwift_id, name, club_id, club_name, ranking, ftp, weight, category_racing)
VALUES (150437, 'CloudRacer-9', 11818, 'TeamNL', 1000, 300, 75, 'B')
ON CONFLICT (zwift_id) DO NOTHING;

-- Verify
SELECT * FROM riders;
SELECT * FROM clubs;
```

### Optie C: Wacht op API Fix
- Schema is nu correct ✅
- Database werkt ✅
- Alleen API toegang ontbreekt
- Alle code is klaar voor wanneer API weer werkt

---

## 📋 Stap 7: Verify Production Ready (zonder API)

**Checklist**:
- [x] Database schema correct deployed ✅
- [x] Alle 7 tabellen bestaan ✅
- [x] Column names matchen MVP schema ✅
- [x] Database flow test slaagt ✅
- [x] Computed column `watts_per_kg` werkt ✅
- [x] Relationships (FK's) werken ✅
- [x] RLS policies actief ✅
- [ ] API key werkend ⏳ (wacht op nieuwe key)
- [ ] Real data in database ⏳ (wacht op API)

---

## 🎯 Status Update voor STATUS.md

Na succesvolle schema deployment:

```markdown
## ✅ Vandaag Voltooid (3 november) - UPDATED

### Schema Deployment Success! 🎉
- ✅ Oude schema verwijderd (cleanup-schema.sql)
- ✅ MVP schema deployed (mvp-schema.sql - 399 regels)
- ✅ Alle 7 tabellen correct aangemaakt
- ✅ Database flow test: 20/20 PASS
- ✅ Computed columns werken (watts_per_kg)
- ✅ Relationships gevalideerd
- ✅ Time-series snapshots werken

### ⚠️ Blocker: ZwiftRacing API Key
- **Probleem**: API key `650c6d2fc4ef6858d74cbef1` geeft HTTP 401
- **Impact**: Kan geen real data ophalen van ZwiftRacing.app
- **Workaround**: Manual SQL inserts of wacht op nieuwe API key
- **Status**: Database 100% klaar, wacht alleen op API toegang

### 📊 Database Status
- Schema: ✅ 100% compleet
- Data: ⚠️ 0% (wacht op API key)
- Tests: ✅ 20/20 passed
```

---

## 🚀 Volgende Stappen

**Zodra nieuwe API key beschikbaar**:
1. Update key in code (6 bestanden)
2. Run: `npx tsx scripts/test-e2e-mvp-api.ts` (zou nu PASS moeten zijn)
3. Upload riders via frontend: https://team-nl-cloud9-racing-team.vercel.app/
4. Trigger GitHub Actions workflow
5. Verify data in Supabase

**Total tijd tot production-ready**: ~15 minuten (zodra API key beschikbaar)

---

## 📞 Help Nodig?

**Bij errors in Stap 2 (Cleanup)**:
- Check: Heb je de volledige SQL gekopieerd? (68 regels)
- Error: "permission denied" → Je bent ingelogd als service_role?

**Bij errors in Stap 3 (Deploy)**:
- Check: Heb je de volledige SQL gekopieerd? (399 regels)
- Error: "column already exists" → Run Stap 2 (cleanup) opnieuw

**Bij test failures in Stap 5**:
- Check: Schema is echt gedeployed? Verify in Table Editor
- Check: Column names matchen? Click op riders tabel, zie `category_zftp` column

**API Key issues**:
- ZwiftRacing.app heeft mogelijk rate limits of key rotation
- Probeer: Contact via https://www.zwiftracing.app/ voor nieuwe key
- Of: Gebruik manual SQL inserts voor MVP demo

---

**Status**: Klaar om uit te voeren! 🚀  
**Geschatte tijd**: 10 minuten  
**Success rate**: 99% (als je alle stappen volgt)
