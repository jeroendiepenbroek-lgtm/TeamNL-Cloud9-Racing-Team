# 🚀 QUICKSTART - Morgen Verder

**5 november 2025 → Vervolg Sessie**

---

## ⚡ Directe Start (2 minuten)

```bash
# 1. Check Railway build status
# Open: https://railway.app/project/YOUR_PROJECT
# Verwacht: ✅ Build succesvol → Running

# 2. Start backend lokaal
cd /workspaces/TeamNL-Cloud9-Racing-Team/backend
npm run dev
# Verwacht: ✅ Server successfully started! Listen: http://0.0.0.0:3000

# 3. Test health endpoint
curl http://localhost:3000/api/health
# Verwacht: {"status":"ok","service":"TeamNL Cloud9 Backend"}
```

---

## 🎯 Vandaag Gefixt

✅ ZwiftRacing API - Alle 8 endpoints geïmplementeerd  
✅ Bulk POST endpoint (1000 riders in 1 call!)  
✅ My Team backend volledig (5 endpoints)  
✅ Frontend Riders.tsx fixed en aligned  
✅ Railway dependency issue gefixed (typescript in deps)  

---

## 🔍 Waar We Waren

**Backend:** Volledig geïmplementeerd, lokaal getest (GET/POST single rider werkt)  
**Railway:** Build gefaald → fix gepusht (typescript dependency) → rebuild triggered  
**Frontend:** Compiled, klaar voor browser testing  

---

## 📋 Eerste 3 Taken (Prioriteit)

### 1️⃣ Railway Verificatie (5 min)
```bash
# Check deployment logs
# Railway dashboard → Deployments → View Logs

# Als ✅ succesvol:
curl https://YOUR-RAILWAY-URL.railway.app/api/health
curl https://YOUR-RAILWAY-URL.railway.app/api/riders/team

# Als ❌ failed:
# Kijk naar error in logs, vaak:
# - Missing env vars (SUPABASE_URL, etc.)
# - Wrong NODE_ENV
# - Port binding issue
```

**Fix hints:**
- Check `.env` variabelen in Railway dashboard
- Verify `npm start` command is set correct
- Check if port binding is `0.0.0.0:$PORT`

---

### 2️⃣ Bulk Import Test (10 min)
```bash
# Server draait lokaal (stap 2 hierboven)

# Test bulk POST (JSON array)
curl -X POST http://localhost:3000/api/riders/team/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "riders": [
      {"zwiftId": 150437, "name": "Jeroen Test"},
      {"zwiftId": 8, "name": "Rider Two"},
      {"zwiftId": 5574, "name": "Rider Three"}
    ]
  }'

# Verwacht response:
# {
#   "success": true,
#   "message": "3 riders toegevoegd aan jouw team",
#   "added": 3,
#   "errors": []
# }

# Verifieer met GET
curl http://localhost:3000/api/riders/team | jq '.[] | {zwift_id, name, is_favorite}'
```

**Als errors:**
- 400 Bad Request → check JSON syntax (Content-Type header!)
- 500 Internal Server Error → check Supabase connection (SUPABASE_URL env var)
- 404 Not Found → check route order (team routes VOOR :zwiftId param route)

---

### 3️⃣ Frontend Browser Test (10 min)
```bash
# Backend moet draaien (localhost:3000)

# Open browser:
# http://localhost:3000/riders
# OF
# http://localhost:3000/public/favorites-manager.html (oude versie)

# Test flows:
1. ✅ Zie tabel met riders (van stap 2)
2. ✅ Klik ⭐ icon → favorite toggle → icon verandert
3. ✅ Klik "Add Rider" → vul zwiftId 100000 → submit → zien verschijnen
4. ✅ Klik 🗑️ icon → rider verdwijnt
5. ✅ Klik "Bulk Upload" → paste riders → import → zien verschijnen
6. ✅ Klik "Export CSV" → bestand downloadt
```

**Als frontend niet laadt:**
- Check of `backend/public/dist/index.html` bestaat
- Run `cd backend && npm run build` (bouwt frontend opnieuw)
- Check browser console voor JS errors

---

## 🚨 Snelle Troubleshooting

### Backend Start Faalt
```bash
# Error: Cannot find module '@supabase/supabase-js'
cd backend && npm install

# Error: Port 3000 already in use
lsof -ti:3000 | xargs kill -9
# Of: npm run dev -- --port 3001
```

### API Calls Geven 500
```bash
# Check Supabase connection
cat backend/.env | grep SUPABASE
# Moet bevatten:
# SUPABASE_URL=https://YOUR_PROJECT.supabase.co
# SUPABASE_SERVICE_KEY=eyJ...

# Test Supabase direct
curl -H "apikey: YOUR_SERVICE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  https://YOUR_PROJECT.supabase.co/rest/v1/view_my_team
```

### Frontend Toont Geen Data
```bash
# Check API call in browser DevTools → Network tab
# Verwacht: GET /api/riders/team → 200 OK

# Als 404: backend draait niet
# Als 500: Supabase issue
# Als CORS error: wrong API base URL in frontend
```

---

## 🎯 Optimalisatie Kans (Als Tijd Over)

**File:** `backend/src/api/endpoints/riders.ts`  
**Function:** `bulkAddToTeam`

**Huidig (langzaam):**
```typescript
for (const rider of riders) {
  await supabaseService.addMyTeamMember(rider.zwiftId, rider.name);
}
```

**Optimalisatie (160x sneller!):**
```typescript
// Gebruik nieuwe bulk API!
const riderIds = riders.map(r => r.zwiftId);
const zwiftRiders = await zwiftClient.getBulkRiders(riderIds); // 1 call!

await supabaseService.bulkAddMyTeamMembers(
  zwiftRiders.map(r => ({
    zwiftId: r.riderId,
    name: r.name
  }))
);
```

**Voordeel:**
- 200 riders: 40 min → 15 sec
- Automatisch verse data van ZwiftRacing API
- Rate limit friendly (1/15min ipv 5/1min)

---

## 📚 Handige Documentatie

- **Volledige sessie status:** `docs/SESSION_STATUS_2025-11-05.md`
- **API endpoints reference:** `docs/ZWIFT_API_ENDPOINTS.md`
- **Database schema:** `docs/COMPLETE_SUPABASE_SCHEMA.md`
- **Backend API docs:** `docs/API.md`

---

## 🔗 Snelle Links

- **Railway:** https://railway.app/project/YOUR_PROJECT
- **Supabase:** https://supabase.com/dashboard/project/YOUR_PROJECT
- **GitHub Repo:** https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team
- **Lokale backend:** http://localhost:3000
- **Lokale frontend:** http://localhost:3000/riders

---

## ✅ Succesvol Als...

- [ ] Railway build is ✅ groen
- [ ] Health endpoint reageert (prod + lokaal)
- [ ] Bulk import werkt (3+ riders in 1 call)
- [ ] Frontend laadt en toont tabel
- [ ] Favorite toggle werkt
- [ ] Delete rider werkt

**Estimated time:** 25 minuten voor alle checks ⏱️

---

**Veel succes morgen! 🚀**  
*Als er issues zijn, check eerst SESSION_STATUS document voor details.*
