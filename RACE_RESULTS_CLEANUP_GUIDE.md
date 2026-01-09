# 🧹 Race Results Cleanup Guide

Deze bestanden zijn **deprecated** en kunnen verwijderd worden na verificatie dat de nieuwe implementatie werkt.

---

## ❌ Te Verwijderen Bestanden

### Oude Race Results Scripts

```bash
# Oude scrapers/scanners
rm -f poc-results-server.js
rm -f test-results-concept.js
rm -f backend/dist/scan-race-results-hybrid.js
rm -f deploy-race-results.sh

# Oude Python scrapers
rm -f parse-zwiftracing-history.py
rm -f fetch-rider-race-history.js

# Oude test scripts
rm -f test-results-visualization.sh
```

### Deprecated SQL Files

```bash
# Oude race results migrations (vervangen door 015)
rm -f migrations/013_race_results_system.sql
rm -f migrations/014_fix_race_results_views.sql
rm -f migrations/007_add_race_results_stats.sql

# Fix scripts (niet meer nodig)
rm -f FIX_RACE_RESULTS_DECIMAL_POWER.sql
rm -f FIX_RACE_VIEW.sql
rm -f FIX_RACE_VIEW_FINAL.sql
rm -f DEBUG_RACE_RESULTS.sql
```

### Oude Documentatie

```bash
# Oude/lege documentation
rm -f RACE_RESULTS_DEPLOYMENT.md  # Vervangen door nieuwe versie
rm -f RESULTS_IMPLEMENTATION_STATUS.md  # Was leeg
rm -f RESULTS_FEATURE_IMPLEMENTATION.md  # Oud
rm -f POC_RESULTS_SUMMARY.md  # Proof of concept, niet meer relevant
```

### Deprecated API Test Files

```bash
# Oude ZwiftPower scrapers (nu via zpdatafetch)
rm -f test-zwift-ranking-api.js
rm -f test-zwift-feed.js
```

---

## ⚠️ Voorzichtig Verwijderen

Deze bestanden kunnen mogelijk nog nuttig zijn als referentie:

### Behouden (voorlopig)

```bash
# Rider data fetchers (kunnen nog nuttig zijn)
# - resync-missing-riders.js
# - resync-team-riders.js
# - check-rider-mixup.js
# - diagnose-racing-score.js

# API discovery/testing
# - test-zwiftracing-rider-150437.sh
# - test-bulk-zwiftracing-api.js
# - ZWIFTRACING_API_ENDPOINTS_DOCUMENTATION.md

# Deployment/setup guides
# - DEPLOYMENT_SUMMARY_*.md
# - HYBRID_SCANNER_DEPLOYMENT.md
```

---

## ✅ Nieuwe Structuur

Na cleanup zou je deze race results bestanden moeten hebben:

```
race-results/
├── race-results-scanner.py           # ✅ Nieuwe interactive scanner
├── race-results-db-sync.py           # ✅ Nieuwe database sync
├── test-quick-race-results.py        # ✅ Quick test
├── test-race-results.sh              # ✅ Full test suite
├── RACE_RESULTS_V2_IMPLEMENTATION.md # ✅ Implementatie docs
├── RACE_RESULTS_DEPLOYMENT.md        # ✅ Deployment guide
└── migrations/
    └── 015_race_results_zpdatafetch.sql  # ✅ Database schema
```

---

## 🔄 Cleanup Script

Automated cleanup (VOER DIT PAS UIT NA VERIFICATIE!):

```bash
#!/bin/bash
# cleanup-old-race-results.sh

echo "🧹 Cleaning up old race results files..."

# Backup eerst (veiligheid)
mkdir -p .backup/race-results-old
cp poc-results-server.js .backup/race-results-old/ 2>/dev/null || true
cp backend/dist/scan-race-results-hybrid.js .backup/race-results-old/ 2>/dev/null || true

# Verwijder oude scripts
rm -f poc-results-server.js
rm -f test-results-concept.js
rm -f deploy-race-results.sh
rm -f parse-zwiftracing-history.py
rm -f fetch-rider-race-history.js
rm -f test-results-visualization.sh

# Verwijder oude SQL
rm -f FIX_RACE_RESULTS_DECIMAL_POWER.sql
rm -f FIX_RACE_VIEW.sql
rm -f FIX_RACE_VIEW_FINAL.sql
rm -f DEBUG_RACE_RESULTS.sql

# Verwijder lege/oude docs
rm -f RESULTS_IMPLEMENTATION_STATUS.md
rm -f POC_RESULTS_SUMMARY.md

# Verwijder backend dist file
rm -f backend/dist/scan-race-results-hybrid.js

echo "✅ Cleanup complete!"
echo "📦 Backups saved to .backup/race-results-old/"
echo ""
echo "Verify new implementation works before removing backups:"
echo "  python test-quick-race-results.py"
echo "  python race-results-db-sync.py"
```

---

## ✅ Verificatie Checklist

Voor cleanup, controleer dat:

- [ ] `python test-quick-race-results.py` succesvol is
- [ ] `python race-results-db-sync.py` werkt
- [ ] Database migration `015_race_results_zpdatafetch.sql` is uitgevoerd
- [ ] Minimaal 1 succesvolle sync naar database
- [ ] Data zichtbaar in `SELECT * FROM v_teamnl_race_results;`
- [ ] Backup gemaakt van oude bestanden

---

## 🗂️ Archive Strategie

In plaats van verwijderen, overweeg archiveren:

```bash
# Maak archive directory
mkdir -p archive/race-results-v1

# Verplaats oude bestanden
mv poc-results-server.js archive/race-results-v1/
mv backend/dist/scan-race-results-hybrid.js archive/race-results-v1/
# etc...

# Voeg README toe aan archive
cat > archive/race-results-v1/README.md << 'EOF'
# Race Results v1 - Archived

Deze bestanden zijn vervangen door de nieuwe zpdatafetch implementatie (v2).

**Deprecated**: January 7, 2026
**Reden**: Scrapers niet betrouwbaar, vervangen door officiële API library

**Zie nieuwe implementatie**:
- race-results-scanner.py
- race-results-db-sync.py
- RACE_RESULTS_V2_IMPLEMENTATION.md
EOF
```

---

## 📝 Commit Message

Na cleanup:

```bash
git add -A
git commit -m "🧹 Cleanup: Remove deprecated race results files (v1)

- Removed old scrapers (poc-results-server.js, scan-race-results-hybrid.js)
- Removed deprecated SQL migrations (013, 014, various FIX scripts)
- Removed empty/outdated documentation
- Kept backup in .backup/race-results-old/

✅ New implementation (v2) using zpdatafetch is tested and working
📚 See: RACE_RESULTS_V2_IMPLEMENTATION.md
"
```

---

**⚠️ BELANGRIJK**: Test de nieuwe implementatie grondig voordat je oude bestanden verwijdert!
