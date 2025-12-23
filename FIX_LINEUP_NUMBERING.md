# Fix: Team Line-up Matrix Nummering

## Probleem
De nummering in de Team Line-up Matrix (1, 2, 3, ...) is niet consistent. Sommige riders hebben geen nummer of een onjuist nummer.

## Oorzaak
Het veld `lineup_position` in de `team_lineups` tabel was niet verplicht en had geen default waarde. Hierdoor hebben sommige riders geen `lineup_position` of een waarde van 0.

## Oplossing

### 1. Quick Fix (Frontend) ✅ KLAAR
De frontend is aangepast om automatisch sequentiële nummers toe te wijzen als `lineup_position` ontbreekt:

```typescript
const lineup: LineupRider[] = (lineupData?.lineup || []).map((rider, index) => ({
  ...rider,
  lineup_position: rider.lineup_position || index + 1
}))
```

**Bestand**: `frontend/src/pages/TeamViewer.tsx` (regel ~983)

### 2. Database Fix (Aanbevolen)
Voor een permanente oplossing, voer het volgende SQL script uit in Supabase:

**Bestand**: `FIX_LINEUP_POSITION_NUMBERING.sql`

#### Stappen:
1. Open Supabase SQL Editor
2. Plak de inhoud van `FIX_LINEUP_POSITION_NUMBERING.sql`
3. Voer de queries één voor één uit:
   - Stap 1: Bekijk huidige situatie
   - Stap 2: Update alle lineup_position waarden
   - Stap 3: Verificatie
   - Stap 4 (optioneel): Maak NOT NULL constraint

#### Wat doet het script?
- Gebruikt `ROW_NUMBER()` om sequentiële nummers per team toe te wijzen
- Behoudt bestaande volgorde waar mogelijk
- Sorteert op `added_at` voor nieuwe posities

### 3. Preventie (Optioneel)
Om te voorkomen dat dit probleem zich opnieuw voordoet, kun je in Stap 4 van het SQL script de constraint toevoegen die `lineup_position` verplicht maakt.

## Resultaat
Na het uitvoeren van de fix:
- ✅ Alle riders hebben een sequentiële `lineup_position` (1, 2, 3, ...)
- ✅ De nummering is consistent per team
- ✅ Frontend toont altijd correcte nummering

## Test
Na het uitvoeren van de database fix:
1. Refresh de Team Line-up pagina
2. Controleer of alle riders genummerd zijn van 1 t/m aantal riders
3. Controleer meerdere teams

## Alternatieven
Als je de nummering niet wilt tonen, kunnen we deze ook verwijderen uit de UI. Laat me weten wat je voorkeur heeft:
- Optie A: Fix de nummering (zoals nu gedaan)
- Optie B: Verwijder de nummering kolom volledig
- Optie C: Laat de nummering alleen zien als er een geldige waarde is
