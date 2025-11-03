# 📊 TeamNL Cloud9 Racing Dashboard - Status

**Datum**: 3 november 2025  
**Laatste update**: Ochtend 3 nov - Deployment tools klaar  
**Status**: 🔴 Manual Deployment Required - Schema + API Key  
**Volgende stap**: JIJ moet SQL runnen in Supabase Dashboard (5 min)  

---

## 🎯 Huidige Situatie (3 Nov Ochtend)

### ✅ GOED NIEUWS
- Database connectiviteit: ✅ Werkt
- 7 tabellen bestaan: ✅ Aanwezig
- Code volledig klaar: ✅ 100%
- Deployment tools klaar: ✅ 100%
- Test suite compleet: ✅ 20 tests

### ❌ BLOCKERS
1. **Schema Deployment** 🔴 
   - Oude schema actief (verkeerde column names)
   - **Automated deployment NIET mogelijk** (PostgreSQL DDL requires superuser)
   - **JIJ moet handmatig SQL runnen** (5 min via Supabase Dashboard)
   - Tools klaar: `cleanup-schema.sql` + `mvp-schema.sql`
   
2. **API Key Invalid** 🔴
   - ZwiftRacing API geeft HTTP 401
   - Key `650c6d2fc4ef6858d74cbef1` werkt niet meer
   - Nieuwe key nodig of manual data upload

---

## 📋 ACTIE VEREIST - Prioriteit Volgorde

### 1️⃣ SCHEMA DEPLOYEN (5 min) - **HANDMATIG VEREIST**

**Wat**: Oude schema vervangen door MVP schema  
**Waarom**: Column names matchen niet, inserts falen  
**Hoe**: Via Supabase Dashboard (automated deployment niet mogelijk)

**⚠️  IMPORTANT**: PostgreSQL DDL (CREATE/DROP) vereist superuser privileges
die niet beschikbaar zijn via Supabase REST API. Schema changes moeten via
SQL Editor of psql CLI.

**Stappen**:
```
1. Open: https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/sql

2. CLEANUP (New Query):
   • Open in VS Code: supabase/cleanup-schema.sql
   • Copy alle 68 regels
   • Paste in SQL Editor
   • Klik: RUN
   • Verwacht: "Cleanup voltooid!"

3. DEPLOY (New Query):
   • Klik: "New query"
   • Open in VS Code: supabase/mvp-schema.sql  
   • Copy alle 399 regels
   • Paste in SQL Editor
   • Klik: RUN
   • Verwacht: "Success. No rows returned."

4. VERIFY (Terminal):
   npx tsx scripts/test-database-flow.ts
   Verwacht: ✅ 20/20 PASS
```

**Helper Scripts Created**:
- `scripts/deploy-schema-manual.ts` - Geeft deployment instructies
- `scripts/deploy-via-curl.sh` - Alternative deployment helper
- SQL files ready: `supabase/cleanup-schema.sql` + `supabase/mvp-schema.sql`

---

### 2️⃣ API KEY VERKRIJGEN (15-30 min) - **KRITISCH**

**Probleem**: 
```bash
curl "https://zwift-ranking.herokuapp.com/public/rider/150437?apikey=650c6d2fc4ef6858d74cbef1"
→ {"message":"Unauthorized"}  # HTTP 401
```

**Opties**:

**A) Nieuwe API Key Aanvragen** (BESTE):
- Website: https://www.zwiftracing.app/
- Zoek: API documentation / Contact
- Request: Nieuwe API key voor TeamNL project

**B) Manual Data Upload** (TIJDELIJK):
```sql
-- Run in Supabase SQL Editor
INSERT INTO clubs (club_id, club_name, member_count, country)
VALUES (11818, 'TeamNL', 50, 'NL');

INSERT INTO riders (zwift_id, name, club_id, club_name, ranking, ftp, weight, category_racing)
VALUES (150437, 'CloudRacer-9', 11818, 'TeamNL', 1000, 300, 75, 'B');

-- Verify
SELECT * FROM riders;
```

**C) Alternative API** (BACKUP):
- ZwiftPower API
- Zwift official API  
- Web scraping fallback

**Update in code** (zodra nieuwe key beschikbaar):
```bash
# 6 bestanden updaten:
- frontend/src/components/AdminPanel.tsx:12
- scripts/mvp-sync-rider.ts:21
- scripts/mvp-sync-club.ts:20
- scripts/mvp-scrape-events.ts:24
- scripts/test-e2e-mvp-api.ts:23
- .env:9

# + GitHub Secret updaten:
Settings → Secrets → ZWIFT_API_KEY
```

---

### 3️⃣ VERIFY PRODUCTION (5 min) - **NA 1+2**

**Zodra schema + API key werken**:

```bash
# Test 1: E2E API (12 tests)
npx tsx scripts/test-e2e-mvp-api.ts
# Verwacht: 12/12 PASS

# Test 2: Frontend upload
Open: https://team-nl-cloud9-racing-team.vercel.app/
Tab: Upload
Paste: 150437
Click: Upload Riders
Verify: ✅ Success message

# Test 3: Check data in Supabase
https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/editor
→ riders table → Should have 1 row
→ clubs table → Should have TeamNL

# Test 4: GitHub Actions
https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team/actions
Click: "MVP Production Sync" → "Run workflow"
Wait: ~5 min
Check: ✅ Green checkmark
```

---

## 📊 Wat Werkt Al (Compleet)

### Code ✅
- MVP schema design (399 lines)
- 6 API endpoints → 6 database tabellen
- Sync scripts (rider, club, events)
- Frontend upload component
- GitHub Actions workflow
- E2E test suite (12 tests)
- Database flow test (20 tests)
- Deployment guide

### Infrastructure ✅
- Frontend deployed: Vercel
- Database ready: Supabase (schema pending)
- CI/CD configured: GitHub Actions
- Secrets configured: 5/5

### Wat Ontbreekt ❌
- Schema deployment (5 min work)
- Working API key
- Real data in database

---

## 📁 Belangrijke Bestanden

### Deployment
- `SCHEMA_DEPLOYMENT_GUIDE.md` - Complete step-by-step (10 min)
- `supabase/cleanup-schema.sql` - Verwijder oude schema
- `supabase/mvp-schema.sql` - Installeer MVP schema

### Testing
- `scripts/test-database-flow.ts` - Database flow (20 tests, geen API)
- `scripts/test-e2e-mvp-api.ts` - API endpoints (12 tests, wacht op key)
- `scripts/check-schema.ts` - Quick schema check

### Production
- Frontend: https://team-nl-cloud9-racing-team.vercel.app/
- Database: https://app.supabase.com/project/bktbeefdmrpxhsyyalvc
- Actions: https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team/actions

---

## 🎯 Definition of Done

**MVP Production Ready wanneer**:
- [x] Code compleet ✅
- [x] Infrastructure deployed ✅
- [x] Test suite klaar ✅
- [ ] Schema correct deployed ⏳ (5 min - jij)
- [ ] API key werkend ⏳ (15-30 min - jij)
- [ ] Test data uploaded ⏳ (na bovenstaande)
- [ ] E2E test passed ⏳ (na bovenstaande)
- [ ] GitHub Actions green ⏳ (na bovenstaande)

**Resterende tijd**: 20-35 minuten totaal (als alles smooth gaat)

---

## 🆘 Quick Reference

**Schema deployen**:
```bash
# 1. Cleanup
Open: https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/sql
Run: supabase/cleanup-schema.sql

# 2. Deploy
Run: supabase/mvp-schema.sql

# 3. Test
npx tsx scripts/test-database-flow.ts
```

**Test commando's**:
```bash
# Schema check
npx tsx scripts/check-schema.ts

# Database flow (geen API)
SUPABASE_SERVICE_KEY=... npx tsx scripts/test-database-flow.ts

# E2E API (met API key)
SUPABASE_SERVICE_KEY=... npx tsx scripts/test-e2e-mvp-api.ts
```

**Supabase credentials**:
- URL: `https://bktbeefdmrpxhsyyalvc.supabase.co`
- Service Key: Zie `.env` file of GitHub Secrets

---

**Laatste commit**: `4faa667` - Schema diagnostic tools  
**Branch**: `copilot/vscode1761850837955`  
**Next**: Deploy schema → Get API key → Production ready 🚀
