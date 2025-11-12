# Event Import Test - Voorbeelden

## Test 1: Single Event Import

Voorbeeld met een bekende ZRL event:

```bash
cd backend
npm run import:events -- 5129235
```

## Test 2: Multiple Events

Importeer meerdere events tegelijk:

```bash
cd backend
npm run import:events -- 5129235 5130456 5131789
```

## Test 3: Bekende TeamNL Cloud9 Events

Als je weet welke events jullie team doet, gebruik dan die IDs:

```bash
# Voorbeeld: WTRL Racing League events
npm run import:events -- <vervang_met_echte_ids>
```

## Hoe vind je Event IDs?

### Methode 1: Via ZwiftRacing.app
1. Ga naar https://www.zwiftracing.app/events
2. Vind een event waar jullie aan meedoen
3. Click op het event
4. URL: `https://www.zwiftracing.app/events/5129235`
5. Event ID = `5129235`

### Methode 2: Via Club Page
1. Ga naar https://www.zwiftracing.app/clubs/11818 (jullie club)
2. Zie upcoming events
3. Click event → Event ID in URL

### Methode 3: Via Rider Profile
1. Ga naar rider profile: https://www.zwiftracing.app/riders/150437
2. Check "Upcoming Events" section
3. Click event → Event ID in URL

## Verwachte Output

### Succesvol Import

```
🏁 TeamNL Cloud9 - Manual Event Import
============================================================
📋 Importing 1 event(s): 5129235

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

============================================================
✅ IMPORT COMPLETE

📊 Summary:
   - Events imported: 1/1
   - Team signups matched: 3

💡 View in dashboard: /events
```

### Event Niet Gevonden

```
📥 Fetching event 9999999...
  ❌ Event 9999999 not found
```

**Wat te doen:**
- Controleer of Event ID correct is
- Check of event bestaat op ZwiftRacing.app
- Probeer ander event

## Verifieer in Database

Na import, check Supabase:

### Events Table
```sql
SELECT * FROM events 
WHERE event_id = 5129235;
```

### Event Signups
```sql
SELECT 
  es.*,
  r.name as rider_name,
  r.zp_category
FROM event_signups es
JOIN riders r ON es.rider_id = r.rider_id
WHERE es.event_id = 5129235;
```

## Verifieer in Dashboard

1. Open: http://localhost:5173/events (dev) of production URL
2. Je zou nu de geïmporteerde events moeten zien
3. Met countdown timer
4. Met team riders lijst

## Troubleshooting

### "Cannot find module '@supabase/supabase-js'"

```bash
cd backend
npm install
```

### "SUPABASE_URL is not defined"

Zorg dat `.env` file bestaat in project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### "Rate limit exceeded"

Wacht even en probeer opnieuw. Script heeft ingebouwde delays maar bij veel requests kan rate limit nog steeds optreden.

## Next Steps

Na succesvolle import:

1. **Bekijk Events Page**
   ```
   Open dashboard → Events
   ```

2. **Import meer events**
   ```bash
   npm run import:events -- <meer_event_ids>
   ```

3. **Setup cron job** (optioneel)
   - Automatische daily sync
   - Zie docs/EVENT_SYNC_GUIDE.md

4. **Sync results** (na afloop events)
   - Later: Feature 2 (Results Page)

## Real-World Example

### WTRL Racing League Import

Als TeamNL Cloud9 meedoet aan WTRL Week 5:

1. Ga naar WTRL schedule
2. Vind jullie division events
3. Noteer Event IDs
4. Import:

```bash
npm run import:events -- 5135678 5135679 5135680
```

Dit importeert alle 3 events voor jullie teams (A, B, C divisions) in één keer!
