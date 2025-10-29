# 🏗️ Development & Production Workflow

## Omgevingen Strategie

### **3-Tier Setup (Aanbevolen)**

```
┌─────────────────────────────────────────────────────┐
│  LOCAL DEVELOPMENT (jouw laptop)                    │
│  - SQLite database                                  │
│  - Hot reload (nodemon)                             │
│  - Debug logging                                    │
│  - Mock data                                        │
│  Branch: feature/* branches                         │
└─────────────────────────────────────────────────────┘
                    ↓ (git push)
┌─────────────────────────────────────────────────────┐
│  STAGING (Railway - dev environment)                │
│  - PostgreSQL database                              │
│  - Auto-deploy from 'develop' branch               │
│  - Test nieuwe features                             │
│  - Same config as production                        │
│  URL: https://teamnl-staging.railway.app           │
└─────────────────────────────────────────────────────┘
                    ↓ (merge to main)
┌─────────────────────────────────────────────────────┐
│  PRODUCTION (Railway - prod environment)            │
│  - PostgreSQL database (persistent)                 │
│  - Auto-deploy from 'main' branch                  │
│  - Real data, live syncs                            │
│  - Monitoring & alerts                              │
│  URL: https://teamnl-cloud9.railway.app            │
└─────────────────────────────────────────────────────┘
```

---

## 🌳 Branch Strategy (Git Flow Simplified)

### Branches

```
main (protected)          → Production deployment
  ↑
develop                   → Staging deployment
  ↑
feature/nieuwe-feature    → Local development
```

### Workflow

1. **Nieuwe feature starten:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/mijn-nieuwe-feature
   ```

2. **Lokaal ontwikkelen:**
   ```bash
   npm run dev              # Local met SQLite
   # Code, test, commit
   git commit -m "feat: add nieuwe feature"
   ```

3. **Naar staging pushen:**
   ```bash
   git push origin feature/mijn-nieuwe-feature
   # Maak Pull Request naar 'develop'
   # Review → Merge → Auto-deploy naar staging
   ```

4. **Testen op staging:**
   ```bash
   curl https://teamnl-staging.railway.app/api/health
   # Test alle functionaliteit
   ```

5. **Naar productie:**
   ```bash
   # Als staging OK:
   # PR van develop → main
   # Review → Merge → Auto-deploy naar productie
   ```

---

## 🚀 Railway Omgevingen Setup

### 1. Production Environment (al klaar)

**Branch:** `main`
**Database:** PostgreSQL (production data)
**URL:** `https://teamnl-cloud9.railway.app`

**Environment Variables:**
```bash
NODE_ENV=production
AUTH_ENABLED=true
ENABLE_AUTO_SYNC=true
SCHEDULER_ENABLED=true
```

### 2. Staging Environment (nieuw)

**Branch:** `develop`
**Database:** PostgreSQL (test data)
**URL:** `https://teamnl-staging.railway.app`

**Environment Variables:**
```bash
NODE_ENV=staging
AUTH_ENABLED=false              # Geen auth voor sneller testen
ENABLE_AUTO_SYNC=false          # Geen auto-syncs (handmatig)
SCHEDULER_ENABLED=false         # Cron jobs uit
LOG_LEVEL=debug                 # Verbose logging
```

### 3. Local Development

**Branch:** `feature/*`
**Database:** SQLite (lokaal bestand)
**URL:** `http://localhost:3000`

**Environment Variables (.env.local):**
```bash
NODE_ENV=development
DATABASE_URL="file:./dev.db"
AUTH_ENABLED=false
ENABLE_AUTO_SYNC=false
```

---

## 📁 Environment Files Strategie

```
.env                    # ❌ NIET in git (lokale overrides)
.env.local              # ❌ NIET in git (jouw lokale config)
.env.development        # ✅ IN git (development defaults)
.env.staging            # ✅ IN git (staging defaults)
.env.production.example # ✅ IN git (production template)
```

---

## 🔄 CI/CD Pipeline per Environment

### Development (lokaal)
```yaml
# Geen CI/CD
# Alleen lokaal draaien met hot reload
npm run dev
```

### Staging (develop branch)
```yaml
# .github/workflows/deploy-staging.yml
on:
  push:
    branches: [develop]

jobs:
  deploy-staging:
    - Build & test
    - Deploy naar Railway staging environment
    - Run integration tests
    - Notify op Slack/Discord
```

### Production (main branch)
```yaml
# .github/workflows/deploy-production.yml
on:
  push:
    branches: [main]

jobs:
  deploy-production:
    - Build & test
    - Run security scan
    - Deploy naar Railway production
    - Run smoke tests
    - Notify team
```

---

## 🧪 Testing Strategy per Environment

### Local
- Unit tests
- Snelle iteratie
- Mock data

### Staging
- Integration tests
- E2E tests
- Load testing (klein)
- Feature acceptance

### Production
- Smoke tests (na deploy)
- Health checks
- Monitoring
- Real user data

---

## 💾 Database Strategy

### Development (SQLite)
```bash
# Makkelijk resetten
rm prisma/dev.db
npm run db:migrate
npm run db:seed    # Mock data
```

### Staging (PostgreSQL)
```bash
# Periodiek resetten met production backup
railway db:dump production > backup.sql
railway db:restore staging backup.sql
# Of verse seed data
```

### Production (PostgreSQL)
```bash
# NOOIT direct resetten!
# Alleen via migrations
npx prisma migrate deploy
```

---

## 🔐 Secrets Management

### Local (.env.local)
```bash
API_USERNAME=admin
API_PASSWORD=local123
ZWIFT_API_KEY=jouw-key
```

### Staging (Railway Variables)
```bash
API_USERNAME=staging-admin
API_PASSWORD=staging-test-pass
# Separate API keys (rate limits)
```

### Production (Railway Variables)
```bash
API_USERNAME=admin
API_PASSWORD=super-secure-production-pass
# Production API keys
```

---

## 📊 Kosten per Environment

| Environment | Railway Cost | Database | Total |
|-------------|-------------|----------|-------|
| **Local** | $0 | SQLite (gratis) | **$0** |
| **Staging** | $0 (binnen $5 credit) | PostgreSQL | **$0** |
| **Production** | $0 (binnen $5 credit) | PostgreSQL | **$0** |
| **Total** | | | **$0** ✅ |

**$5 credit verdeling:**
- Staging: ~100 uur/maand (~$1)
- Production: ~350 uur/maand (~$4)
- **Total: binnen $5 limiet!** ✅

---

## 🚀 Deployment Commands

### Push naar Staging
```bash
git checkout develop
git merge feature/mijn-feature
git push origin develop
# → Auto-deploy naar staging
```

### Push naar Production
```bash
git checkout main
git merge develop
git push origin main
# → Auto-deploy naar production
```

### Rollback (als iets fout gaat)
```bash
# Via Railway dashboard:
# Deployments → Select previous version → Rollback

# Of via git:
git revert HEAD
git push origin main
```

---

## 🔍 Monitoring & Debugging

### Local
```bash
npm run dev
# Logs in terminal
# VS Code debugger
```

### Staging
```bash
railway logs --environment staging
railway open --environment staging
```

### Production
```bash
railway logs --environment production
railway open --environment production

# Health checks
curl https://teamnl-cloud9.railway.app/api/health
```

---

## 📋 Feature Development Checklist

- [ ] 1. Create feature branch van `develop`
- [ ] 2. Develop & test lokaal (SQLite)
- [ ] 3. Push naar GitHub → PR naar `develop`
- [ ] 4. Code review
- [ ] 5. Merge → Auto-deploy naar **staging**
- [ ] 6. Test op staging environment
- [ ] 7. Als OK: PR van `develop` → `main`
- [ ] 8. Final review
- [ ] 9. Merge → Auto-deploy naar **production**
- [ ] 10. Monitor production logs
- [ ] 11. Verify features werken
- [ ] 12. Done! 🎉

---

## 🎯 Best Practices

### ✅ DO's
- Altijd via feature branches werken
- Test lokaal voor pushen naar staging
- Gebruik staging voor acceptance testing
- Production alleen via develop branch
- Keep develop stabiel
- Kleine, frequente releases

### ❌ DON'Ts
- Nooit direct committen op main
- Nooit productie database handmatig editen
- Geen experimenten op staging (maak feature branch)
- Geen debug logging in production
- Geen test data in production

---

## 🆘 Troubleshooting

### Feature breekt staging
```bash
git checkout develop
git revert <commit-hash>
git push origin develop
# → Staging is weer OK
```

### Urgent hotfix voor production
```bash
git checkout main
git checkout -b hotfix/critical-bug
# Fix bug
git commit -m "fix: critical bug"
git push origin hotfix/critical-bug
# PR direct naar main (skip develop)
```

### Database migrations issues
```bash
# Development: reset makkelijk
rm prisma/dev.db && npm run db:migrate

# Staging: reset met backup
railway db:reset staging

# Production: ALLEEN forward migrations!
# Nooit backward/reset in prod
```

---

## 📚 Next Steps

1. ✅ Setup develop branch
2. ✅ Configure Railway staging environment
3. ✅ Update GitHub Actions workflows
4. ✅ Add branch protection rules
5. ✅ Document voor team
6. ✅ Train team op workflow

Wil je dat ik dit nu setup? Ik kan:
- `develop` branch aanmaken
- Railway staging environment configureren
- GitHub Actions workflows updaten
- Branch protection rules instellen
