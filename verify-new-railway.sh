#!/bin/bash
# Railway Nieuw Project - Verificatie Script
# Test nieuwe deployment na setup

echo "🔍 Railway Nieuw Project Verificatie"
echo "====================================="
echo ""

# Vraag om Railway URL
read -p "Voer je nieuwe Railway URL in (zonder https://): " RAILWAY_URL

if [ -z "$RAILWAY_URL" ]; then
    echo "❌ Geen URL ingevoerd"
    exit 1
fi

FULL_URL="https://$RAILWAY_URL"
echo "Testing: $FULL_URL"
echo ""

# Test 1: Health endpoint
echo "Test 1: Health endpoint..."
HEALTH=$(curl -s "$FULL_URL/health" 2>/dev/null)

if [ -z "$HEALTH" ]; then
    echo "❌ Geen response - is de server running?"
    exit 1
fi

VERSION=$(echo "$HEALTH" | jq -r '.version // "unknown"' 2>/dev/null)
STATUS=$(echo "$HEALTH" | jq -r '.status // "unknown"' 2>/dev/null)

if [ "$VERSION" == "3.0.0-clean-slate" ] && [ "$STATUS" == "healthy" ]; then
    echo "✅ Health endpoint werkt"
    echo "   Version: $VERSION"
    echo "   Status: $STATUS"
else
    echo "⚠️  Unexpected response:"
    echo "$HEALTH" | jq '.' 2>/dev/null || echo "$HEALTH"
fi
echo ""

# Test 2: Frontend
echo "Test 2: Frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FULL_URL/" 2>/dev/null)

if [ "$FRONTEND_STATUS" == "200" ]; then
    echo "✅ Frontend laadt (HTTP 200)"
else
    echo "❌ Frontend error (HTTP $FRONTEND_STATUS)"
fi
echo ""

# Test 3: API health
echo "Test 3: API health..."
API_HEALTH=$(curl -s "$FULL_URL/api/health" 2>/dev/null | jq -r '.status // "error"' 2>/dev/null)

if [ "$API_HEALTH" == "healthy" ]; then
    echo "✅ API health endpoint werkt"
else
    echo "⚠️  API health: $API_HEALTH"
fi
echo ""

# Test 4: Old endpoint (should 404)
echo "Test 4: Oude endpoint (moet 404 zijn)..."
OLD_ENDPOINT=$(curl -s "$FULL_URL/api/riders/team" 2>/dev/null)
if echo "$OLD_ENDPOINT" | grep -q "not been implemented yet"; then
    echo "✅ Oude endpoint geeft correct 404 bericht"
else
    echo "⚠️  Unexpected: $OLD_ENDPOINT"
fi
echo ""

echo "====================================="
echo "✅ Verificatie compleet!"
echo ""
echo "Frontend URL: $FULL_URL"
echo "Health: $FULL_URL/health"
echo ""
echo "Volgende stappen:"
echo "1. Open frontend in browser"
echo "2. Test Discord login"
echo "3. Check Railway logs voor errors"
echo "4. Verwijder oude Railway project"
