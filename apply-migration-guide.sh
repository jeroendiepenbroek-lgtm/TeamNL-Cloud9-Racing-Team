#!/bin/bash
# Quick migration guide for missing fields

echo "🚀 TeamNL Results Dashboard - Missing Fields Migration"
echo ""
echo "PROBLEM: Database is missing position and position_in_category columns"
echo ""
echo "📋 STEP 1: Run this SQL in Supabase SQL Editor"
echo "=========================================="
echo ""
cat << 'EOF'
-- Add position fields (US1, US3)
ALTER TABLE zwift_api_race_results 
  ADD COLUMN IF NOT EXISTS position INTEGER,
  ADD COLUMN IF NOT EXISTS position_in_category INTEGER;

-- Add heartrate fields (US1)
ALTER TABLE zwift_api_race_results 
  ADD COLUMN IF NOT EXISTS heartrate_avg INTEGER,
  ADD COLUMN IF NOT EXISTS heartrate_max INTEGER;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'zwift_api_race_results' 
  AND column_name IN ('position', 'position_in_category', 'heartrate_avg', 'heartrate_max')
ORDER BY column_name;
EOF

echo ""
echo "=========================================="
echo ""
echo "📋 STEP 2: After SQL is run, execute this:"
echo ""
echo "curl -X POST 'https://teamnl-cloud9-racing-team-production.up.railway.app/api/sync/results/rider/150437' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"daysBack\": 90, \"forceRefresh\": true}'"
echo ""
echo "This will:"
echo "  ✓ Delete old data (with wrong vELO change = 26)"
echo "  ✓ Re-sync with new schema"
echo "  ✓ Populate position, position_in_category, heartrate fields"
echo "  ✓ Fix vELO change to 25 (floor calculation)"
echo ""
echo "📊 STEP 3: Verify in browser (hard refresh!)"
echo "  https://teamnl-cloud9-racing-team-production.up.railway.app/results/rider/150437"
echo ""
echo "You should see:"
echo "  ✅ Position: '9 (3)' format (overall + category)"
echo "  ✅ Total riders: '/ 42'"
echo "  ✅ HR Avg and HR Max columns with data"
echo "  ✅ vELO change: +25 (not +26)"
echo "  ✅ Ultra-compact layout with more results"
echo ""
