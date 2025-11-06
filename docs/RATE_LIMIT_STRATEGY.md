# Rate Limit Strategy - ZwiftRacing API

## Datum: 2025-11-06

## Probleem
ZwiftRacing API POST endpoint voor bulk riders (`/public/riders`) heeft strikte rate limiting:
- **POST /public/riders**: 1 call per 15 minuten (max 1000 riders per call)
- **GET /public/riders/:id**: 5 calls per minuut (single rider)

POST endpoint gaf "Unauthorized" errors, waarschijnlijk door rate limiting of authentication verschillen.

## Oplossing: Hybride Strategie

### Single Rider Add (POST /api/riders/team)
✅ **Gebruikt GET endpoint** (5/min rate)
- Snelle response voor individuele adds
- Geen rate limit problemen
- Immediate feedback voor gebruiker

### Bulk Import (POST /api/riders/team/bulk)
**Dynamische strategie op basis van aantal riders:**

#### Kleine imports (≤ 10 riders):
```typescript
// Gebruik GET calls (5/min rate)
for (const zwiftId of newRiderIds) {
  const rider = await zwiftClient.getRider(zwiftId);
  // Wait 12 sec tussen calls (5/min = 12s interval)
}
```
- **Voordeel**: Sneller voor kleine teams
- **Tijd**: ~2 minuten voor 10 riders
- **Geen POST rate limit issues**

#### Grote imports (> 10 riders):
```typescript
// Probeer POST bulk (1/15min rate, max 1000)
try {
  const riders = await zwiftClient.getBulkRiders(zwiftIds);
} catch (error) {
  // Fallback naar GET calls
  for (const zwiftId of zwiftIds) {
    const rider = await zwiftClient.getRider(zwiftId);
  }
}
```
- **Voordeel**: Efficient voor grote teams (100+ riders in 1 call)
- **Fallback**: Automatisch naar GET bij POST failure
- **Tijd**: Instant voor bulk, of ~20 min voor 100 riders via GET fallback

### Auto-Sync Service (cron job)
**Dynamische strategie op basis van team size:**

#### Kleine teams (≤ 10 riders):
```typescript
// Gebruik GET calls (geen rate limit issues)
for (const zwiftId of teamMemberIds) {
  const rider = await zwiftClient.getRider(zwiftId);
}
```
- Draait elke 6 uur (default)
- Geen POST rate limit zorgen

#### Grote teams (> 10 riders):
```typescript
// Probeer POST bulk eerst
try {
  const riders = await zwiftClient.getBulkRiders(teamMemberIds);
} catch (error) {
  // Fallback naar GET calls
}
```
- POST eenmaal per sync (15min rate OK voor 6-uur interval)
- Fallback verzekert dat sync altijd werkt

## Rate Limit Compliance

### GET Endpoint
- **Rate**: 5 calls per minuut
- **Wait tijd**: 12 seconden tussen calls
- **Max riders/uur**: 300 riders
- **Use cases**: Single add, kleine imports, sync fallback

### POST Endpoint  
- **Rate**: 1 call per 15 minuten
- **Max riders**: 1000 per call
- **Max riders/uur**: 4000 riders (4 calls)
- **Use cases**: Grote bulk imports, grote team syncs

## Implementatie Details

### Code Locaties
1. **Single add**: `backend/src/api/endpoints/riders.ts` - POST /api/riders/team
2. **Bulk import**: `backend/src/api/endpoints/riders.ts` - POST /api/riders/team/bulk
3. **Auto-sync**: `backend/src/services/auto-sync.service.ts` - syncTeamMembers()

### Threshold: 10 Riders
Gekozen omdat:
- GET: 10 riders = ~2 minuten (acceptabel voor user feedback)
- POST: Overhead van 15min rate limit niet waard voor < 10 riders
- Team size: TeamNL heeft ~15 riders → POST efficient
- Balans tussen snelheid en rate limit usage

### Error Handling
```typescript
try {
  // Probeer POST bulk
  const riders = await zwiftClient.getBulkRiders(ids);
} catch (error) {
  console.warn('POST failed, falling back to GET');
  // Fallback naar GET met rate limiting
  for (const id of ids) {
    const rider = await zwiftClient.getRider(id);
    await sleep(12000); // 5/min rate
  }
}
```

## Testing Checklist

- [x] Single rider add via GET werkt
- [ ] Bulk import < 10 riders via GET
- [ ] Bulk import > 10 riders via POST (met fallback)
- [ ] Auto-sync kleine team (GET strategie)
- [ ] Auto-sync grote team (POST + fallback)
- [ ] Rate limit errors loggen maar niet crashen

## Production Status

**Current State**: Geïmplementeerd maar niet getest
**Deployment**: Backend commit volgt
**Monitoring**: Check logs voor "POST failed, falling back to GET" messages

## Volgende Stappen

1. **Deploy** nieuwe code naar Railway
2. **Test** met user's ZwiftID (150437)
3. **Monitor** logs voor POST vs GET usage
4. **Adjust** threshold indien nodig (10 riders is educated guess)
5. **Document** real-world performance metrics

## Verwachte Resultaten

### User Experience
- **Single add**: < 5 seconden (GET is snel)
- **Bulk 5 riders**: ~1 minuut (GET calls)
- **Bulk 20 riders**: ~10 seconden (POST bulk) of ~4 min (GET fallback)
- **Auto-sync**: Transparant in background

### Rate Limit Safety
- GET: Max 5/min = never exceed limit met 12s waits
- POST: Max 1/15min = safe voor scheduled syncs
- Fallback: Verzekert dat alles blijft werken

## Referenties
- ZwiftRacing API docs: https://zwift-ranking.herokuapp.com
- Issue: POST /public/riders "Unauthorized" errors
- Solution: Hybride GET/POST strategie met intelligent thresholding
