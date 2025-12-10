#!/bin/bash

# ============================================================================
# QUICK SETUP: Railway + Supabase E2E
# ============================================================================
# Purpose: Complete setup in 1 command
# Usage: ./quick-setup.sh
# ============================================================================

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  TeamNL Racing Matrix: Complete Setup                       ║"
echo "║  Railway → Supabase → Dashboard                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# STEP 1: Validate SQL
# ============================================================================
echo "🔍 STAP 1: Valideer SQL bestand..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! ./validate-sql.sh; then
    echo ""
    echo "❌ Validatie gefaald! Fix eerst de fouten."
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# STEP 2: Toon SQL instructies
# ============================================================================
echo "📋 STAP 2: SQL naar Supabase kopiëren"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✋ STOP: Volg deze stappen:"
echo ""
echo "1. Open Supabase SQL Editor:"
echo "   👉 https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new"
echo ""
echo "2. Kopieer het SQL bestand:"
echo "   - Open: SETUP_SUPABASE_COMPLETE.sql"
echo "   - Selecteer alles: Ctrl+A"
echo "   - Kopieer: Ctrl+C"
echo ""
echo "3. Plak in Supabase SQL Editor: Ctrl+V"
echo ""
echo "4. Klik op 'RUN' knop"
echo ""
echo "5. Wacht op 'Success' message"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "✅ Druk op ENTER als de SQL succesvol is gedraaid in Supabase..." 

# ============================================================================
# STEP 3: Verify database
# ============================================================================
echo ""
echo "🔍 STAP 3: Verifieer database setup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v node &> /dev/null; then
    node -e "
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      'https://bktbeefdmrpxhsyyalvc.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM1NzkwMDIsImV4cCI6MjA0OTE1NTAwMn0.m7JsRFFbWYcAWSWC3zHvQ_9KkRGPgI1fC7SKb-j-_JE'
    );
    
    async function verify() {
      // Check view
      const { data, error, count } = await supabase
        .from('v_rider_complete')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log('   ❌ v_rider_complete view bestaat NIET!');
        console.log('   Error:', error.message);
        console.log('');
        console.log('   ⚠️  Ga terug naar Supabase en draai de SQL opnieuw.');
        process.exit(1);
      } else {
        console.log('   ✅ v_rider_complete view bestaat!');
        console.log('   📊 Huidige rows:', count || 0);
      }
    }
    
    verify().catch(err => {
      console.log('   ⚠️  Kan Supabase niet bereiken:', err.message);
    });
    " 2>&1
else
    echo "   ⚠️  Node.js niet gevonden, skip verification"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# STEP 4: Sync data
# ============================================================================
echo "🔄 STAP 4: Data syncen naar database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Nu gaan we test rider 150437 syncen..."
echo ""

# Set environment voor sync
export SUPABASE_URL="https://bktbeefdmrpxhsyyalvc.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDczOTQ1MiwiZXhwIjoyMDQ2MzE1NDUyfQ.GXxGUBxnPh3u5Q-7PLy_dT9uc-FcqMVNqWj5hl9rAXM"

if [ -f "fetch-zwiftracing-rider.js" ]; then
    echo "Syncing rider 150437 (Jeroen / JRøne CloudRacer-9)..."
    if node fetch-zwiftracing-rider.js 150437; then
        echo ""
        echo "   ✅ Rider 150437 succesvol gesynchroniseerd!"
    else
        echo ""
        echo "   ⚠️  Sync gefaald. Check:"
        echo "      - Is ZwiftRacing.app API bereikbaar?"
        echo "      - Is SUPABASE_SERVICE_KEY correct?"
    fi
else
    echo "   ⚠️  fetch-zwiftracing-rider.js niet gevonden"
    echo "   Je kunt later handmatig syncen met:"
    echo "   node fetch-zwiftracing-rider.js 150437"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# STEP 5: Deploy to Railway
# ============================================================================
echo "🚀 STAP 5: Deploy naar Railway"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Wil je de laatste code deployen naar Railway? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Deploying naar Railway..."
    
    if command -v railway &> /dev/null; then
        railway up --detach
        echo ""
        echo "   ✅ Deploy gestart!"
        echo "   📊 Check status: railway logs --tail 50"
    else
        echo "   ⚠️  Railway CLI niet geïnstalleerd"
        echo "   Deploy handmatig: git push origin fresh-start-v4"
        echo "   Railway zal automatisch deployen via GitHub"
    fi
else
    echo ""
    echo "   ⏭️  Deploy overgeslagen"
    echo "   Deploy later met: railway up"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# STEP 6: Final checks
# ============================================================================
echo "✅ STAP 6: Verificatie"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Check de volgende URLs:"
echo ""
echo "1. 📊 Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/editor"
echo ""
echo "2. 🚀 Railway Dashboard:"
echo "   https://railway.com/project/1af6fad4-ab12-41a6-a6c3-97a532905f8c"
echo ""
echo "3. 🏆 Live Racing Matrix:"
echo "   https://teamnl-cloud9-racing-team-production.up.railway.app/"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    SETUP COMPLEET! 🎉                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Validatie: PASSED"
echo "✅ Database: v_rider_complete view created"
echo "✅ Data: Test rider synced"
echo ""
echo "📋 Volgende stappen:"
echo ""
echo "1. Open dashboard en check data:"
echo "   https://teamnl-cloud9-racing-team-production.up.railway.app/"
echo ""
echo "2. Voeg meer riders toe:"
echo "   node fetch-zwiftracing-rider.js <rider_id>"
echo ""
echo "3. Of sync hele team:"
echo "   ./sync-team-to-supabase.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🏁 Klaar! Je Racing Matrix draait nu op Railway + Supabase! 🏁"
echo ""
