# Event Signups Sync - Feature 1

Scripts voor het ophalen van event data en matchen van sign-ups met riders in de database.

## 📋 Overzicht

Twee methodes om event data te importeren:

1. **Automatische Sync** - Scant alle riders voor upcoming events
2. **Handmatige Import** - Import specifieke events by ID

## 🚀 Quick Start

### Methode 1: Handmatige Import (Aanbevolen)

Importeer specifieke events waarvan je weet dat het team meedoet:

```bash
cd backend
npm run import:events -- 5129235 5130456 5131789
```

**Waar vind je Event IDs?**
- ZwiftRacing.app URL: `https://www.zwiftracing.app/events/5129235`
- Het getal aan het eind is de Event ID: `5129235`

**Wat doet het?**
1. Haalt event details op van ZwiftRacing.app
2. Slaat event op in `events` table
3. Haalt deelnemerslijst op
4. Matched deelnemers met riders in database
5. Creëert `event_signups` records voor team members

### Methode 2: Automatische Sync

Scant alle riders in database voor upcoming events:

```bash
cd backend
npm run sync:event-signups

# Custom timeframe (default: 48 hours)
npm run sync:event-signups -- --hours=72
```

**Let op:** Deze methode is beperkt door ZwiftRacing.app API limitaties. Handmatige import is betrouwbaarder.

## 📊 Output Voorbeeld

```
🏁 TeamNL Cloud9 - Manual Event Import
============================================================
📋 Importing 2 event(s): 5129235, 5130456

📋 Loading team riders...
✅ Found 74 riders in database

📥 Fetching event 5129235...
  📅 WTRL Racing League - Division 1
  🕐 2025-11-15T19:00:00Z
  📍 Watopia Volcano Circuit
  ✓ Event saved to database
  👥 Found 48 signups/results
  📝 Matching with team riders...
    ✓ John Doe (A)
    ✓ Jane Smith (A)
    ✓ Mike Johnson (B)

📥 Fetching event 5130456...
  📅 ZRL Season 12 - Week 3
  🕐 2025-11-16T20:00:00Z
  📍 Yorkshire UCI Circuit
  ✓ Event saved to database
  👥 Found 52 signups/results
  📝 Matching with team riders...
    ✓ Sarah Williams (B)
    ✓ Tom Brown (C)

============================================================
✅ IMPORT COMPLETE

📊 Summary:
   - Events imported: 2/2
   - Team signups matched: 5

💡 View in dashboard: /events
```

## 🗄️ Database Schema

### Events Table
```sql
events (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_type TEXT,
  description TEXT,
  route TEXT,
  distance_meters INTEGER,
  organizer TEXT,
  event_url TEXT,
  category_enforcement BOOLEAN,
  zwift_event_id BIGINT,
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

### Event Signups Table
```sql
event_signups (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,
  rider_id BIGINT NOT NULL,
  signup_date TIMESTAMPTZ,
  category TEXT,
  status TEXT,
  team_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(event_id, rider_id)
)
```

## 🔄 Workflow

### Typische Use Case: Nieuwe Race Week

1. **Vind aankomende events**
   - Check WTRL League schedule
   - Check ZwiftRacing.app voor team races
   - Noteer Event IDs

2. **Import events**
   ```bash
   npm run import:events -- 5129235 5130456 5131789
   ```

3. **Verifieer in dashboard**
   - Open `/events` pagina
   - Check of team riders zichtbaar zijn
   - Countdown timer toont tijd tot event

4. **Auto-refresh**
   - Dashboard refresht elke 5 minuten
   - Countdown updates automatisch

## 🔧 Troubleshooting

### Event niet gevonden (404)
```
❌ Event 5129235 not found
```
**Oplossing:** 
- Check of Event ID correct is
- Controleer of event bestaat op ZwiftRacing.app
- Event is mogelijk verwijderd of privé

### Geen signups gevonden
```
👥 Found 0 signups/results
```
**Mogelijke oorzaken:**
- Event heeft nog geen inschrijvingen
- Inschrijvingen zijn niet publiek
- API endpoint niet beschikbaar

**Oplossing:** Probeer later opnieuw of voeg handmatig toe via dashboard.

### Database connection error
```
❌ Error saving event: connection refused
```
**Oplossing:**
- Check `.env` file: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- Verify Supabase project is online
- Check network connectivity

## 📝 API Endpoints Gebruikt

### ZwiftRacing.app Public API

- **Event Details:** `GET /api/events/{eventId}`
- **Event Results:** `GET /api/events/{eventId}/results`
- **Rider Results:** `GET /api/riders/{riderId}/results`

Rate limits onbekend - scripts gebruiken conservatieve delays (500-1000ms).

## 🎯 Next Steps

Na succesvolle import:

1. **Bekijk Events Page:** `/events` route
2. **Sync Results:** Na afloop van events, sync results via results page
3. **Automatische Sync:** Overweeg cron job voor daily sync
4. **Notifications:** Future: Discord/email alerts voor upcoming events

## 🚨 Belangrijke Notes

### API Limitaties
- ZwiftRacing.app heeft **geen** dedicated "upcoming events" endpoint
- Event discovery is beperkt
- **Handmatige import** is meest betrouwbaar
- Future improvement: Web scraping van events page

### Data Matching
- Script matched riders op `rider_id` (Zwift ID)
- Alleen riders in `riders` table worden gematched
- Sync nieuwe riders eerst: `npm run sync:riders`

### Sign-up Status
- `confirmed` - Rider is ingeschreven
- `tentative` - Mogelijk aanwezig
- `cancelled` - Afgemeld

Script gebruikt standaard `confirmed` voor alle matches.

## 🔮 Future Improvements

- [ ] Web scraping van ZwiftRacing.app /events page
- [ ] Integration met ZwiftPower API
- [ ] Automatic daily sync via cron
- [ ] Discord notifications voor nieuwe events
- [ ] Conflict detection (rider in 2 events zelfde tijd)
- [ ] Team roster suggestions based on signups

## 📚 Related Documentation

- **Feature Roadmap:** `/docs/FEATURE_ROADMAP_V1.5.md`
- **API Documentation:** `/docs/API.md`
- **Database Schema:** `/supabase/migrations/009_event_signups.sql`
