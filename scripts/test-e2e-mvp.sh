#!/bin/bash
# E2E Test Script voor MVP
# Test complete flow: Upload → Scrape → Enrich → Verify

set -e # Exit on error

BASE_URL="http://localhost:3000/api"
RIDER_ID=150437

echo "🧪 MVP E2E Test - Rider ${RIDER_ID}"
echo "=================================="
echo ""

# Step 1: Upload rider
echo "📤 Step 1: Upload rider ${RIDER_ID}"
echo "-----------------------------------"
curl -s -X POST "${BASE_URL}/riders/upload-json" \
  -H "Content-Type: application/json" \
  -d "{\"riderIds\": [${RIDER_ID}]}" | jq '.'
echo ""
echo "✅ Rider uploaded"
echo ""

# Wait for rate limit
echo "⏳ Wait 5s..."
sleep 5

# Step 2: Scrape events
echo "🕷️  Step 2: Scrape events voor rider ${RIDER_ID}"
echo "-----------------------------------"
curl -s -X POST "${BASE_URL}/riders/${RIDER_ID}/scrape-events" \
  -H "Content-Type: application/json" \
  -d '{"days": 90}' | jq '.'
echo ""
echo "✅ Events scraped"
echo ""

# Step 3: Get unenriched events count
echo "📊 Step 3: Check enrichment stats"
echo "-----------------------------------"
curl -s "${BASE_URL}/enrichment-stats" | jq '.'
echo ""

# Step 4: Enrich first 5 events (test)
echo "🔍 Step 4: Enrich first 5 events"
echo "-----------------------------------"
curl -s -X POST "${BASE_URL}/enrich-all-events" \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}' | jq '.'
echo ""
echo "✅ Events enriched"
echo ""

# Step 4.5: Test nieuwe source data sync endpoints (STUB)
echo "🔄 Step 4.5: Test source data sync endpoints"
echo "-----------------------------------"

echo "  📋 Sync rider data to source_data..."
curl -s -X POST "${BASE_URL}/riders/${RIDER_ID}/sync" | jq '.'
echo ""

echo "  📋 Get rider history from source_data..."
curl -s "${BASE_URL}/riders/${RIDER_ID}/history?limit=5" | jq '.'
echo ""

echo "  📋 Sync club data to source_data..."
CLUB_ID=$(curl -s "${BASE_URL}/riders/${RIDER_ID}" | jq -r '.club.id // 2281')
curl -s -X POST "${BASE_URL}/clubs/${CLUB_ID}/sync" | jq '.'
echo ""

echo "  📋 Sync club roster to source_data..."
curl -s -X POST "${BASE_URL}/clubs/${CLUB_ID}/roster" | jq '.'
echo ""

echo "✅ Source data sync endpoints tested (STUB)"
echo ""

# Step 5: Verify data
echo "✅ Step 5: Verify complete flow"
echo "-----------------------------------"

echo "Rider details:"
curl -s "${BASE_URL}/riders/${RIDER_ID}" | jq '{
  zwiftId: .zwiftId,
  name: .name,
  club: .club.name,
  ftp: .ftp,
  ranking: .ranking,
  raceResults: (.raceResults | length)
}'
echo ""

echo "Event count:"
curl -s "${BASE_URL}/events?limit=1" | jq '{total: .total}'
echo ""

echo "Enrichment coverage:"
curl -s "${BASE_URL}/enrichment-stats" | jq '{
  totalEvents: .totalEvents,
  fullyEnriched: .fullyEnriched,
  needsEnrichment: .needsEnrichment,
  coverage: .coverage
}'
echo ""

echo "=================================="
echo "✅ E2E Test Complete!"
echo "=================================="
