#!/bin/bash
# Test alle Zwift Official API endpoints

TOKEN=$(cat /tmp/zwift_token.txt)
BASE_URL="https://us-or-rly101.zwift.com/api"
RIDER_ID="150437"

echo "=================================="
echo "ZWIFT OFFICIAL API - ALL ENDPOINTS TEST"
echo "=================================="
echo ""

# Test 1: Profile (already tested)
echo "=== TEST 1: Profile ==="
curl -s "${BASE_URL}/profiles/${RIDER_ID}" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r 'if .id then "✅ Profile: \(.firstName) \(.lastName)" else "❌ FAILED" end'
echo ""

# Test 2: Activities (already tested)
echo "=== TEST 2: Activities ==="
curl -s "${BASE_URL}/profiles/${RIDER_ID}/activities?start=0&limit=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) activities" else "❌ FAILED" end'
echo ""

# Test 3: Followers
echo "=== TEST 3: Followers List ==="
curl -s "${BASE_URL}/profiles/${RIDER_ID}/followers?start=0&limit=10" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) followers" else "❌ FAILED" end'
echo ""

# Test 4: Followees
echo "=== TEST 4: Followees List ==="
curl -s "${BASE_URL}/profiles/${RIDER_ID}/followees?start=0&limit=10" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) followees" else "❌ FAILED" end'
echo ""

# Test 5: Achievements
echo "=== TEST 5: Achievements ==="
curl -s "${BASE_URL}/profiles/${RIDER_ID}/achievements" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) achievements" else "❌ FAILED" end'
echo ""

# Test 6: Goals
echo "=== TEST 6: Goals ==="
curl -s "${BASE_URL}/profiles/${RIDER_ID}/goals" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) goals" else "❌ FAILED" end'
echo ""

# Test 7: World Records
echo "=== TEST 7: World Records ==="
curl -s "${BASE_URL}/profiles/${RIDER_ID}/worldrecords" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r 'if type == "object" then "✅ SUCCESS - World records found" else "❌ FAILED" end'
echo ""

# Test 8: Power Curve
echo "=== TEST 8: Power Curve ==="
curl -s "${BASE_URL}/profiles/${RIDER_ID}/power-curve" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r 'if type == "object" then "✅ SUCCESS - Power curve data" else "❌ FAILED" end'
echo ""

# Test 9: Segments
echo "=== TEST 9: Segment Results ==="
curl -s "${BASE_URL}/profiles/${RIDER_ID}/segment-results" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) segments" else "❌ FAILED" end'
echo ""

# Test 10: Events
echo "=== TEST 10: Event Feed ==="
curl -s "${BASE_URL}/events/feed" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) events" else "❌ FAILED" end'
echo ""

# Test 11: Specific Event
echo "=== TEST 11: Specific Event (Test ID: 3857086858394112772) ==="
curl -s "${BASE_URL}/events/3857086858394112772" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r 'if .id then "✅ SUCCESS - Event: \(.name)" else "❌ FAILED" end'
echo ""

# Test 12: Event Participants
echo "=== TEST 12: Event Participants ==="
curl -s "${BASE_URL}/events/3857086858394112772/participants" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) participants" else "❌ FAILED" end'
echo ""

# Test 13: Worlds
echo "=== TEST 13: Worlds List ==="
curl -s "${BASE_URL}/worlds" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) worlds" else "❌ FAILED" end'
echo ""

# Test 14: Routes
echo "=== TEST 14: Routes ==="
curl -s "${BASE_URL}/routes" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r 'if type == "array" then "✅ SUCCESS - \(length) routes" else "❌ FAILED" end'
echo ""

# Test 15: Garage (bikes/equipment)
echo "=== TEST 15: Garage ==="
curl -s "${BASE_URL}/profiles/${RIDER_ID}/garage" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r 'if type == "object" then "✅ SUCCESS - Garage data" else "❌ FAILED" end'
echo ""

echo "=================================="
echo "TEST COMPLETED"
echo "=================================="
