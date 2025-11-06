# 🚨 CRITICAL: Railway Environment Variables Setup

**Status**: Deployment b1cdef4/15a4661 mist environment variables!

## Vereiste Environment Variables

Voeg deze toe in Railway dashboard → Environment Variables:

```bash
# US8: Auto-Sync Configuration (VERPLICHT!)
SYNC_ENABLED=true
SYNC_INTERVAL_HOURS=6
SYNC_START_DELAY_MINUTES=5
```

## Huidige situatie

**Probleem**: 
- Code verwacht `SYNC_ENABLED`, `SYNC_INTERVAL_HOURS`, etc.
- Railway heeft deze vars niet → sync werkt niet!

**Symptomen**:
- `POST /api/auto-sync/trigger` geeft error
- Rider data wordt niet gesynchroniseerd
- Auto-sync draait niet

## Fix Stappen

### Via Railway Dashboard:

1. **Open Railway project**: https://railway.app/project/[project-id]
2. **Ga naar Settings → Variables**
3. **Klik "New Variable"**
4. **Voeg toe**:
   ```
   SYNC_ENABLED = true
   SYNC_INTERVAL_HOURS = 6
   SYNC_START_DELAY_MINUTES = 5
   ```
5. **Klik "Deploy"** (automatic redeploy)

### Verificatie:

```bash
# Check of vars gezet zijn
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/auto-sync/status

# Expected response:
{
  "enabled": true,
  "intervalHours": 6,
  "lastSync": null,
  "isRunning": false
}
```

### Test Sync:

```bash
# Trigger manual sync
curl -X POST https://teamnl-cloud9-racing-team-production.up.railway.app/api/auto-sync/trigger

# Expected:
{
  "success": true,
  "message": "Sync voltooid",
  "result": {
    "success": 1,
    "errors": 0,
    "skipped": 0
  }
}

# Check rider data
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/riders/team

# Should now show:
# - name, ranking, FTP, weight, club, etc. (niet meer null!)
```

---

## Alternatief: Defaults

Als je geen env vars wilt zetten, pas `sync.config.ts` aan:

```typescript
export function getSyncConfig(): SyncConfig {
  // ALTIJD enabled in production
  const enabled = process.env.NODE_ENV === 'production';
  
  const intervalHours = parseInt(process.env.SYNC_INTERVAL_HOURS || '6', 10);
  const startDelayMinutes = parseInt(process.env.SYNC_START_DELAY_MINUTES || '5', 10);
  
  // ...
}
```

Maar dit is **NIET AANBEVOLEN** (minder flexibel).

---

**Prioriteit**: 🔴 **CRITICAL** - Sync werkt niet zonder deze vars!

**Geschatte fix tijd**: 2 minuten (via Railway dashboard)
