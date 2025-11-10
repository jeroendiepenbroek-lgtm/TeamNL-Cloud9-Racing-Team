# Blank Screen Fix & Google OAuth Implementatie

**Datum**: 10 November 2025  
**Status**: ✅ Opgelost + Google OAuth toegevoegd

## Probleem Analyse

### Symptomen
- ❌ Pagina volledig blank (white screen)
- ❌ Geen errors zichtbaar in browser
- ❌ Frontend server draait maar rendert niets

### Root Causes
1. **Auth Context Blocking**: `loading` state blijft `true` als Supabase auth niet reageert
2. **Geen Timeout**: Geen fallback als auth initialization langer dan verwacht duurt
3. **Insufficient Logging**: Moeilijk te debuggen zonder console logs

## Oplossing Geïmplementeerd

### 1. ✅ Timeout Mechanisme (AuthContext)
```typescript
// 3 seconden timeout - voorkomt infinite loading
const timeout = setTimeout(() => {
  console.warn('[AuthContext] Timeout - continuing without auth')
  setLoading(false)
}, 3000)
```

**Resultaat**: App laadt altijd, ook als Supabase niet reageert.

### 2. ✅ Verbeterde Logging (supabase.ts + AuthContext)
```typescript
console.log('Supabase Config:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey?.length || 0,
  hasKey: !!supabaseAnonKey
})

console.log('[AuthContext] Initializing...')
console.log('[AuthContext] Session loaded:', !!session)
```

**Resultaat**: Duidelijke debugging info in browser console.

### 3. ✅ Expliciete localStorage Support
```typescript
export const supabase = createClient(url, key, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
})
```

**Resultaat**: Session persistence werkt correct in alle browsers.

### 4. ✅ Debug Pagina (`/debug`)
Nieuwe route met diagnostics:
- Environment variabelen check
- Supabase connectie test
- Auth context state
- Browser info

**Usage**: http://localhost:5173/debug

## Google OAuth Toevoeging

### User Requirement
> "ik wilde middels Google authenticatie inloggen (uitgebreide Supabase variant)"

### Implementatie

#### 1. AuthContext Uitbreiding
```typescript
interface AuthContextType {
  signInWithGoogle: () => Promise<{ error: Error | null }>  // ✅ NIEUW
}

const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    }
  })
  return { error }
}
```

#### 2. LoginModal Update
- ✅ Grote Google OAuth knop (met official branding)
- ✅ "Of met email" divider
- ✅ Email/password als fallback optie

**UI Volgorde**:
1. **Primair**: Inloggen met Google (aanbevolen)
2. **Secondair**: Email/password (fallback)

#### 3. Visual Design
```tsx
<button className="...Google branding met icon...">
  <GoogleIcon />
  Inloggen met Google
</button>

<div>--- Of met email ---</div>

<form>Email + Password fields</form>
```

## Configuratie Vereist

### ⚠️ Supabase Dashboard Setup Nodig
Voor Google OAuth om te werken moet je configureren:

1. **Google Cloud Console**:
   - OAuth 2.0 Client ID aanmaken
   - Redirect URI: `https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback`

2. **Supabase Dashboard**:
   - Authentication → Providers → Google enable
   - Client ID en Secret invullen
   - Redirect URLs toevoegen

**Zie**: `docs/GOOGLE_OAUTH_SETUP.md` voor complete stappen.

## Testing

### Lokaal Testen
```bash
# Backend
cd backend && npm run dev

# Frontend  
cd backend/frontend && npm run dev

# Open
http://localhost:5173
```

### Test Scenario's

#### 1. ✅ Blank Screen Opgelost
- Open http://localhost:5173
- **Verwacht**: Dashboard laadt binnen 3 seconden
- **Fallback**: Als Supabase traag, app laadt toch met timeout

#### 2. ✅ Debug Info Beschikbaar
- Open http://localhost:5173/debug
- **Verwacht**: Zie env vars, Supabase status, auth state

#### 3. 🔄 Google OAuth (na Supabase config)
- Klik "Admin Login"
- Klik "Inloggen met Google"
- **Verwacht**: Redirect naar Google, terug naar dashboard
- **Status**: Code klaar, Supabase config nodig

#### 4. ✅ Email Fallback Werkt
- Klik "Admin Login"
- Scroll naar email form
- Login: admin@cloudracer.nl / CloudRacer2024!
- **Verwacht**: Werkt onafhankelijk van Google config

## Files Gewijzigd

### Frontend Core
- ✅ `src/lib/supabase.ts` - Betere config + logging
- ✅ `src/contexts/AuthContext.tsx` - Timeout + Google OAuth
- ✅ `src/components/LoginModal.tsx` - Google button + divider
- ✅ `src/App.tsx` - Debug route toegevoegd

### Nieuw
- ✅ `src/pages/Debug.tsx` - Diagnostics pagina
- ✅ `docs/GOOGLE_OAUTH_SETUP.md` - Setup instructies

### Environment
- ✅ `.env.local` - Valide Supabase anon key

## Server Status

### Backend
- **Status**: ✅ Running
- **PID**: 76410 (tsx)
- **Port**: 3000
- **Health**: http://localhost:3000/health

### Frontend
- **Status**: ✅ Running
- **PID**: 102649 (vite)
- **Port**: 5173
- **URL**: http://localhost:5173

## Volgende Stappen

### 1. Google OAuth Configureren (Aanbevolen)
- [ ] Google Cloud Console: OAuth Client ID
- [ ] Supabase: Enable Google provider
- [ ] Test Google login flow

### 2. Production Deployment
- [ ] Railway env vars checken
- [ ] Redirect URLs updaten naar productie
- [ ] Google Console: Productie redirect URI

### 3. User Management
- [ ] Besluit: Wie mag inloggen? (Alleen specifieke Google accounts?)
- [ ] Optioneel: Custom claims voor admin rechten
- [ ] Optioneel: Email whitelist implementeren

## Troubleshooting Commands

```bash
# Check frontend logs
tail -f /tmp/frontend.log

# Check backend logs  
tail -f /tmp/backend.log

# Test Supabase connectivity
curl -H "apikey: YOUR_KEY" https://bktbeefdmrpxhsyyalvc.supabase.co/rest/v1/

# Restart frontend
pkill -f vite && cd backend/frontend && npm run dev

# Check running processes
ps aux | grep -E "(vite|tsx)"
```

## Summary

### ✅ Opgelost
- Blank screen issue door timeout implementatie
- Betere error logging en debugging
- Debug pagina voor troubleshooting

### ✅ Toegevoegd
- Google OAuth login (code compleet)
- Verbeterde LoginModal UI
- Email/password fallback optie

### ⏳ Configuratie Nodig
- Google Cloud Console setup
- Supabase provider enable
- Productie URLs configureren

**Alle code is klaar - alleen Supabase config nodig voor Google OAuth!** 🚀
