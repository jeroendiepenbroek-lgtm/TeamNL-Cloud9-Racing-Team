# Data Architectuur - Alle Beschikbare APIs

**Documentatie Datum**: 26 November 2025  
**Test Rider**: 150437 (JRøne | CloudRacer-9 @YouTube)

---

## 📊 API Overzicht

### Beschikbare Data Bronnen

| API | Base URL | Authenticatie | Rate Limit | Status |
|-----|----------|---------------|------------|--------|
| **ZwiftRacing.app** | `https://zwift-ranking.herokuapp.com/api` | None (Public) | Onbekend | ✅ Actief |
| **ZwiftPower** | Via Python library `zpdatafetch` | Username + Password (Keyring) | Onbekend | ✅ Actief |
| **Zwift.com** | `https://us-or-rly101.zwift.com/api` | OAuth Token | Onbekend | ✅ Actief |

---

## 1️⃣ ZwiftRacing.app API

### Endpoints

#### **GET /api/riders/:riderId**
Volledige rider profiel inclusief recente results en achievements.

**Voorbeeld Response** (Rider 150437):

```json
{
  "riderId": 150437,
  "name": "JRøne | CloudRacer-9 @YouTube",
  "teamId": "2281",
  "teamName": "TeamNL",
  "country": "nl",
  "age": "Vet",
  "male": true,
  "ftp": 267,
  "weight": 74,
  "height": 183,
  "category": "C",
  "zPoints": 4065.2,
  "rating": 1448.31,
  "totalRaces": 424,
  "totalDistance": 8896.72,
  "totalElevation": 76682,
  "totalTime": 14883292,
  "latestResult": {
    "_id": "68b9c85e8e2ff55618efefa5",
    "event": {
      "id": "5131733",
      "time": 1756983300,
      "title": "Club Ladder // TeamNL Cloud9 Spark v Team Not Pogi Vuelta",
      "type": "Race",
      "subType": "Scratch",
      "distance": 20,
      "elevation": 141,
      "resultsFinalized": true,
      "route": {
        "routeId": "1099226581",
        "world": "Makuri Islands",
        "name": "Big Loop",
        "profile": "Rolling"
      }
    },
    "riderId": 150437,
    "source": "Fit",
    "time": 1754.956,
    "timeGun": 1754.956,
    "gap": 10.738,
    "position": 7,
    "positionInCategory": 7,
    "points": null,
    "avgSpeed": 41.0382,
    "wkgAvg": 3.0946,
    "wkg5": 8.3784,
    "wkg15": 6.9459,
    "wkg30": 6.0541,
    "wkg60": 4.8649,
    "wkg120": 4.1622,
    "wkg300": 3.473,
    "wkg1200": 3.1081,
    "np": 260,
    "ftp": 263,
    "zpCat": "B",
    "load": 50.80823569893908,
    "heartRate": {
      "avg": 159,
      "max": 178
    },
    "eventRating": 1463.6619862518158,
    "rating": 1448.3085881383713,
    "ratingBefore": 1449.6347471786353,
    "ratingDelta": -1.3261590402638685,
    "rankPoints": 106.54881640854518,
    "penTotal": 16,
    "penTimeCut": 1971.5928
  },
  "achievements": [
    {
      "achievement": {
        "_id": "64d2fcacfaa9aa90ef48907b",
        "category": "World",
        "name": "Visit Paris",
        "description": "Finish any Event in Paris",
        "value": 5
      },
      "event": {
        "eventId": "5007626",
        "time": 1749289500,
        "title": "Tiny Race (4 of 4) by Zwift Insider"
      },
      "time": 1749289500
    }
  ],
  "visibility": "public",
  "ranks": {
    "overall": {
      "rank": 7923,
      "total": 19157
    },
    "category": {
      "rank": 266,
      "total": 2269
    },
    "age": {
      "rank": 2558,
      "total": 6565
    },
    "achievements": {
      "rank": 2400,
      "total": 19155
    }
  }
}
```

**Beschikbare Velden**:

| Veld | Type | Beschrijving | Voorbeeld |
|------|------|--------------|-----------|
| `riderId` | Number | Zwift Rider ID | 150437 |
| `name` | String | Display naam in races | "JRøne | CloudRacer-9 @YouTube" |
| `teamId` | String | Team ID | "2281" |
| `teamName` | String | Team naam | "TeamNL" |
| `country` | String | Land code (ISO 2) | "nl" |
| `age` | String | Age category | "Vet" |
| `male` | Boolean | Gender | true |
| `ftp` | Number | Functional Threshold Power | 267 |
| `weight` | Number | Weight (kg) | 74 |
| `height` | Number | Height (cm) | 183 |
| `category` | String | ZwiftRacing Category | "C" |
| `zPoints` | Number | ZwiftRacing Points | 4065.2 |
| `rating` | Number | Current vELO rating | 1448.31 |
| `totalRaces` | Number | Totaal aantal races | 424 |
| `totalDistance` | Number | Totaal gereden km | 8896.72 |
| `totalElevation` | Number | Totaal hoogtemeters | 76682 |
| `totalTime` | Number | Totaal race tijd (seconden) | 14883292 |
| `latestResult` | Object | Laatste race resultaat | {...} |
| `latestResult.event.id` | String | Event ID | "5131733" |
| `latestResult.event.time` | Number | Unix timestamp | 1756983300 |
| `latestResult.event.title` | String | Event titel | "Club Ladder..." |
| `latestResult.event.type` | String | Event type | "Race" |
| `latestResult.event.subType` | String | Race subtype | "Scratch" |
| `latestResult.event.distance` | Number | Route afstand (km) | 20 |
| `latestResult.event.elevation` | Number | Route hoogtemeters | 141 |
| `latestResult.event.resultsFinalized` | Boolean | Results definitief? | true |
| `latestResult.event.route.routeId` | String | Route ID | "1099226581" |
| `latestResult.event.route.world` | String | Wereld naam | "Makuri Islands" |
| `latestResult.event.route.name` | String | Route naam | "Big Loop" |
| `latestResult.event.route.profile` | String | Route profiel | "Rolling" |
| `latestResult.source` | String | Data source | "Fit" |
| `latestResult.time` | Number | Finish tijd (seconden) | 1754.956 |
| `latestResult.timeGun` | Number | Gun tijd (seconden) | 1754.956 |
| `latestResult.gap` | Number | Gap met winnaar (seconden) | 10.738 |
| `latestResult.position` | Number | Overall positie | 7 |
| `latestResult.positionInCategory` | Number | Positie in category | 7 |
| `latestResult.points` | Number/Null | Sprint points (Points race) | null |
| `latestResult.avgSpeed` | Number | Gemiddelde snelheid (km/h) | 41.04 |
| `latestResult.wkgAvg` | Number | Gemiddelde W/kg | 3.09 |
| `latestResult.wkg5` | Number | 5s max W/kg | 8.38 |
| `latestResult.wkg15` | Number | 15s max W/kg | 6.95 |
| `latestResult.wkg30` | Number | 30s max W/kg | 6.05 |
| `latestResult.wkg60` | Number | 1min max W/kg | 4.86 |
| `latestResult.wkg120` | Number | 2min max W/kg | 4.16 |
| `latestResult.wkg300` | Number | 5min max W/kg | 3.47 |
| `latestResult.wkg1200` | Number | 20min max W/kg | 3.11 |
| `latestResult.np` | Number | Normalized Power | 260 |
| `latestResult.ftp` | Number | FTP tijdens race | 263 |
| `latestResult.zpCat` | String | ZwiftPower category | "B" |
| `latestResult.load` | Number | Training load | 50.81 |
| `latestResult.heartRate.avg` | Number | Gem. hartslag | 159 |
| `latestResult.heartRate.max` | Number | Max hartslag | 178 |
| `latestResult.eventRating` | Number | Event vELO rating | 1463.66 |
| `latestResult.rating` | Number | Rider rating na race | 1448.31 |
| `latestResult.ratingBefore` | Number | Rating voor race | 1449.63 |
| `latestResult.ratingDelta` | Number | Rating verandering | -1.33 |
| `latestResult.rankPoints` | Number | Rank points behaald | 106.55 |
| `latestResult.penTotal` | Number | Totale penalty (%) | 16 |
| `latestResult.penTimeCut` | Number | Time cut limiet | 1971.59 |
| `achievements` | Array | Behaalde achievements | [...] |
| `achievements[].achievement._id` | String | Achievement ID | "64d2fcac..." |
| `achievements[].achievement.category` | String | Category | "World" |
| `achievements[].achievement.name` | String | Achievement naam | "Visit Paris" |
| `achievements[].achievement.description` | String | Beschrijving | "Finish any Event in Paris" |
| `achievements[].achievement.value` | Number | Punten waarde | 5 |
| `achievements[].event.eventId` | String | Event waar behaald | "5007626" |
| `achievements[].event.time` | Number | Timestamp | 1749289500 |
| `achievements[].event.title` | String | Event titel | "Tiny Race..." |
| `ranks.overall.rank` | Number | Overall ranking | 7923 |
| `ranks.overall.total` | Number | Totaal riders | 19157 |
| `ranks.category.rank` | Number | Category ranking | 266 |
| `ranks.category.total` | Number | Totaal in category | 2269 |
| `ranks.age.rank` | Number | Age group ranking | 2558 |
| `ranks.age.total` | Number | Totaal in age group | 6565 |
| `ranks.achievements.rank` | Number | Achievement ranking | 2400 |
| `ranks.achievements.total` | Number | Totaal riders | 19155 |

**Totaal**: 75+ unieke velden

---

#### **GET /api/riders/:riderId/results**
Volledige race history met alle resultaten.

**Query Parameters**:
- `limit`: Aantal results (default: all)
- `skip`: Offset voor paginering

**Response**: Array van result objecten (zelfde structuur als `latestResult` hierboven)

---

#### **GET /api/events/:eventId**
Volledige event details inclusief alle resultaten.

**Status**: Helaas niet altijd beschikbaar (event 5131733 not found, event 5087516 wel maar minimale data)

---

## 2️⃣ ZwiftPower API (via zpdatafetch)

### Python Script: `zp_robust_fetch.py`

**Beschikbare Data**:

```json
{
  "zwift_id": 150437,
  "name": "JRøne | CloudRacer-9 @YouTube",
  "ftp": 234,
  "weight_kg": 74,
  "wkg": 3.16,
  "calculated_category": "C",
  "gender": "male",
  "zp_category": "B",
  "power_curve": {
    "w5": 502,
    "w15": 420,
    "w30": 372,
    "w60": 319,
    "w120": 263,
    "w300": 232,
    "w1200": 208
  },
  "wkg_curve": {
    "wkg5": 6.78,
    "wkg15": 5.68,
    "wkg30": 5.03,
    "wkg60": 4.31,
    "wkg120": 3.55,
    "wkg300": 3.14,
    "wkg1200": 2.81
  },
  "team": {
    "name": "TeamNL",
    "tag": null
  },
  "race_count": 424,
  "recent_races": [
    {
      "position": 7,
      "name": "JRone | CloudRacer-9 @YouTube",
      "cp": "Watopia",
      "flag": "nl",
      "t": "2065",
      "lag": 10.738,
      "uid": "150437",
      "time_gun": "2095.7380000000003",
      "avg_hr": 159,
      "max_hr": 178,
      "avg_power": "229",
      "np": "260",
      "max_power": 620,
      "weight": "74.0",
      "height": "183",
      "source": 3,
      "w1200": "258",
      "w300": "268",
      "w120": "324",
      "w60": "358",
      "w30": "416",
      "w15": "437",
      "w5": "694",
      "event_title": "Club Ladder // TeamNL Cloud9 Spark v Team Not Pogi Vuelta",
      "distance": 20,
      "event_date": 1763665200
    }
  ]
}
```

**Beschikbare Velden**:

| Veld | Type | Beschrijving | Voorbeeld |
|------|------|--------------|-----------|
| `zwift_id` | Number | Zwift Rider ID | 150437 |
| `name` | String | Rider naam | "JRøne | CloudRacer-9 @YouTube" |
| `ftp` | Number | FTP (vaak ouder dan Zwift.com) | 234 |
| `weight_kg` | Number | Weight (kan afwijken van Zwift.com) | 74 |
| `wkg` | Number | W/kg ratio (ftp/weight) | 3.16 |
| `calculated_category` | String | Berekende category | "C" |
| `gender` | String | Gender | "male" |
| `zp_category` | String | ZwiftPower officiële category | "B" |
| `power_curve.w5` | Number | 5s max power | 502 |
| `power_curve.w15` | Number | 15s max power | 420 |
| `power_curve.w30` | Number | 30s max power | 372 |
| `power_curve.w60` | Number | 1min max power | 319 |
| `power_curve.w120` | Number | 2min max power | 263 |
| `power_curve.w300` | Number | 5min max power | 232 |
| `power_curve.w1200` | Number | 20min max power | 208 |
| `wkg_curve.wkg5` | Number | 5s max W/kg | 6.78 |
| `wkg_curve.wkg15` | Number | 15s max W/kg | 5.68 |
| `wkg_curve.wkg30` | Number | 30s max W/kg | 5.03 |
| `wkg_curve.wkg60` | Number | 1min max W/kg | 4.31 |
| `wkg_curve.wkg120` | Number | 2min max W/kg | 3.55 |
| `wkg_curve.wkg300` | Number | 5min max W/kg | 3.14 |
| `wkg_curve.wkg1200` | Number | 20min max W/kg | 2.81 |
| `team.name` | String | Team naam | "TeamNL" |
| `team.tag` | String/Null | Team tag | null |
| `race_count` | Number | Totaal aantal races | 424 |
| `recent_races` | Array | Recente races | [...] |
| `recent_races[].position` | Number | Finish positie | 7 |
| `recent_races[].cp` | String | Checkpoint/World | "Watopia" |
| `recent_races[].flag` | String | Land code | "nl" |
| `recent_races[].t` | String | Finish tijd (string!) | "2065" |
| `recent_races[].lag` | Number | Gap met winnaar | 10.738 |
| `recent_races[].uid` | String | User ID | "150437" |
| `recent_races[].time_gun` | String | Gun tijd | "2095.738..." |
| `recent_races[].avg_hr` | Number | Gem. hartslag | 159 |
| `recent_races[].max_hr` | Number | Max hartslag | 178 |
| `recent_races[].avg_power` | String | Gem. power | "229" |
| `recent_races[].np` | String | Normalized Power | "260" |
| `recent_races[].max_power` | Number | Max power | 620 |
| `recent_races[].weight` | String | Weight tijdens race | "74.0" |
| `recent_races[].height` | String | Height | "183" |
| `recent_races[].source` | Number | Data source | 3 |
| `recent_races[].w1200` | String | 20min power | "258" |
| `recent_races[].w300` | String | 5min power | "268" |
| `recent_races[].w120` | String | 2min power | "324" |
| `recent_races[].w60` | String | 1min power | "358" |
| `recent_races[].w30` | String | 30s power | "416" |
| `recent_races[].w15` | String | 15s power | "437" |
| `recent_races[].w5` | String | 5s power | "694" |
| `recent_races[].event_title` | String | Event titel | "Club Ladder..." |
| `recent_races[].distance` | Number | Afstand (km) | 20 |
| `recent_races[].event_date` | Number | Unix timestamp | 1763665200 |

**Totaal**: 40+ unieke velden

**⚠️ Let Op**: Veel velden zijn strings die numbers bevatten!

---

## 3️⃣ Zwift.com API (OAuth)

### Python Script: `zwift_direct.py`

**Endpoint**: `https://us-or-rly101.zwift.com/api/profiles/:riderId`

**Authenticatie**: OAuth Bearer Token (via password grant flow)

**Voorbeeld Response** (Rider 150437):

```json
{
  "success": true,
  "source": "zwift.com",
  "endpoint": "https://us-or-rly101.zwift.com/api/profiles/150437",
  "data": {
    "id": 150437,
    "publicId": "8f8f4855-6aca-46f7-81c4-3772515036d6",
    "firstName": "JRøne ",
    "lastName": "CloudRacer-9 @YT (TeamNL)",
    "male": true,
    "eventCategory": "MALE",
    "imageSrc": "https://static-cdn.zwift.com/prod/profile/77e705da-94066",
    "imageSrcLarge": "https://static-cdn.zwift.com/prod/profile/77e705da-94066",
    "playerType": "NORMAL",
    "countryAlpha3": "nld",
    "countryCode": 528,
    "useMetric": true,
    "riding": false,
    "privacy": {
      "approvalRequired": true,
      "displayWeight": false,
      "minor": false,
      "privateMessaging": true,
      "defaultFitnessDataPrivacy": false,
      "suppressFollowerNotification": false,
      "displayAge": false,
      "defaultActivityPrivacy": "PUBLIC"
    },
    "socialFacts": {
      "profileId": 150437,
      "followersCount": 4261,
      "followeesCount": 132,
      "followeesInCommonWithLoggedInPlayer": 0,
      "followerStatusOfLoggedInPlayer": "SELF",
      "followeeStatusOfLoggedInPlayer": "SELF",
      "isFavoriteOfLoggedInPlayer": false
    },
    "worldId": null,
    "enrolledZwiftAcademy": false,
    "playerTypeId": 1,
    "playerSubTypeId": null,
    "currentActivityId": null,
    "likelyInGame": false,
    "age": 46,
    "bodyType": 4178,
    "connectedToStrava": true,
    "connectedToTrainingPeaks": false,
    "connectedToTodaysPlan": false,
    "connectedToUnderArmour": false,
    "connectedToWithings": false,
    "connectedToFitbit": false,
    "connectedToGarmin": false,
    "connectedToWahoo": true,
    "connectedToRuntastic": false,
    "connectedToZwiftPower": true,
    "stravaPremium": true,
    "height": 1830,
    "weight": 74000,
    "ftp": 246,
    "createdOn": "2016-07-29T15:38:56.855+0000",
    "launchedGameClient": "08/22/2016 17:59:32 +0000",
    "runTime1miInSeconds": 644,
    "runTime5kmInSeconds": 2118,
    "runTime10kmInSeconds": 4500,
    "runTimeHalfMarathonInSeconds": 10127,
    "runTimeFullMarathonInSeconds": 21700,
    "achievementLevel": 10000,
    "totalDistance": 38001576,
    "totalDistanceClimbed": 350127,
    "totalTimeInMinutes": 71441,
    "totalInKomJersey": 0,
    "totalInSprintersJersey": 0,
    "totalInOrangeJersey": 0,
    "totalWattHours": 234620,
    "totalExperiencePoints": 887000,
    "targetExperiencePoints": 993870,
    "totalGold": 22121785,
    "runAchievementLevel": 100,
    "totalRunDistance": 0,
    "totalRunTimeInMinutes": 0,
    "totalRunExperiencePoints": 0,
    "targetRunExperiencePoints": 0,
    "totalRunCalories": 0,
    "powerSourceType": "Power Source",
    "powerSourceModel": "Smart Trainer",
    "virtualBikeModel": "Zwift Concept",
    "streaksCurrentLength": 69,
    "streaksMaxLength": 69,
    "streaksLastRideTimestamp": "2025-11-24T10:36:36.000+0000",
    "competitionMetrics": {
      "racingScore": 554.0,
      "category": "C",
      "categoryWomen": "E"
    },
    "totalWattHoursPerKg": 1195.7289,
    "profilePropertyChanges": [
      {
        "propertyName": "DATE_OF_BIRTH",
        "changeCount": 0,
        "maxChanges": 3
      },
      {
        "propertyName": "GENDER",
        "changeCount": 0,
        "maxChanges": 3
      }
    ]
  }
}
```

**Beschikbare Velden**:

| Veld | Type | Beschrijving | Voorbeeld |
|------|------|--------------|-----------|
| `id` | Number | Zwift Rider ID | 150437 |
| `publicId` | String | Public UUID | "8f8f4855-..." |
| `firstName` | String | Voornaam | "JRøne " |
| `lastName` | String | Achternaam | "CloudRacer-9 @YT (TeamNL)" |
| `male` | Boolean | Gender | true |
| `eventCategory` | String | Event category | "MALE" |
| `imageSrc` | String | Profiel foto URL | "https://..." |
| `imageSrcLarge` | String | Grote profiel foto URL | "https://..." |
| `playerType` | String | Player type | "NORMAL" |
| `countryAlpha3` | String | Land code (ISO 3) | "nld" |
| `countryCode` | Number | Land code (numeric) | 528 |
| `useMetric` | Boolean | Gebruikt metric? | true |
| `riding` | Boolean | Nu aan het rijden? | false |
| `privacy.approvalRequired` | Boolean | Follow approval vereist? | true |
| `privacy.displayWeight` | Boolean | Weight tonen? | false |
| `privacy.minor` | Boolean | Is minderjarig? | false |
| `privacy.privateMessaging` | Boolean | Private messaging? | true |
| `privacy.defaultFitnessDataPrivacy` | Boolean | Fitness data privé? | false |
| `privacy.suppressFollowerNotification` | Boolean | Follower notificaties uit? | false |
| `privacy.displayAge` | Boolean | Age tonen? | false |
| `privacy.defaultActivityPrivacy` | String | Activity privacy | "PUBLIC" |
| `socialFacts.profileId` | Number | Profile ID | 150437 |
| `socialFacts.followersCount` | Number | Aantal followers | 4261 |
| `socialFacts.followeesCount` | Number | Aantal following | 132 |
| `socialFacts.followeesInCommonWithLoggedInPlayer` | Number | Gemeenschappelijke following | 0 |
| `socialFacts.followerStatusOfLoggedInPlayer` | String | Follow status | "SELF" |
| `socialFacts.followeeStatusOfLoggedInPlayer` | String | Following status | "SELF" |
| `socialFacts.isFavoriteOfLoggedInPlayer` | Boolean | Is favoriet? | false |
| `worldId` | Number/Null | Huidige wereld ID | null |
| `enrolledZwiftAcademy` | Boolean | Zwift Academy? | false |
| `playerTypeId` | Number | Player type ID | 1 |
| `playerSubTypeId` | Number/Null | Player subtype ID | null |
| `currentActivityId` | Number/Null | Huidige activity ID | null |
| `likelyInGame` | Boolean | Waarschijnlijk in game? | false |
| `age` | Number | Leeftijd | 46 |
| `bodyType` | Number | Body type code | 4178 |
| `connectedToStrava` | Boolean | Strava verbonden? | true |
| `connectedToTrainingPeaks` | Boolean | TrainingPeaks verbonden? | false |
| `connectedToTodaysPlan` | Boolean | TodaysPlan verbonden? | false |
| `connectedToUnderArmour` | Boolean | UnderArmour verbonden? | false |
| `connectedToWithings` | Boolean | Withings verbonden? | false |
| `connectedToFitbit` | Boolean | Fitbit verbonden? | false |
| `connectedToGarmin` | Boolean | Garmin verbonden? | false |
| `connectedToWahoo` | Boolean | Wahoo verbonden? | true |
| `connectedToRuntastic` | Boolean | Runtastic verbonden? | false |
| `connectedToZwiftPower` | Boolean | ZwiftPower verbonden? | true |
| `stravaPremium` | Boolean | Strava Premium? | true |
| `height` | Number | Height (mm) | 1830 |
| `weight` | Number | Weight (gram) | 74000 |
| `ftp` | Number | **FTP (actueel!)** | **246** |
| `createdOn` | String | Account aangemaakt | "2016-07-29T15:38:56.855+0000" |
| `launchedGameClient` | String | Laatste game launch | "08/22/2016 17:59:32 +0000" |
| `runTime1miInSeconds` | Number | 1 mijl run tijd | 644 |
| `runTime5kmInSeconds` | Number | 5km run tijd | 2118 |
| `runTime10kmInSeconds` | Number | 10km run tijd | 4500 |
| `runTimeHalfMarathonInSeconds` | Number | Half marathon tijd | 10127 |
| `runTimeFullMarathonInSeconds` | Number | Marathon tijd | 21700 |
| `achievementLevel` | Number | Achievement level | 10000 |
| `totalDistance` | Number | **Totaal afstand (meter)** | **38001576** |
| `totalDistanceClimbed` | Number | Totaal hoogte (meter) | 350127 |
| `totalTimeInMinutes` | Number | **Totaal tijd (minuten)** | **71441** |
| `totalInKomJersey` | Number | Tijd in KOM jersey | 0 |
| `totalInSprintersJersey` | Number | Tijd in Sprint jersey | 0 |
| `totalInOrangeJersey` | Number | Tijd in Orange jersey | 0 |
| `totalWattHours` | Number | Totaal watt hours | 234620 |
| `totalExperiencePoints` | Number | Totaal XP | 887000 |
| `targetExperiencePoints` | Number | Target XP voor volgend level | 993870 |
| `totalGold` | Number | Totaal drops | 22121785 |
| `runAchievementLevel` | Number | Run achievement level | 100 |
| `totalRunDistance` | Number | Totaal run afstand | 0 |
| `totalRunTimeInMinutes` | Number | Totaal run tijd | 0 |
| `totalRunExperiencePoints` | Number | Run XP | 0 |
| `targetRunExperiencePoints` | Number | Target run XP | 0 |
| `totalRunCalories` | Number | Run calorieën | 0 |
| `powerSourceType` | String | Power source type | "Power Source" |
| `powerSourceModel` | String | Power meter model | "Smart Trainer" |
| `virtualBikeModel` | String | Virtuele fiets | "Zwift Concept" |
| `streaksCurrentLength` | Number | **Huidige streak** | **69** |
| `streaksMaxLength` | Number | Langste streak | 69 |
| `streaksLastRideTimestamp` | String | Laatste ride timestamp | "2025-11-24T10:36:36.000+0000" |
| `competitionMetrics.racingScore` | Number | **Racing Score (ZRS)** | **554.0** |
| `competitionMetrics.category` | String | **Officiële Category** | **"C"** |
| `competitionMetrics.categoryWomen` | String | Category women | "E" |
| `totalWattHoursPerKg` | Number | Totaal watt hours per kg | 1195.73 |
| `profilePropertyChanges` | Array | Property change tracking | [...] |
| `profilePropertyChanges[].propertyName` | String | Property naam | "DATE_OF_BIRTH" |
| `profilePropertyChanges[].changeCount` | Number | Aantal wijzigingen | 0 |
| `profilePropertyChanges[].maxChanges` | Number | Max wijzigingen | 3 |

**Totaal**: 80+ unieke velden

**🔥 Unieke Zwift.com Data**:
- ✅ **Meest actuele FTP** (246W vs 234W/267W)
- ✅ **Racing Score** (554.0)
- ✅ **Officiële Category** (C)
- ✅ **Current Streak** (69 dagen!)
- ✅ **Social metrics** (4261 followers)
- ✅ **Connected services** (Strava Premium, Wahoo)
- ✅ **Total lifetime stats** (38,001 km, 71,441 minuten)

---

## 🔄 Data Vergelijking - Rider 150437

| Metric | ZwiftRacing.app | ZwiftPower | Zwift.com | **Beste Bron** |
|--------|----------------|------------|-----------|----------------|
| **FTP** | 267 | 234 | **246** ✅ | **Zwift.com** (actueel) |
| **Weight** | 74 kg | 74 kg | 74 kg | Alle gelijk |
| **W/kg** | - | 3.16 | 3.32 | Zwift.com (246/74) |
| **Category** | C | B (ZP) / C (calc) | **C** ✅ | **Zwift.com** (officieel) |
| **Racing Score** | 1448.31 (vELO) | - | **554.0 (ZRS)** ✅ | **Zwift.com** |
| **Total Races** | **424** ✅ | **424** ✅ | - | ZwiftRacing/ZwiftPower |
| **Race History** | **✅ Volledig** | **✅ Volledig** | ❌ Geen | ZwiftRacing/ZwiftPower |
| **Power Curve** | Per race | **✅ All-time best** | ❌ Geen | **ZwiftPower** |
| **Achievements** | **✅ 50+ achievements** | ❌ Geen | ❌ Geen | **ZwiftRacing** |
| **Rankings** | **✅ Overall/Cat/Age** | ❌ Geen | ❌ Geen | **ZwiftRacing** |
| **Total Distance** | 8,897 km (races) | - | **38,002 km (all)** ✅ | **Zwift.com** (lifetime) |
| **Current Streak** | ❌ Geen | ❌ Geen | **✅ 69 dagen** | **Zwift.com** |
| **Followers** | ❌ Geen | ❌ Geen | **✅ 4,261** | **Zwift.com** |

---

## 📋 Conclusie per API

### ZwiftRacing.app ⭐⭐⭐⭐⭐
**Sterke Punten**:
- ✅ Volledige race history met gedetailleerde metrics
- ✅ Achievements tracking
- ✅ Rankings (overall, category, age, achievements)
- ✅ Event details
- ✅ vELO rating systeem
- ✅ Geen authenticatie nodig

**Zwakke Punten**:
- ❌ FTP soms verouderd
- ❌ Geen lifetime statistics
- ❌ Geen social metrics

**Beste Voor**: Race results, achievements, rankings

---

### ZwiftPower ⭐⭐⭐⭐
**Sterke Punten**:
- ✅ All-time best power curve
- ✅ Volledige race history
- ✅ Actuele race weights
- ✅ Category berekening

**Zwakke Punten**:
- ❌ FTP kan verouderd zijn
- ❌ Authenticatie vereist
- ❌ Veel velden als strings
- ❌ Geen social metrics

**Beste Voor**: Power curve analysis, historic race data

---

### Zwift.com ⭐⭐⭐⭐⭐
**Sterke Punten**:
- ✅ **Meest actuele FTP**
- ✅ **Officiële Racing Score (ZRS)**
- ✅ **Officiële Category**
- ✅ Lifetime statistics (totale afstand, tijd)
- ✅ Current streak
- ✅ Social metrics (followers)
- ✅ Connected services info

**Zwakke Punten**:
- ❌ Geen race history
- ❌ Geen power curve
- ❌ OAuth authenticatie vereist

**Beste Voor**: Actuele profiel data, lifetime stats, social info

---

## 🎯 Aanbevolen Data Sourcing Strategie

### Voor Dashboard "Matrix" (Rider Overview)
| Veld | Bron | Reden |
|------|------|-------|
| FTP | **Zwift.com** | Meest actueel |
| Weight | Zwift.com | Actueel |
| Category | **Zwift.com** | Officieel |
| Racing Score | **Zwift.com** (ZRS) | Officieel systeem |
| Total Races | ZwiftRacing | Volledig |
| Recent Form | ZwiftRacing | Last 10 results |
| Power Curve | **ZwiftPower** | All-time bests |

### Voor Dashboard "Results" (Race History)
| Veld | Bron | Reden |
|------|------|-------|
| Race List | **ZwiftRacing** | Meest compleet |
| Race Details | ZwiftRacing | Alle metrics |
| Power Data | ZwiftRacing + ZwiftPower | Vergelijking |
| Rankings | ZwiftRacing | vELO + position |
| Heart Rate | ZwiftRacing | Beschikbaar |

### Voor Dashboard "Events" (Upcoming/Recent Events)
| Veld | Bron | Reden |
|------|------|-------|
| Event List | **ZwiftRacing** | Best beschikbaar |
| Event Details | ZwiftRacing | Route, distance, etc |
| Results | ZwiftRacing | Volledig |
| Signups | ? | Niet beschikbaar |

---

## 🔧 Implementatie Aanbevelingen

### 1. Data Sync Strategie
```typescript
// Priority order voor rider data:
1. Zwift.com API → FTP, Weight, Category, ZRS (ACTUEEL)
2. ZwiftPower → Power curve, race history backup
3. ZwiftRacing.app → Race results, achievements, rankings

// Update frequenties:
- Zwift.com: Bij login of max 1x per uur
- ZwiftPower: 1x per dag (power curve updates langzaam)
- ZwiftRacing: Na elke race (webhook?) of 4x per dag
```

### 2. Database Schema Aanpassingen
```sql
-- Riders tabel uitbreiden met Zwift.com data
ALTER TABLE riders ADD COLUMN zwift_racing_score DECIMAL(10,2);
ALTER TABLE riders ADD COLUMN zwift_category VARCHAR(2);
ALTER TABLE riders ADD COLUMN current_streak INTEGER;
ALTER TABLE riders ADD COLUMN followers_count INTEGER;
ALTER TABLE riders ADD COLUMN total_distance_meters BIGINT;
ALTER TABLE riders ADD COLUMN total_time_minutes INTEGER;
ALTER TABLE riders ADD COLUMN last_ride_timestamp TIMESTAMP;

-- Power curve tabel (ZwiftPower)
CREATE TABLE rider_power_curve (
  rider_id INTEGER PRIMARY KEY,
  w5 INTEGER,
  w15 INTEGER,
  w30 INTEGER,
  w60 INTEGER,
  w120 INTEGER,
  w300 INTEGER,
  w1200 INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Achievements tabel (ZwiftRacing)
CREATE TABLE rider_achievements (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER,
  achievement_id VARCHAR(50),
  achievement_name VARCHAR(255),
  achievement_category VARCHAR(50),
  achievement_description TEXT,
  achievement_value INTEGER,
  event_id VARCHAR(50),
  earned_at TIMESTAMP,
  FOREIGN KEY (rider_id) REFERENCES riders(zwift_id)
);
```

### 3. API Service Layer
```typescript
// backend/src/services/unified-rider.service.ts
class UnifiedRiderService {
  async getRiderData(zwiftId: number) {
    // Parallel fetch van alle APIs
    const [zwiftCom, zwiftRacing, zwiftPower] = await Promise.all([
      this.zwiftComService.getProfile(zwiftId),
      this.zwiftRacingService.getRider(zwiftId),
      this.zwiftPowerService.getRiderData(zwiftId)
    ]);

    // Merge met prioriteit
    return {
      // Actuele profiel data van Zwift.com
      ftp: zwiftCom.ftp,
      weight: zwiftCom.weight / 1000,
      category: zwiftCom.competitionMetrics.category,
      racingScore: zwiftCom.competitionMetrics.racingScore,
      
      // Power curve van ZwiftPower
      powerCurve: zwiftPower.power_curve,
      
      // Race history van ZwiftRacing
      raceHistory: zwiftRacing.latestResult,
      totalRaces: zwiftRacing.totalRaces,
      achievements: zwiftRacing.achievements,
      rankings: zwiftRacing.ranks
    };
  }
}
```

---

**Einde Documentatie**
