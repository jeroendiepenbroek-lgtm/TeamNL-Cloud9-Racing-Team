#!/bin/bash
# Test alle ZwiftRacing.app endpoints

API_KEY="650c6d2fc4ef6858d74cbef1"
BASE_URL="https://zwift-ranking.herokuapp.com"

echo "=================================="
echo "ZWIFTRACING.APP - ALL ENDPOINTS TEST"
echo "=================================="
echo ""

# Test 1: Events - Upcoming
echo "=== TEST 1: Upcoming Events ==="
curl -s "${BASE_URL}/api/events/upcoming" \
  -H "Authorization: ${API_KEY}" | jq -r 'if type == "array" then "✅ SUCCESS - Found \(length) events" else "❌ FAILED - \(.)" end'
echo ""

# Test 2: Events - Specific Event
echo "=== TEST 2: Specific Event (ID: 1000) ==="
curl -s "${BASE_URL}/api/events/1000" \
  -H "Authorization: ${API_KEY}" | jq -r 'if .id then "✅ SUCCESS - Event: \(.name)" else "❌ FAILED" end'
echo ""

# Test 3: Event Results
echo "=== TEST 3: Event Results (ID: 1000) ==="
curl -s "${BASE_URL}/public/results/1000" \
  -H "Authorization: ${API_KEY}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) results" else "❌ FAILED" end'
echo ""

# Test 4: Clubs/Teams
echo "=== TEST 4: Club/Team (TeamNL: 11818) ==="
curl -s "${BASE_URL}/public/clubs/11818" \
  -H "Authorization: ${API_KEY}" | jq -r 'if .id then "✅ SUCCESS - \(.name)" else "❌ FAILED" end'
echo ""

# Test 5: Team Alternative
echo "=== TEST 5: Team Alternative (TeamNL: 11818) ==="
curl -s "${BASE_URL}/public/teams/11818" \
  -H "Authorization: ${API_KEY}" | jq -r 'if .id then "✅ SUCCESS - \(.name)" else "❌ FAILED" end'
echo ""

# Test 6: Event Signups
echo "=== TEST 6: Event Signups (Event: 1000) ==="
curl -s "${BASE_URL}/api/events/1000/signups" \
  -H "Authorization: ${API_KEY}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) signups" else "❌ FAILED" end'
echo ""

# Test 7: Rider Rankings (all riders)
echo "=== TEST 7: Rider Rankings (Top 10) ==="
curl -s "${BASE_URL}/public/riders?limit=10" \
  -H "Authorization: ${API_KEY}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) riders" else "❌ FAILED" end'
echo ""

# Test 8: Team Riders with details
echo "=== TEST 8: Team Riders Detailed (TeamNL) ==="
curl -s "${BASE_URL}/public/teams/11818/riders" \
  -H "Authorization: ${API_KEY}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) riders" else "❌ FAILED" end'
echo ""

# Test 9: Search endpoint
echo "=== TEST 9: Search Riders (query: JRone) ==="
curl -s "${BASE_URL}/api/search/riders?q=JRone" \
  -H "Authorization: ${API_KEY}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) results" else "❌ FAILED" end'
echo ""

# Test 10: Leaderboard
echo "=== TEST 10: vELO Leaderboard ==="
curl -s "${BASE_URL}/api/leaderboard/velo?limit=10" \
  -H "Authorization: ${API_KEY}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) riders" else "❌ FAILED" end'
echo ""

echo "=================================="
echo "TEST COMPLETED"
echo "=================================="
