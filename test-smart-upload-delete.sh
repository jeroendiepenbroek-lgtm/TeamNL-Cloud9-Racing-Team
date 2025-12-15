#!/bin/bash

API="https://teamnl-cloud9-racing-team-production.up.railway.app"

echo "🧪 TESTING SMART UPLOAD/DELETE API"
echo "===================================="
echo ""

# Test 1: Single rider upload (Format: { rider_id: 12345 })
echo "📝 Test 1: SINGLE RIDER UPLOAD (rider_id object)"
curl -s -X POST "$API/api/admin/riders" \
  -H "Content-Type: application/json" \
  -d '{"rider_id": 999999}' | jq -c '{success, operation, total, synced, failed, skipped}'
echo ""
echo ""

# Test 2: Multiple riders upload (Format: { rider_ids: [...] })
echo "📝 Test 2: MULTIPLE RIDERS UPLOAD (rider_ids array - legacy format)"
curl -s -X POST "$API/api/admin/riders" \
  -H "Content-Type: application/json" \
  -d '{"rider_ids": [999998, 999997, 999996]}' | jq -c '{success, operation, total, synced, failed, skipped}'
echo ""
echo ""

# Test 3: Bulk upload (Format: [12345, 67890, ...])
echo "📝 Test 3: BULK UPLOAD (direct array)"
curl -s -X POST "$API/api/admin/riders" \
  -H "Content-Type: application/json" \
  -d '[999995, 999994, 999993, 999992, 999991, 999990, 999989, 999988, 999987, 999986, 999985]' | jq -c '{success, operation, total, synced, failed, skipped}'
echo ""
echo ""

# Test 4: Single rider delete (URL param)
echo "📝 Test 4: SINGLE RIDER DELETE (URL param)"
curl -s -X DELETE "$API/api/admin/riders/999999" | jq -c '{success, operation, total, deleted, failed}'
echo ""
echo ""

# Test 5: Bulk delete (Body array)
echo "📝 Test 5: BULK DELETE (rider_ids in body)"
curl -s -X DELETE "$API/api/admin/riders" \
  -H "Content-Type: application/json" \
  -d '{"rider_ids": [999998, 999997, 999996, 999995, 999994]}' | jq -c '{success, operation, total, deleted, failed}'
echo ""
echo ""

# Test 6: Check sync logs
echo "📝 Test 6: VERIFY SYNC LOGS"
echo "Recent logs (should show upload + delete operations):"
curl -s "$API/api/admin/sync-logs?limit=6" | jq -c '.logs[] | {trigger_type, operation: .metadata.operation, operation_type: .metadata.operation_type, total: .total_items, success: .success_count, failed: .failed_count, status}'
echo ""
echo ""

echo "✅ All tests completed!"
