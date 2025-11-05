# Railway Environment Variables Setup

## ⚠️ BELANGRIJK: Railway Deployment Crash Fix

**Probleem**: Railway crasht met "supabaseKey is required"  
**Oorzaak**: Environment variables niet ingesteld in Railway dashboard

## 🔧 Oplossing: Stel Environment Variables in

### Stap 1: Ga naar Railway Dashboard

1. Open: https://railway.app/project/[jouw-project-id]
2. Klik op je **service** (backend)
3. Ga naar **Variables** tab
4. Klik op **+ New Variable**

### Stap 2: Voeg deze variables toe

Kopieer je lokale `.env` waardes:

```bash
# Supabase Configuration
SUPABASE_URL=https://[jouw-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ZwiftRacing API
ZWIFT_API_KEY=jouw-zwift-api-key

# Server Configuration (optioneel)
NODE_ENV=production
PORT=3000
```

### Stap 3: Deploy nogmaals

Na het toevoegen van variables:
1. Railway redeploy automatisch
2. Of: Klik **Deploy** button

### Stap 4: Verify

Test na deployment:
```bash
curl https://teamnl-cloud9-racing-team-production.up.railway.app/health
```

Verwacht:
```json
{
  "status": "ok",
  "service": "TeamNL Cloud9 Backend",
  "version": "2.0.0-clean"
}
```

---

## 📋 Quick Copy: Environment Variables

**Vanuit je lokale `.env` file:**

```bash
# In terminal, kopieer deze waardes:
cat backend/.env
```

**Vul 1-voor-1 in Railway Variables:**

| Variable Name | Example Value | Where to find |
|--------------|---------------|---------------|
| `SUPABASE_URL` | `https://xyz.supabase.co` | Supabase dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Supabase dashboard → Settings → API → service_role key (SECRET!) |
| `ZWIFT_API_KEY` | `your-key` | ZwiftRacing.app account |
| `NODE_ENV` | `production` | Hardcode |
| `PORT` | `3000` | Railway sets dit automatisch, kan weg |

---

## 🚨 Security Warning

**NOOIT** commit `.env` files naar Git!  
**ALTIJD** gebruik Railway Variables voor production secrets.

Verify `.gitignore`:
```bash
grep "\.env" .gitignore
# Output: .env
```

---

## ✅ Checklist na setup

- [ ] Alle 3 environment variables toegevoegd in Railway
- [ ] Railway deployment succesvol (green checkmark)
- [ ] Health check werkt: `/health` returns 200 OK
- [ ] React app werkt: `/` returns React HTML
- [ ] No errors in Railway logs

---

## 🔍 Troubleshooting

**"supabaseKey is required" error**:
- Check `SUPABASE_SERVICE_ROLE_KEY` is set in Railway Variables
- Check geen typo in variable name (case-sensitive!)

**"Cannot connect to Supabase" error**:
- Check `SUPABASE_URL` is correct
- Test in browser: https://[jouw-url].supabase.co (moet Supabase page tonen)

**Server crashes immediately**:
- Check Railway logs: Deployments → View Logs
- Zoek naar "Error:", "MODULE_NOT_FOUND", "ENOENT"

---

## 📖 More Info

- [Railway Variables Docs](https://docs.railway.app/develop/variables)
- [Supabase API Keys](https://supabase.com/docs/guides/api#api-url-and-keys)
