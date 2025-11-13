# ZwiftRacing API - Events Endpoints

## ✅ SOLUTION FOUND: Upcoming Events Available!

**Date**: 2025-11-12  
**Status**: RESOLVED

### Correct Endpoint

```bash
GET https://zwift-ranking.herokuapp.com/api/events/upcoming
```

Returns **800+ future Zwift events** ✅

---

## Implementation

```typescript
// zwift-client.ts
async getUpcomingEvents(): Promise<ZwiftEvent[]> {
  const response = await this.client.get('/api/events/upcoming');
  return Array.isArray(response.data) ? response.data : [];
}

async getEvents48Hours(): Promise<ZwiftEvent[]> {
  const allEvents = await this.getUpcomingEvents();
  const now = Math.floor(Date.now() / 1000);
  const in48Hours = now + (48 * 60 * 60);
  
  return allEvents.filter(e => e.time >= now && e.time <= in48Hours);
}
```

---

## User Stories - RESOLVED

| US | Status | Endpoint |
|----|--------|----------|
| US1: Upcoming events | ✅ SOLVED | `/api/events/upcoming` |
| US2: Team highlights | ✅ POSSIBLE | Match signups |
| US3: Rider counts | ✅ POSSIBLE | Parse signups |
| US4: Race results | ✅ POSSIBLE | `/api/events` (past) |

**Conclusion**: Feature 1 fully functional with real data! 🚀
