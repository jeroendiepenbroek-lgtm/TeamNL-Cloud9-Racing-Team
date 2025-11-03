#!/bin/bash

# ============================================================================
# DEPLOYMENT HELPER - TeamNL Cloud9 Racing
# ============================================================================
# Dit script helpt je door het handmatige deployment proces
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ CLEANUP VOLTOOID!"
echo ""
echo "De oude schema is succesvol verwijderd (alle tabellen zijn weg)."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 VOLGENDE STAP: Deploy MVP Schema"
echo ""
echo "1. Open Supabase SQL Editor:"
echo "   👉 https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/sql"
echo ""
echo "2. Klik: 'New query'"
echo ""
echo "3. Copy-paste ALLE 399 regels uit:"
echo "   👉 supabase/mvp-schema.sql"
echo "   (Het bestand is al geopend in VS Code)"
echo ""
echo "4. Klik: 'RUN' (groene knop)"
echo ""
echo "5. Wacht tot je ziet:"
echo "   ✅ 'Success. No rows returned.'"
echo "   OF: Een lijst met tabel sizes"
echo ""
echo "6. Kom terug naar VS Code en druk ENTER"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Open browser (if possible)
if command -v xdg-open &> /dev/null; then
    echo "🌐 Opening SQL Editor..."
    xdg-open "https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/sql" 2>/dev/null &
elif [ -n "$BROWSER" ]; then
    echo "🌐 Opening SQL Editor..."
    "$BROWSER" "https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/sql" 2>/dev/null &
fi

echo ""
read -p "Druk ENTER als je het schema hebt gedeployed..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Verificatie..."
echo ""

# Run verification
cd /workspaces/TeamNL-Cloud9-Racing-Team
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDQ5MjgzMywiZXhwIjoyMDQ2MDY4ODMzfQ.NkV22nxX0pM4G2lEyF1SIHqp3zNVXy0T4YGlFsCFKI4 \
  npx tsx scripts/test-database-flow.ts

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check results
if [ $? -eq 0 ]; then
    echo "✅ DEPLOYMENT SUCCESVOL!"
    echo ""
    echo "Alle tests zijn geslaagd. De database is klaar voor gebruik."
    echo ""
    echo "Volgende stap: Zorg voor een werkende ZwiftRacing API key."
    echo ""
else
    echo "⚠️  DEPLOYMENT PROBLEEM"
    echo ""
    echo "Er zijn nog fouten in de test. Check de output hierboven."
    echo ""
    echo "Mogelijk probleem:"
    echo "- Schema niet volledig uitgevoerd (check Supabase SQL Editor voor errors)"
    echo "- Copy-paste niet compleet (controleer of alle 399 regels zijn gekopieerd)"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
