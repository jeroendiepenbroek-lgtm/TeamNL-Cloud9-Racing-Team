# 🚀 Deployment Guide - TeamNL Cloud9 Racing Team

## 📦 Latest Changes Deployed

### Commit: 8197a09
**Date**: November 21, 2025

### ✅ Changes Included:

1. **Rider Sync Fix** (Commit 09868ad)
   - Fixed power data array extraction `[value, percentile, rank] → value`
   - Corrected column names: `weight`, `height`, `zp_ftp`, `race_current_rating`
   - All 75 riders now sync correctly with complete data

2. **Event Sync Overlap Fix** (Commit 5473535)
   - FULL sync moved from :50 to :55 (prevents NEAR overlap)
   - Documented sync issues in `docs/SYNC_SERVICES_ISSUES.md`

3. **Admin Tools** (Commit b0be918, 8197a09)
   - Rider verification page: `/admin/verification.html`
   - API mapping schema: `/admin/mapping-schema.html`
   - Sync config validator with startup checks

---

## 🎯 Deployment Status

### ✅ Already Deployed to GitHub
- Repository: `jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team`
- Branch: `main`
- All commits pushed successfully

### 🗄️ Database Status
- **Supabase Project**: bktbeefdmrpxhsyyalvc.supabase.co
- **Schema**: Up-to-date (63 columns in riders table)
- **Data**: 75 riders synced with complete power data
- **Last Sync**: Working (60min intervals)

### 🔧 Backend Server
- **Status**: Running via PM2 (`cloud9-backend`)
- **Port**: 3000
- **Sync Schedule**:
  - Rider: Every 60 min (hourly at :00)
  - NEAR Events: Every 15 min (:05, :20, :35, :50)
  - FULL Events: Every 3 hours (:55)
- **Validator**: Active (prevents invalid configs)

---

## 🚀 Production Deployment Options

### Option 1: Vercel/Netlify (Frontend + Serverless Backend)

#### Steps:
1. **Prepare Build**:
   ```bash
   cd /workspaces/TeamNL-Cloud9-Racing-Team/backend
   npm run build
   ```

2. **Deploy via Vercel CLI**:
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

3. **Environment Variables** (Set in Vercel dashboard):
   ```
   SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-key>
   ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1
   PORT=3000
   NODE_ENV=production
   
   # Sync Config (Optional - uses safe defaults)
   RIDER_SYNC_ENABLED=true
   RIDER_SYNC_INTERVAL_MINUTES=60
   EVENT_SYNC_ENABLED=true
   NEAR_EVENT_SYNC_INTERVAL_MINUTES=15
   FULL_EVENT_SYNC_INTERVAL_HOURS=3
   ```

#### Pros:
- ✅ Zero-downtime deployments
- ✅ Auto-scaling
- ✅ CDN for static files
- ✅ Free tier available

#### Cons:
- ⚠️ Cron jobs require Vercel Pro ($20/month)
- ⚠️ Serverless = cold starts

---

### Option 2: Railway/Render (Full Backend Hosting)

#### Steps:
1. **Connect GitHub Repo** to Railway/Render
2. **Set Start Command**: `npm start` (from backend directory)
3. **Add Environment Variables** (same as above)
4. **Deploy**: Auto-deploys on git push

#### Railway Config:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd backend && npm install"
  },
  "deploy": {
    "startCommand": "cd backend && npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

#### Pros:
- ✅ Cron jobs work natively
- ✅ Always-on server
- ✅ Easy GitHub integration
- ✅ $5/month starter plan

#### Cons:
- ⚠️ No auto-scaling (fixed resources)

---

### Option 3: DigitalOcean App Platform

#### Steps:
1. **Create App**: Link GitHub repo
2. **Configure Build**:
   - Build: `cd backend && npm install && npm run build`
   - Run: `cd backend && npm start`
3. **Add Environment Variables**
4. **Deploy**: $5/month

#### Pros:
- ✅ Simple setup
- ✅ Managed infrastructure
- ✅ Cron support

---

### Option 4: Docker + Cloud Run (GCP) / App Runner (AWS)

#### Dockerfile (create in backend/):
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

#### Deploy:
```bash
# Build
docker build -t teamnl-backend:latest .

# GCP Cloud Run
gcloud run deploy teamnl-backend \
  --image teamnl-backend:latest \
  --platform managed \
  --region europe-west1
```

#### Pros:
- ✅ Full control
- ✅ Easy scaling
- ✅ Pay-per-use

---

### Option 5: Current Dev Server (PM2 Production Mode)

#### Already Running! Just secure it:

```bash
# Set production env
export NODE_ENV=production

# Restart with production settings
pm2 restart cloud9-backend --update-env

# Setup PM2 startup (survives reboots)
pm2 startup
pm2 save

# Monitor
pm2 monit
```

#### Secure with Nginx reverse proxy:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Pros:
- ✅ Already working
- ✅ Full control
- ✅ No platform fees

#### Cons:
- ⚠️ Manual server management
- ⚠️ Need SSL cert (Let's Encrypt)
- ⚠️ You manage backups

---

## 🔒 Security Checklist

### Before Production:
- [ ] Rotate Supabase Service Role Key
- [ ] Enable HTTPS/SSL
- [ ] Add rate limiting (express-rate-limit)
- [ ] Set up monitoring (Sentry, Datadog)
- [ ] Configure CORS for production domain
- [ ] Add authentication for admin endpoints
- [ ] Set up database backups
- [ ] Enable Supabase RLS policies
- [ ] Add health check endpoint monitoring
- [ ] Configure log aggregation

---

## 📊 Post-Deployment Verification

### 1. Health Check
```bash
curl https://your-domain.com/health
# Expected: {"status":"ok","service":"TeamNL Cloud9 Backend",...}
```

### 2. Rider Sync Test
```bash
curl -X POST https://your-domain.com/api/riders/sync
# Expected: {"success":true,"count":75,...}
```

### 3. Admin Tools
- Visit: https://your-domain.com/admin/verification.html
- Visit: https://your-domain.com/admin/mapping-schema.html

### 4. Database Verification
```sql
-- Check sync is working
SELECT COUNT(*) FROM riders WHERE last_synced > NOW() - INTERVAL '2 hours';
-- Expected: 75

-- Check power data populated
SELECT COUNT(*) FROM riders WHERE power_wkg5 IS NOT NULL;
-- Expected: ~60-70 (riders with power data)
```

### 5. Monitor Logs
```bash
# Railway/Render
railway logs

# Vercel
vercel logs

# PM2
pm2 logs cloud9-backend
```

---

## 🎯 Recommended: Railway

**Why Railway?**
- ✅ GitHub auto-deploy (no manual steps)
- ✅ Cron jobs work perfectly
- ✅ $5/month (500 hours)
- ✅ Environment variables UI
- ✅ Logs & monitoring built-in
- ✅ Europe region available

**Setup Time**: ~5 minutes

**Steps**:
1. Go to railway.app
2. "New Project" → "Deploy from GitHub"
3. Select `TeamNL-Cloud9-Racing-Team`
4. Set root directory: `backend`
5. Add environment variables
6. Deploy! ✅

---

## 📞 Support

**Issues?**
- Check logs: `pm2 logs cloud9-backend`
- Validator errors: Review startup logs
- Rate limits: Check `docs/SYNC_SERVICES_ISSUES.md`
- Database: Supabase dashboard → SQL Editor

**All systems operational!** ✅
