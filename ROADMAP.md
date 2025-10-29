# 🚀 Roadmap: Rijdersdashboard voor Rider 150437

**Hoofddoel**: Totaaloverzicht van jouw (rider 150437) racing prestaties, ontwikkeling en event geschiedenis over de laatste 90 dagen.

**Status**: 📅 Start 29 oktober 2025, 17:35  
**Branch**: `feature/rider-dashboard`  
**Target**: Werkend dashboard met 3 user stories in max 4-6 uur werk

---

## 🎯 User Stories

### **US1: Rijdersdashboard - Algemene Informatie** ⏱️ ~1 uur
**Als** rider 150437  
**Wil ik** een overzichtspagina met mijn profiel en huidige stats  
**Zodat** ik snel mijn actuele standing kan zien

**Acceptance Criteria**:
- ✅ Pagina toont: Naam, Avatar (indien beschikbaar), FTP, w/kg, Racing Category
- ✅ Club info: TeamNL (2281), Member count
- ✅ Phenotype: Primary type (Sprinter) met score (96.5/100)
- ✅ Race Rating: Current (1377), Max30 (1453), Max90 (1472.8)
- ✅ Totalen: Finishes (23), Wins (?), DNFs (2), Podiums (?)
- ✅ Responsive design, werkt op desktop en mobile

**Technische implementatie**:
```
Frontend: /public/rider-dashboard.html
Backend: GET /api/riders/:id/profile (existing endpoint uitbreiden)
Data: riders, clubs, rider_phenotypes, rider_race_ratings (already in DB)
```

**Geschatte tijd**: 1 uur (frontend HTML/CSS/JS, API call, styling)

---

### **US2: Rijdersdashboard - 90 Days Ontwikkeling** ⏱️ ~2-3 uur
**Als** rider 150437  
**Wil ik** mijn prestatie-ontwikkeling over de laatste 90 dagen zien  
**Zodat** ik trends kan herkennen en vooruitgang kan meten

**Acceptance Criteria**:
- ✅ Rating trend chart (line graph): Current rating over time (laatste 90 dagen)
- ✅ Event history timeline: Lijst met events (date, name, position, rating change)
- ✅ Performance metrics per event: Avg power, avg speed, normalized power
- ✅ Filter opties: Last 30/60/90 days
- ✅ Click op event → navigeert naar US3 (event detail page)

**Technische implementatie**:
```
Frontend: Uitbreiding van rider-dashboard.html met charts (Chart.js of Recharts)
Backend: 
  - GET /api/riders/:id/events?days=90 (nieuwe endpoint)
  - GET /api/riders/:id/rating-history?days=90 (nieuwe endpoint)
Data: events, race_results, rider_snapshots (vereist event backfill!)
```

**Afhankelijkheden**: 
- ⚠️ **BLOCKER**: Event data moet in database → Zie "Technische Backlog #1"

**Geschatte tijd**: 
- Backend endpoints: 30 min
- Frontend charts + timeline: 1.5 uur
- Styling + responsive: 30 min

---

### **US3: Event Detail Page met Race Resultaten** ⏱️ ~1 uur
**Als** rider 150437  
**Wil ik** details van een specifieke race bekijken  
**Zodat** ik mijn prestatie kan vergelijken met andere deelnemers

**Acceptance Criteria**:
- ✅ Event header: Event naam, datum, route, afstand, deelnemers (total)
- ✅ Jouw resultaat highlighted: Position, finish time, avg power, avg speed
- ✅ Full results lijst: Top 10 + jouw positie + context (bijv. -3 en +3 posities)
- ✅ Sorteerbaar: By position, by name, by team
- ✅ Terug-knop naar dashboard (US2)

**Technische implementatie**:
```
Frontend: /public/event-detail.html?eventId=123456
Backend: 
  - GET /api/events/:id (nieuwe endpoint)
  - GET /api/events/:id/results (nieuwe endpoint met rider 150437 highlight)
Data: events, race_results (met JOIN op riders voor namen)
```

**Geschatte tijd**: 1 uur (frontend table, sorting, backend endpoints)

---

## 🛠️ Technische Backlog (Enablers)

### **#1: Event Scanner & Historical Backfill** ⏱️ ~1-2 uur (+ 3-4 uur API wait time)
**Prioriteit**: 🔴 CRITICAL - Blocker voor US2 en US3

**Probleem**: 
- Database heeft 0 events, 0 race_results voor rider 150437
- ZwiftRacing API heeft GEEN `GET /riders/:id/events` endpoint
- Enige manier: Backwards scan van recent event IDs

**Oplossing**:
1. **Script**: `scripts/backfill-rider-events.ts`
   - Start bij recent event ID (bijv. 5000000)
   - Scan backwards: `GET /public/results/:eventId`
   - Check of rider 150437 in results zit
   - Stop criteria: 25 events gevonden (23 finishes + 2 DNFs uit rider.totalFinishes)
   - Rate limit: 1 event/min → ~200 events scannen = ~3-4 uur

2. **Optimalisatie**:
   - Scan alleen events van laatste 12 maanden (older events less relevant)
   - Cache negative results (event IDs waar rider niet in zit)
   - Save progress elke 10 events (resume mogelijk bij interrupt)

3. **Integratie**:
   - Run script 1x handmatig: `npm run backfill-rider-events 150437`
   - Daarna: Incremental scanner (1x per uur) voor nieuwe events

**Geschatte tijd**: 
- Script development: 1 uur
- API wait time: 3-4 uur (kan in background, niet actief werk)
- Integratie met scheduler: 30 min

**Output**: 
- ~25 events in `events` table
- ~25 race_results in `race_results` table (rider 150437 specifiek)
- ~25 rider_snapshots in `rider_snapshots` table (historical ratings)

---

### **#2: Dashboard API Endpoints** ⏱️ ~1 uur
**Prioriteit**: 🟡 HIGH - Needed voor US1, US2, US3

**Nieuwe endpoints**:

```typescript
// US1: Algemene info (existing uitbreiden)
GET /api/riders/:zwiftId/profile
Response: {
  rider: { name, ftp, weight, category, ... },
  club: { id, name, memberCount },
  phenotype: { primaryType, scores, ... },
  rating: { current, max30, max90 },
  totals: { finishes, wins, dnfs, podiums }
}

// US2: Event geschiedenis
GET /api/riders/:zwiftId/events?days=90&limit=50
Response: [
  {
    eventId, eventName, eventDate, route, distance,
    position, totalRiders, ratingChange,
    avgPower, avgSpeed, normalizedPower
  }
]

// US2: Rating trend
GET /api/riders/:zwiftId/rating-history?days=90
Response: [
  { date: "2025-10-01", rating: 1350 },
  { date: "2025-10-15", rating: 1370 },
  { date: "2025-10-29", rating: 1377 }
]

// US3: Event detail
GET /api/events/:eventId
Response: {
  event: { id, name, date, route, distance, totalRiders },
  riderResult: { position, time, avgPower, avgSpeed },
  allResults: [ /* top 10 + context */ ]
}
```

**Implementatie**:
- Voeg toe in `src/api/routes.ts`
- Gebruik bestaande repositories (extend indien nodig)
- Return data from `events`, `race_results`, `rider_snapshots` tables

**Geschatte tijd**: 1 uur (4 endpoints, logic is straightforward)

---

### **#3: Frontend Chart Library Setup** ⏱️ ~15 min
**Prioriteit**: 🟢 MEDIUM - Needed voor US2

**Opties**:
1. **Chart.js** (recommended) - Simple, lightweight, vanilla JS
2. **Recharts** - React-based (only if we use React)
3. **Plotly.js** - Feature-rich maar heavy

**Implementatie**:
```html
<!-- In rider-dashboard.html -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<canvas id="ratingChart"></canvas>

<script>
const ctx = document.getElementById('ratingChart');
const chart = new Chart(ctx, {
  type: 'line',
  data: { labels: dates, datasets: [{ label: 'Rating', data: ratings }] }
});
</script>
```

**Geschatte tijd**: 15 min (CDN include + basic setup)

---

## 📋 Implementatie Planning

### **Fase 1: Foundation (US1) - Start vandaag** ⏱️ ~2 uur
**Doel**: Werkend dashboard met huidige rider stats (zonder events)

1. ✅ **Maak nieuwe branch**: `feature/rider-dashboard`
2. 📝 **Backend**: Extend `GET /api/riders/:id/profile` endpoint
   - Include: rider, club, phenotype, rating, totals
   - Test met rider 150437
3. 🎨 **Frontend**: Create `/public/rider-dashboard.html`
   - Header met naam + avatar placeholder
   - Stats cards: FTP, w/kg, Category, Club
   - Phenotype section: Type + score
   - Rating section: Current, Max30, Max90
   - Totals section: Finishes, Wins, DNFs, Podiums
4. ✅ **Test**: Open `http://localhost:3000/rider-dashboard.html?riderId=150437`

**Success criteria**: Dashboard toont alle US1 data correct

---

### **Fase 2: Event Backfill (Enabler) - Parallel aan Fase 1** ⏱️ ~1 uur + 3-4 uur wait
**Doel**: Database gevuld met historical event data

1. 📝 **Script**: Create `scripts/backfill-rider-events.ts`
   - Backward scan logica
   - Stop na 25 events
   - Save to database via `EventRepository` + `ResultRepository`
2. ▶️ **Run**: `npm run backfill-rider-events 150437` (in background terminal)
3. 📊 **Monitor**: Check progress logs elke 30 min
4. ✅ **Verify**: `SELECT COUNT(*) FROM events` → Should be ~25

**Success criteria**: Database heeft events + race_results voor rider 150437

---

### **Fase 3: Dashboard Uitbreiding (US2) - Na Fase 2** ⏱️ ~2-3 uur
**Doel**: 90 days ontwikkeling met charts en timeline

1. 📝 **Backend**: Nieuwe endpoints
   - `GET /api/riders/:id/events?days=90`
   - `GET /api/riders/:id/rating-history?days=90`
   - Test met Postman/curl
2. 🎨 **Frontend**: Extend `rider-dashboard.html`
   - Add Chart.js voor rating trend
   - Add event timeline (table of list)
   - Add filter dropdown (30/60/90 days)
   - Click handler → Navigate to event detail
3. ✅ **Test**: Verify chart toont correcte trend, events klikbaar

**Success criteria**: Dashboard toont rating chart + event history

---

### **Fase 4: Event Detail Page (US3) - Na Fase 3** ⏱️ ~1 uur
**Doel**: Detail view per event

1. 📝 **Backend**: Nieuwe endpoints
   - `GET /api/events/:id`
   - `GET /api/events/:id/results`
2. 🎨 **Frontend**: Create `/public/event-detail.html`
   - Event header met info
   - Highlighted result voor rider 150437
   - Sortable results table
   - Back button naar dashboard
3. ✅ **Test**: Navigate from US2 → US3, verify data correct

**Success criteria**: Event page toont full results + rider highlight

---

### **Fase 5: Polish & Deploy - Laatste stap** ⏱️ ~1 uur
**Doel**: Production-ready dashboard

1. 🎨 **Styling**: Responsive design, mobile-friendly
2. 🧪 **Testing**: Regression tests voor nieuwe endpoints
3. 📝 **Documentation**: Update API.md met nieuwe endpoints
4. 🚀 **Deploy**: Push to Railway (optional, kan later)

---

## ⏱️ Tijdsinschatting

| Fase | Onderdeel | Tijd |
|------|-----------|------|
| Fase 1 | US1: Algemene info dashboard | 2 uur |
| Fase 2 | Event backfill script | 1 uur (dev) + 3-4 uur (API wait) |
| Fase 3 | US2: 90 days ontwikkeling | 2-3 uur |
| Fase 4 | US3: Event detail page | 1 uur |
| Fase 5 | Polish & deploy | 1 uur |
| **Totaal** | **Actief werk** | **7-8 uur** |
| | **Inclusief API wait** | **10-12 uur** |

**Planning**:
- **Vandaag (29 okt)**: Fase 1 + start Fase 2 (backfill in background)
- **Morgen (30 okt)**: Fase 3 + Fase 4 (als backfill compleet)
- **Overmorgen (31 okt)**: Fase 5 + testen

---

## 🚧 Risico's & Mitigaties

### **Risico 1: Event backfill duurt te lang (3-4 uur)**
**Mitigatie**: 
- Start backfill vandaag in background terminal
- Werk aan US1 (geen events nodig) tijdens backfill
- Optie: Scan alleen laatste 6 maanden (sneller, minder events)

### **Risico 2: Niet alle 25 events gevonden**
**Mitigatie**:
- Verhoog scan range (500 events → 1000 events)
- Check of rider's finishes count klopt met database
- Eventueel: Manual event IDs toevoegen uit ZwiftPower

### **Risico 3: Rating history data ontbreekt**
**Mitigatie**:
- Use `rider_snapshots` table voor historical ratings
- If empty: Create snapshots bij elke event sync
- Fallback: Toon alleen current rating zonder trend

### **Risico 4: Charts werken niet op mobile**
**Mitigatie**:
- Test Chart.js responsive mode
- Fallback: Tabel in plaats van chart op small screens

---

## 📚 Resources

**Bestaande Code**:
- ✅ `src/database/repositories.ts` - RiderRepository, EventRepository
- ✅ `src/api/routes.ts` - Existing rider endpoint
- ✅ `public/favorites-manager.html` - Reference voor frontend structure

**Nieuwe Bestanden**:
- 📝 `scripts/backfill-rider-events.ts` - Event scanner
- 📝 `public/rider-dashboard.html` - US1 + US2
- 📝 `public/event-detail.html` - US3
- 📝 `src/api/routes.ts` - Extend met nieuwe endpoints

**Documentatie**:
- 📖 `docs/EVENT_DISCOVERY_SOLUTION.md` - Event scanning strategies
- 📖 `docs/API.md` - API documentation (update met nieuwe endpoints)

---

## 🎯 Definition of Done

**Het dashboard is "done" wanneer**:
1. ✅ US1: Rider profile page toont alle algemene stats correct
2. ✅ US2: Dashboard toont rating trend chart (90 days)
3. ✅ US2: Dashboard toont event history timeline
4. ✅ US3: Event detail page accessible via timeline
5. ✅ US3: Event detail toont full results + rider highlight
6. ✅ Alle nieuwe API endpoints gedocumenteerd in API.md
7. ✅ Regression tests passed voor nieuwe endpoints
8. ✅ Responsive design werkt op desktop + mobile
9. ✅ Database heeft ≥20 events voor rider 150437

---

## 🚀 Quick Start

**Start vandaag**:
```bash
# 1. Create feature branch
git checkout -b feature/rider-dashboard

# 2. Start backfill in background (let dit draaien!)
npm run backfill-rider-events 150437 > backfill.log 2>&1 &

# 3. Start development
npm run dev

# 4. Open browser
# http://localhost:3000/rider-dashboard.html?riderId=150437
```

**Monitor backfill progress**:
```bash
# Check hoeveel events gevonden
sqlite3 dev.db "SELECT COUNT(*) FROM events;"

# Check laatste logs
tail -f backfill.log
```

---

**Klaar om te starten?** Ik begin met Fase 1 (US1) en Fase 2 (backfill script)! 🚀
