# 🧪 Railway API Test Commands

Nu je environment variables werken, test deze endpoints:

## Health Check (✅ WERKT AL!)
```bash
curl https://teamnl-cloud9-racing-team-production.up.railway.app/health
```
Response: {"status":"ok","service":"TeamNL Cloud9 Backend","timestamp":"2025-11-05T15:18:55.264Z","version":"2.0.0-clean","port":8080}

---

## 🏁 Test Club Endpoint (met Supabase!)
```bash
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/clubs/11818
```

**Verwacht**: JSON met TeamNL Cloud9 club data
- name: "TeamNL Cloud9"
- memberCount: aantal members
- description: club beschrijving

**Als dit werkt**: Supabase connectie is 100% OK! 🎉

---

## 👥 Test Riders Endpoint
```bash
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/riders?limit=5
```

**Verwacht**: Array met 5 riders, elk met:
- zwiftId
- name  
- ranking
- ftp
- wattsPerKg

---

## 📅 Test Events Endpoint
```bash
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/events/recent
```

**Verwacht**: Laatste events met eventId, eventDate, eventName

---

## 📊 Test Sync Logs
```bash
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/sync-logs?limit=10
```

**Verwacht**: Laatste 10 sync logs met:
- syncType (club/rider/event)
- status (success/error)
- recordsProcessed
- timestamp

---

## 🔄 Test Manual Sync (POST request)
```bash
curl -X POST https://teamnl-cloud9-racing-team-production.up.railway.app/api/clubs/11818/sync
```

**Verwacht**: 
```json
{
  "success": true,
  "message": "Club sync started",
  "clubId": 11818
}
```

**Check daarna sync logs** om te zien of sync succesvol was.

---

## 🌐 Test React Frontend

Open in browser:
- **Homepage**: https://teamnl-cloud9-racing-team-production.up.railway.app/
- **Dashboard**: https://teamnl-cloud9-racing-team-production.up.railway.app/
- **Clubs**: https://teamnl-cloud9-racing-team-production.up.railway.app/clubs
- **Riders**: https://teamnl-cloud9-racing-team-production.up.railway.app/riders
- **Events**: https://teamnl-cloud9-racing-team-production.up.railway.app/events
- **Sync**: https://teamnl-cloud9-racing-team-production.up.railway.app/sync

**Verwacht**: 
- Real-time health check badge (green/red)
- Navigation werkt tussen paginas
- Placeholder teksten voor komende features

---

## ⚠️ Als een endpoint NIET werkt:

1. **Check Railway logs**:
   ```
   Railway dashboard → Service → Deployments → View Logs
   ```

2. **Zoek naar errors**:
   - "Supabase" errors → Check SUPABASE_SERVICE_ROLE_KEY
   - "404 Not Found" → Endpoint bestaat mogelijk nog niet
   - "500 Internal" → Backend crash, check logs

3. **Test lokaal**:
   ```bash
   cd /workspaces/TeamNL-Cloud9-Racing-Team/backend
   npm run dev
   curl http://localhost:3000/api/clubs/11818
   ```

---

## 🎯 Success Criteria

✅ Health check: Status OK
✅ Club endpoint: Geeft club data
✅ Riders endpoint: Geeft riders array  
✅ React app: Toont dashboard
✅ No Supabase errors in logs

**Als alles werkt**: Je bent klaar voor feature development! 🚀

---

## 📈 Volgende features te bouwen:

1. **Club Overview Page** (`/clubs`)
   - Member count chart (Recharts)
   - Top 10 riders leaderboard (TanStack Table)
   - Manual sync button

2. **Riders Page** (`/riders`)
   - Sortable/filterable table
   - Export to CSV
   - Search functie

3. **Events Calendar** (`/events`)
   - Upcoming events lijst
   - Results view met podium

4. **Sync Dashboard** (`/sync`)
   - History table
   - Manual sync triggers
   - Success/error rates

Start met welke feature je wilt! 💪
