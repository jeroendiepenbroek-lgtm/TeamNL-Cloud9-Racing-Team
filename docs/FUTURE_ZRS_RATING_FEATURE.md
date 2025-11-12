# Future Feature: ZRS / Rating System

**Status**: 📝 Backlog / Research  
**Priority**: Low (MVP desktop + mobile is live)  
**Created**: 2025-11-12

---

## 🎯 Doel

Voeg een rating/scoring systeem toe aan het TeamNL Cloud9 Dashboard om rider prestaties te kunnen vergelijken en ranken.

---

## 💡 Mogelijke Opties

### Optie 1: ZRS (Zwift Racing Score) - ZwiftPower Data
**Bron**: ZwiftPower.com profiel pagina's

**Voor**:
- Officiële Zwift metric
- Breed erkend in community
- Per categorie (A/B/C/D)

**Tegen**:
- ❌ Geen officiële API beschikbaar
- ❌ Scraping = ToS violation
- ❌ Onderhoud nightmare (HTML changes)
- ❌ Performance issues (5+ minuten voor 63 riders)
- ❌ Juridisch risico

**Conclusie**: **NIET DOEN** tenzij ZwiftPower officiële API lanceert

---

### Optie 2: ZwiftRacing.app API Data
**Bron**: Bestaande `/public/riders` en `/public/zp/results` endpoints

**Te Onderzoeken**:
```typescript
// Check of deze velden beschikbaar zijn:
const rider = await zwiftClient.getRider(150437);
// Mogelijk: rider.ZRS, rider.rating, rider.score?

const results = await zwiftClient.getEventResultsZwiftPower(5129235);
// Mogelijk: results[0].ZRS, results[0].raceScore?
```

**Actie**: Test script maken om alle velden in API response te inspecteren

---

### Optie 3: Eigen Rating Systeem ⭐ AANBEVOLEN
**Bron**: Bestaande data in database (riders, results, rider_snapshots)

**Formule Ideeën**:

```typescript
interface TeamRatingScore {
  riderId: number;
  overallScore: number;      // 0-1000
  components: {
    raceFrequency: number;   // Hoeveel races per maand
    avgPosition: number;     // Gemiddelde positie (lager = beter)
    categoryStability: number; // Blijft in cat of upgrades?
    recentForm: number;      // Laatste 5 races trend
    powerConsistency: number; // W/kg stabiliteit
    teamContribution: number; // Participeert in team events?
  };
  trend: 'improving' | 'stable' | 'declining';
}
```

**Implementatie Stappen**:
1. SQL queries voor metrics (AVG, COUNT, STDDEV)
2. Backend service: `rating.service.ts`
3. Database view: `view_rider_ratings`
4. Frontend: Rating badge/indicator in Matrix
5. Admin: Rating configuratie pagina

**Voordelen**:
- ✅ Volledige controle over formule
- ✅ Geen API dependencies
- ✅ Real-time updates
- ✅ Transparant voor gebruikers
- ✅ Configureerbaar per team

---

## 📊 Data Beschikbaar (Nu)

```sql
-- Riders table
SELECT 
  zwift_id,
  name,
  ftp,
  weight,
  watts_per_kg,
  category_racing,
  club_name
FROM riders;

-- Results table
SELECT 
  rider_id,
  event_id,
  position,
  time_seconds,
  points
FROM results;

-- Rider snapshots (historical)
SELECT 
  rider_id,
  snapshot_date,
  ftp,
  weight,
  category_racing
FROM rider_snapshots
ORDER BY snapshot_date DESC;
```

**Mogelijke Metrics**:
- Total races: `COUNT(*) FROM results WHERE rider_id = ?`
- Avg position: `AVG(position) FROM results WHERE rider_id = ?`
- Recent form: `AVG(position) FROM results WHERE rider_id = ? ORDER BY event_date DESC LIMIT 5`
- W/kg trend: `Compare current vs 3 months ago from rider_snapshots`
- Category consistency: `Check category changes in rider_snapshots`

---

## 🎨 UI Design Ideeën

### Racing Matrix Enhancement
```
┌─────────────────────────────────────────────┐
│ Name          │ W/kg │ Cat │ Rating │ Trend │
├─────────────────────────────────────────────┤
│ ⭐ Rider A    │ 4.2  │ A   │ 850 🔥 │ ↗️    │
│ Rider B       │ 3.8  │ B   │ 720    │ →     │
│ Rider C       │ 3.5  │ B   │ 680    │ ↘️    │
└─────────────────────────────────────────────┘
```

### Rating Badge
```html
<div class="rating-badge">
  <span class="score">850</span>
  <span class="label">Team Score</span>
  <span class="trend up">+15</span>
</div>
```

### Detailed Breakdown (Modal/Page)
```
Rating Details: Jeroen Diepenbroek (150437)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Score: 850/1000                    ↗️ +12 this month

Components:
├─ Race Activity       ████████░░ 85/100  (12 races/month)
├─ Average Position    ███████░░░ 72/100  (Avg: 15th)
├─ Category Stability  ██████████ 95/100  (Cat A consistent)
├─ Recent Form         ████████░░ 82/100  (Improving)
├─ Power Consistency   ███████░░░ 78/100  (W/kg: 4.1-4.3)
└─ Team Participation  ██████████ 90/100  (8/10 team events)

Historical Trend:
  850 ●
      │   ╱
  800 │  ╱
      │ ╱
  750 ●
      └─────────────────
      Oct  Nov  Dec
```

---

## 🚀 Implementation Plan (Toekomst)

### Phase 1: Research & Design (1 dag)
- [ ] Test ZwiftRacing.app API voor ZRS/rating velden
- [ ] Design rating formule met team input
- [ ] Wireframes voor UI components
- [ ] SQL queries voor metrics testen

### Phase 2: Backend (2-3 dagen)
- [ ] `backend/src/services/rating.service.ts`
- [ ] SQL view: `view_rider_ratings`
- [ ] API endpoints: `GET /api/ratings/:riderId`
- [ ] Cron job: Daily rating recalculation
- [ ] Unit tests

### Phase 3: Frontend (2 dagen)
- [ ] Rating badge component
- [ ] Matrix column: "Rating"
- [ ] Sorteer op rating
- [ ] Rating detail modal/page
- [ ] Trend indicators (↗️ ↘️ →)

### Phase 4: Admin (1 dag)
- [ ] Rating formula configuratie
- [ ] Weight per component (sliders)
- [ ] Manual rating override
- [ ] Bulk recalculate button

### Phase 5: Polish (1 dag)
- [ ] Animaties voor rating changes
- [ ] Export ratings naar CSV
- [ ] Rating leaderboard pagina
- [ ] Documentation

**Total Estimate**: ~7-9 development dagen

---

## 📝 Notes

- MVP (v1.2) bevat **geen rating systeem** - focus op core functionaliteit
- ZwiftPower heeft **geen officiële API** (stand: nov 2025)
- Scraping is **tegen ToS** en technisch fragiel
- Eigen rating systeem is **meest duurzame oplossing**
- Kan later altijd ZRS toevoegen als API beschikbaar komt

---

## 🔗 Related Issues

- User story: "Ik wil riders kunnen ranken op prestaties"
- Technical debt: Explore all ZwiftRacing.app API response fields
- Enhancement: Historical performance tracking (rider_snapshots analysis)

---

## 📚 Resources

- ZwiftRacing.app API docs: `docs/ZWIFT_API_ENDPOINTS.md`
- Database schema: `docs/COMPLETE_SUPABASE_SCHEMA.md`
- Current riders data model: `backend/src/types/index.ts`
- ZwiftPower forum: https://forums.zwift.com/c/zwiftpower/

---

**Last Updated**: 2025-11-12  
**Owner**: TBD  
**Milestone**: Post-MVP (v2.0?)
