# Race Results System - Deployment Instructies
**Datum:** 4 januari 2026

## 🚨 Kritieke SQL Fix

De `v_race_results_recent` view heeft een bug - probeert `category` kolom te gebruiken die niet bestaat in `v_rider_complete`.

**Voer dit uit in Supabase SQL Editor:**

```sql
-- Fix v_race_results_recent view
CREATE OR REPLACE VIEW v_race_results_recent AS
SELECT 
  rr.*,
  rc.racing_name,
  rc.full_name,
  rc.avatar_url,
  rc.country_alpha3,
  RANK() OVER (PARTITION BY rr.rider_id ORDER BY rr.event_date DESC) AS race_rank
FROM race_results rr
LEFT JOIN v_rider_complete rc ON rr.rider_id = rc.rider_id
WHERE rr.event_date >= NOW() - INTERVAL '90 days'
ORDER BY rr.event_date DESC;
```

## 📁 Nieuwe Frontend Pages

4 nieuwe pagina's toegevoegd aan `/frontend/dist/`:

1. **race-results-index.html** - Hoofdpagina met navigatie en status dashboard
2. **team-riders-results.html** - Team overview met alle riders en stats
3. **individual-rider-results.html** - Gedetailleerde rider resultaten met vELO grafiek
4. **race-details.html** - Complete race event details met alle teamleden

## 🔗 Toegang

### Productie URL's:
- **Dashboard:** `https://yourdomain.com/race-results-index.html`
- **Team Overview:** `https://yourdomain.com/team-riders-results.html`

### Integratie met bestaande app:
Voeg een link toe aan je hoofdmenu of dashboard:
```html
<a href="/race-results-index.html">Race Results 🏁</a>
```

## 🔄 Scanner Configuratie

De race scanner draait automatisch elke 2 uur (120 minuten).

**Handmatig triggeren via API:**
```bash
curl -X POST https://yourdomain.com/api/admin/scan-race-results
```

**Status checken:**
```bash
curl https://yourdomain.com/api/admin/scan-status
```

## ⚙️ Backend API Endpoints

### Public Endpoints (geen auth vereist):
- `GET /api/results/team-riders` - Team overview
- `GET /api/results/rider/:riderId` - Individual rider results  
- `GET /api/results/event/:eventId` - Race event details

### Admin Endpoints:
- `POST /api/admin/scan-race-results` - Trigger scan
- `GET /api/admin/scan-status` - Scanner status + logs
- `POST /api/admin/scan-config` - Update scanner settings

## 📊 Database Tables

Reeds aangemaakt via Migration 013:
- `race_results` - Race resultaten opslag
- `race_scan_config` - Scanner instellingen
- `race_scan_log` - Audit trail

## ✅ Deployment Checklist

- [ ] SQL fix uitvoeren in Supabase (v_race_results_recent view)
- [ ] Nieuwe HTML files deployen naar productie
- [ ] Server herstarten (nieuwe endpoints activeren)
- [ ] Test race-results-index.html in browser
- [ ] Verificeer dat data inlaadt (kan 10-15 min duren voor eerste scan)
- [ ] Voeg link toe aan hoofdmenu voor gebruikers

## 🐛 Troubleshooting

**Geen data zichtbaar:**
- Check scan status: `/api/admin/scan-status`
- Eerste scan duurt 15-20 minuten (76 riders × 13s rate limit)
- Check logs in Supabase: `SELECT * FROM race_scan_log ORDER BY started_at DESC LIMIT 5`

**SQL Error "category does not exist":**
- Voer de SQL fix hierboven uit in Supabase

**429 Rate Limit Errors:**
- Normaal tijdens grote scans - systeem wacht automatisch 60s en retry't

## 📈 Performance

- **Rate limiting:** 13 seconden tussen calls (ZwiftRacing API limit: 5/min)
- **First scan:** 90 dagen history voor alle riders (~15-20 min)
- **Incremental scans:** Alleen nieuwe events sinds laatste scan + 6h overlap
- **Event deduplication:** Skip events die al in database staan

## 🔐 Geen Aparte Admin Pagina Nodig

De admin endpoints zijn toegankelijk via API calls. Als je een UI wilt:
- Voeg buttons toe aan de race-results-index.html
- Of integreer in bestaande admin dashboard
- Beveilig met je huidige auth systeem indien nodig
