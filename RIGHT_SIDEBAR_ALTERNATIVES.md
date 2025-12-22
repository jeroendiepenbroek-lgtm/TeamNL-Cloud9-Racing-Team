# Right Sidebar Alternatieven - Professionele UX Scenario's

## Huidige Situatie
De Right Sidebar toont team lineup details wanneer een team geselecteerd wordt. Deze blijft sticky op desktop maar neemt veel schermruimte in beslag.

## Scenario 1: Inline Expanded View ✅ GEÏMPLEMENTEERD

### Beschrijving
Bij klik op expand-knop vouwt de TeamCard uit tot volledige breedte en toont de lineup **in hetzelfde gebied** waar de team cards staan. De left sidebar verdwijnt automatisch voor maximale ruimte.

### Voordelen
- ✅ Geen context switch - blijf in hetzelfde scherm
- ✅ Meer ruimte voor lineup (volledige breedte beschikbaar)
- ✅ Natuurlijke flow: expand → zie details → collapse → terug naar overzicht
- ✅ Mobile-first: werkt perfect op tablets/phones
- ✅ Droppable: volledige expanded view is drop zone

### Nadelen
- ❌ Je ziet geen andere teams terwijl je de lineup bekijkt
- ❌ Switchen tussen teams vereist expand/collapse

### Gebruik Cases
- **Perfect voor**: Focus op 1 team tegelijk, iPad/tablet gebruik
- **Minder geschikt voor**: Snel vergelijken van meerdere teams

### Implementatie Status
- ✅ Component gemaakt: `TeamCardExpanded.tsx`
- ✅ Geïntegreerd in `IntegratedTeamBuilder.tsx`
- ✅ Droppable met visual feedback (groen/rood border)
- ✅ Grid layout met responsive columns (1-4 cols)
- ✅ Compact rider cards met avatar, stats, remove button

---

## Scenario 2: Bottom Drawer (Mobile Pattern)

### Beschrijving
Bij klik op team komt er een drawer van onderaf omhoog (50% schermhoogte, swipeable naar 80%). Native mobile feel, bekend patroon van iOS/Android apps.

### Voordelen
- ✅ Bekende mobile UX - gebruikers kennen het patroon
- ✅ Je blijft teams zien onder de drawer
- ✅ Swipe gesture support (omhoog/omlaag)
- ✅ Responsive: full width op mobile, centered op desktop

### Nadelen
- ❌ Bedekt deel van het scherm (teams blijven gedeeltelijk verborgen)
- ❌ Minder geschikt voor desktop (drawer is typisch mobile pattern)
- ❌ Geen side-by-side vergelijking mogelijk

### Gebruik Cases
- **Perfect voor**: iPhone/Android usage, quick peek in lineup
- **Minder geschikt voor**: Desktop power users, langdurige editing

### Implementatie Vereisten
- React component met `translate-y` animatie
- Swipe gesture library (bijv. `react-swipeable`)
- Backdrop overlay met `onClick` close
- Height states: 50%, 80%, closed

---

## Scenario 3: Modal Overlay (Full Screen Focus)

### Beschrijving
Bij klik op team opent een fullscreen modal overlay met darkened backdrop. Volledige focus op lineup editing, escape key/click outside sluit modal.

### Voordelen
- ✅ Volledige focus - geen afleidingen
- ✅ Veel ruimte voor uitgebreide details (stats, charts, etc.)
- ✅ Keyboard shortcuts (ESC, arrow keys tussen teams)
- ✅ Professioneel - bekend van admin panels

### Nadelen
- ❌ Grootste context switch - verlaat team overzicht volledig
- ❌ Kan claustrofobisch voelen
- ❌ Moeilijk om teams te vergelijken (moet modal telkens sluiten)

### Gebruik Cases
- **Perfect voor**: Gedetailleerde lineup editing, analytics, statistics
- **Minder geschikt voor**: Quick team assembly, multi-team workflows

### Implementatie Vereisten
- React Portal voor z-index control
- Focus trap (toegankelijkheid)
- ESC key handler
- Backdrop click-outside handler

---

## Scenario 4: Split Panel (Resizable)

### Beschrijving
Scherm split in twee kolommen: links teams (30-70% width), rechts lineup (30-70% width). Gebruiker kan splitter draggen om verhouding aan te passen. Professionele IDE-style layout.

### Voordelen
- ✅ Side-by-side comparison mogelijk
- ✅ Flexibel - gebruiker bepaalt layout
- ✅ Professioneel - bekend van code editors
- ✅ Persistent state (ratio blijft opgeslagen)

### Nadelen
- ❌ Complexer te implementeren (resize logic)
- ❌ Op mobile impractical (te weinig breedte)
- ❌ Kan overweldigend zijn (te veel informatie tegelijk)

### Gebruik Cases
- **Perfect voor**: Desktop power users, team comparison workflows
- **Minder geschikt voor**: Mobile/tablet, casual users

### Implementatie Vereisten
- Resize handle component
- MouseMove event handlers
- LocalStorage voor persistence
- Min/max width constraints

---

## Scenario 5: Tabs + Quick View (Hybrid)

### Beschrijving
Team cards krijgen een "👁️ Quick View" button die een **compact preview toont** (3-5 riders in horizontale scroll). Voor volledige details klik je "📋 Full Lineup" die naar een dedicated page/tab gaat.

### Voordelen
- ✅ Best of both worlds - quick peek én diepte
- ✅ Minimaal invasief (small preview)
- ✅ Dedicated space voor uitgebreide analytics
- ✅ Schaalbaarheid - full page kan veel features bevatten

### Nadelen
- ❌ Extra navigatie layer (quick view → full page)
- ❌ Context switch bij full page
- ❌ Complexer state management

### Gebruik Cases
- **Perfect voor**: Apps met uitgebreide analytics/stats features
- **Minder geschikt voor**: Simple lineup assembly

### Implementatie Vereisten
- Popover component voor quick view
- React Router route voor full lineup page
- Shared state/cache tussen views

---

## Aanbeveling per Use Case

### 🏅 Voor iPad/Tablet Touch Workflow
**Winner: Scenario 1 - Inline Expanded** (al geïmplementeerd!)
- Native touch feel, geen fiddly sidebars
- Volledige breedte voor droppable area
- Simple expand/collapse flow

### 💻 Voor Desktop Power Users
**Winner: Scenario 4 - Split Panel**
- Maximum efficiency, side-by-side comparison
- Flexibele layout control
- Professionele tool feel

### 📱 Voor Mobile/Smartphone
**Winner: Scenario 2 - Bottom Drawer**
- Native mobile pattern (iOS/Android style)
- Swipe gestures (intuïtief)
- Teams blijven zichtbaar

### 🎯 Voor Casual Users (quick team assembly)
**Winner: Scenario 1 - Inline Expanded** (huidige keuze)
- Eenvoudigste flow, geen learning curve
- Focus op 1 ding tegelijk
- Geen overweldigende UI

---

## Implementatie Planning

### Phase 1: Inline Expanded (DONE ✅)
- [x] TeamCardExpanded component
- [x] Droppable support + visual feedback
- [x] Responsive grid (1-4 columns)
- [x] Compact rider cards met stats

### Phase 2: Bottom Drawer (Optional)
- [ ] BottomDrawer component met animatie
- [ ] Swipe gesture support
- [ ] Mobile-first responsive breakpoints
- [ ] Backdrop overlay + click-outside

### Phase 3: Split Panel (Future)
- [ ] ResizablePanel component
- [ ] LocalStorage persistence
- [ ] Min/max width constraints
- [ ] Desktop-only feature flag

---

## Technische Details - Inline Expanded

### Component Structuur
```
TeamCardExpanded.tsx
├── Header
│   ├── Team name + rider count badge
│   ├── Competition name
│   └── Close button
├── Drop Indicator Overlay (conditionally rendered)
│   └── Shows "✓ Drop hier" or "✗ Team vol"
└── Lineup Grid (responsive 1-4 cols)
    └── RiderCard (compact)
        ├── Avatar + name + badges
        ├── Stats (FTP, W/kg, ZRS)
        └── Remove button
```

### Droppable ID Pattern
- **Normal TeamCard**: `team-{teamId}`
- **Lineup Sidebar**: `lineup-sidebar-{teamId}`
- **Expanded View**: `team-expanded-{teamId}` ✨ NEW

### handleDragEnd Logic
```typescript
const teamIdMatch = overId.match(/team-(\d+)/)
const sidebarMatch = overId.match(/lineup-sidebar-(\d+)/)
const expandedMatch = overId.match(/team-expanded-(\d+)/)

if (teamIdMatch || sidebarMatch || expandedMatch) {
  const teamId = parseInt((match)![1])
  // Add rider to team...
}
```

### Visual Feedback States
- **Idle**: Orange border, subtle shadow
- **Drag Over + Can Add**: Green border, green shadow glow
- **Drag Over + Full**: Red border, red shadow glow
- **Drop Overlay**: Semi-transparent backdrop + centered message

---

## User Testing Feedback Checklist

### Inline Expanded
- [ ] Is expand button vindbaar? (positie, icoon)
- [ ] Is collapse behavior intuïtief? (button + impliciete sluiting)
- [ ] Voelt droppable area groot genoeg?
- [ ] Is rider grid overzichtelijk? (niet te vol, goede spacing)

### Bottom Drawer (indien geïmplementeerd)
- [ ] Is swipe gesture discoverable?
- [ ] Voelt drawer height natuurlijk? (50% vs 80%)
- [ ] Is backdrop opacity goed? (niet te donker/licht)
- [ ] Werkt click-outside sluiten intuïtief?

### Split Panel (indien geïmplementeerd)
- [ ] Is resize handle vindbaar?
- [ ] Voelt drag smooth? (geen jank)
- [ ] Worden ratios correct opgeslagen?
- [ ] Is min/max width logisch?

---

## Conclusie

**Scenario 1 (Inline Expanded)** is geïmplementeerd en biedt de beste balans tussen:
- Touch-friendly UX (iPad/tablet primary use case)
- Simplicity (geen learning curve)
- Focus (1 team tegelijk, geen afleiding)
- Droppable area size (volledige breedte beschikbaar)

Voor toekomstige expansie kunnen **Bottom Drawer** (mobile) en **Split Panel** (desktop power users) als features toegevoegd worden via feature flags of user preferences.
