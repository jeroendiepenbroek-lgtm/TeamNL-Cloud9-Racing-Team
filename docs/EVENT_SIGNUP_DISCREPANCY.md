# Event Signup Discrepancy Issue

## Problem
Event signups in dashboard komen niet overeen met signups in Zwift Companion app.

## Root Cause
We gebruiken ZwiftRacing.app API (`/api/events/{eventId}/signups`) maar deze heeft limitations:

1. **Delayed Updates** - Signups worden niet real-time bijgewerkt
2. **Future Events** - Voor toekomstige events zijn signups vaak incompleet
3. **Different Source** - Companion app gebruikt Zwift's eigen interne API

## Current Data Flow

```
Zwift Platform (internal API)
     ↓
     ├─> Zwift Companion App (real-time)
     └─> ZwiftRacing.app (delayed sync)
              ↓
         Our Dashboard (further delayed)
```

## Solutions

### Option 1: Zwift Event Subgroups API (RECOMMENDED)
Zwift heeft een publieke API voor event details:

```bash
GET https://us-or-rly101.zwift.com/relay/events/{eventId}/subgroups
```

**Pros:**
- Real-time data (wat Companion app ook gebruikt)
- Accurate signup counts per category
- Geen rate limiting (publieke API)

**Cons:**
- Andere API base URL
- Requires eventId → eventSubgroupId mapping
- Geen ZwiftRacing.app API key nodig

**Implementation:**
```typescript
// Nieuwe method in zwift-client.ts
async getEventSubgroups(eventId: string): Promise<any> {
  const response = await axios.get(
    `https://us-or-rly101.zwift.com/relay/events/${eventId}/subgroups`
  );
  
  // Response bevat:
  // - subgroups[].signedUp (aantal signups)
  // - subgroups[].label (A/B/C/D/E)
  // - subgroups[].registrationStart/End
  
  return response.data;
}
```

### Option 2: Event Details Fallback
ZwiftRacing.app's `/api/events/{eventId}` endpoint heeft ook signup data:

```typescript
async getEventDetails(eventId: number): Promise<ZwiftEvent> {
  const response = await this.client.get(`/api/events/${eventId}`);
  
  // Response bevat:
  // event.categories (comma-separated: "A,B,C,D")
  // event.signups (comma-separated: "12,8,15,22")
  
  return response.data;
}
```

**Parse Logic:**
```typescript
const categories = event.categories.split(','); // ["A", "B", "C", "D"]
const signups = event.signups.split(',').map(Number); // [12, 8, 15, 22]

const signupCounts = categories.map((cat, i) => ({
  category: cat,
  count: signups[i] || 0
}));
```

**Pros:**
- Dezelfde API die we al gebruiken
- Minder dependencies

**Cons:**
- Nog steeds delayed updates
- Geen individuele rider details

### Option 3: Hybrid Approach (BEST)
Combineer beide sources:

1. **Primary:** Gebruik Zwift Relay API voor real-time counts
2. **Fallback:** Gebruik ZwiftRacing.app voor historical data
3. **Cache:** Store laatste bekende counts in database

```typescript
async getEventSignupCounts(eventId: string): Promise<SignupCounts> {
  try {
    // Try Zwift Relay API first (real-time)
    const subgroups = await this.getEventSubgroups(eventId);
    return this.parseSubgroupSignups(subgroups);
  } catch (error) {
    console.warn('Zwift Relay API failed, using ZwiftRacing.app');
    
    // Fallback: ZwiftRacing.app
    const event = await this.getEventDetails(eventId);
    return this.parseEventSignups(event);
  }
}
```

## Implementation Plan

### Phase 1: Quick Fix (Current Sprint)
✅ Update UI om duidelijk te maken dat signups "approximate" zijn
✅ Add disclaimer: "Signup counts may be delayed"

### Phase 2: Zwift Relay Integration (Next Sprint)
- [ ] Add Zwift Relay API client
- [ ] Implement getEventSubgroups()
- [ ] Update event sync service
- [ ] Test with live events
- [ ] Compare counts with Companion app

### Phase 3: Data Quality (Future)
- [ ] Store signup history (snapshots)
- [ ] Track signup velocity (signups per hour)
- [ ] Alert when counts diverge significantly
- [ ] Add "Last Updated" timestamp to UI

## Database Changes Needed

```sql
-- Add signup tracking table
CREATE TABLE event_signup_snapshots (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(event_id),
  category VARCHAR(5) NOT NULL,
  signup_count INTEGER NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'zwift_relay', 'zwiftracing', 'manual'
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  INDEX idx_event_snapshots (event_id, captured_at DESC)
);

-- View: Latest signup counts per event
CREATE VIEW view_event_latest_signups AS
SELECT DISTINCT ON (event_id, category)
  event_id,
  category,
  signup_count,
  source,
  captured_at
FROM event_signup_snapshots
ORDER BY event_id, category, captured_at DESC;
```

## Testing

### Verify Discrepancy
```bash
# 1. Get event from our API
curl http://localhost:3000/api/events/5144585/signups

# 2. Check Companion app
# Open event 5144585 in Companion → View signups

# 3. Check Zwift Relay
curl https://us-or-rly101.zwift.com/relay/events/5144585/subgroups

# 4. Compare counts
```

### Expected Results
- Companion app: Real-time (most accurate)
- Zwift Relay: Real-time (same as Companion)
- ZwiftRacing.app: Delayed 5-15 minutes
- Our dashboard: Delayed further (last sync + API delay)

## Related Issues
- #US3: Sign-ups komen niet overeen (THIS ISSUE)
- #US2: Rate limits (affects sync frequency)
- Event sync runs every 15min → max 15min delay

## References
- Zwift Relay API: https://us-or-rly101.zwift.com/relay/
- ZwiftRacing.app: https://zwift-ranking.herokuapp.com/
- Companion App: Native Zwift API (niet publiek gedocumenteerd)

## Decision: Quick Fix for Now

Voor US3 implementeren we **Option 2** (Event Details Fallback):

### Why?
1. **No new dependencies** - Dezelfde API die we al gebruiken
2. **Fast implementation** - Parse logic al beschikbaar
3. **Works offline** - Geen extra API calls

### Changes Needed
```typescript
// In sync-v2.service.ts - updateEventDetails()
const event = await zwiftClient.getEventDetails(eventId);

// Parse signups from event.signups field
if (event.signups && event.categories) {
  const categories = event.categories.split(',');
  const signups = event.signups.split(',').map(Number);
  
  // Update signups in database per category
  for (let i = 0; i < categories.length; i++) {
    await supabase.upsertEventSignup({
      event_id: eventId,
      category: categories[i],
      count: signups[i] || 0,
      updated_at: new Date(),
    });
  }
}
```

### UI Update
```tsx
<div className="text-sm text-gray-500">
  <Clock className="inline w-4 h-4" />
  Signups: {totalSignups} 
  <span className="ml-2 text-xs">
    (last synced {timeAgo(lastSync)})
  </span>
</div>
```

**Timeline:** Implement in current session
**Risk:** Low - Uses existing infrastructure
**Impact:** Reduces (but doesn't eliminate) discrepancy
