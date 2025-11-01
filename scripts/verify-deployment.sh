#!/usr/bin/env bash
# Deployment Verification Script
# Tests all deployment endpoints en functionalities

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${1:-http://localhost:3000}"
FRONTEND_URL="${2:-http://localhost:5173}"
TEST_RIDER_ID="150437"
TEST_CLUB_ID="11818"

echo "🧪 Deployment Verification Script"
echo "=================================="
echo "Backend:  $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""

# Test 1: Backend Health Check
echo "Test 1: Backend Health Check..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health")
if [ "$response" -eq 200 ]; then
    echo -e "${GREEN}✅ Backend health check passed${NC}"
else
    echo -e "${RED}❌ Backend health check failed (HTTP $response)${NC}"
    exit 1
fi

# Test 2: Supabase Connection
echo ""
echo "Test 2: Supabase Connection..."
stats=$(curl -s "$BACKEND_URL/api/supabase/stats")
if echo "$stats" | grep -q "riders"; then
    echo -e "${GREEN}✅ Supabase connection working${NC}"
    echo "   Stats: $stats"
else
    echo -e "${RED}❌ Supabase connection failed${NC}"
    echo "   Response: $stats"
    exit 1
fi

# Test 3: Sync Single Rider
echo ""
echo "Test 3: Sync Test Rider ($TEST_RIDER_ID)..."
sync_response=$(curl -s -X POST "$BACKEND_URL/api/sync/rider/$TEST_RIDER_ID")
if echo "$sync_response" | grep -q "success"; then
    echo -e "${GREEN}✅ Rider sync successful${NC}"
    echo "   Response: $sync_response"
else
    echo -e "${YELLOW}⚠️  Rider sync failed (mogelijk rate limit of invalid ID)${NC}"
    echo "   Response: $sync_response"
fi

# Test 4: Verify Rider in Database
echo ""
echo "Test 4: Verify Rider in Supabase..."
rider_check=$(curl -s "$BACKEND_URL/api/riders/$TEST_RIDER_ID")
if echo "$rider_check" | grep -q "zwift_id"; then
    echo -e "${GREEN}✅ Rider found in database${NC}"
    echo "   Data: $(echo "$rider_check" | head -c 100)..."
else
    echo -e "${YELLOW}⚠️  Rider not found (run sync first)${NC}"
fi

# Test 5: Club Sync
echo ""
echo "Test 5: Club Sync ($TEST_CLUB_ID)..."
club_response=$(curl -s -X POST "$BACKEND_URL/api/sync/club/$TEST_CLUB_ID")
if echo "$club_response" | grep -q "success"; then
    echo -e "${GREEN}✅ Club sync successful${NC}"
    echo "   Response: $(echo "$club_response" | head -c 150)..."
else
    echo -e "${YELLOW}⚠️  Club sync failed (mogelijk rate limit)${NC}"
    echo "   Response: $club_response"
fi

# Test 6: Frontend Accessibility
echo ""
echo "Test 6: Frontend Accessibility..."
frontend_check=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$frontend_check" -eq 200 ]; then
    echo -e "${GREEN}✅ Frontend accessible${NC}"
else
    echo -e "${RED}❌ Frontend not accessible (HTTP $frontend_check)${NC}"
fi

# Test 7: API CORS (if different origins)
if [[ "$BACKEND_URL" != *"localhost"* ]]; then
    echo ""
    echo "Test 7: CORS Configuration..."
    cors_check=$(curl -s -H "Origin: $FRONTEND_URL" -H "Access-Control-Request-Method: POST" -X OPTIONS "$BACKEND_URL/api/sync/rider/150437" -o /dev/null -w "%{http_code}")
    if [ "$cors_check" -eq 200 ] || [ "$cors_check" -eq 204 ]; then
        echo -e "${GREEN}✅ CORS configured correctly${NC}"
    else
        echo -e "${RED}❌ CORS not configured (HTTP $cors_check)${NC}"
    fi
fi

echo ""
echo "=================================="
echo -e "${GREEN}🎉 Deployment verification complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Open frontend: $FRONTEND_URL"
echo "2. Test AdminPanel → Upload rider $TEST_RIDER_ID"
echo "3. Check dashboard → Rider should appear with real-time update"
echo "4. Monitor logs:"
echo "   - Backend: npm run logs (if using PM2) or Railway logs"
echo "   - Frontend: Browser DevTools console"
echo "   - Supabase: https://supabase.com/dashboard → Logs"
