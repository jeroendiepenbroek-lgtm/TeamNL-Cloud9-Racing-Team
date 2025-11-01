# 🚀 TeamNL Cloud9 Frontend - Setup Guide

## Quick Start

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/project/zwiftracingcloud9/settings/general)
2. Scroll to "Your apps" → Click on Web app (or create one)
3. Copy the configuration object
4. Paste it into `src/firebase.ts`:

```typescript
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "zwiftracingcloud9.firebaseapp.com",
  projectId: "zwiftracingcloud9",
  storageBucket: "zwiftracingcloud9.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

### 2. Install & Run

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### 3. Test Features

**Dashboard View:**
- ✅ Real-time rider leaderboard with color-coded performance
- ✅ Click rider to view detailed stats
- ✅ Club statistics (total riders, avg FTP, etc)
- ✅ Performance legend with W/kg ranges

**Admin View:**
- ✅ Upload new riders (by Zwift ID)
- ✅ Delete riders
- ✅ Sync club data from ZwiftRacing API

### 4. Deploy to Firebase Hosting

```bash
# Build production bundle
npm run build

# Deploy (requires Firebase CLI + authentication)
firebase deploy --only hosting
```

Your site will be live at: https://zwiftracingcloud9.web.app/

## Automatic Deployment (GitHub Actions)

Every push to `main` with changes in `frontend/` triggers auto-deploy.

**Setup:**
1. Generate Firebase token: `firebase login:ci`
2. Add secret to GitHub: Repository Settings → Secrets → `FIREBASE_TOKEN`
3. Push to main → Auto-deploy! 🎉

## Architecture

```
Frontend (React + Vite)
  ↓
Firebase SDK (Firestore)
  ↓ real-time listeners
Firestore Collections
  ← Backend (Node.js)
    ← ZwiftRacing API
```

## Color Coding System

Match zwiftracingcloud9.web.app design:

- **Excellent (Green)**: ≥ 4.5 W/kg
- **Good (Teal)**: 4.0-4.5 W/kg
- **Average (Orange)**: 3.5-4.0 W/kg
- **Below (Red)**: < 3.5 W/kg

## Troubleshooting

**"Loading..." forever?**
- Check Firebase config in `src/firebase.ts`
- Verify Firestore has data (run backend sync first)
- Check browser console for errors

**Admin actions fail?**
- Ensure backend is running on localhost:3000
- Check CORS settings in backend
- Verify API endpoints are accessible

**Build errors?**
- Delete `node_modules` and run `npm install` again
- Check TypeScript errors: `npm run build`

## Next Steps

- [ ] Add authentication for admin panel (Firebase Auth)
- [ ] Add event results view
- [ ] Add rider performance charts (Recharts)
- [ ] Add source data table views
- [ ] Mobile responsive improvements
