# Teambuilder Updates - User Stories Implementatie

## 📋 Overzicht
Drie user stories geïmplementeerd voor de Teambuilder om de functionaliteit en gebruiksvriendelijkheid te verbeteren.

---

## ✅ US1: Bestaand Team Bewerken

### Implementatie
- **Edit knop toegevoegd** in lineup header (naast team naam)
- **velo_max_spread toegevoegd** aan EditTeamModal voor vELO teams
- Modal toont nu alle team instellingen die aangepast kunnen worden:
  - Team naam
  - Competitie type (vELO / Category)
  - Competitie naam
  - vELO instellingen: Min/Max Rank + Max Spread
  - Category instellingen: Toegestane categorieën
  - Min/Max aantal riders

### Bestanden Aangepast
- `frontend/src/pages/TeamBuilder.tsx`:
  - Line ~660: Edit knop toegevoegd aan lineup header
  - Line ~1030: velo_max_spread toegevoegd aan EditTeamModal state
  - Line ~1100: velo_max_spread input veld toegevoegd

### Gebruik
1. Selecteer een team
2. Klik op **✏️ Bewerk Team** knop in de lineup header
3. Pas team instellingen aan
4. Klik op **💾 Opslaan**

---

## ✅ US2: Drag & Drop in Rechter Sidebar (Lineup)

### Implementatie
- **LineupRiderCard is nu draggable** binnen de lineup
- Riders kunnen worden **versleept om volgorde te wijzigen**
- Visuele feedback tijdens drag (opacity + ring effect)
- Backend API endpoint toegevoegd: `PUT /api/teams/:teamId/lineup/reorder`
- Automatische positie update na reorder

### Bestanden Aangepast
- `frontend/src/pages/TeamBuilder.tsx`:
  - Line ~920: LineupRiderCard nu sortable met useSortable hook
  - Line ~390: handleDragEnd uitgebreid voor reorder logica
  - Line ~280: reorderRidersMutation toegevoegd
- `backend/src/server.ts`:
  - Line ~1910: Nieuw endpoint `/api/teams/:teamId/lineup/reorder`

### Gebruik
1. Selecteer een team met riders in lineup
2. Sleep een rider in de lineup naar een nieuwe positie
3. Drop de rider op een andere rider
4. De lineup wordt automatisch herordend

### Technische Details
- Gebruikt @dnd-kit/sortable voor drag & drop
- Reorder gebeurt optimistisch (UI update + backend sync)
- Positions worden automatisch 1-indexed

---

## ✅ US3: [+Add] Knop Naast Drag & Drop

### Status
**Reeds geïmplementeerd** - geen wijzigingen nodig!

De [+Add] knop bestaat al in elke DraggableRiderCard en werkt perfect:
- Zichtbaar rechts onderin elke rider card
- Alternatief voor drag & drop
- Voegt rider toe aan lineup met één klik
- Mobile-friendly (grotere touch target)

### Gebruik
1. Zoek een rider in de rechter kolom
2. Klik op **+ Add** knop (of **+** op mobile)
3. Rider wordt toegevoegd aan lineup

---

## 🧪 Test Instructies

### Pre-requisites
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Login met code: `CLOUD9RACING`

### Test US1: Team Bewerken
1. ✅ Maak een nieuw team aan
2. ✅ Klik op het team om het te selecteren
3. ✅ Klik op **✏️ Bewerk Team** knop in lineup header
4. ✅ Wijzig team naam
5. ✅ Voor vELO teams: Wijzig min/max rank en max spread
6. ✅ Voor Category teams: Wijzig toegestane categorieën
7. ✅ Klik op **💾 Opslaan**
8. ✅ Controleer dat wijzigingen zichtbaar zijn

### Test US2: Drag & Drop Reorder
1. ✅ Selecteer een team
2. ✅ Voeg 3+ riders toe aan lineup (via drag of + knop)
3. ✅ Sleep rider #1 naar positie #3
4. ✅ Controleer dat posities updates zijn (cijfers in badges)
5. ✅ Refresh de pagina
6. ✅ Controleer dat nieuwe volgorde behouden blijft

### Test US3: [+Add] Knop
1. ✅ Selecteer een team
2. ✅ Zoek een rider in de rechter kolom
3. ✅ Klik op **+ Add** knop
4. ✅ Controleer dat rider in lineup verschijnt
5. ✅ Test op mobile (touch target moet groot genoeg zijn)

---

## 📱 Mobile Compatibiliteit

Alle functies zijn mobile-friendly:
- ✅ Touch sensors voor drag & drop
- ✅ Grotere touch targets (min 44px)
- ✅ Responsive layout
- ✅ Compacte UI voor kleine schermen

---

## 🔧 Technische Details

### Frontend Stack
- React + TypeScript
- @dnd-kit voor drag & drop
- TanStack Query voor data fetching
- Tailwind CSS voor styling

### Backend Stack
- Node.js + Express
- Supabase (PostgreSQL)
- TypeScript

### API Endpoints
- `GET /api/teams` - Lijst van alle teams
- `GET /api/teams/:teamId` - Team lineup
- `POST /api/teams` - Nieuw team maken
- `PUT /api/teams/:teamId` - Team bijwerken
- `DELETE /api/teams/:teamId` - Team verwijderen
- `POST /api/teams/:teamId/riders` - Rider toevoegen
- `DELETE /api/teams/:teamId/riders/:riderId` - Rider verwijderen
- `PUT /api/teams/:teamId/lineup/reorder` - **NIEUW** - Lineup herordenen

---

## ✨ Verbeteringen voor de Toekomst

### Mogelijke Uitbreidingen
1. **Bulk edit**: Meerdere teams tegelijk bewerken
2. **Copy team**: Dupliceer een team met alle instellingen
3. **Template teams**: Sla team configuraties op als templates
4. **Undo/Redo**: Historie van wijzigingen
5. **Keyboard shortcuts**: Snelle toetsencombinaties voor veelgebruikte acties
6. **Drag visual**: Betere visuele feedback tijdens drag (ghost image)

---

## 📝 Notities

- Alle drie de user stories zijn **volledig geïmplementeerd**
- Geen breaking changes
- Backwards compatible met bestaande data
- Alle tests zijn geslaagd
- Mobile-first design

**Deployment**: Klaar voor productie! 🚀
