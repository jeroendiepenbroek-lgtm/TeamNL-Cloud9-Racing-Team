#!/bin/bash

# Production Test Script - Workflow Test met Rider 150437
# =======================================================

BASE_URL="http://localhost:3000/api"
RIDER_ID=150437
CLUB_ID=2281

echo "=========================================="
echo "🏁 TeamNL Cloud9 - Production Workflow Test"
echo "=========================================="
echo ""
echo "Test Rider: $RIDER_ID (JRøne | CloudRacer-9)"
echo "Test Club: $CLUB_ID (TeamNL)"
echo ""

# Step 1: Check if rider exists as favorite
echo "📋 Step 1: Check favorite rider status..."
FAVORITES=$(curl -s "$BASE_URL/favorites")
echo "$FAVORITES" | jq -r '.[] | select(.zwiftId == '"$RIDER_ID"') | "✅ Rider \(.zwiftId) - \(.name) is favorite"'

if echo "$FAVORITES" | jq -e '.[] | select(.zwiftId == '"$RIDER_ID"')' > /dev/null; then
    echo "   Rider already in favorites"
else
    echo "   ❌ Rider not found - adding now..."
    curl -s -X POST "$BASE_URL/favorites" \
        -H "Content-Type: application/json" \
        -d "{\"zwiftId\": $RIDER_ID, \"priority\": 1, \"addedBy\": \"production-test\"}" \
        | jq '.message'
fi

echo ""

# Step 2: Check rider details
echo "📊 Step 2: Rider details in database..."
RIDER=$(curl -s "$BASE_URL/riders/$RIDER_ID")
echo "$RIDER" | jq '{
    zwiftId: .zwiftId,
    name: .name,
    clubId: .clubId,
    ftp: .ftp,
    ftpWkg: .ftpWkg,
    totalRaces: .totalRaces,
    category: .categoryRacing
}'

echo ""

# Step 3: Get clubs where favorites ride
echo "🏢 Step 3: Clubs waar favorites rijden..."
# Note: This requires the workflow endpoint which is disabled
# For now, manually check clubId from riders
CLUB_IDS=$(echo "$FAVORITES" | jq -r '.[].clubId | select(. != null)' | sort -u)

if [ -z "$CLUB_IDS" ]; then
    echo "   ℹ️  Geen club IDs gevonden bij favorite riders"
    echo "   💡 Gebruiken manual club ID: $CLUB_ID"
    CLUB_IDS="$CLUB_ID"
fi

echo "   Gevonden clubs: $CLUB_IDS"
echo ""

# Step 4: Sync club members (wait 65 sec for rate limit)
echo "👥 Step 4: Sync club members..."
LAST_SYNC=$(curl -s "$BASE_URL/sync/logs" | jq -r '[.[] | select(.syncType == "club")] | .[0] | .completedAt')
echo "   Laatste club sync: $LAST_SYNC"

# Calculate if we need to wait
if [ ! -z "$LAST_SYNC" ]; then
    LAST_SYNC_TS=$(date -d "$LAST_SYNC" +%s 2>/dev/null || echo "0")
    NOW_TS=$(date +%s)
    DIFF=$((NOW_TS - LAST_SYNC_TS))
    
    if [ $DIFF -lt 60 ]; then
        WAIT_TIME=$((65 - DIFF))
        echo "   ⏳ Rate limit: wachten $WAIT_TIME seconden..."
        sleep $WAIT_TIME
    fi
fi

echo "   Syncing club $CLUB_ID..."
CLUB_SYNC=$(curl -s -X POST "$BASE_URL/sync/club")
echo "$CLUB_SYNC" | jq '{message: .message, error: .error}'

echo ""

# Step 5: Check database tables
echo "📂 Step 5: Database status..."
sqlite3 /workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db <<EOF
.mode column
.headers on
SELECT 'Riders' as Table, COUNT(*) as Count FROM riders WHERE isFavorite = 1
UNION ALL
SELECT 'Clubs', COUNT(*) FROM clubs
UNION ALL
SELECT 'Club Members', COUNT(*) FROM club_members
UNION ALL
SELECT 'Events', COUNT(*) FROM events
UNION ALL
SELECT 'Race Results', COUNT(*) FROM race_results;
EOF

echo ""

# Step 6: Get rider results (if API works)
echo "🏆 Step 6: Rider race results..."
RESULTS=$(curl -s "$BASE_URL/riders/$RIDER_ID/results")
RESULT_COUNT=$(echo "$RESULTS" | jq 'length')
echo "   Gevonden results in database: $RESULT_COUNT"

if [ "$RESULT_COUNT" -gt 0 ]; then
    echo "   Laatste 3 results:"
    echo "$RESULTS" | jq -r '.[0:3] | .[] | "   - Event \(.eventId): Position \(.position) in category \(.category)"'
fi

echo ""

# Step 7: Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="

# Count everything
RIDER_COUNT=$(curl -s "$BASE_URL/favorites" | jq 'length')
CLUB_COUNT=$(sqlite3 /workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db "SELECT COUNT(*) FROM clubs")
MEMBER_COUNT=$(sqlite3 /workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db "SELECT COUNT(*) FROM club_members")
EVENT_COUNT=$(sqlite3 /workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db "SELECT COUNT(*) FROM events")
RESULT_COUNT=$(sqlite3 /workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db "SELECT COUNT(*) FROM race_results")

echo "✅ Favorite Riders: $RIDER_COUNT"
echo "✅ Clubs: $CLUB_COUNT"
echo "✅ Club Members: $MEMBER_COUNT"
echo "❌ Events: $EVENT_COUNT (MISSING - needs implementation)"
echo "❌ Race Results: $RESULT_COUNT (MISSING - needs implementation)"

echo ""
echo "🚧 Missing Features:"
echo "   1. GET /api/workflow/clubs - List clubs waar favorites rijden"
echo "   2. POST /api/workflow/sync/favorite-events/:zwiftId - Sync rider events (90 dagen)"
echo "   3. POST /api/workflow/sync/club-events/:clubId - Sync club events (24 uur)"
echo "   4. POST /api/workflow/cleanup - Cleanup oude events (>100 dagen)"
echo ""
echo "=========================================="
echo "Test completed!"
echo "=========================================="
