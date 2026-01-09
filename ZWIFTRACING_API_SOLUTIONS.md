# ZwiftRacing.app API - Alle Oplossingen voor Snellere Data

## 🎯 Doel
- ZwiftPower als primaire bron (power, positie, tijd)
- ZwiftRacing voor vELO enrichment
- Club Ladder events die alleen in ZwiftRacing zitten
- **Snelste manier vinden om deze data te krijgen**

---

## 📊 API Endpoints Analyse

### ✅ Succesvolle Endpoints

#### 1. Club Endpoint
```
GET /api/public/clubs/2281
```
**Status**: ✅ Werkt, GEEN rate limit voor club list  
**Response**: 594 riders in TeamNL club  
**Data**: Rider profiles (name, vELO, category)  
**Probleem**: Bevat GEEN race history/results  

**Voordeel**: 
- Alle TeamNL riders in 1 request
- Geen rate limit
- Actuele vELO ratings per rider

**Beperking**:
- Geen race-by-race vELO changes
- Geen event results

---

#### 2. Riders Bulk POST
```
POST /api/public/riders
Body: [150437, 396624, 5574, ...]
```
**Status**: ✅ Werkt  
**Response**: Rider profiles voor meerdere riders tegelijk  
**Data**: Name, vELO (current), category, FTP  
**Probleem**: Geen race history

**Voordeel**:
- Batch van riders tegelijk
- Huidige vELO rating
- Minder requests dan per rider

**Beperking**:
- Geen race results
- Nog steeds rate limited (10 min window)

---

#### 3. Event Results Endpoints
```
GET /api/public/results/<eventId>
GET /api/public/zp/<eventId>/results
```
**Status**: ✅ Werkt  
**Response**: Alle riders + vELO voor specifiek event  
**Rate Limit**: ⚠️ **1 request per minuut**  

**Voordeel**:
- Complete event results met vELO
- Beide endpoints geven zelfde data

**Probleem**:
- Extreme rate limit (1/min)
- Voor 27 events = 30 minuten
- Voor 78 riders × 25 events = ~32 uur

---

### ❌ Rate Limited Endpoints

```
GET /api/public/clubs/<clubId>/<riderId>  - 10 min rate limit
GET /api/public/riders/<riderId>/<time>   - 10 min rate limit
```

Deze zijn te traag voor bulk operations.

---

## 🚀 Oplossingen Gerangschikt

### 🥇 OPTIE 1: Hybride Strategie (AANBEVOLEN)

**Fase 1: ZwiftPower (5 seconden)**
- Haal ALLE race results op via zpdatafetch
- Sync power, positie, tijd naar database
- ✅ Direct bruikbaar!

**Fase 2A: Current vELO via Club endpoint (5 seconden)**
```python
# 1 request voor alle 78 TeamNL riders
GET /api/public/clubs/2281
# Parse riders, extract current vELO
# Update rider profiles in database
```

**Fase 2B: Historical vELO Enrichment (achtergrond, ~30 min voor 1 rider)**
- Run incrementeel voor prioriteit events
- Alleen laatste 30 dagen
- Background job: 1 event per minuut

**Resultaat**:
- ✅ Alle race results direct beschikbaar (ZwiftPower)
- ✅ Current vELO ratings voor alle riders (5 sec)
- ⏳ Historical vELO komt incrementeel

---

### 🥈 OPTIE 2: Selective Enrichment

**Strategie**: Niet alle events hoeven vELO

**Prioriteit**:
1. Recente races (laatste 7 dagen) - volledige vELO
2. Belangrijke races (ZRL, majors) - volledige vELO  
3. Oude races - alleen current vELO

**Implementatie**:
```python
# Recente races: 5-10 events
for event in recent_events[:10]:
    enrich_with_velo(event)  # 10 × 65s = 11 minuten

# Alle riders: huidige vELO
current_velo = get_club_velo()  # 1 request
```

**Resultaat**:
- ✅ Snelste tijd tot "bruikbaar"
- ✅ Meest relevante data compleet
- ✅ Oude data krijgt basis vELO

---

### 🥉 OPTIE 3: Database Caching

**Strategie**: vELO data is relatief stabiel

**Implementatie**:
```python
# Stap 1: Initiële sync (1x, traag)
sync_all_velo()  # 30 minuten voor 1 rider

# Stap 2: Incrementeel (dagelijks)
sync_recent_velo()  # Alleen nieuwe races

# Stap 3: Update ratings (wekelijks)
update_current_velo()  # Via club endpoint, 5 sec
```

**Resultaat**:
- ✅ Na eerste sync: alles compleet
- ✅ Dagelijks: alleen nieuwe data
- ✅ Laag onderhoud

---

### 🏅 OPTIE 4: Club Ladder via ZwiftRacing

**Probleem**: Club Ladder events zitten niet in ZwiftPower  
**Oplossing**: Dedicated scan

**Implementatie**:
```python
# Identificeer Club Ladder events (hoe?)
# - Via club endpoint?
# - Via rider event history?
# - Handmatige lijst?

club_ladder_events = identify_club_ladder_events()

for event_id in club_ladder_events:
    fetch_event_results(event_id)
    time.sleep(65)
```

**Actie nodig**:
- 🔍 Onderzoek: Hoe identificeren we Club Ladder events?
- 🔍 Zijn deze events in rider history?
- 🔍 Heeft club endpoint event lists?

---

## 💡 Definitieve Aanbeveling

### Voor JOUW use case:

```python
# FASE 1: Basis (5 seconden) ✅ DONE
production-race-sync.py  # ZwiftPower sync

# FASE 2: Current vELO (5 seconden) ⭐ NEW
sync-club-velo.py        # Haal huidige vELO via club endpoint

# FASE 3: Historical vELO (optioneel, achtergrond)
# Optie A: Alleen laatste 7 dagen (7 minuten)
enrich-recent-velo.py    # Alleen recente races

# Optie B: Volledige historie (30 minuten)
production-race-sync.py fase 2  # Full enrichment

# FASE 4: Club Ladder
# Moet eerst onderzocht worden hoe we deze events identificeren
```

### Tijdsinvestering:

| Wat | Tijd | Data |
|-----|------|------|
| ZwiftPower sync | 5 sec | Power, positie, tijd (100%) |
| Club vELO sync | 5 sec | Current vELO voor alle riders |
| Recent vELO (7d) | 7 min | vELO history laatste week |
| Full vELO (90d) | 30 min | Complete vELO history |

**Keuze**: Start met fase 1+2 (10 sec), dan beslis je of fase 3 nodig is.

---

## 📝 Next Steps

1. ✅ **Test club endpoint voor current vELO** (5 min)
2. ✅ **Bouw sync-club-velo.py script** (10 min)
3. ⏳ **Identificeer Club Ladder events** (onderzoek)
4. ⏳ **Beslis: full of selective vELO enrichment?**

---

## 🎬 Conclusie

**Snelste oplossing**:
- ZwiftPower voor results (5 sec) ✅
- Club endpoint voor current vELO (5 sec) ⭐
- Selectieve enrichment voor important races (7 min) 🎯

**Totaal**: 12 seconden tot bruikbare data!  
(Full enrichment optioneel in achtergrond)
