# TeamNL Cloud9 - Standalone Backend

Robuuste, autonome backend server voor Cloud E2E workflow.

## 🚀 Features

- **Multi-club support**: Automatische detectie van clubs op basis van rider IDs
- **Supabase PostgreSQL**: Real-time database zonder Firebase dependencies
- **Health checks**: Built-in monitoring endpoints
- **Graceful shutdown**: Clean process termination
- **Error recovery**: Automatic restarts met PM2
- **Production-ready**: Railway deployment config

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check met uptime |
| GET | `/api/config` | Server configuratie |
| GET | `/api/clubs` | Lijst van tracked clubs |
| GET | `/api/stats` | Supabase database stats |
| POST | `/api/sync/riders-with-clubs` | Multi-club sync (auto-detect clubs) |
| POST | `/api/sync/club/:clubId` | Sync specific club + members |

## 🛠️ Local Development

### Prerequisites
- Node.js 22+
- Supabase account
- ZwiftRacing API key

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start with PM2 (recommended)
npx pm2 start ecosystem.standalone.config.cjs
npx pm2 logs standalone-backend

# OR start with tsx watch (development)
npm run dev:standalone

# Run tests
npm install -g tsx
npx tsx scripts/test-standalone.ts
```

### Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key

# Zwift API
ZWIFT_API_KEY=your-api-key
ZWIFT_API_BASE_URL=https://zwift-ranking.herokuapp.com
ZWIFT_CLUB_ID=11818

# Server
PORT=3000
NODE_ENV=development
```

## 📦 Production Deployment

### Railway

1. Connect GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy will auto-trigger on push to `main`
4. Health check runs on `/health` endpoint

```bash
# Manual deployment
railway up
```

### GitHub Actions Cron

Autonomous hourly sync wordt automatisch uitgevoerd via `.github/workflows/autonomous-sync.yml`:

- Runs every hour at :15
- Syncs default club (11818)
- Health checks before/after
- Automatic failure notifications

## 🧪 Testing

```bash
# Start server with PM2
npx pm2 start ecosystem.standalone.config.cjs

# Run test suite
npx tsx scripts/test-standalone.ts

# Expected output:
# ✅ Test 1: Health Check
# ✅ Test 2: Config
# ✅ Test 3: Supabase Stats
# ✅ Test 4: Tracked Clubs
# ✅ Test 5: Multi-Club Sync
# ✅ ALL TESTS PASSED
```

## 📊 Monitoring

### PM2

```bash
# View logs
npx pm2 logs standalone-backend

# Monitor stats
npx pm2 monit

# Restart
npx pm2 restart standalone-backend
```

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "uptime": "120s",
  "timestamp": "2025-11-01T15:00:00.000Z",
  "env": "production",
  "services": {
    "database": "connected",
    "supabase": "available"
  }
}
```

## 🔄 Autonomous Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions Cron (hourly)                                │
│    ↓                                                          │
│  POST /api/sync/club/11818                                    │
│    ↓                                                          │
│  Zwift API → Fetch club members (348 riders)                 │
│    ↓                                                          │
│  Supabase → Upsert clubs + club_roster + riders              │
│    ↓                                                          │
│  Real-time updates → Frontend (Supabase subscriptions)       │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Security

- Environment variables for secrets
- CORS configured for frontend domains
- Rate limiting on sync endpoints (20+ riders → background)
- Health check public, all other endpoints authenticated in production

## 📝 Logs

Logs worden opgeslagen in `/workspaces/TeamNL-Cloud9-Racing-Team/logs/`:
- `out.log`: Stdout
- `error.log`: Stderr

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill existing processes
pkill -9 -f "tsx.*standalone"
lsof -ti:3000 | xargs kill -9

# Restart
npx pm2 restart standalone-backend
```

### Database connection errors
- Check Supabase credentials in `.env`
- Verify Supabase project is active
- Run `npx prisma generate` to regenerate client

### Sync failures
- Check ZwiftRacing API rate limits (5 req/min)
- Verify API key is valid
- Check logs: `npx pm2 logs standalone-backend`

## 📚 Architecture

```
src/
├── standalone-server.ts      # Main entry point
├── services/
│   ├── multi-club-sync.service.ts   # Auto-detect clubs
│   ├── supabase-sync.service.ts     # Supabase operations
│   └── supabase-client.ts           # DB client
├── api/
│   └── zwift-client.ts       # Zwift API wrapper
└── utils/
    ├── config.ts             # Environment config
    └── logger.ts             # Structured logging
```

## 🎯 Next Steps

- [x] Standalone server setup
- [x] Multi-club auto-detection
- [x] Supabase integration
- [x] Health checks + graceful shutdown
- [x] PM2 process management
- [x] GitHub Actions cron
- [ ] Railway production deployment
- [ ] Frontend UI redesign
- [ ] Real-time notifications (Slack/Discord)

## 📄 License

MIT

---

**Status**: ✅ Production-ready | All tests passed | Autonomous E2E workflow active
