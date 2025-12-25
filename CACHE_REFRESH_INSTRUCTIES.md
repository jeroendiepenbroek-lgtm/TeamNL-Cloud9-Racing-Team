# 🔄 Browser Cache Refresh Instructies

## Probleem
De nieuwe [+Add] button functionaliteit is **WEL** gedeployed op productie, maar je browser toont de oude versie door caching.

## ✅ Verificatie: Code staat OP productie
- Commit: `fd7610f` succesvol gedeployed
- Bundle: `index-DKOM9nu5.js` (532KB) correct op server
- `showAddButton` en `onAddRider` aanwezig in bundle

## 🔧 Oplossingen (kies één):

### Methode 1: Hard Refresh (Snelst)
**Windows/Linux:**
- Chrome/Edge: `Ctrl + Shift + R` of `Ctrl + F5`
- Firefox: `Ctrl + Shift + R`

**Mac:**
- Chrome/Edge/Safari: `Cmd + Shift + R`
- Firefox: `Cmd + Shift + R`

### Methode 2: Clear Cache & Hard Reload (Aanbevolen)
**Chrome/Edge:**
1. Open DevTools (`F12`)
2. Klik rechts op refresh knop
3. Kies **"Empty Cache and Hard Reload"**

**Firefox:**
1. Open DevTools (`F12`)
2. Klik rechts op refresh knop  
3. Kies **"Hard Refresh"**

### Methode 3: Incognito/Private Window
- Open nieuwe incognito/private window
- Ga naar: https://teamnl-cloud9-racing-team-production.up.railway.app
- Test de functionaliteit

### Methode 4: Clear Browser Cache
**Chrome/Edge:**
1. `Ctrl+Shift+Delete` (Windows) of `Cmd+Shift+Delete` (Mac)
2. Selecteer "Cached images and files"
3. Klik "Clear data"

## ✅ Verwachte Resultaat na Cache Clear

### In TeamBuilder pagina:
1. **Selecteer een team** → rechter sidebar opent
2. **Linker sidebar** → bij elke rider verschijnt nu een **blauwe [+ Add]** knop
3. Klik op [+ Add] → rider wordt direct toegevoegd (zonder drag&drop)

### Visueel:
```
┌────────────────────────────────┐
│ [Avatar] Rider Name      [+ Add] │  ← NIEUWE KNOP!
│ Cat: A  Tier: 3                 │
└────────────────────────────────┘
```

## 🧪 Test Checklist
Na cache refresh, test:
- [ ] [+Add] knop zichtbaar naast elke rider in linker sidebar
- [ ] Knop alleen zichtbaar wanneer team geselecteerd is
- [ ] Klikken op [+Add] voegt rider toe aan team
- [ ] Drag & drop werkt nog steeds
- [ ] Mobile: "+" icoon op kleine schermen, "+ Add" op grote

## 🔍 Debug: Als het NOG NIET werkt

### Check welke bundle geladen wordt:
1. Open DevTools → Network tab
2. Refresh pagina (F5)
3. Zoek naar: `index-DKOM9nu5.js`
4. Als je `index-CYwZ5zXF.js` ziet → oude versie!

### Forceer nieuwe versie:
```bash
# Voeg timestamp toe aan URL
https://teamnl-cloud9-racing-team-production.up.railway.app/?t=1735159844
```

## 📱 Mobile Testing
- iOS Safari: Instellingen → Safari → Clear History and Website Data
- Android Chrome: Instellingen → Privacy → Clear browsing data

---

**Status**: ✅ Code is LIVE op productie sinds 19:32:29 (25 dec 2025)  
**Issue**: Browser cache - los op met hard refresh
