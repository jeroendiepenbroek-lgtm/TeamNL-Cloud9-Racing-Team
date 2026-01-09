# 🚂 Railway Automatische Deployment Guide

Complete handleiding voor het opzetten van automatische deployment naar Railway via GitHub Actions.

---

## 📋 Overzicht

Dit project gebruikt:
- **Railway** voor hosting (Docker-based deployment)
- **GitHub Actions** voor automatische CI/CD
- **Dockerfile** voor consistente builds
- **Health checks** voor deployment verificatie

---

## 🚀 Quick Start (15 minuten)

### Stap 1: Railway Project Setup

1. Ga naar [Railway](https://railway.app) en log in
2. Klik op **"New Project"**
3. Selecteer **"Deploy from GitHub repo"**
4. Kies deze repository: `TeamNL-Cloud9-Racing-Team`
5. Railway detecteert automatisch de Dockerfile

### Stap 2: Environment Variables Configureren

In Railway dashboard → Variables tab, voeg toe:

```bash
NODE_ENV=production
PORT=8080
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
SUPABASE_SERVICE_KEY=<jouw-service-role-key>
SUPABASE_ANON_KEY=<jouw-anon-key>
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=<jouw-anon-key>
```

**Optioneel** (voor data sync):
```bash
ZWIFT_USERNAME=<jouw-zwift-email>
ZWIFT_PASSWORD=<jouw-zwift-wachtwoord>
ZWIFTRACING_API_KEY=<jouw-api-key>
```

### Stap 3: Railway Token Genereren

1. Railway Dashboard → Account Settings → Tokens
2. Klik **"Create Token"**
3. Naam: `GitHub Actions Deploy`
4. Kopieer de token (bewaar veilig!)

### Stap 4: GitHub Secrets Configureren

1. GitHub repo → Settings → Secrets and variables → Actions
2. Klik **"New repository secret"**
3. Voeg toe:
   - **RAILWAY_TOKEN**: (de token uit stap 3)
   - **RAILWAY_APP_URL**: `https://jouw-app.up.railway.app` (vind in Railway dashboard)

### Stap 5: Activeer Automatische Deployment

De GitHub Actions workflow (`.github/workflows/deploy.yml`) is nu actief!

**Test de deployment:**
```bash
git add .
git commit -m "Setup Railway deployment"
git push origin main
```

✅ GitHub Actions zal automatisch:
1. De code testen (type checking)
2. Deployment naar Railway starten
3. Health check uitvoeren
4. Status rapporteren

---

## 🔄 Deployment Workflow

### Automatische Triggers

De deployment start automatisch bij:

1. **Push naar `main` branch**
   ```bash
   git push origin main
   ```

2. **Push naar `fresh-start-v4` branch**
   ```bash
   git push origin fresh-start-v4
   ```

3. **Handmatige trigger**
   - GitHub → Actions tab → "Deploy to Railway" → Run workflow

### Deployment Stappen

```
📥 Code checkout
    ↓
🔧 Node.js setup
    ↓
🏗️ Docker build (via Railway)
    ↓
🚀 Deploy naar Railway
    ↓
⏳ Wacht 30s voor startup
    ↓
🏥 Health check (/health endpoint)
    ↓
✅ Deployment success!
```

### Bij Failure

Als deployment faalt:
1. GitHub Actions toont error logs
2. Automatische rollback naar vorige versie
3. Notificatie via GitHub

---

## 🛠️ Railway CLI (Lokaal Gebruik)

### Installatie

```bash
npm install -g @railway/cli
```

### Login

```bash
railway login
```

### Link Project

```bash
railway link
```

### Handmatige Deploy

```bash
railway up
```

### Logs Bekijken

```bash
railway logs
```

### Environment Variables Beheren

```bash
# Bekijk variabelen
railway variables

# Bekijk in key=value formaat
railway variables --kv

# Voeg variabele toe
railway variables --set "KEY=value"

# Voeg meerdere variabelen tegelijk toe
railway variables --set "KEY1=value1" --set "KEY2=value2"
```

### Open App in Browser

```bash
railway open
```

---

## 📊 Monitoring & Troubleshooting

### Health Check Endpoint

De app heeft een health check endpoint:
```
GET https://jouw-app.up.railway.app/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-09T12:00:00Z"
}
```

### Logs Bekijken

**In Railway Dashboard:**
1. Ga naar je project
2. Klik op de service
3. Bekijk "Deployments" tab voor logs

**Via CLI:**
```bash
railway logs --follow
```

### Common Issues

#### ❌ Build Failed

**Symptoom:** Docker build faalt
**Oplossing:**
```bash
# Test build lokaal
docker build -t test-build .

# Check Dockerfile syntax
docker build --no-cache -t test-build .
```

#### ❌ Health Check Failed

**Symptoom:** Deployment succesvol maar health check faalt
**Oorzaken:**
- Backend start niet correct
- Port mapping incorrect
- Environment variables missen

**Debug:**
```bash
railway logs
# Check voor error messages
```

#### ❌ Railway Token Invalid

**Symptoom:** GitHub Actions geeft authentication error
**Oplossing:**
1. Genereer nieuwe token in Railway
2. Update GitHub Secret `RAILWAY_TOKEN`

---

## 🔐 Security Best Practices

### Secrets Management

✅ **DOE:**
- Gebruik Railway Variables voor secrets
- Gebruik GitHub Secrets voor CI/CD tokens
- Rotate tokens periodiek (om de 3 maanden)

❌ **NIET DOEN:**
- Commit secrets naar git
- Deel tokens in chat/email
- Gebruik dezelfde secrets voor dev/prod

### Environment Variables

Railway Variables zijn encrypted at rest en in transit.

**Gevoelige data:**
- `SUPABASE_SERVICE_KEY` → Railway alleen
- `RAILWAY_TOKEN` → GitHub Secrets alleen
- `ZWIFT_PASSWORD` → Railway alleen

---

## 🎯 Advanced Features

### Custom Domain

1. Railway Dashboard → Settings → Domains
2. Klik "Add Domain"
3. Voer domein in (bijv. `teamnl.cloud9racing.com`)
4. Update DNS records:
   ```
   CNAME @ <your-railway-subdomain>.up.railway.app
   ```

### Scheduled Deployments

Voeg toe aan `.github/workflows/deploy.yml`:
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

### Multiple Environments

Maak aparte Railway projects voor:
- **Production** (main branch)
- **Staging** (develop branch)
- **Preview** (PR branches)

---

## 📈 Performance Optimization

### Railway Resources

Railway schaalt automatisch, maar je kunt limieten instellen:

1. Dashboard → Settings → Resources
2. Pas aan:
   - **Memory**: 512MB - 8GB
   - **CPU**: 1 - 8 vCPUs
   - **Replicas**: 1 - 10 instances

### Health Check Tuning

In `railway.toml`:
```toml
[[deploy.healthcheck]]
path = "/health"
interval = 30      # Check elke 30s
timeout = 10       # 10s timeout
```

### Build Caching

Docker layers worden automatisch gecached door Railway.

**Optimaliseer cache:**
```dockerfile
# Copy package files eerst (cached als ongewijzigd)
COPY frontend/package*.json ./
RUN npm ci

# Dan source code
COPY frontend/ ./
RUN npm run build
```

---

## 🔄 Rollback Strategy

### Automatische Rollback

Bij deployment failure rolt Railway automatisch terug naar laatste werkende versie.

### Handmatige Rollback

**Via Dashboard:**
1. Deployments tab
2. Selecteer vorige deployment
3. Klik "Rollback to this version"

**Via CLI:**
```bash
railway rollback
```

---

## 📝 Checklist voor Productie

- [ ] Environment variables geconfigureerd
- [ ] GitHub Secrets toegevoegd (RAILWAY_TOKEN, RAILWAY_APP_URL)
- [ ] Health check werkt (test: `curl <app-url>/health`)
- [ ] Logs monitoring opgezet
- [ ] Custom domain geconfigureerd (optioneel)
- [ ] SSL certificaat actief (automatisch via Railway)
- [ ] Backup strategie voor database
- [ ] Error tracking (bijv. Sentry) geïntegreerd (optioneel)

---

## 🆘 Support

### Railway Support

- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

### GitHub Actions

- Docs: https://docs.github.com/actions
- Community: https://github.community

---

## 📚 Nuttige Links

- [Railway Dashboard](https://railway.app/dashboard)
- [GitHub Actions Runs](https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team/actions)
- [Supabase Dashboard](https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc)
- [Live App](https://teamnl-cloud9-racing-team-production.up.railway.app/)

---

**Last Updated:** 9 januari 2026
**Version:** 1.0
