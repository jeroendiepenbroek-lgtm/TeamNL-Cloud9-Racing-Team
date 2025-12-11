#!/bin/bash
# Complete Deployment: Race Results Statistics

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Deploy Race Results Statistics - Complete E2E       ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Run migration in Supabase
echo "📋 Step 1: Run Migration in Supabase"
echo ""
echo "   1. Open: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new"
echo "   2. Copy/paste: migrations/007_add_race_results_stats.sql"
echo "   3. Click 'Run'"
echo ""
read -p "Press ENTER after migration is complete..."

# Step 2: Sync test rider to populate new fields
echo ""
echo "📋 Step 2: Sync Test Rider (150437)"
echo ""
export SUPABASE_URL="https://bktbeefdmrpxhsyyalvc.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU"

node fetch-zwiftracing-rider.js 150437

# Step 3: Verify data in view
echo ""
echo "📋 Step 3: Verify Data"
echo ""
echo "Check in Supabase:"
echo "   SELECT rider_id, full_name, race_wins, race_podiums, race_finishes, race_dnfs"
echo "   FROM v_rider_complete"
echo "   WHERE rider_id = 150437;"
echo ""

# Step 4: Railway is already deploying
echo "📋 Step 4: Railway Deployment"
echo ""
echo "   ✅ Code pushed to GitHub"
echo "   ⏳ Railway is building..."
echo "   🔗 https://teamnl-cloud9-racing-team-production.up.railway.app"
echo ""
echo "   Wait for build to complete (~2-3 minutes)"
echo ""

# Step 5: Test live
echo "📋 Step 5: Test Live Dashboard"
echo ""
echo "   Open: https://teamnl-cloud9-racing-team-production.up.railway.app"
echo ""
echo "   Expected in Racing Matrix:"
echo "   - ✅ Finishes column (sortable)"
echo "   - ✅ Wins column (green, sortable)"
echo "   - ✅ Podiums column (blue, sortable)"
echo "   - ✅ DNFs column (red, sortable)"
echo "   - ✅ Hover shows win/podium/DNF rates"
echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
