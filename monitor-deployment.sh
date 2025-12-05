#!/bin/bash
# Monitor Railway deployment status
# Usage: ./monitor-deployment.sh

URL="https://teamnl-cloud9-racing-team-production.up.railway.app"
TARGET_VERSION="2.1.0"
CHECK_INTERVAL=10  # seconds
MAX_CHECKS=60      # 10 minutes total

echo "🔍 Monitoring Railway deployment..."
echo "📍 URL: $URL"
echo "🎯 Target version: $TARGET_VERSION"
echo "⏱️  Max wait time: $((MAX_CHECKS * CHECK_INTERVAL / 60)) minutes"
echo ""

for i in $(seq 1 $MAX_CHECKS); do
  printf "[%02d/%02d] Checking... " "$i" "$MAX_CHECKS"
  
  # Get health endpoint
  response=$(curl -s "$URL/health" 2>/dev/null)
  
  if [ $? -ne 0 ]; then
    echo "❌ Failed to connect (service might be restarting)"
  else
    version=$(echo "$response" | jq -r '.version // "unknown"')
    status=$(echo "$response" | jq -r '.status // "unknown"')
    
    if [[ "$version" == *"$TARGET_VERSION"* ]]; then
      echo "✅ SUCCESS! New version deployed: $version"
      echo ""
      echo "📊 Full health check:"
      echo "$response" | jq '.'
      echo ""
      echo "🧪 Testing sync endpoints..."
      
      # Test sync status endpoint
      sync_status=$(curl -s "$URL/api/sync/status" 2>/dev/null)
      if echo "$sync_status" | jq -e '.error' >/dev/null 2>&1; then
        echo "⚠️  Sync endpoint returned error:"
        echo "$sync_status" | jq '.'
      else
        echo "✅ Sync endpoint working:"
        echo "$sync_status" | jq '.'
      fi
      
      exit 0
    else
      echo "⏳ Old version: $version (status: $status)"
    fi
  fi
  
  sleep $CHECK_INTERVAL
done

echo ""
echo "⏰ Timeout reached after $((MAX_CHECKS * CHECK_INTERVAL / 60)) minutes"
echo "❌ Deployment did not complete in expected time"
echo ""
echo "💡 Manual check:"
echo "   curl $URL/health | jq '.version'"
exit 1
