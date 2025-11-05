# 💰 Cost Monitoring & Zero-Cost Workflow

## 🎯 Doel: Blijf binnen Railway Free Tier ($5/maand)

**Datum setup**: 5 november 2025  
**Trial eindigt**: ~5 december 2025  
**Verwachte kosten**: $2-3/maand (ruim onder $5 limiet)

---

## 📊 Railway Cost Monitoring

### Dashboard Checks (wekelijks)

**1. Railway Dashboard → Usage**
- Ga naar: https://railway.app/account/usage
- Check huidige maand usage:
  - **CPU**: Moet < 500 uur/maand blijven
  - **RAM**: Moet < 8 GB-uur/dag blijven
  - **Network**: Moet < 100 GB/maand blijven
  - **Total cost**: Moet < $5.00 blijven

**2. Project Overview**
- Ga naar: https://railway.app/project/[jouw-project-id]
- Check "Estimated cost this month"
- Alarm als > $4.00 (90% van limiet)

### Email Alerts Setup

**Stap 1: Railway notificaties inschakelen**
```
1. Railway Dashboard → Account Settings
2. Notifications → Email alerts
3. Enable: "Usage threshold alerts"
4. Set threshold: $4.00 (80% van $5 free tier)
```

**Stap 2: Verify alleen 1 actief project**
```bash
# Check via Railway CLI
railway projects

# Expected output: alleen "airy-miracle" of je hoofdproject
# Als je meer ziet: delete oude/ongebruikte projects!
```

---

## 🚨 Cost Alert Triggers

### ⚠️ WAARSCHUWING ($3.00 - $4.00)
**Actie**: Review usage dashboard  
**Mogelijke oorzaken**:
- Meer traffic dan verwacht
- Memory leaks (server restart problemen)
- Dubbele deployments (check "intuitive-victory" deleted is!)

**Fix**:
```bash
# Check Railway logs voor crashes/restarts
railway logs

# Check memory usage
railway status
```

### 🔴 ALARM ($4.00 - $5.00)
**Actie**: Direct onderzoeken!  
**Mogelijke oorzaken**:
- DOS attack / bot traffic
- Infinite loop in code
- Oude deployment nog actief

**Fix**:
```bash
# Stop alle services tijdelijk
railway down

# Check wat er aan de hand is
railway logs --limit 1000

# Als nodig: delete dubbele projects
```

### 🛑 LIMIET BEREIKT ($5.00)
**Actie**: Services worden gepauzeerd  
**Oplossingen**:
1. **Quick fix**: Voeg credit card toe (pay-as-you-go)
2. **Gratis blijven**: Wacht tot volgende maand (reset naar $5 credit)
3. **Migratie**: Overweeg alternatieve hosting (Fly.io, Render)

---

## 📈 Expected Usage Pattern

### Normale maand (weinig traffic):
```
CPU:        50-100 uur/maand     ($0.50 - $1.00)
RAM:        2-4 GB-uur/dag       ($0.60 - $1.20)  
Network:    1-5 GB/maand         ($0.10 - $0.50)
TOTAL:      ~$1.20 - $2.70/maand ✅
```

### Drukke maand (meer traffic):
```
CPU:        200-300 uur/maand    ($2.00 - $3.00)
RAM:        6-8 GB-uur/dag       ($1.80 - $2.40)
Network:    10-20 GB/maand       ($1.00 - $2.00)
TOTAL:      ~$4.80 - $7.40/maand ⚠️ (over limiet!)
```

---

## 🔍 Weekly Checklist (elke maandag)

```markdown
## Week [DATUM]

- [ ] Check Railway dashboard usage
- [ ] Current month cost: $_____
- [ ] Percentage van limiet: ____%
- [ ] Aantal actieve projects: _____ (moet 1 zijn!)
- [ ] Health check passed: https://teamnl-cloud9-racing-team-production.up.railway.app/health
- [ ] Onverwachte spikes gezien: Ja/Nee
- [ ] Actie nodig: Ja/Nee

Notes: ___________
```

---

## 💡 Cost Optimization Tips

### 1. **Gebruik Supabase Free Tier correct**
- Supabase: 500 MB storage gratis
- 2 GB bandwidth/maand gratis
- Als je over Supabase limiet gaat → Railway blijft gratis!

### 2. **Optimaliseer API calls**
- Cache API responses (TanStack Query doet dit al)
- Rate limiting op backend (voorkomt DOS)
- Lazy load data (niet alles in 1x ophalen)

### 3. **Monitor Memory Leaks**
```bash
# Check of server regelmatig restart (teken van memory leak)
railway logs | grep -i "restart\|crash\|oom"

# Expected: geen of max 1-2 restarts per week
```

### 4. **Reduce Build Time**
- Pre-build dist/ folder (doen we al)
- Cache node_modules waar mogelijk
- Korte build time = minder CPU cost

---

## 🆘 Emergency Stop

**Als kosten uit de hand lopen:**

```bash
# 1. Stop alle Railway deployments direct
railway down

# 2. Check wat er aan de hand is
railway status
railway logs

# 3. Delete project als nodig (extreme maatregel)
railway delete

# 4. Maak nieuwe project aan (fresh start)
```

---

## 📅 Important Dates

**Trial Start**: 5 november 2025  
**Trial End**: ~5 december 2025  
**Action required**: Credit card toevoegen OF accepteren dat services pauzeren

**Reminder setup**:
- Week voor trial eindigt: Email reminder
- 3 dagen voor trial eindigt: Beslissing maken (upgrade of migreren)

---

## 🔗 Useful Links

- **Railway Usage Dashboard**: https://railway.app/account/usage
- **Railway Pricing**: https://railway.app/pricing
- **Project Dashboard**: https://railway.app/dashboard
- **Support**: https://railway.app/help

---

## ✅ Verificatie - Is Zero-Cost actief?

**Checklist NU doen:**

1. [ ] Ga naar Railway dashboard
2. [ ] Verify aantal projecten = 1 (alleen "airy-miracle")
3. [ ] "intuitive-victory" is DELETED
4. [ ] Current month usage < $1.00
5. [ ] Email notificaties enabled
6. [ ] Bookmark deze pagina voor wekelijkse check

**Als alles ✅ → Je bent goed! Blijf binnen $5/maand** 🎉
