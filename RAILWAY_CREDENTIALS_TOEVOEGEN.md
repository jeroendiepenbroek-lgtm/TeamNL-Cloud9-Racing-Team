# 🚀 Railway Credentials Toevoegen - Stap voor Stap

**Datum**: 27 november 2025  
**Doel**: ZwiftPower en Zwift.com credentials toevoegen aan Railway productie omgeving

---

## 📋 Credentials om Toe te Voegen

### PRIORITEIT 1: ZwiftPower (Vereist voor API endpoints)
```
ZWIFTPOWER_USERNAME=jeroen.diepenbroek@gmail.com
ZWIFTPOWER_PASSWORD=CloudRacer-9
```

### PRIORITEIT 2: Zwift.com (Optioneel, voor toekomstige features)
```
ZWIFT_USERNAME=jeroen.diepenbroek@gmail.com
ZWIFT_PASSWORD=CloudRacer-9
```

---

## 🔧 Stap-voor-Stap Instructies

### Stap 1: Open Railway Dashboard
1. Ga naar: **https://railway.app**
2. Log in met je account
3. Zoek project: **TeamNL Cloud9 Racing Team**

### Stap 2: Navigeer naar Service Settings
1. Klik op de **backend service** in het project overzicht
2. Klik op de **Variables** tab bovenaan

### Stap 3: Voeg ZwiftPower Credentials Toe
1. Klik op **+ New Variable** knop
2. Voeg toe:
   - Variable Name: `ZWIFTPOWER_USERNAME`
   - Value: `jeroen.diepenbroek@gmail.com`
   - Klik **Add**

3. Klik nogmaals **+ New Variable**
4. Voeg toe:
   - Variable Name: `ZWIFTPOWER_PASSWORD`
   - Value: `CloudRacer-9`
   - Klik **Add**

### Stap 4: (Optioneel) Voeg Zwift.com Credentials Toe
1. Klik **+ New Variable**
2. Voeg toe:
   - Variable Name: `ZWIFT_USERNAME`
   - Value: `jeroen.diepenbroek@gmail.com`
   - Klik **Add**

3. Klik **+ New Variable**
4. Voeg toe:
   - Variable Name: `ZWIFT_PASSWORD`
   - Value: `CloudRacer-9`
   - Klik **Add**

### Stap 5: Wacht op Auto-Redeploy
- Railway detecteert automatisch de nieuwe variabelen
- Redeploy start automatisch (duurt ~2 minuten)
- Volg de progress in de **Deployments** tab

---

## ✅ Verificatie Checklist

### 1. Check Deployment Logs
**Navigeer naar**: Deployments tab → Klik op latest deployment → Scroll door logs

**Zoek naar deze regels:**
```
✅ Moet verschijnen:
[ZwiftPower] ✅ Credentials configured for: jeroen.diepenbroek@gmail.com
[ZwiftPower] Authenticatie succesvol

❌ Mag NIET meer verschijnen:
⚠️  ZwiftPower credentials niet geconfigureerd in .env
```

### 2. Test API Endpoints

#### Test 1: Health Check
```bash
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/zwiftpower/test
```

**Verwacht resultaat:**
```json
{
  "authenticated": true,
  "username": "jeroen.diepenbroek@gmail.com"
}
```

#### Test 2: Rider Profile
```bash
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/zwiftpower/rider/150437
```

**Verwacht resultaat:**
```json
{
  "id": 150437,
  "name": "JRøne | CloudRacer-9 @YouTube",
  "ftp": 242,
  "weight": 74,
  "category": "B"
}
```

#### Test 3: Category Calculation
```bash
curl -X POST https://teamnl-cloud9-racing-team-production.up.railway.app/api/zwiftpower/calculate-category \
  -H "Content-Type: application/json" \
  -d '{"ftp": 242, "weight": 74, "gender": "male"}'
```

**Verwacht resultaat:**
```json
{
  "category": "B",
  "wkg": 3.27,
  "ftp": 242,
  "weight": 74
}
```

### 3. Test Data Architecture Pagina

**Open in browser:**
```
https://teamnl-cloud9-racing-team-production.up.railway.app/admin/data-architecture
```

**Verifieer:**
- ✅ 3 API cards zichtbaar (ZwiftRacing, ZwiftPower, Zwift.com)
- ✅ Authentication badges correct
- ✅ ZwiftPower credentials zichtbaar: jeroen.diepenbroek@gmail.com
- ✅ Endpoints expandeerbaar met sample JSON data
- ✅ Total: 926+ fields, 14 endpoints

### 4. Test API Documentation Status

**Open in browser:**
```
https://teamnl-cloud9-racing-team-production.up.railway.app/admin/api-documentation
```

**Klik op "Status" tab en verifieer:**
- ✅ ZwiftRacing.app: 🟢 Online
- ✅ ZwiftPower: 🟢 Online (na credentials toevoegen)
- ✅ Zwift.com: 🟢 Online

---

## 🎯 Huidige Status

### Lokale Omgeving
- ✅ **Werkt perfect** - credentials in `backend/.env`
- ✅ Alle endpoints functioneel
- ✅ Data Architecture pagina volledig operationeel

### Railway Productie (Voor Credentials)
- ❌ ZwiftPower endpoints: 503 errors
- ❌ Logs tonen: "⚠️ ZwiftPower credentials niet geconfigureerd"
- ✅ ZwiftRacing.app endpoints: Werken (geen auth vereist)
- ✅ Frontend: Volledig operationeel

### Railway Productie (Na Credentials)
- ✅ Alle ZwiftPower endpoints: 200 OK
- ✅ Logs tonen: "✅ Credentials configured"
- ✅ Data Architecture pagina: Volledig functioneel
- ✅ Alle 926+ fields toegankelijk via API

---

## 🔐 Security Notes

- Credentials worden encrypted opgeslagen in Railway
- Alleen zichtbaar in environment variables settings
- Niet zichtbaar in deployment logs of public URLs
- Best practice: gebruik separate credentials per environment (dev vs prod)

---

## 📊 Credential Matrix

| Credential Type | Gebruikt Door | Lokaal (.env) | Railway (Voor) | Railway (Na) | Prioriteit |
|----------------|---------------|---------------|----------------|--------------|------------|
| ZWIFTPOWER_USERNAME | TypeScript API services | ✅ Aanwezig | ❌ Ontbreekt | ✅ Toegevoegd | **HOOG** |
| ZWIFTPOWER_PASSWORD | TypeScript API services | ✅ Aanwezig | ❌ Ontbreekt | ✅ Toegevoegd | **HOOG** |
| ZWIFT_USERNAME | Python discovery scripts | ❌ Hardcoded | ❌ Ontbreekt | ⚠️ Optioneel | LAAG |
| ZWIFT_PASSWORD | Python discovery scripts | ❌ Hardcoded | ❌ Ontbreekt | ⚠️ Optioneel | LAAG |

**Conclusie**: ZwiftPower credentials zijn kritiek voor productie, Zwift.com credentials alleen nodig voor API discovery scripts (niet in runtime).

---

## 🆘 Troubleshooting

### Probleem: Logs tonen nog steeds waarschuwing na toevoegen
**Oplossing**: 
- Wacht 2-3 minuten op volledige redeploy
- Force refresh deployment: Settings → Redeploy

### Probleem: API endpoints geven nog 503 errors
**Oplossing**:
- Verifieer variable namen exact kloppen (hoofdlettergevoelig!)
- Check of er geen spaties in values staan
- Test met: `curl .../api/zwiftpower/test`

### Probleem: Geen "Credentials configured" in logs
**Oplossing**:
- Check of service correct herstart is
- Bekijk volledige log output (niet alleen laatste 10 regels)
- Zoek naar `[ZwiftPower]` in logs

---

## 🎉 Succes Criteria

Je weet dat het werkt wanneer:
1. ✅ Railway logs tonen: "✅ Credentials configured for: jeroen.diepenbroek@gmail.com"
2. ✅ `/api/zwiftpower/test` endpoint retourneert `authenticated: true`
3. ✅ `/api/zwiftpower/rider/150437` retourneert volledige rider data
4. ✅ Data Architecture pagina toont alle 3 APIs als online
5. ✅ Geen 503 errors meer in productie logs

---

## 📞 Next Steps Na Verificatie

Na succesvolle credentials toevoegen:
1. ✅ Test alle ZwiftPower endpoints (zie verificatie checklist)
2. ✅ Exploreer Data Architecture pagina - klik op endpoints
3. ✅ Bekijk API Documentation pagina - test live status checks
4. 🚀 Begin met integratie van ZwiftPower data in dashboards
5. 📈 Monitor performance en rate limits

---

**Geschat tijdsduur**: 5-10 minuten  
**Moeilijkheidsgraad**: ⭐⭐ (Eenvoudig - alleen copy/paste via web interface)  
**Impact**: 🔥🔥🔥 (Kritiek - maakt productie volledig functioneel)
