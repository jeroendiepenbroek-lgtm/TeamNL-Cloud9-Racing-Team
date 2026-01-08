# 🗄️ Database Structuur - Functionele Tabellen

**Datum:** 8 januari 2026  
**Status:** Na E2E Race Results implementatie

---

## ✅ FUNCTIONELE TABELLEN (IN GEBRUIK)

### 1. **team_roster**
- **Doel:** Lijst van actieve team members
- **Gebruikt door:** 
  - `/api/riders` endpoint
  - `v_rider_complete` view
  - Frontend roster display
- **Key fields:** rider_id, active, join_date
- **Status:** ✅ ACTIEF

### 2. **api_zwiftracing_riders**
- **Doel:** ZwiftRacing.app API data per rider
- **Gebruikt door:**
  - Rider sync scheduler
  - `v_rider_complete` view
- **Key fields:** rider_id, velo_live, power_*, phenotype, racing_score
- **Status:** ✅ ACTIEF

### 3. **zwift_official_profiles**
- **Doel:** Zwift Official API data
- **Gebruikt door:**
  - Rider sync scheduler
  - `v_rider_complete` view
- **Key fields:** rider_id, racing_score, category, ftp_watts
- **Status:** ✅ ACTIEF

### 4. **race_results** ⭐ NIEUW UPGRADED
- **Doel:** Race history met power intervals
- **Gebruikt door:**
  - Race Results Dashboard (nieuw)
  - `/api/results/rider/{id}` endpoint
- **Key fields:** event_id, rider_id, position, power_*_wkg (7 intervals), velo_*
- **Nieuwe kolommen:** power_5s_wkg, power_15s_wkg, power_30s_wkg, power_1m_wkg, power_2m_wkg, power_5m_wkg, power_20m_wkg
- **Status:** ✅ ACTIEF + ENHANCED

### 5. **sync_config**
- **Doel:** Scheduler configuratie
- **Gebruikt door:** Sync scheduler system
- **Key fields:** sync_type, enabled, interval_minutes
- **Status:** ✅ ACTIEF

### 6. **sync_logs**
- **Doel:** Sync history tracking
- **Gebruikt door:** Monitoring, debugging
- **Status:** ✅ ACTIEF

---

## 📊 FUNCTIONELE VIEWS

### **v_rider_complete**
- **Doel:** Gecombineerde rider data voor frontend
- **Bronnen:** 
  - team_roster (is_team_member filter)
  - api_zwiftracing_riders (vELO, power, phenotype)
  - zwift_official_profiles (racing_score, category)
- **Gebruikt door:** `/api/riders` endpoint
- **Status:** ✅ ACTIEF - PRIMARY VIEW

---

## ❌ LEGACY TABELLEN (TE VERWIJDEREN)

### **api_zwiftracing_public_clubs**
- **Was voor:** Bulk club data fetch
- **Niet meer gebruikt sinds:** Smart Sync v5.0
- **Replacement:** Individual rider sync
- **Actie:** 🗑️ DROP

### **api_zwiftracing_public_clubs_riders**
- **Was voor:** Riders binnen clubs
- **Niet meer gebruikt sinds:** Smart Sync v5.0
- **Replacement:** team_roster + api_zwiftracing_riders
- **Actie:** 🗑️ DROP

### **race_events** 
- **Was voor:** Event metadata
- **Probleem:** Weinig data, niet actief gevuld
- **Replacement:** Event data embedded in race_results
- **Actie:** ⚠️ EVALUEREN (mogelijk FK constraint met race_results)

### **race_results_sync_log**
- **Was voor:** Race results sync tracking
- **Check:** Wordt dit nog gebruikt door nieuwe E2E pipeline?
- **Actie:** ⚠️ EVALUEREN

---

## 🔧 AANBEVOLEN CLEANUP ACTIES

### Stap 1: Verificatie
```sql
-- Check laatste activiteit legacy tabellen
SELECT 'api_zwiftracing_public_clubs' as table_name,
       COUNT(*) as rows,
       MAX(fetched_at) as last_update
FROM api_zwiftracing_public_clubs;

SELECT 'api_zwiftracing_public_clubs_riders' as table_name,
       COUNT(*) as rows,
       MAX(fetched_at) as last_update
FROM api_zwiftracing_public_clubs_riders;
```

### Stap 2: Soft Delete (Aanbevolen eerst)
```sql
-- Hernoem naar _deprecated
ALTER TABLE api_zwiftracing_public_clubs 
  RENAME TO _deprecated_clubs;
  
ALTER TABLE api_zwiftracing_public_clubs_riders 
  RENAME TO _deprecated_clubs_riders;
```

### Stap 3: Hard Delete (Na verificatie > 30 dagen)
```sql
-- Permanent verwijderen
DROP TABLE IF EXISTS _deprecated_clubs CASCADE;
DROP TABLE IF EXISTS _deprecated_clubs_riders CASCADE;
```

---

## 📦 PRODUCTIE DATABASE STRUCTUUR

### Core Tables (6)
1. `team_roster` - Team members
2. `api_zwiftracing_riders` - ZwiftRacing data
3. `zwift_official_profiles` - Zwift Official data
4. `race_results` - Race history + power intervals ⭐
5. `sync_config` - Scheduler config
6. `sync_logs` - Sync history

### Views (1)
1. `v_rider_complete` - Combined rider data

### Total: **7 functionele objecten**

---

## 🎯 VOLGENDE STAPPEN

1. ✅ SQL 016 uitgevoerd (power intervals toegevoegd)
2. ⏳ SQL 017 uitvoeren (27 races importeren)
3. ⏳ Cleanup script draaien (legacy tabellen verwijderen)
4. ⏳ Dashboard bouwen met `/api/results/rider/150437`

---

**Resultaat:** Schone, overzichtelijke database met alleen functionele tabellen! 🎉
