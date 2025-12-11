#!/bin/bash
set -e

echo "🔐 Testing login..."
TOKEN=$(curl -s -X POST http://localhost:8080/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@teamnl.cloud9","password":"admin123"}' | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  exit 1
fi

echo "✅ Login successful!"
echo "Token: ${TOKEN:0:50}..."

echo ""
echo "➕ Adding test rider 150437..."
RESULT=$(curl -s -X POST http://localhost:8080/api/admin/team/riders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rider_id":150437}')

echo "$RESULT" | jq .

if echo "$RESULT" | jq -e '.rider_id' > /dev/null 2>&1; then
  echo "✅ Rider added successfully!"
else
  echo "❌ Failed to add rider"
  echo "$RESULT"
  exit 1
fi

echo ""
echo "⏳ Waiting 10 seconds for sync..."
sleep 10

echo ""
echo "📊 Checking team roster..."
curl -s -X GET http://localhost:8080/api/admin/team/riders \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.rider_id==150437)'

echo ""
echo "✅ Test complete!"
