#!/bin/bash
SUPABASE_URL="https://bktbeefdmrpxhsyyalvc.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU"
ZWIFT_API_KEY="650c6d2fc4ef6858d74cbef1"
EVENT_ID=5229579

echo ""
echo "🔄 SYNCING EVENT $EVENT_ID RESULTS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 1. Fetch results
echo "1️⃣  Fetching results from ZwiftRacing.app..."
RESULTS=$(curl -s "https://zwift-ranking.herokuapp.com/public/results/$EVENT_ID" \
  -H "Authorization: $ZWIFT_API_KEY")

if echo "$RESULTS" | jq -e '.[0]' > /dev/null 2>&1; then
  COUNT=$(echo "$RESULTS" | jq 'length')
  echo "   ✅ $COUNT results fetched"
else
  echo "   ❌ No results or API error"
  echo "$RESULTS" | jq '.'
  exit 1
fi

# 2. Check zwift_api_race_results schema
echo ""
echo "2️⃣  Checking zwift_api_race_results schema..."
SAMPLE=$(curl -s "$SUPABASE_URL/rest/v1/zwift_api_race_results?limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY")

if echo "$SAMPLE" | jq -e '.[0]' > /dev/null 2>&1; then
  echo "   Available columns:"
  echo "$SAMPLE" | jq '.[0] | keys' | head -20
else
  echo "   Table empty, will infer from first insert"
fi

# 3. Insert results (first 10 for POC)
echo ""
echo "3️⃣  Inserting results (first 10)..."

RESULTS_MAPPED=$(echo "$RESULTS" | jq '[.[:10][] | {
  event_id: '"$EVENT_ID"',
  rider_id: .riderId,
  rider_name: .name,
  position: .position,
  power: .power,
  wkg: .wkg,
  heart_rate: .heartRate,
  time_seconds: .time,
  gap_seconds: .gap
}]')

INSERT_RESULT=$(curl -s "$SUPABASE_URL/rest/v1/zwift_api_race_results" \
  -X POST \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=ignore-duplicates,return=representation" \
  -d "$RESULTS_MAPPED")

if echo "$INSERT_RESULT" | jq -e '.[0]' > /dev/null 2>&1; then
  INSERTED=$(echo "$INSERT_RESULT" | jq 'length')
  echo "   ✅ $INSERTED results inserted"
  
  # Check if rider 150437 is in results
  RIDER_150437=$(echo "$RESULTS" | jq '.[] | select(.riderId == 150437)')
  if [ -n "$RIDER_150437" ]; then
    POS=$(echo "$RIDER_150437" | jq '.position')
    POWER=$(echo "$RIDER_150437" | jq '.power')
    echo "   ✅ Rider 150437 found at position $POS ($POWER W)"
  fi
else
  echo "   ❌ Insert failed or all duplicates:"
  echo "$INSERT_RESULT" | jq '.' | head -30
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
