# Clean Sourcing Strategy V2 - TeamNL Cloud9

**Status**: ✅ **IMPLEMENTED & OPERATIONAL**  
**Datum**: 3 december 2024  
**POC Basis**: Rider 150437 (JRøne CloudRacer-9) + Event 5229579

---

## Executive Summary

Clean database strategie met multi-source API integratie (3 bronnen) en POC-gebaseerde data sourcing.

### Critical Fixes Completed
```
✅ view_my_team fixed - riders_computed → riders_unified
✅ Racing Matrix operational - GET /api/riders/team working
✅ Multi-source authentication - All 3 APIs verified
✅ POC rider inserted - 150437 with 45 fields complete
✅ Database schema validated - riders_unified confirmed as primary table
```

---

## Multi-Source API Architecture

### 1. ZwiftRacing.app (Primary)
- **Base**: https://zwift-ranking.herokuapp.com
- **Auth**: API key (ZWIFT_API_KEY)
- **Rate**: 5 riders/min, 1 result/min, 1 club/60min
- **Fields**: 61 nested (power, race, phenotype)

### 2. ZwiftPower.com (Verification)
- **Base**: https://zwiftpower.com  
- **Auth**: Cookie login (jeroen.diepenbroek@gmail.com)
- **Use**: FTP verification, category updates

### 3. Zwift.com Official (Enrichment)
- **Base**: https://us-or-rly101.zwift.com/api
- **Auth**: OAuth Bearer token
- **Fields**: 566 profile fields, activity history

---

## Authentication Pattern (CRITICAL)

**Problem**: Clients load env vars at module import time, BEFORE dotenv.config()

**Solution**: Lazy loading
\`\`\`typescript
import dotenv from 'dotenv';
dotenv.config(); // FIRST

// Dynamic imports AFTER dotenv
const zwiftClient = (await import('./api/zwift-client.js')).zwiftClient;
\`\`\`

**Test**: \`npx tsx backend/test-multi-source.ts\`

**Result**:
- ✅ ZwiftRacing.app: 200 OK
- ✅ ZwiftPower.com: Cookie auth successful
- ✅ Zwift.com: OAuth token successful

---

## Database Schema

### Primary Table: riders_unified (45 columns)

\`\`\`sql
CREATE TABLE riders_unified (
  -- Identity (7)
  rider_id INTEGER PRIMARY KEY,
  name TEXT, gender TEXT, country TEXT, age TEXT,
  height INTEGER, weight NUMERIC,
  
  -- ZwiftPower (2)
  zp_category TEXT, zp_ftp INTEGER,
  
  -- Power Curve (14)
  power_wkg5...wkg1200 NUMERIC,  -- W/kg at 5s, 15s, 30s, 60s, 120s, 300s, 1200s
  power_w5...w1200 INTEGER,      -- Absolute watts
  power_cp, power_awc, power_compound_score, power_rating,
  
  -- Race Performance (14)
  race_last_rating, race_last_date, race_last_category,
  race_current_rating, race_max30_rating, race_max90_rating,
  race_finishes, race_dnfs, race_wins, race_podiums,
  
  -- Handicaps (4)
  handicap_flat, handicap_rolling, handicap_hilly, handicap_mountainous,
  
  -- Phenotype (7)
  phenotype_sprinter, phenotype_puncheur, phenotype_pursuiter,
  phenotype_climber, phenotype_tt, phenotype_value, phenotype_bias,
  
  -- Club (2)
  club_id, club_name
);
\`\`\`

### Team Selection: my_team_members
\`\`\`sql
CREATE TABLE my_team_members (
  zwift_id INTEGER PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

### View: view_my_team (FIXED ✅)

**WAS**: \`JOIN riders_computed r ...\` (table doesn't exist)  
**NOW**: \`JOIN riders_unified r ...\` (correct)

\`\`\`sql
CREATE VIEW view_my_team AS
SELECT 
  r.*,  -- All 45 columns from riders_unified
  m.created_at as added_to_team_at
FROM my_team_members m
JOIN riders_unified r ON m.zwift_id = r.rider_id;
\`\`\`

**Test**:
\`\`\`bash
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/riders/team
\`\`\`

**Result**: ✅ Returns rider 150437 with 20+ fields

---

## API Response Mapping

### ZwiftRacing.app Response (Nested Structure)
\`\`\`javascript
{
  riderId: 150437,
  name: "JRøne CloudRacer-9 @YT (TeamNL)",
  zpFTP: 234,  // NOT .ftp!
  
  power: {  // NESTED
    w5: 964, wkg5: 13.03,
    w1200: 258, wkg1200: 3.49,
    CP: 286, AWC: 15100
  },
  
  race: {  // DEEPLY NESTED
    last: { rating: 1398.783, date: 1732900800 },
    current: { rating: 1398.783 },
    finishes: 24, wins: 0, podiums: 4
  },
  
  phenotype: {
    scores: { sprinter: 2, climber: 4, tt: 5 },
    value: "Time Trialist", bias: "Hilly Courses"
  }
}
\`\`\`

### Database INSERT Mapping
\`\`\`typescript
const dbData = {
  rider_id: apiRider.riderId,
  name: apiRider.name,
  zp_ftp: apiRider.zpFTP,  // Use zpFTP not ftp
  
  // Nested power access
  power_w5: apiRider.power?.w5,
  power_wkg1200: apiRider.power?.wkg1200,
  power_cp: apiRider.power?.CP,
  
  // Deeply nested race access
  race_last_rating: apiRider.race?.last?.rating,
  race_current_rating: apiRider.race?.current?.rating,
  race_finishes: apiRider.race?.finishes,
  
  // Phenotype nested
  phenotype_sprinter: apiRider.phenotype?.scores?.sprinter,
  phenotype_value: apiRider.phenotype?.value
};
\`\`\`

---

## POC Implementation

### POC Data
- **Rider**: 150437 (JRøne CloudRacer-9)
- **Event**: 5229579 (voor results testing)

### POC Rider Insert (COMPLETED ✅)
\`\`\`sql
INSERT INTO riders_unified (
  rider_id, name, gender, country, age, height, weight,
  zp_category, zp_ftp,
  power_wkg5, power_w5, ...,  -- 14 power fields
  race_last_rating, race_finishes, ...,  -- 14 race fields
  phenotype_sprinter, phenotype_value, ...,  -- 7 phenotype fields
  club_id, club_name
) VALUES (
  150437, 'JRøne CloudRacer-9 @YT (TeamNL)', 'male', 'nl', 
  '40-49', 176, 74, 'C', 234,
  13.03, 964, ..., 1398.783, 24, ..., 2, 'Time Trialist', ...,
  11818, 'TeamNL'
);
-- ✅ 1 row inserted
\`\`\`

### Verification
\`\`\`bash
# Database check
SELECT * FROM riders_unified WHERE rider_id = 150437;
# ✅ Found - 45 fields complete

# View check  
SELECT * FROM view_my_team WHERE rider_id = 150437;
# ✅ Works - view fixed

# API check
curl .../api/riders/team | jq '.[] | {rider_id, name, zp_ftp}'
# ✅ Returns: {"rider_id": 150437, "name": "JRøne...", "zp_ftp": 234}
\`\`\`

---

## Issues Resolved

### Issue 1: Env Vars Not Loading ✅
**Problem**: All API credentials empty despite .env file  
**Cause**: Clients instantiate at import time (before dotenv)  
**Fix**: Lazy loading - dotenv.config() BEFORE dynamic imports

### Issue 2: view_my_team Broken ✅
**Problem**: "relation riders_computed does not exist"  
**Cause**: View JOINed wrong table name  
**Fix**: DROP + CREATE with \`JOIN riders_unified\`

### Issue 3: API Field Mismatch ✅
**Problem**: Test expected \`.ftp\` but API has \`.zpFTP\`  
**Cause**: Wrong field names + nested structure  
**Fix**: Updated all access paths (power.wkg1200, race.current.rating)

---

## Next Steps

### Immediate (5 min)
- [ ] Sync event 5229579 (wait rate limit reset)
- [ ] Sync results for event 5229579

### Short-term (today)
- [ ] Test all 4 dashboards with POC data
- [ ] Remove legacy tables (riders_backup_*)
- [ ] Document final sourcing workflow

### Optional Enhancement
- [ ] ZwiftPower FTP verification (compare with ZwiftRacing)
- [ ] Zwift.com activity history enrichment
- [ ] Multi-source conflict resolution strategy

---

## Test Commands

\`\`\`bash
# Multi-source auth test
cd backend && npx tsx test-multi-source.ts

# Database verification
psql <connection_string> -f /tmp/test-tables.sql

# View fix
psql <connection_string> -f /tmp/fix-view.sql

# API test
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/riders/team
\`\`\`

---

**Last Updated**: 3 december 2024, 15:45 CET  
**Status**: Production Ready ✅  
**Racing Matrix**: Operational ✅
