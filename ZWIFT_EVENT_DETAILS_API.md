# Zwift Official API - Event/Activity Details

**Test Date**: December 8, 2025  
**Rider**: JRøne CloudRacer-9 @YT (TeamNL)  
**Zwift ID**: 150437  
**Last Race**: Snowman (B) - December 6, 2025

---

## 🏁 Working Endpoint

```
GET https://us-or-rly101.zwift.com/api/profiles/{riderId}/activities
```

**Authentication**: OAuth 2.0 Bearer Token  
**Response**: Array van activity objecten  
**Pagination**: `?start=0&limit=20` (default limit: 20)

---

## 📊 Complete Activity Object (28 fields)

### Laatste Race: Snowman (B)

```json
{
  "id_str": "2022697959300300800",
  "id": 2022697959300300800,
  "profileId": 150437,
  "profile": { ... },  // Volledige rider profile (nested)
  "worldId": 1,
  "name": "Zwift - Race: Zwift Epic Race - Snowman (B) on Snowman in Watopia",
  "description": null,
  "privateActivity": false,
  "sport": "CYCLING",
  "startDate": "2025-12-06T14:56:44.732+0000",
  "endDate": "2025-12-06T16:17:53.827+0000",
  "lastSaveDate": "2025-12-06T16:17:53.827+0000",
  "autoClosed": false,
  "duration": "1:21",
  "distanceInMeters": 44571.9,
  "fitFileBucket": "s3-fit-prd-uswest2-zwift",
  "fitFileKey": "prod/150437/32a6abce-2022697959300300800",
  "totalElevation": 584.712,
  "avgWatts": 213.04,
  "rideOnGiven": false,
  "activityRideOnCount": 133,
  "activityCommentCount": 0,
  "snapshotList": null,
  "calories": 966.031,
  "primaryImageUrl": "https://s3-fit-prd-uswest2-zwift.s3.amazonaws.com/prod/img/74f56831-2022738796872761344_256",
  "movingTimeInMs": 4639281,
  "deletedOn": null,
  "privacy": "PUBLIC"
}
```

---

## 🔑 Event Data Fields Breakdown

### Identity & Event Info (7 fields)

| Field | Type | Value (Snowman race) | Beschrijving |
|-------|------|---------------------|--------------|
| `id` | number | 2022697959300300800 | Unieke activity ID |
| `id_str` | string | "2022697959300300800" | Activity ID als string (voor JavaScript precision) |
| `profileId` | number | 150437 | Rider ID |
| `worldId` | number | 1 | Zwift world (1=Watopia, 3=London, 4=NYC, etc.) |
| `name` | string | "Zwift - Race: Zwift Epic Race - Snowman (B)..." | Volledige event naam |
| `description` | string? | null | Optionele beschrijving |
| `sport` | string | "CYCLING" | Sport type |

### Timing & Duration (4 fields)

| Field | Type | Value | Beschrijving |
|-------|------|-------|--------------|
| `startDate` | ISO 8601 | "2025-12-06T14:56:44.732+0000" | Start tijd (UTC) |
| `endDate` | ISO 8601 | "2025-12-06T16:17:53.827+0000" | Eind tijd (UTC) |
| `duration` | string | "1:21" | Duration formatted (1u 21min) |
| `movingTimeInMs` | number | 4639281 | Moving time in milliseconds (77 min) |

**Verschil**: `duration` = total elapsed time, `movingTimeInMs` = actual riding time (pauses excluded)

### Performance Stats (4 fields)

| Field | Type | Value | Beschrijving |
|-------|------|-------|--------------|
| `distanceInMeters` | number | 44571.9 | Distance in meters (44.6 km) |
| `totalElevation` | number | 584.712 | Total climbing in meters (585m) |
| `avgWatts` | number | 213.04 | Average power in watts |
| `calories` | number | 966.031 | Calories burned |

### Social Engagement (3 fields)

| Field | Type | Value | Beschrijving |
|-------|------|-------|--------------|
| `activityRideOnCount` | number | 133 | Number of RideOns received |
| `activityCommentCount` | number | 0 | Number of comments |
| `rideOnGiven` | boolean | false | Has rider given RideOn? |

### Media & Files (3 fields)

| Field | Type | Value | Beschrijving |
|-------|------|-------|--------------|
| `primaryImageUrl` | string | "https://s3-fit...256" | Activity screenshot (256x256) |
| `fitFileBucket` | string | "s3-fit-prd-uswest2-zwift" | S3 bucket voor FIT file |
| `fitFileKey` | string | "prod/150437/32a6abce-..." | S3 key voor FIT file download |

### Privacy & Status (4 fields)

| Field | Type | Value | Beschrijving |
|-------|------|-------|--------------|
| `privateActivity` | boolean | false | Is activity private? |
| `privacy` | string | "PUBLIC" | Privacy level |
| `autoClosed` | boolean | false | Was auto-gesloten? |
| `deletedOn` | ISO 8601? | null | Deletion timestamp (if deleted) |

### Additional Data (3 fields)

| Field | Type | Value | Beschrijving |
|-------|------|-------|--------------|
| `lastSaveDate` | ISO 8601 | "2025-12-06T16:17:53.827+0000" | Laatste save timestamp |
| `snapshotList` | array? | null | Event snapshots (optional) |
| `profile` | object | { ... } | **Volledige nested rider profile!** |

---

## 🎯 Nested Profile Object (binnen activity)

Elke activity bevat een **volledige rider profile** (alle 92 fields zoals eerder gedocumenteerd):

```json
"profile": {
  "id": 150437,
  "firstName": "JRøne ",
  "lastName": "CloudRacer-9 @YT (TeamNL)",
  "imageSrcLarge": "https://static-cdn.zwift.com/prod/profile/77e705da-94066",
  "socialFacts": {
    "followersCount": 4259,
    "followeesCount": 132
  },
  "privacy": { ... },
  // ... alle 92 profile fields
}
```

**Voordeel**: Je krijgt rider info + activity info in 1 API call!

---

## 🌍 World IDs

| World ID | World Name |
|----------|------------|
| 1 | Watopia |
| 3 | London |
| 4 | New York |
| 7 | Yorkshire |
| 9 | Makuri Islands |
| 13 | Scotland |

---

## 📈 Event Types uit Naam Field

De `name` field bevat gestructureerde info:

```
Format: "Zwift - [TYPE]: [EVENT_NAME] ([CATEGORY]) on [ROUTE] in [WORLD]"

Examples:
- "Zwift - Race: Zwift Epic Race - Snowman (B) on Snowman in Watopia"
- "Zwift - Race: Team DRAFT Sunday Race (C) on Wandering Flats in Makuri Islands"
- "Zwift - TTT: Zwift Racing League: City Showdown (B) on Greatest London Flat in London"
- "Zwift - Flatland Loop in Makuri Islands"  (free ride, no event)
```

**Event Types**:
- `Race:` - Regular race
- `TTT:` - Team Time Trial
- (geen prefix) - Free ride

---

## 💾 FIT File Download

Zwift slaat FIT files op in S3:

```typescript
const fitFileUrl = `https://${activity.fitFileBucket}.s3.amazonaws.com/${activity.fitFileKey}`;

// Example:
// https://s3-fit-prd-uswest2-zwift.s3.amazonaws.com/prod/150437/32a6abce-2022697959300300800
```

**Let op**: FIT file download vereist waarschijnlijk authentication (nog niet getest).

---

## 🔍 Query Examples

### Laatste 20 activities

```typescript
const { data } = await fetch(
  'https://us-or-rly101.zwift.com/api/profiles/150437/activities',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
).then(r => r.json());

console.log(`Retrieved ${data.length} activities`);
```

### Laatste 1 activity (pagination)

```typescript
const { data } = await fetch(
  'https://us-or-rly101.zwift.com/api/profiles/150437/activities?start=0&limit=1',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
).then(r => r.json());

const lastRace = data[0];
console.log(lastRace.name);
console.log(`${lastRace.distanceInMeters / 1000} km in ${lastRace.duration}`);
```

### Filter op race type

```typescript
const activities = await fetchActivities(riderId);

// Only races
const races = activities.filter(a => a.name.includes('Race:'));

// Only TTT
const ttt = activities.filter(a => a.name.includes('TTT:'));

// Only free rides
const freeRides = activities.filter(a => 
  !a.name.includes('Race:') && !a.name.includes('TTT:')
);
```

### Aggregated stats

```typescript
const activities = await fetchActivities(riderId);

const totalDistance = activities.reduce((sum, a) => sum + a.distanceInMeters, 0) / 1000;
const totalElevation = activities.reduce((sum, a) => sum + a.totalElevation, 0);
const totalRideOns = activities.reduce((sum, a) => sum + a.activityRideOnCount, 0);
const avgPower = activities.reduce((sum, a) => sum + a.avgWatts, 0) / activities.length;

console.log(`Last 20 rides: ${totalDistance.toFixed(0)} km, ${totalElevation.toFixed(0)}m climbing`);
console.log(`Avg power: ${avgPower.toFixed(0)}W, Total RideOns: ${totalRideOns}`);
```

---

## 📊 TypeScript Interface

```typescript
interface ZwiftActivity {
  // Identity
  id: number;
  id_str: string;
  profileId: number;
  
  // Event Info
  worldId: number;
  name: string;
  description: string | null;
  sport: string;  // "CYCLING", "RUNNING"
  
  // Timing
  startDate: string;  // ISO 8601 UTC
  endDate: string;    // ISO 8601 UTC
  lastSaveDate: string;  // ISO 8601 UTC
  duration: string;   // Formatted "1:21"
  movingTimeInMs: number;  // Milliseconds
  
  // Performance
  distanceInMeters: number;
  totalElevation: number;  // meters
  avgWatts: number;
  calories: number;
  
  // Social
  activityRideOnCount: number;
  activityCommentCount: number;
  rideOnGiven: boolean;
  
  // Media
  primaryImageUrl: string;
  snapshotList: any[] | null;
  
  // Files
  fitFileBucket: string;
  fitFileKey: string;
  
  // Privacy
  privateActivity: boolean;
  privacy: "PUBLIC" | "PRIVATE" | "FOLLOWERS";
  autoClosed: boolean;
  deletedOn: string | null;
  
  // Nested rider profile (full 92 fields)
  profile: ZwiftOfficialProfile;
}

interface ZwiftOfficialProfile {
  // See ZWIFT_OFFICIAL_API_DATA_RIDER_150437.md for complete profile interface
  id: number;
  firstName: string;
  lastName: string;
  imageSrcLarge: string;
  socialFacts: {
    followersCount: number;
    followeesCount: number;
  };
  // ... 92 fields total
}
```

---

## 🎯 Use Cases

### 1. Recent Activity Feed

```typescript
// Show last 5 races on rider profile
const activities = await fetchActivities(riderId);
const recentRaces = activities
  .filter(a => a.name.includes('Race:'))
  .slice(0, 5)
  .map(a => ({
    name: a.name,
    date: new Date(a.startDate).toLocaleDateString(),
    distance: `${(a.distanceInMeters / 1000).toFixed(1)} km`,
    power: `${a.avgWatts}W`,
    elevation: `${a.totalElevation.toFixed(0)}m`,
    rideOns: a.activityRideOnCount,
    image: a.primaryImageUrl
  }));
```

### 2. Performance Tracking

```typescript
// Track avg power over last 20 rides
const activities = await fetchActivities(riderId);
const powerTrend = activities.map(a => ({
  date: a.startDate,
  avgWatts: a.avgWatts,
  distance: a.distanceInMeters / 1000
})).reverse();  // Oldest to newest
```

### 3. Race Calendar

```typescript
// Extract race events from activities
const races = activities
  .filter(a => a.name.includes('Race:') || a.name.includes('TTT:'))
  .map(a => {
    const match = a.name.match(/Race: (.+?) \(([A-E])\) on (.+?) in (.+)$/);
    return {
      eventName: match?.[1],
      category: match?.[2],
      route: match?.[3],
      world: match?.[4],
      date: a.startDate,
      duration: a.duration,
      avgPower: a.avgWatts
    };
  });
```

### 4. Social Engagement

```typescript
// Most popular activities (by RideOns)
const mostPopular = activities
  .sort((a, b) => b.activityRideOnCount - a.activityRideOnCount)
  .slice(0, 5);

console.log('Top 5 most popular rides:');
mostPopular.forEach(a => {
  console.log(`${a.name}: ${a.activityRideOnCount} RideOns`);
});
```

---

## 🆚 Comparison: Zwift Official Activities vs ZwiftRacing.app

| Feature | Zwift Official | ZwiftRacing.app | Winner |
|---------|---------------|-----------------|--------|
| **Recent Activities** | ✅ Last 20 rides | ❌ None | Zwift Official |
| **Event Details** | ✅ 28 fields | ❌ None | Zwift Official |
| **Performance Stats** | ✅ Power, distance, elevation | ❌ None | Zwift Official |
| **Social Data** | ✅ RideOns, comments | ❌ None | Zwift Official |
| **Screenshots** | ✅ Activity images | ❌ None | Zwift Official |
| **FIT Files** | ✅ S3 download links | ❌ None | Zwift Official |
| **Race Results** | ⚠️ Not tested yet | ✅ Full results API | ZwiftRacing.app |
| **vELO/Power Curve** | ❌ None | ✅ Complete analysis | ZwiftRacing.app |
| **Bulk Operations** | ❌ Individual only | ✅ 1000 riders/call | ZwiftRacing.app |

**CONCLUSIE**: 
- **Zwift Official**: Beste voor **activity history** en **social engagement**
- **ZwiftRacing.app**: Beste voor **racing analytics** en **performance metrics**
- **Hybrid approach**: Gebruik beide APIs voor complete data!

---

## ⚠️ Limitations & Notes

### Not Found in Activities Endpoint

- ❌ **Race results/positions**: Geen ranking info
- ❌ **Lap times/splits**: Geen segment data
- ❌ **Power zones**: Geen power distribution
- ❌ **Heart rate zones**: Geen HR analysis
- ❌ **Cadence/speed**: Alleen avg power
- ❌ **Event participants**: Geen andere riders

**Voor race results**: Gebruik ZwiftRacing.app API (`/public/results/{eventId}`)

### Pagination

- Default: 20 activities
- Max per page: Unknown (needs testing)
- Parameter: `?start=0&limit=20`
- No total count returned

### Data Freshness

- Activities appear **immediately** after ride
- Processing delay: ~1-2 minutes
- FIT file upload: May take longer

### Authentication

- Requires OAuth 2.0 Bearer Token
- Token expires: 86400 seconds (24 hours)
- Must refresh before expiry

---

## 🚀 Recommended Implementation

### Database Schema Addition

```sql
-- Add to multi-source architecture
CREATE TABLE zwift_official_activities (
  activity_id BIGINT PRIMARY KEY,  -- id from API
  activity_id_str TEXT NOT NULL,
  rider_id INTEGER NOT NULL REFERENCES zwift_official_profiles(rider_id),
  
  -- Event Info
  world_id INTEGER,
  event_name TEXT NOT NULL,
  event_type TEXT,  -- 'race', 'ttt', 'free_ride'
  route_name TEXT,
  world_name TEXT,
  
  -- Timing
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  duration_formatted TEXT,
  moving_time_ms BIGINT,
  
  -- Performance
  distance_meters NUMERIC(10,2),
  total_elevation_m NUMERIC(10,2),
  avg_watts INTEGER,
  calories NUMERIC(10,2),
  
  -- Social
  ride_on_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- Media
  primary_image_url TEXT,
  fit_file_bucket TEXT,
  fit_file_key TEXT,
  
  -- Privacy
  is_private BOOLEAN DEFAULT false,
  privacy_level TEXT,
  
  -- Metadata
  sport TEXT DEFAULT 'CYCLING',
  auto_closed BOOLEAN,
  deleted_on TIMESTAMPTZ,
  last_save_date TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  
  -- Indexes
  CONSTRAINT fk_rider FOREIGN KEY (rider_id) REFERENCES zwift_official_profiles(rider_id) ON DELETE CASCADE
);

CREATE INDEX idx_activities_rider ON zwift_official_activities(rider_id);
CREATE INDEX idx_activities_date ON zwift_official_activities(start_date DESC);
CREATE INDEX idx_activities_type ON zwift_official_activities(event_type);
CREATE INDEX idx_activities_world ON zwift_official_activities(world_id);
```

### Frontend Component: Activity Feed

```typescript
// components/RiderActivityFeed.tsx
interface Props {
  riderId: number;
  limit?: number;
}

export function RiderActivityFeed({ riderId, limit = 5 }: Props) {
  const { data: activities } = useQuery({
    queryKey: ['activities', riderId],
    queryFn: () => supabase
      .from('zwift_official_activities')
      .select('*')
      .eq('rider_id', riderId)
      .order('start_date', { ascending: false })
      .limit(limit)
  });
  
  return (
    <div className="activity-feed">
      <h3>Recent Activities</h3>
      {activities?.map(activity => (
        <ActivityCard key={activity.activity_id} activity={activity} />
      ))}
    </div>
  );
}

function ActivityCard({ activity }) {
  return (
    <div className="activity-card">
      <img src={activity.primary_image_url} alt={activity.event_name} />
      <div className="details">
        <h4>{activity.event_name}</h4>
        <p>{new Date(activity.start_date).toLocaleDateString()}</p>
        <div className="stats">
          <span>{(activity.distance_meters / 1000).toFixed(1)} km</span>
          <span>{activity.avg_watts}W</span>
          <span>↗️ {activity.total_elevation_m}m</span>
          <span>👍 {activity.ride_on_count}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## 📚 Related Documentation

- **Profile Data**: `ZWIFT_OFFICIAL_API_DATA_RIDER_150437.md` (92 profile fields)
- **Racing Data**: `API_DATA_FIELDS_RIDER_150437.md` (51 racing fields via ZwiftRacing.app)
- **Multi-Source Architecture**: `MULTI_SOURCE_ARCHITECTURE_SUMMARY.md`
- **Historical Patterns**: `API_HISTORICAL_IMPLEMENTATION.md`
- **Test Scripts**: `test-zwift-event-details.ts`

---

## ✅ Summary

**Zwift Official API Event Details** bevat **28 activity fields**:

✅ **Wat je krijgt**:
- Complete event info (name, world, route)
- Performance stats (power, distance, elevation, calories)
- Timing (start, end, duration, moving time)
- Social data (RideOns, comments)
- Media (screenshots, FIT file links)
- Nested rider profile (alle 92 profile fields!)

❌ **Wat je NIET krijgt**:
- Race results/positions
- Lap times/splits
- Power zones/distribution
- Other participants
- vELO ratings

**AANBEVELING**: Combineer met ZwiftRacing.app voor complete data:
- **Zwift Official**: Activity history + social engagement
- **ZwiftRacing.app**: Racing analytics + results
- **Hybrid views**: Best of both worlds!

---

**Document Version**: 1.0  
**Last Updated**: December 8, 2025  
**Test Rider**: 150437 (JRøne CloudRacer-9 @YT TeamNL)  
**Activities Analyzed**: 20 recent rides
