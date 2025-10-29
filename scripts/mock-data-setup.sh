#!/bin/bash

# Mock Data Setup - Vul database met test data voor workflow testing
# ====================================================================

DB_PATH="/workspaces/TeamNL-Cloud9-Racing-Team/prisma/dev.db"

echo "=========================================="
echo "🏁 Mock Data Setup voor Workflow Test"
echo "=========================================="
echo ""

# Insert mock club members (bypass rate limit)
echo "Step 1: Mock club members toevoegen voor club 2281..."

sqlite3 "$DB_PATH" <<EOF
-- Insert 5 mock club members
INSERT OR IGNORE INTO club_members (
    id, zwiftId, name, clubId, categoryRacing,
    ftp, ftpWkg, powerToWeight,
    power5s, power15s, power30s, power1min, power2min, power5min, power20min,
    powerWkg5s, powerWkg15s, powerWkg30s, powerWkg1min, powerWkg2min, powerWkg5min, powerWkg20min,
    criticalPower, anaerobicWork,
    gender, countryCode, weight, height,
    totalWins, totalPodiums, totalRaces, totalDnfs,
    handicapFlat, handicapRolling, handicapHilly, handicapMountainous,
    ranking, rankingScore,
    lastRaceDate, isActive, isFavorite, lastSynced, createdAt
) VALUES
(1, 150437, 'JRøne | CloudRacer-9 @YouTube', 2281, 'B',
    270, 3.65, 1152.42,
    964, 890, 676, 427, 376, 300, 250,
    13.03, 12.03, 9.14, 5.77, 5.08, 4.05, 3.38,
    229.62, 25764.15,
    'M', 'nl', 74, 183,
    0, 4, 23, 2,
    134.54, 55.89, -4.32, -152.20,
    NULL, NULL,
    '2025-10-27 19:10:00', 1, 1, datetime('now'), datetime('now')),
    
(2, 123456, 'Test Rider 1', 2281, 'A',
    320, 4.0, 1450.0,
    1100, 1000, 850, 650, 500, 380, 320,
    13.75, 12.5, 10.63, 8.13, 6.25, 4.75, 4.0,
    285.0, 28000.0,
    'M', 'nl', 80, 180,
    5, 12, 45, 1,
    150.0, 70.0, 10.0, -100.0,
    1500, 1500.0,
    '2025-10-28 14:00:00', 1, 0, datetime('now'), datetime('now')),
    
(3, 789012, 'Test Rider 2', 2281, 'B',
    280, 3.73, 1200.0,
    980, 920, 700, 450, 380, 310, 260,
    13.07, 12.27, 9.33, 6.0, 5.07, 4.13, 3.47,
    240.0, 26000.0,
    'F', 'be', 75, 170,
    2, 8, 38, 3,
    140.0, 60.0, 0.0, -130.0,
    1350, 1350.0,
    '2025-10-28 10:30:00', 1, 0, datetime('now'), datetime('now')),
    
(4, 345678, 'Test Rider 3', 2281, 'C',
    220, 3.14, 950.0,
    750, 680, 520, 350, 290, 240, 200,
    10.71, 9.71, 7.43, 5.0, 4.14, 3.43, 2.86,
    190.0, 22000.0,
    'M', 'de', 70, 175,
    0, 3, 28, 4,
    120.0, 45.0, -15.0, -160.0,
    1100, 1100.0,
    '2025-10-27 20:45:00', 1, 0, datetime('now'), datetime('now')),
    
(5, 901234, 'Test Rider 4', 2281, 'B',
    290, 3.87, 1250.0,
    1000, 930, 720, 470, 390, 320, 270,
    13.33, 12.4, 9.6, 6.27, 5.2, 4.27, 3.6,
    250.0, 27000.0,
    'M', 'fr', 75, 178,
    3, 9, 41, 2,
    145.0, 65.0, 5.0, -140.0,
    1400, 1400.0,
    '2025-10-28 16:20:00', 1, 0, datetime('now'), datetime('now'));
EOF

MEMBER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM club_members WHERE clubId = 2281")
echo "  ✅ Added $MEMBER_COUNT club members"

echo ""

# Insert mock events
echo "Step 2: Mock events toevoegen..."

sqlite3 "$DB_PATH" <<EOF
-- Insert 10 mock events (mix of old and recent)
INSERT OR IGNORE INTO events (
    id, eventId, eventTitle, eventDate, eventType,
    eventSubgroupLabel, categoryEnforcement, powerSourceRule,
    route, laps, distance, elevationGain,
    isPrivate, isOfficial, organizer,
    trackedSince, createdAt, updatedAt
) VALUES
-- Recent events (last 90 days)
(1, 5001, 'WTRL TTT Race', '2025-10-25 19:00:00', 'race',
    'Cat B', true, 'dual-recording',
    'Watopia Volcano Circuit', 3, 24.5, 350,
    0, 1, 'WTRL',
    datetime('now'), datetime('now'), datetime('now')),
    
(2, 5002, 'ZRL Team Race', '2025-10-20 20:00:00', 'race',
    'Division 2', true, 'dual-recording',
    'France', 1, 42.8, 680,
    0, 1, 'ZRL',
    datetime('now'), datetime('now'), datetime('now')),
    
(3, 5003, 'Community Ride', '2025-10-15 18:00:00', 'group_ride',
    'All', false, 'any',
    'London Flat', 2, 35.2, 120,
    0, 0, 'TeamNL',
    datetime('now'), datetime('now'), datetime('now')),
    
(4, 5004, 'Crit City Race', '2025-10-10 19:30:00', 'race',
    'Cat A/B', true, 'smart-trainer',
    'Crit City', 5, 22.5, 180,
    0, 1, 'ZwiftHQ',
    datetime('now'), datetime('now'), datetime('now')),
    
(5, 5005, 'Alpe du Zwift Challenge', '2025-09-28 17:00:00', 'race',
    'Open', false, 'any',
    'Alpe du Zwift', 1, 12.2, 1036,
    0, 0, 'Community',
    datetime('now'), datetime('now'), datetime('now')),

-- Old events (>100 days) - should be cleaned up
(6, 4001, 'Old Race 1', '2025-07-15 19:00:00', 'race',
    'Cat B', true, 'dual-recording',
    'Watopia', 1, 25.0, 300,
    0, 1, 'WTRL',
    datetime('now'), datetime('now'), datetime('now')),
    
(7, 4002, 'Old Race 2', '2025-06-20 20:00:00', 'race',
    'Cat A', true, 'smart-trainer',
    'France', 1, 40.0, 600,
    0, 1, 'ZRL',
    datetime('now'), datetime('now'), datetime('now')),
    
(8, 4003, 'Old Ride', '2025-05-10 18:00:00', 'group_ride',
    'All', false, 'any',
    'London', 2, 30.0, 100,
    0, 0, 'Community',
    datetime('now'), datetime('now'), datetime('now')),
    
(9, 4004, 'Very Old Race', '2025-04-05 19:00:00', 'race',
    'Cat B/C', true, 'dual-recording',
    'Watopia', 1, 28.0, 400,
    0, 1, 'WTRL',
    datetime('now'), datetime('now'), datetime('now')),
    
(10, 4005, 'Ancient Event', '2025-03-01 17:00:00', 'race',
    'Open', false, 'any',
    'Yorkshire', 1, 35.0, 500,
    0, 0, 'Community',
    datetime('now'), datetime('now'), datetime('now'));
EOF

EVENT_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM events")
echo "  ✅ Added $EVENT_COUNT events"

echo ""

# Insert mock race results
echo "Step 3: Mock race results toevoegen..."

sqlite3 "$DB_PATH" <<EOF
-- Insert race results linking riders to events
-- For rider 150437 (favorite) - 5 recent results
INSERT OR IGNORE INTO race_results (
    id, eventId, riderType, riderId, clubMemberId,
    position, positionCategory, category,
    time, timeGap, distance,
    averagePower, normalizedPower, maxPower, averageWkg, zPower,
    averageHeartRate, maxHeartRate,
    averageCadence, maxCadence,
    averageSpeed, maxSpeed,
    points, primePoints,
    didFinish, didNotStart, flagged, disqualified,
    source, dataQuality, createdAt, updatedAt
) VALUES
-- Recent results for favorite rider 150437
(1, 5001, 'favorite', 1, 1,
    12, 8, 'B',
    2845.5, 45.2, 24.5,
    285, 295, 980, 3.85, 290,
    165, 188,
    92, 115,
    30.8, 52.3,
    85, 0,
    1, 0, 0, 0,
    'zwift', 'good', datetime('now'), datetime('now')),
    
(2, 5002, 'favorite', 1, 1,
    18, 15, 'B',
    4125.8, 82.5, 42.8,
    268, 278, 950, 3.62, 270,
    160, 182,
    88, 108,
    29.5, 48.2,
    72, 5,
    1, 0, 0, 0,
    'zwift', 'good', datetime('now'), datetime('now')),
    
(3, 5003, 'favorite', 1, 1,
    NULL, NULL, 'All',
    3545.0, NULL, 35.2,
    245, 255, 850, 3.31, 248,
    155, 175,
    85, 102,
    28.2, 45.0,
    0, 0,
    1, 0, 0, 0,
    'zwift', 'good', datetime('now'), datetime('now')),
    
(4, 5004, 'favorite', 1, 1,
    15, 10, 'B',
    2156.3, 38.7, 22.5,
    295, 305, 1000, 3.99, 298,
    170, 192,
    95, 120,
    31.2, 55.8,
    78, 0,
    1, 0, 0, 0,
    'zwift', 'good', datetime('now'), datetime('now')),
    
(5, 5005, 'favorite', 1, 1,
    28, 22, 'Open',
    3845.2, 285.5, 12.2,
    248, 258, 680, 3.35, 250,
    168, 185,
    72, 95,
    11.4, 28.5,
    65, 0,
    1, 0, 0, 0,
    'zwift', 'good', datetime('now'), datetime('now')),

-- Results for other club members (recent, last 24h)
(6, 5001, 'club_member', NULL, 2,
    5, 3, 'A',
    2755.2, 12.5, 24.5,
    340, 355, 1150, 4.25, 345,
    175, 195,
    98, 125,
    31.8, 58.2,
    100, 10,
    1, 0, 0, 0,
    'zwift', 'good', datetime('now'), datetime('now')),
    
(7, 5001, 'club_member', NULL, 3,
    15, 12, 'B',
    2865.8, 58.9, 24.5,
    275, 285, 950, 3.67, 278,
    162, 185,
    90, 112,
    30.5, 51.0,
    82, 0,
    1, 0, 0, 0,
    'zwift', 'good', datetime('now'), datetime('now')),
    
(8, 5002, 'club_member', NULL, 4,
    45, 28, 'C',
    4385.5, 245.8, 42.8,
    215, 225, 720, 3.07, 218,
    158, 178,
    82, 98,
    27.8, 42.5,
    58, 0,
    1, 0, 0, 0,
    'zwift', 'good', datetime('now'), datetime('now')),
    
(9, 5002, 'club_member', NULL, 5,
    22, 18, 'B',
    4145.2, 95.2, 42.8,
    285, 295, 980, 3.80, 288,
    168, 190,
    90, 115,
    29.2, 47.8,
    75, 8,
    1, 0, 0, 0,
    'zwift', 'good', datetime('now'), datetime('now')),

-- Old results (for cleanup test)
(10, 4001, 'club_member', NULL, 2,
    8, 5, 'A',
    2845.0, 35.0, 25.0,
    330, 340, 1100, 4.13, 335,
    172, 192,
    96, 122,
    31.5, 56.0,
    95, 5,
    1, 0, 0, 0,
    'zwift', 'good', datetime('now'), datetime('now'));
EOF

RESULT_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM race_results")
echo "  ✅ Added $RESULT_COUNT race results"

echo ""

# Summary
echo "=========================================="
echo "📊 Mock Data Summary"
echo "=========================================="

echo ""
echo "Database Status:"
sqlite3 "$DB_PATH" <<EOF
.mode column
SELECT 'Favorite Riders' as Category, COUNT(*) as Count 
FROM riders WHERE isFavorite = 1
UNION ALL
SELECT 'Club Members', COUNT(*) FROM club_members
UNION ALL
SELECT 'Events (Total)', COUNT(*) FROM events
UNION ALL
SELECT 'Events (Recent <90d)', COUNT(*) FROM events 
WHERE eventDate >= date('now', '-90 days')
UNION ALL
SELECT 'Events (Old >100d)', COUNT(*) FROM events 
WHERE eventDate < date('now', '-100 days')
UNION ALL
SELECT 'Race Results (Total)', COUNT(*) FROM race_results
UNION ALL
SELECT 'Results (Favorites)', COUNT(*) FROM race_results 
WHERE riderType = 'favorite'
UNION ALL
SELECT 'Results (Club)', COUNT(*) FROM race_results 
WHERE riderType = 'club_member';
EOF

echo ""
echo "✅ Mock data setup complete!"
echo ""
echo "Je kunt nu de workflow testen met:"
echo "  ./scripts/production-workflow.sh"
echo "=========================================="
