#!/bin/bash
# Test ZwiftRacing API endpoints voor Rider 150437 POC

API_TOKEN="650c6d2fc4ef6858d74cbef1"
RIDER_ID="150437"

echo "🧪 Testing ZwiftRacing API for Rider $RIDER_ID"
echo "=============================================="
echo ""

# Test 1: Haal rider profile op
echo "📊 Test 1: Rider Profile"
echo "GET /api/public/riders/$RIDER_ID"
echo ""
curl -s -H "Authorization: $API_TOKEN" \
  "https://api.zwiftracing.app/api/public/riders/$RIDER_ID" \
  | jq '{
      riderId: .riderId,
      name: .name,
      category: .zpCategory,
      velo: .race.current.rating,
      races: .race.stats.finishes,
      wins: .race.stats.wins,
      podiums: .race.stats.podiums,
      power: {
        w5: .power.w5,
        w15: .power.w15,
        w30: .power.w30,
        w60: .power.w60,
        w120: .power.w120,
        w300: .power.w300,
        w1200: .power.w1200,
        wkg5: .power.wkg5,
        wkg15: .power.wkg15,
        wkg30: .power.wkg30,
        wkg60: .power.wkg60,
        wkg120: .power.wkg120,
        wkg300: .power.wkg300,
        wkg1200: .power.wkg1200
      }
    }'

echo ""
echo ""

# Test 2: Check of er race history is
echo "📊 Test 2: Check Race History Structure"
echo ""
curl -s -H "Authorization: $API_TOKEN" \
  "https://api.zwiftracing.app/api/public/riders/$RIDER_ID" \
  | jq -r 'if .race.history then "✅ Race history available" else "❌ No race history in API" end'

echo ""
echo ""

# Test 3: Probeer een bekend event ID (als we die hebben)
echo "📊 Test 3: Example Event Results"
echo "Note: We need an event ID where rider 150437 participated"
echo ""

# We moeten eerst event IDs vinden waar deze rider aan meedeed
# Dit kunnen we mogelijk afleiden uit de ZwiftPower profiel pagina
# Of we moeten een lijst van recente events ophalen

echo "💡 Next Steps:"
echo "1. Find recent event IDs where rider 150437 participated"
echo "2. Test: GET /api/public/results/<eventId>"
echo "3. Filter results for our rider"
echo ""
