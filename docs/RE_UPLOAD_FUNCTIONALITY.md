# Re-upload Functionaliteit - Duplicate Preventie & Update Logic

## Overzicht

Bij het opnieuw uploaden van een TXT/CSV bestand met Zwift IDs wordt automatisch gecontroleerd welke riders al bestaan. De implementatie zorgt voor:

1. ✅ **Geen duplicates** - Bestaande riders worden niet dubbel toegevoegd
2. ✅ **Automatische updates** - Stats en ClubIDs worden bijgewerkt voor bestaande riders
3. ✅ **Nieuwe riders** - Ontbrekende IDs worden toegevoegd
4. ✅ **Club tracking** - Wijzigingen in club membership worden gedetecteerd

---

## Gedrag per Status

### Status: `added` (Nieuw)
- **Wat**: Rider bestaat nog niet in database
- **Actie**: 
  - Rider wordt toegevoegd als favorite
  - Volledige stats worden opgehaald via API
  - Club wordt geëxtraheerd (indien van toepassing)

### Status: `updated` (Bijgewerkt)
- **Wat**: Rider is al favorite
- **Actie**: 
  - Verse stats worden opgehaald via API
  - Alle velden worden bijgewerkt (FTP, power, etc.)
  - **ClubID check**: Als club is gewijzigd → `clubChanged: true`
  - Nieuwe club wordt geëxtraheerd

### Status: `failed` (Gefaald)
- **Wat**: API call gefaald (bijv. rider bestaat niet op ZwiftRacing)
- **Actie**: Error wordt gelogd, andere riders worden gewoon verwerkt

---

## Implementatie Details

### Service Layer (`src/services/subteam.ts`)

```typescript
async addFavorites(zwiftIds: number[]): Promise<AddFavoritesResult> {
  for (const zwiftId of zwiftIds) {
    // 1. Check bestaande rider
    const existingRider = await this.riderRepo.getRider(zwiftId);
    const alreadyFavorite = existingRider?.isFavorite || false;

    // 2. Haal ALTIJD verse data op (ook voor bestaande riders)
    const riderData = await this.zwiftApi.getRider(zwiftId);
    
    // 3. Detecteer club wijzigingen
    const clubChanged = existingRider && 
                       existingRider.clubId !== riderData.club?.id;
    
    // 4. Upsert (insert or update)
    await this.riderRepo.upsertRider(riderData, riderData.club?.id, {
      isFavorite: true,
      addedBy: 'subteam_api',
      syncPriority: 1,
    });

    // 5. Extract club (altijd, ook bij update)
    if (riderData.club?.id) {
      await this.extractClub(riderData.club.id, riderData.club.name);
    }
  }
}
```

### Database Layer (`src/database/repositories.ts`)

De `upsertRider()` methode gebruikt Prisma's upsert functionaliteit:

```typescript
async upsertRider(data: RiderData, clubId?: number, meta?: RiderMeta) {
  return await prisma.rider.upsert({
    where: { zwiftId: data.riderId },
    update: {
      // Update ALLE velden met verse data
      name: data.name,
      categoryRacing: data.zpCategory,
      ftp: data.ftp,
      clubId: clubId,
      // ... alle andere stats
      lastSynced: new Date(),
    },
    create: {
      // Create nieuwe rider
      zwiftId: data.riderId,
      name: data.name,
      isFavorite: meta.isFavorite,
      // ... alle stats
    }
  });
}
```

---

## API Response Format

### Request
```json
POST /api/subteam/riders
{
  "zwiftIds": [150437, 832234, 123456]
}
```

### Response
```json
{
  "added": 1,           // Nieuwe riders toegevoegd
  "updated": 2,         // Bestaande riders bijgewerkt
  "failed": 0,          // Gefaalde API calls
  "alreadyExists": 0,   // (Deprecated, gebruik 'updated')
  "riders": [
    {
      "zwiftId": 150437,
      "name": "JRøne | CloudRacer-9",
      "status": "updated",
      "clubChanged": false
    },
    {
      "zwiftId": 832234,
      "name": "Anton de Vries",
      "status": "updated",
      "clubChanged": true    // Club is gewijzigd!
    },
    {
      "zwiftId": 123456,
      "name": "New Rider",
      "status": "added"
    }
  ]
}
```

---

## GUI Feedback

De GUI toont een gedetailleerd overzicht na upload:

```
Upload voltooid!
✅ Nieuw toegevoegd: 1
🔄 Bijgewerkt: 2
⚠️  Club gewijzigd voor 1 rider(s)
```

---

## Use Cases

### Use Case 1: Complete Re-upload
**Scenario**: Je upload hetzelfde bestand opnieuw na 1 week

**Gedrag**:
- Alle riders krijgen status `updated`
- Stats worden bijgewerkt (FTP kan zijn veranderd)
- ClubIDs worden gecheckt en bijgewerkt indien nodig
- Geen nieuwe riders toegevoegd

**Waarom nuttig**: Automatisch alle stats up-to-date houden

---

### Use Case 2: Uitgebreide Lijst
**Scenario**: Je voegt 5 nieuwe IDs toe aan een bestaand bestand van 50 IDs

**Gedrag**:
- 50 riders: status `updated` (stats vernieuwd)
- 5 riders: status `added` (nieuwe favorites)
- Totaal: 55 favorites in database

**Waarom nuttig**: Geen handmatig filteren nodig, upload gewoon complete lijst

---

### Use Case 3: Club Transfer Tracking
**Scenario**: Een rider is van club veranderd

**Gedrag**:
- Status: `updated`
- `clubChanged: true` in response
- Oude club blijft in database (voor historical data)
- Nieuwe club wordt toegevoegd aan `clubs` tabel
- Forward scan zal vanaf nu beide clubs volgen

**Waarom nuttig**: Automatische tracking van team wisselingen

---

### Use Case 4: Partial Upload
**Scenario**: Je upload alleen subset van je favorites (bijv. voor specifieke event)

**Gedrag**:
- Alleen riders in het bestand worden verwerkt
- Bestaande favorites die NIET in bestand zitten blijven ongewijzigd
- `isFavorite` flag blijft TRUE voor alle bestaande favorites

**Waarom nuttig**: Selective updates zonder volledige lijst nodig te hebben

---

## Rate Limiting

**Belangrijk**: Bij re-upload worden ALLE riders opnieuw via API opgehaald!

- **Rate limit**: 5 riders/minuut (12 sec tussen calls)
- **50 riders**: ~10 minuten processing tijd
- **100 riders**: ~20 minuten processing tijd

**Best Practice**: 
- Gebruik re-upload niet vaker dan nodig (bijv. 1x per week)
- Voor real-time updates: gebruik scheduler (sync elke 6 uur)
- Voor selectieve updates: gebruik handmatige sync button in GUI

---

## Testing

### Test met Mix van Bestaand + Nieuw

Gebruik `examples/re-upload-test.txt`:
```
# Bestaande riders (3x)
150437
832234
377812

# Nieuwe riders (2x)
123456
789012
```

**Verwacht resultaat**:
- `added: 0-2` (afhankelijk van of 123456 en 789012 bestaan)
- `updated: 3` (bestaande riders worden bijgewerkt)
- GUI toont welke clubs zijn gewijzigd

---

## Database Integriteit

### Constraints die Duplicates Voorkomen

```prisma
model Rider {
  zwiftId Int @id  // PRIMARY KEY - zorgt voor uniqueness
  // ...
}
```

**Prisma upsert garantie**:
- Als `zwiftId` bestaat → UPDATE
- Als `zwiftId` niet bestaat → INSERT
- Atomair operation (geen race conditions)

### Relaties bij Club Wijziging

```sql
-- Voor wijziging
Rider 150437: clubId = 2281 (TeamNL)

-- Na club transfer
Rider 150437: clubId = 9999 (New Team)

-- Database status:
clubs: [2281 (TeamNL), 9999 (New Team)]  -- Beide clubs blijven bestaan
riders: 150437 verwijst nu naar 9999
club_members: bevat leden van beide clubs
```

**Reden**: Historical events blijven gekoppeld aan oude club

---

## Veelgestelde Vragen

### Q: Worden oude stats overschreven?
**A**: Ja, bij re-upload worden alle stats bijgewerkt met verse API data. Voor historical tracking wordt dit binnenkort toegevoegd via `rider_history` tabel (zie roadmap).

### Q: Wat gebeurt er met events van oude club?
**A**: Die blijven behouden! Events zijn gekoppeld aan `race_results`, die verwijzen naar club members. Historical data blijft intact.

### Q: Kan ik een rider "de-favoriten" via re-upload?
**A**: Nee, riders die NIET in het bestand zitten blijven ongewijzigd. Gebruik de delete button in GUI om riders te verwijderen.

### Q: Wat als een rider niet meer bestaat op ZwiftRacing?
**A**: Status wordt `failed`, rider blijft in database met oude data. Je kunt handmatig verwijderen via GUI.

### Q: Hoe weet ik welke riders zijn bijgewerkt?
**A**: Check de `lastSynced` timestamp in de riders tabel. GUI toont ook "Laatst gesynchroniseerd" per rider.

---

## Roadmap / Toekomstige Verbeteringen

1. **Historical Stats Tracking**
   - Nieuwe tabel: `rider_history` 
   - Snapshot van stats bij elke sync
   - Trend analysis (FTP over tijd, etc.)

2. **Differential Upload**
   - Only update riders with `lastSynced > 24h`
   - Skip recente syncs om API calls te besparen

3. **Batch Progress Indicator**
   - Real-time progress bar in GUI
   - "Processing rider 23/50..."

4. **Club Transfer Notifications**
   - Email/webhook bij club wijzigingen
   - Dashboard alert voor belangrijke transfers

5. **Dry-run Mode**
   - Preview wat er gaat gebeuren
   - "Would add: 5, would update: 20"
   - Bevestiging voor grote batches

---

## Conclusie

De re-upload functionaliteit is **intelligent en veilig**:
- ✅ Geen duplicates mogelijk (database constraint)
- ✅ Automatische updates voor bestaande riders
- ✅ Club tracking en change detection
- ✅ Graceful error handling
- ✅ Duidelijke feedback in GUI

**Upload gerust je volledige lijst opnieuw** - het systeem weet wat te doen!
