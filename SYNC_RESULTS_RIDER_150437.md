# ✅ SYNC RESULTATEN - Rider 150437

**Datum**: 4 december 2025, 17:30 UTC  
**Rider**: 150437 (JRøne CloudRacer-9 @YT - TeamNL)

---

## 📊 GEVONDEN RESULTS

### Database Status
- **Totaal**: 30 race results ✅ (was 28, +2 nieuw)
- **Range**: 28 augustus 2025 - 30 november 2025
- **Laatste race**: 30-11-2025 (Event 5229579)

### Nieuw Toegevoegd
1. **Event 5229579** (30-11-2025)
   - Categorie: C
   - Tijd: 38:26 (2306 sec)
   - Positie in categorie: 5/107
   - Velo Rating: 1399 (+0 change)
   - ⚠️ Minimale data (geen event name, rank, power curve)

2. **Event 5206710** (27-11-2025)
   - Categorie: ?
   - Tijd: N/A
   - Positie: ?/330 riders
   - Velo Rating: 1399
   - ⚠️ Minimale data (mogelijk DNF)

### Top 5 Recente Races (Complete Data)
1. **Zwift Crit Racing Club - Toefield Tornado** (24-11-2025)
   - Rank: 3 | 3.2 w/kg | 29:42
   
2. **Club Ladder // TeamNL Cloud9 Spark v Team Not Pogi** (20-11-2025)
   - Rank: 9 | 3.19 w/kg | 32:27
   
3. **Zwift Racing League: City Showdown - Open Aqua** (18-11-2025)
   - Rank: 41 | 2.91 w/kg | 76:09
   
4. **Stage 2 - Zwift Unlocked - Race** (17-11-2025)
   - Rank: 9 | 3.22 w/kg | 30:11
   
5. **FRR Tour Britannia - Stage 5** (13-11-2025)
   - Rank: 36 | 2.99 w/kg | 51:25

---

## 🔍 EVENT SIGNUPS

**Status**: ❌ Tabel `event_signups` bestaat NIET in database

**Bevindingen**:
- Tabel wordt wel gebruikt in code (`test-3-dashboards.ts` line 120)
- Maar niet aanwezig in Supabase schema
- Possible tabel moet nog aangemaakt worden
- Of signups worden elders bijgehouden

**Aanbeveling**: 
- Check of er een andere tabel is voor signups (bijv. `event_registrations`, `rider_signups`)
- Of maak nieuwe tabel aan met schema:
  ```sql
  CREATE TABLE event_signups (
    id SERIAL PRIMARY KEY,
    event_id TEXT NOT NULL,
    rider_id INTEGER NOT NULL,
    signed_up_at TIMESTAMPTZ DEFAULT NOW(),
    category TEXT,
    UNIQUE(event_id, rider_id)
  );
  ```

---

## 👤 RIDER PROFILE (API vs Database)

### API (Fresh - 4 dec 2025)
- **Name**: JRøne CloudRacer-9 @YT (TeamNL)
- **Club**: TeamNL (ID: 11818)
- **Country**: Netherlands 🇳🇱
- **Age**: Veteran
- **Weight**: 74 kg
- **Total Finishes**: 22 races
- **Wins**: 0
- **Last Race**: 30-11-2025 14:30:00
- **Current Rating**: 1398.78

### Database (Unified Table)
- **Name**: JRøne CloudRacer-9 @YT (TeamNL) ✅
- **Velo Rating**: 1398.783 ✅
- **Category**: C
- **FTP**: 234 W
- **Weight**: 74 kg ✅
- **Last Synced**: 2-12-2025 14:35:48 (2 dagen geleden)
- **Team Member**: ✅ Yes (Favorite ⭐)

---

## ⚠️ BEKENDE ISSUES

### 1. Events met Minimale Data
Events 5229579 en 5206710 hebben beperkte informatie:
- Geen `event_name` (toont als "undefined")
- Geen `event_date` (toont als "1-1-1970")
- Geen `rank` (overall position)
- Geen power curve data

**Reden**: ZwiftRacing.app API returnt verschillende formats:
- Sommige events: volledig (eventName, rank, power, etc)
- Andere events: minimaal (alleen time, rating, position_in_category)

**Impact**: Dashboard kan deze events tonen maar met beperkte info.

### 2. Event Signups Tracking
Geen signups tracking momenteel omdat tabel niet bestaat.

**Mogelijke oplossingen**:
a) Maak `event_signups` tabel + sync via API
b) Gebruik externe bron (Zwift Companion export)
c) Handmatig bijhouden in spreadsheet

### 3. API Rate Limits
- Event results: **1 request / 60 seconden**
- Rider profile: 5 requests / 60 seconden
- Club members: 1 request / 60 minuten

**Impact**: Bulk syncs duren lang (2 events = ~2 minuten).

---

## ✅ CONCLUSIE

### Wat Werkt
- ✅ 30 race results in database (volledig sinds aug 2025)
- ✅ Rider profile up-to-date in unified table
- ✅ Team membership actief (favorite)
- ✅ API toegankelijk en functioneel
- ✅ Laatste races gesynct (t/m 30-11-2025)

### Wat Ontbreekt
- ❌ Event signups (tabel bestaat niet)
- ⚠️ Event metadata voor 5229579 & 5206710 (minimale data)
- ⚠️ Unified table sync (1 rider ipv 75 - maar voor POC rider OK)

### Aanbevelingen
1. **Nu**: Accepteer dat sommige events minimale data hebben
2. **Binnenkort**: Beslis over event signups tracking strategie
3. **Later**: Unified table sync voor volledige team (POST /api/riders/sync)

---

**Script gebruikt**:
- `check-rider-150437-complete.ts` - Complete status check
- `sync-recent-events-150437.ts` - Event sync met rate limiting
- `inspect-event-5229579.ts` - Raw API response analyse
