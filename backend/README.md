# TeamNL Cloud9 - Backend Deployment

## 🚀 Railway Deployment

### Quick Deploy
1. Klik op Railway badge: [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)
2. Connect GitHub repo: `jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team`
3. Select directory: `/backend`
4. Add environment variables (zie hieronder)
5. Deploy!

### Environment Variables
```env
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1
PORT=3000
NODE_ENV=production
```

### Manual Deploy via Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

### Verify Deployment
```bash
# Check health
curl https://your-app.up.railway.app/health

# Test API
curl https://your-app.up.railway.app/api/riders

# Open dashboard
open https://your-app.up.railway.app
```

## 📊 API Endpoints

### Read Endpoints
- `GET /health` - Health check
- `GET /api/clubs/:clubId` - Club info
- `GET /api/riders` - Riders list
- `GET /api/events` - Events list
- `GET /api/results/:eventId` - Event results
- `GET /api/history/:riderId` - Rider history
- `GET /api/sync-logs` - Sync logs

### Sync Endpoints
- `POST /api/clubs/:clubId/sync` - Sync club data
- `POST /api/riders/sync` - Sync riders
- `POST /api/events/sync` - Sync events
- `POST /api/results/:eventId/sync` - Sync event results
- `POST /api/history/:riderId/sync` - Sync rider history
- `POST /api/sync-logs/full-sync` - Full sync (club + riders + events)

## 🔧 Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Test locally
curl http://localhost:3000/health
```

## 📦 Structure
```
backend/
├── src/
│   ├── server.ts                 # Express server
│   ├── api/
│   │   ├── zwift-client.ts      # ZwiftRacing API client
│   │   └── endpoints/           # 6 API endpoints
│   ├── services/
│   │   ├── supabase.service.ts  # Supabase client
│   │   └── sync.service.ts      # Sync orchestration
│   └── types/
│       └── index.ts             # TypeScript types
├── public/
│   └── index.html               # Dashboard UI
├── railway.json                 # Railway config
└── package.json
```

## 🗄️ Database

Supabase tables (6):
- `clubs` - Club information
- `riders` - Rider profiles
- `events` - Race events
- `results` - Race results
- `rider_history` - Historical snapshots
- `sync_logs` - Sync operation logs

Schema: `/supabase/force-clean-deploy.sql`

## 🎯 Production Checklist

- [ ] Supabase tables deployed
- [ ] Railway project created
- [ ] Environment variables configured
- [ ] GitHub repo connected
- [ ] Deploy successful
- [ ] Health endpoint returns 200
- [ ] Dashboard accessible
- [ ] API endpoints tested
- [ ] CORS configured
- [ ] Custom domain (optional)

## 📝 Notes

- **Rate limits**: ZwiftRacing API heeft rate limits (1/60min club, 5/min riders)
- **Database**: Supabase free tier (500MB, 50k rows)
- **Hosting**: Railway free tier ($5 credit/month)
- **Logs**: Check Railway dashboard voor server logs
