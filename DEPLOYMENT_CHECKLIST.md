# 🚀 DEPLOYMENT CHECKLIST - 3-API Sync naar Productie

**Datum**: 5 december 2025  
**Status**: ⏳ DEPLOYMENT IN PROGRESS

---

## ✅ **STAP 1: CODE NAAR GITHUB** - VOLTOOID

```bash
✅ Git commit: 09142a3 "Complete 3-API sync implementation"
✅ Git push naar main branch
✅ 8 bestanden gecommit (3518 lines)
```

**Files**:
- ✅ `ARCHITECTURE_DECISIONS_SYNC.md`
- ✅ `COMPLETE_3API_MAPPING.md`
- ✅ `backend/services/unified-sync.service.ts`
- ✅ `sync-runner.ts`
- ✅ `supabase/migrations/add_missing_rider_fields.sql`

---

## ⏳ **STAP 2: DATABASE MIGRATIE** - ACTIE VEREIST

### Via Supabase Dashboard:
1. Open: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new
2. Copy-paste deze SQL:

```sql
-- Add 5 missing columns voor Racing Matrix
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS phenotype_climber NUMERIC;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_rating NUMERIC;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS last_race_date TIMESTAMPTZ;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS last_race_velo NUMERIC;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS phenotype_type TEXT;

-- Comments
COMMENT ON COLUMN riders_unified.phenotype_climber IS 
  'Climber phenotype score 0-100 from ZwiftRacing API phenotype.scores.climber';
COMMENT ON COLUMN riders_unified.power_rating IS 
  'Overall power rating from ZwiftRacing API power.powerRating';
COMMENT ON COLUMN riders_unified.last_race_date IS 
  'Date of last race from ZwiftRacing API race.last.date';
COMMENT ON COLUMN riders_unified.last_race_velo IS 
  'vELO rating at last race from ZwiftRacing API race.last.rating';
COMMENT ON COLUMN riders_unified.phenotype_type IS 
  'Phenotype type string from ZwiftRacing API phenotype.value';
```

3. Klik "Run"
4. Verify: Zie je 5 nieuwe kolommen?

```sql
-- Verification query
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'riders_unified'
  AND column_name IN ('phenotype_climber', 'power_rating', 'last_race_date', 'last_race_velo', 'phenotype_type')
ORDER BY column_name;
-- Expected: 5 rows
```

---

## ⏳ **STAP 3: RAILWAY ENVIRONMENT VARIABLES** - ACTIE VEREIST

### Via Railway Dashboard:
1. Open: https://railway.app/project/[jouw-project-id]
2. Ga naar: Variables tab
3. Voeg toe (of update):

```bash
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NTQ2MzEsImV4cCI6MjA3NzUzMDYzMX0.HHa7K3J-pmR73hm063w0JJhA4pFASYS65DFI-BZGAqw

# ZwiftRacing API
ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1

# Zwift Official OAuth
ZWIFT_USERNAME=jeroen.diepenbroek@gmail.com
ZWIFT_PASSWORD=CloudRacer-9
```

4. **BELANGRIJK**: Klik "Deploy" na toevoegen variables

---

## ⏳ **STAP 4: RAILWAY REDEPLOY** - AUTOMATISCH OF MANUAL

### Optie A: Automatisch (als auto-deploy aan staat)
Railway zou automatisch moeten deployen na git push naar main.

**Check status**:
- Open Railway Dashboard
- Kijk bij "Deployments" tab
- Zie je nieuwe build draaien?

### Optie B: Manual Trigger (als auto-deploy uit staat)
1. Railway Dashboard → Project
2. Klik "Deploy" knop rechtsboven
3. Of via CLI:
```bash
railway login
railway up
```

**Verwachte build tijd**: 2-5 minuten

---

## ⏳ **STAP 5: VERIFY DEPLOYMENT** - NA REDEPLOY

### Test 1: Health Check
```bash
curl https://teamnl-cloud9-racing-team-production.up.railway.app/health | jq

# Expected nieuwe versie (bijv. 2.1.0)
{
  "status": "ok",
  "service": "TeamNL Cloud9 Backend",
  "version": "2.1.0",  # ← Niet meer 2.0.0-clean
  "timestamp": "...",
  "port": 8080
}
```

### Test 2: Sync Endpoints (NIEUW)
```bash
# Test sync status endpoint
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/sync/status

# Test single rider sync
curl -X POST \
  https://teamnl-cloud9-racing-team-production.up.railway.app/api/sync/rider/150437 \
  -H "Content-Type: application/json"

# Expected: Success met 45 fields synced
```

### Test 3: Database Verification
```bash
# Check rider 150437 heeft nieuwe kolommen
curl -s "https://bktbeefdmrpxhsyyalvc.supabase.co/rest/v1/riders_unified?rider_id=eq.150437&select=phenotype_climber,power_rating,last_race_date,phenotype_type" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...BZGAqw"

# Expected: phenotype_climber heeft waarde (bijv. 68.3)
```

---

## 🎯 **SUCCESS CRITERIA**

| Criterium | Status | Verificatie |
|-----------|--------|-------------|
| Database heeft 63 kolommen | ⏳ | SQL query in Supabase |
| Railway heeft nieuwe env vars | ⏳ | Railway Dashboard Variables |
| Backend draait nieuwe versie | ⏳ | `/health` endpoint |
| Sync endpoints beschikbaar | ⏳ | `/api/sync/status` |
| Rider 150437 sync succesvol | ⏳ | Test sync endpoint |
| phenotype_climber gevuld | ⏳ | Database query |

**ALL GREEN = ✅ PRODUCTION READY**

---

## 🚨 **TROUBLESHOOTING**

### Railway Build Failed
```bash
# Check logs in Railway Dashboard
# Common issues:
# - Missing dependencies in package.json
# - TypeScript compilation errors
# - Dockerfile issues

# Fix: Check Railway build logs voor exacte error
```

### Environment Variables Niet Geladen
```bash
# Symptoom: "SUPABASE_URL is required" error in logs
# Fix: 
# 1. Verify variables in Railway Dashboard
# 2. Click "Redeploy" na toevoegen variables
# 3. Check Railway logs: console.log(process.env.SUPABASE_URL)
```

### Sync Endpoints 404
```bash
# Symptoom: {"error":"Endpoint niet gevonden"}
# Mogelijke oorzaken:
# 1. Oude versie draait nog (cache issue)
# 2. Routes niet correct geregistreerd
# 3. TypeScript compilation incomplete

# Fix:
# 1. Hard refresh Railway deployment
# 2. Check backend/src/server.ts routes registratie
# 3. Verify build logs voor TypeScript errors
```

### Database Migration Failed
```bash
# Symptoom: "column already exists" of "permission denied"
# Fix:
# 1. Use "IF NOT EXISTS" in ALTER TABLE
# 2. Verify Supabase connection (niet lokaal DB)
# 3. Check Supabase project URL is correct
```

---

## 📋 **QUICK COMMANDS**

### Local Test (Verify Before Deploy)
```bash
# Test sync locally met productie database
cd /workspaces/TeamNL-Cloud9-Racing-Team

SUPABASE_URL="https://bktbeefdmrpxhsyyalvc.supabase.co" \
SUPABASE_ANON_KEY="eyJhbGci..." \
ZWIFT_API_KEY="650c6d2fc4ef6858d74cbef1" \
ZWIFT_USERNAME="jeroen.diepenbroek@gmail.com" \
ZWIFT_PASSWORD="CloudRacer-9" \
npx tsx sync-runner.ts 150437
```

### Railway Deploy Trigger
```bash
# Via CLI (als railway CLI geïnstalleerd)
railway login
railway link  # Select project
railway up    # Trigger deployment

# Of commit lege change om deploy te triggeren
git commit --allow-empty -m "chore: trigger Railway redeploy"
git push origin main
```

### Force Railway Rebuild
```bash
# Clear Railway cache en rebuild
# Via Dashboard:
# 1. Settings → "Clear Build Cache"
# 2. Deployments → "Redeploy" op laatste commit
```

---

## 🎬 **VOLGENDE STAPPEN (NA DEPLOYMENT)**

### 1. Sync Team Members
```bash
# Via productie endpoint (als sync endpoints live zijn)
curl -X POST https://teamnl-cloud9-racing-team-production.up.railway.app/api/sync/all

# Of via bulk upload in Admin interface
# Upload CSV/TXT met 75 rider IDs
```

### 2. Backend API Endpoint
Implement `GET /api/racing-matrix` volgens `RACING_MATRIX_FRONTEND_SPEC.md`

### 3. Frontend Racing Matrix
Build React component met:
- 4-axis phenotype radar chart (Recharts)
- Power curve line chart
- Rider table met filters

**ETA**: 2-3 dagen frontend development

---

## 📞 **HULP NODIG?**

**Railway Dashboard**: https://railway.app/dashboard  
**Supabase Dashboard**: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc  
**GitHub Repo**: https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team

**Docs**:
- `ARCHITECTURE_DECISIONS_SYNC.md` - Alle beslissingen gedocumenteerd
- `COMPLETE_3API_MAPPING.md` - API field mapping
- `README_RACING_MATRIX.md` - Quick start guide

---

**Status**: ⏳ Wacht op:
1. Database migratie in Supabase
2. Environment variables in Railway
3. Railway redeploy trigger
