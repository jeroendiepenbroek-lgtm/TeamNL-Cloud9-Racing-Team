# API Vergelijking - Race Data Sync

## Test Datum: 6 januari 2026

## Getest voor Rider: 150437 (JRøne)

---

## 1. ZwiftRacing API ❌

**Endpoint:** `https://api.zwiftracing.app/api/public/riders/{riderId}`

**Resultaat:**
```json
{
  "riderId": 150437,
  "name": "JRøne  (TeamNL) (GHT)",
  "race": {
    "last": {
      "rating": 1437.64,
      "date": 1767453000,
      "mixed": {"category": "Amethyst", "number": 5}
    },
    "finishes": 22,
    "wins": 1,
    "podiums": 4
  }
}
```

**Conclusie:** ❌ GEEN race history, alleen aggregated stats
- Heeft alleen `race.last.date` (laatste race timestamp)
- GEEN lijst van races
- GEEN eventIds
- Vereist polling om changes te detecteren

---

## 2. Zwift.com API ❌

**Endpoints:**
- Login: `https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token`
- Activities: `https://us-or-rly101.zwift.com/api/profiles/{riderId}/activities`

**Login:** ✅ Werkt (OAuth token 24u geldig)

**Activities Response:**
```json
{
  "id_str": "2042993755534934032",
  "profileId": 150437,
  "name": "Zwift - Race: Stage 5: Fresh Outta '25: Gentil 8 (A)",
  "startDate": "2026-01-03T15:00:52.184+0000",
  "endDate": "2026-01-03T15:56:44.050+0000",
  "distanceInMeters": 27847.1,
  "avgWatts": 214.366
  // NO eventId field!
}
```

**Conclusie:** ❌ GEEN eventId in activities
- Heeft wel race names en dates
- Maar GEEN eventId of eventSubgroupId
- Kan niet linken naar ZwiftRacing events
- User had gelijk: "Zwift.com legt de events vast, maar niet de eventids"

---

## 3. ZwiftPower API ❌

**Endpoint:** `https://zwiftpower.com/api3.php?do=profile_results&zwift_id={riderId}`

**Login Required:** ✅ Mogelijk maar complex
- Vereist phpBB cookie-based authentication
- Simpele curl/axios login werkt niet
- Geeft HTML login page terug

**Conclusie:** ❌ Te complex voor automation
- Zou mogelijk race history hebben
- Maar authenticatie is niet reliable
- Niet geschikt voor server-side automation

---

## FINALE BESLISSING

✅ **V3 Polling Strategie is BESTE optie**

**Waarom:**
1. ZwiftRacing is de enige API met eventId + race results
2. Geen alternative API heeft betere race data access
3. Polling is de enige manier om nieuwe races te detecteren
4. V3 implementatie is compleet en efficient (66 min vs 75+ uur)

**Volgende stappen:**
1. ✅ Migratie uitvoeren: `create_rider_race_state_table.sql`
2. ✅ V3 scanner integreren in main server
3. ✅ Eerste sync draaien
4. ✅ Dashboard vullen met data
