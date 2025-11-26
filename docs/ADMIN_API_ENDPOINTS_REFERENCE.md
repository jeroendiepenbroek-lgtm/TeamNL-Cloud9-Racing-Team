# Admin API Endpoints Reference

**Voor**: Admin interface - per endpoint overzicht van alle velden  
**Test Data**: Rider 150437 (JRøne | CloudRacer-9 @YouTube)  
**Datum**: 26 November 2025

---

## 📑 Inhoudsopgave

1. [ZwiftRacing.app API](#zwiftracing-app-api)
2. [ZwiftPower API](#zwiftpower-api)
3. [Zwift.com API](#zwiftcom-api)
4. [Aanbevolen Admin Tabellen](#aanbevolen-admin-tabellen)

---

## 🏁 ZwiftRacing.app API

Base URL: `https://zwift-ranking.herokuapp.com/api`

---

### Endpoint 1: GET `/riders/:riderId`

**Beschrijving**: Volledig rider profiel inclusief stats, recente results en achievements

**Request**:
```bash
curl "https://zwift-ranking.herokuapp.com/api/riders/150437"
```

**Response Structure**:

#### Tabel: Rider Profile (Root Level)

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `riderId` | Number | No | 150437 | Zwift Rider ID (Primary Key) |
| `name` | String | No | "JRøne \| CloudRacer-9 @YouTube" | Display naam |
| `teamId` | String | Yes | "2281" | Team ID |
| `teamName` | String | Yes | "TeamNL" | Team naam |
| `country` | String | No | "nl" | Land code (ISO 2) |
| `age` | String | No | "Vet" | Age category (Vet = Veteran) |
| `male` | Boolean | No | true | Gender (true = male, false = female) |
| `ftp` | Number | No | 267 | Functional Threshold Power (Watts) |
| `weight` | Number | No | 74 | Weight (kg) |
| `height` | Number | Yes | 183 | Height (cm) |
| `category` | String | No | "C" | ZwiftRacing category (A+, A, B, C, D, E) |
| `zPoints` | Number | No | 4065.2 | ZwiftRacing points |
| `rating` | Number | No | 1448.31 | Current vELO rating |
| `totalRaces` | Number | No | 424 | Totaal aantal gereden races |
| `totalDistance` | Number | No | 8896.72 | Totaal race afstand (km) |
| `totalElevation` | Number | No | 76682 | Totaal hoogtemeters |
| `totalTime` | Number | No | 14883292 | Totaal race tijd (seconden) |
| `visibility` | String | No | "public" | Profile visibility |

#### Tabel: Latest Result

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `latestResult._id` | String | No | "68b9c85e8e2ff55618efefa5" | Result MongoDB ID |
| `latestResult.riderId` | Number | No | 150437 | Rider ID (Foreign Key) |
| `latestResult.source` | String | No | "Fit" | Data source (Fit/Manual) |
| `latestResult.time` | Number | No | 1754.956 | Finish tijd (seconden) |
| `latestResult.timeGun` | Number | No | 1754.956 | Gun tijd (seconden) |
| `latestResult.gap` | Number | No | 10.738 | Gap met winnaar (seconden) |
| `latestResult.position` | Number | No | 7 | Overall positie |
| `latestResult.positionInCategory` | Number | No | 7 | Positie binnen category |
| `latestResult.points` | Number | Yes | null | Sprint points (Points race only) |
| `latestResult.avgSpeed` | Number | No | 41.04 | Gem. snelheid (km/h) |
| `latestResult.wkgAvg` | Number | No | 3.09 | Gem. W/kg gedurende race |
| `latestResult.wkg5` | Number | No | 8.38 | 5 sec max W/kg |
| `latestResult.wkg15` | Number | No | 6.95 | 15 sec max W/kg |
| `latestResult.wkg30` | Number | No | 6.05 | 30 sec max W/kg |
| `latestResult.wkg60` | Number | No | 4.86 | 1 min max W/kg |
| `latestResult.wkg120` | Number | No | 4.16 | 2 min max W/kg |
| `latestResult.wkg300` | Number | No | 3.47 | 5 min max W/kg |
| `latestResult.wkg1200` | Number | No | 3.11 | 20 min max W/kg |
| `latestResult.np` | Number | No | 260 | Normalized Power (Watts) |
| `latestResult.ftp` | Number | No | 263 | FTP tijdens race |
| `latestResult.zpCat` | String | No | "B" | ZwiftPower category |
| `latestResult.load` | Number | No | 50.81 | Training load score |
| `latestResult.heartRate.avg` | Number | Yes | 159 | Gem. hartslag (bpm) |
| `latestResult.heartRate.max` | Number | Yes | 178 | Max hartslag (bpm) |
| `latestResult.eventRating` | Number | No | 1463.66 | Event vELO rating |
| `latestResult.rating` | Number | No | 1448.31 | Rider rating na race |
| `latestResult.ratingBefore` | Number | No | 1449.63 | Rating voor race |
| `latestResult.ratingDelta` | Number | No | -1.33 | Rating verandering |
| `latestResult.rankPoints` | Number | No | 106.55 | Rank points behaald |
| `latestResult.penTotal` | Number | No | 16 | Totale penalty (%) |
| `latestResult.penTimeCut` | Number | No | 1971.59 | Time cut limiet (seconden) |

#### Tabel: Event (binnen Latest Result)

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `latestResult.event.id` | String | No | "5131733" | Event ID |
| `latestResult.event.time` | Number | No | 1756983300 | Event start (Unix timestamp) |
| `latestResult.event.title` | String | No | "Club Ladder // TeamNL..." | Event titel |
| `latestResult.event.type` | String | No | "Race" | Event type (Race/Workout/etc) |
| `latestResult.event.subType` | String | No | "Scratch" | Race subtype (Scratch/Points/TT/TTT) |
| `latestResult.event.distance` | Number | No | 20 | Route afstand (km) |
| `latestResult.event.elevation` | Number | No | 141 | Route hoogtemeters |
| `latestResult.event.resultsFinalized` | Boolean | No | true | Results finalized? |
| `latestResult.event.route.routeId` | String | No | "1099226581" | Route ID |
| `latestResult.event.route.world` | String | No | "Makuri Islands" | Wereld naam |
| `latestResult.event.route.name` | String | No | "Big Loop" | Route naam |
| `latestResult.event.route.profile` | String | No | "Rolling" | Route profiel (Flat/Rolling/Hilly/Mountain) |

#### Tabel: Achievements

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `achievements[].achievement._id` | String | No | "64d2fcacfaa9aa90ef48907b" | Achievement MongoDB ID |
| `achievements[].achievement.category` | String | No | "World" | Category (World/Points/vELO/Route Type/Race Type/General) |
| `achievements[].achievement.name` | String | No | "Visit Paris" | Achievement naam |
| `achievements[].achievement.description` | String | No | "Finish any Event in Paris" | Beschrijving |
| `achievements[].achievement.value` | Number | No | 5 | Punten waarde |
| `achievements[].event.eventId` | String | No | "5007626" | Event waar behaald |
| `achievements[].event.time` | Number | No | 1749289500 | Timestamp behaald |
| `achievements[].event.title` | String | No | "Tiny Race (4 of 4)..." | Event titel |
| `achievements[].time` | Number | No | 1749289500 | Timestamp (duplicate) |

#### Tabel: Rankings

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `ranks.overall.rank` | Number | No | 7923 | Overall ranking positie |
| `ranks.overall.total` | Number | No | 19157 | Totaal riders in ranking |
| `ranks.category.rank` | Number | No | 266 | Category ranking positie |
| `ranks.category.total` | Number | No | 2269 | Totaal riders in category |
| `ranks.age.rank` | Number | No | 2558 | Age group ranking positie |
| `ranks.age.total` | Number | No | 6565 | Totaal riders in age group |
| `ranks.achievements.rank` | Number | No | 2400 | Achievement ranking positie |
| `ranks.achievements.total` | Number | No | 19155 | Totaal riders met achievements |

---

### Endpoint 2: GET `/riders/:riderId/results`

**Beschrijving**: Volledige race history (alle results)

**Request**:
```bash
curl "https://zwift-ranking.herokuapp.com/api/riders/150437/results?limit=100"
```

**Query Parameters**:
- `limit`: Max aantal results (optional)
- `skip`: Offset voor paginering (optional)

**Response Structure**: Array van Result objecten (zelfde structuur als `latestResult` hierboven)

---

## 🔋 ZwiftPower API

Via Python library `zpdatafetch` - Script: `backend/scripts/zp_robust_fetch.py`

---

### Endpoint: Python Script `zp_robust_fetch.py`

**Beschrijving**: Fetch rider data via ZwiftPower inclusief power curve

**Request**:
```bash
python backend/scripts/zp_robust_fetch.py 150437 "username" "password"
```

**Response Structure**:

#### Tabel: Rider Profile

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `zwift_id` | Number | No | 150437 | Zwift Rider ID |
| `name` | String | No | "JRøne \| CloudRacer-9 @YouTube" | Rider naam |
| `ftp` | Number | No | 234 | FTP (kan verouderd zijn) |
| `weight_kg` | Number | No | 74 | Weight (kg) |
| `wkg` | Number | No | 3.16 | W/kg ratio (ftp/weight) |
| `calculated_category` | String | No | "C" | Berekende category obv W/kg |
| `gender` | String | No | "male" | Gender (male/female) |
| `zp_category` | String | No | "B" | ZwiftPower officiële category |
| `race_count` | Number | No | 424 | Totaal aantal races |

#### Tabel: Power Curve (All-Time Best)

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `power_curve.w5` | Number | No | 502 | 5 sec max power (Watts) |
| `power_curve.w15` | Number | No | 420 | 15 sec max power (Watts) |
| `power_curve.w30` | Number | No | 372 | 30 sec max power (Watts) |
| `power_curve.w60` | Number | No | 319 | 1 min max power (Watts) |
| `power_curve.w120` | Number | No | 263 | 2 min max power (Watts) |
| `power_curve.w300` | Number | No | 232 | 5 min max power (Watts) |
| `power_curve.w1200` | Number | No | 208 | 20 min max power (Watts) |

#### Tabel: W/kg Curve (All-Time Best)

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `wkg_curve.wkg5` | Number | No | 6.78 | 5 sec max W/kg |
| `wkg_curve.wkg15` | Number | No | 5.68 | 15 sec max W/kg |
| `wkg_curve.wkg30` | Number | No | 5.03 | 30 sec max W/kg |
| `wkg_curve.wkg60` | Number | No | 4.31 | 1 min max W/kg |
| `wkg_curve.wkg120` | Number | No | 3.55 | 2 min max W/kg |
| `wkg_curve.wkg300` | Number | No | 3.14 | 5 min max W/kg |
| `wkg_curve.wkg1200` | Number | No | 2.81 | 20 min max W/kg |

#### Tabel: Team

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `team.name` | String | Yes | "TeamNL" | Team naam |
| `team.tag` | String | Yes | null | Team tag/abbreviation |

#### Tabel: Recent Races

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `recent_races[].position` | Number | No | 7 | Finish positie |
| `recent_races[].name` | String | No | "JRone \| CloudRacer-9 @YouTube" | Rider naam in race |
| `recent_races[].cp` | String | No | "Watopia" | Checkpoint/Wereld |
| `recent_races[].flag` | String | No | "nl" | Land code |
| `recent_races[].t` | String | No | "2065" | **Finish tijd (STRING!)** |
| `recent_races[].lag` | Number | No | 10.738 | Gap met winnaar |
| `recent_races[].uid` | String | No | "150437" | User ID (STRING!) |
| `recent_races[].time_gun` | String | No | "2095.738..." | **Gun tijd (STRING!)** |
| `recent_races[].avg_hr` | Number | No | 159 | Gem. hartslag |
| `recent_races[].max_hr` | Number | No | 178 | Max hartslag |
| `recent_races[].avg_power` | String | No | "229" | **Gem. power (STRING!)** |
| `recent_races[].np` | String | No | "260" | **Normalized Power (STRING!)** |
| `recent_races[].max_power` | Number | No | 620 | Max power |
| `recent_races[].weight` | String | No | "74.0" | **Weight tijdens race (STRING!)** |
| `recent_races[].height` | String | No | "183" | Height (STRING!) |
| `recent_races[].source` | Number | No | 3 | Data source (1=Estimated, 3=PowerMeter) |
| `recent_races[].w1200` | String | No | "258" | **20min power (STRING!)** |
| `recent_races[].w300` | String | No | "268" | **5min power (STRING!)** |
| `recent_races[].w120` | String | No | "324" | **2min power (STRING!)** |
| `recent_races[].w60` | String | No | "358" | **1min power (STRING!)** |
| `recent_races[].w30` | String | No | "416" | **30s power (STRING!)** |
| `recent_races[].w15` | String | No | "437" | **15s power (STRING!)** |
| `recent_races[].w5` | String | No | "694" | **5s power (STRING!)** |
| `recent_races[].event_title` | String | No | "Club Ladder..." | Event titel |
| `recent_races[].distance` | Number | No | 20 | Afstand (km) |
| `recent_races[].event_date` | Number | No | 1763665200 | Unix timestamp |

**⚠️ BELANGRIJK**: Veel numerieke velden zijn STRINGS! Conversie nodig bij opslag.

---

## 🌐 Zwift.com API

Via OAuth - Script: `backend/scripts/zwift_direct.py`

---

### Endpoint: GET `/api/profiles/:riderId`

**Beschrijving**: Officieel Zwift profiel met actuele stats

**Request**:
```bash
python backend/scripts/zwift_direct.py 150437 "username" "password"
```

**Response Structure**:

#### Tabel: Profile (Root Level)

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `id` | Number | No | 150437 | Zwift Rider ID |
| `publicId` | String | No | "8f8f4855-6aca..." | Public UUID |
| `firstName` | String | No | "JRøne " | Voornaam |
| `lastName` | String | No | "CloudRacer-9 @YT (TeamNL)" | Achternaam |
| `male` | Boolean | No | true | Gender |
| `eventCategory` | String | No | "MALE" | Event category |
| `imageSrc` | String | Yes | "https://..." | Profiel foto URL (klein) |
| `imageSrcLarge` | String | Yes | "https://..." | Profiel foto URL (groot) |
| `playerType` | String | No | "NORMAL" | Player type |
| `countryAlpha3` | String | No | "nld" | Land code (ISO 3) |
| `countryCode` | Number | No | 528 | Land code (numeriek) |
| `useMetric` | Boolean | No | true | Gebruikt metric stelsel? |
| `riding` | Boolean | No | false | Nu aan het rijden? |
| `worldId` | Number | Yes | null | Huidige wereld ID (null = offline) |
| `enrolledZwiftAcademy` | Boolean | No | false | Zwift Academy ingeschreven? |
| `playerTypeId` | Number | No | 1 | Player type ID |
| `playerSubTypeId` | Number | Yes | null | Player subtype ID |
| `currentActivityId` | Number | Yes | null | Huidige activity ID |
| `likelyInGame` | Boolean | No | false | Waarschijnlijk in game? |
| `age` | Number | No | 46 | Leeftijd (jaren) |
| `bodyType` | Number | No | 4178 | Body type code |
| `height` | Number | No | 1830 | **Height (mm)** |
| `weight` | Number | No | 74000 | **Weight (gram)** |
| `ftp` | Number | No | 246 | **FTP (ACTUEEL!)** |
| `createdOn` | String | No | "2016-07-29T15:38:56.855+0000" | Account aangemaakt |
| `launchedGameClient` | String | No | "08/22/2016 17:59:32 +0000" | Laatste game launch |

#### Tabel: Privacy Settings

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `privacy.approvalRequired` | Boolean | No | true | Follow approval vereist? |
| `privacy.displayWeight` | Boolean | No | false | Weight publiek tonen? |
| `privacy.minor` | Boolean | No | false | Is minderjarig? |
| `privacy.privateMessaging` | Boolean | No | true | Private messaging toegestaan? |
| `privacy.defaultFitnessDataPrivacy` | Boolean | No | false | Fitness data standaard privé? |
| `privacy.suppressFollowerNotification` | Boolean | No | false | Follower notificaties uit? |
| `privacy.displayAge` | Boolean | No | false | Age publiek tonen? |
| `privacy.defaultActivityPrivacy` | String | No | "PUBLIC" | Activity privacy (PUBLIC/FOLLOWERS/PRIVATE) |

#### Tabel: Social Facts

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `socialFacts.profileId` | Number | No | 150437 | Profile ID |
| `socialFacts.followersCount` | Number | No | 4261 | Aantal followers |
| `socialFacts.followeesCount` | Number | No | 132 | Aantal following |
| `socialFacts.followeesInCommonWithLoggedInPlayer` | Number | No | 0 | Gemeenschappelijke following |
| `socialFacts.followerStatusOfLoggedInPlayer` | String | No | "SELF" | Follow status (SELF/IS_FOLLOWING/NOT_FOLLOWING) |
| `socialFacts.followeeStatusOfLoggedInPlayer` | String | No | "SELF" | Following status (SELF/IS_FOLLOWING/NOT_FOLLOWING) |
| `socialFacts.isFavoriteOfLoggedInPlayer` | Boolean | No | false | Is favoriet? |

#### Tabel: Connected Services

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `connectedToStrava` | Boolean | No | true | Strava verbonden? |
| `connectedToTrainingPeaks` | Boolean | No | false | TrainingPeaks verbonden? |
| `connectedToTodaysPlan` | Boolean | No | false | TodaysPlan verbonden? |
| `connectedToUnderArmour` | Boolean | No | false | UnderArmour verbonden? |
| `connectedToWithings` | Boolean | No | false | Withings verbonden? |
| `connectedToFitbit` | Boolean | No | false | Fitbit verbonden? |
| `connectedToGarmin` | Boolean | No | false | Garmin verbonden? |
| `connectedToWahoo` | Boolean | No | true | Wahoo verbonden? |
| `connectedToRuntastic` | Boolean | No | false | Runtastic verbonden? |
| `connectedToZwiftPower` | Boolean | No | true | ZwiftPower verbonden? |
| `stravaPremium` | Boolean | No | true | Strava Premium actief? |

#### Tabel: Running PRs

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `runTime1miInSeconds` | Number | No | 644 | 1 mijl run tijd (seconden) |
| `runTime5kmInSeconds` | Number | No | 2118 | 5km run tijd (seconden) |
| `runTime10kmInSeconds` | Number | No | 4500 | 10km run tijd (seconden) |
| `runTimeHalfMarathonInSeconds` | Number | No | 10127 | Half marathon tijd (seconden) |
| `runTimeFullMarathonInSeconds` | Number | No | 21700 | Full marathon tijd (seconden) |

#### Tabel: Lifetime Cycling Stats

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `achievementLevel` | Number | No | 10000 | Achievement level |
| `totalDistance` | Number | No | 38001576 | **Totaal afstand (meter)** |
| `totalDistanceClimbed` | Number | No | 350127 | Totaal hoogte (meter) |
| `totalTimeInMinutes` | Number | No | 71441 | **Totaal tijd (minuten)** |
| `totalInKomJersey` | Number | No | 0 | Tijd in KOM jersey (min) |
| `totalInSprintersJersey` | Number | No | 0 | Tijd in Sprint jersey (min) |
| `totalInOrangeJersey` | Number | No | 0 | Tijd in Orange jersey (min) |
| `totalWattHours` | Number | No | 234620 | Totaal watt hours |
| `totalExperiencePoints` | Number | No | 887000 | Totaal XP |
| `targetExperiencePoints` | Number | No | 993870 | Target XP voor volgend level |
| `totalGold` | Number | No | 22121785 | Totaal drops |
| `totalWattHoursPerKg` | Number | No | 1195.73 | Totaal watt hours per kg |

#### Tabel: Lifetime Running Stats

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `runAchievementLevel` | Number | No | 100 | Run achievement level |
| `totalRunDistance` | Number | No | 0 | Totaal run afstand (meter) |
| `totalRunTimeInMinutes` | Number | No | 0 | Totaal run tijd (minuten) |
| `totalRunExperiencePoints` | Number | No | 0 | Run XP |
| `targetRunExperiencePoints` | Number | No | 0 | Target run XP |
| `totalRunCalories` | Number | No | 0 | Run calorieën |

#### Tabel: Equipment

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `powerSourceType` | String | No | "Power Source" | Power source type |
| `powerSourceModel` | String | No | "Smart Trainer" | Power meter model |
| `virtualBikeModel` | String | No | "Zwift Concept" | Virtuele fiets model |

#### Tabel: Streaks

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `streaksCurrentLength` | Number | No | 69 | **Huidige streak (dagen)** |
| `streaksMaxLength` | Number | No | 69 | Langste streak (dagen) |
| `streaksLastRideTimestamp` | String | No | "2025-11-24T10:36:36.000+0000" | Laatste ride timestamp |

#### Tabel: Competition Metrics (Racing Score)

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `competitionMetrics.racingScore` | Number | No | 554.0 | **Zwift Racing Score (ZRS)** |
| `competitionMetrics.category` | String | No | "C" | **Officiële racing category** |
| `competitionMetrics.categoryWomen` | String | No | "E" | Category women equivalent |

#### Tabel: Profile Property Changes

| Veld | Type | Nullable | Voorbeeld Waarde | Beschrijving |
|------|------|----------|------------------|--------------|
| `profilePropertyChanges[].propertyName` | String | No | "DATE_OF_BIRTH" | Property naam |
| `profilePropertyChanges[].changeCount` | Number | No | 0 | Aantal wijzigingen |
| `profilePropertyChanges[].maxChanges` | Number | No | 3 | Max toegestane wijzigingen |

---

## 🎯 Aanbevolen Admin Tabellen

### Admin Tabel 1: Rider Overview

**Doel**: Quick overview van rider stats met data van alle APIs

| Kolom | Data Source | Type | Voorbeeld |
|-------|-------------|------|-----------|
| Rider ID | Alle APIs | Number | 150437 |
| Naam | ZwiftRacing/Zwift.com | String | "JRøne \| CloudRacer-9 @YouTube" |
| Team | ZwiftRacing | String | "TeamNL" |
| Land | ZwiftRacing/Zwift.com | String | "NL" 🇳🇱 |
| **FTP** | **Zwift.com** ✅ | Number | **246 W** |
| Weight | Zwift.com | Number | 74 kg |
| W/kg | Calculated | Number | 3.32 |
| **Category** | **Zwift.com** ✅ | String | **C** |
| **Racing Score** | **Zwift.com** ✅ | Number | **554.0** |
| vELO Rating | ZwiftRacing | Number | 1448.31 |
| Total Races | ZwiftRacing | Number | 424 |
| Last Race | ZwiftRacing | Date | 5 dagen geleden |
| **Current Streak** | **Zwift.com** ✅ | Number | **69 dagen** |
| Followers | Zwift.com | Number | 4,261 |
| Data Freshness | Calculated | String | "Updated 2 hours ago" |

**Action Buttons**:
- 🔄 Refresh from Zwift.com
- 📊 View Power Curve
- 🏆 View Achievements
- 📈 View Race History

---

### Admin Tabel 2: Race Results

**Doel**: Overzicht van race resultaten

| Kolom | Data Source | Type | Voorbeeld |
|-------|-------------|------|-----------|
| Event ID | ZwiftRacing | String | 5131733 |
| Datum | ZwiftRacing | Date | 5 Nov 2025 |
| Event Naam | ZwiftRacing | String | "Club Ladder..." |
| Route | ZwiftRacing | String | "Big Loop (Makuri Islands)" |
| Type | ZwiftRacing | String | "Scratch Race" |
| Afstand | ZwiftRacing | Number | 20.0 km |
| Positie | ZwiftRacing | Number | 7 / 15 |
| Tijd | ZwiftRacing | Time | 29:15 |
| Gap | ZwiftRacing | Time | +10.7s |
| Avg W/kg | ZwiftRacing | Number | 3.09 |
| Max 5s W/kg | ZwiftRacing | Number | 8.38 |
| NP | ZwiftRacing | Number | 260 W |
| Rating Δ | ZwiftRacing | Number | -1.33 ⬇️ |
| Points | ZwiftRacing | Number | 106.5 |

**Filters**:
- Datum range
- Race type (Scratch/Points/TT/TTT)
- Route profile (Flat/Rolling/Hilly/Mountain)
- Category

---

### Admin Tabel 3: Power Curve

**Doel**: All-time best power curve van ZwiftPower

| Duration | Power (W) | W/kg | Date Achieved | Event |
|----------|-----------|------|---------------|-------|
| 5s | 502 | 6.78 | - | - |
| 15s | 420 | 5.68 | - | - |
| 30s | 372 | 5.03 | - | - |
| 1min | 319 | 4.31 | - | - |
| 2min | 263 | 3.55 | - | - |
| 5min (MAP) | 232 | 3.14 | - | - |
| 20min (FTP) | 208 | 2.81 | - | - |

**Vergelijking**:
- Category thresholds (A+/A/B/C/D)
- Team gemiddelde
- Top 10% in category

---

### Admin Tabel 4: API Data Sources

**Doel**: Overzicht van data synchronisatie status

| API | Endpoint | Last Sync | Status | Records | Freshness |
|-----|----------|-----------|--------|---------|-----------|
| ZwiftRacing | `/riders/:id` | 2 hours ago | ✅ OK | 1 rider | Fresh |
| ZwiftRacing | `/riders/:id/results` | 2 hours ago | ✅ OK | 424 results | Fresh |
| ZwiftPower | Script | 1 day ago | ✅ OK | 1 rider + power curve | Stale |
| Zwift.com | `/api/profiles/:id` | 30 min ago | ✅ OK | 1 profile | Fresh |

**Action Buttons**:
- 🔄 Sync Now
- ⚙️ Configure Sync Schedule
- 📊 View API Logs

---

### Admin Tabel 5: Achievements

**Doel**: Overzicht van behaalde achievements

| Achievement | Category | Points | Date Achieved | Event |
|-------------|----------|--------|---------------|-------|
| Visit Paris | World | 5 | 7 Jun 2025 | Tiny Race (4 of 4) |
| Points Hoarder | Points | 60 | 30 Jan 2025 | Club Ladder Thunder vs ZSUNR |
| Scotland Win! | World | 20 | 5 Nov 2023 | Zwift TT Club Racing |
| ... | ... | ... | ... | ... |

**Totaal**: 50+ achievements, 500+ punten

---

## 🔧 Implementatie Tips

### Data Type Conversie (ZwiftPower)

**Let op**: ZwiftPower retourneert veel numerieke waarden als strings!

```typescript
// Conversie helper functie
function convertZwiftPowerRace(race: any) {
  return {
    time: parseFloat(race.t),
    avgPower: parseInt(race.avg_power),
    np: parseInt(race.np),
    weight: parseFloat(race.weight),
    w5: parseInt(race.w5),
    w15: parseInt(race.w15),
    w30: parseInt(race.w30),
    w60: parseInt(race.w60),
    w120: parseInt(race.w120),
    w300: parseInt(race.w300),
    w1200: parseInt(race.w1200),
    // ...
  };
}
```

### Unit Conversie (Zwift.com)

**Let op**: Zwift.com gebruikt andere units!

```typescript
// Conversie helper functie
function convertZwiftComProfile(profile: any) {
  return {
    weight: profile.weight / 1000, // gram → kg
    height: profile.height / 10, // mm → cm
    totalDistance: profile.totalDistance / 1000, // meter → km
    totalElevation: profile.totalDistanceClimbed, // meter (OK)
    totalTime: profile.totalTimeInMinutes * 60, // min → sec
    // ...
  };
}
```

### Refresh Strategy

```typescript
// Prioriteit voor actuele data
const refreshPriority = {
  critical: ['Zwift.com'], // FTP, weight, category - refresh vaak
  important: ['ZwiftRacing'], // Race results - refresh 4x/dag
  background: ['ZwiftPower'] // Power curve - refresh 1x/dag
};
```

---

**Einde Admin API Endpoints Reference**
