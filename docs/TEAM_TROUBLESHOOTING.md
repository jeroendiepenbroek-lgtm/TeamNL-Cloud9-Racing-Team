# Team Management - Troubleshooting Guide

## Veelvoorkomende Problemen en Oplossingen

### 1. Import Errors

#### "Team ID is verplicht"
```bash
# ❌ Fout
npm run import -- --ids "150437"

# ✅ Correct
npm run import -- --team 1 --ids "150437"
```

#### "Geen riders om te importeren"
**Oorzaak:** Leeg CSV/JSON bestand of ongeldige IDs

**Oplossing:**
```bash
# Controleer bestand eerst met dry-run
npm run import -- --team 1 --csv riders.csv --dry-run

# Zorg dat CSV header "zwiftId" bevat (hoofdletterongevoelig)
```

#### "Could not fetch rider from Zwift API"
**Oorzaak:** Rider ID bestaat niet of API is niet bereikbaar

**Oplossing:**
- Controleer of Zwift ID correct is
- Check API status: `curl http://localhost:3000/api/health`
- Wacht 1 minuut en probeer opnieuw (rate limiting)

---

### 2. Rate Limiting

#### "Rate limit bereikt"
**Symptomen:** Import stopt halverwege, errors in logs

**Oplossing:**
```bash
# Gebruik kleinere batch size
npm run import -- --team 1 --csv riders.csv --batch-size 3

# Of wacht 15 minuten en hervat met gefaalde IDs
```

**Best Practices:**
- Max 5 riders per minuut voor single adds
- Gebruik bulk endpoint voor >10 riders
- Monitor sync status: `curl http://localhost:3000/api/team/1/stats`

---

### 3. Duplicate Members

#### "Rider is already a member"
**Oorzaak:** Rider al toegevoegd aan team

**Oplossing:**
```bash
# Check huidige members
curl http://localhost:3000/api/team/1

# Verwijder eerst indien nodig
curl -X DELETE http://localhost:3000/api/team/1/members/150437

# Of negeer - import script skipte automatisch duplicates
```

---

### 4. Sync Issues

#### Members blijven op "pending" status
**Oorzaak:** Background sync gefaald of nog bezig

**Diagnose:**
```bash
# Check sync status
curl http://localhost:3000/api/team/1/stats

# Check sync logs
curl http://localhost:3000/api/sync/logs
```

**Oplossing:**
```bash
# Trigger handmatige sync
curl -X POST http://localhost:3000/api/team/1/sync

# Of herstart server (sync herstart automatisch)
npm run dev
```

#### Sync status blijft op "syncing"
**Oorzaak:** Process crashed tijdens sync

**Oplossing:**
```sql
-- Reset sync status in database
UPDATE team_members 
SET syncStatus = 'pending', syncError = NULL 
WHERE teamId = 1 AND syncStatus = 'syncing';
```

```bash
# Dan trigger nieuwe sync
curl -X POST http://localhost:3000/api/team/1/sync
```

---

### 5. Database Issues

#### "Unique constraint violation"
**Oorzaak:** Rider al in team (SQLite constraint)

**Oplossing:** Wordt automatisch afgehandeld door import script (skip)

#### "Database is locked"
**Oorzaak:** Prisma Studio of andere process heeft lock

**Oplossing:**
```bash
# Stop Prisma Studio
pkill -f "prisma studio"

# Of herstart server
npm run dev
```

---

### 6. CSV/JSON Format Issues

#### CSV niet herkend
**Probleem:**
```csv
# ❌ Fout - spaties in header
Zwift ID, Role, Notes
150437, captain, Leader

# ✅ Correct - geen spaties
zwiftId,role,notes
150437,captain,Leader
```

#### JSON parse error
**Probleem:**
```json
// ❌ Fout - trailing comma
[
  { "zwiftId": 150437 },
  { "zwiftId": 123456 },
]

// ✅ Correct
[
  { "zwiftId": 150437 },
  { "zwiftId": 123456 }
]
```

---

### 7. API Connection Issues

#### "ECONNREFUSED" error
**Oorzaak:** Server niet gestart

**Oplossing:**
```bash
# Check of server draait
curl http://localhost:3000/api/health

# Start server
npm run dev
```

#### "Invalid API key"
**Oorzaak:** Verkeerde of ontbrekende API key

**Oplossing:**
```bash
# Check .env file
cat .env | grep ZWIFT_API_KEY

# Update indien nodig
ZWIFT_API_KEY=your-api-key-here
```

---

### 8. Performance Issues

#### Import duurt te lang
**Oorzaak:** Grote batch of langzame API

**Optimalisaties:**
```bash
# Parallel batches (alleen voor verschillende teams)
npm run import -- --team 1 --csv team1.csv &
npm run import -- --team 2 --csv team2.csv &

# Kleinere batches voor betere progress tracking
npm run import -- --team 1 --csv riders.csv --batch-size 3
```

#### Te veel geheugen gebruik
**Oorzaak:** Grote CSV/JSON bestanden

**Oplossing:** Split bestand in kleinere chunks:
```bash
# Split CSV in chunks van 50 riders
split -l 51 riders.csv riders-chunk-  # +1 voor header

# Import per chunk
npm run import -- --team 1 --csv riders-chunk-aa
npm run import -- --team 1 --csv riders-chunk-ab
```

---

## Debug Mode

### Enable Verbose Logging
```bash
# Set environment variable
export LOG_LEVEL=debug

# Run import
npm run import -- --team 1 --csv riders.csv
```

### Check Prisma Queries
```bash
# Enable query logging in .env
DATABASE_URL="file:./dev.db?connection_limit=1&socket_timeout=10"

# Prisma logs queries to console
npm run dev
```

---

## Recovery Scenarios

### Scenario 1: Import halverwege gestopt

```bash
# 1. Check wat succesvol was
curl http://localhost:3000/api/team/1/stats

# 2. Maak nieuw CSV met alleen gefaalde IDs
# riders-retry.csv

# 3. Import met retry
npm run import -- --team 1 --csv riders-retry.csv
```

### Scenario 2: Team per ongeluk verwijderd

```bash
# Helaas niet te herstellen zonder backup
# Prevention: gebruik dry-run eerst!
npm run import -- --team 1 --csv riders.csv --dry-run
```

### Scenario 3: Verkeerde role toegewezen

```bash
# Opties:
# 1. Verwijder en voeg opnieuw toe
curl -X DELETE http://localhost:3000/api/team/1/members/150437
curl -X POST http://localhost:3000/api/team/1/members/150437 \
  -H "Content-Type: application/json" \
  -d '{"role":"captain"}'

# 2. Of update direct in database via Prisma Studio
npm run db:studio
```

---

## Monitoring & Maintenance

### Dagelijkse Checks
```bash
# Team sync status
curl http://localhost:3000/api/team/1/stats

# Recent sync logs
curl http://localhost:3000/api/sync/logs | jq '.[] | select(.syncType == "rider_history")'
```

### Wekelijkse Maintenance
```bash
# Trigger volledige team sync
curl -X POST http://localhost:3000/api/team/1/sync

# Check database size (SQLite)
ls -lh prisma/dev.db

# Cleanup oude sync logs (via SQL)
# DELETE FROM sync_logs WHERE createdAt < date('now', '-30 days');
```

---

## Contact & Support

Voor problemen die niet hier staan:

1. Check [docs/TEAM_API.md](TEAM_API.md) voor API referentie
2. Check sync logs: `curl http://localhost:3000/api/sync/logs`
3. Enable debug logging: `export LOG_LEVEL=debug`
4. Open een issue op GitHub met:
   - Error message
   - Import command gebruikt
   - Sync logs
   - Team stats output

---

## Preventieve Maatregelen

### Checklist voor Grote Imports

- [ ] Test eerst met dry-run
- [ ] Start met kleine batch (5-10 riders)
- [ ] Monitor logs en sync status
- [ ] Gebruik CSV/JSON voor >20 riders
- [ ] Plan import buiten piek tijden
- [ ] Backup database voor grote operaties
- [ ] Respecteer rate limits (5 calls/min)
- [ ] Documenteer import voor audit trail

### Pre-Import Validatie

```bash
# 1. Verify team exists
curl http://localhost:3000/api/team/1

# 2. Check current member count
curl http://localhost:3000/api/team/1/stats | jq '.stats.totalMembers'

# 3. Dry-run import
npm run import -- --team 1 --csv riders.csv --dry-run

# 4. Verify API is responsive
curl http://localhost:3000/api/health

# 5. Check available rate limit quota
curl http://localhost:3000/api/sync/stats
```

---

## Veelgestelde Vragen

**Q: Kan ik meerdere teams tegelijk importeren?**
A: Ja, run import script parallel voor verschillende teams. Niet voor zelfde team (race conditions).

**Q: Wat gebeurt er als import crashed?**
A: Riders die succesvol waren blijven in team. Retry met gefaalde IDs.

**Q: Kan ik undo doen van import?**
A: Nee, maar je kunt members individueel verwijderen of hele team deleten.

**Q: Hoelang duurt sync per rider?**
A: ~2-5 seconden per rider (API call + 90-day history processing)

**Q: Wat is max team size?**
A: Geen harde limiet, maar >100 riders = langzame imports (rate limits)

**Q: Kan ik tijdens import andere API calls doen?**
A: Ja, maar let op rate limits (max 5 rider calls/min)
