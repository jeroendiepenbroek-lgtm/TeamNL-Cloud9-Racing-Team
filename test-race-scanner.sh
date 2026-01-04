#!/bin/bash
# Test script voor Race Results Scanner
# Datum: 3 januari 2026

BASE_URL="http://localhost:8080"

echo "=================================================="
echo "🔍 RACE RESULTS SCANNER - TEST SCRIPT"
echo "=================================================="
echo ""

# Functie om JSON mooi te printen
print_json() {
    if command -v jq &> /dev/null; then
        echo "$1" | jq '.'
    else
        echo "$1"
    fi
}

# Test 1: Check scanner status
echo "📊 Test 1: Scanner Status"
echo "GET /api/admin/scan-status"
echo "--------------------------------------------------"
response=$(curl -s "$BASE_URL/api/admin/scan-status")
print_json "$response"
echo ""
echo ""

# Test 2: Trigger manual scan
echo "🚀 Test 2: Trigger Manual Scan"
echo "POST /api/admin/scan-race-results"
echo "--------------------------------------------------"
response=$(curl -s -X POST "$BASE_URL/api/admin/scan-race-results")
print_json "$response"
echo ""
echo "⏳ Scanner is gestart in achtergrond..."
echo "   Wacht 30 seconden voor resultaten..."
echo ""
sleep 30
echo ""

# Test 3: Check status na scan
echo "📈 Test 3: Status na Scan"
echo "GET /api/admin/scan-status"
echo "--------------------------------------------------"
response=$(curl -s "$BASE_URL/api/admin/scan-status")
print_json "$response"
echo ""
echo ""

# Test 4: Haal cached results op
echo "💾 Test 4: Cached Results"
echo "GET /api/results/my-riders/cached"
echo "--------------------------------------------------"
response=$(curl -s "$BASE_URL/api/results/my-riders/cached")
print_json "$response"
echo ""
echo ""

# Test 5: Update scanner config
echo "⚙️  Test 5: Update Scanner Config"
echo "POST /api/admin/scan-config"
echo "--------------------------------------------------"
echo "Stel interval in op 120 minuten..."
response=$(curl -s -X POST "$BASE_URL/api/admin/scan-config" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "scan_interval_minutes": 120,
    "lookback_hours": 48,
    "max_events_per_scan": 100
  }')
print_json "$response"
echo ""
echo ""

# Test 6: Verify config update
echo "✅ Test 6: Verifieer Config Update"
echo "GET /api/admin/scan-status"
echo "--------------------------------------------------"
response=$(curl -s "$BASE_URL/api/admin/scan-status")
print_json "$response"
echo ""
echo ""

echo "=================================================="
echo "✅ ALLE TESTS UITGEVOERD"
echo "=================================================="
echo ""
echo "📋 Volgende stappen:"
echo "   1. Check server logs: tail -f /tmp/server.log"
echo "   2. Check Supabase race_results table voor data"
echo "   3. Check race_scan_log voor scan geschiedenis"
echo ""
