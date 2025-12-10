#!/bin/bash

# ============================================================================
# PRE-FLIGHT CHECK: Valideer SETUP_SUPABASE_COMPLETE.sql
# ============================================================================
# Purpose: Check SQL bestand op veelvoorkomende fouten VOORDAT je het draait
# Usage: ./validate-sql.sh
# ============================================================================

set -e

echo "🔍 PRE-FLIGHT CHECK: SETUP_SUPABASE_COMPLETE.sql"
echo "=================================================="
echo ""

SQL_FILE="SETUP_SUPABASE_COMPLETE.sql"
ERRORS=0
WARNINGS=0

# ============================================================================
# CHECK 1: Bestand bestaat
# ============================================================================
echo "✓ Check 1: Bestand bestaat..."
if [ ! -f "$SQL_FILE" ]; then
    echo "   ❌ FOUT: $SQL_FILE niet gevonden!"
    exit 1
fi
echo "   ✅ Bestand gevonden ($(wc -l < $SQL_FILE) regels)"
echo ""

# ============================================================================
# CHECK 2: Kolommen die NIET bestaan
# ============================================================================
echo "✓ Check 2: Niet-bestaande kolommen..."

# api_zwiftracing_riders heeft GEEN racing_score
if grep -q "zr\.racing_score" "$SQL_FILE" 2>/dev/null; then
    echo "   ❌ FOUT: 'zr.racing_score' gevonden - deze kolom bestaat NIET!"
    echo "      api_zwiftracing_riders heeft alleen: velo_live, velo_30day, velo_90day"
    ((ERRORS++))
else
    echo "   ✅ Geen racing_score references"
fi

# api_zwiftracing_riders heeft GEEN 'velo' (alleen velo_live/30day/90day)
if grep -E "zr\.velo[^_]|zr\.velo\s|zr\.velo," "$SQL_FILE" 2>/dev/null; then
    echo "   ❌ FOUT: 'zr.velo' (zonder suffix) gevonden!"
    echo "      Gebruik: velo_live, velo_30day, of velo_90day"
    ((ERRORS++))
else
    echo "   ✅ Geen oude 'velo' references (alleen velo_live/30day/90day)"
fi

# Check op api_zwiftracing_public_clubs_riders (oude tabel)
if grep -q "api_zwiftracing_public_clubs_riders" "$SQL_FILE" | grep -v "DROP TABLE" 2>/dev/null; then
    OLD_TABLE_COUNT=$(grep -c "api_zwiftracing_public_clubs_riders" "$SQL_FILE" | grep -v "DROP" || echo 0)
    if [ "$OLD_TABLE_COUNT" -gt 2 ]; then  # DROP TABLE regels zijn ok
        echo "   ⚠️  WAARSCHUWING: Oude tabel 'api_zwiftracing_public_clubs_riders' gebruikt"
        echo "      Gebruik nieuwe tabel: api_zwiftracing_riders"
        ((WARNINGS++))
    fi
fi

echo ""

# ============================================================================
# CHECK 3: NULL constraints
# ============================================================================
echo "✓ Check 3: NULL constraint violations..."

# sync_strategy.sync_interval_hours moet NOT NULL zijn
if grep -A 2 "INSERT INTO sync_strategy" "$SQL_FILE" | grep -q "NULL.*99.*NULL" 2>/dev/null; then
    echo "   ❌ FOUT: sync_strategy INSERT met NULL voor sync_interval_hours"
    echo "      sync_interval_hours is NOT NULL - gebruik 999999 voor disabled sources"
    ((ERRORS++))
else
    echo "   ✅ Geen NULL in sync_interval_hours"
fi

echo ""

# ============================================================================
# CHECK 4: Index op juiste kolommen
# ============================================================================
echo "✓ Check 4: Indices op correcte kolommen..."

# Check velo index op api_zwiftracing_riders (moet velo_live zijn, niet velo)
if grep "api_zwiftracing_riders" "$SQL_FILE" | grep -q "idx.*velo[^_]" 2>/dev/null; then
    echo "   ❌ FOUT: Index op 'velo' zonder suffix gevonden in api_zwiftracing_riders"
    echo "      Gebruik: idx_api_zwiftracing_riders_velo_live"
    ((ERRORS++))
else
    echo "   ✅ Velo indices correct (velo_live)"
fi

# Check racing_score index (mag niet)
if grep -q "idx.*racing_score" "$SQL_FILE" 2>/dev/null; then
    echo "   ❌ FOUT: Index op 'racing_score' gevonden"
    echo "      Deze kolom bestaat niet in api_zwiftracing_riders"
    ((ERRORS++))
else
    echo "   ✅ Geen racing_score indices"
fi

echo ""

# ============================================================================
# CHECK 5: View definities
# ============================================================================
echo "✓ Check 5: View definities..."

# Check of v_rider_complete bestaat
if ! grep -q "CREATE OR REPLACE VIEW v_rider_complete" "$SQL_FILE" 2>/dev/null; then
    echo "   ❌ FOUT: v_rider_complete view niet gevonden!"
    ((ERRORS++))
else
    echo "   ✅ v_rider_complete view aanwezig"
fi

# Check FULL OUTER JOIN in v_rider_complete  
if grep -A 100 "CREATE OR REPLACE VIEW v_rider_complete" "$SQL_FILE" | grep "FULL OUTER JOIN" | grep -q "api_zwiftracing_riders"; then
    echo "   ✅ v_rider_complete gebruikt api_zwiftracing_riders"
elif grep -A 100 "CREATE OR REPLACE VIEW v_rider_complete" "$SQL_FILE" | grep "FULL OUTER JOIN" | grep -q "api_zwiftracing_public_clubs_riders"; then
    echo "   ⚠️  WAARSCHUWING: v_rider_complete gebruikt oude clubs_riders tabel"
    ((WARNINGS++))
fi

echo ""

# ============================================================================
# CHECK 6: Tabel structuur
# ============================================================================
echo "✓ Check 6: Tabel structuur..."

# Check of api_zwiftracing_riders CREATE statement er is
if ! grep -q "CREATE TABLE.*api_zwiftracing_riders" "$SQL_FILE" 2>/dev/null; then
    echo "   ❌ FOUT: api_zwiftracing_riders CREATE TABLE niet gevonden!"
    ((ERRORS++))
else
    echo "   ✅ api_zwiftracing_riders tabel definitie aanwezig"
    
    # Check kolommen
    if grep -A 70 "CREATE TABLE.*api_zwiftracing_riders" "$SQL_FILE" | grep -q "velo_live" 2>/dev/null; then
        echo "   ✅ velo_live kolom aanwezig"
    else
        echo "   ❌ FOUT: velo_live kolom ontbreekt!"
        ((ERRORS++))
    fi
    
    if grep -A 70 "CREATE TABLE.*api_zwiftracing_riders" "$SQL_FILE" | grep -q "power_5s_wkg" 2>/dev/null; then
        echo "   ✅ power W/kg kolommen aanwezig"
    else
        echo "   ⚠️  WAARSCHUWING: power W/kg kolommen mogelijk ontbrekend"
        ((WARNINGS++))
    fi
fi

echo ""

# ============================================================================
# SAMENVATTING
# ============================================================================
echo "=================================================="
echo "RESULTAAT:"
echo "=================================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ ✅ ✅  ALLE CHECKS GESLAAGD! ✅ ✅ ✅"
    echo ""
    echo "Het SQL bestand is klaar om te draaien:"
    echo "https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  $WARNINGS waarschuwing(en) gevonden"
    echo ""
    echo "Het bestand zou moeten werken, maar controleer de waarschuwingen."
    echo ""
    exit 0
else
    echo "❌ $ERRORS FOUT(EN) gevonden!"
    if [ $WARNINGS -gt 0 ]; then
        echo "⚠️  $WARNINGS waarschuwing(en) gevonden"
    fi
    echo ""
    echo "⛔ NIET draaien totdat fouten zijn opgelost!"
    echo ""
    exit 1
fi
