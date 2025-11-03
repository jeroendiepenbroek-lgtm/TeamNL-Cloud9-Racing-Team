# Data Viewing Guide - TeamNL Cloud9 Dashboard

## Overzicht

Deze handleiding legt uit hoe je de opgehaalde data in de database kunt bekijken en analyseren. Er zijn meerdere methoden beschikbaar, afhankelijk van jouw voorkeur en technische niveau.

## 🎯 Methode 1: Prisma Studio (Aanbevolen)

**Prisma Studio** is een visuele database browser die automatisch is meegeleverd met het project. Dit is de **eenvoudigste en meest gebruiksvriendelijke** manier om je data te bekijken.

### Start Prisma Studio

```bash
npm run db:studio
```

Dit opent automatisch een browser venster op `http://localhost:5555`

### Functies van Prisma Studio

✅ **Visuele Tabelweergave**
- Bekijk alle tabellen in een overzichtelijke interface
- Sorteer en filter data per kolom
- Zoek naar specifieke records

✅ **Data Bewerken**
- Voeg nieuwe records toe
- Bewerk bestaande records
- Verwijder records (voorzichtig!)

✅ **Relaties Navigeren**
- Klik op gerelateerde records om details te zien
- Bijvoorbeeld: van een Rider naar zijn RaceResults

✅ **Filtering & Zoeken**
- Filter op elke kolom
- Gebruik operators zoals: equals, contains, greater than, etc.
- Combineer meerdere filters

### Belangrijke Tabellen

#### 1. **Riders** - Favoriete Riders met Volledige Data
- Bevat alle handmatig toegevoegde favorite riders
- Inclusief power metrics (FTP, power curves), rankings, race statistics
- Filter op `isFavorite=true` voor actieve favorites

#### 2. **ClubMembers** - Club Roster (Read-Only)
- Snapshot van alle club members (407 riders voor Club 11818)
- Beperkte data (basis metrics, rankings)
- Filter op `clubId=11818` voor TeamNL Cloud9

#### 3. **RaceResults** - Race Resultaten
- Koppelt riders aan events met prestatie data
- Bevat power metrics, tijden, posities per race
- Filter op `riderId` of `eventId`

#### 4. **Events** - Race/Event Informatie
- Event details: naam, datum, route, categorie
- Filter op `eventDate` voor recente races
- `dataSource` toont of het 24h (club_recent) of 90d (favorite_historical) data is

#### 5. **RiderRaceRating** - Race Form Tracking
- Current, last, max30, max90 ratings per rider
- Gebruikt voor form analysis

#### 6. **RiderPhenotype** - Rider Type Classificatie
- Sprinter, Climber, Pursuiter, etc. scores
- Primary type classificatie

#### 7. **Source Data Tables** - Ruwe API Data
- `club_source_data`, `rider_source_data`, `event_results_source_data`, etc.
- Bevat complete JSON responses van API
- Handig voor debugging en audit trails

### Tips voor Prisma Studio

🔍 **Zoeken naar specifieke rider:**
1. Open `riders` tabel
2. Filter op `zwiftId` equals `150437` (bijvoorbeeld)
3. Of zoek op `name` contains "jouw naam"

📊 **Top performers bekijken:**
1. Open `riders` tabel
2. Sorteer op `ranking` (ascending voor beste ranking)
3. Of sorteer op `ftp`, `powerToWeight`, etc.

🏁 **Recente race resultaten:**
1. Open `race_results` tabel
2. Join met `events` via relation
3. Filter events op `eventDate` > vandaag - 7 dagen

📈 **Form tracking:**
1. Open `rider_race_ratings` tabel
2. Sorteer op `max30Rating` (descending) voor beste recent form
3. Vergelijk `currentRating` vs `max90Rating` voor trend

## 🔧 Methode 2: SQLite Database Browser

Als je een standalone database browser wilt gebruiken, kan je tools zoals **DB Browser for SQLite** installeren:

### Installatie (Optioneel)

**Windows/Mac/Linux:**
- Download van: https://sqlitebrowser.org/
- Open bestand: `prisma/dev.db`

### Voordelen
- Standalone applicatie (geen server nodig)
- Geavanceerde SQL queries
- Export naar CSV/JSON
- Database schema visualisatie

## 🖥️ Methode 3: CLI Database Queries (Terminal)

Voor snelle checks vanuit de terminal:

```bash
# SQLite CLI gebruiken
sqlite3 prisma/dev.db

# Voorbeelden queries:
.tables                          # Lijst alle tabellen
SELECT COUNT(*) FROM riders;     # Aantal riders
SELECT name, ranking, ftp FROM riders ORDER BY ranking LIMIT 10;  # Top 10 riders
SELECT * FROM events ORDER BY eventDate DESC LIMIT 5;  # Laatste 5 events
.quit                            # Exit
```

## 🌐 Methode 4: Via API Endpoints

De backend API heeft endpoints om data op te halen:

```bash
# Start de server
npm run dev

# Haal data op via API
curl http://localhost:3000/api/riders/150437
curl http://localhost:3000/api/club/members
curl http://localhost:3000/api/events
curl http://localhost:3000/api/favorites
```

Zie [docs/API.md](./API.md) voor alle beschikbare endpoints.

## 📊 Methode 5: Custom View Script (Quick Inspect)

Voor snelle data inspectie hebben we een helper script toegevoegd:

```bash
npm run db:view
```

Dit script toont:
- Aantal records per tabel
- Laatste sync statistieken
- Recent toegevoegde riders
- Upcoming events

## 🎯 Veelvoorkomende Use Cases

### Use Case 1: "Welke riders heb ik toegevoegd?"

**Via Prisma Studio:**
1. `npm run db:studio`
2. Open `riders` tabel
3. Filter: `isFavorite` = true
4. Sorteer op `addedAt` (descending)

**Via CLI:**
```bash
sqlite3 prisma/dev.db "SELECT name, zwiftId, addedAt FROM riders WHERE isFavorite=1 ORDER BY addedAt DESC;"
```

### Use Case 2: "Wat zijn de laatste race resultaten van rider X?"

**Via Prisma Studio:**
1. Open `race_results` tabel
2. Filter: `riderId` = (jouw rider ID)
3. Sorteer op `createdAt` (descending)
4. Klik op event relation voor event details

**Via API:**
```bash
curl http://localhost:3000/api/riders/150437/results
```

### Use Case 3: "Hoeveel data heb ik opgehaald?"

**Via Prisma Studio:**
1. Bekijk record counts onderaan elke tabel
2. Of bekijk `sync_logs` tabel voor sync history

**Via CLI:**
```bash
sqlite3 prisma/dev.db << EOF
SELECT 'Riders' as table_name, COUNT(*) as count FROM riders
UNION ALL
SELECT 'Club Members', COUNT(*) FROM club_members
UNION ALL
SELECT 'Race Results', COUNT(*) FROM race_results
UNION ALL
SELECT 'Events', COUNT(*) FROM events;
EOF
```

### Use Case 4: "Zijn er API errors geweest?"

**Via Prisma Studio:**
1. Open `sync_logs` tabel
2. Filter: `status` = "error"
3. Bekijk `errorMessage` kolom

### Use Case 5: "Wat is de form van mijn team?"

**Via Prisma Studio:**
1. Open `rider_race_ratings` tabel
2. Filter op je team riders
3. Sorteer op `max30Rating` (beste recent form)
4. Vergelijk `currentRating` met `max90Rating` voor trend

### Use Case 6: "Welke rider types heb ik?"

**Via Prisma Studio:**
1. Open `rider_phenotypes` tabel
2. Sorteer op `sprinter`, `climber`, etc. scores
3. Filter op `primaryType` voor specifiek type

## 🔐 Data Privacy & Backup

### Database Locatie
- Development: `prisma/dev.db` (SQLite file)
- Production: PostgreSQL (zie `DATABASE_URL` in `.env`)

### Backup maken
```bash
# SQLite backup (development)
cp prisma/dev.db prisma/dev.db.backup

# Of via Prisma
npx prisma db push --schema prisma/schema.prisma
```

### Database resetten (VOORZICHTIG!)
```bash
# Verwijdert ALLE data en herstart migrations
npm run db:migrate:reset

# Of alleen data verwijderen (behoud schema)
sqlite3 prisma/dev.db "DELETE FROM riders; DELETE FROM race_results; DELETE FROM events;"
```

## 🚨 Troubleshooting

### Probleem: "Prisma Studio start niet"

**Oplossing:**
```bash
# Check of database bestaat
ls -la prisma/dev.db

# Als niet: run migrations
npm run db:migrate

# Probeer opnieuw
npm run db:studio
```

### Probleem: "Ik zie geen data"

**Mogelijke oorzaken:**
1. Data is nog niet gesynchroniseerd
   - Run: `npm run sync` voor club sync
   - Run: `npm run sync:favorites` voor favorites sync

2. Database is leeg na reset
   - Check `sync_logs` voor recente syncs
   - Run manual sync commands

3. Filter is te restrictief
   - Reset filters in Prisma Studio (clear button)

### Probleem: "Permission denied op database file"

**Oplossing:**
```bash
# Fix file permissions
chmod 644 prisma/dev.db

# Of recreate database
rm prisma/dev.db
npm run db:migrate
npm run sync
```

## 📚 Meer Informatie

- **Database Schema**: Zie [prisma/schema.prisma](../prisma/schema.prisma)
- **API Documentatie**: Zie [docs/API.md](./API.md)
- **Data Model**: Zie [docs/DATA_MODEL.md](./DATA_MODEL.md)
- **Sync Guide**: Zie [docs/EVENT_SYNC_GUIDE.md](./EVENT_SYNC_GUIDE.md)

## 🎯 Best Practices

1. **Gebruik Prisma Studio voor beginners** - meest gebruiksvriendelijk
2. **Gebruik API endpoints voor integraties** - programmatische access
3. **Gebruik CLI queries voor automation** - scripts en monitoring
4. **Maak regelmatig backups** - vooral voor productie data
5. **Check sync_logs regelmatig** - monitor data quality
6. **Gebruik rate_limit_logs** - voorkom API throttling

---

**Need help?** Check de [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) of open een issue op GitHub.
