# ZwiftRacing API Limitations

## Critical Discovery: `/api/events` is a Results Endpoint

### Summary
The ZwiftRacing.app `/api/events` endpoint **does NOT return upcoming events** despite its name. It is a **results endpoint** that only returns events where results are already available (past events).

### Testing Evidence
```bash
# Test conducted: 2025-11-12 20:54 UTC
curl "https://zwift-ranking.herokuapp.com/api/events?from={now}&to={now+48h}&limit=50"

Results:
- Total events in database: 12,698
- Events returned: 25
- Future events (time > now): 0
- Past events: 25 (all within last 2 hours)
- Time parameters (from/to): IGNORED by API
```

### API Behavior

| Parameter | Expected Behavior | Actual Behavior |
|-----------|------------------|-----------------|
| `from` | Filter events starting after timestamp | **IGNORED** |
| `to` | Filter events ending before timestamp | **IGNORED** |
| `limit` | Max results to return | ✅ Works (default: 25) |
| `skip` | Pagination offset | ✅ Works |

**Event Sorting**: Descending by time (newest first)  
**Event Status**: All events have finished (results available)  
**Typical Age**: Last 1-2 hours

### Code Impact

#### Before (Incorrect Assumption)
```typescript
// ❌ This does NOT work as expected
const events = await zwiftClient.getEvents48Hours();
// Returns: [] (empty - no upcoming events)
```

#### After (Corrected Understanding)
```typescript
// ✅ Correct usage: Results endpoint
const pastEvents = await zwiftClient.getEventsWithResults({ limit: 100 });
// Returns: Recent events with results (past 1-2 hours)

// For results of specific event
const results = await zwiftClient.getEventResults(eventId);
```

### Available Endpoints

| Endpoint | Purpose | Returns Upcoming? | Works? |
|----------|---------|-------------------|--------|
| `GET /api/events` | **Results** (past events) | ❌ No | ✅ Yes |
| `GET /api/events/{id}` | Event details + participants | ❌ No | ✅ Yes |
| `GET /public/results/{id}` | Event results | ❌ No | ✅ Yes |
| `GET /public/clubs/{id}` | Club members | N/A | ✅ Yes |
| `GET /public/riders/{id}` | Rider profile | N/A | ✅ Yes |

**Missing**: No endpoint for upcoming events 😞

### Implications for Feature 1

**Original User Story (US1)**:
> "Als gebruiker wil ik een overzicht van de upcoming events van de komende 48 uur zien"

**Reality**:
- ZwiftRacing API cannot provide upcoming events
- Website (zwiftracing.app/events) likely uses different data source
- Options:
  1. ✅ **Use test data** for UI development (current approach)
  2. Web scraping (complex, fragile)
  3. Alternative API (Zwift.com official API - research needed)
  4. Pivot to results-focused dashboard instead

### Current Workaround

**Test Data Generation**:
```bash
npx tsx scripts/seed-test-events.ts
```

This creates 10 synthetic upcoming events (2h - 47h in future) for UI testing.

**Production Strategy**:
Until alternative event source is found, the Events page will show:
1. Manually seeded test events (for demonstration)
2. Or: Pivot to "Recent Results" instead of "Upcoming Events"

### References
- Test script: `scripts/test-zwift-api.ts`
- Seed script: `scripts/seed-test-events.ts`
- API client: `backend/src/api/zwift-client.ts`
- Discovery date: 2025-11-12

### Recommendations

1. **Short term**: Use test data for UI development ✅
2. **Medium term**: Research Zwift.com official API for upcoming events
3. **Long term**: Consider pivot to results-focused features (US4-US8)
4. **Documentation**: Update user stories to reflect API limitations

### Alternative Approaches

#### Option A: Results-First Dashboard
Focus on what API *can* do:
- Recent race results
- Rider performance tracking
- Team leaderboards
- Historical data analysis

#### Option B: Hybrid Approach
- **Results**: Real data from ZwiftRacing API ✅
- **Upcoming**: Manual calendar + test data 📅
- Clearly label which data is real vs. placeholder

#### Option C: External Integration
Investigate other data sources:
- Zwift Companion App API
- ZwiftPower (if different from ZwiftRacing)
- Community calendars (WTRL, ZRL, etc.)

---

**Status**: API limitation documented, workaround implemented  
**Next Steps**: Proceed with UI development using test data
