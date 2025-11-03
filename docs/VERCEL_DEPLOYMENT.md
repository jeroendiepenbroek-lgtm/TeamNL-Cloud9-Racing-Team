# Vercel Deployment Guide - TeamNL Cloud9 Dashboard

## 1. Prerequisites
- GitHub repository gepusht naar GitHub.com
- Supabase project setup compleet (zie SUPABASE_SETUP.md)
- Frontend `.env` met Supabase credentials

## 2. Deploy naar Vercel

### Via Vercel Dashboard (Recommended)
1. Ga naar https://vercel.com/new
2. **Import Git Repository**:
   - Klik "Import Git Repository"
   - Selecteer `jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team`
   - Authorize Vercel GitHub app

3. **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` ⚠️ BELANGRIJK!
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Environment Variables**:
   Klik "Environment Variables" en voeg toe:
   ```
   VITE_SUPABASE_URL = https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. **Deploy**:
   - Klik "Deploy"
   - Wacht ~2 minuten
   - ✅ Frontend live op `https://your-project.vercel.app`

### Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from root
cd /workspaces/TeamNL-Cloud9-Racing-Team
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Project name: teamnl-cloud9-dashboard
# - Root directory: frontend
```

## 3. Custom Domain (Optional)
1. Ga naar **Settings** → **Domains**
2. Voeg toe: `zwiftcloud9.com` (of jouw domain)
3. Update DNS records bij je registrar:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   ```

## 4. Environment Variables Setup

### Production Variables
In Vercel Dashboard → **Settings** → **Environment Variables**:

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | Production |

⚠️ **Gebruik ANON key, niet service_role key!**

### Preview Variables (Optional)
Voor branch preview deployments:
- Same vars maar target "Preview" environment
- Test nieuwe features before merge

## 5. Automatic Deployments

Vercel configureert automatic deployments:

- **main branch** → Production (https://your-project.vercel.app)
- **PR branches** → Preview URLs (https://your-project-git-branch.vercel.app)
- **Commits** → Auto-deploy binnen 2 minuten

## 6. Backend API Proxy (Optional)

Als je backend op Railway deployed:

1. Update `vercel.json` rewrites:
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-backend.railway.app/api/$1"
    }
  ]
}
```

2. Frontend kan nu relatieve URLs gebruiken:
```typescript
// ✅ Works on Vercel
fetch('/api/riders/150437')

// ❌ Hardcoded backend URL niet nodig
fetch('https://your-backend.railway.app/api/riders/150437')
```

## 7. Performance Optimization

### Enable Edge Caching
In `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Analytics (Built-in)
Vercel Analytics automatic enabled:
- Web Vitals (LCP, FID, CLS)
- Real User Monitoring
- No configuration needed!

## 8. Troubleshooting

### Build Fails: "Cannot find module @supabase/supabase-js"
**Fix**: Check Root Directory = `frontend` (not root!)

### 404 on /riders route
**Fix**: Vite SPA routing. Add to `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Environment variables not loading
**Fix**: Check variable names start with `VITE_` prefix!

### Supabase CORS errors
**Fix**: Add Vercel domain to Supabase allowed origins:
1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add: `https://your-project.vercel.app`

## 9. Monitoring

### Vercel Dashboard
- **Deployments**: Recent build logs
- **Analytics**: Page views, Web Vitals
- **Logs**: Real-time function logs (if using API routes)

### Supabase Dashboard
- **Database**: Live queries, table data
- **API**: Request logs, latency
- **Real-time**: Active subscriptions

## 10. Costs (Free Tier Limits)

| Resource | Vercel Hobby (Free) |
|----------|---------------------|
| Bandwidth | 100 GB/month |
| Build Minutes | 100 hours/month |
| Function Invocations | 100k/day |
| Domains | Unlimited |
| Team Members | 1 (yourself) |

**Enough voor:**
- 10K+ daily users
- 1000+ builds/month
- Multiple preview deployments

## ✅ Deployment Complete!

Je frontend is nu live op Vercel met:
- ✅ Automatic GitHub deployments
- ✅ Preview URLs per PR
- ✅ Global CDN (fast worldwide)
- ✅ Zero-downtime deployments
- ✅ HTTPS built-in
- ✅ Analytics included

**Next Steps**:
1. Deploy backend naar Railway (zie RAILWAY_DEPLOYMENT.md)
2. Update API proxy in vercel.json
3. Test E2E workflow
