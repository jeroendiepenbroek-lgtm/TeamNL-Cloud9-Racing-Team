# Zwift.com API Data voor Rider 150437

## Authenticatie
- **Username**: jeroen.diepenbroek@gmail.com
- **Method**: OAuth2 Password Grant
- **Endpoint**: `https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token`
- **Client ID**: `Zwift_Mobile_Link`
- **Token**: Bearer JWT (6 uur geldig)

## Profile Data
**Endpoint**: `GET https://us-or-rly101.zwift.com/api/profiles/150437`

```json
{
  "id": 150437,
  "firstName": "JRøne ",
  "lastName": "(TeamNL) (GHT)",
  "emailAddress": "jeroen.diepenbroek@gmail.com",
  "countryCode": 528,
  "age": 46,
  "weight": 74000,
  "height": 1830,
  "ftp": 248
}
```

**Gegevens**:
- Naam: JRøne (TeamNL) (GHT)
- Land: 528 (Nederland)
- Leeftijd: 46 jaar
- Gewicht: 74.0 kg
- Lengte: 183 cm
- FTP: 248W

## Activities Data
**Endpoint**: `GET https://us-or-rly101.zwift.com/api/profiles/150437/activities?start=0&limit=10`

### Recente Activities (Top 5):

1. **The Double Borough in New York**
   - Date: 2025-12-29 19:42
   - Distance: 4.7 km
   - Duration: 10 min
   - Avg Watts: 90W
   - Type: Regular ride

2. **Race: Club Ladder 12276 on Hot Laps in Watopia** ⭐
   - Date: 2025-12-29 18:52
   - Distance: 26.0 km  
   - Duration: 49 min
   - Avg Watts: 198W
   - Type: **RACE**
   - Activity ID: 2039486371072049200

3. **Race: HISP WINTER TOUR 2025 STAGE 2 (B) on Watts of the Wild** ⭐
   - Date: 2025-12-27 14:53
   - Distance: 44.8 km
   - Duration: 1:17
   - Avg Watts: 210W
   - Type: **RACE**

4. **Race: Club Ladder 12205 on Spirit Forest** ⭐
   - Date: 2025-12-22 18:48
   - Distance: 23.8 km
   - Duration: 59 min
   - Avg Watts: 219W
   - Type: **RACE**

5. **Race: Stage 3: Fresh Outta '25: Hell of the North (B)** ⭐
   - Date: 2025-12-20 12:08
   - Distance: 23.3 km
   - Duration: 38 min
   - Avg Watts: 216W
   - Type: **RACE**

### Activity Object Structure

Elke activity bevat:
```
{
  "id": number,
  "id_str": string,
  "profileId": 150437,
  "name": string,
  "startDate": ISO timestamp,
  "endDate": ISO timestamp,
  "duration": minutes,
  "distanceInMeters": number,
  "totalElevation": meters,
  "avgWatts": number,
  "calories": number,
  "sport": "CYCLING",
  "worldId": number (1=Watopia),
  "activityRideOnCount": number,
  "activityCommentCount": number,
  "fitFileBucket": "s3-fit-prd-uswest2-zwift",
  "fitFileKey": string,
  "profile": { ... }
}
```

## ❌ Wat NIET beschikbaar is in Zwift.com API

1. **Geen Event IDs** - `eventSubgroupId` is null voor alle races
2. **Geen Race Positions** - Geen finishpositie data
3. **Geen vELO Ratings** - Geen ZwiftRacing vELO info
4. **Geen Power Intervals** - Geen 5s/15s/30s/1m power data
5. **Geen Race Results** - Geen data over andere deelnemers
6. **Geen Category Info** - Geen A/B/C/D categorieën

## ✅ Wat WEL beschikbaar is

1. ✅ **Basic Profile** - Naam, land, leeftijd, gewicht, FTP
2. ✅ **Activity List** - Alle rides/races van de rider
3. ✅ **Activity Details** - Afstand, duur, avg watts, elevation
4. ✅ **FIT Files** - S3 bucket keys voor workout files
5. ✅ **Timestamps** - Exacte start/end tijden
6. ✅ **Ride-ons & Comments** - Social engagement data

## Vergelijking met ZwiftRacing.app API

| Feature | Zwift.com API | ZwiftRacing.app API |
|---------|---------------|---------------------|
| Profile Data | ✅ Basic | ✅ Extended (vELO, category) |
| Activity List | ✅ Yes | ❌ No |
| Race Results | ❌ No | ✅ Yes |
| Event IDs | ❌ No | ✅ Yes (via HTML scraping) |
| Race Positions | ❌ No | ✅ Yes |
| Power Intervals | ❌ No | ✅ Yes (5s-20m) |
| vELO Ratings | ❌ No | ✅ Yes |
| Race History | ❌ No | ✅ Yes (27 events) |
| Other Riders | ❌ No | ✅ Yes (all race participants) |

## Conclusie

**Zwift.com API** is nuttig voor:
- Basic rider profiel informatie
- Lijst van alle activities (rides + races)
- Workout statistieken (distance, watts, elevation)
- FIT file downloads

**ZwiftRacing.app API** is nodig voor:
- Race results en standings
- vELO ratings en rating changes
- Power curve data (5s tot 20m)
- Event IDs voor race lookups
- Complete race history met alle deelnemers

**Aanbeveling**: Gebruik **ZwiftRacing.app API** voor race data implementatie, omdat:
1. ✅ Heeft alle race-specifieke data
2. ✅ Event IDs beschikbaar via HTML scraping  
3. ✅ Complete race results met posities
4. ✅ Power intervals en vELO tracking
5. ✅ Geen OAuth nodig (alleen API token)

**Zwift.com API** kan eventueel gebruikt worden als aanvulling voor:
- FTP updates (vs ZwiftPower category)
- Activity timestamps voor sync
- FIT file downloads voor advanced analytics
