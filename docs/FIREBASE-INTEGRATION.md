# Firebase Integration Guide

## Overview

**Firebase Project**: zwiftracingcloud9  
**Frontend URL**: https://zwiftracingcloud9.web.app/  
**Backend**: Railway (Node.js + PostgreSQL)

Deze guide beschrijft hoe Firebase wordt geïntegreerd voor **frontend features** terwijl Railway de backend blijft draaien.

## 🎯 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Firebase)                       │
│  https://zwiftracingcloud9.web.app/                         │
│                                                              │
│  ✅ Firebase Hosting (static files)                         │
│  ✅ Firebase Authentication (user login)                    │
│  ✅ Firestore (optional: cache/preferences)                 │
│  ✅ Firebase Storage (optional: images/files)               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTP Requests (with Firebase ID Token)
                   │
┌──────────────────▼──────────────────────────────────────────┐
│              Backend API (Railway)                           │
│  https://teamnl-cloud9.up.railway.app/                      │
│                                                              │
│  ✅ Express.js REST API                                     │
│  ✅ Firebase Admin SDK (verify tokens)                      │
│  ✅ PostgreSQL (rider data, rankings, results)              │
│  ✅ Cron Jobs (automatic syncs 24/7)                        │
│  ✅ ZwiftRacing.app API integration                         │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Authentication Flow

### 1. Frontend Login (Firebase Auth)
```javascript
// Frontend: User logs in
import { signInWithEmailAndPassword } from 'firebase/auth';

const userCredential = await signInWithEmailAndPassword(auth, email, password);
const idToken = await userCredential.user.getIdToken();

// Send token to backend
const response = await fetch('https://teamnl-cloud9.up.railway.app/api/riders', {
  headers: {
    'Authorization': `Bearer ${idToken}`
  }
});
```

### 2. Backend Token Verification (Firebase Admin)
```typescript
// Backend: Verify token
import admin from 'firebase-admin';

const decodedToken = await admin.auth().verifyIdToken(idToken);
const uid = decodedToken.uid;
const email = decodedToken.email;

// User is authenticated, proceed with request
```

## 📦 Installation

### Backend (Railway)

```bash
npm install firebase-admin
```

### Frontend (Firebase Hosting)

```bash
npm install firebase
# OF via CDN in HTML
```

## 🔧 Backend Setup

### 1. Firebase Service Account

**Stappen in Firebase Console**:
1. Ga naar https://console.firebase.google.com/project/zwiftracingcloud9/settings/serviceaccounts
2. Click "Generate new private key"
3. Download `serviceAccountKey.json`
4. **NIET committen naar Git!**

### 2. Environment Variables (Railway)

Add to Railway environment:

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=zwiftracingcloud9
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@zwiftracingcloud9.iam.gserviceaccount.com

# Authentication toggle
AUTH_ENABLED=true
AUTH_METHOD=firebase  # Was: 'basic'
```

### 3. Backend Code: Firebase Admin Middleware

**Create `src/middleware/firebase-auth.ts`**:
```typescript
import admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
  logger.info('🔥 Firebase Admin SDK geïnitialiseerd');
}

/**
 * Firebase Authentication Middleware
 * Verifies Firebase ID tokens from frontend
 */
export const firebaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Skip auth for health endpoint
  if (req.path === '/api/health' || req.path === '/api/system') {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Firebase ID token vereist in Authorization header' 
    });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Attach user info to request
    (req as any).user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      isAdmin: decodedToken.admin === true, // Custom claim
    };

    logger.debug('✅ User authenticated', { uid: decodedToken.uid, email: decodedToken.email });
    next();
  } catch (error) {
    logger.warn('❌ Invalid Firebase token', { error });
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid of verlopen token' 
    });
  }
};

/**
 * Admin-only middleware
 * Requires custom claim 'admin: true' in Firebase Auth
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  if (!user || !user.isAdmin) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Admin rechten vereist' 
    });
  }

  next();
};
```

### 4. Update Server Code

**Update `src/server.ts`**:
```typescript
import { firebaseAuth, requireAdmin } from './middleware/firebase-auth.js';

// Apply Firebase Auth (if enabled)
if (process.env.AUTH_ENABLED === 'true' && process.env.AUTH_METHOD === 'firebase') {
  logger.info('🔒 Firebase Authentication enabled');
  app.use(firebaseAuth);
}

// Admin-only routes
app.use('/api/sync', requireAdmin);
app.use('/api/workflow/cleanup', requireAdmin);
```

## 🌐 Frontend Setup

### 1. Firebase Configuration

**Create `public/firebase-config.js`**:
```javascript
// Firebase SDK v9+ (modular)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIza...", // Get from Firebase Console
  authDomain: "zwiftracingcloud9.firebaseapp.com",
  projectId: "zwiftracingcloud9",
  storageBucket: "zwiftracingcloud9.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:..."
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### 2. Login Component

**Example `public/login.html`**:
```html
<!DOCTYPE html>
<html>
<head>
  <title>TeamNL Cloud9 - Login</title>
  <script type="module">
    import { auth } from './firebase-config.js';
    import { signInWithEmailAndPassword } from 'firebase/auth';

    async function login() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        
        // Store token for API calls
        localStorage.setItem('authToken', idToken);
        
        // Redirect to dashboard
        window.location.href = '/dashboard.html';
      } catch (error) {
        alert('Login failed: ' + error.message);
      }
    }

    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      login();
    });
  </script>
</head>
<body>
  <h1>TeamNL Cloud9 Login</h1>
  <form id="loginForm">
    <input type="email" id="email" placeholder="Email" required>
    <input type="password" id="password" placeholder="Password" required>
    <button type="submit">Login</button>
  </form>
</body>
</html>
```

### 3. API Calls with Token

**Example dashboard fetch**:
```javascript
async function fetchRiders() {
  const token = localStorage.getItem('authToken');

  const response = await fetch('https://teamnl-cloud9.up.railway.app/api/riders', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    // Token expired, redirect to login
    window.location.href = '/login.html';
    return;
  }

  const riders = await response.json();
  displayRiders(riders);
}
```

## 👥 User Management

### Create Users (Firebase Console)

1. Ga naar https://console.firebase.google.com/project/zwiftracingcloud9/authentication/users
2. Click "Add user"
3. Email: `admin@teamnl.nl`
4. Password: Generate strong password
5. Click "Add user"

### Set Admin Claims (Firebase CLI)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Set custom claim
firebase auth:set-custom-user-claims admin@teamnl.nl '{"admin": true}' --project zwiftracingcloud9
```

## 🎨 Frontend Deployment

### Deploy to Firebase Hosting

```bash
# Initialize Firebase (first time only)
firebase init hosting

# Select:
# - Use existing project: zwiftracingcloud9
# - Public directory: public
# - Single-page app: No
# - GitHub Actions: No (we use manual deploy)

# Deploy
firebase deploy --only hosting
```

**URL**: https://zwiftracingcloud9.web.app/

## 🔄 Development Workflow

### Local Development

```bash
# Backend (Railway local)
npm run dev  # http://localhost:3000

# Frontend (Firebase local)
firebase serve  # http://localhost:5000
```

### Environment-Specific CORS

**Update backend CORS for Firebase domain**:
```typescript
// src/middleware/auth.ts
const allowedOrigins = [
  'http://localhost:5000',  // Firebase local
  'https://zwiftracingcloud9.web.app',  // Production
  'https://zwiftracingcloud9.firebaseapp.com',  // Alternative domain
];
```

## 💰 Cost Breakdown

**Firebase Spark Plan (Free)**:
- ✅ Authentication: 50,000 MAU (Monthly Active Users)
- ✅ Hosting: 10 GB storage, 360 MB/day bandwidth
- ✅ Firestore: 1 GB storage, 50K reads/day, 20K writes/day
- ✅ Storage: 5 GB

**Railway ($5 free credit)**:
- ✅ Backend API + PostgreSQL + Cron jobs

**Total: $0** ✅

## 🧪 Testing

### Test Authentication Flow

```bash
# 1. Get Firebase ID token (manual via browser console)
# In browser: auth.currentUser.getIdToken().then(console.log)

# 2. Test backend API
curl -H "Authorization: Bearer eyJhbGciOiJSUzI1..." \
  https://teamnl-cloud9.up.railway.app/api/riders

# Expected: 200 OK with rider data
```

## 🔒 Security Best Practices

1. ✅ **Never commit** `serviceAccountKey.json` to Git
2. ✅ **Use Railway secrets** for Firebase credentials
3. ✅ **Enable Firebase Security Rules** for Firestore (if used)
4. ✅ **Rotate service account keys** every 90 days
5. ✅ **Use HTTPS only** (Firebase Hosting forces this)
6. ✅ **Implement rate limiting** on backend
7. ✅ **Log failed auth attempts**

## 📚 Optional: Firestore for User Preferences

If you want to store user preferences (favorites, settings):

```javascript
// Frontend: Save favorite riders
import { doc, setDoc } from 'firebase/firestore';

await setDoc(doc(db, 'userPreferences', user.uid), {
  favoriteRiders: [150437, 123456],
  theme: 'dark',
  notifications: true
});

// Backend: No changes needed! Firestore is client-side
```

## 🚀 Migration Checklist

- [ ] Install `firebase-admin` in backend
- [ ] Download service account key from Firebase Console
- [ ] Add Firebase env vars to Railway
- [ ] Create `src/middleware/firebase-auth.ts`
- [ ] Update `src/server.ts` with Firebase auth
- [ ] Create Firebase users (admin + team members)
- [ ] Set admin custom claims
- [ ] Test authentication flow locally
- [ ] Deploy backend to Railway staging
- [ ] Test staging with Firebase token
- [ ] Update frontend to use Firebase Auth
- [ ] Deploy frontend to Firebase Hosting
- [ ] Test end-to-end production flow

## 📖 Resources

- [Firebase Console](https://console.firebase.google.com/project/zwiftracingcloud9)
- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [Firebase Auth Web Docs](https://firebase.google.com/docs/auth/web/start)
- [Railway Docs](https://docs.railway.app)

---

**Next Steps**: Follow migration checklist and test in staging first! 🎯
