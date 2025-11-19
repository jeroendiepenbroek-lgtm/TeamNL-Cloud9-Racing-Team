#!/bin/bash
# Quick signup sync voor event 5208495
# Gebruikt ZwiftRacing.app API direct

EVENT_ID="5208495"

echo "🔄 Syncing signups for event ${EVENT_ID}..."
echo ""

# Haal signups op van ZwiftRacing API
RESPONSE=$(curl -s "https://www.zwiftpower.com/api3.php?do=event_signups&zid=${EVENT_ID}")

# Check of we data hebben
if echo "$RESPONSE" | jq -e '.signups' > /dev/null 2>&1; then
  TOTAL=$(echo "$RESPONSE" | jq '.signups | length')
  echo "✅ Found ${TOTAL} signups"
  
  # Check voor rider 397234
  RIDER_FOUND=$(echo "$RESPONSE" | jq '.signups[] | select(.zwid == 397234)')
  
  if [ ! -z "$RIDER_FOUND" ]; then
    echo ""
    echo "🎯 RIDER 397234 FOUND!"
    echo "$RIDER_FOUND" | jq '.'
  else
    echo ""
    echo "❌ Rider 397234 NOT in signups"
    echo ""
    echo "Possible reasons:"
    echo "- Rider signed up after API cache refresh"
    echo "- Rider is in different event"
    echo "- Check event ID is correct"
  fi
else
  echo "⚠️  No signup data received"
  echo "Response: $RESPONSE"
fi

echo ""
echo "ℹ️  Note: Backend FULL sync at 15:50 will sync ALL event signups automatically"
