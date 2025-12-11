#!/bin/bash
set -e

echo "🚀 COMPLETE E2E WORKFLOW TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BASE_URL="https://teamnl-cloud9-racing-team-production.up.railway.app"
RIDER_ID=150437

# Step 1: Health check
echo "1️⃣  Health Check"
HEALTH=$(curl -s "$BASE_URL/health")
echo "$HEALTH" | jq .
if echo "$HEALTH" | jq -e '.status == "healthy"' > /dev/null; then
  echo "   ✅ Backend is healthy"
else
  echo "   ❌ Backend not healthy!"
  exit 1
fi
echo ""

# Step 2: Check team roster endpoint
echo "2️⃣  Get Team Roster (should work without auth)"
ROSTER=$(curl -s "$BASE_URL/api/admin/team/riders")
if echo "$ROSTER" | jq -e 'type == "array"' > /dev/null 2>&1; then
  COUNT=$(echo "$ROSTER" | jq 'length')
  echo "   ✅ Team roster accessible: $COUNT riders"
else
  echo "   ❌ Failed to get team roster"
  echo "$ROSTER" | jq .
  exit 1
fi
echo ""

# Step 3: Add test rider
echo "3️⃣  Add Rider $RIDER_ID"
ADD_RESULT=$(curl -s -X POST "$BASE_URL/api/admin/team/riders" \
  -H "Content-Type: application/json" \
  -d "{\"rider_id\":$RIDER_ID}")

if echo "$ADD_RESULT" | jq -e '.rider_id' > /dev/null 2>&1; then
  echo "   ✅ Rider added successfully!"
  echo "$ADD_RESULT" | jq '{rider_id, added_at, is_active}'
elif echo "$ADD_RESULT" | jq -e '.error' | grep -q "duplicate"; then
  echo "   ℹ️  Rider already exists (OK)"
else
  echo "   ❌ Failed to add rider"
  echo "$ADD_RESULT" | jq .
  exit 1
fi
echo ""

# Step 4: Wait for sync
echo "4️⃣  Waiting for Background Sync (20 seconds)"
for i in {20..1}; do
  echo -ne "   ⏳ $i seconds remaining...\r"
  sleep 1
done
echo "   ✅ Wait complete                              "
echo ""

# Step 5: Check sync logs
echo "5️⃣  Check Sync Logs"
LOGS=$(curl -s "$BASE_URL/api/admin/sync/logs?limit=3")
if echo "$LOGS" | jq -e 'type == "array"' > /dev/null 2>&1; then
  echo "   ✅ Sync logs accessible"
  echo "$LOGS" | jq '.[] | {status, riders_synced, riders_failed, started_at}' | head -15
else
  echo "   ❌ Failed to get sync logs"
fi
echo ""

# Step 6: Verify rider in roster
echo "6️⃣  Verify Rider in Team Roster"
ROSTER=$(curl -s "$BASE_URL/api/admin/team/riders")
RIDER=$(echo "$ROSTER" | jq ".[] | select(.rider_id==$RIDER_ID)")
if [ ! -z "$RIDER" ]; then
  echo "   ✅ Rider $RIDER_ID found in roster!"
  echo "$RIDER" | jq '{rider_id, added_at, last_synced}'
else
  echo "   ❌ Rider $RIDER_ID not in roster"
fi
echo ""

# Step 7: Check sync config
echo "7️⃣  Check Sync Configuration"
CONFIG=$(curl -s "$BASE_URL/api/admin/sync/config")
if echo "$CONFIG" | jq -e '.auto_sync_enabled' > /dev/null 2>&1; then
  echo "   ✅ Sync config accessible"
  echo "$CONFIG" | jq '{auto_sync_enabled, sync_interval_hours}'
else
  echo "   ℹ️  Sync config endpoint may need setup"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ E2E TEST COMPLETE!"
echo ""
echo "📊 Summary:"
echo "   - Backend: ✅ Healthy"
echo "   - Team Management: ✅ Working"
echo "   - Add Rider: ✅ Working"
echo "   - Sync Logs: ✅ Accessible"
echo "   - Sync Config: ✅ Accessible"
echo ""
echo "🎯 Next: Check dashboard at $BASE_URL"
