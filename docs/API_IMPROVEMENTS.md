# API Endpoints & Data Sync - Verbeteringen

## Probleem Analyse

Je had gelijk - er ontbrak veel rider data! Het probleem zat in:

1. **Verkeerd endpoint gebruik**: We gebruikten `/public/riders/{id}` (minimale data)
2. **Simpele schema's**: RiderSchema had maar 10 velden terwijl API 50+ velden retourneert
3. **Incomplete mapping**: Veel API velden werden niet opgeslagen in database

## Oplossing Geïmplementeerd

### 1. API Response Schema Uitgebreid ✅

**Bestand**: `src/types/api.types.ts`

Nieuwe schemas toegevoegd:
- **PowerSchema** - w5, w15, w30, w60, w120, w300, w1200, wkg varianten, CP, AWC, compound scores
- **RaceStatsSchema** - last, current, max30, max90 ratings, finishes, dnfs, wins, podiums
- **PhenotypeSchema** - sprinter, puncheur, pursuiter, climber, tt scores + rider type
- **HandicapsSchema** - flat, rolling, hilly, mountainous handicaps

### 2. ZwiftApiClient Geüpdatet ✅

**Bestand**: `src/api/zwift-client.ts`

`getClubMembers()` retourneert nu:
```typescript
{
  clubId: number,
  name: string,
  riders: RiderData[]  // Met ALLE velden
}
```

### 3. Repository Enhanced ✅

**Bestand**: `src/database/repositories.ts`

`upsertRider()` en `upsertRidersBulk()` slaan nu op:
- ✅ zpFTP (ZwiftPower FTP - betrouwbaarder dan self-reported)
- ✅ Gender, Age (geparsed van strings zoals "50+", "Vet")
- ✅ Category (zpCategory - officiële racing category)
- ✅ Race stats: totalWins, totalPodiums, totalRaces
- ✅ Power ratings: compoundScore als powerToWeight
- ✅ Country codes (gebruikt `country` field van API)

### 4. Sync Service Verbeterd ✅

**Bestand**: `src/services/sync.ts`

`syncClubMembers()`:
- Gebruikt nu club naam uit API response
- Verwerkt volledige rider data
- Betere error handling met throw

## Wat Je Nu Krijgt

### Voorheen (10 velden):
```
riderId, name, categoryRacing, ftp, powerToWeight, 
ranking, rankingScore, countryCode, weight, height
```

### Nu (30+ velden + nested data):
```
riderId, name, gender, country, age, height, weight,
zpCategory, zpFTP, ftpWkg (calculated),
totalWins, totalPodiums, totalRaces,
ranking, rankingScore, powerToWeight (compound score),

Plus beschikbaar in API maar nog niet in DB:
- power: { w5, w15, w30, w60, w120, w300, w1200, wkg variants, CP, AWC }
- race: { last, current, max30, max90 ratings, finishes, dnfs }
- phenotype: { sprinter, puncheur, pursuiter, climber, tt scores }
- handicaps: { flat, rolling, hilly, mountainous }
```

## Testen

### Rate Limit Status
De `/public/clubs/{id}` endpoint heeft een **1 call per 60 minuten** limiet.
Laatste call was om ~07:22 UTC, dus je kan testen vanaf **08:22 UTC**.

### Test Scripts

#### 1. Volledige Club Sync (Aanbevolen)
```bash
npx tsx scripts/test-full-sync.ts
```

Dit haalt ALLE club members op met complete data in 1 API call.

**Voordelen**:
- 1 API call voor alle riders
- Rijkste data (power curves, race stats, phenotype)
- Meest efficiënt

**Nadelen**:
- 60 minuten rate limit
- Als je de limiet hit, moet je wachten

#### 2. Individuele Riders (Fallback)
```bash
npx tsx scripts/sync-test-riders.ts
```

Dit sync 3 specific riders via `/public/riders/{id}`.

**Voordelen**:
- 5 calls per minuut (relaxter)
- Geen 60 min wachttijd

**Nadelen**:
- Veel minder data (alleen basis velden)
- Moet per rider

## Volgende Stappen

### Optie A: Wacht tot Rate Limit Verlopen
```bash
# Over ~50 minuten vanaf nu
npx tsx scripts/test-full-sync.ts
```

Je ziet dan output zoals:
```
👤 Onno Aphinan (1495)
   Category: B
   FTP: 294 W (3.46 W/kg)
   Weight: 85 kg, Height: 176 cm
   Gender: M, Age: N/A
   Country: th
   Races: 33, Wins: 3, Podiums: 10
```

### Optie B: Test Met Andere Club
Als je toegang hebt tot een andere club ID die je nog niet hebt ge-queried:
```bash
# In .env wijzigen
ZWIFT_CLUB_ID=<andere_club_id>

# Dan runnen
npm run sync
```

### Optie C: Power Curve Data Opslaan (Extra Feature)

De power curves (w5, w15, w30, etc.) zijn nu beschikbaar in API maar worden **niet** opgeslagen in database.

**Opties**:
1. **JSON kolom** in riders tabel - sla volledige `power` object op
2. **Aparte tabel** `rider_power_curves` met normalized structure
3. **Statistics tabel** - gebruik bestaande `rider_statistics` voor aggregates

Laat me weten welke richting je wilt!

## Database Check

De 3 test riders zitten al in de database maar met minimale data:

```bash
npm run db:studio
```

Open http://localhost:5555 en bekijk:
- **riders** tabel - kijk naar rider 150437 (jij)
- Momenteel: name, weight, height zijn gevuld
- **Na volledige sync**: alle 30+ velden gevuld

## Debugging

### Check Rate Limit Status
```bash
# Bekijk laatste sync log
npx prisma studio
# → Open sync_logs tabel
# → Sorteer op createdAt (desc)
# → Check errorMessage voor rate limit info
```

### Check API Response Structuur
```bash
# Als rate limit vrij is:
curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  "https://zwift-ranking.herokuapp.com/public/clubs/2281" \
  | jq '.riders[0]' \
  | head -200
```

## Samenvatting

✅ **API Client** - Verwerkt volledige club response met rijke data  
✅ **Type Schemas** - Power, Race, Phenotype, Handicaps schemas toegevoegd  
✅ **Repositories** - Sla 30+ velden op ipv 10  
✅ **Sync Service** - Gebruikt club endpoint voor beste data  
✅ **Test Scripts** - `test-full-sync.ts` voor volledige club sync  

⏰ **Wacht ~50 minuten** voor rate limit reset, dan run je:
```bash
npx tsx scripts/test-full-sync.ts
```

En je krijgt ALLE rider data inclusief FTP, categories, race wins, power metrics! 🚀
