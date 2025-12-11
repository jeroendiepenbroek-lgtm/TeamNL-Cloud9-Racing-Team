#!/bin/bash
# Test Supabase API Keys voor bktbeefdmrpxhsyyalvc

SUPABASE_URL="https://bktbeefdmrpxhsyyalvc.supabase.co"

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Supabase API Key Tester - bktbeefdmrpxhsyyalvc      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if key is provided
if [ -z "$1" ]; then
    echo "❌ Gebruik: ./test-supabase-keys.sh <YOUR_ANON_KEY>"
    echo ""
    echo "📍 Haal je API keys op van:"
    echo "   https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/settings/api"
    echo ""
    echo "   Kopieer de 'anon' key (public) en plak hier:"
    echo "   ./test-supabase-keys.sh eyJhbGciOiJIUzI1NiIsInR5cCI6..."
    exit 1
fi

ANON_KEY="$1"

echo "🔍 Testing connection..."
echo "   URL: $SUPABASE_URL"
echo "   Key: ${ANON_KEY:0:30}..."
echo ""

# Test 1: Check if API is reachable
echo "Test 1: Basic API connectivity"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${SUPABASE_URL}/rest/v1/")

if [ "$RESPONSE" -eq 200 ] || [ "$RESPONSE" -eq 401 ]; then
    echo "   ✅ API is reachable (HTTP $RESPONSE)"
else
    echo "   ❌ API unreachable (HTTP $RESPONSE)"
    echo "   ⚠️  Project mogelijk gepauzeerd of verwijderd"
    echo "   👉 Check: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc"
    exit 1
fi

# Test 2: Check if key is valid
echo ""
echo "Test 2: API Key validation"
RESPONSE=$(curl -s "${SUPABASE_URL}/rest/v1/v_rider_complete?select=count&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY")

if echo "$RESPONSE" | grep -q "Invalid API key"; then
    echo "   ❌ Invalid API key"
    echo "   👉 Haal nieuwe key op:"
    echo "      https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/settings/api"
    exit 1
elif echo "$RESPONSE" | grep -q "relation.*does not exist"; then
    echo "   ✅ API key is VALID!"
    echo "   ⚠️  View 'v_rider_complete' bestaat nog niet"
    echo ""
    echo "📋 Volgende stap: Draai migrations"
    echo "   1. Open: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new"
    echo "   2. Kopieer/plak: SETUP_SUPABASE_COMPLETE.sql"
    echo "   3. Klik 'Run'"
    exit 0
elif echo "$RESPONSE" | grep -q "count"; then
    echo "   ✅ API key is VALID!"
    echo "   ✅ View 'v_rider_complete' EXISTS!"
    echo ""
    echo "📊 Data check:"
    curl -s "${SUPABASE_URL}/rest/v1/v_rider_complete?select=rider_id,full_name,velo_live&order=velo_live.desc.nullslast&limit=3" \
      -H "apikey: $ANON_KEY" \
      -H "Authorization: Bearer $ANON_KEY" | jq '.'
    echo ""
    echo "✅ ALLES WERKT! Update je .env files met deze key:"
    echo ""
    echo "   frontend/.env:"
    echo "   VITE_SUPABASE_URL=$SUPABASE_URL"
    echo "   VITE_SUPABASE_ANON_KEY=$ANON_KEY"
    echo ""
else
    echo "   ⚠️  Unexpected response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
fi
