# 🚀 DEPLOYMENT INSTRUCTIES - Zero Cost Vercel

**Status**: Code gepushed naar GitHub ✅  
**Next**: Deploy naar Vercel

## Optie 1: Vercel Web UI (Aanbevolen - 5 minuten)

### Stap 1: Vercel Account Setup

1. **Ga naar**: https://vercel.com/
2. **Sign in** met je GitHub account
3. Klik op **"Add New"** → **"Project"**

### Stap 2: Import Repository

1. **Zoek**: `TeamNL-Cloud9-Racing-Team`
2. **Klik**: "Import" naast de repository
3. **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (belangrijk!)
   - **Build Command**: `npm run build` (auto-detect)
   - **Output Directory**: `dist` (auto-detect)
   - **Install Command**: `npm ci` (auto-detect)

### Stap 3: Environment Variables

Klik **"Environment Variables"** en voeg toe:

```bash
VITE_SUPABASE_URL
https://bktbeefdmrpxhsyyalvc.supabase.co

VITE_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NTQ2MzEsImV4cCI6MjA3NzUzMDYzMX0.HHa7K3J-pmR73hm063w0JJhA4pFASYS65DFI-BZGAqw
```

### Stap 4: Deploy

1. Klik **"Deploy"**
2. Wacht ~2 minuten voor build
3. ✅ **Live URL**: `https://teamnl-cloud9-<random>.vercel.app`

### Stap 5: Custom Domain (Optioneel)

1. Ga naar **Settings** → **Domains**
2. Voeg toe: `teamnl-cloud9.vercel.app` of custom domain
3. Vercel configureert DNS automatisch

## Optie 2: Vercel CLI (Sneller als je CLI prefereert)

```bash
# Installeer Vercel CLI
npm i -g vercel

# Ga naar frontend directory
cd /workspaces/TeamNL-Cloud9-Racing-Team/frontend

# Login (opent browser)
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? teamnl-cloud9
# - Directory: ./ (current)
# - Auto-detected Vite? Yes
# - Override settings? No

# Add environment variables
vercel env add VITE_SUPABASE_URL
# Paste: https://bktbeefdmrpxhsyyalvc.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY
# Paste: eyJhbGc...

# Deploy to production
vercel --prod
```

## Verificatie

### Test Frontend (5 minuten)

1. **Open URL**: `https://your-app.vercel.app`
2. **Check Tabs**:
   - 📊 **Dashboard**: Should load
   - 🗄️ **Data**: Shows stats cards + Supabase links
   - ➕ **Upload**: Textarea visible
   - ⚙️ **Sync**: Settings form visible

3. **Test Upload**:
   - Klik "Upload" tab
   - Paste: `150437` (test rider ID)
   - Klik "Upload Riders"
   - ✅ Verwacht: "Synced 1 riders across 1 clubs: TeamNL"

4. **Test Data Viewer**:
   - Klik "Data" tab
   - Klik "Table Editor" link
   - ✅ Verwacht: Supabase Studio opent

### GitHub Actions Workflow

1. **Ga naar**: https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team/actions
2. **Check**: "Autonomous Sync - Zero Cost Cloud Workflow"
3. **Status**: Should show recent runs (if enabled)

### Manual Trigger Test

1. **Actions tab** → "Autonomous Sync"
2. Klik **"Run workflow"**
3. Inputs:
   - clubId: `11818`
   - riderIds: (laat leeg)
   - enableEventScraping: `true`
4. Klik **"Run workflow"**
5. ✅ Verwacht: Workflow runs successfully (~5 min)
6. Check logs voor sync results

## Troubleshooting

### Build Failed: "Cannot find module"

**Fix**: Check `vercel.json` root directory is `frontend`

```json
{
  "buildCommand": "cd frontend && npm ci && npm run build",
  "outputDirectory": "frontend/dist"
}
```

### Environment Variables Not Working

**Symptoom**: Supabase errors in console

**Fix**:
1. Vercel Dashboard → Settings → Environment Variables
2. Verify both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. Redeploy: Deployments → Latest → "Redeploy"

### Upload Returns 404

**Symptoom**: API calls fail

**Fix**: Upload werkt direct met Supabase (geen backend server nodig). Check:
1. Supabase project actief (not paused)
2. Environment variables correct
3. Browser console voor errors

## Auto-Deploy Setup

**Vercel automatically deploys**:
- Every push to `main` branch → Production
- Every push to feature branch → Preview deployment
- Pull requests → Preview deployment with comment

**Disable auto-deploy** (optioneel):
1. Vercel Dashboard → Settings → Git
2. Uncheck "Automatic Deployments"

## Cost Monitoring

**Vercel Free Tier Limits**:
- ✅ 100GB bandwidth/maand
- ✅ Unlimited sites
- ✅ Automatic HTTPS
- ✅ Global CDN

**Check Usage**:
1. Vercel Dashboard → Settings → Usage
2. Monitor bandwidth (should stay under 10GB)

**Supabase Free Tier**:
- ✅ 500MB database
- ✅ 2GB bandwidth/maand

**Check Usage**:
1. Supabase Dashboard → Settings → Usage
2. Monitor database size + API requests

## Next Steps

### 1. Test Production Upload (2 min)

```bash
# Open deployed URL
open https://your-app.vercel.app

# Upload test rider
# Tab: Upload → Paste: 150437 → Upload Riders
# Expected: "Synced 1 riders"
```

### 2. Configure GitHub Secrets (5 min)

Voor autonomous workflow:

1. GitHub repo → Settings → Secrets → Actions
2. Add secrets:
   ```
   SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
   SUPABASE_SERVICE_KEY=eyJ... (service_role key)
   SUPABASE_ANON_KEY=eyJ... (anon key)
   SUPABASE_DATABASE_URL=postgresql://...
   ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1
   ```

### 3. Enable Workflow (1 min)

1. Actions tab → "Autonomous Sync"
2. Enable workflow (if disabled)
3. Test manual run
4. ✅ Hourly sync should start automatically

## Success Criteria

Deployment succeeds wanneer:

✅ **Frontend live**: URL accessible  
✅ **All tabs work**: Dashboard, Data, Upload, Sync visible  
✅ **Upload functional**: Test rider ID syncs successfully  
✅ **Supabase links**: Data tab links open Supabase Studio  
✅ **Zero cost**: All within free tier limits  

---

**Deployment Time**: ~10 minuten  
**Monthly Cost**: €0  
**Auto-deploy**: Enabled on push to main  
**Monitoring**: Vercel + Supabase dashboards
