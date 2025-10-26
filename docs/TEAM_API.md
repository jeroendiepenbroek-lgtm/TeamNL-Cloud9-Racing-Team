# Team Management API

API endpoints voor team management, rider toevoegen (single & bulk), en automatische data sync.

## Endpoints

### POST /api/team
Maak een nieuw team aan.

**Request Body:**
```json
{
  "name": "TeamNL Cloud9",
  "description": "Nederlands top racing team",
  "autoSyncEnabled": true,
  "syncIntervalMinutes": 60
}
```

**Response:**
```json
{
  "message": "Team aangemaakt",
  "team": {
    "id": 1,
    "name": "TeamNL Cloud9",
    "description": "Nederlands top racing team",
    "isActive": true,
    "autoSyncEnabled": true,
    "syncIntervalMinutes": 60,
    "createdAt": "2025-10-23T12:00:00.000Z",
    "updatedAt": "2025-10-23T12:00:00.000Z",
    "members": []
  }
}
```

---

### GET /api/team
Haal alle teams op.

**Response:**
```json
[
  {
    "id": 1,
    "name": "TeamNL Cloud9",
    "description": "Nederlands top racing team",
    "members": [
      {
        "id": 1,
        "rider": {
          "zwiftId": 150437,
          "name": "JRøne | CloudRacer-9 @YouTube"
        }
      }
    ]
  }
]
```

---

### GET /api/team/:teamId
Haal team details op met alle members.

**Response:**
```json
{
  "id": 1,
  "name": "TeamNL Cloud9",
  "description": "Nederlands top racing team",
  "isActive": true,
  "autoSyncEnabled": true,
  "syncIntervalMinutes": 60,
  "members": [
    {
      "id": 1,
      "teamId": 1,
      "riderId": 1,
      "role": "member",
      "notes": "Main rider",
      "syncStatus": "synced",
      "lastSyncedAt": "2025-10-23T12:30:00.000Z",
      "addedAt": "2025-10-23T12:00:00.000Z",
      "rider": {
        "id": 1,
        "zwiftId": 150437,
        "name": "JRøne | CloudRacer-9 @YouTube",
        "ftp": 270,
        "ftpWkg": 3.65,
        "categoryRacing": "B",
        "club": {
          "id": 11818,
          "name": "TeamNL Cloud9 Racing Team"
        },
        "statistics": {
          "totalRaces": 22,
          "totalWins": 0,
          "avgPosition": 41.9
        }
      }
    }
  ]
}
```

---

### GET /api/team/:teamId/stats
Haal geaggregeerde team statistieken op.

**Response:**
```json
{
  "team": {
    "id": 1,
    "name": "TeamNL Cloud9",
    "description": "Nederlands top racing team"
  },
  "stats": {
    "totalMembers": 5,
    "avgFtp": 285.5,
    "avgWkg": 3.82,
    "totalRaces": 147,
    "totalWins": 3
  },
  "syncStatus": {
    "synced": 4,
    "pending": 1,
    "error": 0
  }
}
```

---

### POST /api/team/:teamId/members/:zwiftId
Voeg een enkele rider toe aan team.

**Request Body (optioneel):**
```json
{
  "role": "captain",
  "notes": "Team captain, strong climber"
}
```

**Response:**
```json
{
  "message": "Rider 150437 toegevoegd aan team (sync loopt in achtergrond)",
  "member": {
    "id": 5,
    "teamId": 1,
    "riderId": 1,
    "role": "captain",
    "notes": "Team captain, strong climber",
    "syncStatus": "pending",
    "addedAt": "2025-10-23T12:00:00.000Z"
  }
}
```

**Wat gebeurt er automatisch:**
1. Rider data wordt opgehaald van Zwift API
2. Rider wordt toegevoegd/bijgewerkt in database
3. Member wordt toegevoegd aan team
4. Background sync wordt gestart (90-dagen race history)

---

### POST /api/team/:teamId/members
Voeg meerdere riders bulk toe aan team.

**Request Body:**
```json
{
  "zwiftIds": [150437, 123456, 789012],
  "role": "member",
  "batchSize": 5
}
```

**Response:**
```json
{
  "message": "Bulk add voltooid: 2 toegevoegd, 1 overgeslagen, 0 gefaald",
  "results": {
    "added": [150437, 123456],
    "skipped": [789012],
    "failed": []
  }
}
```

**Rate Limiting:**
- Verwerkt in batches van `batchSize` (default: 5)
- 2 seconden delay tussen riders binnen batch
- 15 seconden delay tussen batches
- Respecteert Zwift API rate limits (5 calls/min voor single riders)

---

### DELETE /api/team/:teamId/members/:zwiftId
Verwijder een rider uit team.

**Response:**
```json
{
  "message": "Rider 150437 verwijderd uit team"
}
```

---

### POST /api/team/:teamId/sync
Trigger handmatige sync voor alle pending team members.

**Response:**
```json
{
  "message": "Team sync voltooid",
  "results": {
    "synced": 3,
    "failed": 0,
    "total": 3
  }
}
```

**Wat wordt er gesynchroniseerd:**
- Rider profile data (FTP, weight, category, etc.)
- 90-dagen race history
- Race results met performance metrics

---

### DELETE /api/team/:teamId
Verwijder een team (en alle members).

**Response:**
```json
{
  "message": "Team 1 verwijderd"
}
```

**Let op:** Dit verwijdert alleen team memberships, niet de riders zelf.

---

## Workflow: Team Setup

### 1. Maak een team aan
```bash
curl -X POST http://localhost:3000/api/team \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TeamNL Cloud9",
    "description": "Nederlands top racing team",
    "autoSyncEnabled": true
  }'
```

### 2. Voeg riders toe (bulk)
```bash
curl -X POST http://localhost:3000/api/team/1/members \
  -H "Content-Type: application/json" \
  -d '{
    "zwiftIds": [150437, 123456, 789012, 456789, 234567],
    "role": "member"
  }'
```

### 3. Check team status
```bash
curl http://localhost:3000/api/team/1/stats
```

### 4. Trigger sync voor pending members
```bash
curl -X POST http://localhost:3000/api/team/1/sync
```

### 5. Bekijk team details
```bash
curl http://localhost:3000/api/team/1
```

---

## Sync Status

Members hebben een `syncStatus` veld:

- **`pending`**: Member toegevoegd, sync nog niet gestart
- **`syncing`**: Sync loopt momenteel
- **`synced`**: Sync succesvol voltooid
- **`error`**: Sync gefaald (zie `syncError` voor details)

---

## Rate Limits & Best Practices

### Zwift API Limits
- Single rider: **5 calls/min**
- Bulk riders: **1 call/15min** (max 1000 IDs)
- Results: **1 call/min**

### Aanbevelingen
1. **Gebruik bulk add** voor grote teams (>10 riders)
2. **Laat auto-sync aan** voor reguliere updates
3. **Monitor sync status** via `/api/team/:teamId/stats`
4. **Retry gefaalde syncs** met `/api/team/:teamId/sync`

### Bulk Import Strategy
Voor grote teams (50+ riders):
- Split in batches van 10-20 riders
- Wacht 5-10 minuten tussen batches
- Monitor logs voor rate limit warnings

---

## Error Handling

### Common Errors

**400 Bad Request**
```json
{
  "error": "zwiftIds array is verplicht en mag niet leeg zijn"
}
```

**404 Not Found**
```json
{
  "error": "Team 99 not found"
}
```

**Rate Limit (tijdens sync)**
```json
{
  "message": "Bulk add voltooid: 3 toegevoegd, 0 overgeslagen, 2 gefaald",
  "results": {
    "failed": [
      {
        "zwiftId": 123456,
        "error": "Could not fetch rider 123456 from Zwift API"
      }
    ]
  }
}
```

---

## Database Schema

### Team
```typescript
{
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
}
```

### TeamMember
```typescript
{
  id: number;
  teamId: number;
  riderId: number;
  role: string; // 'captain', 'member', 'reserve'
  notes?: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  syncError?: string;
  lastSyncedAt?: Date;
  addedAt: Date;
  updatedAt: Date;
}
```

---

## Next Steps

1. ✅ Team management API endpoints (implemented)
2. ✅ Bulk add with rate limiting (implemented)
3. ✅ Background sync (implemented)
4. 🔄 CLI tool voor CSV imports
5. 🔄 Auto-sync scheduler (cron job)
6. 🔄 Frontend team management UI

---

## Support

Voor vragen of problemen:
- Check logs: `/api/sync/logs`
- Check sync status: `/api/team/:teamId/stats`
- Handmatige retry: `/api/team/:teamId/sync`
