# TeamNL Cloud9 Racing Team - Version 2.0 Snapshot
**Datum**: 19 november 2025  
**Status**: Production Ready ✅

## 🎯 Werkende Functionaliteit

### Event Dashboard (EventsModern.tsx)
**Status**: ✅ Volledig operationeel

**Features:**
- ✅ US1: Event type + sub-type display (`Race · Scratch`)
- ✅ US2: Route naam GROOT (text-2xl) prominent onder event title
- ✅ US2: Route wereld zichtbaar onder route naam
- ✅ US2: Route profiel badges (Flat/Rolling/Hilly/Mountainous) met kleuren
- ✅ US2: Distance (km) en Elevation (m) als badges
- ✅ Countdown timer met urgency kleuren
- ✅ 2-koloms moderne layout (Route links, Details rechts)
- ✅ Team signups per categorie (A/B/C/D/E)
- ✅ Collapsible team member lijst per categorie
- ✅ Lookforward hours filter (36h default, configureerbaar naar 168h)

**API Endpoint**: `/api/events/upcoming?hours=X`
**Filters correct**: ✅ Hours parameter werkt (273 events in 48h)

**Data Sources:**
- Database: `view_upcoming_events` (PostgreSQL view)
- Enrichment: Route data via `/api/routes` cache
- Signups: `zwift_api_event_signups` table

### Racing Data Matrix (RacingDataMatrixModern.tsx)
**Status**: ✅ Volledig operationeel

**Features:**
- ✅ vELO Rank badges (Diamond/Ruby/Emerald/Sapphire/Amethyst/Platinum/Gold/Silver/Bronze/Copper)
- ✅ vELO ranges correct (max exclusief: 999.78 → Silver, 1000+ → Gold)
- ✅ ZP Power rankings (A+/A/B/C/D categories)
- ✅ Team-relative power kleuren (Gold/Silver/Bronze highlighting)
- ✅ Power intervals: 15s, 1min, 5min, 20min, CP (Critical Power)
- ✅ Sorteerbare kolommen met filter badges
- ✅ Multi-select filters (vELO tiers, ZP categories)

**vELO Tiers (correcte ranges):**
1. Diamond: 2200+ (cyan gradient)
2. Ruby: 1900-2200 (red/pink gradient)
3. Emerald: 1650-1900 (emerald/green gradient)
4. Sapphire: 1450-1650 (blue/indigo gradient)
5. Amethyst: 1300-1450 (purple/violet gradient)
6. Platinum: 1150-1300 (slate gradient)
7. Gold: 1000-1150 (yellow/amber gradient)
8. Silver: 850-1000 (gray gradient)
9. Bronze: 650-850 (orange gradient)
10. Copper: 0-650 (orange/red gradient)

### Sync Services
**Status**: ✅ Operationeel met NEAR/FULL strategie

#### NEAR Sync (High Priority)
- **Frequentie**: Elke 15 min (:05, :20, :35, :50)
- **Mode**: `near_only`
- **Threshold**: 30 min voor event start
- **Functie**: Sync signups voor events die binnen 30 min starten
- **Endpoint**: `POST /api/sync-v2/events/near`

#### FULL Sync (Complete Dataset)
- **Frequentie**: Elke 3 uur (:50)
- **Mode**: `full_scan`
- **Lookforward**: 168 uur (7 dagen, configureerbaar)
- **Functie**: 
  - Alle events ophalen van ZwiftRacing API
  - Route enrichment (naam, wereld, profiel, elevation)
  - Signups sync voor NEAR events
  - FAR events only events save (geen signups)
- **Endpoint**: `POST /api/events/sync`

#### Rider Sync
- **Frequentie**: Elke 90 min
- **Rate limit**: Safe (16x per dag)
- **Functie**: Sync team riders (my_team_members)
- **Endpoint**: `POST /api/sync-v2/riders`

### Route Enrichment Pipeline
**Status**: ✅ Werkt correct

**Flow:**
1. **Routes cache laden**: `GET /api/routes` (24h TTL)
   - 196 routes gecached met profile/elevation/world
2. **Event fetch**: `GET /api/events/upcoming` (ZwiftRacing API)
   - Bevat `routeId` maar GEEN route details
3. **Enrichment**: `getCachedRouteById(routeId)` (O(1) lookup)
   - Route naam, wereld, profiel, elevation ophalen
4. **Database save**: `upsertZwiftApiEvents()`
   - Opslaan met route columns: `route_name`, `route_world`, `route_profile`, `elevation_m`

**Database Schema:**
```sql
ALTER TABLE zwift_api_events 
  ADD COLUMN elevation_m INTEGER,
  ADD COLUMN route_name TEXT,
  ADD COLUMN route_world TEXT,
  ADD COLUMN route_profile TEXT;
```

### API Endpoints (Werkend)
**Events:**
- ✅ `GET /api/events/upcoming?hours=X` - Filtered events (respecteert hours!)
- ✅ `GET /api/events/:eventId` - Single event details
- ✅ `GET /api/events/:eventId/signups` - Event signups
- ✅ `POST /api/events/sync` - Manual FULL sync

**Riders:**
- ✅ `GET /api/riders/team` - Team riders (view_my_team)
- ✅ `GET /api/riders/:riderId` - Single rider
- ✅ `POST /api/riders/sync` - Manual rider sync

**Sync V2:**
- ✅ `POST /api/sync-v2/riders` - Rider sync
- ✅ `POST /api/sync-v2/events/near` - NEAR event sync
- ✅ `GET /api/sync-v2/metrics` - Sync status metrics

**Config:**
- ✅ `GET /api/sync/config` - Current sync config
- ✅ `PUT /api/sync/config` - Update config (lookforwardHours, etc.)

### Database Views
**Status**: ✅ Correct na migratie

**view_upcoming_events:**
- Bevat ALLE route columns (elevation_m, route_name, route_world, route_profile)
- Filters: `time_unix >= NOW()`
- Joins: LEFT JOIN met signups voor counts
- Query filter: `.gte('time_unix', now).lte('time_unix', future)` ✅

**view_team_events:**
- Zelfde als view_upcoming_events maar met team filter
- HAVING clause: `team_rider_count > 0`
- Bevat team_riders JSONB array

**view_my_team:**
- Team riders lijst (voor sync en filters)
- Bron: `riders` table

## 🔧 Recente Fixes (19 nov 2025)

### 1. vELO Rank Range Bug
**Probleem**: Rider met 999.78 vELO viel tussen Silver (max: 999) en Gold (min: 1000)  
**Oplossing**: Max waarde nu EXCLUSIEF (`< tier.max` ipv `<=`)  
**Commit**: `9cd3b6f`

### 2. Hours Filter Bug
**Probleem**: API gaf ALLE events terug (811 ipv 273), negeerde hours parameter  
**Oplossing**: `getUpcomingEvents()` filtert nu met `.lte('time_unix', future)`  
**Commit**: `a6f595d`

### 3. Event Cards Layout
**Probleem**: Route info niet prominent, alles onder elkaar  
**Oplossing**: 2-koloms grid, route naam GROOT (text-2xl), profiel badges met shadow  
**Commit**: `4cb1363`

### 4. Sync Route Enrichment
**Probleem**: `route_id` type mismatch (STRING → INTEGER), elevation float → INTEGER  
**Oplossing**: Parse routeId als number, Math.round() voor elevation  
**Commits**: `62eb942`, `74fcce7`

### 5. Deprecated Methods
**Probleem**: `upsertEvents()` deprecated  
**Oplossing**: Vervangen door `upsertZwiftApiEvents()`  
**Commit**: `c843bdd`

## 📊 Huidige Metrics (Production)

**Events in database:**
- 48h window: 273 events ✅
- Route data coverage: ~100% (alle events hebben route_name/profile)
- Last sync: Recent (route data aanwezig)

**Team riders:**
- 75 riders in view_my_team
- vELO data: Aanwezig (bijv. rider 1725494 = 999.78)

**Sync status:**
- NEAR sync: Draait elke 15 min
- FULL sync: Draait elke 3 uur
- Rider sync: Draait elke 90 min
- No errors in production ✅

## 🎨 UI/UX Status

**Modern Design System:**
- Gradient headers (blue → indigo)
- Urgency colors (red/orange/yellow voor countdown)
- Profile badges:
  - Flat: `bg-emerald-50 text-emerald-700`
  - Rolling: `bg-sky-50 text-sky-700`
  - Hilly: `bg-orange-50 text-orange-700`
  - Mountainous: `bg-red-50 text-red-700`
- Responsive: Mobile-first met sm/md/lg breakpoints
- Icons: Lucide React (Calendar, MapPin, TrendingUp, Mountain, etc.)

**Typography:**
- Event title: `text-xl font-bold`
- Route name: `text-2xl font-bold` (PROMINENT)
- Route world: `text-base font-semibold`
- Badges: `text-sm font-bold` met `px-3 py-1.5`

## 🚀 Deployment

**Platform**: Railway  
**Auto-deploy**: Push naar `main` branch  
**Build tijd**: ~3 minuten  
**URL**: https://teamnl-cloud9-racing-team-production.up.railway.app

**Environment:**
- Node.js v22.21.1
- PostgreSQL (Supabase)
- Frontend: Vite React (served from backend/public/dist)

## 📝 Configuratie

**Sync Config (aanpasbaar via API):**
```json
{
  "lookforwardHours": 168,
  "thresholdMinutes": 30,
  "intervalMinutes": 60,
  "mode": "full_scan"
}
```

**Cron Schedulers:**
- Rider sync: `*/90 * * * *` (elke 90 min)
- NEAR sync: `5,20,35,50 * * * *` (4x per uur)
- FULL sync: `50 */3 * * *` (elke 3u op :50)
- Cleanup: `0 3 * * 0` (zondag 03:00)

## ✅ Werkt Correct (Getest 19 nov 2025)

1. ✅ Event Cards tonen route profiles (Flat/Rolling/Hilly/Mountainous)
2. ✅ Hours filter werkt (48h = 273 events, niet 811)
3. ✅ vELO ranks correct (999.78 = Silver, 1000+ = Gold)
4. ✅ Route enrichment via cache (196 routes)
5. ✅ Sync draait automatisch (NEAR/FULL strategie)
6. ✅ 2-koloms layout met prominente route info
7. ✅ Event type + sub-type display (Race · Scratch)
8. ✅ Distance (km) en Elevation (m) badges
9. ✅ Team signups per categorie met collapse
10. ✅ Countdown timer met urgency kleuren

## 🔮 Volgende Stappen (Potentieel)

**Code Cleanup (versie 2.1):**
- [ ] Remove deprecated sync endpoints (FAR sync solo)
- [ ] Consolideer duplicate route logic
- [ ] Clean up oude comments en debug logs
- [ ] Optimize imports en bundle size

**Features (backlog):**
- [ ] Event favorite/bookmark functie
- [ ] Export events naar calendar (.ics)
- [ ] Push notificaties voor team events
- [ ] Historical event results dashboard
- [ ] Route difficulty calculator (m/km ratio)

---

**⚠️ BELANGRIJK**: Huidige functionaliteit is STABLE en PRODUCTION READY.  
Alle wijzigingen moeten backwards compatible zijn en getest worden voor deployment.
