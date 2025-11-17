# Zero-Cost Deployment Guide

## 🎯 Deployment Opties (100% Gratis)

### ✅ Optie 1: Render.com (AANBEVOLEN - Simpelst)

**Free Tier:**
- 750 uur/maand (= 1 service 24/7)
- 512MB RAM
- Auto SSL + custom domains
- Sleep na 15min inactiviteit (cold start: ~30sec)

**Deploy in 3 Stappen:**

1. **Ga naar [render.com](https://render.com)**
   - Sign up met GitHub account

2. **New Web Service**
   - Connect jouw repository: `TeamNL-Cloud9-Racing-Team`
   - Root directory: `backend`
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **Environment Variables**
   Voeg toe in Render dashboard:
   ```
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=https://[jouw-project].supabase.co
   SUPABASE_ANON_KEY=[jouw-anon-key]
   SUPABASE_SERVICE_ROLE_KEY=[jouw-service-role-key]
   DISCORD_CLIENT_ID=[jouw-discord-client-id]
   DISCORD_CLIENT_SECRET=[jouw-discord-secret]
   ```

4. **Deploy!** 🚀
   - Auto-deploy bij elke push naar `main`
   - URL: `https://teamnl-cloud9-backend.onrender.com`

---

### ✅ Optie 2: Fly.io (Beter Performance, Geen Sleep Mode)

**Free Tier:**
- 3 VMs (256MB RAM elk)
- 3GB storage
- 160GB bandwidth/maand
- **Geen cold starts** (altijd actief!)

**Deploy:**

```bash
# 1. Install flyctl
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Launch (auto-detect Dockerfile)
cd /workspaces/TeamNL-Cloud9-Racing-Team
fly launch --name teamnl-cloud9-backend --region ams

# 4. Set secrets
fly secrets set \
  SUPABASE_URL="https://[jouw-project].supabase.co" \
  SUPABASE_ANON_KEY="[key]" \
  SUPABASE_SERVICE_ROLE_KEY="[key]" \
  DISCORD_CLIENT_ID="[id]" \
  DISCORD_CLIENT_SECRET="[secret]"

# 5. Deploy!
fly deploy

# URL: https://teamnl-cloud9-backend.fly.dev
```

**Voordelen vs Render:**
- ✅ Geen sleep mode (24/7 actief)
- ✅ Betere performance
- ✅ EU region (Amsterdam beschikbaar!)
- ✅ Dockerfile support (jouw setup werkt direct)

---

### ✅ Optie 3: Oracle Cloud Always Free (ULTIEME FREE TIER)

**Free Forever:**
- 2 VMs (1GB RAM elk) - **NOOIT BETALEN**
- Arm Ampere VMs (4 cores + 24GB RAM!) - ook gratis
- 200GB storage
- 10TB bandwidth/maand

**Setup (meer werk):**

```bash
# 1. Create Oracle Cloud account
# 2. Launch VM instance (Ubuntu)
# 3. SSH in

# Install Docker
sudo apt update && sudo apt install docker.io docker-compose -y

# Clone repo
git clone https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team.git
cd TeamNL-Cloud9-Racing-Team

# Create .env
nano .env
# (voeg env vars toe)

# Build & run
docker-compose up -d

# Setup nginx reverse proxy + SSL (certbot)
sudo apt install nginx certbot python3-certbot-nginx -y
sudo nano /etc/nginx/sites-available/teamnl
# (configureer proxy naar localhost:3000)

sudo certbot --nginx -d jouw-domein.nl
```

**Voordelen:**
- ✅ Beste specs (4 cores + 24GB RAM gratis!)
- ✅ Geen sleep mode
- ✅ Voor altijd gratis (Always Free tier)

**Nadelen:**
- ⚠️ Meer DevOps werk (nginx, SSL, updates zelf doen)
- ⚠️ Geen automatic deploys (moet handmatig pullen)

---

## 🏆 Mijn Aanbeveling

### Voor Jouw Situatie: **Fly.io**

**Waarom:**
1. ✅ Geen cold starts (altijd beschikbaar voor sync jobs)
2. ✅ Amsterdam region (lage latency)
3. ✅ Jouw Dockerfile werkt direct
4. ✅ Simpele CLI deployment
5. ✅ Gratis 3 VMs (genoeg voor redundancy)

**Trade-offs:**
| Platform | Sleep Mode | Setup | Performance | DevOps |
|----------|-----------|-------|-------------|---------|
| **Render** | ⚠️ Ja (15min) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Fly.io** | ✅ Nee | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Oracle** | ✅ Nee | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |

---

## 🚀 Quick Start: Fly.io Deployment

```bash
# 1. Install flyctl
curl -L https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"

# 2. Login
fly auth login

# 3. Navigate to project
cd /workspaces/TeamNL-Cloud9-Racing-Team

# 4. Launch
fly launch \
  --name teamnl-cloud9-backend \
  --region ams \
  --no-deploy

# 5. Set secrets
fly secrets set \
  NODE_ENV=production \
  SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
  SUPABASE_ANON_KEY="YOUR_ANON_KEY" \
  SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_KEY" \
  DISCORD_CLIENT_ID="YOUR_DISCORD_ID" \
  DISCORD_CLIENT_SECRET="YOUR_DISCORD_SECRET"

# 6. Deploy!
fly deploy

# 7. Open in browser
fly open

# 8. Check logs
fly logs
```

**URL:** `https://teamnl-cloud9-backend.fly.dev`

---

## 📊 Cost Vergelijking

| Platform | Maandelijkse Kosten | Sleep Mode | VM Specs | Max Uptime |
|----------|-------------------|------------|----------|------------|
| **Railway** | $5-20/maand | Nee | 512MB-8GB | 100% |
| **Render Free** | $0 | ⚠️ 15min | 512MB | 750h/maand |
| **Fly.io Free** | $0 | Nee | 256MB x3 | 100% |
| **Oracle Free** | $0 | Nee | 1GB x2 OF 24GB x1 | 100% |

---

## 🔧 Migration van Railway → Fly.io

```bash
# 1. Export Railway env vars
railway variables --json > railway-vars.json

# 2. Deploy naar Fly
fly launch --dockerfile Dockerfile

# 3. Import secrets
cat railway-vars.json | jq -r 'to_entries[] | "\(.key)=\(.value)"' | \
  while read line; do fly secrets set "$line"; done

# 4. Update DNS (als je custom domain hebt)
# A record: @ → fly.io IP (zie fly ips list)

# 5. Verify
curl https://teamnl-cloud9-backend.fly.dev/api/health

# 6. Delete Railway project (stop billing)
```

---

## ⚠️ Belangrijke Notes

### Render.com Sleep Mode
**Probleem:** Na 15min inactiviteit gaat service slapen.
**Impact:** Cron jobs lopen niet als service slaapt!

**Oplossingen:**
1. **External cron** (GitHub Actions):
   ```yaml
   # .github/workflows/keepalive.yml
   name: Keep Render Awake
   on:
     schedule:
       - cron: '*/10 * * * *' # Elke 10 min
   jobs:
     ping:
       runs-on: ubuntu-latest
       steps:
         - run: curl https://teamnl-cloud9-backend.onrender.com/api/health
   ```

2. **Gebruik Fly.io** (geen sleep mode)

### Fly.io Bandwidth
**Limiet:** 160GB/maand op free tier

**Check usage:**
```bash
fly status
fly logs --app teamnl-cloud9-backend
```

### Oracle Cloud
**Setup SSL met Let's Encrypt:**
```bash
# Na nginx setup
sudo certbot --nginx -d jouw-domein.nl
sudo certbot renew --dry-run # Test auto-renewal
```

---

## 🎉 Conclusie

**Beste 100% gratis oplossing voor jouw sync jobs: Fly.io**

Deploy NU:
```bash
curl -L https://fly.io/install.sh | sh
cd /workspaces/TeamNL-Cloud9-Racing-Team
fly launch --name teamnl-cloud9-backend --region ams
```

Klaar in 5 minuten! 🚀
