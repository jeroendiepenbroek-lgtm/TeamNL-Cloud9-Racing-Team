# Railway Deployment - Environment Variables Setup

## Overzicht
Railway auto-deployed je laatste code push (commit `f80fedd`). Nu moeten we environment variabelen configureren zodat OAuth werkt in productie.

## Stap 1: Railway Dashboard Openen

1. Ga naar: https://railway.app/dashboard
2. Login met je Railway account (of GitHub OAuth)
3. Zoek en selecteer project: **"TeamNL Cloud9 Racing Team"**
4. Klik op je **frontend service** (waarschijnlijk `frontend` of `teamnl-dashboard`)

## Stap 2: Environment Variables Toevoegen

### 2.1 Navigeer naar Variables
1. In je service overview, klik op **"Variables"** tab bovenaan
2. Je ziet mogelijk al een paar variabelen (NODE_ENV, etc.)

### 2.2 Voeg Supabase Variabelen Toe

Klik **"+ New Variable"** en voeg deze TWEE variabelen toe:

#### Variable 1: VITE_SUPABASE_URL
- **Name**: `VITE_SUPABASE_URL`
- **Value**: 
  ```
  https://bktbeefdmrpxhsyyalvc.supabase.co
  ```

#### Variable 2: VITE_SUPABASE_ANON_KEY
- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: (haal deze op uit je lokale `.env.local` of Supabase Dashboard)
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NTQ2MzEsImV4cCI6MjA3NzUzMDYzMX0.HHa7K3J-pmR73hm063w0JJhA4pFASYS65DFI-BZGAqw
  ```

**⚠️ Belangrijk**: Dit is de ANON key (public key), NIET de service_role key!

### 2.3 Hoe Anon Key te vinden (indien nodig)
1. Ga naar: https://supabase.com/dashboard
2. Selecteer project: `bktbeefdmrpxhsyyalvc`
3. Klik op **Settings** (tandwiel icon) onderaan linker menu
4. Klik **API** in het settings submenu
5. Kopieer de key bij **"anon" / "public"** (NIET service_role!)

## Stap 3: Redeploy Triggeren

Na het toevoegen van environment variables:

### Optie A: Automatische Redeploy (aanbevolen)
Railway zal automatisch redeployen na het opslaan van variabelen.
- **Wacht 2-5 minuten** voor nieuwe deployment
- Check **"Deployments"** tab voor status
- Status moet worden: ✅ **"Success"**

### Optie B: Handmatige Redeploy
Als auto-deploy niet werkt:
1. Ga naar **"Deployments"** tab
2. Klik op de meest recente deployment
3. Klik rechtsboven op **"Redeploy"**

## Stap 4: Custom Domain (optioneel maar aanbevolen)

### 4.1 Productie URL Vinden
1. In Railway service, klik **"Settings"** tab
2. Scroll naar **"Domains"** sectie
3. Je ziet iets als:
   ```
   teamnl-cloud9-racing-team-production.up.railway.app
   ```
4. Of voeg een custom domain toe (bijv. `dashboard.teamnlcloud9.nl`)

### 4.2 Update Supabase Redirect URLs
1. Ga naar Supabase Dashboard → Authentication → URL Configuration
2. Voeg je Railway URL toe aan **"Redirect URLs"**:
   ```
   https://teamnl-cloud9-racing-team-production.up.railway.app
   https://teamnl-cloud9-racing-team-production.up.railway.app/
   ```
3. Update **"Site URL"** naar je productie URL:
   ```
   https://teamnl-cloud9-racing-team-production.up.railway.app
   ```
4. Klik **"Save"**

### 4.3 Update OAuth Provider Redirects
Voor elke provider die je enabled hebt, voeg productie callback toe:

#### Discord
1. Discord Developer Portal → OAuth2 → Redirects
2. Add: (NO CHANGE - Supabase callback blijft hetzelfde)
   ```
   https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback
   ```
   ✅ **Geen wijziging nodig** - Supabase handelt alle redirects af!

#### Google (indien enabled)
1. Google Cloud Console → Credentials → OAuth 2.0 Client
2. Authorized redirect URIs blijft:
   ```
   https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback
   ```
   ✅ **Geen wijziging nodig**

**Belangrijk**: OAuth providers redirecten altijd naar Supabase callback. Supabase redirectet daarna naar jouw app. Dus alleen Supabase "Redirect URLs" moet je productie domain bevatten!

## Stap 5: Testen in Productie

### 5.1 Open Productie App
1. Ga naar je Railway URL: `https://jouw-app.up.railway.app`
2. Dashboard moet laden binnen 3 seconden

### 5.2 Test Discord Login
1. Klik **"Admin Login"**
2. Klik **Discord** knop
3. Authorize bij Discord
4. Je wordt teruggeleid naar productie dashboard
5. ✅ **Success**: Je bent ingelogd in productie!

### 5.3 Verifieer User in Supabase
1. Supabase Dashboard → Authentication → Users
2. Je ziet je user met provider `discord`
3. Check timestamp voor nieuwste login

## Stap 6: Monitoring & Logs

### 6.1 Railway Logs Bekijken
1. Railway service → **"Deployments"** tab
2. Klik op actieve deployment
3. Klik **"View Logs"**
4. Check voor errors:
   - Supabase connection errors
   - Environment variable missing warnings
   - Build errors

### 6.2 Common Issues

#### "Environment variable undefined"
**Symptoms**: Console shows `VITE_SUPABASE_URL: undefined`
**Fix**:
1. Railway Variables tab → verify variabelen bestaan
2. Variabelen moeten prefix hebben: `VITE_`
3. Redeploy na toevoegen

#### "Invalid API key"
**Symptoms**: 401 errors in browser console
**Fix**:
1. Verify `VITE_SUPABASE_ANON_KEY` is correct
2. Check Supabase Dashboard → Settings → API
3. Copy **anon** key (NOT service_role)
4. Update Railway variable
5. Redeploy

#### OAuth redirect naar localhost
**Symptoms**: Na Discord auth, redirect naar `localhost:5173`
**Fix**:
1. Supabase → Authentication → URL Configuration
2. Verify "Site URL" is je Railway URL
3. Add Railway URL to "Redirect URLs"
4. Save en test opnieuw

## Stap 7: Security Checklist

### 7.1 Environment Variables Check
- ✅ `VITE_SUPABASE_URL` - Ingesteld
- ✅ `VITE_SUPABASE_ANON_KEY` - Ingesteld (ANON, niet service_role!)
- ❌ Geen `DATABASE_URL` of andere secrets exposed in frontend

### 7.2 Supabase Security
- ✅ Row Level Security (RLS) enabled op database tables
- ✅ Alleen anon key in frontend (service_role alleen in backend)
- ✅ Redirect URLs whitelist configured

### 7.3 OAuth Providers
- ✅ Client secrets veilig opgeslagen (alleen in provider portal + Supabase)
- ✅ Redirect URLs restricted to Supabase callback
- ✅ No hardcoded secrets in code/git

## ✅ Deployment Compleet!

Je applicatie draait nu in productie met:
- ✅ Multi-provider OAuth (Discord, en optioneel Google/GitHub/Azure)
- ✅ Environment variabelen geconfigureerd
- ✅ Secure authentication flow
- ✅ Auto-deployment via Railway

---

## Quick Reference Commands

### Check Railway Deployment Status
```bash
# Via Railway CLI (optional)
railway status

# Via web
https://railway.app/dashboard → Select project → Deployments
```

### Check Environment Variables
```bash
# Railway dashboard → Variables tab
# Should see:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
```

### Force Redeploy
```bash
# Option 1: Git push triggers auto-deploy
git commit --allow-empty -m "Trigger Railway redeploy"
git push origin main

# Option 2: Railway dashboard → Deployments → Redeploy button
```

### Debug Production
```bash
# Check build logs
Railway Dashboard → Service → Deployments → Latest → View Logs

# Check browser console on production URL
Open DevTools (F12) → Console tab

# Check debug page (if accessible)
https://your-railway-url.up.railway.app/debug
```

---

## Next Steps

1. **Enable Meer Providers** (optioneel):
   - Google: Voor universele toegang
   - GitHub: Voor developers
   - Microsoft: Voor enterprise users
   - Zie `docs/OAUTH_PROVIDERS_SETUP.md`

2. **Custom Domain** (aanbevolen):
   - Railway Settings → Domains → Add custom domain
   - Bijvoorbeeld: `dashboard.teamnlcloud9.nl`
   - Update Supabase Redirect URLs met nieuwe domain

3. **User Management**:
   - Beslis wie mag inloggen (whitelist?)
   - Voeg admin roles toe in Supabase
   - Implementeer user permissions

4. **Analytics** (optioneel):
   - Add Google Analytics
   - Track login providers usage
   - Monitor user engagement
