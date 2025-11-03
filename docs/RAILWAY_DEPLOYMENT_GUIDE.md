# Railway Deployment Guide - Backend API

## 🚂 Railway Setup

### Stap 1: Account & Project Aanmaken
1. Ga naar https://railway.app
2. Sign up met GitHub account
3. Klik "New Project"
4. Kies "Deploy from GitHub repo"
5. Selecteer: `jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team`
6. Railway detecteert automatisch Node.js project

### Stap 2: Environment Variables Configureren
In Railway dashboard → "Variables" tab:

```bash
# Supabase Database (REQUIRED)
DATABASE_URL=postgresql://postgres.bktbeefdmrpxhsyyalvc:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Supabase REST API (REQUIRED)
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDQ5MjgzMywiZXhwIjoyMDQ2MDY4ODMzfQ.NkV22nxX0pM4G2lEyF1SIHqp3zNVXy0T4YGlFsCFKI4

# ZwiftRacing API (REQUIRED)
ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1

# Server Config (REQUIRED)
NODE_ENV=production
PORT=3000

# Sync Config (OPTIONAL)
SYNC_INTERVAL_MINUTES=60
CLUB_ID=11818
```

**BELANGRIJK**: Haal DATABASE_URL wachtwoord op via:
```
Supabase Dashboard → Settings → Database → Connection String (Connection Pooling)
```

### Stap 3: Build & Start Commands Configureren
Railway detecteert automatisch `package.json`, maar controleer:

**Build Command**:
```bash
npm run build
```

**Start Command**:
```bash
npm start
```

**Verify in `package.json`**:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx watch src/server.ts"
  }
}
```

### Stap 4: Deployment Triggers
Railway auto-deploy bij elke push naar `main` branch:
```bash
git push origin main
# Railway webhook triggered → build starts
```

Manual deploy via dashboard:
- Railway Dashboard → "Deployments" → "Deploy"

### Stap 5: Domain & URL
Railway genereert automatisch public URL:
```
https://[project-name]-production.up.railway.app
```

Custom domain (optioneel):
- Railway Dashboard → "Settings" → "Domains" → "Add Domain"

---

## 🔧 Troubleshooting

### Build Failures

**Error**: `Cannot find module 'typescript'`
**Fix**: Zorg dat dependencies compleet zijn in `package.json`:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "prisma": "^5.7.0",
    "@prisma/client": "^5.7.0",
    "zod": "^3.22.4",
    "axios": "^1.6.2",
    "axios-rate-limit": "^1.3.0",
    "node-cron": "^3.0.3",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "@types/node": "^20.10.6",
    "@types/express": "^4.17.21"
  }
}
```

**Error**: `Prisma schema not found`
**Fix**: Zorg dat `prisma/schema.prisma` in repo zit (is al het geval)

**Error**: `Build timeout`
**Fix**: Railway Free tier heeft 10min build timeout. Onze build < 2min, dus OK.

---

### Runtime Errors

**Error**: `DATABASE_URL not set`
**Fix**: Check environment variables in Railway dashboard

**Error**: `Connection refused to Supabase`
**Fix**: Controleer DATABASE_URL format:
```
postgresql://postgres.PROJECT:PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true
                     ^^^^^^^^          ^^^^^^^^^^^^
                     Let op:           Connection pooler!
                     Niet gewone host
```

**Error**: `Rate limit exceeded`
**Fix**: Check ZwiftRacing API limits:
- Club sync: max 1/60min
- Riders sync: max 5/min
- Implementeer exponential backoff in code (already done in `zwift-client.ts`)

---

### Health Checks

**Test deployment**:
```bash
# Health endpoint
curl https://[RAILWAY_URL]/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-11-03T10:30:00.000Z",
  "database": "connected",
  "services": ["riders", "clubs", "events"]
}
```

**Test API endpoints**:
```bash
# Get riders
curl https://[RAILWAY_URL]/api/riders

# Get specific rider
curl https://[RAILWAY_URL]/api/riders/150437

# Sync logs
curl https://[RAILWAY_URL]/api/sync/logs
```

---

## 📊 Monitoring

### Railway Dashboard
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time logs in dashboard
- **Deployments**: History + rollback optie

### Custom Monitoring
Voeg health check endpoint toe aan `src/server.ts`:
```typescript
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      services: ['riders', 'clubs', 'events'],
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});
```

---

## 🔐 Security Best Practices

### Environment Variables
- ✅ **NEVER** commit `.env` file
- ✅ Use Railway environment variables UI
- ✅ Rotate `SUPABASE_SERVICE_KEY` periodically
- ✅ Keep `ZWIFT_API_KEY` private

### API Security
```typescript
// Add rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### CORS Configuration
```typescript
import cors from 'cors';

app.use(cors({
  origin: [
    'https://team-nl-cloud9-racing-team.vercel.app',
    'http://localhost:5173' // Dev only
  ],
  credentials: true
}));
```

---

## 💰 Cost Management

### Railway Free Tier
- **Compute**: $5 credit/month (~500 hours)
- **Memory**: 512MB RAM (sufficient voor onze app)
- **Storage**: Geen persistent storage nodig (database op Supabase)
- **Bandwidth**: Geen limit op free tier

### Estimated Usage
```
Backend API requests:
- Avg: ~1000 requests/dag
- Peak: ~100 requests/uur
- Cost: **$0** (binnen free tier)

Database queries (via Supabase):
- Avg: ~5000 queries/dag
- Supabase Free: 500MB DB, unlimited queries
- Cost: **$0**
```

**Total Cost**: **$0/month** 🎉

---

## 🚀 Post-Deployment Checklist

### Immediately After Deploy
- [ ] Verify health endpoint: `GET /api/health`
- [ ] Test rider endpoint: `GET /api/riders`
- [ ] Check Railway logs for errors
- [ ] Verify Supabase connection in logs

### Within 24 Hours
- [ ] Trigger manual sync: `POST /api/sync/club`
- [ ] Monitor sync logs: `GET /api/sync/logs`
- [ ] Check data in Supabase dashboard
- [ ] Update frontend `RAILWAY_URL` in Vercel env vars

### Within 1 Week
- [ ] Test automated cron sync (elke 60 min)
- [ ] Monitor Railway metrics (CPU/memory)
- [ ] Verify no rate limit errors in logs
- [ ] Test all API endpoints end-to-end

---

## 🔗 Integration met Frontend (Vercel)

### Update Vercel Environment Variables
1. Vercel Dashboard → "Settings" → "Environment Variables"
2. Add:
```bash
VITE_RAILWAY_API_URL=https://[PROJECT]-production.up.railway.app
```

### Update Frontend Code
```typescript
// frontend/src/config.ts
export const API_URL = import.meta.env.VITE_RAILWAY_API_URL || 'http://localhost:3000';

// frontend/src/hooks/useRiders.ts
const response = await fetch(`${API_URL}/api/riders`);
```

### Fallback naar Direct Supabase
```typescript
// Als Railway down is, gebruik direct Supabase REST API
const fetchRiders = async () => {
  try {
    // Try Railway first
    const response = await fetch(`${RAILWAY_URL}/api/riders`);
    if (!response.ok) throw new Error('Railway unavailable');
    return await response.json();
  } catch (error) {
    // Fallback to Supabase
    const { data } = await supabase.from('riders').select('*');
    return data;
  }
};
```

---

## 📝 Deployment Logs Voorbeeld

**Successful Deployment**:
```
=== Building ===
✓ Installing dependencies... (45s)
✓ Running prisma generate... (12s)
✓ Compiling TypeScript... (23s)
✓ Build complete! (80s total)

=== Deploying ===
✓ Starting server on port 3000...
✓ Database connected: postgres@aws-0-eu-central-1
✓ MVP Server draait op http://0.0.0.0:3000
✓ Healthcheck passed: /api/health
✓ Deployment successful!

Public URL: https://teamnl-cloud9-production.up.railway.app
```

---

## 🆘 Support & Resources

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Project Issues**: https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team/issues

---

**Laatste Update**: 3 november 2025
**Status**: 📋 Ready for deployment
