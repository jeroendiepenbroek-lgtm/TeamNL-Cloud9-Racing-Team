# Nieuw Railway Project Setup - Complete Guide

**Datum**: 8 december 2025  
**Reden**: Oude Railway deployment vastgelopen, fresh start nodig  
**Status**: Frontend + Auth beveiligd in `.backups/`

---

## ✅ Voorbereiding (Gedaan)

- [x] Frontend backup: `.backups/frontend-clean-20251208/`
- [x] Discord OAuth config backup: `.backups/discord-auth-backup.md`
- [x] Minimal backend v3.0: `backend/src/server.ts` (95 regels)
- [x] Clean Dockerfile: `backend/Dockerfile` (43 regels)
- [x] Railway config: `railway.toml` (builder=dockerfile)

---

## 🚂 Stap 1: Nieuw Railway Project Aanmaken

### A. Open Railway Dashboard
https://railway.app

### B. Create New Project
1. Klik: **"New Project"**
2. Kies: **"Deploy from GitHub repo"**
3. Selecteer repository: `jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team`
4. Branch: **`main`**
5. Service name: `teamnl-backend-v3`

### C. Configure Root Directory
**Settings** tab:
- **Root Directory**: `backend`
- **Watch Paths**: `backend/**`

Dit zorgt dat Railway alleen naar backend/ kijkt voor changes.

---

## 🔧 Stap 2: Environment Variables Setup

**Variables** tab → Add variables:

```bash
# Core
NODE_ENV=production
PORT=8080

# Frontend - Discord OAuth (via Supabase)
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3MjQ1ODksImV4cCI6MjA0NjMwMDU4OX0.6hHXDxq_OOMM89GrSfN1CRd0XgGMqU72gBHG9CYmUE4
```

**LET OP**: Voeg **ALLEEN** deze 4 variabelen toe. Geen oude database/sync variabelen.

---

## 📦 Stap 3: Deployment Proces

Railway zal automatisch:

1. **Detect**: `backend/Dockerfile`
2. **Read**: `railway.toml` (builder=dockerfile)
3. **Build**:
   ```bash
   FROM node:22-alpine
   WORKDIR /app
   RUN npm ci                    # Backend deps
   WORKDIR /app/frontend
   RUN npm ci && npm run build   # Frontend build
   RUN cp -r dist/* /app/public/dist/
   WORKDIR /app
   CMD ["npm", "start"]          # Start backend
   ```
4. **Deploy**: Start container op port 8080
5. **Health check**: Test `/health` endpoint

**Expected build time**: 3-5 minuten

---

## 🔍 Stap 4: Verificatie

### A. Check Build Logs
**Deployments** tab → Latest deployment → **View Logs**

Zoek naar:
```
✅ [build] RUN npm ci
✅ [build] RUN npm run build (frontend)
✅ [build] Successfully built
✅ [deploy] Starting container
✅ Server running on port 8080
```

### B. Check Runtime Logs
**Logs** tab → Moet tonen:
```
╔════════════════════════════════════════════════╗
║  TeamNL Cloud9 Racing Team - Backend v3.0     ║
║  🧹 Clean Slate Edition                        ║
╠════════════════════════════════════════════════╣
║  🚀 Server running on port 8080               ║
║  📍 Health: http://0.0.0.0:8080/health        ║
║  🌍 Environment: production                   ║
║                                                ║
║  ✅ Ready for rebuild                          ║
║  • Frontend: React (3 empty dashboards)       ║
║  • Backend: Health endpoints only             ║
║  • Database: Ready for fresh schema           ║
╚════════════════════════════════════════════════╝
```

### C. Test Health Endpoint
```bash
# Railway genereert automatisch een URL, bijv:
# https://teamnl-backend-v3-production.up.railway.app

curl https://[jouw-railway-url]/health

# Verwacht:
{
  "status": "healthy",
  "version": "3.0.0-clean-slate",
  "timestamp": "2025-12-08T...",
  "environment": "production",
  "port": 8080,
  "message": "✅ Backend running - ready for rebuild"
}
```

### D. Test Frontend
Open in browser: `https://[jouw-railway-url]/`

**Verwacht**:
- ✅ 3 lege dashboards (Racing Matrix, Events, Results)
- ✅ Login button (rechts boven)
- ✅ Responsive design (mobile + desktop)
- ✅ Geen console errors

### E. Test Discord Login
1. Klik **Login** button
2. Popup toont Discord login
3. Login met Discord account
4. Redirected terug naar app
5. User naam zichtbaar in header
6. Logout button werkt

---

## 🌐 Stap 5: Custom Domain (Optioneel)

Als je een custom domain wilt:

**Settings** → **Domains** tab:
1. Klik: **"Custom Domain"**
2. Voer in: `teamnl.cloud9racing.app` (of jouw domein)
3. Volg DNS instructies
4. Railway verifieert automatisch

**Railway domain** blijft altijd werken als fallback.

---

## 🗑️ Stap 6: Oude Project Verwijderen

**NA verificatie** dat nieuwe project werkt:

1. Open oude project: https://railway.app/project/[oud-project-id]
2. **Settings** → Danger Zone
3. **"Delete Project"**
4. Confirm

Dit voorkomt dubbele kosten.

---

## ✅ Success Checklist

- [ ] Nieuw Railway project aangemaakt
- [ ] Root directory: `backend` geconfigureerd
- [ ] 4 ENV vars toegevoegd (NODE_ENV, PORT, VITE_*)
- [ ] Build succesvol (3-5 min)
- [ ] Health endpoint: versie 3.0.0-clean-slate
- [ ] Frontend laadt: 3 dashboards zichtbaar
- [ ] Discord login werkt
- [ ] Geen errors in logs
- [ ] Oude project verwijderd

---

## 🚨 Troubleshooting

### "Build fails: npm ci error"
→ Check package.json paths
→ Verify root directory: `backend`

### "Frontend 404"
→ Check Dockerfile: `cp -r dist/* /app/public/dist/`
→ Verify build output in logs

### "Discord login fails"
→ Check Supabase callback URL
→ Should be: `https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback`
→ NOT Railway URL

### "Health endpoint returns 404"
→ Check server.ts: `app.get('/health', ...)`
→ Check PORT env var: 8080

### "Old version still showing"
→ Wrong project - check Railway URL
→ Clear browser cache

---

## 📊 Cost Comparison

| Item | Old Project | New Project |
|------|-------------|-------------|
| Compute | $5/mo (unused credits gone) | Fresh $5 trial credit |
| Build | Stuck, not deploying | Clean, working |
| Cache | Corrupted | Fresh |

**Result**: Fresh start met werkende deployment > oude credits op vast project

---

## 🔄 Rollback Plan

Als nieuwe project niet werkt:

```bash
# Restore frontend
cp -r .backups/frontend-clean-20251208/* backend/frontend/

# Verify lokaal
cd backend/frontend && npm install && npm run build

# Check backup
cat .backups/discord-auth-backup.md
```

Alle code is veilig in Git + local backups.

---

## 📝 Notes

- Frontend is 100% preserved (3 dashboards + Discord auth)
- Backend is minimal (health endpoints only)
- Geen database connecties = geen errors
- Ready voor rebuild vanaf clean slate
- Discord OAuth blijft werken (via Supabase, niet Railway)

---

## 🎯 Next Steps (NA deployment)

1. **Verify**: Run `./verify-railway-deployment.sh`
2. **Monitor**: Check Railway logs voor 10 min
3. **Test**: Open frontend in browser
4. **Delete**: Verwijder oude Railway project
5. **Celebrate**: 🎉 Clean deployment werkt!

Later (rebuild):
1. Design Supabase database schema
2. Add backend API endpoints
3. Connect dashboards to API
4. Add Zwift sync features

---

**Railway Dashboard**: https://railway.app  
**Project Name**: `teamnl-backend-v3`  
**Expected URL**: `https://teamnl-backend-v3-production.up.railway.app`
