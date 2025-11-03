# Data Viewing Examples - TeamNL Cloud9 Dashboard

Deze pagina toont voorbeelden van hoe je data kunt bekijken in de TeamNL Cloud9 Dashboard.

## 1. Prisma Studio - Visuele Database Browser

**Start Prisma Studio:**
```bash
npm run db:studio
```

**Opent automatisch in browser op:** `http://localhost:5555`

### Wat zie je in Prisma Studio?

#### Hoofdscherm
- **Linkerpaneel**: Lijst van alle database tabellen
  - Riders (favorieten)
  - ClubMembers (club roster)
  - RaceResults (race data)
  - Events (races)
  - Teams
  - En meer...

- **Hoofdpaneel**: Tabel data met:
  - Sorteerbare kolommen (klik op header)
  - Filtermogelijkheden (klik op filter icon)
  - Zoekfunctie
  - Pagination (voor grote datasets)

#### Features
1. **Bekijk Records**: Klik op een tabel om alle records te zien
2. **Filter Data**: Gebruik filters zoals "equals", "contains", "greater than"
3. **Sorteer**: Klik op kolom headers om te sorteren
4. **Bewerk**: Klik op een record om te bewerken (voorzichtig!)
5. **Navigeer Relaties**: Klik op gerelateerde records (bijv. rider → club)

### Voorbeeld Use Cases

#### Use Case 1: Bekijk Alle Favorieten
1. Open Prisma Studio
2. Klik op "riders" tabel in linkerpaneel
3. Klik op filter icon bij "isFavorite" kolom
4. Selecteer "equals" → "true"
5. Zie alle favorite riders met volledige data!

#### Use Case 2: Zoek Specifieke Rider
1. Open "riders" tabel
2. Klik filter bij "zwiftId" kolom
3. Selecteer "equals" → typ "150437"
4. Zie alle details van deze rider

#### Use Case 3: Top 10 Rankings
1. Open "riders" tabel
2. Klik op "ranking" kolom header
3. Sorteer ascending (oplopend)
4. Scroll naar boven voor top rankings

#### Use Case 4: Recente Race Resultaten
1. Open "race_results" tabel
2. Klik op "eventDate" (via event relation)
3. Sorteer descending (aflopend)
4. Zie nieuwste races eerst

## 2. Terminal Quick View

**Start Quick View:**
```bash
npm run db:view
```

### Output Voorbeeld (Lege Database)
```
╔══════════════════════════════════════════════════════╗
║   TeamNL Cloud9 - Database Quick View               ║
╚══════════════════════════════════════════════════════╝

📊 Tabel Overzicht
────────────────────────────────────────────────────────────
  Riders (Favorites):          0
  Club Members (Roster):       0
  Race Results:                0
  Events:                      0
  Clubs:                       0
  Teams:                       0
  Sync Logs:                   0
  Rider Source Data:           0
  Event Results Source Data:   0

🔄 Laatste Sync
────────────────────────────────────────────────────────────
  Geen sync logs gevonden. Run eerst: npm run sync

💡 Tips
────────────────────────────────────────────────────────────
  📊 Visuele data viewer: npm run db:studio
  🔄 Sync alle data:       npm run sync
  👥 Favorites sync:       npm run sync:favorites
  📈 Events sync:          npm run sync:events:favorites
  🌐 Start dashboard:      npm run dev
```

### Output Voorbeeld (Met Data)
Na het runnen van `npm run sync` en toevoegen van favorites:

```
📊 Tabel Overzicht
────────────────────────────────────────────────────────────
  Riders (Favorites):          5
  Club Members (Roster):       407
  Race Results:                1,234
  Events:                      89
  Clubs:                       1
  Teams:                       2

🔄 Laatste Sync
────────────────────────────────────────────────────────────
  Type:             favorites
  Status:           success
  Records Created:  5
  Records Updated:  0
  Duration:         1234ms
  Timestamp:        30-10-2025 20:15:30

👥 Recent Toegevoegde Riders (Top 5)
────────────────────────────────────────────────────────────
  1. John Doe (150437)
     Ranking: 1234 | Cat: A | Priority: 1
     FTP: 320W | W/kg: 4.2
     Added: 30-10-2025 19:30:00

  2. Jane Smith (234567)
     Ranking: 2456 | Cat: B | Priority: 2
     FTP: 280W | W/kg: 3.8
     Added: 30-10-2025 19:25:00

🏆 Top Performers (Beste Ranking)
────────────────────────────────────────────────────────────
  1. John Doe
     Ranking: #1234 | Cat: A
     FTP: 320W | W/kg: 4.2
     Races: 45 | Wins: 8 (17.8%)

  2. Jane Smith
     Ranking: #2456 | Cat: B
     FTP: 280W | W/kg: 3.8
     Races: 32 | Wins: 4 (12.5%)

🎯 Rider Types (Phenotypes)
────────────────────────────────────────────────────────────
  1. John Doe (150437)
     Type: Sprinter (confidence: 85%)
     Sprinter: 92.5
     Climber: 68.3
     Time Trialist: 75.1

  2. Jane Smith (234567)
     Type: Climber (confidence: 78%)
     Sprinter: 62.4
     Climber: 88.7
     Time Trialist: 71.2

📅 Recente Events (Top 5)
────────────────────────────────────────────────────────────
  1. ZRL Race - Watopia (12345)
     Datum: 29-10-2025 20:00:00
     Deelnemers: 87 | Source: club_recent
     Club: 11818

  2. Tuesday Night Race (12344)
     Datum: 28-10-2025 19:30:00
     Deelnemers: 65 | Source: favorite_historical
     Club: N/A
```

## 3. API Endpoints

**Start de server:**
```bash
npm run dev
```

**Voorbeeld API Calls:**

### Get Alle Favorieten
```bash
curl http://localhost:3000/api/favorites
```

**Response:**
```json
{
  "favorites": [
    {
      "id": 1,
      "zwiftId": 150437,
      "name": "John Doe",
      "ranking": 1234,
      "ftp": 320,
      "powerToWeight": 4.2,
      "categoryRacing": "A",
      "syncPriority": 1,
      "isFavorite": true,
      "addedAt": "2025-10-30T19:30:00Z"
    }
  ],
  "count": 5
}
```

### Get Specifieke Rider
```bash
curl http://localhost:3000/api/riders/150437
```

**Response:**
```json
{
  "rider": {
    "id": 1,
    "zwiftId": 150437,
    "name": "John Doe",
    "ranking": 1234,
    "ftp": 320,
    "ftpWkg": 4.2,
    "powerToWeight": 4.2,
    "categoryRacing": "A",
    "totalRaces": 45,
    "totalWins": 8,
    "totalPodiums": 15,
    "club": {
      "id": 11818,
      "name": "TeamNL Cloud9"
    }
  }
}
```

### Get Rider Race Results
```bash
curl http://localhost:3000/api/riders/150437/results
```

**Response:**
```json
{
  "results": [
    {
      "id": "clk123abc",
      "eventId": 12345,
      "position": 3,
      "category": "A",
      "time": 3600,
      "averagePower": 305,
      "normalizedPower": 320,
      "averageWkg": 4.1,
      "event": {
        "name": "ZRL Race - Watopia",
        "eventDate": "2025-10-29T20:00:00Z",
        "routeName": "Volcano Circuit"
      }
    }
  ],
  "count": 45
}
```

## 4. SQLite CLI (Advanced)

Voor gevorderde gebruikers:

```bash
# Open database
sqlite3 prisma/dev.db

# Voorbeelden:
.tables                # Lijst alle tabellen
.schema riders         # Bekijk riders tabel structuur

# Query voorbeelden:
SELECT COUNT(*) FROM riders;
SELECT name, ranking, ftp FROM riders ORDER BY ranking LIMIT 10;
SELECT COUNT(*) FROM race_results WHERE riderId = 1;

# Exit
.quit
```

## Tips & Tricks

### Tip 1: Combineer Methoden
1. Gebruik `npm run db:view` voor **snel overzicht**
2. Open `npm run db:studio` voor **gedetailleerde inspectie**
3. Gebruik API voor **programmatische toegang**

### Tip 2: Data Exporteren uit Prisma Studio
1. Open Prisma Studio
2. Selecteer data (met filters indien nodig)
3. Browser Developer Tools → Network tab
4. Kopieer JSON response

### Tip 3: Backup Maken
```bash
# SQLite backup (simple)
cp prisma/dev.db prisma/dev.db.backup-$(date +%Y%m%d)

# Of met SQLite CLI
sqlite3 prisma/dev.db ".backup prisma/dev.db.backup"
```

### Tip 4: Database Resetten (VOORZICHTIG!)
```bash
# Full reset (verwijdert ALLE data)
rm prisma/dev.db
npm run db:migrate
npm run sync

# Of alleen data wissen (behoud schema)
sqlite3 prisma/dev.db "DELETE FROM riders;"
```

## Veelgestelde Vragen

### Q: Hoe krijg ik data in mijn database?
**A:** Run eerst een sync:
```bash
npm run sync              # Sync club data
npm run sync:favorites    # Sync favorites
```

### Q: Kan ik data bewerken in Prisma Studio?
**A:** Ja! Maar wees voorzichtig:
- Bewerken van riders: OK (manual overrides)
- Bewerken van source data: NIET aanbevolen (wordt overschreven bij sync)
- Verwijderen van data: Kan relaties breken

### Q: Hoe vaak moet ik synchroniseren?
**A:** 
- Handmatig: Wanneer nodig (nieuwe riders, nieuwe events)
- Automatisch: Server heeft cron job die elke 60 min synct (configureerbaar)

### Q: Kan ik historische data zien?
**A:** Ja! Check de `rider_history` tabel in Prisma Studio voor:
- FTP trends over tijd
- Ranking progressie
- Weight veranderingen
- Power curve ontwikkeling

### Q: Hoe zie ik source data (ruwe API responses)?
**A:** Check de source data tabellen:
- `rider_source_data` - Ruwe rider API responses (JSON)
- `club_source_data` - Club data snapshots
- `event_results_source_data` - Event results met ratings
- `event_zp_source_data` - ZwiftPower data

Bekijk de `rawData` kolom voor complete JSON response.

## Meer Informatie

- **Volledige Handleiding**: [docs/DATA_VIEWING_GUIDE.md](./DATA_VIEWING_GUIDE.md)
- **Quick Reference**: [docs/DATA_VIEWING_QUICKSTART.md](./DATA_VIEWING_QUICKSTART.md)
- **API Docs**: [docs/API.md](./API.md)
- **Database Schema**: [prisma/schema.prisma](../prisma/schema.prisma)

---

**Happy Data Viewing! 📊**
