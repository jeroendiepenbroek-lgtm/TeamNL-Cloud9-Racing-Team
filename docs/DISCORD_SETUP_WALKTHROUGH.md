# Discord OAuth Setup - Step-by-Step Walkthrough

## Stap 1: Discord Developer Portal

### 1.1 Maak Discord Application
1. Ga naar: https://discord.com/developers/applications
2. Klik rechtsboven op **"New Application"**
3. Vul in:
   - **NAME**: `TeamNL Cloud9 Racing`
4. Accepteer Discord Developer Terms
5. Klik **"Create"**

### 1.2 Configureer OAuth2
1. In je nieuwe application, klik in het linker menu op **"OAuth2"** → **"General"**
2. Scroll naar **"Redirects"** sectie
3. Klik **"Add Redirect"**
4. Vul EXACT in:
   ```
   https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback
   ```
5. Klik **"Save Changes"** onderaan de pagina

### 1.3 Kopieer Credentials
1. Blijf op de **OAuth2 → General** pagina
2. Kopieer de **CLIENT ID** (lang nummer, bijv: 1234567890123456789)
3. Klik **"Reset Secret"** → **"Yes, do it!"**
4. Kopieer de **CLIENT SECRET** die verschijnt (EENMALIG te zien!)
5. Bewaar beide ergens veilig (bijv. notepad) voor volgende stap

**✅ Discord Portal Klaar!** Je hebt nu:
- ✅ Discord Application aangemaakt
- ✅ Redirect URL toegevoegd
- ✅ Client ID + Secret gekopieerd

---

## Stap 2: Supabase Dashboard

### 2.1 Open Supabase Project
1. Ga naar: https://supabase.com/dashboard
2. Login met je Supabase account
3. Selecteer project: **"bktbeefdmrpxhsyyalvc"** (TeamNL Cloud9)

### 2.2 Enable Discord Provider
1. In linker menu: klik **"Authentication"** (shield icon)
2. Klik **"Providers"** tab bovenaan
3. Scroll naar **"Discord"** (paarse Discord logo)
4. Klik op **"Discord"** om uit te klappen
5. Schakel **"Enable Sign in with Discord"** AAN (toggle naar rechts)

### 2.3 Vul Discord Credentials In
1. Plak je Discord **Client ID** (uit stap 1.3)
2. Plak je Discord **Client Secret** (uit stap 1.3)
3. Verifieer dat **"Callback URL (for OAuth)"** automatisch is ingevuld:
   ```
   https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback
   ```
4. Klik **"Save"** rechtsonder

### 2.4 Configureer Redirect URLs (eenmalig voor alle providers)
1. Blijf in **Authentication** sectie
2. Klik op **"URL Configuration"** tab
3. Onder **"Redirect URLs"**, voeg toe (indien niet aanwezig):
   ```
   http://localhost:5173
   http://localhost:5173/
   https://teamnl-cloud9-racing-team-production.up.railway.app
   https://teamnl-cloud9-racing-team-production.up.railway.app/
   ```
4. Onder **"Site URL"**, zet:
   ```
   http://localhost:5173
   ```
   (Voor productie verander dit later naar je Railway URL)
5. Klik **"Save"**

**✅ Supabase Klaar!** Discord provider is nu actief.

---

## Stap 3: Lokaal Testen

### 3.1 Herstart Frontend (indien nodig)
```bash
# In terminal
cd /workspaces/TeamNL-Cloud9-Racing-Team/backend/frontend
pkill -f vite || true
npm run dev
```

### 3.2 Test Discord Login
1. Open: http://localhost:5173
2. Klik rechtsboven op **"Admin Login"**
3. Klik op de **paarse Discord knop**
4. Je wordt doorverwezen naar Discord:
   - Login met je Discord account
   - Klik **"Authorize"** om TeamNL Cloud9 toegang te geven
5. Je wordt teruggeleid naar http://localhost:5173
6. **Succes**: Je bent nu ingelogd! Check rechtsboven voor email/logout knop

### 3.3 Verifieer in Supabase
1. Ga terug naar Supabase Dashboard
2. **Authentication** → **Users** tab
3. Je ziet je nieuwe Discord user met:
   - Email (van Discord account)
   - Provider: `discord`
   - Created timestamp

---

## Troubleshooting

### Error: "Invalid redirect_uri"
- **Oorzaak**: Redirect URL in Discord portal matcht niet EXACT
- **Oplossing**: 
  1. Check Discord Developer Portal → OAuth2 → Redirects
  2. Moet EXACT zijn: `https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback`
  3. Geen extra `/` aan het einde
  4. Save changes en probeer opnieuw

### Error: "Invalid client credentials"
- **Oorzaak**: Client ID of Secret verkeerd gekopieerd
- **Oplossing**:
  1. Discord Developer Portal → OAuth2 → General
  2. Reset Secret opnieuw
  3. Kopieer NIEUWE secret
  4. Plak in Supabase en Save

### Login werkt niet / geen redirect
- **Oorzaak**: Frontend niet herstart na Supabase changes
- **Oplossing**: 
  ```bash
  pkill -f vite
  cd backend/frontend && npm run dev
  ```

### Blank screen na redirect
- **Check**: Browser console (F12) voor errors
- **Check**: `/debug` pagina: http://localhost:5173/debug
- **Verify**: `VITE_SUPABASE_ANON_KEY` is correct in `.env.local`

---

## ✅ Discord Setup Compleet!

Je kunt nu inloggen met Discord. Herhaal dezelfde stappen voor:
- **Google**: Zie `docs/OAUTH_PROVIDERS_SETUP.md` sectie "Google OAuth Setup"
- **GitHub**: Zie `docs/OAUTH_PROVIDERS_SETUP.md` sectie "GitHub OAuth Setup"  
- **Microsoft**: Zie `docs/OAUTH_PROVIDERS_SETUP.md` sectie "Microsoft Azure OAuth Setup"

Alle providers gebruiken dezelfde Supabase callback URL! 🎉
