# ZwiftRacing API - FTP Fields Analyse

**Rider:** 1175748 (Jos Castelijns)  
**Datum:** 2025-11-14

## ❌ Probleem: zpFTP = 0

De ZwiftRacing.app API heeft **GEEN** alternatieve FTP velden. Er is alleen:

```json
{
  "zpFTP": 0  // ❌ Niet ingevuld voor deze rider
}
```

## ✅ Beschikbare Data

De API geeft WEL complete **power curve** data:

```json
{
  "weight": 69,
  "power": {
    "w1200": 343,      // 20min power
    "wkg1200": 4.971,  // 20min w/kg
    "w300": 373,       // 5min power
    "w60": 493,        // 1min power
    "CP": 332.247,     // Critical Power (modeled FTP)
    "AWC": 13158.69,   // Anaerobic Work Capacity
    "compoundScore": 1967.92
  }
}
```

## 💡 Oplossing: Computed FTP Column

**Voorstel:** Voeg `estimated_ftp` kolom toe die automatisch berekend wordt:

### Fallback Logica
1. **zpFTP** (indien > 0) → gebruik directe waarde
2. **95% van w1200** → standard FTP test protocol
3. **CP (Critical Power)** → model-based FTP
4. **90% van w300** → 5min test alternative

### Implementatie

```sql
ALTER TABLE riders 
ADD COLUMN estimated_ftp INTEGER GENERATED ALWAYS AS (
  CASE 
    WHEN zp_ftp > 0 THEN zp_ftp
    WHEN power_w1200 > 0 THEN ROUND(power_w1200 * 0.95)
    WHEN power_cp > 0 THEN ROUND(power_cp)
    WHEN power_w300 > 0 THEN ROUND(power_w300 * 0.90)
    ELSE NULL
  END
) STORED;

-- Ook w/kg variant
ALTER TABLE riders
ADD COLUMN estimated_ftp_wkg NUMERIC GENERATED ALWAYS AS (
  CASE 
    WHEN weight > 0 AND estimated_ftp > 0 
    THEN ROUND((estimated_ftp::NUMERIC / weight), 2)
    ELSE NULL
  END
) STORED;
```

## 📊 Resultaat voor Rider 1175748

Met deze logica:
- zpFTP = 0 → ❌ skip
- w1200 = 343 → ✅ **FTP = 326 watts** (343 × 0.95)
- Weight = 69 kg → **4.72 w/kg**

## 🎯 Waarom dit de beste oplossing is

1. **Transparant**: Backend API clients hoeven geen logica te implementeren
2. **Consistent**: Alle queries gebruiken dezelfde berekening
3. **Maintainable**: Wijzigingen in 1 plek (database schema)
4. **Performance**: Generated column = geen runtime berekening
5. **Backwards compatible**: `zp_ftp` blijft bestaan

## 🔄 API Endpoints Update

Voeg `estimated_ftp` en `estimated_ftp_wkg` toe aan alle rider responses:

```typescript
// GET /api/riders/:id
{
  rider_id: 1175748,
  name: "Jos Castelijns(TeamNL)",
  zp_ftp: 0,                    // Original (empty)
  estimated_ftp: 326,           // ✅ Computed!
  estimated_ftp_wkg: 4.72,      // ✅ Computed!
  power_w1200: 343,
  power_cp: 332
}
```

## 📝 Views Update

Update `view_racing_data_matrix` en `view_my_team`:

```sql
CREATE OR REPLACE VIEW view_racing_data_matrix AS
SELECT 
  r.rider_id,
  r.name,
  r.zp_ftp,
  r.estimated_ftp,              -- ✅ Nieuwe kolom
  r.estimated_ftp_wkg,          -- ✅ Nieuwe kolom
  r.weight,
  r.race_last_rating,
  ...
FROM riders r
JOIN my_team_members mtm ON r.rider_id = mtm.rider_id;
```

## ✅ Action Items

1. [ ] Create migration `016_add_estimated_ftp.sql`
2. [ ] Update TypeScript types (`DbRider` interface)
3. [ ] Update API endpoint responses (riders.ts)
4. [ ] Update views (racing_data_matrix, my_team)
5. [ ] Update frontend displays
6. [ ] Add to API documentation

## 🔍 Verificatie

Test met riders:
- 1175748 (Jos) → zpFTP=0, moet fallback naar w1200
- 150437 (JRøne) → zpFTP=270, moet die gebruiken
- Anderen zonder beide → moet naar CP/w300
