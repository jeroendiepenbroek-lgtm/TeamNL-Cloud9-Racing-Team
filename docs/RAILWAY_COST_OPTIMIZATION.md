# Railway Kosten-Optimalisatie Gids

## 💰 Railway Pricing (2025)

### Hobby Plan - $5/maand
- $5 credit inbegrepen
- **Usage-based billing** daarna: ~$0.000463/GB-sec
- Geen resource limits
- Veel beter dan "gratis" alternatieven met sleep mode

### Pro Plan - $20/maand  
- $20 credit inbegrepen
- Teams, priority support
- (Overkill voor jouw use case)

---

## 🎯 Railway Optimaliseren: <$5/maand

### Huidige Resource Usage (Schatting)

**Jouw Backend:**
```
CPU: ~0.1 vCPU (idle), ~0.5 vCPU (tijdens sync)
RAM: ~200MB constant
Disk: ~500MB
Network: ~2GB/maand (API calls naar ZwiftRacing + Supabase)
```

**Kosten Breakdown:**
```
RAM: 0.2GB × 730h/maand × $0.000231/GB-h = $0.034/maand
CPU: 0.1 vCPU × 730h × $0.00002/vCPU-h = $0.0015/maand
Network: 2GB × $0.10/GB = $0.20/maand
────────────────────────────────────────────────
Totaal: ~$0.24/maand

Met $5 credit = 20+ maanden GRATIS! 🎉
```

**Conclusie:** Je backend past makkelijk binnen de $5 Hobby plan credit!

---

## ✅ Waarom Railway Beter Is Dan "Gratis" Alternatieven

### Railway Hobby ($5/maand) vs Render Free
| Feature | Railway | Render Free |
|---------|---------|-------------|
| Sleep mode | ❌ Nee | ⚠️ Ja (15min) |
| RAM | 8GB max | 512MB |
| Cold starts | ❌ | ⚠️ 30+ sec |
| Cron jobs | ✅ Werken | ⚠️ Stoppen bij sleep |
| Build tijd | ~2 min | ~5 min |
| DX | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

**Voor sync jobs die 24/7 moeten draaien: Railway is gewoon beter.**

---

## 🔧 Railway Kosten Minimaliseren

### 1. **Gebruik Lightweight Base Image**
```dockerfile
# ❌ Duur (1.2GB)
FROM node:18

# ✅ Goedkoop (150MB)
FROM node:18-alpine

# of nog kleiner
FROM node:18-alpine AS builder
# ... build steps
FROM node:18-alpine
COPY --from=builder /app/dist ./dist
```

**Besparing:** ~1GB disk = $0.10/maand minder

---

### 2. **Optimize Memory Usage**
```javascript
// In server.ts - beperk heap size
node --max-old-space-size=256 dist/server.js

// Of in package.json:
"start": "node --max-old-space-size=256 dist/server.js"
```

**Besparing:** 256MB vs 512MB = 50% RAM besparing

---

### 3. **Lazy Load Dependencies**
```typescript
// ❌ Laadt alles in memory
import * as everything from 'big-library';

// ✅ Lazy load
const bigLibrary = await import('big-library');
```

---

### 4. **Enable Railway Sleep (Optioneel)**
Als je sync jobs NIET 24/7 hoeven te draaien:

```
Railway Dashboard → Service → Settings → Sleep
- Enable sleep after: 30 minutes inactivity
- Use GitHub Actions voor cron triggers
```

**Besparing:** ~70% kosten (maar sync jobs stoppen!)

**Betere aanpak:** Gebruik external cron (GitHub Actions) + Railway sleep:
```yaml
# .github/workflows/sync-cron.yml
name: Trigger Syncs
on:
  schedule:
    - cron: '0 */6 * * *' # RIDER_SYNC
    - cron: '5,20,35,50 * * * *' # NEAR_EVENT_SYNC
    - cron: '30 */2 * * *' # FAR_EVENT_SYNC
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST https://teamnl-cloud9-backend.up.railway.app/api/sync/rider
          curl -X POST https://teamnl-cloud9-backend.up.railway.app/api/sync/events/near
          curl -X POST https://teamnl-cloud9-backend.up.railway.app/api/sync/events/far
```

---

### 5. **Monitoring & Alerts**
```bash
# Check Railway usage
railway status --json

# Set budget alert in Railway dashboard
Settings → Usage → Budget Alert: $4.50
```

---

## 📊 Cost Projection (3 Scenarios)

### Scenario A: 24/7 Active (Aanbevolen voor sync jobs)
```
RAM: 200MB × 730h = $0.034/maand
CPU: 0.1 vCPU × 730h = $0.0015/maand
Network: 2GB = $0.20/maand
──────────────────────────────
Totaal: ~$0.24/maand
Binnen $5 credit: ✅ 20+ maanden gratis
```

### Scenario B: Hybrid (Sleep + GitHub Actions Cron)
```
Active: 50h/maand (alleen tijdens syncs)
RAM: 200MB × 50h = $0.0023/maand
CPU: 0.5 vCPU × 50h = $0.0005/maand
Network: 2GB = $0.20/maand
──────────────────────────────
Totaal: ~$0.20/maand
Binnen $5 credit: ✅ 25+ maanden gratis
```

### Scenario C: Heavy Usage (worst case)
```
RAM: 512MB × 730h = $0.086/maand
CPU: 0.5 vCPU × 730h = $0.0073/maand
Network: 10GB = $1.00/maand
──────────────────────────────
Totaal: ~$1.10/maand
Binnen $5 credit: ✅ 4+ maanden gratis
```

**TL;DR: Je blijft makkelijk binnen $5/maand!**

---

## 🚀 Optimized Railway Setup

### 1. Update Dockerfile (Alpine Base)
```dockerfile
# Multi-stage build voor kleinere image
FROM node:18-alpine AS builder
WORKDIR /app

# Backend deps
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --production=false

# Build backend
COPY backend ./backend
RUN cd backend && npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

# Copy production deps only
COPY --from=builder /app/backend/package*.json ./
RUN npm ci --production --ignore-scripts

# Copy built files
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/public ./public

# Optimize Node.js memory
ENV NODE_OPTIONS="--max-old-space-size=256"

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Besparing:** Image size: 1.2GB → 200MB = 83% kleiner!

---

### 2. Railway Service Settings
```
Railway Dashboard → Service → Settings:

Resources:
- vCPU: 0.5 (genoeg voor sync jobs)
- Memory: 512MB (meer dan genoeg)

Healthcheck:
- Path: /api/health
- Timeout: 5s
- Interval: 30s

Auto Deploy: ✅ On
Region: EU West (Frankfurt) - dichter bij NL
```

---

### 3. Environment Variables Optimization
```bash
# Railway secrets (encrypted, geen extra kosten)
railway variables set \
  NODE_ENV=production \
  NODE_OPTIONS="--max-old-space-size=256" \
  SUPABASE_URL="..." \
  SUPABASE_ANON_KEY="..." \
  SUPABASE_SERVICE_ROLE_KEY="..." \
  DISCORD_CLIENT_ID="..." \
  DISCORD_CLIENT_SECRET="..."
```

---

## 💡 Hybrid Strategie (Best of Both Worlds)

### Gebruik Railway + GitHub Actions

**Railway:** API endpoints (sleep na 15min)
**GitHub Actions:** Cron triggers (gratis 2000 min/maand)

```yaml
# .github/workflows/smart-sync.yml
name: Smart Sync Scheduler
on:
  schedule:
    # RIDER_SYNC: elke 6 uur
    - cron: '0 */6 * * *'
    # NEAR_EVENT_SYNC: 4x per uur
    - cron: '5,20,35,50 * * * *'
    # FAR_EVENT_SYNC: elke 2 uur
    - cron: '30 */2 * * *'
  workflow_dispatch: # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Wake & Sync Riders
        if: github.event.schedule == '0 */6 * * *'
        run: |
          curl -f -X POST ${{ secrets.RAILWAY_URL }}/api/sync/rider \
            -H "Content-Type: application/json"
      
      - name: Wake & Sync Near Events
        if: contains(github.event.schedule, '5,20,35,50')
        run: |
          curl -f -X POST ${{ secrets.RAILWAY_URL }}/api/sync/events/near
      
      - name: Wake & Sync Far Events
        if: github.event.schedule == '30 */2 * * *'
        run: |
          curl -f -X POST ${{ secrets.RAILWAY_URL }}/api/sync/events/far \
            -H "Content-Type: application/json" \
            -d '{"lookforwardHours": 48}'
```

**Voordelen:**
- ✅ Railway alleen actief tijdens syncs (~50h/maand)
- ✅ GitHub Actions cron: gratis
- ✅ Kosten: ~$0.20/maand (10% van $5 credit!)
- ✅ 25+ maanden gratis

---

## 📈 Monitoring Dashboard

### Railway CLI
```bash
# Install
npm install -g @railway/cli

# Login
railway login

# Check usage
railway status

# View logs
railway logs

# Check spend
railway usage
```

### Set Alerts
```
Railway Dashboard → Account → Billing
- Budget Alert: $4.50 (90% van $5)
- Email notify: ✅
```

---

## 🎯 Aanbeveling

### Optie 1: Pure Railway (Simpelst)
```
Kosten: ~$0.24/maand
24/7 actief, cron in server.ts werkt
Blijf binnen $5 credit: 20+ maanden
```

**Beste voor:** Gewoon laten draaien, zero maintenance

---

### Optie 2: Hybrid (Goedkoopst)
```
Kosten: ~$0.20/maand
Railway sleep + GitHub Actions cron
Blijf binnen $5 credit: 25+ maanden
```

**Beste voor:** Maximale besparing, beetje extra setup

---

### Optie 3: Alpine Dockerfile (Best Balance)
```
Kosten: ~$0.20/maand (kleinere image)
24/7 actief, snellere deploys
Blijf binnen $5 credit: 25+ maanden
```

**Beste voor:** Performance + kosten optimaal

---

## 🔐 Kostenbewustzijn Checklist

- [ ] Railway Hobby plan ($5/maand)
- [ ] Alpine Dockerfile (kleinere image)
- [ ] Memory limit: 256-512MB
- [ ] Budget alert: $4.50
- [ ] Monitor usage maandelijks
- [ ] Overweeg hybrid met GitHub Actions

---

## 🎉 Conclusie

**Railway @ $5/maand is goedkoper dan je denkt:**
- Jouw backend: ~$0.20-0.30/maand
- $5 credit = **16-25 maanden gratis**
- Betere DX dan "gratis" alternatieven
- Geen sleep mode problemen

**Mijn advies:** Blijf bij Railway, optimize Dockerfile, monitor usage.

Je krijgt:
- ✅ 24/7 uptime
- ✅ Snelle deploys
- ✅ Geen cold starts
- ✅ Working cron jobs
- ✅ ~2 jaar binnen $5 credit

**ROI:** $5 investment voor 2 jaar peace of mind = $0.21/maand effectief. Geen brainer! 🚀
