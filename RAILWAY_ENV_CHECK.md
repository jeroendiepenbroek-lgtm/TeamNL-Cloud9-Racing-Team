# Railway Environment Variables Checklist

## Status Check: 2025-11-06

### ✅ VERPLICHT - Moet ingesteld zijn:

```bash
# Database (Supabase)
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# ZwiftRacing API
ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1

# Runtime Environment
NODE_ENV=production
```

**Zonder deze vars crasht de applicatie!**

### ⚙️ OPTIONEEL - Heeft defaults:

```bash
# Auto-Sync Settings (US8)
# Default: enabled=true in production, interval=6 hours, delay=5 min
SYNC_ENABLED=true                  # Optioneel, default true in production
SYNC_INTERVAL_HOURS=6              # Optioneel, default 6
SYNC_START_DELAY_MINUTES=5         # Optioneel, default 5
```

**Deze zijn NIET nodig** - code heeft fallback defaults (zie `backend/src/config/sync.config.ts`).

### 🚫 NIET nodig in Railway:

```bash
PORT=8080  # Railway zet dit automatisch via $PORT
```

## Verificatie Commands

### 1. Check of vars ingesteld zijn via Railway CLI:
```bash
railway variables
```

### 2. Test via API endpoints:
```bash
# Health check
curl https://teamnl-cloud9-racing-team-production.up.railway.app/health

# Auto-sync status (toont config)
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/auto-sync/status
```

Expected response:
```json
{
  "enabled": true,
  "intervalHours": 6,
  "lastSync": null,
  "isRunning": false
}
```

## Huidige Status Railway Deployment

**Last commit**: 56b5dc6 (Authorization header logging)
**Issues**: 
- ❌ Manual sync geeft nog steeds `{"errors":1}` 
- Waarschijnlijk oorzaak: Railway heeft oude code cache (Authorization header nog niet geupdate)

**Next steps**:
1. Wacht 2-3 min voor volledige Railway redeploy
2. Test manual sync: `curl -X POST .../api/auto-sync/trigger`
3. Check Railway logs voor: `[ZwiftAPI] ✅ Client initialized with header: Authorization: 650c6d2fc4...`

## Troubleshooting

### Sync geeft errors:
```bash
# Check Railway logs voor exact error:
railway logs --tail 100

# Zoek naar:
# - "[ZwiftAPI] ❌" → API call failed
# - "[AutoSync] ❌" → Sync service error
# - "Authorization: 650c6d2fc4..." → Verify correct header
```

### Database connectie error:
```bash
# Verify Supabase vars:
railway variables | grep SUPABASE

# Test database:
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/riders/team
```

## Update Environment Variables

### Via Railway Dashboard:
1. Ga naar project: https://railway.app/project
2. Klik op service "backend"
3. Tab "Variables"
4. Add/Edit variables
5. Deploy automatisch getriggerd

### Via Railway CLI:
```bash
railway variables set ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1
railway variables set NODE_ENV=production
```

## Deployment Timeline

- **15:34** - Commit 3faa10b: Hybride rate limit strategie
- **15:41** - Commit c5d515f: Fix Authorization header (was x-api-key)
- **15:44** - Commit 56b5dc6: Logging voor header debugging
- **15:45+** - Railway redeploy in progress...

**Expected**: Na ~2-3 min moet sync werken met Authorization header.
