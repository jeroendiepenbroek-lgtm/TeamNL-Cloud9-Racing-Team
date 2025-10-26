# Team Management Troubleshooting

Veelvoorkomende problemen en oplossingen voor team management features.

## Import Problemen

### "Rate limit bereikt voor endpoint"

**Probleem:** Te veel API calls in korte tijd.

**Oplossing:**
```bash
# Gebruik kleinere batch size
npm run import -- --team 1 --csv riders.csv --batchSize 3

# Wacht tussen imports (automatisch gedaan door CLI)
# Voor grote imports: split in meerdere bestanden
```

**Best Practice:**
- Max 5 riders per minuut
- Gebruik batch size van 3-5
- Splits grote imports (50+ riders) over meerdere sessies

---

### "Rider X not found in API"

**Probleem:** Rider ID bestaat niet of is niet publiek beschikbaar.

**Oplossing:**
1. Verifieer Zwift ID op zwift.com of zwiftpower.com
2. Check of rider publiek profiel heeft
3. Verwijder ongeldige IDs uit import bestand
4. Retry met correcte IDs:
```bash
# Gefaalde imports worden opgeslagen in failed-imports-*.json
npm run import -- --team 1 --json failed-imports-1234567890.json
```

---

### "Rider already a member of this team"

**Probleem:** Duplicate import poging.

**Oplossing:**
- CLI detecteert dit automatisch en slaat duplicates over
- Check team members voor de import:
```bash
curl http://localhost:3000/api/team/1
```

---

### "CSV parse error" of "Invalid JSON"

**Probleem:** Bestandsformaat incorrect.

**Oplossing CSV:**
```csv
zwiftId,name,role,notes
150437,Rider Name,member,Optional notes
123456,Another Rider,captain,Team leader
```

**Oplossing JSON:**
```json
{
  "riders": [
    { "zwiftId": 150437, "role": "member" },
    { "zwiftId": 123456, "role": "captain" }
  ]
}
```

**Of simpele array:**
```json
[150437, 123456, 789012]
```

---

## Sync Problemen

### Sync status blijft "pending"

**Probleem:** Background sync niet gestart of vastgelopen.

**Diagnostiek:**
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

# Of via test script
npm run test:team
```

---

### Sync status "error"

**Probleem:** Sync gefaald voor specifieke rider.

**Diagnostiek:**
```bash
# Get team details met error details
curl http://localhost:3000/api/team/1 | jq '.members[] | select(.syncStatus=="error")'
```

**Veelvoorkomende oorzaken:**
1. **API rate limit**: Wacht 5-10 min, retry sync
2. **Rider heeft geen race history**: Normaal, rider wordt wel toegevoegd
3. **API timeout**: Retry met handmatige sync

**Oplossing:**
```bash
# Retry pending/error syncs
curl -X POST http://localhost:3000/api/team/1/sync

# Of verwijder en voeg opnieuw toe
curl -X DELETE http://localhost:3000/api/team/1/members/150437
curl -X POST http://localhost:3000/api/team/1/members/150437
```

---

### "No events found in last 90 days"

**Probleem:** Rider heeft geen recente races.

**Dit is normaal!** Niet alle riders racen actief. De rider wordt wel toegevoegd aan het team, maar heeft geen race history.

**Check:**
```bash
# Bekijk rider details
curl http://localhost:3000/api/riders/150437
```

---

## API Problemen

### "Team not found"

**Probleem:** Team ID bestaat niet.

**Oplossing:**
```bash
# Lijst alle teams
curl http://localhost:3000/api/team

# Maak nieuw team
curl -X POST http://localhost:3000/api/team \
  -H "Content-Type: application/json" \
  -d '{"name":"My Team"}'
```

---

### "Database is locked" (SQLite)

**Probleem:** Meerdere schrijfoperaties tegelijk (SQLite limitatie).

**Oplossing 1 (Quick fix):**
```bash
# Sluit Prisma Studio
# Stop andere database connecties
```

**Oplossing 2 (Permanent):**
Switch naar PostgreSQL voor production:
```bash
# Update .env
DATABASE_URL="postgresql://user:pass@localhost:5432/teamnl"

# Run migrations
npm run db:migrate
```

---

### API calls timeout

**Probleem:** ZwiftRacing.app API reageert traag.

**Oplossing:**
```bash
# Verhoog timeout in src/api/zwift-client.ts (al 30s default)
# Of retry na een paar minuten
```

---

## Performance Problemen

### Import duurt erg lang

**Verwacht:** ~12 minuten voor 50 riders (API rate limits).

**Bereken tijd:**
```
Tijd = (aantal_riders / 5) minuten
50 riders = ~10-12 minuten
100 riders = ~20-25 minuten
```

**Optimalisatie:**
```bash
# Gebruik bulk import API (sneller dan CLI voor 50+)
curl -X POST http://localhost:3000/api/team/1/members \
  -H "Content-Type: application/json" \
  -d '{"zwiftIds":[150437,123456,...],"batchSize":5}'

# Of split imports over meerdere teams
```

---

### Team statistics traag

**Probleem:** Veel members met veel races.

**Oplossing:**
```bash
# Gebruik rider statistics tabel (pre-calculated)
# Wordt automatisch bijgewerkt tijdens sync

# Force statistics update (als nodig)
# TODO: implement statistics refresh endpoint
```

---

## Database Problemen

### "Migration failed"

**Probleem:** Database schema conflict.

**Oplossing (development only!):**
```bash
# Reset database (VERLIEST ALLE DATA!)
npx prisma migrate reset

# Of handmatig:
rm prisma/dev.db
npm run db:migrate
```

**Production:**
```bash
# Maak backup eerst
cp prisma/dev.db prisma/dev.db.backup

# Run migrations
npm run db:migrate
```

---

### "Prisma Client out of sync"

**Probleem:** Schema gewijzigd maar client niet gegenereerd.

**Oplossing:**
```bash
npm run db:generate
```

---

## CLI Problemen

### "Command not found: npm run import"

**Probleem:** Script niet gedefinieerd in package.json.

**Oplossing:**
```bash
# Run direct via tsx
npx tsx scripts/import-team-members.ts --help

# Of voeg toe aan package.json scripts:
"import": "tsx scripts/import-team-members.ts"
```

---

### Import CLI toont geen output

**Probleem:** Logging level te laag.

**Oplossing:**
```bash
# Set NODE_ENV voor meer debug info
NODE_ENV=development npm run import -- --team 1 --csv riders.csv
```

---

## Best Practices

### ✅ Voor Grote Imports (50+ riders)

1. **Gebruik dry-run eerst:**
```bash
npm run import -- --team 1 --csv riders.csv --dry-run
```

2. **Split in batches van 20-30:**
```bash
npm run import -- --team 1 --csv batch1.csv
# Wacht 10 minuten
npm run import -- --team 1 --csv batch2.csv
```

3. **Monitor progress:**
```bash
# In separate terminal
watch -n 30 'curl -s http://localhost:3000/api/team/1/stats'
```

4. **Check failed imports:**
```bash
# Retry failures
npm run import -- --team 1 --json failed-imports-*.json
```

### ✅ Rate Limit Management

**Respect API limits:**
- Single rider: 5 calls/min
- Bulk riders: 1 call/15min (maar CLI gebruikt single calls voor rate control)
- Gebruik batchSize 3-5 voor beste balans

**Bij rate limit errors:**
1. Wacht 5-10 minuten
2. Retry met kleinere batch size
3. Overweeg bulk add via API (1 call voor max 1000 riders)

### ✅ Error Recovery

**Automatisch:**
- Failed imports worden opgeslagen
- Duplicates worden automatisch geskipped
- Sync errors per rider gelogd

**Handmatig:**
```bash
# Check errors
curl http://localhost:3000/api/team/1 | jq '.members[] | select(.syncStatus=="error")'

# Retry individual rider
curl -X POST http://localhost:3000/api/team/1/sync

# Remove en re-add als nodig
curl -X DELETE http://localhost:3000/api/team/1/members/150437
curl -X POST http://localhost:3000/api/team/1/members/150437
```

---

## Debug Mode

Voor uitgebreide logging:

```bash
# Set environment
export NODE_ENV=development
export LOG_LEVEL=debug

# Run import
npm run import -- --team 1 --csv riders.csv

# Check logs
tail -f logs/app.log  # als logging naar file
```

---

## Support

Als probleem blijft bestaan:

1. Check logs: `curl http://localhost:3000/api/sync/logs`
2. Check team stats: `curl http://localhost:3000/api/team/1/stats`
3. Check database: `npm run db:studio`
4. Test API: `npm run test:team`

Voor verdere hulp, check:
- [docs/TEAM_API.md](./TEAM_API.md) - API documentatie
- [docs/API.md](./API.md) - Algemene API docs
- GitHub Issues
