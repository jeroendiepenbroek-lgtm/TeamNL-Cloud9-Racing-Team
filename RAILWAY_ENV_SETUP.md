# Railway Environment Variables Setup

## ⚠️ ACTIE VEREIST: ZwiftPower Credentials toevoegen aan Railway

### Huidige Status
- ✅ Lokaal: Credentials zijn correct geconfigureerd in `backend/.env`
- ❌ Railway: Credentials ontbreken (zie warning in logs)

### Railway Deployment Log
```
⚠️  ZwiftPower credentials niet geconfigureerd in .env
```

## 🔧 Te Configureren Environment Variables

Ga naar Railway Dashboard → Settings → Environment Variables en voeg toe:

### 1. ZwiftPower Authentication
```bash
ZWIFTPOWER_USERNAME=jeroen.diepenbroek@gmail.com
ZWIFTPOWER_PASSWORD=CloudRacer-9
```

### 2. Zwift.com OAuth (optioneel voor toekomstige features)
```bash
ZWIFT_USERNAME=jeroen.diepenbroek@gmail.com
ZWIFT_PASSWORD=CloudRacer-9
```

## 📋 Volledige Environment Variables Checklist

Zorg ervoor dat Railway deze variabelen heeft:

### ✅ Al geconfigureerd (werkend)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ZWIFT_API_KEY` (650c6d2fc4ef6858d74cbef1)
- `PORT` (8080)
- `NODE_ENV` (production)

### ❌ Moet worden toegevoegd
- `ZWIFTPOWER_USERNAME` → jeroen.diepenbroek@gmail.com
- `ZWIFTPOWER_PASSWORD` → CloudRacer-9

## 🚀 Na Toevoegen

1. **Redeploy niet nodig** - Railway herstart automatisch bij env var changes
2. **Verificatie**: Check logs voor:
   ```
   [ZwiftPower] ✅ Credentials configured for: jeroen.diepenbroek@gmail.com
   ```
3. **Test endpoints**:
   - `/api/zwiftpower/rider/150437`
   - `/api/zwiftpower/test`
   - `/api/admin/api-documentation/status`

## 🔍 API Endpoints die ZwiftPower credentials gebruiken

### Backend Endpoints (require credentials)
- `GET /api/zwiftpower/rider/:riderId` - Haal rider data op
- `GET /api/zwiftpower/compare/:riderId` - Vergelijk met ZwiftRacing data
- `POST /api/zwiftpower/calculate-category` - Bereken category o.b.v. FTP/weight
- `POST /api/zwiftpower/sync-rider/:riderId` - Sync rider naar database
- `GET /api/zwiftpower/test` - Test credentials

### Python Scripts (gebruiken credentials)
- `backend/scripts/zp_robust_fetch.py` - ZwiftPower data fetcher
- `backend/scripts/zwift_direct.py` - Zwift.com OAuth client
- `backend/scripts/complete_api_discovery.py` - API scanner

## 🎯 Verwacht Gedrag na Configuratie

### Voor Configuratie (NU)
```
⚠️  ZwiftPower credentials niet geconfigureerd in .env
```
- API endpoints returnen 503 errors
- Python scripts kunnen niet authenticeren

### Na Configuratie (STRAKS)
```
[ZwiftPower] ✅ Credentials configured for: jeroen.diepenbroek@gmail.com
[ZwiftPower] 🔐 Authenticating as jeroen.diepenbroek@gmail.com...
[ZwiftPower] ✅ Login successful
```
- Alle endpoints werkend
- Data Architecture pagina toont live data
- API Documentation status indicators groen

## 📖 Railway Dashboard Links

1. **Settings**: https://railway.app/project/[project-id]/settings
2. **Environment Variables**: Klik op service → Variables tab
3. **Logs**: https://railway.app/project/[project-id]/deployments

## 🔒 Security Note

Deze credentials zijn **veilig** omdat:
- Ze worden alleen server-side gebruikt
- Nooit geëxposeerd in frontend code
- Alleen in Railway environment variables (encrypted)
- Lokale `.env` file staat in `.gitignore`

## ✅ Verificatie Checklist

Na toevoegen van credentials:

- [ ] Railway env vars toegevoegd (ZWIFTPOWER_USERNAME + ZWIFTPOWER_PASSWORD)
- [ ] Deployment logs tonen `✅ Credentials configured`
- [ ] Test endpoint `/api/zwiftpower/test` werkt
- [ ] API Documentation Status pagina toont "online" voor ZwiftPower
- [ ] Data Architecture pagina kan endpoints expanderen met echte data
