#!/bin/bash

API_KEY="650c6d2fc4ef6858d74cbef1"
BASE_URL="https://zwift-ranking.herokuapp.com"

echo "============================================"
echo "Testing MISSING ZwiftRacing Endpoints"
echo "============================================"
echo ""

# Test 1: Clubs endpoint (corrected URL structure)
echo "TEST 1: GET /public/clubs/11818"
curl -s -H "API-KEY: $API_KEY" \
  "$BASE_URL/public/clubs/11818" | jq -c 'if type == "array" then "\(length) members found" else . end' || echo "FAILED"
echo ""

# Test 2: Rider with timestamp (historical data)
# Get rider 150437 data from 30 days ago
TIMESTAMP_30_DAYS_AGO=$(date -d "30 days ago" +%s)
echo "TEST 2: GET /public/riders/150437/$TIMESTAMP_30_DAYS_AGO (30 days ago)"
curl -s -H "API-KEY: $API_KEY" \
  "$BASE_URL/public/riders/150437/$TIMESTAMP_30_DAYS_AGO" | jq -c '{name, velo, ftp, power_1200s}' || echo "FAILED"
echo ""

# Test 3: Bulk riders with timestamp
echo "TEST 3: POST /public/riders/$TIMESTAMP_30_DAYS_AGO (bulk historical)"
curl -s -X POST -H "API-KEY: $API_KEY" -H "Content-Type: application/json" \
  -d '[150437, 8, 5574]' \
  "$BASE_URL/public/riders/$TIMESTAMP_30_DAYS_AGO" | jq -c 'if type == "array" then "\(length) riders, sample: \(.[0] | {name, velo})" else . end' || echo "FAILED"
echo ""

# Test 4: ZwiftPower results via ZwiftRacing
# Event 4879983 (from documentation example)
echo "TEST 4: GET /public/zp/4879983/results (ZwiftPower results)"
curl -s -H "API-KEY: $API_KEY" \
  "$BASE_URL/public/zp/4879983/results" | jq -c 'if type == "array" then "\(length) results" elif type == "object" then keys else . end' || echo "FAILED"
echo ""

echo "============================================"
echo "Testing PAGINATION on clubs"
echo "============================================"

# Test 5: Clubs with pagination (riderId > 100000)
echo "TEST 5: GET /public/clubs/11818/100000 (pagination)"
curl -s -H "API-KEY: $API_KEY" \
  "$BASE_URL/public/clubs/11818/100000" | jq -c 'if type == "array" then "\(length) members with riderId > 100000" else . end' || echo "FAILED"

