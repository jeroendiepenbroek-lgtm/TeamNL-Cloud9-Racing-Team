# 🚀 Railway Deployment Guide - Fresh Start v4.0.0

## 📋 Pre-checklist

✅ Repository: `jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team`  
✅ Branch: `fresh-start-v4`  
✅ Commit: `9fc3e15` - "Fresh start v4.0.0"  
✅ Files: 23 files (was 1000+)  
✅ Backend: 40 lines (health endpoint only)  
✅ Frontend: 3 dashboards + Discord OAuth  
✅ Local tests: ✅ Build succeeds, server starts  

---

## 🎯 Optie A: Nieuw Railway Project (AANBEVOLEN)

### Stap 1: Nieuw Project Aanmaken

1. Ga naar [Railway Dashboard](https://railway.app/dashboard)
2. Klik **"New Project"**
3. Selecteer **"Deploy from GitHub repo"**
4. Kies repository: `jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team`
5. **BELANGRIJK**: Selecteer branch `fresh-start-v4` (niet main!)
6. Klik **"Deploy Now"**

### Stap 2: Railway Detecteert Automatisch

Railway ziet:
- ✅ `Dockerfile` in root
- ✅ `railway.toml` config
- ✅ Node.js project

Build start automatisch!

### Stap 3: Environment Variables (optioneel)

Railway zet automatisch:
- `PORT=8080` (auto-assigned)
- `NODE_ENV=production` (standaard)

Geen extra vars nodig voor MVP!

### Stap 4: Wacht op Deployment

Railway build output:
```
Building Dockerfile...
[+] Building frontend... ✓
[+] Building backend... ✓
[+] Creating production image... ✓
Deployment successful!
```

⏱️ Verwachte tijd: **3-5 minuten**

### Stap 5: Test Deployment

Railway geeft je een URL zoals:
```
https://teamnl-cloud9-racing-team-fresh-start-v4.up.railway.app
```

Test endpoints:
```bash
# Health check
curl https://your-app.up.railway.app/health

# Expected response:
{
  "status": "healthy",
  "version": "4.0.0-fresh-start",
  "timestamp": "2024-12-08T...",
  "environment": "production"
}

# Frontend
curl -I https://your-app.up.railway.app/
# Expected: 200 OK + HTML

# Test dashboards
open https://your-app.up.railway.app/
open https://your-app.up.railway.app/events
open https://your-app.up.railway.app/results
```

### Stap 6: Custom Domain (optioneel)

1. Railway project → **Settings** → **Domains**
2. Klik **"Generate Domain"**
3. Of voeg custom domain toe

---

## 🔄 Optie B: Bestaand Project Hergebruiken

### Waarom niet aanbevolen?
- Oude deployment history blijft bestaan
- Mogelijk caching issues
- Environment vars cleanup nodig

### Als je toch wilt:

1. Railway Dashboard → Je oude project
2. **Settings** → **Source**
3. Verander branch naar `fresh-start-v4`
4. **Settings** → **Environment Variables**
   - Verwijder ALLE oude vars (Supabase, etc.)
5. **Settings** → **Deploys**
6. Klik **"Trigger Deploy"**

---

## 🧪 Lokaal Testen Vóór Railway

```bash
# Clone fresh-start branch
git clone -b fresh-start-v4 https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team.git
cd TeamNL-Cloud9-Racing-Team

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Start backend
cd backend
npm install
npm start

# Test in browser
open http://localhost:8080
```

**Expected output:**
```
🚀 TeamNL Cloud9 Racing Team Dashboard
📦 Version: 4.0.0-fresh-start
🌍 Port: 8080
🔧 Environment: development
✅ Server running!
```

---

## 🎨 Frontend Features

### 3 Dashboards Live:

1. **Racing Matrix** - `/`
   - vELO tiers placeholder
   - Power intervals placeholder
   - Phenotype placeholder

2. **Events Dashboard** - `/events`
   - 48h lookforward placeholder
   - Team signups placeholder
   - Route details placeholder

3. **Results Dashboard** - `/results`
   - Race results placeholder
   - Power curve placeholder
   - Personal records placeholder

### Auth Status:

- ✅ Discord OAuth configured (Supabase)
- ✅ Login modal werkt
- ⚠️ Data integratie komt later

---

## 🐛 Troubleshooting

### Railway Build Failed

**Symptoom:** `[err] Build Failed: "/frontend": not found`

**Oplossing:** Check dat je `fresh-start-v4` branch hebt geselecteerd, niet `main`!

```bash
# Verify branch in Railway:
# Settings → Source → Branch: fresh-start-v4
```

---

### Frontend Niet Zichtbaar

**Symptoom:** 404 of lege pagina

**Check:**
```bash
# Lokaal testen of frontend build bestaat
ls -la frontend/dist/
# Moet bevatten: index.html, assets/
```

**Oplossing:** Re-run build
```bash
cd frontend
npm run build
git add frontend/dist/
git commit -m "fix: Include frontend dist files"
git push origin fresh-start-v4
```

---

### Health Endpoint 500 Error

**Symptoom:** `/health` returns 500

**Check Railway logs:**
```
Railway Dashboard → Deployments → Latest → View Logs
```

**Common issues:**
- Node.js version mismatch (should be 22)
- Missing dependencies

**Oplossing:**
```bash
# Check package.json engines
cat backend/package.json | grep engines

# Should show:
"engines": {
  "node": ">=22.0.0"
}
```

---

### Discord Login Werkt Niet

**Symptoom:** Login modal opent maar auth faalt

**Check:**
1. Supabase project nog actief? → https://supabase.com/dashboard
2. Discord OAuth credentials correct?
3. Redirect URL updated naar nieuwe Railway URL?

**Oplossing:**
Supabase Dashboard:
1. **Authentication** → **URL Configuration**
2. **Site URL**: `https://your-new-railway-url.up.railway.app`
3. **Redirect URLs**: Voeg toe:
   ```
   https://your-new-railway-url.up.railway.app
   https://your-new-railway-url.up.railway.app/**
   ```

---

## ✅ Success Criteria

Deployment succesvol als:

- ✅ Railway build completes zonder errors
- ✅ `/health` returns JSON met version `4.0.0-fresh-start`
- ✅ `/` toont Racing Matrix dashboard
- ✅ `/events` toont Events dashboard
- ✅ `/results` toont Results dashboard
- ✅ Login modal opent (Discord OAuth)
- ✅ Mobile responsive (test op telefoon)
- ✅ Geen console errors in browser DevTools

---

## 📊 Vergelijking: Voor vs Na

| Metric | Voor (v2.1.0) | Na (v4.0.0) |
|--------|---------------|-------------|
| Files | 1000+ | 23 |
| Backend LOC | 3000+ | 40 |
| Build time | 8-12 min | 3-5 min |
| Database errors | ❌ riders_unified | ✅ None |
| API endpoints | 25+ | 1 (health) |
| Deployment success | 0% | TBD ✨ |

---

## 🎯 Volgende Stappen Na Deployment

1. **Merge naar main** (als deployment succesvol)
   ```bash
   git checkout main
   git merge fresh-start-v4
   git push origin main
   ```

2. **Update Railway naar main branch** (optioneel)
   - Settings → Source → Branch: `main`

3. **Data integratie** (later)
   - API endpoints toevoegen
   - Database connection (SQLite/Postgres)
   - Real data in dashboards

4. **Monitor deployment**
   - Railway Dashboard → Metrics
   - Check logs regelmatig

---

## 🔗 Links

- **Railway Dashboard**: https://railway.app/dashboard
- **GitHub Repo**: https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team
- **Branch**: `fresh-start-v4`
- **Commit**: `9fc3e15`
- **Backups**: `.backups/` en `.fresh-start-backup/`

---

## 💡 Tips

1. **Custom domain instellen** voor professionele URL
2. **Railway Metrics** monitoren voor performance
3. **Logs checken** na eerste deploy voor issues
4. **Mobile testen** - dashboards zijn mobile-first
5. **Discord OAuth testen** met echte Discord account

---

**Klaar om te deployen?** 🚀

➡️ Ga naar [Railway Dashboard](https://railway.app/dashboard) en volg **Optie A**!
