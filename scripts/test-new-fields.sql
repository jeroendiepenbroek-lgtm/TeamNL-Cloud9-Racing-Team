-- Test script voor nieuwe velden (race ratings, phenotype, handicaps, DNF)
-- Run na sync: sqlite3 prisma/dev.db < scripts/test-new-fields.sql

.mode column
.headers on

-- 1. Race Ratings Coverage
SELECT 
  'Race Ratings' as category,
  COUNT(*) as total_riders,
  COUNT(rr.id) as riders_with_ratings,
  ROUND(COUNT(rr.id) * 100.0 / COUNT(*), 2) || '%' as coverage
FROM riders r
LEFT JOIN rider_race_ratings rr ON r.id = rr.riderId;

-- 2. Phenotype Coverage
SELECT 
  'Phenotypes' as category,
  COUNT(*) as total_riders,
  COUNT(rp.id) as riders_with_phenotype,
  ROUND(COUNT(rp.id) * 100.0 / COUNT(*), 2) || '%' as coverage
FROM riders r
LEFT JOIN rider_phenotypes rp ON r.id = rp.riderId;

-- 3. Handicaps Coverage
SELECT 
  'Handicaps' as category,
  COUNT(*) as total_riders,
  COUNT(CASE WHEN handicapFlat IS NOT NULL THEN 1 END) as riders_with_handicaps,
  ROUND(COUNT(CASE WHEN handicapFlat IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) || '%' as coverage
FROM riders;

-- 4. DNF Stats
SELECT 
  'DNF Stats' as category,
  AVG(totalDnfs) as avg_dnfs,
  MAX(totalDnfs) as max_dnfs,
  ROUND(AVG(totalDnfs * 100.0 / NULLIF(totalRaces, 0)), 2) || '%' as avg_dnf_rate
FROM riders
WHERE totalRaces > 0;

-- 5. Sample Race Ratings (top 10 by current rating)
.print "\n--- Top 10 Riders by Current Rating ---"
SELECT 
  r.name,
  rr.currentRating as current,
  rr.max30Rating as max_30d,
  rr.max90Rating as max_90d,
  ROUND((rr.currentRating - rr.max30Rating), 1) as form_vs_30d
FROM riders r
JOIN rider_race_ratings rr ON r.id = rr.riderId
WHERE rr.currentRating IS NOT NULL
ORDER BY rr.currentRating DESC
LIMIT 10;

-- 6. Phenotype Distribution
.print "\n--- Rider Type Distribution ---"
SELECT 
  primaryType as rider_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM rider_phenotypes WHERE primaryType IS NOT NULL), 2) || '%' as percentage,
  ROUND(AVG(bias), 3) as avg_confidence
FROM rider_phenotypes
WHERE primaryType IS NOT NULL
GROUP BY primaryType
ORDER BY count DESC;

-- 7. Handicaps Sample (terrain suitability)
.print "\n--- Terrain Suitability Sample ---"
SELECT 
  name,
  ROUND(handicapFlat, 2) as flat,
  ROUND(handicapRolling, 2) as rolling,
  ROUND(handicapHilly, 2) as hilly,
  ROUND(handicapMountainous, 2) as mountainous
FROM riders
WHERE handicapFlat IS NOT NULL
LIMIT 10;

-- 8. DNF Reliability (lowest DNF % with minimum 10 races)
.print "\n--- Most Reliable Riders (lowest DNF %, min 10 races) ---"
SELECT 
  name,
  totalRaces as races,
  totalDnfs as dnfs,
  ROUND(totalDnfs * 100.0 / totalRaces, 2) || '%' as dnf_rate
FROM riders
WHERE totalRaces >= 10
ORDER BY (totalDnfs * 1.0 / totalRaces) ASC
LIMIT 10;
