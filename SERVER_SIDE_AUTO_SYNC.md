# Server-Side Auto-Sync Configuratie

## ✅ Geïmplementeerd

**Features:**
1. **Persistent Settings** - Auto-sync configuratie wordt bewaard in localStorage
2. **Server-Side Scheduler** - Backend draait auto-sync onafhankelijk van browser

## 🔧 Environment Variable

Voeg toe aan Railway of .env:

```bash
AUTO_SYNC_INTERVAL_MINUTES=60
```

**Opties:**
- `60` (default) = Elke 1 uur
- `30` = Elke 30 minuten
- `120` = Elke 2 uur
- `0` = Disabled (alleen manual sync)

## 🚀 Configureren in Railway

```bash
# Via Railway CLI
railway variables set AUTO_SYNC_INTERVAL_MINUTES=60

# Of via Railway Dashboard
# Settings → Variables → Add Variable
# Name: AUTO_SYNC_INTERVAL_MINUTES
# Value: 60
```

## 📊 Hoe het werkt

### Frontend (Client-side)
- **Alleen actief met open browser tab**
- Instellingen bewaard in localStorage
- Configureerbaar via dropdown (1m-4u)
- Gebruikt voor directe feedback

### Backend (Server-side)
- **Draait 24/7 onafhankelijk van browser**
- Geconfigureerd via environment variable
- Start 5 minuten na server boot
- Herhaalt volgens interval
- Logs naar console voor monitoring

## 🔍 Monitoring

Check Railway logs:
```bash
railway logs --tail 100 | grep -E "auto-sync|Auto-sync"
```

**Verwachte logs:**
```
🔄 Server-side auto-sync enabled: every 60 minutes
🚀 Running initial auto-sync...
⏰ Server-side auto-sync triggered at 2025-12-12T19:00:00.000Z
📊 Auto-syncing 2 riders: 1495, 150437
✅ Auto-sync complete: 2 synced, 0 failed
```

## ⏱️ Sync Schedule

**Laatste sync**: Kijk naar `team_last_synced` in database
**Volgende sync**: `last_synced` + `AUTO_SYNC_INTERVAL_MINUTES`

Query om sync tijden te checken:
```sql
SELECT 
  rider_id,
  full_name,
  team_last_synced,
  team_last_synced + interval '60 minutes' as next_sync_estimated
FROM v_rider_complete
WHERE is_team_member = true
ORDER BY team_last_synced DESC;
```

## 🎯 Best Practices

**Aanbevolen interval per use case:**
- **Development**: 15-30 minuten (snelle iteratie)
- **Production**: 60 minuten (standaard, balans tussen frisheid en API rate limits)
- **Low activity teams**: 120-240 minuten (minder frequent)

**API Rate Limits:**
- Zwift API: Geen officiële limits bekend, wees conservatief
- ZwiftRacing: ~100 requests/hour per IP
- Bij 2 riders × 2 APIs = 4 requests per sync
- 60min interval = 96 requests/day (veilig)

## 🔒 Fail-Safe Features

1. **Error Handling**: Failed syncs loggen maar stoppen scheduler niet
2. **Delay Between Riders**: 500ms pauze tussen riders om API te sparen
3. **Graceful Degradation**: Als één API faalt, andere blijft werken
4. **No Team Members**: Skip sync als team leeg is

## 📝 Troubleshooting

### Sync draait niet
```bash
# Check environment variable
railway variables | grep AUTO_SYNC

# Check server logs for startup message
railway logs | grep "Server-side auto-sync"

# Restart server to apply changes
railway restart
```

### Sync faalt
```bash
# Check API credentials
railway variables | grep ZWIFT

# Check recent errors
railway logs --tail 200 | grep "❌"
```

### Verify sync werkt
```bash
# Direct test via API
curl -X POST https://teamnl-cloud9-racing-team-production.up.railway.app/api/admin/sync-all

# Check database
# Via Supabase SQL Editor:
SELECT rider_id, team_last_synced 
FROM v_rider_complete 
WHERE is_team_member = true;
```
