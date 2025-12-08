#!/bin/bash
# Railway Deployment Verification Script
# Controleert of de nieuwe minimal backend correct draait

RAILWAY_URL="https://teamnl-cloud9-racing-team-production.up.railway.app"

echo "🔍 Railway Deployment Verificatie"
echo "=================================="
echo ""

# Test 1: Health endpoint
echo "Test 1: Health endpoint..."
HEALTH_RESPONSE=$(curl -s "$RAILWAY_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo "✅ Health endpoint werkt"
    echo "   Response: $HEALTH_RESPONSE" | head -c 100
    echo ""
else
    echo "❌ Health endpoint faalt"
    echo "   Response: $HEALTH_RESPONSE"
    echo ""
    exit 1
fi

# Test 2: Check version
echo "Test 2: Check backend version..."
VERSION=$(echo "$HEALTH_RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
if [ "$VERSION" == "3.0.0-clean-slate" ]; then
    echo "✅ Nieuwe backend versie gedetecteerd: $VERSION"
else
    echo "⚠️  Oude versie of parsing error: $VERSION"
fi
echo ""

# Test 3: API health
echo "Test 3: API health endpoint..."
API_HEALTH=$(curl -s "$RAILWAY_URL/api/health")
if echo "$API_HEALTH" | grep -q "healthy"; then
    echo "✅ API health endpoint werkt"
else
    echo "❌ API health endpoint faalt"
    echo "   Response: $API_HEALTH"
fi
echo ""

# Test 4: Frontend laadt
echo "Test 4: Frontend (React app)..."
FRONTEND_RESPONSE=$(curl -s -I "$RAILWAY_URL/" | head -1)
if echo "$FRONTEND_RESPONSE" | grep -q "200"; then
    echo "✅ Frontend laadt (HTTP 200)"
else
    echo "❌ Frontend faalt"
    echo "   Response: $FRONTEND_RESPONSE"
fi
echo ""

# Test 5: Old API endpoint (moet 404 geven met bericht)
echo "Test 5: Oude API endpoint /api/riders/team (moet 404 zijn)..."
OLD_ENDPOINT=$(curl -s "$RAILWAY_URL/api/riders/team")
if echo "$OLD_ENDPOINT" | grep -q "not been implemented yet"; then
    echo "✅ Oude endpoint geeft correct 404 bericht"
    echo "   Message: API endpoint not found - not been implemented yet"
else
    echo "⚠️  Unexpected response:"
    echo "   $OLD_ENDPOINT"
fi
echo ""

echo "=================================="
echo "✅ Verificatie compleet!"
echo ""
echo "Volgende stappen:"
echo "1. Check Railway logs: https://railway.app/project/teamnl-cloud9-racing-team-production"
echo "2. Cleanup ENV vars: zie RAILWAY_ENV_MINIMAL.md"
echo "3. Test frontend: $RAILWAY_URL"
