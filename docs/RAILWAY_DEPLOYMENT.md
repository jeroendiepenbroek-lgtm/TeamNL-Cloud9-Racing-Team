# Railway Deployment Guide - Backend API

## 1. Prerequisites
- GitHub repository
- Supabase project setup
- Backend `.env` configured

## 2. Deploy naar Railway

### Via Railway Dashboard
1. Ga naar https://railway.app/new
2. Klik **"Deploy from GitHub repo"**
3. Authorize Railway GitHub app
4. Selecteer `jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team`

### Configure Service
1. **Root Directory**: Leave empty (Railway auto-detects)
2. **Build Command**: Automatic (detects `package.json`)
3. **Start Command**: `npm start` (from package.json)
4. **Watch Paths**: `/src/**`, `/package.json`

## 3. Environment Variables

In Railway Dashboard → **Variables** tab, voeg toe:

```bash
# Node Environment
NODE_ENV=production

# Server
PORT=3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...your-service-role-key
SUPABASE_ANON_KEY=eyJhbGc...your-anon-key

# Zwift API
ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1
ZWIFT_API_BASE_URL=https://zwift-ranking.herokuapp.com
ZWIFT_CLUB_ID=2281

# Authentication (Enable in production!)
AUTH_ENABLED=true
API_USERNAME=admin
API_PASSWORD=your-secure-password-here

# Scheduler
ENABLE_AUTO_SYNC=true
SCHEDULER_ENABLED=true

# Cron Jobs
FAVORITES_SYNC_CRON=0 */6 * * *
CLUB_SYNC_CRON=0 */12 * * *
RIDER_EVENTS_SCAN_CRON=0 * * * *

# Logging
LOG_LEVEL=info

# CORS (Add Vercel URL)
ALLOWED_ORIGINS=https://your-project.vercel.app
```

## 4. Custom Domain (Optional)

Railway provides free subdomain: `your-service.railway.app`

Voor custom domain:
1. **Settings** → **Networking** → **Custom Domain**
2. Add: `api.zwiftcloud9.com`
3. Update DNS:
   ```
   Type: CNAME
   Name: api
   Value: your-service.railway.app
   ```

## 5. Health Check Endpoint

Railway automatically monitors `/health` endpoint.

Verify in `src/server.ts`:
```typescript
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

## 6. Cron Jobs Setup

Railway ondersteunt cron jobs via Node.js `node-cron`:

```typescript
// src/server.ts
import cron from 'node-cron';

// Hourly rider sync
cron.schedule('0 * * * *', async () => {
  logger.info('🔄 Running hourly rider sync...');
  await unifiedSyncService.syncClub(2281);
});
```

**Railway keeps server running 24/7** (geen cold starts!)

## 7. Deployment Process

Railway auto-deploys on:
- ✅ Push to `main` branch
- ✅ Merge PR
- ⏱️ Build time: ~2-3 minuten

### Manual Deploy
Via Railway CLI:
```bash
npm i -g @railway/cli
railway login
railway link
railway up
```

## 8. Monitoring

### Railway Dashboard
- **Deployments**: Build logs, deploy status
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs (gebruik `logger.info()`)

### View Logs
```bash
railway logs
# Of in dashboard: Observability tab
```

### Metrics
Railway shows:
- Request rate (req/min)
- Response time (p50, p95, p99)
- Error rate
- Memory/CPU usage

## 9. Scaling (Free Tier)

Railway Free tier:
- **$5 free credit/month**
- **500 hours runtime** (~20 days uptime)
- **100 GB bandwidth**
- **1 GB RAM**
- **1 vCPU shared**

**Genoeg voor:**
- 1M+ API requests/month
- 24/7 uptime (eerste ~20 dagen)
- Cron jobs elke uur

**Upgrade ($5/month):**
- Unlimited uptime
- 8 GB RAM
- Priority support

## 10. Troubleshooting

### Build Fails: "Cannot find module"
**Fix**: Check `package.json` dependencies complete:
```bash
npm install --save @supabase/supabase-js
git add package.json package-lock.json
git commit -m "Add Supabase dependency"
git push
```

### Server Crashes: "ECONNREFUSED Supabase"
**Fix**: Check `SUPABASE_URL` environment variable correct.

### Cron Jobs Not Running
**Fix**: Check logs voor errors:
```bash
railway logs --tail
```

### Rate Limit Errors (Zwift API)
**Fix**: Adjust cron frequency in env vars:
```
CLUB_SYNC_CRON=0 */12 * * *  # Every 12 hours instead of 6
```

## 11. Security Best Practices

### ⚠️ BELANGRIJK
1. **Change API_PASSWORD** naar strong password!
2. **Use SUPABASE_SERVICE_KEY** (not anon key) in backend
3. **Enable AUTH_ENABLED=true** in production
4. **Update ALLOWED_ORIGINS** to Vercel URL only

### Example Secure .env
```bash
AUTH_ENABLED=true
API_USERNAME=admin
API_PASSWORD=$(openssl rand -base64 32)  # Generate strong password
ALLOWED_ORIGINS=https://teamnl-cloud9.vercel.app
```

## 12. Database Connection

Railway kan ook PostgreSQL hosten (NOT needed - we use Supabase):

Voordeel van Supabase:
- ✅ Gratis 500MB (vs Railway $5/month)
- ✅ Real-time built-in
- ✅ Admin UI (Table Editor)
- ✅ Row-level security

## 13. Cost Optimization

### Reduce Bandwidth
```typescript
// Compress responses
app.use(compression());
```

### Cache Frequently-Used Data
```typescript
// Cache club data (60 min)
const clubCache = new Map();
const CACHE_TTL = 60 * 60 * 1000;
```

### Reduce Cron Frequency
```bash
# Every 6 hours instead of 1 hour
RIDER_EVENTS_SCAN_CRON=0 */6 * * *
```

## ✅ Deployment Complete!

Backend nu live met:
- ✅ Automatic GitHub deployments
- ✅ Environment variables configured
- ✅ Cron jobs running 24/7
- ✅ Real-time logging
- ✅ Health check monitoring
- ✅ Supabase integration

**API Endpoints:**
- `https://your-service.railway.app/api/health`
- `https://your-service.railway.app/api/sync/club/2281`
- `https://your-service.railway.app/api/riders/:id`

**Next Steps:**
1. Test API endpoints via curl/Postman
2. Update Vercel `vercel.json` met Railway URL
3. Test E2E: Frontend → Railway API → Supabase
4. Monitor logs voor errors
