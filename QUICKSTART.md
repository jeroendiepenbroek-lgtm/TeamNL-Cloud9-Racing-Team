# TeamNL Cloud9 - Quick Start Guide

## 🚀 Je eerste sync in 5 minuten

### 1. Controleer setup ✓

Alles is al geïnstalleerd en geconfigureerd:
- ✅ Dependencies geïnstalleerd
- ✅ Database schema aangemaakt
- ✅ Prisma client gegenereerd
- ✅ Environment variabelen ingesteld

### 2. Start de server

```bash
npm run dev
```

De server start op `http://localhost:3000`

### 3. Test de API

Open een nieuwe terminal en test:

```bash
# Health check
curl http://localhost:3000/api/health

# Root endpoint (zie alle beschikbare endpoints)
curl http://localhost:3000
```

### 4. Voer je eerste data sync uit

**Optie A: Via CLI (aanbevolen voor eerste keer)**
```bash
# Open nieuwe terminal
npm run sync

# Volg de logs om te zien wat er gebeurt
```

**Optie B: Via API**
```bash
curl -X POST http://localhost:3000/api/sync/club
```

### 5. Bekijk de data

**In de browser:**
```
http://localhost:3000/api/club/members
```

**Of via Prisma Studio (visuele database browser):**
```bash
npm run db:studio
# Opent op http://localhost:5555
```

### 6. Check sync logs

```bash
curl http://localhost:3000/api/sync/logs
```

## 📊 Wat gebeurt er tijdens sync?

1. **API Call**: Haalt alle TeamNL Cloud9 members op van ZwiftRacing.app
2. **Validatie**: Controleert data met Zod schemas
3. **Database**: Slaat riders op in SQLite database
4. **Logging**: Registreert sync in sync_logs tabel

## 🎯 Volgende stappen

### Specifieke rider ophalen
```bash
# Vervang 150437 met een echte rider ID uit je club
curl http://localhost:3000/api/riders/150437
```

### Event resultaten synchroniseren
```bash
# Vervang met een echte event ID
curl -X POST http://localhost:3000/api/sync/event/4879983
```

### Rider geschiedenis bekijken
```bash
curl "http://localhost:3000/api/riders/150437/history?days=30"
```

## 🔧 Development Tips

### Hot reload
De dev server gebruikt `tsx watch`, dus wijzigingen in code worden automatisch herladen.

### Database wijzigen
1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Geef migratie een beschrijvende naam

### Logs debuggen
Set `NODE_ENV=development` in `.env` voor uitgebreide logs.

### API testen met HTTPie (alternatief voor curl)
```bash
# Installeer httpie (optioneel)
sudo apt install httpie

# Mooiere output
http localhost:3000/api/club/members
```

## ⚠️ Rate Limits - Belangrijk!

De ZwiftRacing API heeft strikte limits:

- **Club sync**: Max 1x per 60 minuten
- **Individual riders**: Max 5x per minuut
- **Results**: Max 1x per minuut

De automatische sync draait **elke 60 minuten** om binnen de limits te blijven.

## 🐛 Troubleshooting

### Server start niet
```bash
# Check of port 3000 vrij is
lsof -i :3000

# Kill eventuele processen
kill -9 <PID>
```

### Database errors
```bash
# Reset database (verliest alle data!)
npx prisma migrate reset

# Of verwijder en herstart
rm prisma/dev.db
npm run db:migrate
```

### Sync faalt
```bash
# Check sync logs
curl http://localhost:3000/api/sync/logs | jq

# Check of API key geldig is in .env
cat .env | grep ZWIFT_API_KEY
```

## 📚 Meer info

- **Volledige API docs**: `docs/API.md`
- **Architectuur**: `README.md`
- **Copilot instructies**: `.github/copilot-instructions.md`

---

**Pro tip**: Run `npm run db:studio` in een aparte terminal om real-time je database te bekijken terwijl je sync draait! 🎉
