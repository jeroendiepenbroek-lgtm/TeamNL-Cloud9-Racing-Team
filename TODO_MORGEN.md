# TODO voor Morgen - 27 november 2025

## 🎯 Prioriteit 1: Railway Environment Variables Configureren

### Probleem
De Data Architecture pagina en ZwiftPower API endpoints werken **lokaal** maar **niet in productie** omdat Railway de credentials mist.

### Railway Logs Tonen
```
⚠️  ZwiftPower credentials niet geconfigureerd in .env
```

### ✅ Actie Vereist
1. **Ga naar Railway Dashboard**
   - Open project: TeamNL Cloud9 Racing Team
   - Klik op de backend service
   - Ga naar "Variables" tab

2. **Voeg deze environment variables toe:**
   ```
   # ZwiftPower credentials (PRIORITEIT - nodig voor API endpoints)
   ZWIFTPOWER_USERNAME=jeroen.diepenbroek@gmail.com
   ZWIFTPOWER_PASSWORD=CloudRacer-9
   
   # Zwift.com credentials (OPTIONEEL - alleen voor Python scripts)
   ZWIFT_USERNAME=jeroen.diepenbroek@gmail.com
   ZWIFT_PASSWORD=CloudRacer-9
   ```

3. **Wacht op auto-redeploy** (gebeurt automatisch)

4. **Verificatie in Railway logs:**
   ```
   ✅ Moet verschijnen:
   [ZwiftPower] ✅ Credentials configured for: jeroen.diepenbroek@gmail.com
   
   ❌ Mag NIET meer verschijnen:
   ⚠️  ZwiftPower credentials niet geconfigureerd in .env
   ```

### Test na Deployment
Test deze endpoints in productie:
- `https://[jouw-railway-url]/api/zwiftpower/test`
- `https://[jouw-railway-url]/api/zwiftpower/rider/150437`
- `https://[jouw-railway-url]/api/admin/api-documentation/status`

---

## 🎯 Prioriteit 2: Data Architecture Pagina Testen

### Wat is Nieuw (Vandaag Toegevoegd)
✅ Nieuwe admin pagina: **🏗️ Data Architectuur**
- Locatie: `/admin/data-architecture`
- 8e tegel in Admin Dashboard (teal gradient)
- Commit: `4bd2b42`

### Features om te Testen
1. **Open Admin Dashboard** → Klik op 🏗️ Data Architectuur tegel
2. **Bekijk API Overview:**
   - 3 API cards (ZwiftRacing, ZwiftPower, Zwift.com)
   - Authenticatie badges per API
   - Total: 926+ fields, 14 endpoints

3. **Test Expandable Endpoints:**
   - Klik op elk endpoint om details te zien
   - Check "Top Level Fields" badges
   - Bekijk sample JSON data
   - Verifieer field counts kloppen

4. **Check Authentication Info:**
   - ZwiftRacing: 🔓 Public (geen auth)
   - ZwiftPower: 🔐 Username/Password (credentials zichtbaar)
   - Zwift.com: 🔑 OAuth Bearer (credentials zichtbaar)

### Verwachte Resultaten
- Alle 3 API cards zichtbaar met juiste kleuren
- Endpoints expandeerbaar met sample data
- System Architecture diagram bovenaan
- Data Flow visualisatie

---

## 🎯 Prioriteit 3: API Endpoints Live Testen

### Na Railway Credentials Configuratie

#### Test 1: ZwiftPower Rider Data
```bash
curl https://[railway-url]/api/zwiftpower/rider/150437
```
**Verwacht:** JSON met rider profile, FTP, power curve

#### Test 2: Category Berekening
```bash
curl -X POST https://[railway-url]/api/zwiftpower/calculate-category \
  -H "Content-Type: application/json" \
  -d '{"ftp": 242, "weight": 74, "gender": "male"}'
```
**Verwacht:** `{ "category": "B", "wkg": 3.27 }`

#### Test 3: API Status Check
```bash
curl https://[railway-url]/api/admin/api-documentation/status
```
**Verwacht:** Alle 3 APIs "online" status

#### Test 4: Credentials Test
```bash
curl https://[railway-url]/api/zwiftpower/test
```
**Verwacht:** `{ "status": "ok", "authenticated": true }`

---

## 📊 Huidige Status Overzicht

### ✅ Wat Werkt (Lokaal + Productie)
- Frontend admin dashboard met 8 tegels
- ZwiftRacing.app API (public, geen auth) - 5 endpoints, 258+ fields
- Database sync functies (club, riders, events, results)
- User management & access requests
- Data Architecture UI (pagina laadt, maar geen live data)

### ✅ Wat Werkt (Alleen Lokaal)
- **ZwiftPower API endpoints** (via TypeScript service)
  - `/api/zwiftpower/rider/:id`
  - `/api/zwiftpower/compare/:id`
  - `/api/zwiftpower/calculate-category`
  - Gebruikt: `ZWIFTPOWER_USERNAME` + `ZWIFTPOWER_PASSWORD`
  
- **Python Discovery Scripts** (voor documentatie)
  - `complete_api_discovery.py` - Scans all 3 APIs
  - `zp_robust_fetch.py` - ZwiftPower bridge
  - `zwift_direct.py` - Zwift.com OAuth
  - Gebruikt: Hardcoded credentials in scripts

### ❌ Wat Niet Werkt (Productie)
- **ZwiftPower API endpoints** → Missing `ZWIFTPOWER_USERNAME` + `ZWIFTPOWER_PASSWORD` in Railway
- **API Documentation status** → Kan ZwiftPower/Zwift.com status niet checken
- **Data Architecture live data** → Sample data niet beschikbaar zonder credentials

---

## 🔧 Technische Details

### Files Aangepast Vandaag
1. **backend/frontend/src/pages/DataArchitecture.tsx** (NEW)
   - 436 lines
   - Complete API visualization
   - Expandable endpoints met sample data

2. **backend/frontend/src/pages/AdminHome.tsx**
   - Added 8e tegel: Data Architectuur

3. **backend/frontend/src/App.tsx**
   - Added route: `/admin/data-architecture`

4. **RAILWAY_ENV_SETUP.md** (NEW)
   - Complete setup instructies
   - Credentials lijst
   - Verificatie checklist

### Credentials Locaties

#### ZwiftPower Credentials
- **Lokaal .env**: ✅ `ZWIFTPOWER_USERNAME` + `ZWIFTPOWER_PASSWORD` 
- **Backend code**: ✅ Gebruikt `process.env.ZWIFTPOWER_*` in TypeScript services
- **Railway**: ❌ MOET NOG WORDEN TOEGEVOEGD (KRITISCH)
- **Status**: Werkt lokaal, faalt in productie

#### Zwift.com Credentials  
- **Lokaal .env**: ❌ NIET in .env file
- **Python scripts**: ✅ Hardcoded in `complete_api_discovery.py` (alleen testing)
- **Backend code**: ❌ Geen TypeScript service die deze gebruikt (nog)
- **Railway**: ⚠️ Optioneel toevoegen voor toekomstige features
- **Status**: Alleen gebruikt in discovery scripts (Python)

### Python Dependencies
- `zpdatafetch` - ZwiftPower library
- `requests` - HTTP client
- Installatie: `pip install zpdatafetch requests`

---

## 🚀 Stappenplan Morgen

### Stap 1: Railway Setup (5 min)
- [ ] Open Railway dashboard (https://railway.app)
- [ ] Klik op TeamNL Cloud9 project → backend service → Variables
- [ ] Voeg ZWIFTPOWER_USERNAME toe: `jeroen.diepenbroek@gmail.com`
- [ ] Voeg ZWIFTPOWER_PASSWORD toe: `CloudRacer-9`
- [ ] (Optioneel) Voeg ZWIFT_USERNAME toe: `jeroen.diepenbroek@gmail.com`
- [ ] (Optioneel) Voeg ZWIFT_PASSWORD toe: `CloudRacer-9`
- [ ] Wacht op auto-redeploy (~2 min)

### Stap 2: Verificatie (5 min)
- [ ] Check Railway logs voor `✅ Credentials configured`
- [ ] Test `/api/zwiftpower/test` endpoint
- [ ] Check admin Data Architecture pagina

### Stap 3: Live Testing (10 min)
- [ ] Test alle ZwiftPower endpoints
- [ ] Bekijk API Documentation status pagina
- [ ] Expand endpoints in Data Architecture
- [ ] Verifieer sample data correct toont

### Stap 4: Documentatie (5 min)
- [ ] Update README.md met nieuwe features
- [ ] Screenshot Data Architecture pagina
- [ ] Commit RAILWAY_ENV_SETUP.md
- [ ] Update API documentation

---

## 💡 Ideeën voor Volgende Features

### Korte Termijn
- [ ] Live API status monitoring in Data Architecture
- [ ] Refresh button voor sample data
- [ ] Export API documentation to PDF
- [ ] Copy credentials button (secure clipboard)

### Middellange Termijn
- [ ] ZwiftPower power curve visualization
- [ ] Category calculator in frontend
- [ ] Compare rider tool (ZwiftPower vs ZwiftRacing)
- [ ] Bulk rider sync from ZwiftPower

### Lange Termijn
- [ ] Real-time race tracking via Zwift.com API
- [ ] FTP trends over time (historical data)
- [ ] Team power analysis dashboard
- [ ] Automated race reports

---

## 📝 Notities

### Belangrijke URLs
- **Frontend (lokaal)**: http://localhost:5173
- **Backend (lokaal)**: http://localhost:3000
- **Railway**: https://teamnl-cloud9-backend-production.up.railway.app
- **Admin Dashboard**: `/admin`
- **Data Architecture**: `/admin/data-architecture`

### Credentials (voor referentie)
- **Email**: jeroen.diepenbroek@gmail.com
- **Password**: CloudRacer-9
- **Test Rider ID**: 150437 (JRøne | CloudRacer-9 @YouTube)

### Git Status
- **Branch**: main
- **Last Commit**: 4bd2b42 (Data Architecture feature)
- **Status**: Clean, alle changes gecommit
- **Next**: Commit RAILWAY_ENV_SETUP.md en TODO_MORGEN.md

---

## ⚠️ Potentiële Problemen

### Probleem 1: Python Dependencies in Railway
**Symptoom**: Python scripts falen met ImportError
**Oplossing**: Zorg dat `requirements.txt` zpdatafetch bevat
**Check**: Kijk in Railway build logs

### Probleem 2: ZwiftPower Rate Limiting
**Symptoom**: 429 errors na veel requests
**Oplossing**: Implementeer caching, max 60 req/min
**Monitoring**: Check API logs voor rate limit warnings

### Probleem 3: OAuth Token Expiry (Zwift.com)
**Symptoom**: 401 Unauthorized errors
**Oplossing**: Implementeer token refresh logic
**Workaround**: Re-authenticate handmatig

---

## 🎉 Successen Vandaag

✅ Complete API discovery (926+ fields)
✅ Data Architecture pagina gebouwd
✅ 8 admin tegels compleet
✅ Authentication flows gedocumenteerd
✅ Alle endpoints getest lokaal
✅ Clean commits naar Git

## 🎯 Doel Morgen

**Maak de Data Architecture pagina volledig functioneel in productie door Railway credentials te configureren!**

---

*Laatste update: 26 november 2025, 22:30*
*Volgende sessie: 27 november 2025*
