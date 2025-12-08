# Railway Deployment Fix - Root Cause & Solution

**Datum**: 8 december 2025  
**Probleem**: Railway blijft oude versie (2.1.0) gebruiken met `riders_unified` errors

---

## 🔍 Root Cause Analysis

### Symptomen
```
2025-12-08T08:30:53Z [err] Could not find table 'public.riders_unified'
2025-12-08T08:31:14Z [inf] Health check received (versie 2.1.0)
```

### Oorzaak
Railway was **confused** over build strategie:

1. **railway.toml** had:
   ```toml
   builder = "nixpacks"
   buildCommand = "cd backend && npm install && ..."
   ```

2. **Backend/Dockerfile** bestond ook (verouderd, 45 regels)
   - Verwees naar `start.sh` die niet bestaat
   - Multi-stage build met complexe COPY structuur

3. **Railway logs toonden**:
   ```
   [inf] found 'Dockerfile' at 'backend/Dockerfile'
   [inf] found 'railway.toml' at 'railway.toml'
   ```
   → Railway probeerde beide te gebruiken → conflict

4. **Resultaat**: 
   - Build wel getriggerd
   - Maar oude container bleef draaien
   - Nieuwe image niet deployed

---

## ✅ Oplossing (3 commits)

### Commit 1: Force Redeploy
```bash
git commit --allow-empty -m "chore: Force Railway redeploy"
```
→ Trigger nieuwe deployment zonder code changes

### Commit 2: Fix Dockerfile
**Voor** (45 regels - complex):
```dockerfile
FROM node:22-alpine AS base
FROM base AS frontend-builder  # Multi-stage
COPY start.sh ./start.sh        # Bestaat niet
CMD ["./start.sh"]              # Crash
```

**Na** (43 regels - simpel):
```dockerfile
FROM node:22-alpine             # Single stage
WORKDIR /app
RUN npm ci                      # Backend deps
WORKDIR /app/frontend
RUN npm ci && npm run build     # Frontend build
RUN cp -r dist/* /app/public/dist/
WORKDIR /app
CMD ["npm", "start"]            # npx tsx src/server.ts
```

### Commit 3: Fix railway.toml
**Voor**:
```toml
builder = "nixpacks"
buildCommand = "cd backend && npm install && ..."
```

**Na**:
```toml
builder = "dockerfile"
dockerfilePath = "backend/Dockerfile"
```

→ **Explicit** Dockerfile gebruiken (geen nixpacks conflict)

---

## 🎯 Verwacht Resultaat

### Railway Build Process
```
1. Read railway.toml
2. Use builder = "dockerfile"
3. Execute backend/Dockerfile
4. Build frontend (npm run build in Dockerfile)
5. Copy frontend dist → /app/public/dist/
6. Create Docker image
7. Deploy container
8. Run: npm start (tsx src/server.ts)
```

### Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2025-12-08T...",
  "environment": "production",
  "port": 8080,
  "version": "3.0.0-clean-slate",
  "message": "✅ Backend running - ready for rebuild"
}
```

### Logs (Expected)
```
╔════════════════════════════════════════════════╗
║  TeamNL Cloud9 Racing Team - Backend v3.0     ║
║  🧹 Clean Slate Edition                        ║
╠════════════════════════════════════════════════╣
║  🚀 Server running on port 8080               ║
║  ✅ Ready for rebuild                          ║
╚════════════════════════════════════════════════╝
```

**GEEN errors meer**:
- ❌ `riders_unified table not found` → Gone
- ❌ OAuth refresh errors → Gone
- ❌ Sync errors → Gone

---

## 📊 Deployment Timeline

| Time | Event | Status |
|------|-------|--------|
| 08:30 | Railway running v2.1.0 | ❌ riders_unified errors |
| 08:31 | Health check v2.1.0 | ❌ Oude versie |
| 08:32 | Push: server.ts v3.0 | 🟡 Build triggered |
| 08:33 | Railway build starts | 🟡 Building... |
| 08:35 | Push: empty commit | 🟡 Force redeploy |
| 08:36 | Push: new Dockerfile | 🟡 Rebuild triggered |
| 08:37 | Push: railway.toml fix | 🟡 Final build |
| 08:40 | Expected: v3.0.0 live | ⏳ Deploying... |

**Monitor**:
```bash
watch -n 10 'curl -s https://teamnl-cloud9-racing-team-production.up.railway.app/health | jq .version'
```

---

## 🔧 Railway Dashboard Actions

### 1. Check Build Logs
https://railway.app/project/teamnl-cloud9-racing-team-production

Look for:
- ✅ `[build] builder = dockerfile`
- ✅ `[build] FROM node:22-alpine`
- ✅ `[build] COPY frontend/`
- ✅ `[build] RUN npm run build`
- ✅ `[deploy] CMD ["npm", "start"]`

### 2. Check Deployment Logs
Look for:
- ✅ `TeamNL Cloud9 Racing Team - Backend v3.0`
- ✅ `🧹 Clean Slate Edition`
- ✅ `Server running on port 8080`

### 3. Environment Variables Cleanup
**Remove deze vars** (backend gebruikt ze niet meer):
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- DATABASE_URL
- ZWIFT_RACING_API_KEY
- ZWIFT_CLIENT_ID
- ZWIFT_CLIENT_SECRET
- ZWIFT_REFRESH_TOKEN
- ZWIFTPOWER_USERNAME
- ZWIFTPOWER_PASSWORD
- ENABLE_AUTO_SYNC
- USE_SMART_SCHEDULER
- SYNC_INTERVAL_MINUTES

**Keep alleen**:
- NODE_ENV=production
- PORT=8080
- VITE_SUPABASE_URL (voor frontend Discord OAuth)
- VITE_SUPABASE_ANON_KEY (voor frontend Discord OAuth)

---

## ✅ Verificatie Checklist

Nadat Railway deployment compleet is:

- [ ] Health endpoint: `curl .../health` → versie 3.0.0-clean-slate
- [ ] Logs: "Backend v3.0 🧹 Clean Slate Edition"
- [ ] Geen `riders_unified` errors
- [ ] Frontend laadt: 3 lege dashboards
- [ ] Discord login werkt
- [ ] Oude endpoints: 404 met duidelijk bericht

Run:
```bash
./verify-railway-deployment.sh
```

---

## 📝 Lessons Learned

### Problem
Mixing build strategies (nixpacks + Dockerfile) caused Railway confusion.

### Solution
Be **explicit** in railway.toml:
```toml
[build]
builder = "dockerfile"  # Not "nixpacks"
dockerfilePath = "backend/Dockerfile"
```

### Best Practice
- Use **either** nixpacks **or** Dockerfile, never both
- Keep Dockerfile simple (single stage if possible)
- Test Dockerfile locally: `docker build -t test .`
- Force redeploy with empty commit if needed

---

**Status**: Waiting for Railway deployment (~5 min)
