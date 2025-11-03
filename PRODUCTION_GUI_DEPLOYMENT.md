# 🚀 ZERO-COST PRODUCTION DEPLOYMENT GUIDE

**Status**: Ready to Deploy  
**Total Cost**: €0/maand

## 🎯 Complete Solution

### 1. Frontend GUI (Vercel - Free Tier)

**Features**:
- ✅ Upload Zwift IDs (CSV/TXT support)
- ✅ View database statistics
- ✅ Configure sync settings
- ✅ Real-time data via Supabase

**Deploy Steps**:

```bash
# 1. Install Vercel CLI (optional - can use web UI)
npm i -g vercel

# 2. Deploy via CLI
cd /workspaces/TeamNL-Cloud9-Racing-Team
vercel

# Or deploy via GitHub:
# - Push code to GitHub
# - Go to vercel.com
# - Import GitHub repo
# - Auto-deploy on every push
```

**Environment Variables** (Vercel Dashboard):
```bash
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (your anon key)
```

**URL**: `https://teamnl-cloud9.vercel.app` (automatic)

### 2. Database Viewer (Supabase Studio - Built-in)

**Access**: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc

**Features** (100% gratis, geen extra setup):

- **Table Editor**: Browse/edit all tables visually
  - `riders`, `clubs`, `club_roster`, `events`, `race_results`, etc.
  - Filter, sort, search
  - CSV export
  
- **SQL Editor**: Run custom queries
  ```sql
  -- Example queries
  SELECT * FROM riders ORDER BY updated_at DESC LIMIT 10;
  
  SELECT r.name, COUNT(rr.id) as race_count
  FROM riders r
  JOIN race_results rr ON r.id = rr.rider_id
  GROUP BY r.name
  ORDER BY race_count DESC;
  ```

- **API Documentation**: Auto-generated REST + GraphQL
- **Real-time subscriptions**: Live data updates

**Direct Links**:
- Table Editor: `https://bktbeefdmrpxhsyyalvc.supabase.co/project/bktbeefdmrpxhsyyalvc/editor`
- SQL Editor: `https://bktbeefdmrpxhsyyalvc.supabase.co/project/bktbeefdmrpxhsyyalvc/sql/new`

### 3. Admin GUI Features

**Upload Riders** (Tab: "Upload"):
```
Upload formats supported:
- CSV: 150437,234567,345678
- TXT (line-separated):
  150437
  234567
  345678
  
Auto-detects clubs → Syncs to Supabase
```

**View Data** (Tab: "Data"):
- Database statistics (riders, clubs, events, results)
- Direct links to Supabase Studio
- Real-time counts

**Configure Sync** (Tab: "Sync"):
- Sync interval (hours)
- Cron schedule
- Event scraping toggle
- Days to scrape

**Note**: Settings show GitHub Secrets format (copy-paste ready)

### 4. Backend (GitHub Actions - Free)

Already configured in `.github/workflows/autonomous-sync.yml`

**Runs**:
- Hourly club sync (configurable)
- Event scraping (optional)
- Automatic via cron

**Monitor**: GitHub repo → Actions tab

## 📊 Frontend Pages

### Dashboard (📊)
- Club statistics
- Ranking table
- Rider details
- Real-time updates

### Data Viewer (🗄️)
- Database stats cards
- Supabase Studio links
- Quick access to tables
- Example SQL queries

### Upload (➕)
- CSV/TXT file upload
- Rider ID input (comma-separated)
- Multi-club detection
- Sync progress

### Sync Settings (⚙️)
- Configure sync frequency
- Cron schedule builder
- Event scraping toggle
- GitHub Secrets format output

## 🚀 Deployment Steps (5 min)

### Step 1: Deploy Frontend (Vercel)

**Option A: Vercel Web UI** (Recommended)

1. Go to https://vercel.com/
2. Sign in met GitHub
3. Click "Add New" → "Project"
4. Import `TeamNL-Cloud9-Racing-Team` repo
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add Environment Variables:
   ```
   VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
7. Click "Deploy"

**Option B: Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel

# Follow prompts:
# - Link to existing project: No
# - Project name: teamnl-cloud9
# - Directory: ./
# - Auto-detected Vite: Yes
```

### Step 2: Configure Supabase Access

Already done! Tables created via `supabase/schema.sql`

**Verify**:
1. Go to https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc
2. Check Table Editor → Should see 7 tables
3. Check API → Credentials available

### Step 3: Test Frontend

1. Open deployed URL (e.g., `https://teamnl-cloud9.vercel.app`)
2. Click "Data" tab → Should show Supabase Studio links
3. Click "Upload" tab → Test rider upload (e.g., `150437`)
4. Click "Sync" tab → See GitHub Secrets format

### Step 4: Configure GitHub Actions (Already Done)

Secrets already set in repo Settings → Secrets → Actions:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_KEY`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `ZWIFT_API_KEY`

**Test**: Actions tab → Autonomous Sync → Run workflow

## 💰 Cost Breakdown

| Service | Tier | Monthly Cost | Usage |
|---------|------|--------------|-------|
| **Vercel** | Hobby | €0 | 100GB bandwidth, unlimited sites |
| **Supabase** | Free | €0 | 500MB DB, 2GB bandwidth |
| **GitHub Actions** | Pro | €0 | 3000 min/maand (included) |
| **Total** | - | **€0** | - |

**Limits**:
- Vercel: 100GB bandwidth/maand (safe tot ~10K visitors)
- Supabase: 2GB bandwidth/maand (safe tot ~5K API calls/maand)
- GitHub Actions: 3000 min/maand (hourly sync = ~2000 min)

## 🎨 GUI Features Summary

### ✅ Upload Zwift IDs
- **Format**: CSV (comma-separated) of TXT (line-separated)
- **Example**: `150437,234567,345678` or paste list
- **Auto-detection**: Fetches clubs automatically
- **Multi-club support**: Handles riders from different clubs

### ✅ View Database Tables
- **Supabase Studio**: Built-in web GUI (100% gratis)
- **Direct access**: Click links in "Data" tab
- **Tables**: riders, clubs, club_roster, events, race_results, rider_history, sync_logs
- **Features**: Filter, sort, search, edit, CSV export

### ✅ Configure Sync Settings
- **Sync frequency**: 1-24 hours
- **Cron schedule**: Custom expression (hourly, daily, etc.)
- **Event scraping**: Toggle on/off
- **Days range**: 7-365 days historical data
- **Output**: GitHub Secrets format (copy-paste ready)

### ✅ Monitor Data
- **Real-time stats**: Riders, clubs, events, results count
- **Auto-refresh**: Every 30 seconds
- **Visual cards**: Color-coded per data type

## 📝 Usage Examples

### Upload Riders via Web GUI

1. Go to `https://teamnl-cloud9.vercel.app`
2. Click "Upload" tab
3. Paste rider IDs:
   ```
   150437
   234567
   345678
   ```
4. Click "Upload Riders"
5. Wait for success message: "Synced X riders across Y clubs"

### View Data in Supabase Studio

1. Click "Data" tab in frontend
2. Click "Table Editor" link
3. Select `riders` table
4. Filter by `club_id = 11818`
5. Export to CSV if needed

### Run Custom SQL Query

1. Click "SQL Editor" link
2. Paste query:
   ```sql
   SELECT name, ftp, weight, ftp/weight as watts_per_kg
   FROM riders
   WHERE club_id = 11818
   ORDER BY watts_per_kg DESC
   LIMIT 20;
   ```
3. Click "Run"
4. Download results as CSV

### Change Sync Frequency

1. Click "Sync" tab
2. Change "Sync Interval" to 2 hours
3. Click "Save Configuration"
4. Copy GitHub Secrets output
5. Go to GitHub repo → Settings → Secrets → Actions
6. Update `SYNC_INTERVAL_HOURS` to `2`
7. Next workflow run uses new setting

## 🐛 Troubleshooting

### Frontend build fails

**Error**: `Module not found: DataViewer`

**Fix**: Build dependencies eerst:
```bash
cd frontend
npm install
npm run build
```

### Supabase Studio not accessible

**Error**: 403 Forbidden

**Fix**: Check Supabase project not paused:
1. https://supabase.com/dashboard
2. Check project status
3. Resume if paused (free tier can pause after inactivity)

### Upload button not working

**Error**: API base URL undefined

**Fix**: Set environment variable in Vercel:
```bash
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 🎉 Success Criteria

Deployment succeeds wanneer:

✅ **Frontend live**: URL `https://teamnl-cloud9.vercel.app` accessible  
✅ **Upload works**: Rider IDs kunnen worden ge-upload via GUI  
✅ **Data visible**: Supabase Studio toont tables met data  
✅ **Sync configured**: Settings tonen correcte GitHub Secrets format  
✅ **Zero cost**: Alle services binnen free tier limits  

## 📚 Next Steps

1. **Deploy frontend** via Vercel (5 min)
2. **Test upload** met 1 rider ID (1 min)
3. **Check Supabase Studio** voor data (1 min)
4. **Configure sync** via GitHub Secrets (2 min)
5. **Monitor** GitHub Actions workflow (ongoing)

---

**Total Setup Time**: ~10 minuten  
**Monthly Cost**: €0  
**Maintenance**: Zero (serverless)
