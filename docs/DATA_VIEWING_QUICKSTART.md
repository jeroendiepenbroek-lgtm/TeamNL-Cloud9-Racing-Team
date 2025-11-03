# 🔍 Data Viewing - Quick Start

**Vraag**: Kan ik de opgehaalde data zien in Prisma of heb je een dataviewer?

**Antwoord**: Ja! Je hebt **meerdere opties** om je data te bekijken.

## 🎯 Snelste Methode: Prisma Studio

Prisma Studio is een **visuele database browser** die automatisch is meegeleverd:

```bash
npm run db:studio
```

- Opent op: `http://localhost:5555`
- **Gebruiksvriendelijk** - geen SQL kennis nodig
- **Sorteer, filter, zoek** in alle tabellen
- **Bewerk data** direct in de interface
- **Navigeer relaties** tussen riders, events, results

### Wat kan je zien in Prisma Studio?

✅ **Riders** - Alle favorite riders met volledige stats:
- Power metrics (FTP, power curves)
- Rankings & race statistics
- Rider types (sprinter, climber, etc.)

✅ **ClubMembers** - Club roster (407 members):
- Basis stats van alle club members
- Recent activity

✅ **RaceResults** - Alle race resultaten:
- Koppeling tussen riders en events
- Power data, tijden, posities

✅ **Events** - Event/Race informatie:
- Recente en historische races
- Route details, deelnemers

✅ **Source Data Tables** - Ruwe API data:
- Complete JSON responses
- Voor debugging en audit trails

## 🖥️ Terminal Methode: Quick View

Voor een snel overzicht zonder browser:

```bash
npm run db:view
```

Toont:
- Tabel counts (hoeveel records in elke tabel)
- Laatste sync status
- Recent toegevoegde riders
- Top performers (beste rankings)
- Recente events

## 🌐 API Methode: REST Endpoints

Via de API (server moet draaien):

```bash
# Start server
npm run dev

# Haal data op
curl http://localhost:3000/api/favorites
curl http://localhost:3000/api/riders/150437
curl http://localhost:3000/api/events
curl http://localhost:3000/api/club/members
```

Zie [docs/API.md](./API.md) voor alle endpoints.

## 🔧 Andere Database Tools

### SQLite Browser (Desktop App)
Download van: https://sqlitebrowser.org/

Open bestand: `prisma/dev.db`

### SQLite CLI
```bash
sqlite3 prisma/dev.db

# Voorbeelden:
.tables                                    # Lijst alle tabellen
SELECT COUNT(*) FROM riders;               # Aantal riders
SELECT name, ranking FROM riders LIMIT 10; # Top 10 riders
.quit                                      # Exit
```

## 📊 Voorbeeldgebruik

### 1. Bekijk alle favorieten
```bash
# Prisma Studio
npm run db:studio
# → Open 'riders' tabel
# → Filter: isFavorite = true

# Terminal
npm run db:view
# → Toont automatisch recent toegevoegde riders

# API
curl http://localhost:3000/api/favorites
```

### 2. Zoek specifieke rider
```bash
# Prisma Studio
npm run db:studio
# → Open 'riders' tabel
# → Filter: zwiftId = 150437

# API
curl http://localhost:3000/api/riders/150437
```

### 3. Bekijk race resultaten
```bash
# Prisma Studio
npm run db:studio
# → Open 'race_results' tabel
# → Sorteer op eventDate (descending)
# → Klik op rider relatie voor rider details

# API
curl http://localhost:3000/api/riders/150437/results
```

## ❓ Geen Data?

Als je database leeg is, moet je eerst data synchroniseren:

```bash
# Sync club members
npm run sync

# Of sync favorites
npm run sync:favorites

# Check status
npm run db:view
```

## 📚 Meer Informatie

Volledige handleiding: [docs/DATA_VIEWING_GUIDE.md](./DATA_VIEWING_GUIDE.md)

---

**TL;DR**: Gebruik `npm run db:studio` voor visuele data viewing!
