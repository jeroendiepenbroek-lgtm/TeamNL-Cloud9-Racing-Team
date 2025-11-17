# Sync Scheduler - Gebruikershandleiding

## 📋 Overzicht

De **Sync Scheduler** is een moderne, interactieve interface voor het beheren van alle sync operaties van TeamNL Cloud9 Racing Team. Het biedt real-time monitoring, handmatige triggers en configuratie-opties voor de 3 sync types.

## 🚀 Toegang

**URL**: `http://localhost:3000/sync-scheduler.html` (development)  
**URL**: `https://your-domain.com/sync-scheduler.html` (production)

## 🎯 Features

### 1. **Drie Sync Types**

#### 👥 Rider Sync
- **Doel**: Synchroniseer team members vanuit ZwiftRacing.app club
- **Interval**: Elke 6 uur (standaard 360 min)
- **Cron**: `0 */6 * * *` (draait om 00:00, 06:00, 12:00, 18:00)
- **API**: `POST /api/sync/riders`
- **Metrics**:
  - Riders verwerkt
  - Sync tijd (seconden)
  - Laatste sync timestamp

#### ⚡ Near Event Sync
- **Doel**: Synchroniseer events binnen 2 uur met hoge frequentie
- **Interval**: Elke 15 minuten (standaard)
- **Threshold**: 120 minuten (events binnen 2 uur)
- **Cron**: `5,20,35,50 * * * *` (draait op :05, :20, :35, :50)
- **API**: `POST /api/sync/events/near`
- **Metrics**:
  - Near events count
  - Signups gesynchroniseerd
  - Laatste sync timestamp

#### 🔭 Far Event Sync
- **Doel**: Synchroniseer toekomstige events (alleen nieuwe events!)
- **Interval**: Elke 2 uur (standaard 120 min)
- **Lookforward**: 48 uur vooruit
- **Cron**: `30 */2 * * *` (draait om 00:30, 02:30, 04:30, etc.)
- **API**: `POST /api/sync/events/far`
- **Efficiency**: Alleen nieuwe events worden gesynchroniseerd (niet opnieuw bestaande)
- **Metrics**:
  - Far events count
  - Efficiency percentage
  - Laatste sync timestamp

### 2. **Interactieve Configuratie**

Elke sync type heeft configureerbare parameters:

```typescript
// Rider Sync
{
  interval: 60-1440 minuten (standaard: 360)
}

// Near Event Sync
{
  interval: 5-60 minuten (standaard: 15)
  threshold: 30-240 minuten (standaard: 120)
}

// Far Event Sync
{
  interval: 60-360 minuten (standaard: 120)
  lookforward: 24-72 uren (standaard: 48)
}
```

**Configuratie wijzigen**:
1. Pas de waarden aan in de input velden
2. Klik op "💾 Opslaan" button
3. Configuratie wordt direct opgeslagen naar database
4. ⚠️ **Let op**: Cron schedules worden NIET automatisch aangepast - server herstart vereist

### 3. **Handmatige Sync Triggers**

Elke sync type kan handmatig getriggerd worden:

- **Rider Sync**: Klik "▶️ Sync Nu" → Triggert `POST /api/sync/riders`
- **Near Event Sync**: Klik "▶️ Sync Nu" → Triggert `POST /api/sync/events/near`
- **Far Event Sync**: Klik "▶️ Sync Nu" → Triggert `POST /api/sync/events/far`

**Real-time feedback**:
- Button toont "⏳ Syncing..." tijdens uitvoering
- Status badge verandert naar "🔵 Running..."
- Live logs tonen voortgang
- Metrics worden automatisch bijgewerkt na voltooiing

### 4. **Sync Coordinator Status**

Monitor de status van de sync coordinator:

```typescript
{
  isRunning: boolean,        // Is er momenteel een sync actief?
  currentSlot: string,       // Welke sync draait er nu?
  queueLength: number,       // Hoeveel syncs in wachtrij?
  lastSync: timestamp        // Wanneer was laatste sync?
}
```

**Auto-refresh**: Status wordt elke 5 seconden automatisch ververst

### 5. **Live Sync Logs**

Real-time logging van alle sync operaties:

```
[12:34:56] 🚀 RIDERS sync gestart...
[12:35:12] ✅ RIDERS sync voltooid - {"riders_processed":50,"duration_ms":16234}
[12:35:15] 🚀 EVENTS/NEAR sync gestart...
[12:35:30] ✅ EVENTS/NEAR sync voltooid - {"events_near":5,"signups_synced":47}
```

**Log types**:
- 🔵 **INFO**: Algemene informatie
- ✅ **SUCCESS**: Succesvolle operaties
- ⚠️ **WARNING**: Waarschuwingen
- ❌ **ERROR**: Fouten

**Log management**:
- Maximaal 100 logs worden bewaard
- Oudste logs worden automatisch verwijderd
- "🗑️ Wissen" button om alle logs te wissen

## 🔧 API Endpoints

### POST /api/sync/riders
Trigger rider sync handmatig.

**Request**: Geen body vereist  
**Response**:
```json
{
  "message": "Rider sync completed",
  "metrics": {
    "type": "RIDER_SYNC",
    "timestamp": "2025-11-17T12:00:00.000Z",
    "riders_processed": 50,
    "riders_updated": 3,
    "riders_new": 2,
    "duration_ms": 16234,
    "status": "success",
    "error_count": 0
  }
}
```

### POST /api/sync/events/near
Trigger near event sync handmatig.

**Request**: Geen body vereist  
**Response**:
```json
{
  "message": "Near event sync completed",
  "metrics": {
    "type": "NEAR_EVENT_SYNC",
    "events_near": 5,
    "signups_synced": 47,
    "duration_ms": 12456,
    "status": "success"
  }
}
```

### POST /api/sync/events/far
Trigger far event sync handmatig (met efficiency optimalisatie).

**Request**: Geen body vereist  
**Response**:
```json
{
  "message": "Far event sync completed",
  "metrics": {
    "type": "FAR_EVENT_SYNC",
    "events_far": 287,
    "events_scanned": 300,
    "signups_synced": 15,
    "new_events": 5,
    "skipped_events": 282,
    "duration_ms": 8234,
    "status": "success"
  }
}
```

**Efficiency**: Alleen nieuwe events worden gesynchroniseerd! 
- `new_events`: Aantal events dat gesynchroniseerd is
- `skipped_events`: Aantal bestaande events die overgeslagen zijn
- Dit scheelt enorm in API calls (van ~300 naar ~5-10 per run)

### GET /api/sync/coordinator/status
Haal sync coordinator status op.

**Response**:
```json
{
  "isRunning": true,
  "currentSlot": "NEAR_EVENT_SYNC",
  "queueLength": 0,
  "lastSync": "2025-11-17T12:05:00.000Z",
  "nextSlots": {
    "RIDER_SYNC": "18:00:00",
    "NEAR_EVENT_SYNC": "12:20:00",
    "FAR_EVENT_SYNC": "14:30:00"
  }
}
```

### GET /api/sync/config
Haal huidige sync configuratie op.

**Response**:
```json
{
  "riderSyncIntervalMinutes": 360,
  "nearEventSyncIntervalMinutes": 15,
  "nearEventThresholdMinutes": 120,
  "farEventSyncIntervalMinutes": 120,
  "lookforwardHours": 48
}
```

### PUT /api/sync/config
Update sync configuratie.

**Request**:
```json
{
  "riderSyncIntervalMinutes": 480,
  "nearEventThresholdMinutes": 90
}
```

**Response**:
```json
{
  "success": true,
  "config": {
    "riderSyncIntervalMinutes": 480,
    "nearEventSyncIntervalMinutes": 15,
    "nearEventThresholdMinutes": 90,
    "farEventSyncIntervalMinutes": 120,
    "lookforwardHours": 48
  }
}
```

## 📊 Monitoring & Troubleshooting

### Status Badges

- **⚪ Inactief**: Sync is niet actief
- **🔵 Running...**: Sync is bezig
- **🟢 Voltooid**: Sync succesvol afgerond (3 sec timeout)
- **🔴 Error**: Sync gefaald

### Metrics Interpretatie

**Rider Sync**:
- `riders_processed`: Totaal aantal riders verwerkt
- `duration`: Verwacht <30 seconden voor ~50 riders

**Near Event Sync**:
- `events_near`: Aantal events binnen threshold (verwacht 5-15)
- `signups_synced`: Totaal aantal signups (verwacht 30-100)
- `duration`: Verwacht <20 seconden

**Far Event Sync**:
- `events_far`: Totaal aantal far events (verwacht 200-300)
- `efficiency`: Percentage nieuwe events (verwacht 1-5%)
- `duration`: Verwacht <10 seconden (dankzij efficiency optimalisatie!)

### Veelvoorkomende Problemen

#### ❌ "Sync failed: HTTP 429"
**Oorzaak**: Rate limit bereikt  
**Oplossing**: 
- Wacht minimaal 60 min voor volgende rider sync
- Near event sync: max 1/min
- Far event sync: max 1/min

#### ❌ "Coordinator status niet beschikbaar"
**Oorzaak**: Backend server draait niet  
**Oplossing**: 
```bash
cd backend
npm run dev
```

#### ⚠️ "Configuratie opslaan gefaald"
**Oorzaak**: Database connectie probleem  
**Oplossing**: Check `DATABASE_URL` in `.env`

#### 🔵 Sync blijft hangen op "Running..."
**Oorzaak**: Sync duurt langer dan verwacht (mogelijk rate limit)  
**Oplossing**: 
- Check logs in terminal: `docker logs <container-id>`
- Check sync_logs tabel: `SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 10`

## 🎨 UI Componenten

### Card Layout
Elke sync type heeft zijn eigen card met:
- **Header**: Icoon, naam, status badge
- **Configuratie sectie**: Interval, threshold, cron schema
- **Metrics display**: Real-time statistieken
- **Actions**: Sync Nu, Opslaan buttons

### Color Scheme
- **Primary**: `#667eea` (Sync triggers)
- **Success**: `#48bb78` (Succesvolle operaties)
- **Warning**: `#ed8936` (Waarschuwingen)
- **Danger**: `#f56565` (Errors)
- **Secondary**: `#cbd5e0` (Secundaire acties)

### Responsive Design
- Desktop: 3-kolom grid voor sync cards
- Tablet: 2-kolom grid
- Mobile: 1-kolom stack

## 🔐 Beveiliging

**Momenteel**: Geen authenticatie vereist (development)

**Production**: Implementeer authenticatie:
```typescript
// middleware/auth.ts
export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// In server.ts
app.use('/api/sync', requireAuth, syncV2Router);
```

## 📝 Best Practices

1. **Manual Triggers**: Gebruik alleen voor testing of noodgevallen
2. **Config Changes**: Test eerst in development voor production deployment
3. **Log Monitoring**: Check regelmatig logs voor onverwachte errors
4. **Efficiency Metrics**: Monitor far event efficiency (moet >95% zijn)
5. **Rate Limits**: Respecteer altijd de API limits (zie docs/API.md)

## 🚀 Deployment Checklist

- [ ] HTML file staat in `backend/public/sync-scheduler.html`
- [ ] Backend server draait en bereikbaar
- [ ] Database connectie werkt
- [ ] Alle sync endpoints reageren (test met Postman)
- [ ] Cron jobs zijn actief in server.ts
- [ ] Sync coordinator draait
- [ ] Rate limiter is geconfigureerd
- [ ] CORS instellingen correct voor frontend domein

## 🆘 Support

Bij problemen:
1. Check browser console voor JavaScript errors
2. Check backend logs: `docker logs <container-id>`
3. Check database: `SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 20`
4. Documentatie: `docs/API.md`, `docs/SYNC_CONFIGURATION.md`

## 🎉 Features Roadmap

- [ ] Real-time WebSocket updates (live metrics zonder refresh)
- [ ] Sync geschiedenis grafiek (laatste 24 uur)
- [ ] Email notificaties bij sync failures
- [ ] Advanced filtering in logs (filter op type, status)
- [ ] Export logs naar CSV
- [ ] Bulk sync operations (alle 3 types tegelijk)
- [ ] Custom cron configuratie via UI (zonder server restart)

---

**Laatste update**: 17 november 2025  
**Versie**: 1.0.0  
**Auteur**: TeamNL Cloud9 Development Team
