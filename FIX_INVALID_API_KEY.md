# 🔧 Fix: Invalid API Key - E2E Oplossing

## Probleem
Frontend toont "Invalid API key" bij ophalen van data uit `v_rider_complete`.

**Root Cause**: API keys in `.env` files zijn verouderd of incorrect.

---

## ✅ Oplossing in 3 Stappen

### Stap 1: Haal Correcte API Keys Op (1 min)

1. **Open Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/settings/api
   ```

2. **Kopieer de Keys**:
   - **Project URL**: `https://bktbeefdmrpxhsyyalvc.supabase.co`
   - **anon/public key**: Kopieer de lange string onder "anon public"
   - **service_role key** (optional): Voor backend/sync scripts

   ![Supabase API Keys locatie](https://supabase.com/docs/img/api/api-keys.png)

3. **Test de Key Onmiddellijk**:
   ```bash
   ./test-supabase-keys.sh <YOUR_ANON_KEY>
   ```

   **Verwachte output als het werkt**:
   ```
   ✅ API key is VALID!
   ✅ View 'v_rider_complete' EXISTS!
   ```

   **Als je ziet "View does not exist"**, ga naar Stap 2a hieronder.

---

### Stap 2: Update Environment Files

Update de volgende files met je **werkende** anon key:

#### A. Frontend Environment
**File**: `frontend/.env`

```bash
# Supabase Configuration - TeamNL Cloud9
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=<PLAK_HIER_JE_ANON_KEY>
```

#### B. Backend/Scripts Environment (optional)
**File**: `.env.upload`

```bash
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
SUPABASE_ANON_KEY=<PLAK_HIER_JE_ANON_KEY>
SUPABASE_SERVICE_KEY=<PLAK_HIER_JE_SERVICE_ROLE_KEY>
```

---

### Stap 2a: Als View Niet Bestaat - Draai Migrations

Als `./test-supabase-keys.sh` aangeeft dat view niet bestaat:

1. **Open SQL Editor**:
   ```
   https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new
   ```

2. **Kopieer & Run Complete SQL**:
   - Open file: `SETUP_SUPABASE_COMPLETE.sql`
   - Ctrl+A → Ctrl+C (kopieer alles)
   - Plak in SQL Editor
   - Klik **"Run"**

3. **Verify**:
   ```sql
   SELECT COUNT(*) FROM v_rider_complete;
   ```
   
   Verwacht: `0` (view bestaat, maar nog geen data) of meer als er al data is.

4. **Run test script opnieuw**:
   ```bash
   ./test-supabase-keys.sh <YOUR_ANON_KEY>
   ```

---

### Stap 3: Rebuild & Test Frontend

1. **Kill huidige frontend process** (als die draait):
   ```bash
   # In terminal met frontend, druk Ctrl+C
   ```

2. **Rebuild met nieuwe environment**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open in browser**:
   ```
   http://localhost:5173
   ```

4. **Verify in Developer Console**:
   - Open Browser DevTools (F12)
   - Ga naar Console tab
   - Zie je errors? Check of VITE_ variables goed geladen zijn:
   ```javascript
   console.log(import.meta.env.VITE_SUPABASE_URL)
   console.log(import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0,20))
   ```

---

## 🧪 Complete E2E Verificatie

Na bovenstaande stappen, test de volledige flow:

### Test 1: API Direct
```bash
curl "https://bktbeefdmrpxhsyyalvc.supabase.co/rest/v1/v_rider_complete?select=rider_id,full_name,velo_live&limit=3" \
  -H "apikey: <YOUR_ANON_KEY>" \
  -H "Authorization: Bearer <YOUR_ANON_KEY>" | jq .
```

**Verwacht**: JSON array met 3 riders

### Test 2: Frontend Racing Matrix
1. Open http://localhost:5173
2. Racing Matrix moet laden
3. Zie je riders met vELO scores?

### Test 3: Browser Network Tab
1. F12 → Network tab
2. Filter op "v_rider_complete"
3. Zie je 200 status codes?
4. Response bevat rider data?

---

## 🔍 Troubleshooting

### "Invalid API key" blijft verschijnen

**Oorzaak**: Environment variables niet herladen na .env update

**Fix**:
```bash
# Stop frontend (Ctrl+C)
cd frontend
rm -rf node_modules/.vite  # Clear Vite cache
npm run dev
```

### "View does not exist"

**Oorzaak**: Migrations niet gedraaid in Supabase

**Fix**: Volg Stap 2a hierboven

### "No data" / lege tabel

**Oorzaak**: View bestaat maar bevat geen data

**Fix**: Sync rider data
```bash
export SUPABASE_URL="https://bktbeefdmrpxhsyyalvc.supabase.co"
export SUPABASE_SERVICE_KEY="<YOUR_SERVICE_ROLE_KEY>"

# Sync test rider
node fetch-zwiftracing-rider.js 150437

# Or sync complete team
./sync-team-to-supabase.sh
```

### CORS errors in browser

**Oorzaak**: Supabase project heeft API paused of RLS policies blokkeren

**Check**:
1. https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc
2. Project Status = Active?
3. Settings → API → API Status = Active?

---

## ✅ Success Criteria

Je bent klaar als:

- [x] `./test-supabase-keys.sh <KEY>` toont "✅ ALLES WERKT!"
- [x] Frontend laadt zonder errors
- [x] Racing Matrix toont riders met vELO data
- [x] Browser console heeft geen "Invalid API key" errors
- [x] Network tab toont 200 responses voor v_rider_complete

---

## 📚 Related Files

- **Frontend env**: `frontend/.env`
- **Test script**: `./test-supabase-keys.sh`
- **Migrations**: `SETUP_SUPABASE_COMPLETE.sql`
- **API code**: `frontend/src/pages/RacingMatrix.tsx` (line 304-320)
- **Supabase Dashboard**: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc

---

## 🎯 Volgende Stappen

Na deze fix werkt:
- ✅ Frontend haalt data uit Supabase
- ✅ Racing Matrix toont live rider stats
- ✅ Basis workflow gereed voor verdere ontwikkeling

Nu kun je:
1. Data synchroniseren: `./sync-team-to-supabase.sh`
2. Features toevoegen aan dashboard
3. Deploy naar Railway/production
