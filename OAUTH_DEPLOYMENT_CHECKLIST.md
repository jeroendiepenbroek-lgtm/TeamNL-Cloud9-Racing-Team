# OAuth + Deployment Checklist

## ✅ A) Discord Provider Setup

### Discord Developer Portal
- [ ] Ga naar https://discord.com/developers/applications
- [ ] Maak "New Application": `TeamNL Cloud9 Racing`
- [ ] OAuth2 → General → Add Redirect:
  ```
  https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback
  ```
- [ ] Save Changes
- [ ] Kopieer **Client ID**
- [ ] Reset en kopieer **Client Secret**

### Supabase Dashboard
- [ ] Ga naar https://supabase.com/dashboard
- [ ] Select project: `bktbeefdmrpxhsyyalvc`
- [ ] Authentication → Providers → Discord
- [ ] Enable toggle AAN
- [ ] Plak Client ID
- [ ] Plak Client Secret
- [ ] Save
- [ ] Authentication → URL Configuration → Add redirects:
  - `http://localhost:5173/`
  - `https://your-railway-url.up.railway.app/`

### Lokaal Testen
- [ ] Open http://localhost:5173
- [ ] Klik "Admin Login"
- [ ] Klik Discord knop (paars)
- [ ] Authorize bij Discord
- [ ] Verify: redirect terug naar dashboard + ingelogd

---

## ✅ B) Railway Deployment

### Railway Environment Variables
- [ ] Ga naar https://railway.app/dashboard
- [ ] Select project: TeamNL Cloud9
- [ ] Select service: frontend
- [ ] Variables tab → Add:
  
  **Variable 1:**
  - Name: `VITE_SUPABASE_URL`
  - Value: `https://bktbeefdmrpxhsyyalvc.supabase.co`
  
  **Variable 2:**
  - Name: `VITE_SUPABASE_ANON_KEY`
  - Value: (check `.env.local` of Supabase Settings → API → anon key)
    ```
    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NTQ2MzEsImV4cCI6MjA3NzUzMDYzMX0.HHa7K3J-pmR73hm063w0JJhA4pFASYS65DFI-BZGAqw
    ```

### Productie URL Setup
- [ ] Railway → Settings → Domains → kopieer URL
  (bijv: `teamnl-cloud9-racing-team-production.up.railway.app`)
- [ ] Supabase → Authentication → URL Configuration → Add:
  - Site URL: `https://your-railway-url.up.railway.app`
  - Redirect URLs: `https://your-railway-url.up.railway.app/`
- [ ] Save

### Deployment
- [ ] Railway → Deployments → Wacht op auto-deploy
- [ ] Status: ✅ Success (2-5 min)
- [ ] Of: Klik "Redeploy" knop

### Productie Testen
- [ ] Open: `https://your-railway-url.up.railway.app`
- [ ] Dashboard laadt binnen 3 sec
- [ ] Klik "Admin Login"
- [ ] Klik Discord knop
- [ ] Authorize bij Discord
- [ ] Verify: redirect naar productie + ingelogd
- [ ] Check Supabase → Users → nieuwe user visible

---

## 📋 Quick Reference

### Anon Key Ophalen
```
Supabase Dashboard → Settings (gear icon) → API → Copy "anon" key
```

### Railway URL Vinden
```
Railway Dashboard → Service → Settings → Domains
```

### Lokaal Testen
```bash
cd backend/frontend
npm run dev
# Open: http://localhost:5173
```

### Force Redeploy
```bash
git commit --allow-empty -m "redeploy"
git push origin main
```

---

## 🚨 Troubleshooting Quick Fixes

### Discord: "Invalid redirect_uri"
- Check exact match: `https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback`
- No trailing slash!

### Railway: "Environment variable undefined"
- Verify `VITE_` prefix exists
- Redeploy after adding variables

### Productie: Redirect naar localhost
- Update Supabase Site URL naar Railway URL
- Add Railway URL to Redirect URLs

### Build Error
- Check Railway logs: Deployments → View Logs
- Common: Missing env vars during build

---

## ✅ Success Criteria

Na voltooien van A en B:

- ✅ Lokaal: Discord login werkt
- ✅ Productie: Discord login werkt
- ✅ Railway: Environment vars configured
- ✅ Supabase: Users zichtbaar na login
- ✅ No errors in browser console
- ✅ No errors in Railway logs

**Tijd nodig**: ~15-20 minuten totaal

---

## 📚 Detailed Docs

- Discord stap-voor-stap: `docs/DISCORD_SETUP_WALKTHROUGH.md`
- Railway deployment: `docs/RAILWAY_DEPLOYMENT.md`
- Alle OAuth providers: `docs/OAUTH_PROVIDERS_SETUP.md`
