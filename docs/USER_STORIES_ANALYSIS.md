# User Stories & Data Requirements

## Analyse van User Stories

### Story 1: Recent Club Results
**Als RiderID 150437 wil ik de recente race resultaten van de rijders in mijn team zien (ClubID)**

**Data Requirements:**
- Rider info (voor identificatie club membership)
- Club info (voor team context)
- Race Results (recent, sorted by date)
- Event info (voor race details)

**Query Pattern:**
```sql
SELECT 
  r.name, r.zwiftId,
  e.id as eventId, e.name as eventName, e.eventDate,
  rr.position, rr.positionCategory, rr.category, rr.time
FROM race_results rr
JOIN riders r ON rr.riderId = r.id
JOIN events e ON rr.eventId = e.id
WHERE r.clubId = (SELECT clubId FROM riders WHERE zwiftId = 150437)
  AND e.eventDate >= DATE('now', '-90 days')
ORDER BY e.eventDate DESC, rr.position ASC
LIMIT 50
```

**Missing Data:**
- ❌ Event.eventDate is vaak NULL (alleen placeholder date)
- ❌ Meeste riders uit event zijn niet in database
- ⚠️  Need: Sync events met volledige participant lists

---

### Story 2: Favorite Riders Details
**Als gebruiker wil ik de Rider details zien van door mij gedefinieerde RiderIDs**

**Data Requirements:**
- Rider basis info (name, category, FTP, weight, etc.)
- Rider stats (total races, wins, podiums)
- Recent performance (last race, current rating)
- Historical trends (FTP over time)

**Query Pattern:**
```sql
SELECT 
  r.*,
  rs.totalRaces, rs.totalWins, rs.totalPodiums,
  rs.avgPosition, rs.avgPower, rs.recent30dRaces
FROM riders r
LEFT JOIN rider_statistics rs ON r.id = rs.riderId
WHERE r.zwiftId IN (150437, 1495, 1813927, ...)
```

**Missing Data:**
- ✅ Rider data is complete
- ❌ RiderStatistics not yet calculated
- ❌ No "favorites" table yet
- ⚠️  Need: User favorites table + stats calculation

---

### Story 3: Rider Recent Events (90 days)
**Als RiderID (opgegeven) wil ik de EventIDs van de afgelopen 90 dagen zien**

**Data Requirements:**
- Race Results voor specifieke rider
- Event details (name, date, route)
- Performance metrics per race
- Trend analysis (rating changes, position improvements)

**Query Pattern:**
```sql
SELECT 
  e.id as eventId,
  e.name as eventName,
  e.eventDate,
  e.routeName,
  e.distance,
  rr.position,
  rr.positionCategory,
  rr.category,
  rr.time,
  rr.averagePower,
  rr.averageWkg
FROM race_results rr
JOIN events e ON rr.eventId = e.id
WHERE rr.riderId = (SELECT id FROM riders WHERE zwiftId = 150437)
  AND e.eventDate >= DATE('now', '-90 days')
ORDER BY e.eventDate DESC
```

**Missing Data:**
- ⚠️  Only 1 event in database (5129235)
- ❌ Event dates are placeholders
- ❌ Need more events synced
- ⚠️  Need: Bulk event sync for active riders

---

## Critical Missing Pieces

### 1. **Favorites Table**
```sql
CREATE TABLE user_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,  -- Rider who created favorites
  favoriteRiderId INTEGER NOT NULL,  -- Rider being favorited
  notes TEXT,
  addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES riders(id),
  FOREIGN KEY (favoriteRiderId) REFERENCES riders(id),
  UNIQUE(userId, favoriteRiderId)
);
```

### 2. **Statistics Calculation**
RiderStatistics table exists but needs to be populated with calculated data from race_results.

### 3. **Event Date Extraction**
Events need real dates from API or race results timestamp.

### 4. **Bulk Event Sync**
Need to sync multiple events that club members participated in.

---

## Recommended Implementation Order

### Phase 1: Data Structure (CRITICAL)
1. ✅ Add Favorites table to schema
2. ✅ Add indexes for common queries
3. ✅ Validate existing relations work

### Phase 2: Statistics Engine
1. Calculate rider statistics from race_results
2. Auto-update on new race results
3. Trending data (30d, 90d windows)

### Phase 3: Bulk Sync Strategy
1. Find events for club members (via API exploration)
2. Batch sync top N recent events
3. Populate with full participant lists

### Phase 4: API Endpoints
1. GET /api/club/:clubId/recent-results
2. GET /api/riders/favorites/:riderId
3. GET /api/riders/:riderId/recent-events

### Phase 5: Frontend Views
1. Club recent results table
2. Favorites dashboard
3. Rider event history timeline

---

## Data Quality Improvements Needed

1. **Event Dates**: Extract from race result timestamps or API
2. **Participant Lists**: Sync all riders from events (not just club members)
3. **Historical Data**: Backfill older events for trend analysis
4. **Rating History**: Track rating changes over time

