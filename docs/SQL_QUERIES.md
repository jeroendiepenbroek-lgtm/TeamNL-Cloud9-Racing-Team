# SQL Queries & Views

## Veelgebruikte SQL Queries voor TeamNL Cloud9 Dashboard

Deze queries kunnen gebruikt worden voor:
- Direct SQL uitvoeren via Prisma Studio
- Database reporting tools
- Custom analytics
- Data export

---

## 1. CLUB ANALYTICS

### 1.1 Club Leaderboard (Top Riders)
```sql
-- Top 20 riders van de club gesorteerd op ranking
SELECT 
  r.zwiftId,
  r.name,
  r.categoryRacing,
  r.ftp,
  r.powerToWeight,
  r.ranking,
  r.rankingScore,
  r.countryCode,
  r.totalWins,
  r.totalPodiums,
  r.lastActive
FROM riders r
WHERE r.clubId = 11818 
  AND r.isActive = 1
ORDER BY r.ranking ASC
LIMIT 20;
```

### 1.2 Club Statistics Summary
```sql
-- Complete club statistieken
SELECT 
  c.name as clubName,
  COUNT(r.id) as totalMembers,
  COUNT(CASE WHEN r.isActive = 1 THEN 1 END) as activeMembers,
  AVG(r.ftp) as avgFtp,
  AVG(r.powerToWeight) as avgWkg,
  AVG(r.ranking) as avgRanking,
  MIN(r.ranking) as bestRanking,
  SUM(r.totalWins) as clubTotalWins,
  COUNT(CASE WHEN r.categoryRacing = 'A' THEN 1 END) as catA,
  COUNT(CASE WHEN r.categoryRacing = 'B' THEN 1 END) as catB,
  COUNT(CASE WHEN r.categoryRacing = 'C' THEN 1 END) as catC,
  COUNT(CASE WHEN r.categoryRacing = 'D' THEN 1 END) as catD
FROM clubs c
LEFT JOIN riders r ON r.clubId = c.id
WHERE c.id = 11818
GROUP BY c.id;
```

### 1.3 Club Power Rankings (by W/kg)
```sql
-- Top 10 sterkste riders (W/kg)
SELECT 
  r.name,
  r.categoryRacing,
  r.weight,
  r.ftp,
  ROUND(r.powerToWeight, 2) as wkg,
  r.ranking
FROM riders r
WHERE r.clubId = 11818 
  AND r.powerToWeight IS NOT NULL
  AND r.isActive = 1
ORDER BY r.powerToWeight DESC
LIMIT 10;
```

### 1.4 Club by Category Analysis
```sql
-- Statistieken per categorie
SELECT 
  r.categoryRacing,
  COUNT(*) as riders,
  ROUND(AVG(r.ftp), 0) as avgFtp,
  ROUND(AVG(r.powerToWeight), 2) as avgWkg,
  ROUND(AVG(r.weight), 1) as avgWeight,
  MIN(r.ranking) as bestRanking,
  SUM(r.totalWins) as totalWins
FROM riders r
WHERE r.clubId = 11818 
  AND r.isActive = 1
  AND r.categoryRacing IS NOT NULL
GROUP BY r.categoryRacing
ORDER BY 
  CASE r.categoryRacing
    WHEN 'A' THEN 1
    WHEN 'B' THEN 2
    WHEN 'C' THEN 3
    WHEN 'D' THEN 4
    WHEN 'E' THEN 5
  END;
```

---

## 2. RIDER ANALYTICS

### 2.1 Rider Profile (Complete Overview)
```sql
-- Volledig rider profiel met stats
SELECT 
  r.*,
  c.name as clubName,
  rs.totalRaces,
  rs.totalWins,
  rs.totalPodiums,
  rs.avgPosition,
  rs.recent30dRaces,
  rs.recent30dWins,
  rs.bestPosition,
  rs.bestPower,
  rs.totalDistance
FROM riders r
LEFT JOIN clubs c ON c.id = r.clubId
LEFT JOIN rider_statistics rs ON rs.riderId = r.id
WHERE r.zwiftId = ?;
```

### 2.2 Rider Race History
```sql
-- Laatste 20 races van een rider
SELECT 
  e.eventDate,
  e.name as eventName,
  rr.category,
  rr.position,
  rr.time,
  rr.averagePower,
  rr.averageWkg,
  rr.points,
  rr.flagged,
  CASE 
    WHEN rr.position = 1 THEN '🥇'
    WHEN rr.position = 2 THEN '🥈'
    WHEN rr.position = 3 THEN '🥉'
    ELSE ''
  END as medal
FROM race_results rr
JOIN events e ON e.id = rr.eventId
WHERE rr.riderId = (SELECT id FROM riders WHERE zwiftId = ?)
ORDER BY e.eventDate DESC
LIMIT 20;
```

### 2.3 Rider Performance Trends (Last 90 Days)
```sql
-- Performance metrics over tijd
SELECT 
  DATE(rh.recordedAt) as date,
  rh.ftp,
  rh.powerToWeight,
  rh.ranking,
  rh.weight,
  rh.categoryRacing
FROM rider_history rh
WHERE rh.riderId = (SELECT id FROM riders WHERE zwiftId = ?)
  AND rh.recordedAt >= date('now', '-90 days')
ORDER BY rh.recordedAt ASC;
```

### 2.4 Rider vs Club Average
```sql
-- Vergelijk rider met club gemiddelden
WITH clubAvg AS (
  SELECT 
    AVG(ftp) as avgFtp,
    AVG(powerToWeight) as avgWkg,
    AVG(ranking) as avgRanking
  FROM riders
  WHERE clubId = 11818 AND isActive = 1
)
SELECT 
  r.name,
  r.ftp,
  ca.avgFtp as clubAvgFtp,
  ROUND(((r.ftp - ca.avgFtp) / ca.avgFtp) * 100, 1) as ftpDiffPercent,
  r.powerToWeight,
  ROUND(ca.avgWkg, 2) as clubAvgWkg,
  r.ranking,
  ROUND(ca.avgRanking, 0) as clubAvgRanking
FROM riders r, clubAvg ca
WHERE r.zwiftId = ?;
```

### 2.5 Rider Win Rate by Category
```sql
-- Win percentage per categorie
SELECT 
  rr.category,
  COUNT(*) as races,
  SUM(CASE WHEN rr.position = 1 THEN 1 ELSE 0 END) as wins,
  ROUND(AVG(rr.position), 1) as avgPosition,
  ROUND(
    (SUM(CASE WHEN rr.position = 1 THEN 1 ELSE 0 END) * 100.0) / COUNT(*),
    1
  ) as winPercentage
FROM race_results rr
WHERE rr.riderId = (SELECT id FROM riders WHERE zwiftId = ?)
  AND rr.category IS NOT NULL
GROUP BY rr.category
ORDER BY races DESC;
```

---

## 3. EVENT & RACE ANALYTICS

### 3.1 Event Leaderboard
```sql
-- Complete event resultaten
SELECT 
  rr.position,
  r.name,
  r.categoryRacing,
  c.name as clubName,
  rr.time,
  PRINTF('%02d:%02d:%02d', 
    rr.time / 3600, 
    (rr.time % 3600) / 60, 
    rr.time % 60
  ) as timeFormatted,
  rr.averagePower,
  rr.averageWkg,
  rr.averageHeartRate,
  rr.points,
  rr.flagged
FROM race_results rr
JOIN riders r ON r.id = rr.riderId
LEFT JOIN clubs c ON c.id = r.clubId
WHERE rr.eventId = ?
ORDER BY rr.position ASC;
```

### 3.2 Event Statistics
```sql
-- Event samenvattende statistieken
SELECT 
  e.id,
  e.name,
  e.eventDate,
  e.eventType,
  e.routeName,
  COUNT(rr.id) as totalFinishers,
  MIN(rr.time) as fastestTime,
  AVG(rr.time) as avgTime,
  MAX(rr.time) as slowestTime,
  AVG(rr.averagePower) as avgPower,
  MAX(rr.averagePower) as maxPower,
  AVG(rr.averageWkg) as avgWkg,
  MAX(rr.averageWkg) as maxWkg,
  SUM(CASE WHEN rr.flagged = 1 THEN 1 ELSE 0 END) as flaggedCount
FROM events e
LEFT JOIN race_results rr ON rr.eventId = e.id
WHERE e.id = ?
GROUP BY e.id;
```

### 3.3 Category Winners by Event
```sql
-- Winnaars per categorie voor een event
SELECT 
  rr.category,
  r.name as winner,
  c.name as clubName,
  rr.time,
  rr.averagePower,
  rr.averageWkg
FROM race_results rr
JOIN riders r ON r.id = rr.riderId
LEFT JOIN clubs c ON c.id = r.clubId
WHERE rr.eventId = ?
  AND rr.position = 1
ORDER BY rr.category;
```

### 3.4 Team Performance in Event
```sql
-- Hoe presteerde TeamNL in een specifiek event
SELECT 
  rr.position,
  r.name,
  r.categoryRacing,
  rr.time,
  rr.averagePower,
  rr.averageWkg,
  rr.points
FROM race_results rr
JOIN riders r ON r.id = rr.riderId
WHERE rr.eventId = ?
  AND r.clubId = 11818
ORDER BY rr.position ASC;
```

### 3.5 Recent Events Overview
```sql
-- Laatste 10 events met basale info
SELECT 
  e.id,
  e.name,
  e.eventDate,
  e.eventType,
  e.routeName,
  COUNT(rr.id) as participants,
  c.name as organizingClub
FROM events e
LEFT JOIN race_results rr ON rr.eventId = e.id
LEFT JOIN clubs c ON c.id = e.clubId
WHERE e.eventDate >= date('now', '-30 days')
GROUP BY e.id
ORDER BY e.eventDate DESC
LIMIT 10;
```

---

## 4. RANKING & COMPARISON QUERIES

### 4.1 Global Top Riders (All Clubs)
```sql
-- Top 100 riders wereldwijd
SELECT 
  r.ranking,
  r.name,
  c.name as clubName,
  r.countryCode,
  r.categoryRacing,
  r.ftp,
  r.powerToWeight,
  r.rankingScore
FROM riders r
LEFT JOIN clubs c ON c.id = r.clubId
WHERE r.isActive = 1 
  AND r.ranking IS NOT NULL
ORDER BY r.ranking ASC
LIMIT 100;
```

### 4.2 Club Comparison (Top 5 Clubs)
```sql
-- Vergelijk meerdere clubs
SELECT 
  c.id,
  c.name,
  COUNT(r.id) as members,
  ROUND(AVG(r.ftp), 0) as avgFtp,
  ROUND(AVG(r.powerToWeight), 2) as avgWkg,
  ROUND(AVG(r.ranking), 0) as avgRanking,
  MIN(r.ranking) as bestRanking,
  SUM(r.totalWins) as totalWins,
  SUM(r.totalPodiums) as totalPodiums
FROM clubs c
JOIN riders r ON r.clubId = c.id
WHERE r.isActive = 1
GROUP BY c.id
ORDER BY avgRanking ASC
LIMIT 5;
```

### 4.3 Category Rankings (Within Club)
```sql
-- Beste riders per categorie binnen club
WITH rankedByCategory AS (
  SELECT 
    r.name,
    r.categoryRacing,
    r.ftp,
    r.powerToWeight,
    r.ranking,
    ROW_NUMBER() OVER (
      PARTITION BY r.categoryRacing 
      ORDER BY r.ranking ASC
    ) as categoryRank
  FROM riders r
  WHERE r.clubId = 11818 
    AND r.isActive = 1
    AND r.categoryRacing IS NOT NULL
)
SELECT * FROM rankedByCategory
WHERE categoryRank <= 5
ORDER BY categoryRacing, categoryRank;
```

### 4.4 Most Improved Riders (Last 30 Days)
```sql
-- Grootste ranking verbeteringen
WITH rankingChange AS (
  SELECT 
    r.id,
    r.name,
    r.ranking as currentRanking,
    (
      SELECT rh.ranking 
      FROM rider_history rh
      WHERE rh.riderId = r.id 
        AND rh.recordedAt >= date('now', '-30 days')
      ORDER BY rh.recordedAt ASC 
      LIMIT 1
    ) as ranking30DaysAgo
  FROM riders r
  WHERE r.clubId = 11818 AND r.isActive = 1
)
SELECT 
  name,
  ranking30DaysAgo as wasRanking,
  currentRanking as nowRanking,
  (ranking30DaysAgo - currentRanking) as improvement,
  ROUND(
    ((ranking30DaysAgo - currentRanking) * 100.0) / ranking30DaysAgo,
    1
  ) as improvementPercent
FROM rankingChange
WHERE ranking30DaysAgo IS NOT NULL
  AND (ranking30DaysAgo - currentRanking) > 0
ORDER BY improvement DESC
LIMIT 10;
```

---

## 5. STATISTICS & AGGREGATIONS

### 5.1 Power Distribution Analysis
```sql
-- Verdeling van FTP waardes
SELECT 
  CASE 
    WHEN ftp < 200 THEN '< 200W'
    WHEN ftp BETWEEN 200 AND 250 THEN '200-250W'
    WHEN ftp BETWEEN 250 AND 300 THEN '250-300W'
    WHEN ftp BETWEEN 300 AND 350 THEN '300-350W'
    WHEN ftp BETWEEN 350 AND 400 THEN '350-400W'
    ELSE '> 400W'
  END as ftpRange,
  COUNT(*) as riders,
  ROUND(AVG(powerToWeight), 2) as avgWkg
FROM riders
WHERE clubId = 11818 
  AND isActive = 1 
  AND ftp IS NOT NULL
GROUP BY ftpRange
ORDER BY MIN(ftp);
```

### 5.2 Activity Analysis (Last 90 Days)
```sql
-- Activiteit statistieken
SELECT 
  CASE 
    WHEN lastActive >= date('now', '-7 days') THEN 'Last 7 days'
    WHEN lastActive >= date('now', '-30 days') THEN 'Last 30 days'
    WHEN lastActive >= date('now', '-90 days') THEN 'Last 90 days'
    ELSE 'Inactive (90+ days)'
  END as activityStatus,
  COUNT(*) as riders,
  ROUND(AVG(ftp), 0) as avgFtp,
  ROUND(AVG(powerToWeight), 2) as avgWkg
FROM riders
WHERE clubId = 11818
GROUP BY activityStatus
ORDER BY 
  CASE activityStatus
    WHEN 'Last 7 days' THEN 1
    WHEN 'Last 30 days' THEN 2
    WHEN 'Last 90 days' THEN 3
    ELSE 4
  END;
```

### 5.3 Monthly Race Participation
```sql
-- Race deelname per maand
SELECT 
  strftime('%Y-%m', e.eventDate) as month,
  COUNT(DISTINCT rr.eventId) as events,
  COUNT(DISTINCT rr.riderId) as uniqueRiders,
  COUNT(*) as totalParticipations,
  ROUND(AVG(rr.averagePower), 0) as avgPower,
  ROUND(AVG(rr.averageWkg), 2) as avgWkg
FROM race_results rr
JOIN events e ON e.id = rr.eventId
JOIN riders r ON r.id = rr.riderId
WHERE r.clubId = 11818
  AND e.eventDate >= date('now', '-12 months')
GROUP BY month
ORDER BY month DESC;
```

### 5.4 Top Event Performers
```sql
-- Riders met meeste race wins
SELECT 
  r.name,
  rs.totalRaces,
  rs.totalWins,
  rs.totalPodiums,
  ROUND((rs.totalWins * 100.0) / NULLIF(rs.totalRaces, 0), 1) as winRate,
  ROUND((rs.totalPodiums * 100.0) / NULLIF(rs.totalRaces, 0), 1) as podiumRate,
  rs.avgPosition,
  rs.bestPosition
FROM riders r
JOIN rider_statistics rs ON rs.riderId = r.id
WHERE r.clubId = 11818 
  AND r.isActive = 1
  AND rs.totalRaces >= 5
ORDER BY rs.totalWins DESC, rs.avgPosition ASC
LIMIT 15;
```

---

## 6. DATA QUALITY & MONITORING

### 6.1 Data Completeness Check
```sql
-- Check welke velden missing data hebben
SELECT 
  'Riders' as table_name,
  COUNT(*) as total_records,
  SUM(CASE WHEN ftp IS NULL THEN 1 ELSE 0 END) as missing_ftp,
  SUM(CASE WHEN powerToWeight IS NULL THEN 1 ELSE 0 END) as missing_wkg,
  SUM(CASE WHEN ranking IS NULL THEN 1 ELSE 0 END) as missing_ranking,
  SUM(CASE WHEN countryCode IS NULL THEN 1 ELSE 0 END) as missing_country,
  SUM(CASE WHEN categoryRacing IS NULL THEN 1 ELSE 0 END) as missing_category
FROM riders
WHERE clubId = 11818;
```

### 6.2 Sync History Overview
```sql
-- Laatste sync activiteit
SELECT 
  syncType,
  status,
  recordsProcessed,
  duration,
  errorMessage,
  datetime(createdAt) as syncTime
FROM sync_logs
ORDER BY createdAt DESC
LIMIT 20;
```

### 6.3 Sync Success Rate
```sql
-- Sync betrouwbaarheid
SELECT 
  syncType,
  COUNT(*) as totalSyncs,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
  ROUND(
    (SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0) / COUNT(*),
    1
  ) as successRate,
  AVG(duration) as avgDuration,
  MAX(duration) as maxDuration
FROM sync_logs
WHERE createdAt >= date('now', '-7 days')
GROUP BY syncType;
```

### 6.4 Flagged Results Analysis
```sql
-- Overzicht van flagged race results
SELECT 
  r.name,
  e.name as eventName,
  e.eventDate,
  rr.position,
  rr.averagePower,
  rr.averageWkg,
  rr.flagReason
FROM race_results rr
JOIN riders r ON r.id = rr.riderId
JOIN events e ON e.id = rr.eventId
WHERE rr.flagged = 1
  AND r.clubId = 11818
ORDER BY e.eventDate DESC
LIMIT 50;
```

---

## 7. EXPORT QUERIES

### 7.1 Full Club Export (CSV Ready)
```sql
-- Alle club members voor export
SELECT 
  r.zwiftId as "Zwift ID",
  r.name as "Name",
  r.categoryRacing as "Category",
  r.ftp as "FTP",
  r.powerToWeight as "W/kg",
  r.ranking as "Ranking",
  r.weight as "Weight (kg)",
  r.height as "Height (cm)",
  r.countryCode as "Country",
  r.totalWins as "Wins",
  r.totalPodiums as "Podiums",
  DATE(r.lastActive) as "Last Active",
  r.isActive as "Active"
FROM riders r
WHERE r.clubId = 11818
ORDER BY r.ranking;
```

### 7.2 Race Results Export
```sql
-- Event resultaten export
SELECT 
  e.name as "Event",
  DATE(e.eventDate) as "Date",
  r.name as "Rider",
  rr.category as "Category",
  rr.position as "Position",
  rr.time as "Time (s)",
  rr.averagePower as "Avg Power",
  rr.averageWkg as "Avg W/kg",
  rr.points as "Points"
FROM race_results rr
JOIN events e ON e.id = rr.eventId
JOIN riders r ON r.id = rr.riderId
WHERE r.clubId = 11818
  AND e.eventDate >= date('now', '-30 days')
ORDER BY e.eventDate DESC, rr.position;
```

---

## 8. VIEWS (Recommended)

Je kunt deze queries als database views opslaan voor hergebruik:

```sql
-- View: Club Leaderboard
CREATE VIEW IF NOT EXISTS view_club_leaderboard AS
SELECT 
  r.zwiftId,
  r.name,
  r.categoryRacing,
  r.ftp,
  r.powerToWeight,
  r.ranking,
  r.totalWins,
  r.totalPodiums,
  rs.avgPosition
FROM riders r
LEFT JOIN rider_statistics rs ON rs.riderId = r.id
WHERE r.clubId = 11818 AND r.isActive = 1
ORDER BY r.ranking;

-- View: Recent Events
CREATE VIEW IF NOT EXISTS view_recent_events AS
SELECT 
  e.*,
  COUNT(rr.id) as participants
FROM events e
LEFT JOIN race_results rr ON rr.eventId = e.id
WHERE e.eventDate >= date('now', '-90 days')
GROUP BY e.id;

-- View: Rider Performance Summary
CREATE VIEW IF NOT EXISTS view_rider_performance AS
SELECT 
  r.id,
  r.zwiftId,
  r.name,
  r.ftp,
  r.powerToWeight,
  r.ranking,
  rs.totalRaces,
  rs.totalWins,
  rs.avgPosition,
  rs.recent30dRaces
FROM riders r
LEFT JOIN rider_statistics rs ON rs.riderId = r.id
WHERE r.isActive = 1;
```

---

## Gebruik in Applicatie

### Via Prisma (TypeScript)
```typescript
// Raw SQL queries in Prisma
const results = await prisma.$queryRaw`
  SELECT * FROM riders 
  WHERE clubId = ${clubId} 
  ORDER BY ranking LIMIT 10
`;

// Of gebruik Prisma's query builder
const riders = await prisma.rider.findMany({
  where: { clubId: 11818, isActive: true },
  orderBy: { ranking: 'asc' },
  take: 10,
  include: {
    club: true,
    statistics: true,
  },
});
```

### Via Prisma Studio
1. Open Prisma Studio: `npm run db:studio`
2. Ga naar "Query" tab
3. Plak SQL query
4. Execute & export results

### Direct SQLite CLI
```bash
sqlite3 prisma/dev.db < queries/club_leaderboard.sql
```
