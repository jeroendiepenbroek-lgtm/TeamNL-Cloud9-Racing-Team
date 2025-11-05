# 🔑 Railway Environment Variables - Exact Copy-Paste

## Ga naar Railway Dashboard
1. Open: https://railway.app/
2. Selecteer project: **airy-miracle**
3. Klik op service: **teamnl-cloud9-racing-team-production**
4. Ga naar tab: **Variables**
5. Klik: **+ New Variable**

---

## ✅ Voeg deze 4 variabelen toe:

### Variable 1
```
Key: SUPABASE_URL
Value: https://bktbeefdmrpxhsyyalvc.supabase.co
```

### Variable 2
```
Key: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU
```

### Variable 3
```
Key: ZWIFT_API_KEY
Value: 650c6d2fc4ef6858d74cbef1
```

### Variable 4
```
Key: NODE_ENV
Value: production
```

---

## 📋 Snelle Copy-Paste Tabel

| **Key (Variable Name)** | **Value** |
|-------------------------|-----------|
| `SUPABASE_URL` | `https://bktbeefdmrpxhsyyalvc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU` |
| `ZWIFT_API_KEY` | `650c6d2fc4ef6858d74cbef1` |
| `NODE_ENV` | `production` |

---

## 🎯 Stap-voor-stap instructies

### Stap 1: Voeg Variable 1 toe
1. Klik **+ New Variable**
2. Variable Reference Name: `SUPABASE_URL`
3. Value: `https://bktbeefdmrpxhsyyalvc.supabase.co`
4. Klik **Add**

### Stap 2: Voeg Variable 2 toe
1. Klik **+ New Variable**
2. Variable Reference Name: `SUPABASE_SERVICE_ROLE_KEY`
3. Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU`
4. Klik **Add**

### Stap 3: Voeg Variable 3 toe
1. Klik **+ New Variable**
2. Variable Reference Name: `ZWIFT_API_KEY`
3. Value: `650c6d2fc4ef6858d74cbef1`
4. Klik **Add**

### Stap 4: Voeg Variable 4 toe
1. Klik **+ New Variable**
2. Variable Reference Name: `NODE_ENV`
3. Value: `production`
4. Klik **Add**

---

## ✅ Verificatie na toevoegen

Railway zal automatisch **redeployen** na het toevoegen van variabelen.

**Wacht 2-3 minuten** en test dan:

```bash
curl https://teamnl-cloud9-racing-team-production.up.railway.app/health
```

**Verwacht resultaat:**
```json
{
  "status": "ok",
  "service": "TeamNL Cloud9 Backend",
  "timestamp": "2025-11-05T14:30:00.000Z",
  "version": "2.0.0-clean",
  "port": 8080
}
```

**Check ook de logs:**
- Railway dashboard → Service → Deployments → **View Logs**
- Zoek naar: "Server running on port 8080"
- Controleer dat er **geen "supabaseKey is required"** errors meer zijn

---

## ⚠️ Belangrijk

- **PORT** hoef je NIET toe te voegen - Railway set `$PORT` automatisch naar 8080
- Zorg dat er **geen spaties** voor of na de values staan
- `SUPABASE_SERVICE_ROLE_KEY` is heel lang - kopieer hem volledig!
- Alle keys zijn **case-sensitive** - gebruik exact deze namen

---

## 🚨 Troubleshooting

**Als deployment faalt:**
1. Check of alle 4 variabelen correct zijn toegevoegd
2. Kijk in Railway logs naar specifieke error messages
3. Verify geen typo's in de variable names
4. Test Supabase URL in browser: https://bktbeefdmrpxhsyyalvc.supabase.co (moet Supabase login page tonen)

**Als health check nog steeds faalt:**
- Wacht 5 minuten (Railway kan traag zijn met restart)
- Check of "intuitive-victory" project nog bestaat (DELETE die!)
- Kijk naar Railway build logs: moet "Build succeeded" tonen

---

## 🎉 Klaar!

Na het toevoegen van alle variabelen:
✅ Backend API werkt met Supabase connectie
✅ Geen crashes meer bij opstarten
✅ Ready voor data sync en dashboard features

**Volgende stap:** Delete "intuitive-victory" Railway project voor zero-cost!
