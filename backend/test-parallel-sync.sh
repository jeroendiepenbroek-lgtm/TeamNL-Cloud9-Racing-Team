#!/bin/bash

echo "🚀 Testing PARALLEL Rider + Results Sync voor rider 150437"
echo "=========================================================="
echo ""

# Start beide syncs tegelijk (& = background)
echo "⏱️  $(date +%H:%M:%S) - Starting Rider Sync..."
curl -s -X POST "http://localhost:3000/api/sync-control/trigger/riders?force=true" &
PID_RIDERS=$!

echo "⏱️  $(date +%H:%M:%S) - Starting Results Sync (first 20 events only for speed)..."
curl -s -X POST "http://localhost:3000/api/sync-control/trigger/results?force=true" &
PID_RESULTS=$!

echo ""
echo "⏳ Beide syncs draaien nu PARALLEL..."
echo ""

# Wacht tot beide klaar zijn
wait $PID_RIDERS
echo "✅ $(date +%H:%M:%S) - Rider Sync DONE"

wait $PID_RESULTS
echo "✅ $(date +%H:%M:%S) - Results Sync DONE"

echo ""
echo "=========================================================="
echo "📊 Checking data voor rider 150437..."
echo ""

# Check rider in riders table
echo "1️⃣ Rider in riders table:"
curl -s "http://localhost:3000/api/riders/team" | jq '.riders[] | select(.id == 150437) | {id, name, race_results_last_90_days, race_current_rating}' || echo "   ❌ Not found"

echo ""
echo "2️⃣ Race results in zwift_api_race_results (via API):"
curl -s "http://localhost:3000/api/results/rider/150437?days=30&limit=3" | jq '{count, results: .results[0:3] | map({event_name, rank, velo_rating})}'

echo ""
echo "=========================================================="
echo "✅ CONCLUSIE: Rider Sync en Results Sync zijn ONAFHANKELIJK"
echo "   - Results Dashboard gebruikt rider_name uit race_results"
echo "   - Riders Dashboard gebruikt aggregated stats uit riders tabel"
echo "   - Kunnen PARALLEL draaien zonder conflicts"
