# Quick Deployment Checklist

## ✅ Voltooid
- [x] Supabase database schema deployed
- [x] Frontend deployed naar Vercel
- [x] E2E Test component toegevoegd
- [x] TypeScript errors opgelost
- [x] Documentation toegevoegd

## 🔴 NU DOEN (Kritieke Issues)

### 1. Fix Vercel Environment Variables (5 minuten)
**Issue**: Vercel deployment faalt met "Environment Variable VITE_SUPABASE_URL references Secret supabase-url, which does not exist"

**Oplossing**:
```bash
# Stap 1: Ga naar Vercel Dashboard
https://vercel.com/[TEAM]/team-nl-cloud9-racing-team/settings/environment-variables

# Stap 2: Voeg toe (zie .env.vercel.example voor waarden):
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_BASE_URL=http://localhost:3000/api

# Stap 3: Voor elke variable:
- Name: [variable name]
- Value: [value uit .env.vercel.example]
- Environment: ✅ Production, ✅ Preview, ✅ Development

# Stap 4: Trigger redeploy
Vercel Dashboard → Deployments → Latest → "..." → Redeploy
```

**Verify**:
```bash
curl https://team-nl-cloud9-racing-team.vercel.app/
# Should return React app HTML (not 404)
```

---

### 2. PostgREST Schema Cache Refresh (1 minuut)
**Issue**: REST API kan 401 errors geven na schema deployment

**Oplossing**:
```sql
-- Open: https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/sql
-- Run:
NOTIFY pgrst, 'reload schema';

-- Verify:
SELECT COUNT(*) FROM riders;
```

**Test**:
```bash
curl -H "apikey: [ANON_KEY]" \
  https://bktbeefdmrpxhsyyalvc.supabase.co/rest/v1/riders

# Should return: [] or data (not 401)
```

---

### 3. Railway Backend Deployment (15 minuten)
**Issue**: Backend API niet deployed → frontend kan niet syncing doen

**Stappen**:
1. **Create Railway Project**
   ```
   → https://railway.app
   → New Project
   → Deploy from GitHub repo
   → Select: TeamNL-Cloud9-Racing-Team
   ```

2. **Configure Environment Variables**
   ```
   Railway Dashboard → Variables tab
   → Copy all vars from .env.railway.example
   → BELANGRIJK: Update DATABASE_URL password
   ```

   DATABASE_URL password ophalen:
   ```
   Supabase → Settings → Database → Connection String
   → Use "Connection Pooling" (niet "Session mode")
   → Copy password
   ```

3. **Wait for Build**
   ```
   Build logs: ~2 minuten
   Check for: "✓ Build complete!"
   ```

4. **Test Deployment**
   ```bash
   # Get Railway URL from dashboard
   RAILWAY_URL="https://teamnl-cloud9-production.up.railway.app"
   
   # Test health endpoint
   curl $RAILWAY_URL/api/health
   # Expected: {"status":"ok","database":"connected"}
   
   # Test riders endpoint
   curl $RAILWAY_URL/api/riders
   # Expected: [] or rider data
   ```

5. **Update Vercel Environment Variable**
   ```
   Vercel Dashboard → Environment Variables
   → Update VITE_API_BASE_URL
   → Value: https://[RAILWAY_URL]/api
   → Redeploy Vercel
   ```

---

## 🟡 Optioneel (Na Boven Stappen)

### 4. Fix GitHub Actions Secrets (10 minuten)
**Issue**: Deploy workflows falen door missing secrets

**Oplossing**:
```bash
# Ga naar: https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team/settings/secrets/actions

# Voeg toe:
RAILWAY_TOKEN=<ophalen van Railway Dashboard → Account → Tokens>
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDQ5MjgzMywiZXhwIjoyMDQ2MDY4ODMzfQ.NkV22nxX0pM4G2lEyF1SIHqp3zNVXy0T4YGlFsCFKI4
ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1
```

---

### 5. Test E2E Workflow (3 minuten)
**Prerequisites**: Vercel + Railway deployed, PostgREST cache refreshed

**Stappen**:
```
1. Open: https://team-nl-cloud9-racing-team.vercel.app/
2. Klik: "🧪 E2E Test" tab
3. Input: 150437
4. Klik: "Start E2E Test"
5. Verwacht: Groene success box met rider stats
```

---

### 6. Upload Production Data (10 minuten)
**Prerequisites**: E2E test succesvol

**Stappen**:
```
1. Verzamel Rider IDs (TeamNL members)
2. Open webapp → "➕ Upload" tab
3. Paste IDs (one per line)
4. Klik: "Upload Riders"
5. Monitor: Sync progress
6. Verify: Dashboard → Ranking table toont riders
```

---

## 📊 Expected Timeline

| Task | Time | Status |
|------|------|--------|
| Fix Vercel env vars | 5 min | ⚠️ BLOCKER |
| PostgREST cache refresh | 1 min | 🔴 HIGH |
| Railway deployment | 15 min | 🔴 HIGH |
| Fix GitHub Actions | 10 min | 🟡 OPTIONAL |
| Test E2E workflow | 3 min | 🟡 AFTER ABOVE |
| Upload data | 10 min | 🟡 AFTER E2E |
| **TOTAL** | **44 min** | |

---

## 🆘 Troubleshooting

### Vercel Build Fails
```
Error: Environment Variable "VITE_SUPABASE_URL" references Secret "supabase-url"
```
**Fix**: Don't use "Secret" reference, paste direct value

### Railway Build Fails
```
Error: Cannot find module '@prisma/client'
```
**Fix**: Check `npm run build` in package.json includes `prisma generate`

### PostgREST 401
```
{"code":"PGRST301","message":"JWT invalid"}
```
**Fix**: Run `NOTIFY pgrst, 'reload schema';` in Supabase SQL Editor

### E2E Test Fails
```
Failed to fetch from API
```
**Fix**: Check Railway backend is running, test /api/health endpoint

---

## ✅ Success Criteria

- [ ] Vercel deployment succeeds (no 404)
- [ ] Railway backend responds on /api/health
- [ ] Supabase REST API returns data (not 401)
- [ ] E2E Test GUI shows green success box
- [ ] Dashboard toont riders in ranking table

---

**Current Status**: 🔴 3 blockers (Vercel env vars, PostgREST cache, Railway deployment)
**Next Action**: Fix Vercel environment variables (5 min)
