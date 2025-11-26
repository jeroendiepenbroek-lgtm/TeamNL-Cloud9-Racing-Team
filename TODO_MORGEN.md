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

2. **Voeg deze 2 environment variables toe:**
   ```
   ZWIFTPOWER_USERNAME=jeroen.diepenbroek@gmail.com
   ZWIFTPOWER_PASSWORD=CloudRacer-9
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
- ZwiftRacing.app API (public, geen auth)
- Database sync functies
- User management
- Access requests

### ✅ Wat Werkt (Alleen Lokaal)
- ZwiftPower API endpoints
- Zwift.com OAuth access
- Python bridge scripts (zp_robust_fetch.py, zwift_direct.py)
- Data Architecture pagina met live data

### ❌ Wat Niet Werkt (Productie)
- ZwiftPower API endpoints → **Oorzaak: Missing credentials in Railway**
- API Documentation status indicators voor ZwiftPower/Zwift.com
- Data Architecture expandable endpoints met échte data

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
- **Lokaal**: `backend/.env` ✅ Geconfigureerd
- **Git**: NIET gecommit (.gitignore) ✅ Veilig
- **Railway**: ❌ MOET NOG WORDEN TOEGEVOEGD
- **Code**: Hardcoded in discovery scripts (alleen voor testing)

### Python Dependencies
- `zpdatafetch` - ZwiftPower library
- `requests` - HTTP client
- Installatie: `pip install zpdatafetch requests`

---

## 🚀 Stappenplan Morgen

### Stap 1: Railway Setup (5 min)
- [ ] Open Railway dashboard
- [ ] Voeg ZWIFTPOWER_USERNAME toe
- [ ] Voeg ZWIFTPOWER_PASSWORD toe
- [ ] Wacht op redeploy

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
