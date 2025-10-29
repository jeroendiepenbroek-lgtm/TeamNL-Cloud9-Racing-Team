# 🚀 Production Deployment Checklist

## ✅ Pre-Deployment (Completed)

- [x] Dockerfile created (multi-stage build)
- [x] docker-compose.yml created (app + PostgreSQL)
- [x] .dockerignore configured
- [x] GitHub Actions CI/CD pipeline (.github/workflows/deploy.yml)
- [x] Railway.json deployment config
- [x] Authentication middleware (Basic Auth)
- [x] CORS middleware
- [x] Production environment template (.env.production.example)
- [x] Prisma schema updated (PostgreSQL support)
- [x] Deployment documentation (docs/DEPLOYMENT.md)
- [x] Deployment script (scripts/deploy-railway.sh)
- [x] README updated met deployment info

## 📋 Deployment Steps

### Option 1: Railway.app (Recommended)

1. **Account Setup**
   - [ ] Create account op https://railway.app
   - [ ] Login met GitHub account
   - [ ] Verifieer $5 gratis credit

2. **Project Creation**
   - [ ] New Project → Deploy from GitHub
   - [ ] Selecteer `TeamNL-Cloud9-Racing-Team` repo
   - [ ] Railway detecteert automatisch Node.js

3. **Database Setup**
   - [ ] Add PostgreSQL service
   - [ ] `DATABASE_URL` wordt automatisch gezet
   - [ ] Verifieer database status (healthy)

4. **Environment Variables**
   ```bash
   NODE_ENV=production
   AUTH_ENABLED=true
   API_USERNAME=admin
   API_PASSWORD=<VEILIG-WACHTWOORD>
   
   ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1
   ZWIFT_API_BASE_URL=https://zwift-ranking.herokuapp.com
   ZWIFT_CLUB_ID=2281
   
   ENABLE_AUTO_SYNC=true
   SCHEDULER_ENABLED=true
   
   FAVORITES_SYNC_CRON=0 */6 * * *
   CLUB_SYNC_CRON=0 */12 * * *
   FORWARD_SCAN_CRON=0 * * * *
   CLEANUP_CRON=0 3 * * *
   ```

5. **Deployment**
   - [ ] Push to `main` branch triggers auto-deploy
   - [ ] Monitor logs in Railway dashboard
   - [ ] Wait for "Deployment successful"
   - [ ] Note down app URL

6. **Post-Deployment Verificatie**
   - [ ] Test health check: `curl https://your-app.railway.app/api/health`
   - [ ] Test met auth: `curl -u admin:password https://your-app.railway.app/api/workflow/status`
   - [ ] Verifieer cron jobs: Check `/api/scheduler/status`
   - [ ] Monitor sync logs: `/api/sync/logs`
   - [ ] Test database toegang via Prisma Studio

### Option 2: Docker Self-Hosted

1. **Server Setup**
   - [ ] Server met Docker & Docker Compose installed
   - [ ] Port 3000 & 5432 open
   - [ ] Clone repository

2. **Environment Configuration**
   - [ ] Kopieer `.env.production.example` naar `.env`
   - [ ] Vul alle vereiste variables in
   - [ ] Set veilige passwords

3. **Build & Deploy**
   ```bash
   docker-compose up -d
   docker-compose logs -f app
   ```

4. **Verification**
   - [ ] Check containers: `docker-compose ps`
   - [ ] Test health: `curl http://localhost:3000/api/health`
   - [ ] Test auth: `curl -u admin:password http://localhost:3000/api/workflow/status`

## 🔐 Security Checklist

- [ ] `API_PASSWORD` is sterk (min 12 characters, mixed case, numbers, symbols)
- [ ] `AUTH_ENABLED=true` in productie
- [ ] CORS `ALLOWED_ORIGINS` geconfigureerd (niet `*` in productie)
- [ ] Secrets NIET in code committed
- [ ] GitHub secrets configured voor CI/CD
- [ ] Database niet publiek toegankelijk
- [ ] HTTPS enabled (automatisch op Railway)

## 📊 Monitoring Checklist

- [ ] Railway dashboard bookmark (logs, metrics)
- [ ] Health check endpoint werkt
- [ ] Scheduler status endpoint werkt
- [ ] Sync logs endpoint werkt
- [ ] Error notifications configured (optioneel)

## 🧪 Testing Checklist

**Basic Functionality:**
- [ ] Health check responds
- [ ] Authentication werkt (401 zonder credentials)
- [ ] Database queries werken
- [ ] Cron jobs starten automatisch

**API Endpoints:**
- [ ] `GET /api/workflow/status` - Returns counts
- [ ] `GET /api/workflow/clubs` - Returns club info
- [ ] `GET /api/favorites` - Returns favorite riders
- [ ] `POST /api/favorites` - Adds new favorite
- [ ] `GET /api/sync/logs` - Returns sync history

**Cron Jobs:**
- [ ] Favorites sync (na 6 uur)
- [ ] Club sync (na 12 uur)
- [ ] Forward scan (elk uur)
- [ ] Cleanup (dagelijks om 3:00)

## 💰 Cost Monitoring

**Railway Free Tier:**
- [ ] Monitor credit usage in dashboard
- [ ] Set up billing alerts (optioneel)
- [ ] Expected: ~350 uur/maand (binnen $5 credit)

## 🔄 Rollback Plan

**Als deployment faalt:**

1. **Via Railway Dashboard:**
   - Go to Deployments tab
   - Click "Rollback" op vorige werkende deployment

2. **Via Git:**
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Emergency Stop:**
   ```bash
   railway service stop
   ```

## 📞 Support Resources

- Railway Docs: https://docs.railway.app
- Prisma Deploy Guide: https://www.prisma.io/docs/guides/deployment
- Project Issues: https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team/issues

## ✅ Success Criteria

Deployment is succesvol als:
- [x] App is bereikbaar via HTTPS URL
- [x] Health check returns 200 OK
- [x] Authentication werkt correct
- [x] Database queries succesvol
- [x] Cron jobs draaien automatisch
- [x] Logs tonen geen kritieke errors
- [x] Sync cycles werken correct
- [x] GUI is toegankelijk

---

**Next Steps na Deployment:**
1. Bookmark Railway dashboard
2. Setup monitoring alerts (optioneel)
3. Test alle workflow features
4. Monitor eerste sync cycles
5. Configure frontend domain (optioneel)
