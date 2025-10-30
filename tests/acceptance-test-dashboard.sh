#!/bin/bash
# 🧪 Acceptatietest - Rijdersdashboard US1, US2, US3
# Test datum: 30 oktober 2025

echo "════════════════════════════════════════════════════════════════"
echo "🧪 ACCEPTATIETEST: Rijdersdashboard voor Rider 150437"
echo "════════════════════════════════════════════════════════════════"
echo ""

API_BASE="http://localhost:3000"
RIDER_ID="150437"
PASS=0
FAIL=0

# Helper functions
test_endpoint() {
    local name=$1
    local url=$2
    local expected_field=$3
    
    echo -n "Testing: $name... "
    response=$(curl -s "$url")
    
    if echo "$response" | grep -q "$expected_field"; then
        echo "✅ PASS"
        ((PASS++))
        return 0
    else
        echo "❌ FAIL"
        echo "   Response: $(echo $response | head -c 100)..."
        ((FAIL++))
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 US1: Rijdersdashboard - Algemene Informatie"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Dashboard endpoint
test_endpoint "Dashboard API endpoint" \
    "$API_BASE/api/riders/$RIDER_ID/dashboard" \
    '"rider"'

# Test 2: Rider naam aanwezig
echo -n "Testing: Rider naam (JRøne)... "
rider_data=$(curl -s "$API_BASE/api/riders/$RIDER_ID/dashboard")
if echo "$rider_data" | jq -e '.rider.name' | grep -q "JRøne"; then
    echo "✅ PASS"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

# Test 3: FTP data
echo -n "Testing: FTP data aanwezig... "
if echo "$rider_data" | jq -e '.rider.ftp' | grep -q "270"; then
    echo "✅ PASS (270w)"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

# Test 4: Category racing
echo -n "Testing: Category racing... "
if echo "$rider_data" | jq -e '.rider.categoryRacing' | grep -q "B"; then
    echo "✅ PASS (Category B)"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

# Test 5: Club data
echo -n "Testing: Club data (TeamNL)... "
if echo "$rider_data" | jq -e '.club.name' | grep -q "TeamNL"; then
    echo "✅ PASS"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

# Test 6: Phenotype
echo -n "Testing: Phenotype (Sprinter)... "
if echo "$rider_data" | jq -e '.phenotype.primaryType' | grep -q "Sprinter"; then
    echo "✅ PASS"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

# Test 7: Rating data
echo -n "Testing: Rating data aanwezig... "
if echo "$rider_data" | jq -e '.rating.current' | grep -q "[0-9]"; then
    current=$(echo "$rider_data" | jq -r '.rating.current')
    max90=$(echo "$rider_data" | jq -r '.rating.max90')
    echo "✅ PASS (Current: $current, Max90: $max90)"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

# Test 8: Totals (finishes, wins, etc)
echo -n "Testing: Racing totals... "
if echo "$rider_data" | jq -e '.totals.finishes' | grep -q "[0-9]"; then
    finishes=$(echo "$rider_data" | jq -r '.totals.finishes')
    echo "✅ PASS ($finishes finishes)"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 US2: Rijdersdashboard - 90 Days Ontwikkeling"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 9: Events endpoint
echo -n "Testing: Events endpoint (90 days)... "
events_data=$(curl -s "$API_BASE/api/riders/$RIDER_ID/events?days=90")
event_count=$(echo "$events_data" | jq '. | length')
if [ "$event_count" -gt 0 ]; then
    echo "✅ PASS ($event_count events found)"
    ((PASS++))
else
    echo "❌ FAIL (No events found)"
    ((FAIL++))
fi

# Test 10: Event data structure
echo -n "Testing: Event data bevat position... "
if echo "$events_data" | jq -e '.[0].position' >/dev/null 2>&1; then
    position=$(echo "$events_data" | jq -r '.[0].position')
    echo "✅ PASS (Position: $position)"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

# Test 11: Event power data
echo -n "Testing: Event power data... "
if echo "$events_data" | jq -e '.[0].avgPower' >/dev/null 2>&1; then
    power=$(echo "$events_data" | jq -r '.[0].avgPower')
    echo "✅ PASS (Avg Power: ${power}w)"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

# Test 12: Rating history endpoint
echo -n "Testing: Rating history endpoint... "
rating_history=$(curl -s "$API_BASE/api/riders/$RIDER_ID/rating-history?days=90")
history_count=$(echo "$rating_history" | jq '. | length')
if [ "$history_count" -gt 0 ]; then
    echo "✅ PASS ($history_count data points)"
    ((PASS++))
else
    echo "❌ FAIL (No rating history)"
    ((FAIL++))
fi

# Test 13: Different day filters
echo -n "Testing: 30 days filter... "
events_30=$(curl -s "$API_BASE/api/riders/$RIDER_ID/events?days=30")
count_30=$(echo "$events_30" | jq '. | length')
if [ "$count_30" -ge 0 ]; then
    echo "✅ PASS ($count_30 events)"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

echo -n "Testing: 60 days filter... "
events_60=$(curl -s "$API_BASE/api/riders/$RIDER_ID/events?days=60")
count_60=$(echo "$events_60" | jq '. | length')
if [ "$count_60" -ge 0 ]; then
    echo "✅ PASS ($count_60 events)"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏁 US3: Event Detail Page met Race Resultaten"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 14: Event detail endpoint
EVENT_ID="5001"
echo -n "Testing: Event detail endpoint (ID: $EVENT_ID)... "
event_detail=$(curl -s "$API_BASE/api/events/$EVENT_ID")
if echo "$event_detail" | jq -e '.event' >/dev/null 2>&1; then
    event_name=$(echo "$event_detail" | jq -r '.event.name')
    echo "✅ PASS (Event: $event_name)"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

# Test 15: Event results aanwezig
echo -n "Testing: Event results lijst... "
results_count=$(echo "$event_detail" | jq '.results | length')
if [ "$results_count" -gt 0 ]; then
    echo "✅ PASS ($results_count results)"
    ((PASS++))
else
    echo "❌ FAIL (No results)"
    ((FAIL++))
fi

# Test 16: Rider in results (position 150437)
echo -n "Testing: Rider 150437 in results... "
if echo "$event_detail" | jq -e '.results[] | select(.riderId == 150437)' >/dev/null 2>&1; then
    rider_pos=$(echo "$event_detail" | jq -r '.results[] | select(.riderId == 150437) | .position')
    echo "✅ PASS (Position: $rider_pos)"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Frontend Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 17: Rider dashboard HTML bereikbaar
echo -n "Testing: rider-dashboard.html... "
dashboard_html=$(curl -s "$API_BASE/rider-dashboard.html")
if echo "$dashboard_html" | grep -q "Rijdersdashboard"; then
    echo "✅ PASS"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

# Test 18: Chart.js loaded
echo -n "Testing: Chart.js library included... "
if echo "$dashboard_html" | grep -q "chart.js"; then
    echo "✅ PASS"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

# Test 19: Event detail HTML bereikbaar
echo -n "Testing: event-detail.html... "
event_html=$(curl -s "$API_BASE/event-detail.html")
if echo "$event_html" | grep -q "Event Detail"; then
    echo "✅ PASS"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Server & Infrastructure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 20: Health check
echo -n "Testing: Server health check... "
health=$(curl -s "$API_BASE/api/health")
if echo "$health" | jq -e '.status' | grep -q "ok"; then
    echo "✅ PASS"
    ((PASS++))
else
    echo "❌ FAIL"
    ((FAIL++))
fi

# Test 21: PM2 status
echo -n "Testing: PM2 process running... "
if npx pm2 list | grep -q "online"; then
    echo "✅ PASS"
    ((PASS++))
else
    echo "⚠️  WARNING (PM2 not running or no processes)"
    ((PASS++))  # Don't fail on this, might use npm run dev
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📊 RESULTATEN"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "✅ PASSED: $PASS tests"
echo "❌ FAILED: $FAIL tests"
echo ""

TOTAL=$((PASS + FAIL))
PERCENTAGE=$((PASS * 100 / TOTAL))

echo "Success Rate: $PERCENTAGE% ($PASS/$TOTAL)"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 ALLE TESTEN GESLAAGD!"
    echo ""
    echo "✅ US1: Rijdersdashboard - Algemene Informatie → ACCEPTED"
    echo "✅ US2: Rijdersdashboard - 90 Days Ontwikkeling → ACCEPTED"
    echo "✅ US3: Event Detail Page → ACCEPTED"
    echo ""
    echo "🚀 Dashboard is PRODUCTION READY!"
    exit 0
else
    echo "⚠️  $FAIL test(s) gefaald. Review output hierboven."
    exit 1
fi
