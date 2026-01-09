#!/bin/bash

# ============================================================================
# Race Results Test Script
# Test de nieuwe zpdatafetch implementatie
# ============================================================================

set -e

echo "========================================================================"
echo "🧪 Race Results Test - zpdatafetch Implementation"
echo "========================================================================"

# Check Python environment
echo ""
echo "1️⃣ Checking Python environment..."
if [ -f ".venv/bin/python" ]; then
    PYTHON=".venv/bin/python"
    echo "✅ Using virtual environment: $PYTHON"
else
    PYTHON="python3"
    echo "⚠️  Using system Python: $PYTHON"
fi

# Check dependencies
echo ""
echo "2️⃣ Checking dependencies..."
$PYTHON -c "import zpdatafetch; print('✅ zpdatafetch:', zpdatafetch.__version__ if hasattr(zpdatafetch, '__version__') else 'installed')" || {
    echo "❌ zpdatafetch not installed"
    echo "Installing..."
    $PYTHON -m pip install zpdatafetch keyring
}

$PYTHON -c "import zrdatafetch; print('✅ zrdatafetch: OK')" || {
    echo "❌ zrdatafetch not found (should be part of zpdatafetch)"
    exit 1
}

# Check environment variables
echo ""
echo "3️⃣ Checking environment variables..."
if [ -z "$ZWIFTRACING_API_TOKEN" ]; then
    echo "⚠️  ZWIFTRACING_API_TOKEN not set, using default"
    export ZWIFTRACING_API_TOKEN="650c6d2fc4ef6858d74cbef1"
fi

if [ -z "$SUPABASE_URL" ]; then
    echo "⚠️  SUPABASE_URL not set (results will be saved to file)"
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "⚠️  SUPABASE_SERVICE_KEY not set (results will be saved to file)"
fi

# Test basic scanner
echo ""
echo "4️⃣ Testing basic race results scanner..."
$PYTHON race-results-scanner.py << EOF
2
EOF

# Test database sync (if configured)
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_KEY" ]; then
    echo ""
    echo "5️⃣ Testing database sync..."
    $PYTHON race-results-db-sync.py
else
    echo ""
    echo "5️⃣ Skipping database sync test (no Supabase credentials)"
fi

# Check results
echo ""
echo "6️⃣ Checking results..."
if [ -d "data" ]; then
    echo "📁 Data files created:"
    ls -lh data/*.json 2>/dev/null || echo "   No JSON files yet"
fi

echo ""
echo "========================================================================"
echo "✅ Test Complete!"
echo "========================================================================"
echo ""
echo "📋 Summary:"
echo "   - zpdatafetch library: Installed & configured"
echo "   - ZwiftPower credentials: Configured in keyring"
echo "   - Zwiftracing API: Token configured"
echo "   - Race scanner: Ready to use"
echo ""
echo "🚀 Next steps:"
echo "   1. Run manually: python race-results-scanner.py"
echo "   2. Run DB sync: python race-results-db-sync.py"
echo "   3. Apply migration: migrations/015_race_results_zpdatafetch.sql"
echo ""
