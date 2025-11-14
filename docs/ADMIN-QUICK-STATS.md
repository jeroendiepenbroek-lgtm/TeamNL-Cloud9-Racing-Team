# Admin Dashboard Quick Stats

**Locatie**: Admin Home (`/admin`)

## 📊 Quick Stats Overzicht

De Admin Dashboard toont 4 real-time statistieken onderaan de pagina:

### 1. Team Members 👥
**Wat**: Aantal actieve riders in het team  
**Bron**: `riders` tabel, gefilterd op `is_active = true`  
**Voorbeeld**: `75` riders

### 2. Active Users 👤
**Wat**: Aantal gebruikers met goedgekeurde toegang tot het dashboard  
**Bron**: `access_control` tabel, gefilterd op `status = 'approved'`  
**Voorbeeld**: `3` gebruikers

### 3. Last Sync 🔄
**Wat**: Tijd sinds laatste succesvolle sync (relatief formaat)  
**Bron**: `sync_logs` tabel, meest recente record met `status = 'success'`  
**Formaten**:
- `Just now` - Minder dan 1 minuut geleden
- `5m ago` - Minuten geleden
- `2h ago` - Uren geleden  
- `3d ago` - Dagen geleden
- `Never` - Nog nooit gesynchroniseerd

**Extra details**: Bij hover/click wordt aantal verwerkte records getoond

### 4. System Status ⚙️
**Wat**: Health check van het systeem  
**Waarden**:
- ✅ `healthy` - Alles werkt normaal
- ⚠️ `degraded` - Problemen gedetecteerd (toekomstige feature)

## 🔌 API Endpoint

### GET /api/admin/stats

**Response**:
```json
{
  "teamMembers": 75,
  "activeUsers": 3,
  "lastSync": "5m ago",
  "lastSyncDetails": {
    "timestamp": "2025-11-14T15:21:00.000Z",
    "endpoint": "POST /public/riders (bulk: 75 riders)",
    "recordsProcessed": 75
  },
  "systemStatus": "healthy"
}
```

**Rate Limiting**: Geen limiet, maar frontend pollt slechts elke 30 seconden

## 🔄 Auto-Refresh

De stats worden automatisch ververst:
- **Interval**: Elke 30 seconden
- **Methode**: `setInterval` in React useEffect
- **Cleanup**: Interval wordt gestopt bij unmount

## 💡 Use Cases

### Voor Team Managers
- **Team Members** - Zie hoeveel riders er in het team zitten
- **Last Sync** - Check of data up-to-date is

### Voor System Admins
- **Active Users** - Monitor wie toegang heeft
- **System Status** - Quick health check
- **Last Sync Details** - Zie welke endpoint laatst uitgevoerd werd

## 🎨 UI Design

```
┌─────────────────────────────────────┐
│         Quick Stats                 │
├────────┬────────┬────────┬──────────┤
│   75   │   3    │ 5m ago │    ✅    │
│ Team   │ Active │  Last  │  System  │
│Members │ Users  │  Sync  │  Status  │
└────────┴────────┴────────┴──────────┘
```

**Kleuren**:
- Team Members: Blue (`text-blue-600`)
- Active Users: Green (`text-green-600`)
- Last Sync: Purple (`text-purple-600`)
- System Status: Orange (`text-orange-600`)

## 🚀 Toekomstige Verbeteringen

1. **Click-through**: Stats klikbaar maken → navigeer naar detail pagina's
2. **Trends**: Toon delta (↑↓) ten opzichte van vorige waarde
3. **Alerts**: Waarschuwingen bij afwijkende waarden
4. **Custom timeframe**: Filter stats per dag/week/maand
5. **Export**: Download stats als CSV/JSON

## 🔧 Troubleshooting

**Stats tonen "--"**
- Check of `/api/admin/stats` endpoint bereikbaar is
- Verifieer Supabase connectie
- Check browser console voor errors

**Last Sync toont "Never"**
- Er zijn nog geen succesvolle syncs uitgevoerd
- Run handmatige sync via Sync Status pagina

**Team Members = 0**
- Er zijn nog geen riders toegevoegd
- Check `riders` tabel in Supabase
- Voeg riders toe via Team Management

**Active Users = 0**
- Nog geen access requests goedgekeurd
- Ga naar Access Requests pagina om users goed te keuren
