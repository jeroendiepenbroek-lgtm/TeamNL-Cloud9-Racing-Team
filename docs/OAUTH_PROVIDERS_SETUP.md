````markdown
# Multi-Provider OAuth Setup voor TeamNL Cloud9 Dashboard

## Overzicht
De applicatie ondersteunt nu **meerdere OAuth providers** via Supabase Auth:
- 🔵 **Google** - Meest gebruikt, aanbevolen
- 🟣 **Discord** - Populair in gaming communities
- ⚫ **GitHub** - Voor developers
- 🟦 **Microsoft Azure** - Voor organisaties met Microsoft 365

Dit biedt gebruikers flexibiliteit en een veiligere inlogervaring dan email/password.

## ✅ Wat is geïmplementeerd

### 1. Multi-Provider OAuth Login
- ✅ `signInWithGoogle()` - Google OAuth
- ✅ `signInWithDiscord()` - Discord OAuth
- ✅ `signInWithGithub()` - GitHub OAuth
- ✅ `signInWithAzure()` - Microsoft Azure AD OAuth
- ✅ 2x2 grid in LoginModal met alle providers
- ✅ Officiële branding en kleuren per provider
- ✅ Automatische redirect naar OAuth flow
- ✅ Callback handling naar home page (/)
- ✅ Email/password login als fallback optie

### 2. Verbeterde Error Handling
- ✅ 3 seconden timeout voor auth loading
- ✅ Console logging voor debugging
- ✅ Graceful degradation als Supabase niet bereikbaar is
- ✅ Blank screen voorkomen bij auth errors

### 3. Debug Pagina
- ✅ `/debug` route voor troubleshooting
- ✅ Toont environment variabelen
- ✅ Test Supabase connectie
- ✅ Toont auth context state

## 🔧 OAuth Provider Configuratie

### Supabase Redirect URL (voor alle providers)
**Belangrijk**: Alle providers gebruiken deze redirect URL:
```
https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback
```

---

## 🔵 Google OAuth Setup

### Stap 1: Google Cloud Console
1. Ga naar [Google Cloud Console](https://console.cloud.google.com/)
2. Maak een nieuw project of selecteer bestaand project
3. Ga naar **APIs & Services** → **Credentials**
4. Klik **Create Credentials** → **OAuth 2.0 Client ID**
5. Configureer OAuth consent screen:
   - Application type: **Web application**
   - Name: `TeamNL Cloud9 Racing Dashboard`
   - Authorized redirect URIs: 
     ```
     https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback
     ```
     (voor development ook toevoegen:)
     ```
     http://localhost:54321/auth/v1/callback
     ```
6. Kopieer de **Client ID** en **Client Secret**

### Stap 2: Supabase Dashboard
1. Ga naar [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecteer je project: `bktbeefdmrpxhsyyalvc`
3. Ga naar **Authentication** → **Providers**
4. Zoek **Google** en schakel in
5. Vul in:
   - **Client ID**: (uit stap 1)
   - **Client Secret**: (uit stap 1)
   - **Redirect URL**: Wordt automatisch gevuld
6. Klik **Save**

---

## 🟣 Discord OAuth Setup

### Stap 1: Discord Developer Portal
1. Ga naar [Discord Developer Portal](https://discord.com/developers/applications)
2. Klik **New Application**
3. Geef een naam: `TeamNL Cloud9 Racing`
4. Ga naar **OAuth2** → **General**
5. Voeg toe aan **Redirects**:
   ```
   https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback
   ```
6. Kopieer **Client ID** en **Client Secret**

### Stap 2: Supabase Dashboard
1. Ga naar **Authentication** → **Providers**
2. Zoek **Discord** en schakel in
3. Vul in:
   - **Client ID**: (uit Discord portal)
   - **Client Secret**: (uit Discord portal)
4. Klik **Save**

---

## ⚫ GitHub OAuth Setup

### Stap 1: GitHub Settings
1. Ga naar [GitHub Developer Settings](https://github.com/settings/developers)
2. Klik **New OAuth App**
3. Vul in:
   - **Application name**: `TeamNL Cloud9 Racing Dashboard`
   - **Homepage URL**: `http://localhost:5173` (of productie URL)
   - **Authorization callback URL**: 
     ```
     https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback
     ```
4. Kopieer **Client ID** 
5. Genereer en kopieer **Client Secret**

### Stap 2: Supabase Dashboard
1. Ga naar **Authentication** → **Providers**
2. Zoek **GitHub** en schakel in
3. Vul in:
   - **Client ID**: (uit GitHub OAuth app)
   - **Client Secret**: (uit GitHub OAuth app)
4. Klik **Save**

---

## 🟦 Microsoft Azure OAuth Setup

### Stap 1: Azure Portal
1. Ga naar [Azure Portal](https://portal.azure.com)
2. Zoek **Microsoft Entra ID** (voorheen Azure Active Directory)
3. Ga naar **App registrations** → **New registration**
4. Vul in:
   - **Name**: `TeamNL Cloud9 Racing`
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: Web - `https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback`
5. Kopieer **Application (client) ID**
6. Ga naar **Certificates & secrets** → **New client secret**
7. Kopieer de **Value** (dit is je Client Secret)
8. Ga naar **API permissions** → **Add a permission** → **Microsoft Graph**:
   - `email`
   - `openid`
   - `profile`

### Stap 2: Supabase Dashboard
1. Ga naar **Authentication** → **Providers**
2. Zoek **Azure** en schakel in
3. Vul in:
   - **Client ID**: (Application ID uit Azure)
   - **Client Secret**: (Secret value uit Azure)
   - **Azure Tenant URL**: `https://login.microsoftonline.com/common` (voor multi-tenant)
4. Klik **Save**

---

## ⚙️ Algemene Supabase Configuratie

### Toegestane Domeinen
In Supabase Dashboard:
1. Ga naar **Authentication** → **URL Configuration**
2. Voeg toe aan **Redirect URLs**:
   ```
   http://localhost:5173/
   https://jouw-productie-url.com/
   ```
3. Voeg toe aan **Site URL**:
   ```
   http://localhost:5173
   ```

## 🧪 Testen

### Lokaal Testen (per provider)
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd backend/frontend && npm run dev`
3. Open: http://localhost:5173
4. Klik **Admin Login**
5. Kies een provider:
   - **Google**: Voor Gmail accounts
   - **Discord**: Voor Discord users (gaming community)
   - **GitHub**: Voor developers met GitHub account
   - **Microsoft**: Voor Office 365 / Azure AD users
6. Volg OAuth flow van gekozen provider
7. Verify je wordt teruggeleid naar dashboard met ingelogde status

### Welke Provider Kiezen?
- **Google**: Meest universeel, iedereen heeft Gmail
- **Discord**: Perfect voor gaming teams en communities
- **GitHub**: Ideaal voor development teams
- **Microsoft**: Voor bedrijven met Microsoft 365

### Debug Pagina
Open http://localhost:5173/debug om te zien:
- Environment variabelen status
- Supabase connectie status
- Auth context state
- Browser info

## 📝 Code Wijzigingen

### AuthContext.tsx
```typescript
// Alle OAuth providers toegevoegd
const signInWithGoogle = async () => { /* ... */ }
const signInWithDiscord = async () => { /* ... */ }
const signInWithGithub = async () => { /* ... */ }
const signInWithAzure = async () => { /* ... */ }

// Unified handler in LoginModal
const handleOAuthSignIn = async (provider: 'google' | 'discord' | 'github' | 'azure') => {
  // Switch tussen providers
}
```

### LoginModal.tsx
- 2x2 grid met 4 OAuth providers
- Officiële branding per provider:
  - Google: Multi-color logo
  - Discord: Purple (#5865F2)
  - GitHub: Dark (#24292e)
  - Microsoft: Windows logo colors
- "Of met email" divider
- Email/password als fallback optie

### supabase.ts
- Verbeterde config logging
- Expliciet localStorage support
- Betere error messages

## 🚀 Deployment

### Railway Environment Variables
Zorg dat deze vars gezet zijn in Railway:
```bash
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...  # De valide anon key
```

### Production URLs
Update in Supabase Dashboard:
1. **Redirect URLs**: Voeg je Railway URL toe
2. **Site URL**: Update naar productie domein
3. **Google Console**: Voeg productie redirect URI toe

## 🔑 Admin User

### Email/Password Fallback
Als Google OAuth niet werkt, kun je nog steeds inloggen met:
- Email: `admin@cloudracer.nl`
- Password: `CloudRacer2024!`

### Nieuwe Users Toevoegen via Google
1. User logt in met Google account
2. Supabase maakt automatisch user aan
3. Check in Supabase Dashboard → Authentication → Users
4. **Optioneel**: Voeg custom metadata toe voor admin rechten

## ⚠️ Troubleshooting

### Blank Screen
- Check `/debug` pagina voor details
- Verify `VITE_SUPABASE_ANON_KEY` is correct geladen
- Check browser console voor errors
- AuthContext heeft 3s timeout om blank screen te voorkomen

### Google OAuth Redirect Error
- Verify redirect URI exact matcht in Google Console
- Check Supabase redirect URLs configuratie
- Ensure `detectSessionInUrl: true` in supabase client

### "Invalid API Key" Error
- Anon key is mogelijk nog steeds incorrect
- Haal nieuwe key op uit Supabase Dashboard → Settings → API
- Update `.env.local` en herstart frontend

### Users Kunnen Niet Inloggen
- Check Google OAuth consent screen status (in testing vs published)
- Voeg test users toe in Google Console tijdens development
- Verify email scope is enabled

## 📚 Resources
- [Supabase Google OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth Setup](https://support.google.com/cloud/answer/6158849)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

````
