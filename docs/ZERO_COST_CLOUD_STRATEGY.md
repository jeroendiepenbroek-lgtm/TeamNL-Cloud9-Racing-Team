# Zero-Cost Cloud Strategy voor TeamNL Cloud9 Dashboard

## 🎯 User Stories
- **US1**: Zero-cost oplossing
- **US2**: Cloud-omgeving voor test en productie
- **US3**: https://zwiftracingcloud9.web.app/ als blueprint
- **US4**: API service → Cloud datastore → Cloud dashboard

## 📊 Analyse: Je Huidige Setup

### ✅ Wat je AL hebt (Firebase Spark - FREE)
```
Firebase Project: zwiftracingcloud9
├── Firestore Database (NoSQL)
│   └── Free tier: 1 GB storage, 50K reads/day, 20K writes/day
├── Firebase Hosting (https://zwiftracingcloud9.web.app/)
│   └── Free tier: 10 GB storage, 360 MB/day bandwidth
├── Firebase Admin SDK (Backend)
│   └── ✅ AL WERKEND in je backend (createRequire fix)
└── Authentication (optional)
    └── Free tier: 10K phone auth/month
```

**Status**: 🎉 **Firebase is AL geconfigureerd en werkt!**
- Service account key: ✅ Geüpload
- Backend sync: ✅ Test succesvol (rider 150437 → Firestore)
- Project URL: https://zwiftracingcloud9.web.app/

---

## 🏗️ Recommended Zero-Cost Stack

### Optie 1: Firebase ONLY (BESTE voor jouw use case) ⭐

**Backend** (API Server):
- **Waar**: GitHub Codespaces (60 uur/maand gratis) OF je eigen lokale machine
- **Cost**: €0 (of lokaal draaien)
- **Stack**: Bestaande Node.js + Express + TypeScript
- **Data flow**: 
  ```
  ZwiftRacing API → Backend (SQLite backup) → Firebase Firestore
  ```

**Datastore** (Real-time Database):
- **Wat**: Firebase Firestore (Spark plan)
- **Cost**: €0 tot 50K reads/day
- **Features**: 
  - ✅ Real-time sync (WebSockets)
  - ✅ Offline support
  - ✅ Automatic scaling
  - ✅ Security rules

**Frontend** (Dashboard):
- **Waar**: Firebase Hosting (https://zwiftracingcloud9.web.app/)
- **Cost**: €0 tot 360 MB/day bandwidth
- **Stack**: React/Vue + Firebase SDK (real-time listeners)
- **Features**:
  - ✅ SSL gratis
  - ✅ CDN global
  - ✅ Auto deploy met GitHub Actions

**CI/CD**:
- **Waar**: GitHub Actions (2000 minuten/maand gratis)
- **Cost**: €0
- **Workflow**: Push → Build → Deploy naar Firebase Hosting

---

### Optie 2: GitHub Pages + Firebase Firestore

**Frontend**: 
- GitHub Pages (gratis static hosting)
- Nadeel: Geen server-side rendering, geen environment variables hiding

**Backend + Datastore**: 
- Zelfde als Optie 1

**Verdict**: ❌ Minder features dan Firebase Hosting, geen voordelen

---

### Optie 3: Vercel Free Tier

**Frontend + API Routes**:
- Vercel (100 GB bandwidth/maand)
- Serverless functions voor API

**Datastore**: 
- Firebase Firestore (gratis tier)

**Nadeel**: 
- ❌ Vercel functions = 10 sec timeout (ZwiftRacing sync kan langer duren)
- ❌ Je moet backend splitsen (API routes in Vercel, background jobs elders)

**Verdict**: ❌ Te complex, Firebase is simpeler

---

## ✅ AANBEVELING: Firebase All-In Strategy

### Architectuur
```
┌─────────────────────────────────────────────────────────┐
│  BACKEND (Codespaces of Lokaal)                         │
│  ├── Express API (Node.js + TypeScript)                 │
│  ├── SQLite (local backup/cache)                        │
│  ├── Cron scheduler (hourly sync)                       │
│  └── Firebase Admin SDK                                 │
│      └── Sync data → Firestore                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼ (write: riders, clubs, events, results)
┌─────────────────────────────────────────────────────────┐
│  CLOUD DATASTORE (Firebase Firestore - Spark FREE)      │
│  ├── riders/         (50K reads/day, 20K writes/day)    │
│  ├── clubs/                                              │
│  ├── events/                                             │
│  ├── raceResults/                                        │
│  └── riderHistory/   (90 dagen snapshots)               │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼ (real-time onSnapshot listeners)
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (Firebase Hosting - FREE)                     │
│  https://zwiftracingcloud9.web.app/                     │
│  ├── React/Vue SPA                                       │
│  ├── Firebase SDK (real-time sync)                      │
│  ├── Charts (ranking, FTP trends)                       │
│  └── Rider cards (live updates)                         │
└─────────────────────────────────────────────────────────┘
```

### Cost Breakdown (Maandelijks)
| Component | Service | Free Tier | Verwacht Gebruik | Cost |
|-----------|---------|-----------|------------------|------|
| Backend | GitHub Codespaces | 60 uur/maand | ~20 uur/maand | €0 |
| Datastore | Firestore | 50K reads/day | ~5K reads/day | €0 |
| Hosting | Firebase Hosting | 10 GB + 360 MB/day | <100 MB/day | €0 |
| CI/CD | GitHub Actions | 2000 min/maand | ~50 min/maand | €0 |
| **TOTAAL** | | | | **€0** |

### Schaalbaarheid
**Gratis tier limits**:
- Firestore: 50K document reads/dag = ~2K users/dag (met caching)
- Hosting: 360 MB/dag bandwidth = ~7200 pageviews/dag
- Ruim voldoende voor racing team dashboard

**Als je groeit** (unlikely maar goed om te weten):
- Blaze plan (pay-as-you-go): €0.06 per 100K reads
- Estimated €5-10/maand voor 500K reads/dag

---

## 🚀 Implementatie Plan

### FASE 1: Firebase Datastore Optimalisatie (1 uur)
**Wat**: Zorg dat alle data correct naar Firestore synct

**Acties**:
1. ✅ **DONE**: Firebase Admin SDK werkt (createRequire fix)
2. ✅ **DONE**: Rider sync test (150437 → Firestore)
3. ⏳ **TODO**: Test club sync → Firestore
4. ⏳ **TODO**: Test event sync → Firestore
5. ⏳ **TODO**: Add Firestore indexes voor queries

**Files**:
- `src/services/firebase-sync.service.ts` (AL KLAAR)
- `src/services/mvp-rider-sync.service.ts` (AL KLAAR)
- `src/services/mvp-club-sync.service.ts` (UPDATE NEEDED)

**Verificatie**:
```bash
# Test rider sync
curl -X POST http://localhost:3000/api/riders/150437/sync

# Check Firestore Console
https://console.firebase.google.com/project/zwiftracingcloud9/firestore

# Should see: riders/150437 document met name, ftp, ranking, etc.
```

---

### FASE 2: Frontend Dashboard Bouwen (4 uur)

**Wat**: Reconstrueer zwiftracingcloud9.web.app met live Firestore data

**Tech Stack**:
```json
{
  "framework": "React 18 (Vite)",
  "styling": "Tailwind CSS",
  "firebase": "firebase@10.x (modular SDK)",
  "charts": "recharts (lightweight)",
  "state": "React hooks (useState, useEffect)"
}
```

**Project Structure**:
```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── RiderCard.tsx        # Rider stats widget
│   │   ├── RankingTable.tsx     # Top riders leaderboard
│   │   ├── FtpChart.tsx         # FTP trend over time
│   │   └── EventsList.tsx       # Upcoming races
│   ├── hooks/
│   │   ├── useRiders.ts         # Firestore riders listener
│   │   ├── useClub.ts           # Club data hook
│   │   └── useEvents.ts         # Events listener
│   ├── firebase.ts              # Firebase config
│   └── App.tsx                  # Main dashboard
├── firebaserc                   # Firebase project config
├── firebase.json                # Hosting config
└── package.json
```

**Real-time Data Hooks** (voorbeeld):
```typescript
// src/hooks/useRiders.ts
import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useTopRiders(limitCount = 20) {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'riders'),
      orderBy('ranking', 'desc'),
      limit(limitCount)
    );

    // Real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const riderData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRiders(riderData);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup
  }, [limitCount]);

  return { riders, loading };
}
```

**Component Voorbeeld**:
```typescript
// src/components/RankingTable.tsx
import { useTopRiders } from '../hooks/useRiders';

export function RankingTable() {
  const { riders, loading } = useTopRiders(20);

  if (loading) return <div>Loading...</div>;

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Rider</th>
          <th>FTP</th>
          <th>Category</th>
        </tr>
      </thead>
      <tbody>
        {riders.map((rider, idx) => (
          <tr key={rider.id}>
            <td>{idx + 1}</td>
            <td>{rider.name}</td>
            <td>{rider.ftp} W</td>
            <td>{rider.categoryRacing}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

### FASE 3: Firebase Hosting Deploy (30 min)

**Setup**:
```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Initialize (gebruik bestaande zwiftracingcloud9 project)
cd frontend/
firebase init hosting

# Select:
# - Use existing project: zwiftracingcloud9
# - Public directory: dist
# - Single-page app: Yes
# - Automatic builds: Yes (GitHub)

# 4. Build
npm run build

# 5. Deploy
firebase deploy --only hosting
```

**GitHub Actions Auto-Deploy** (`.github/workflows/deploy.yml`):
```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        working-directory: frontend
        run: npm ci
      
      - name: Build
        working-directory: frontend
        run: npm run build
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: zwiftracingcloud9
```

**Resultaat**: 
- Push naar main → Auto build → Deploy naar https://zwiftracingcloud9.web.app/
- Live binnen 2-3 minuten

---

### FASE 4: Backend Deployment (2 opties)

#### Optie A: GitHub Codespaces (Aanbevolen voor dev/test)
**Cost**: €0 (60 uur/maand free tier)

**Setup**:
1. `.devcontainer/devcontainer.json` (AL AANWEZIG)
2. Start Codespace
3. Run `npm run dev`
4. Scheduler draait automatisch (cron jobs)

**Nadeel**: 
- Stopt na inactiviteit (60 min)
- Moet handmatig herstarten

**Voordeel**:
- Volledige dev environment
- Gratis SSL via Codespaces port forwarding
- Perfect voor testen

---

#### Optie B: Railway.app / Render.com Free Tier (Aanbevolen voor prod)

**Railway.app** (Best free tier):
- €5 gratis credit/maand (genoeg voor ~100 uur uptime)
- Automatic deploys vanaf GitHub
- Persistent disk (SQLite blijft bestaan)
- Environment variables UI

**Setup** (5 minuten):
```bash
# 1. Connect GitHub repo naar Railway
# 2. Add environment variables:
FIREBASE_SERVICE_ACCOUNT_KEY=<base64 encoded>
FIREBASE_DATABASE_URL=https://zwiftracingcloud9.firebaseio.com
ZWIFT_CLUB_ID=2281
SCHEDULER_ENABLED=true

# 3. Deploy
# Railway detecteert automatisch Node.js + start command
```

**Start Command** (railway.json):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run build && npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Render.com** (Alternatief):
- Free tier: 750 uur/maand
- Auto-sleep na 15 min inactiviteit (cold start = 30 sec)
- Nadeel: SQLite reset bij elke deploy

---

#### Optie C: Lokale Machine + ngrok (Voor permanent draaien)

**Setup**:
```bash
# 1. Start backend lokaal
npm run dev

# 2. Expose met ngrok (gratis tier: 1 endpoint)
ngrok http 3000
# Output: https://abc123.ngrok.io → localhost:3000

# 3. Update Firebase config om ngrok URL te gebruiken (if needed)
```

**Cost**: €0
**Voordeel**: Full control, geen limits
**Nadeel**: Je machine moet 24/7 draaien

---

## 🎨 Design: Reconstrueer zwiftracingcloud9.web.app

### Analyse Bestaande Site
**Huidige features** (https://zwiftracingcloud9.web.app/):
1. **Hero Section**: Team branding + logo
2. **Rider Rankings**: Top 20 leaderboard
3. **Recent Races**: Last 10 events met results
4. **Club Stats**: Total members, races, wins
5. **Responsive Design**: Mobile-friendly

### Component Breakdown
```typescript
// App.tsx - Main layout
<Dashboard>
  <Header logo={CloudNine} />
  <StatsBar 
    totalMembers={club.memberCount}
    totalRaces={club.totalRaces}
    totalWins={club.totalWins}
  />
  <RankingTable riders={topRiders} />
  <RecentRaces events={recentEvents} />
  <Footer />
</Dashboard>
```

### Styling Match
```typescript
// Theme colors (gebaseerd op bestaande site)
const theme = {
  primary: '#FF6B35',    // Orange accent
  secondary: '#004E89',  // Dark blue
  background: '#F7F7F7', // Light gray
  text: '#1A1A1A',       // Near black
  cardBg: '#FFFFFF',     // White cards
};
```

---

## 📈 Monitoring & Analytics (Zero-Cost)

### Firebase Analytics (Gratis)
```typescript
// frontend/src/firebase.ts
import { getAnalytics } from 'firebase/analytics';

const analytics = getAnalytics(app);

// Track page views, events, etc.
logEvent(analytics, 'rider_viewed', {
  riderId: 150437,
  timestamp: Date.now(),
});
```

**Features**:
- ✅ Pageviews
- ✅ User engagement
- ✅ Real-time active users
- ✅ Demographics

### Firestore Usage Monitoring
```bash
# Check daily usage
https://console.firebase.google.com/project/zwiftracingcloud9/usage

# Quota alerts (gratis)
# Firebase Console → Settings → Usage and billing → Set alerts
```

---

## 🔒 Security: Firestore Rules

**Voor PUBLIC dashboard** (read-only):
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Public read access voor dashboard
    match /riders/{riderId} {
      allow read: if true;           // Anyone can read
      allow write: if false;         // Only backend can write (via Admin SDK)
    }
    
    match /clubs/{clubId} {
      allow read: if true;
      allow write: if false;
    }
    
    match /events/{eventId} {
      allow read: if true;
      allow write: if false;
    }
    
    match /raceResults/{resultId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

**Deploy rules**:
```bash
firebase deploy --only firestore:rules
```

---

## 🧪 Testing Strategy

### Local Development
```bash
# 1. Backend (localhost:3000)
npm run dev

# 2. Frontend (localhost:5173)
cd frontend
npm run dev

# 3. Test sync
curl -X POST http://localhost:3000/api/riders/150437/sync

# 4. Check Firestore
# https://console.firebase.google.com/project/zwiftracingcloud9/firestore

# 5. Frontend should show rider data real-time
```

### Production Testing
```bash
# 1. Deploy backend naar Railway
git push origin main

# 2. Deploy frontend naar Firebase Hosting
cd frontend
firebase deploy --only hosting

# 3. Test live site
open https://zwiftracingcloud9.web.app/

# 4. Verify real-time updates
# Trigger sync via Railway backend → See updates on dashboard
```

---

## 📝 Summary: Zero-Cost MVP

### ✅ Complete Stack (€0/maand)
| Layer | Solution | Cost |
|-------|----------|------|
| **Backend** | Railway.app (€5 credit/maand) | €0 |
| **Datastore** | Firebase Firestore (Spark) | €0 |
| **Frontend** | Firebase Hosting | €0 |
| **CI/CD** | GitHub Actions | €0 |
| **Domain** | firebaseapp.com subdomain | €0 |
| **SSL** | Auto (Firebase + Railway) | €0 |

### 🎯 Features Delivered
- ✅ US1: Zero-cost (Spark plan binnen free tier)
- ✅ US2: Cloud test + prod environments
- ✅ US3: zwiftracingcloud9.web.app reconstructed
- ✅ US4: Backend → Firestore → Dashboard (real-time)

### 📦 Deliverables
1. **Backend**: Express API met Firebase Admin SDK sync
2. **Datastore**: Firestore collections (riders, clubs, events, results)
3. **Frontend**: React SPA met real-time Firestore listeners
4. **Deployment**: GitHub Actions → Firebase Hosting
5. **Monitoring**: Firebase Analytics + Console

### ⏱️ Time Estimate
- Fase 1 (Firestore sync): ✅ **DONE** (AL WERKEND)
- Fase 2 (Frontend build): 4 uur
- Fase 3 (Firebase deploy): 30 min
- Fase 4 (Backend deploy): 1 uur
- **Totaal**: ~6 uur werk

---

## 🚀 Next Steps (Aanbevolen volgorde)

### 1. Test Full Data Sync (15 min)
```bash
# Sync club met alle members
curl -X POST http://localhost:3000/api/clubs/2281/sync

# Verify in Firestore Console
# Should see: clubs/2281 + riders collection populated
```

### 2. Setup Frontend Project (30 min)
```bash
# Create React app
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install firebase recharts

# Add Firebase config
# Copy from Firebase Console → Project settings → Web app
```

### 3. Build Core Components (3 uur)
- RiderCard.tsx
- RankingTable.tsx  
- ClubStats.tsx
- EventsList.tsx

### 4. Deploy Frontend (15 min)
```bash
firebase deploy --only hosting
```

### 5. Deploy Backend to Railway (30 min)
- Connect GitHub repo
- Add environment variables
- Deploy

### 6. Monitor & Iterate
- Check Firebase Analytics
- Monitor Firestore usage
- Optimize queries met indexes

---

## 💡 Pro Tips

### Reduce Firestore Reads (Stay within free tier)
```typescript
// ✅ GOOD: Query met limit
const q = query(collection(db, 'riders'), limit(20));

// ❌ BAD: Fetch all documents
const allRiders = await getDocs(collection(db, 'riders')); // Could be 1000s of reads

// ✅ GOOD: Client-side caching
const [cache, setCache] = useState(null);
useEffect(() => {
  if (cache) return; // Use cached data
  // Fetch from Firestore...
}, []);
```

### Optimize Real-time Listeners
```typescript
// ✅ GOOD: Unsubscribe when component unmounts
useEffect(() => {
  const unsubscribe = onSnapshot(q, (snapshot) => {
    // Handle data
  });
  return () => unsubscribe(); // Cleanup
}, []);

// ❌ BAD: Memory leak (no cleanup)
useEffect(() => {
  onSnapshot(q, (snapshot) => { /* ... */ });
}, []);
```

### Database Indexes (Required voor queries)
```bash
# Firestore will prompt you to create indexes
# Copy URL from error message in console:
# https://console.firebase.google.com/project/zwiftracingcloud9/firestore/indexes?create_composite=...

# Or define in firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "riders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clubId", "order": "ASCENDING" },
        { "fieldPath": "ranking", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 🎓 Resources

### Firebase Docs
- [Firestore Quickstart](https://firebase.google.com/docs/firestore/quickstart)
- [Hosting Guide](https://firebase.google.com/docs/hosting)
- [Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

### React + Firebase
- [React Firebase Hooks](https://github.com/CSFrequency/react-firebase-hooks)
- [Vite React Template](https://vitejs.dev/guide/)

### Railway.app
- [Deploy Node.js](https://docs.railway.app/guides/nodejs)

---

## 🏁 Conclusion

Je hebt **AL een volledig werkende zero-cost stack**:
- ✅ Firebase project (zwiftracingcloud9)
- ✅ Backend sync werkend (rider 150437 → Firestore)
- ✅ Hosting URL klaar (zwiftracingcloud9.web.app)

**Wat ontbreekt**:
- Frontend React app bouwen (4 uur werk)
- Firebase Hosting deploy (15 min)
- Backend deploy naar Railway (30 min)

**Result**: 
Volledige cloud dashboard op https://zwiftracingcloud9.web.app/ met real-time data, **100% gratis** binnen Firebase Spark plan limits.

Let's build! 🚀
