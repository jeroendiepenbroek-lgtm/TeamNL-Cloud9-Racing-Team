# Google OAuth Setup voor TeamNL Cloud9 Dashboard

## Overzicht
De applicatie gebruikt nu **Supabase Auth met Google OAuth** in plaats van simpele email/password authenticatie. Dit biedt een veiligere en gebruiksvriendelijkere inlogervaring.

## ✅ Wat is geïmplementeerd

### 1. Google OAuth Login
- ✅ `signInWithGoogle()` functie in AuthContext
- ✅ Google login knop in LoginModal met Google branding
- ✅ Automatische redirect naar Google OAuth flow
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

## 🔧 Supabase Google OAuth Configuratie

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

### Stap 3: Toegestane Domeinen
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

### Lokaal Testen
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd backend/frontend && npm run dev`
3. Open: http://localhost:5173
4. Klik **Admin Login** → **Inloggen met Google**
5. Volg Google OAuth flow
6. Verify je wordt teruggeleid naar dashboard met admin rechten

### Debug Pagina
Open http://localhost:5173/debug om te zien:
- Environment variabelen status
- Supabase connectie status
- Auth context state
- Browser info

## 📝 Code Wijzigingen

### AuthContext.tsx
```typescript
// Nieuwe methode toegevoegd
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

### LoginModal.tsx
- Google OAuth knop met officiële Google branding
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
