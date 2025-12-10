# 🏆 Complete Zwift API Comparison - Final Recommendation

**Test Date**: December 2025  
**Test Rider**: 150437 (JRøne CloudRacer-9 @YouTube - TeamNL)  
**APIs Tested**: 3 (ZwiftRacing.app, Zwift Official, ZwiftPower)

---

## 📊 Executive Summary

### API Scores

| API | Fields | Auth Complexity | Rate Limits | Data Quality | Integration | **TOTAL** |
|-----|--------|-----------------|-------------|--------------|-------------|-----------|
| **ZwiftRacing.app** | 51 | ✅ Simple | ✅ 5/min | ✅ Excellent | ✅ Easy | **⭐⭐⭐⭐⭐** |
| **Zwift Official** | 120 | ⚠️ OAuth | ⚠️ Unknown | ✅ Good | ✅ Easy | **⭐⭐⭐⭐** |
| **ZwiftPower** | 85 | ❌ Complex | ❌ Unknown | ⚠️ Mixed | ❌ Hard | **⭐⭐** |

---

## 🎯 RECOMMENDED ARCHITECTURE

### ⭐ PRIMARY: ZwiftRacing.app
**Use for**: Core racing data, bulk operations, real-time stats

**Advantages**:
- ✅ 51 racing-specific fields
- ✅ Bulk endpoint: 1000 riders per call
- ✅ Simple API key authentication
- ✅ Predictable rate limits (5/min individual, 1/15min bulk)
- ✅ Direct REST API (no library needed)
- ✅ vELO rating (unique metric)
- ✅ Power curve (7 durations)
- ✅ Phenotype classification

**Example**:
```typescript
GET https://www.zwiftracing.app/api/riders/150437
Authorization: Bearer YOUR_API_KEY

// Bulk operation
POST https://www.zwiftracing.app/api/riders/bulk
{ "ids": [150437, 123456, 789012, ...] } // Up to 1000
```

**Rate Limits**:
- Individual: 5 requests/minute
- Bulk: 1 request/15 minutes (1000 riders)
- **80 TeamNL riders = 1 bulk call every 15 minutes!**

---

### ⭐ ENRICHMENT: Zwift Official API
**Use for**: Avatars, social stats, activity details

**Advantages**:
- ✅ 92 profile fields (official source)
- ✅ 28 activity fields per event
- ✅ High-resolution avatars
- ✅ Social metrics (followers, followees, RideOns)
- ✅ Activity feed (last 20 activities)
- ✅ Direct REST API
- ⚠️ OAuth 2.0 (manageable, 24h tokens)

**Example**:
```typescript
// Profile
GET https://us-or-rly101.zwift.com/api/profiles/150437
Authorization: Bearer OAUTH_TOKEN

// Activities
GET https://us-or-rly101.zwift.com/api/profiles/150437/activities?start=0&limit=20
```

**Rate Limits**: Unknown, but unofficial so use carefully

---

### ❌ SKIP: ZwiftPower
**Use for**: Nothing in production (historical analysis only)

**Disadvantages**:
- ❌ Requires Python library (zpdatafetch)
- ❌ Keyring authentication (complex)
- ❌ No direct REST API
- ❌ Historical data only (not real-time)
- ❌ Cache3 endpoints blocked (403)
- ❌ No bulk operations
- ⚠️ Power curve fields mostly empty
- ⚠️ Unknown rate limits

**When to Use**:
- Historical race archive analysis (427 races)
- Retrospective skill rating progression
- Manual data exploration (not automated)

---

## 📋 Field Comparison Matrix

### Racing Performance
| Field | ZwiftRacing.app | Zwift Official | ZwiftPower | Winner |
|-------|-----------------|----------------|------------|--------|
| **vELO Rating** | ✅ 1247.02 | ❌ | ❌ | 🏆 **ZwiftRacing** |
| **Racing Score** | ✅ 56.40 | ✅ 56.4 | ❌ | 🤝 Both |
| **FTP** | ✅ 241W | ✅ 248W | ✅ 241W | 🤝 All |
| **Power Curve (7 durations)** | ✅ Full | ❌ | ⚠️ Empty | 🏆 **ZwiftRacing** |
| **w/kg** | ✅ 3.07 | ✅ 3.07 | ✅ 2.1 (race avg) | 🤝 Racing/Official |
| **Races Count** | ✅ 425 | ❌ | ✅ 427 | 🏆 **ZwiftPower** |

### Power Analysis
| Power Duration | ZwiftRacing.app | ZwiftPower | Winner |
|----------------|-----------------|------------|--------|
| **20min (1200s)** | ✅ 244W / 3.10 w/kg | ⚠️ Empty | 🏆 **ZwiftRacing** |
| **5min (300s)** | ✅ 290W / 3.68 w/kg | ⚠️ Empty | 🏆 **ZwiftRacing** |
| **1min (60s)** | ✅ 383W / 4.87 w/kg | ⚠️ Empty | 🏆 **ZwiftRacing** |
| **15sec** | ✅ 576W / 7.31 w/kg | ⚠️ Empty | 🏆 **ZwiftRacing** |
| **Phenotype** | ✅ "Sprinter" | ❌ | 🏆 **ZwiftRacing** |

### Social & Profile
| Field | ZwiftRacing.app | Zwift Official | ZwiftPower | Winner |
|-------|-----------------|----------------|------------|--------|
| **Followers** | ❌ | ✅ 4259 | ❌ | 🏆 **Official** |
| **Followees** | ❌ | ✅ 1 | ❌ | 🏆 **Official** |
| **Avatar URL** | ❌ | ✅ High-res | ❌ | 🏆 **Official** |
| **RideOns Given** | ❌ | ✅ 16,373 | ❌ | 🏆 **Official** |
| **RideOns Received** | ❌ | ✅ Per activity | ❌ | 🏆 **Official** |

### Activity/Event Details
| Field | ZwiftRacing.app | Zwift Official | ZwiftPower | Winner |
|-------|-----------------|----------------|------------|--------|
| **Activity Feed** | ❌ | ✅ 20 activities | ✅ 427 races | 🏆 **ZwiftPower** (volume) |
| **Event Name** | ❌ | ✅ Full name | ✅ Full name | 🤝 Both |
| **Distance** | ❌ | ✅ 44.6km | ✅ Yes | 🤝 Both |
| **Elevation** | ❌ | ✅ 585m | ❌ | 🏆 **Official** |
| **Calories** | ❌ | ✅ 966 | ❌ | 🏆 **Official** |
| **RideOns (per race)** | ❌ | ✅ 133 | ❌ | 🏆 **Official** |
| **Position** | ❌ | ❌ | ✅ 31st | 🏆 **ZwiftPower** |

### Physical Stats
| Field | ZwiftRacing.app | Zwift Official | ZwiftPower | Winner |
|-------|-----------------|----------------|------------|--------|
| **Weight** | ✅ 78.7 kg | ✅ 80.72 kg | ✅ 76.0 kg | ⚠️ **Inconsistent!** |
| **Height** | ✅ 174 cm | ✅ 174 cm | ⚠️ 0 | 🤝 Racing/Official |
| **Age** | ❌ | ✅ 51 | ✅ "Vet" | 🤝 Both |
| **Gender** | ❌ | ✅ Male | ✅ 1 (male) | 🤝 Both |

### Team Information
| Field | ZwiftRacing.app | Zwift Official | ZwiftPower | Winner |
|-------|-----------------|----------------|------------|--------|
| **Team Name** | ❌ | ❌ | ✅ "TeamNL" | 🏆 **ZwiftPower** |
| **Team Colors** | ❌ | ❌ | ✅ RGB hex | 🏆 **ZwiftPower** |
| **Team ID** | ❌ | ❌ | ✅ 2281 | 🏆 **ZwiftPower** |

---

## ⚡ Performance Comparison

### Bulk Operations
| API | Riders/Call | Calls for 80 TeamNL | Time | Winner |
|-----|-------------|---------------------|------|--------|
| **ZwiftRacing.app** | 1000 | 1 call | 15 min | 🏆 |
| **Zwift Official** | 1 | 80 calls | ? | ❌ |
| **ZwiftPower** | 1 | 80 calls | ? | ❌ |

**Verdict**: ZwiftRacing.app is **80x more efficient** for bulk operations!

### Authentication Complexity
| API | Method | Refresh | Complexity | Winner |
|-----|--------|---------|------------|--------|
| **ZwiftRacing.app** | API Key | Never | ⭐ Simple | 🏆 |
| **Zwift Official** | OAuth 2.0 | 24h | ⭐⭐⭐ Medium | ⚠️ |
| **ZwiftPower** | Keyring + Login | Per session | ⭐⭐⭐⭐⭐ Complex | ❌ |

### Integration Effort
| API | TypeScript SDK | REST API | Library Required | Winner |
|-----|----------------|----------|------------------|--------|
| **ZwiftRacing.app** | Not official but easy | ✅ | ❌ | 🏆 |
| **Zwift Official** | Community | ✅ | ❌ | ⭐⭐⭐⭐ |
| **ZwiftPower** | ❌ | ❌ | ✅ Python | ❌ |

---

## 🎨 Use Case Recommendations

### Use Case 1: Team Dashboard (80 riders)
**Goal**: Show current racing stats, rankings, power curves

**Recommendation**: ZwiftRacing.app ONLY
```typescript
// One bulk call every 15 minutes
const riders = await zwiftRacing.bulk([...80 rider IDs]);

// Display:
// - vELO rankings
// - Power curves (7 durations)
// - Racing scores
// - Phenotype classifications
```

✅ Simple  
✅ Efficient (1 API call)  
✅ Complete racing data  
❌ No avatars (minor)

---

### Use Case 2: Rich Rider Profiles
**Goal**: Show avatars, social stats, racing performance

**Recommendation**: ZwiftRacing.app + Zwift Official
```typescript
// Primary data
const racingData = await zwiftRacing.getRider(150437);

// Enrichment
const profile = await zwiftOfficial.getProfile(150437);

// Display:
// - Avatar (Official)
// - Followers/RideOns (Official)
// - vELO/Power Curve (Racing)
// - Racing Score (both)
```

✅ Complete profile  
✅ Racing performance  
✅ Social engagement  
⚠️ OAuth complexity (manageable)

---

### Use Case 3: Activity Feed
**Goal**: Show recent rides/races with social engagement

**Recommendation**: Zwift Official ONLY
```typescript
const activities = await zwiftOfficial.getActivities(150437);

// Display:
// - Last 20 activities
// - RideOns per activity
// - Distance, elevation, calories
// - Event names
```

✅ Complete activity details  
✅ Social metrics (RideOns)  
✅ No additional API needed  
❌ No race positions (minor)

---

### Use Case 4: Historical Race Analysis
**Goal**: Analyze 427 races, skill progression

**Recommendation**: ZwiftPower (manual/offline only)
```python
# Python script (not part of main backend)
from zpdatafetch import ZP

with ZP() as zp:
    zp.login()
    races = zp.fetch_json(f".../{rider_id}_all.json")
    
# Analyze:
# - Skill rating over time
# - Position trends
# - Category progressions
```

⚠️ Offline analysis only  
⚠️ Don't integrate into main app  
❌ Too complex for real-time

---

## 🏗️ Final Architecture

### Database Schema

```sql
-- PRIMARY SOURCE: ZwiftRacing.app (sync every 15 min)
CREATE TABLE zwift_racing_riders (
  rider_id INTEGER PRIMARY KEY,
  velo DECIMAL(10,2),
  racing_score DECIMAL(10,2),
  ftp INTEGER,
  weight DECIMAL(5,2),
  power_15s INTEGER,
  power_60s INTEGER,
  power_300s INTEGER,
  power_1200s INTEGER,
  phenotype TEXT,
  race_count INTEGER,
  last_synced TIMESTAMP DEFAULT NOW()
);

-- ENRICHMENT: Zwift Official (sync daily or on-demand)
CREATE TABLE zwift_official_profiles (
  rider_id INTEGER PRIMARY KEY,
  avatar_url TEXT,
  followers_count INTEGER,
  followees_count INTEGER,
  rideons_given INTEGER,
  last_synced TIMESTAMP DEFAULT NOW()
);

-- ACTIVITIES: Zwift Official (sync on-demand)
CREATE TABLE zwift_activities (
  id BIGINT PRIMARY KEY,
  rider_id INTEGER,
  name TEXT,
  start_date TIMESTAMP,
  distance_km DECIMAL(10,2),
  elevation_m DECIMAL(10,2),
  avg_watts INTEGER,
  rideon_count INTEGER,
  FOREIGN KEY (rider_id) REFERENCES zwift_racing_riders(rider_id)
);

-- HYBRID VIEW: Best of both worlds
CREATE VIEW v_team_riders_complete AS
SELECT 
  r.rider_id,
  r.velo,
  r.racing_score,
  r.ftp,
  r.weight,
  r.power_15s,
  r.power_60s,
  r.power_300s,
  r.power_1200s,
  r.phenotype,
  r.race_count,
  o.avatar_url,
  o.followers_count,
  o.rideons_given
FROM zwift_racing_riders r
LEFT JOIN zwift_official_profiles o 
  ON r.rider_id = o.rider_id;
```

---

### Sync Strategy

```typescript
// BULK SYNC: Every 15 minutes (respects rate limits)
async function syncTeamRacingData() {
  const teamRiderIds = await db.getTeamRiderIds(); // 80 riders
  
  // One bulk call
  const racingData = await zwiftRacing.bulk(teamRiderIds);
  
  // Upsert to database
  await db.upsertBulk('zwift_racing_riders', racingData);
}

// ENRICHMENT SYNC: Daily or on profile view
async function syncRiderProfile(riderId: number) {
  const profile = await zwiftOfficial.getProfile(riderId);
  
  await db.upsert('zwift_official_profiles', {
    rider_id: riderId,
    avatar_url: profile.imageSrc,
    followers_count: profile.followerStatusOfLoggedInPlayer.followersCount,
    followees_count: profile.followeeStatusOfLoggedInPlayer.followeesCount,
    rideons_given: profile.totalGiveRideons
  });
}

// ACTIVITIES: On-demand when viewing rider details
async function fetchRecentActivities(riderId: number) {
  const activities = await zwiftOfficial.getActivities(riderId, 10);
  
  // Cache in database
  await db.insertActivities(activities);
  
  return activities;
}
```

---

### API Client Priority

```typescript
class ZwiftDataService {
  // PRIMARY: Always use for racing data
  async getRiderRacingData(riderId: number) {
    return this.zwiftRacing.getRider(riderId);
  }
  
  // ENRICHMENT: Use when displaying profile
  async getRiderProfile(riderId: number) {
    const racing = await this.getRiderRacingData(riderId);
    const official = await this.zwiftOfficial.getProfile(riderId);
    
    return {
      ...racing,
      avatar: official.imageSrc,
      social: {
        followers: official.followerStatusOfLoggedInPlayer.followersCount,
        rideons: official.totalGiveRideons
      }
    };
  }
  
  // OPTIONAL: Use sparingly for activity feed
  async getRiderActivities(riderId: number) {
    return this.zwiftOfficial.getActivities(riderId, 20);
  }
  
  // SKIP: Don't implement ZwiftPower in production
  // Use Python script for manual historical analysis only
}
```

---

## 📊 Cost-Benefit Analysis

### ZwiftRacing.app
**Cost**: ⭐ (Low)
- Simple API key
- 5 requests/min (generous)
- No OAuth complexity

**Benefit**: ⭐⭐⭐⭐⭐ (Highest)
- 51 racing fields
- Bulk 1000 riders/call
- vELO (unique)
- Power curve (complete)
- Phenotype classification

**ROI**: 🏆 **EXCELLENT**

---

### Zwift Official
**Cost**: ⭐⭐⭐ (Medium)
- OAuth 2.0 implementation
- Token refresh (24h)
- Unknown rate limits
- Unofficial API (risk)

**Benefit**: ⭐⭐⭐⭐ (High)
- 92 profile fields
- Official avatars
- Social metrics
- Activity details (28 fields)

**ROI**: ⭐⭐⭐⭐ **GOOD** (for enrichment)

---

### ZwiftPower
**Cost**: ⭐⭐⭐⭐⭐ (Highest)
- Python library requirement
- Keyring authentication
- No REST API
- No bulk operations
- Complex integration

**Benefit**: ⭐⭐ (Low)
- Historical races (good volume)
- Team colors (minor)
- Power curve mostly empty
- Not real-time

**ROI**: ❌ **POOR** (skip for production)

---

## ✅ FINAL VERDICT

### Production Architecture

**PRIMARY API**: ZwiftRacing.app
- Use for: Racing data, power curves, vELO
- Sync: Every 15 minutes (bulk)
- Coverage: 100% of racing needs

**SECONDARY API**: Zwift Official
- Use for: Avatars, social stats, activities
- Sync: Daily (profiles) + On-demand (activities)
- Coverage: UI enrichment only

**SKIP**: ZwiftPower
- Use for: Manual analysis only (Python script)
- Sync: Never (manual export if needed)
- Coverage: Historical curiosity

---

### Field Count Summary
- **ZwiftRacing.app**: 51 fields (racing-focused)
- **Zwift Official**: 120 fields (92 profile + 28 activity)
- **ZwiftPower**: 85 fields (historical races)
- **Combined**: ~200+ unique fields
- **Production**: ~70 fields (Racing + Official subset)

---

### Implementation Priority

**Week 1**: ZwiftRacing.app
- ✅ Implement API client
- ✅ Bulk sync for 80 TeamNL riders
- ✅ Database schema
- ✅ Sync service (15min intervals)

**Week 2**: Zwift Official
- ✅ OAuth 2.0 implementation
- ✅ Profile enrichment
- ✅ Avatar display
- ✅ Activity feed (optional)

**Week 3**: Integration
- ✅ Hybrid views
- ✅ Frontend components
- ✅ Caching strategy
- ✅ Error handling

**Never**: ZwiftPower
- ❌ Don't integrate into production
- ✅ Keep Python script for manual analysis
- ✅ Document as "historical reference only"

---

## 🎉 Conclusion

After testing all 3 APIs with real data for rider 150437:

**Best Overall**: ZwiftRacing.app
- Most efficient (bulk operations)
- Best racing data (vELO, power curve)
- Simplest integration (API key)

**Best Complement**: Zwift Official
- Best for social/visual features
- Official source (more reliable)
- Good activity details

**Worst Choice**: ZwiftPower
- Too complex (Python + keyring)
- No real-time data
- Redundant with ZwiftRacing.app
- Historical analysis only

**Recommended Stack**: ZwiftRacing.app + Zwift Official (skip ZwiftPower)

---

## 📚 Related Documents

1. [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Complete 3-API reference
2. [API_DATA_FIELDS_RIDER_150437.md](./API_DATA_FIELDS_RIDER_150437.md) - ZwiftRacing 51 fields
3. [ZWIFT_OFFICIAL_API_DATA_RIDER_150437.md](./ZWIFT_OFFICIAL_API_DATA_RIDER_150437.md) - Official 92 fields
4. [ZWIFT_EVENT_DETAILS_API.md](./ZWIFT_EVENT_DETAILS_API.md) - Official 28 activity fields
5. [ZWIFTPOWER_API_DATA_RIDER_150437.md](./ZWIFTPOWER_API_DATA_RIDER_150437.md) - ZwiftPower 85 fields
6. [MULTI_SOURCE_ARCHITECTURE_SUMMARY.md](./MULTI_SOURCE_ARCHITECTURE_SUMMARY.md) - Database design

**Data Files**:
- `ZWIFTPOWER_FULL_DATA_150437.json` - 427 races (71,740 lines)
- Test scripts: `test-zwift-*.ts`, `test-zwiftpower-simple.py`
