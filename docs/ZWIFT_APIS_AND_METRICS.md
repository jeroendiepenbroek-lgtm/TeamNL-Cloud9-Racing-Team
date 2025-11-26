# Zwift APIs & Advanced Power Metrics

## Zwift.com API Status

### ❌ Geen Officiële Publieke API
Zwift heeft **geen officiële publieke API** voor externe ontwikkelaars. De `zwift.com` API endpoints:
- Vereisen authenticatie (JWT tokens)
- Zijn alleen voor interne Zwift apps
- Hebben geen documentatie
- Kunnen zonder waarschuwing wijzigen

**Voorbeeld (Unauthorized)**:
```bash
curl https://us-or-rly101.zwift.com/api/profiles/150437
# Response: <html><body>Unauthorized</body></html>
```

### ✅ Beschikbare Data Bronnen

| Bron | Type | Authenticatie | Data Actualiteit | Gebruik |
|------|------|---------------|------------------|---------|
| **ZwiftPower** | Community API | Login required | Real-time | ✅ GEÏMPLEMENTEERD |
| **ZwiftRacing.app** | Public REST API | Public | 24-48u lag | ✅ In gebruik |
| **Zwift.com** | Private API | JWT tokens | Real-time | ❌ Niet toegankelijk |
| **ZwiftHQ** | Unofficial API | Reverse engineered | Real-time | ⚠️ Onbetrouwbaar |

### 🔧 Community Tools
Enkele community projecten die Zwift API's reverse-engineeren:
- **zwift-mobile-api** (Python) - Requires credentials + unofficial
- **ZwiftAPI** (Node.js) - Deprecated
- **zwift-packet-monitor** - Packet sniffing (complex)

**⚠️ Risico's**: Unofficial APIs kunnen geblokkeerd worden door Zwift.

**✅ Aanbeveling**: Blijf bij ZwiftPower (officiële community tool) en ZwiftRacing.app.

---

## Power Metrics & Berekeningen

### 📊 Beschikbare Metrics in ZwiftPower

#### 1. **FTP (Functional Threshold Power)**
- **Wat**: Maximaal vermogen dat 1 uur volgehouden kan worden
- **Berekening**: 95% van 20-minuten power test
- **Gebruik**: Basis voor training zones en category bepaling
- **Jouw waarde**: **234W** (3.08 W/kg)

```typescript
// Category berekening (al geïmplementeerd)
W/kg = FTP / Gewicht
Category = categoryFromWkg(W/kg)
```

#### 2. **Critical Power Curve** (w5, w15, w30, w60, w120, w300, w1200)
- **Wat**: Maximaal vermogen per tijdsduur
- **Data**: Opgeslagen per race in ZwiftPower
- **Jouw waarden** (laatste race met data):
  ```
  5 sec:    502W  (6.6 W/kg)  - Sprint power
  15 sec:   420W  (5.5 W/kg)  - Sprint finish
  30 sec:   372W  (4.9 W/kg)  - Short effort
  1 min:    319W  (4.2 W/kg)  - VO2max effort
  2 min:    263W  (3.5 W/kg)  - Aerobic capacity
  5 min:    232W  (3.1 W/kg)  - MAP zone
  20 min:   208W  (2.7 W/kg)  - FTP test
  ```

#### 3. **Normalized Power (NP)**
- **Wat**: Gewogen gemiddelde vermogen (accounting for variability)
- **Formule**: `NP = (avg(power^4))^(1/4)`
- **Gebruik**: Betere indicator van fysiologische belasting dan avg power
- **Beschikbaar**: Ja, in `np` veld

#### 4. **W/kg Metrics** (wkg5, wkg15, wkg30, wkg60, wkg120, wkg300, wkg1200)
- **Wat**: Power curve genormaliseerd naar gewicht
- **Gebruik**: Vergelijken met andere renners ongeacht gewicht
- **Beschikbaar**: Ja, parallel aan absolute watt curve

#### 5. **wFTP (Weighted FTP)**
- **Wat**: FTP afgeleid van 20-minuten test
- **Berekening**: `wFTP = 20min_power * 0.95`
- **Beschikbaar**: Ja, in `wftp` veld

---

## ⚠️ zMAP en zFTP - Niet Standaard

### zFTP (ZwiftPower FTP)
✅ **Beschikbaar** - Dit is het `ftp` veld in ZwiftPower data
- Komt van laatste race of manual update
- Wordt gebruikt voor category berekening
- **Al geïmplementeerd** in onze integratie

### zMAP (ZwiftPower Maximum Aerobic Power)
❌ **NIET beschikbaar** als apart veld

**Wat is MAP?**
- Maximum Aerobic Power (maximaal aeroob vermogen)
- Typisch: ~120% van FTP
- Vergelijkbaar met 5-minuten power

**Alternatief berekening**:
```typescript
// MAP benadering uit power curve
MAP_estimate = w300  // 5-minuten power
// Of
MAP_calculated = FTP * 1.20  // 120% van FTP
```

**Jouw geschatte MAP**:
```
w300 (5min power): 232W
FTP * 1.20: 234W * 1.20 = 281W

Werkelijke w300: 232W (3.1 W/kg)
```

---

## 🧮 Extra Berekeningen die we KUNNEN Toevoegen

### 1. **Training Zones (op basis van FTP)**
```typescript
const trainingZones = {
  recovery: { min: 0, max: 0.55 * ftp },      // Zone 1: < 129W
  endurance: { min: 0.55 * ftp, max: 0.75 * ftp }, // Zone 2: 129-176W
  tempo: { min: 0.75 * ftp, max: 0.90 * ftp },     // Zone 3: 176-211W
  threshold: { min: 0.90 * ftp, max: 1.05 * ftp }, // Zone 4: 211-246W
  vo2max: { min: 1.05 * ftp, max: 1.20 * ftp },    // Zone 5: 246-281W
  anaerobic: { min: 1.20 * ftp, max: 1.50 * ftp }, // Zone 6: 281-351W
  sprint: { min: 1.50 * ftp, max: Infinity }       // Zone 7: > 351W
};
```

### 2. **Fatigue Resistance (Power Duration)**
```typescript
// Hoe goed houdt rider power vast over tijd
const fatigueResistance = {
  sprint_to_60s: w60 / w5,        // Jij: 319/502 = 0.64 (64% behoud)
  threshold_to_ftp: w1200 / ftp,  // Jij: 208/234 = 0.89 (89% behoud)
  vo2_to_threshold: w300 / w1200  // Jij: 232/208 = 1.11 (>100%, goed!)
};
```

### 3. **Rider Profile Type**
```typescript
// Sprinter, Climber, All-rounder, Time Trialist
const riderProfile = {
  sprint_ratio: w5 / ftp,         // Jij: 502/234 = 2.14 (avg sprinter)
  climbing_ratio: w300 / weight,  // Jij: 232/76 = 3.05 W/kg (avg climber)
  tt_ratio: w1200 / weight        // Jij: 208/76 = 2.74 W/kg (avg TT)
};

// Classificatie
if (sprint_ratio > 2.5) type = "Sprinter";
else if (climbing_ratio > 4.0) type = "Climber";
else if (tt_ratio > 3.5) type = "Time Trialist";
else type = "All-rounder";
```

### 4. **Intensity Factor (IF)**
```typescript
// Maat voor intensiteit van race
const intensityFactor = normalizedPower / ftp;
// < 0.75: Easy ride
// 0.75-0.85: Moderate
// 0.85-0.95: Hard
// 0.95-1.05: Very hard
// > 1.05: Extremely hard
```

### 5. **Variability Index (VI)**
```typescript
// Maat voor power variabiliteit
const variabilityIndex = normalizedPower / avgPower;
// 1.00-1.05: Steady (TT)
// 1.05-1.10: Moderate variation
// > 1.10: High variation (crit racing)
```

---

## 💡 Implementatie Voorstel

### Option A: Basis Metrics (Snel)
✅ Al beschikbaar in ZwiftPower data:
- FTP
- Power curve (w5-w1200)
- W/kg curve
- Normalized Power

### Option B: Berekende Metrics (Toevoegen)
```typescript
// In zwiftpower.service.ts
interface AdvancedMetrics {
  // Training zones
  trainingZones: TrainingZone[];
  
  // Rider characteristics
  riderProfile: {
    type: 'Sprinter' | 'Climber' | 'All-rounder' | 'Time Trialist';
    sprint_ratio: number;
    climbing_ratio: number;
    tt_ratio: number;
  };
  
  // Fatigue resistance
  fatigueResistance: {
    sprint_to_60s: number;
    threshold_to_ftp: number;
    vo2_to_threshold: number;
  };
  
  // Race metrics (als beschikbaar)
  intensityFactor?: number;
  variabilityIndex?: number;
}
```

### Option C: MAP Schatting
```typescript
// Voeg toe aan zwiftpower.service.ts
calculateMAP(ftp: number, w300?: number): number {
  if (w300) {
    return w300; // Gebruik actual 5min power
  }
  return ftp * 1.20; // Schatting: 120% van FTP
}
```

---

## 🎯 Aanbeveling

**Voor jouw use case**:
1. ✅ **Blijf bij ZwiftPower** - Meest complete data zonder reverse engineering
2. ✅ **Gebruik power curve** - w5, w15, w30, w60, w120, w300, w1200 zijn al beschikbaar
3. ✅ **Bereken training zones** - Uit FTP afleiden
4. ✅ **Rider profiling** - Uit power curve ratios bepalen
5. ❌ **Geen zMAP** - Niet standaard, gebruik w300 (5min power) als alternatief

Wil je dat ik **Option B** (berekende metrics) implementeer?
