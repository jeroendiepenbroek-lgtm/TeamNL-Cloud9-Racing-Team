# Railway Environment Variables - Minimal Setup

## ✅ KEEP (Essential)

### Core
- `NODE_ENV=production`
- `PORT=8080`

### Frontend (Discord OAuth)
**Alleen nodig voor Discord login in frontend**
- `VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co`
- `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## ❌ REMOVE (Not needed for minimal backend)

### Database (backend gebruikt geen database meer)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `DATABASE_URL`

### Zwift API (geen sync meer)
- `ZWIFT_RACING_API_KEY`
- `ZWIFT_CLIENT_ID`
- `ZWIFT_CLIENT_SECRET`
- `ZWIFT_REFRESH_TOKEN`

### ZwiftPower (niet gebruikt)
- `ZWIFTPOWER_USERNAME`
- `ZWIFTPOWER_PASSWORD`

### Sync features (uitgezet)
- `ENABLE_AUTO_SYNC`
- `USE_SMART_SCHEDULER`
- `SYNC_INTERVAL_MINUTES`

---

## Railway Dashboard Steps

1. Open https://railway.app/project/teamnl-cloud9-racing-team-production
2. Ga naar **Variables** tab
3. Verwijder alle `❌ REMOVE` variabelen
4. Behoud alleen:
   - `NODE_ENV=production`
   - `PORT=8080`
   - `VITE_SUPABASE_URL=...` (voor Discord OAuth)
   - `VITE_SUPABASE_ANON_KEY=...` (voor Discord OAuth)

5. Klik **Save** → Railway zal automatisch re-deployen

---

## Verwachte Resultaten

**Na re-deploy**:
- ✅ `/health` endpoint werkt
- ✅ Frontend laadt (3 lege dashboards)
- ✅ Discord login werkt (OAuth via Supabase)
- ❌ Geen database errors (geen connecties meer)
- ❌ Geen sync errors (sync uitgezet)

**Logs moeten tonen**:
```
TeamNL Cloud9 Racing Team - Backend v3.0
🧹 Clean Slate Edition
🚀 Server running on port 8080
✅ Ready for rebuild
```

**GEEN errors meer** over:
- `riders_unified table not found`
- OAuth token refresh errors
- Sync scheduler errors
