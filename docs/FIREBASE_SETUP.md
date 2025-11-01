# Firebase Real-time Sync Setup

## Overzicht

Dit project ondersteunt **dual-mode data sync**:
- **Local Database**: SQLite/PostgreSQL (source data + backup)
- **Firebase Firestore**: Real-time sync voor web dashboard

Firebase is **optioneel** - zonder configuratie werkt alles lokaal.

## Quick Start: Firebase Toevoegen

### 1. Service Account Key Ophalen

1. Ga naar [Firebase Console](https://console.firebase.google.com/)
2. Selecteer project: **zwiftracingcloud9**
3. Klik op ⚙️ **Project Settings** (linksboven)
4. Ga naar **Service Accounts** tab
5. Klik **Generate New Private Key**
6. Download de JSON file
7. Hernoem naar `serviceAccountKey.json`
8. Plaats in project root (naast package.json)

**Belangrijk**: Voeg toe aan `.gitignore`:
```
serviceAccountKey.json
```

### 2. Configureer .env

```properties
# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_KEY=./serviceAccountKey.json
FIREBASE_DATABASE_URL=https://zwiftracingcloud9.firebaseio.com
```

### 3. Test Firebase Connectie

Start server:
```bash
npm run dev
```

Je ziet in de logs:
```
🔥 Firebase initialized successfully
   Project: zwiftracingcloud9
🔥 Firebase stats: { riders: 0, clubs: 0, ... }
```

### 4. Trigger Sync

Firebase sync gebeurt automatisch na elke local database save:

```bash
# Sync single rider (local + Firebase)
curl -X POST http://localhost:3000/api/riders/150437/sync

# Sync all riders
curl -X POST http://localhost:3000/api/sync-all-riders

# Sync club
curl -X POST http://localhost:3000/api/clubs/2281/sync
```

## Firestore Collections Structuur

```
riders/
  ├── {zwiftId}/
  │   ├── zwiftId: number
  │   ├── name: string
  │   ├── clubId: number
  │   ├── ranking: number
  │   ├── ftp: number
  │   └── lastSynced: timestamp

clubs/
  ├── {clubId}/
  │   ├── id: number
  │   ├── name: string
  │   ├── memberCount: number
  │   └── lastSynced: timestamp

events/
  ├── {eventId}/
  │   ├── id: number
  │   ├── name: string
  │   ├── eventDate: timestamp
  │   └── ...

raceResults/
  ├── {eventId}_{riderId}/
  │   ├── eventId: number
  │   ├── riderId: number
  │   ├── position: number
  │   └── ...

riderHistory/
  ├── {riderId}_{timestamp}/
  │   ├── riderId: number
  │   ├── snapshotDate: timestamp
  │   ├── ranking: number
  │   └── ...
```

## Firestore Security Rules

Stel deze regels in via Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read, authenticated write
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Frontend: Real-time Dashboard

### React/Vue voorbeeld met Firestore

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "zwiftracingcloud9.firebaseapp.com",
  projectId: "zwiftracingcloud9",
  storageBucket: "zwiftracingcloud9.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Real-time rider updates
onSnapshot(collection(db, 'riders'), (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added' || change.type === 'modified') {
      console.log('Rider updated:', change.doc.data());
    }
  });
});
```

## Firebase Hosting Deployment

### Build & Deploy

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Init hosting (eenmalig)
firebase init hosting

# Build frontend
npm run build

# Deploy
firebase deploy --only hosting
```

## Monitoring & Debugging

### Check Firebase Stats via API

```bash
curl http://localhost:3000/api/firebase/stats
```

### Server Logs

```bash
# PM2 logs
npx pm2 logs --lines 50

# Watch for Firebase sync
npx pm2 logs | grep "🔥"
```

## Troubleshooting

### ⚠️ Firebase not initialized

**Oorzaak**: Service account key niet gevonden

**Oplossing**:
1. Check `serviceAccountKey.json` exists
2. Check `.env` FIREBASE_SERVICE_ACCOUNT_KEY pad klopt
3. Herstart server

### ❌ Permission denied

**Oorzaak**: Firestore security rules te restrictief

**Oplossing**: Update rules in Firebase Console

### 🐌 Slow sync

**Oorzaak**: Batch writes kunnen traag zijn

**Oplossing**: Firebase sync is async en blokkeert lokale DB niet

## Development Workflow

### Zonder Firebase (Local-only)
```bash
# Verwijder/hernoem serviceAccountKey.json
mv serviceAccountKey.json serviceAccountKey.json.bak

# Start server
npm run dev

# Logs tonen: "Using local database only"
```

### Met Firebase (Real-time sync)
```bash
# Plaats serviceAccountKey.json terug
mv serviceAccountKey.json.bak serviceAccountKey.json

# Start server
npm run dev

# Logs tonen: "Firebase initialized successfully"
```

## Production Checklist

- [ ] Service account key veilig opslaan (niet in git!)
- [ ] Firestore security rules configureren
- [ ] Firebase quota's checken (gratis tier: 50K reads/day)
- [ ] CORS origins configureren voor productie domein
- [ ] Firebase Auth toevoegen voor schrijf-operaties
- [ ] Monitoring alerts instellen in Firebase Console

## Nuttige Links

- [Firebase Console](https://console.firebase.google.com/project/zwiftracingcloud9)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Your Firebase App](https://zwiftracingcloud9.web.app/)
