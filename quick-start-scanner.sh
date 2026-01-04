#!/bin/bash
# Quick Start Commands voor Race Results Scanner
# Kopieer en plak deze commando's 1-voor-1

echo "=============================================="
echo "🚀 RACE RESULTS SCANNER - QUICK START"
echo "=============================================="
echo ""

echo "STAP 1: Supabase Migratie"
echo "----------------------------"
echo "1. Open: https://supabase.com/dashboard"
echo "2. Ga naar SQL Editor → New Query"
echo "3. Kopieer HELE bestand: SUPABASE_MIGRATION_013.sql"
echo "4. Plak in editor en druk F5"
echo ""
echo "📄 Bestand locatie:"
echo "   /workspaces/TeamNL-Cloud9-Racing-Team/SUPABASE_MIGRATION_013.sql"
echo ""
read -p "✅ Migration uitgevoerd? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⏸️  Stop - Voer eerst migratie uit"
    exit 1
fi
echo ""

echo "STAP 2: Server Herstarten"
echo "----------------------------"
echo "Stop oude server..."
lsof -ti:8080 | xargs kill -9 2>/dev/null
sleep 2

echo "Start nieuwe server..."
cd /workspaces/TeamNL-Cloud9-Racing-Team/backend
npm start > /tmp/server.log 2>&1 &
SERVER_PID=$!

echo "Server PID: $SERVER_PID"
echo "Wacht 5 seconden voor startup..."
sleep 5
echo ""

echo "Check server logs..."
tail -20 /tmp/server.log | grep -E "(Server on|race_results|Scheduler)" || echo "❌ Check /tmp/server.log voor errors"
echo ""

echo "STAP 3: Test Scanner"
echo "----------------------------"
cd /workspaces/TeamNL-Cloud9-Racing-Team
echo "Trigger eerste scan..."
curl -s -X POST http://localhost:8080/api/admin/scan-race-results | jq '.' || echo "Scanner gestart in achtergrond"
echo ""

echo "⏳ Wacht 30 seconden voor eerste scan..."
for i in {30..1}; do
    echo -ne "\r   $i seconden..."
    sleep 1
done
echo ""
echo ""

echo "Check scan status..."
curl -s http://localhost:8080/api/admin/scan-status | jq '.' || echo "❌ Status niet beschikbaar"
echo ""

echo "=============================================="
echo "✅ KLAAR!"
echo "=============================================="
echo ""
echo "📊 Handige Commando's:"
echo ""
echo "# Server logs bekijken"
echo "tail -f /tmp/server.log"
echo ""
echo "# Scan status checken"
echo "curl http://localhost:8080/api/admin/scan-status | jq '.'"
echo ""
echo "# Cached results ophalen"
echo "curl http://localhost:8080/api/results/my-riders/cached | jq '.'"
echo ""
echo "# Volledige test suite"
echo "./test-race-scanner.sh"
echo ""
echo "# Scanner config aanpassen"
echo 'curl -X POST http://localhost:8080/api/admin/scan-config \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"scan_interval_minutes": 120}'"'"
echo ""
echo "📖 Volledige documentatie: RACE_SCANNER_SETUP.md"
echo ""
