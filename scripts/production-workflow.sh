#!/bin/bash

# Production Workflow - Complete Test met ClubID 2281 Bypass
# ===========================================================

BASE_URL="http://localhost:3000/api"
RIDER_ID=150437
CLUB_ID=2281

echo "=========================================="
echo "🏁 TeamNL Cloud9 - Complete Production Workflow"
echo "=========================================="
echo ""
echo "Test Rider: $RIDER_ID"
echo "Bypass Club: $CLUB_ID (hardcoded)"
echo ""

# Step 1: Ensure rider is favorite
echo "Step 1: ✅ Favorite rider check..."
RIDER_DATA=$(curl -s "$BASE_URL/favorites" | jq '.[] | select(.zwiftId == '"$RIDER_ID"')')
if [ -z "$RIDER_DATA" ]; then
    echo "  Adding rider $RIDER_ID as favorite..."
    curl -s -X POST "$BASE_URL/favorites" \
        -H "Content-Type: application/json" \
        -d "{\"zwiftId\": $RIDER_ID, \"priority\": 1, \"addedBy\": \"workflow-test\"}" | jq -r '.message'
else
    echo "  ✅ Rider $RIDER_ID already favorite"
fi

echo ""

# Step 2: Club members sync (with rate limit check)
echo "Step 2: 👥 Club members sync voor club $CLUB_ID..."

# Check last sync time
LAST_SYNC=$(curl -s "$BASE_URL/sync/logs" | jq -r '[.[] | select(.syncType == "club" and .status == "success")] | .[0] | .completedAt // empty')

if [ ! -z "$LAST_SYNC" ]; then
    LAST_SYNC_TS=$(date -d "$LAST_SYNC" +%s 2>/dev/null || echo "0")
    NOW_TS=$(date +%s)
    DIFF=$((NOW_TS - LAST_SYNC_TS))
    
    if [ $DIFF -lt 60 ]; then
        WAIT_TIME=$((65 - DIFF))
        echo "  ⏳ Rate limit: wachten $WAIT_TIME seconden..."
        sleep $WAIT_TIME
    fi
fi

echo "  Syncing club $CLUB_ID..."
CLUB_RESULT=$(curl -s -X POST "$BASE_URL/sync/club")
echo "$CLUB_RESULT" | jq -r 'if .error then "  ❌ Error: \(.error)" else "  ✅ Success: \(.message)" end'

# Check club members count
MEMBER_COUNT=$(sqlite3 /workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db "SELECT COUNT(*) FROM club_members WHERE clubId = $CLUB_ID")
echo "  📊 Club members in DB: $MEMBER_COUNT"

echo ""

# Step 3: Sync rider events (90 dagen) - Direct API call
echo "Step 3: 🏆 Sync events voor rider $RIDER_ID (90 dagen lookback)..."

# Try to get rider results from ZwiftRacing API
echo "  Fetching rider results from API..."
API_RESULTS=$(curl -s "https://zwift-ranking.herokuapp.com/api/public/riders/$RIDER_ID/results?page=1&limit=100")

# Check if we got valid results
RESULT_COUNT=$(echo "$API_RESULTS" | jq -r 'if type == "array" then length else 0 end')

if [ "$RESULT_COUNT" -gt 0 ]; then
    echo "  ✅ Found $RESULT_COUNT results from API"
    
    # Filter last 90 days
    NINETY_DAYS_AGO=$(date -d '90 days ago' -u +%Y-%m-%dT%H:%M:%S.000Z)
    echo "  Filtering events since: $NINETY_DAYS_AGO"
    
    # Count recent results
    RECENT_COUNT=$(echo "$API_RESULTS" | jq --arg cutoff "$NINETY_DAYS_AGO" '[.[] | select(.eventDate >= $cutoff)] | length')
    echo "  📅 Recent events (last 90 days): $RECENT_COUNT"
    
    # TODO: Store these results in database (needs endpoint implementation)
    echo "  ⚠️  Storage not implemented yet - needs POST /api/workflow/sync/rider-events endpoint"
else
    echo "  ❌ No results found or API error"
    echo "$API_RESULTS" | jq -r 'if .message then "  Error: \(.message)" else . end' | head -3
fi

echo ""

# Step 4: Sync club member events (24 uur)
echo "Step 4: 🔍 Sync events voor club $CLUB_ID members (24 uur lookback)..."

if [ "$MEMBER_COUNT" -gt 0 ]; then
    echo "  Found $MEMBER_COUNT club members"
    
    # Get sample of 3 members
    SAMPLE_MEMBERS=$(sqlite3 -json /workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db \
        "SELECT zwiftId, name FROM club_members WHERE clubId = $CLUB_ID LIMIT 3")
    
    echo "  Sample members to check:"
    echo "$SAMPLE_MEMBERS" | jq -r '.[] | "    - \(.name) (ID: \(.zwiftId))"'
    
    # TODO: Loop through members and get their 24h events
    echo "  ⚠️  Event sync not implemented yet - needs POST /api/workflow/sync/club-events endpoint"
else
    echo "  ⚠️  No club members to sync (club sync may have failed)"
fi

echo ""

# Step 5: Cleanup old events
echo "Step 5: 🗑️  Cleanup events ouder dan 100 dagen..."

# Count current events
CURRENT_EVENTS=$(sqlite3 /workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db "SELECT COUNT(*) FROM events")
CURRENT_RESULTS=$(sqlite3 /workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db "SELECT COUNT(*) FROM race_results")

echo "  Current database:"
echo "    - Events: $CURRENT_EVENTS"
echo "    - Results: $CURRENT_RESULTS"

if [ "$CURRENT_EVENTS" -gt 0 ]; then
    # Calculate 100 days ago
    HUNDRED_DAYS_AGO=$(date -d '100 days ago' -u +%Y-%m-%dT%H:%M:%S.000Z)
    OLD_EVENTS=$(sqlite3 /workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db \
        "SELECT COUNT(*) FROM events WHERE eventDate < '$HUNDRED_DAYS_AGO'")
    
    echo "  Events older than 100 days: $OLD_EVENTS"
    
    if [ "$OLD_EVENTS" -gt 0 ]; then
        echo "  ⚠️  Cleanup not implemented yet - needs POST /api/workflow/cleanup endpoint"
    else
        echo "  ✅ No old events to clean up"
    fi
else
    echo "  ℹ️  No events in database yet"
fi

echo ""

# Final Summary
echo "=========================================="
echo "📊 Workflow Summary"
echo "=========================================="

# Get final counts
FAVORITES=$(sqlite3 /workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db "SELECT COUNT(*) FROM riders WHERE isFavorite = 1")
CLUBS=$(sqlite3 /workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db "SELECT COUNT(*) FROM clubs")
MEMBERS=$(sqlite3 /workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db "SELECT COUNT(*) FROM club_members")
EVENTS=$(sqlite3 /workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db "SELECT COUNT(*) FROM events")
RESULTS=$(sqlite3 /workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db "SELECT COUNT(*) FROM race_results")

echo ""
echo "Database Status:"
echo "  ✅ Favorite Riders: $FAVORITES"
echo "  ✅ Clubs: $CLUBS"
if [ "$MEMBERS" -gt 0 ]; then
    echo "  ✅ Club Members: $MEMBERS"
else
    echo "  ⏳ Club Members: $MEMBERS (rate limit or sync failed)"
fi
echo "  📊 Events: $EVENTS"
echo "  📊 Race Results: $RESULTS"

echo ""
echo "Completed Steps:"
echo "  ✅ Step 1: Favorite rider toegevoegd"
echo "  ✅ Step 2: Club members sync gestart"
if [ "$RESULT_COUNT" -gt 0 ]; then
    echo "  ✅ Step 3: Rider events opgehaald ($RESULT_COUNT results)"
else
    echo "  ⚠️  Step 3: Rider events - API issue"
fi
echo "  ⏳ Step 4: Club events sync - needs implementation"
echo "  ⏳ Step 5: Cleanup - needs implementation"

echo ""
echo "Next Steps:"
echo "  1. Implement rider events storage endpoint"
echo "  2. Implement club events sync endpoint"
echo "  3. Implement cleanup endpoint"
echo "  4. Re-run complete workflow"
echo ""
echo "=========================================="
