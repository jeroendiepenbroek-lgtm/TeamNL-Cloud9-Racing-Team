# Discord OAuth Setup Guide

**Status**: Code geïmplementeerd, Supabase configuratie vereist  
**Datum**: 10 november 2025

---

## ✅ Huidige Implementatie

### Frontend (Compleet)
- ✅ **LoginModal.tsx** - Discord button met branding
- ✅ **AuthContext.tsx** - `signInWithDiscord()` functie
- ✅ **OAuth Redirect** - Automatisch naar `/` na authenticatie

### Backend (Geen wijzigingen nodig)
Supabase handelt OAuth flow volledig af.

---

## 🔧 Supabase Configuratie (Required)

### 1. Discord Application Aanmaken

**Discord Developer Portal**: https://discord.com/developers/applications

1. Ga naar https://discord.com/developers/applications
2. Klik **"New Application"**
3. Naam: `TeamNL Cloud9 Racing Dashboard` (of eigen naam)
4. Accept Terms → **Create**

### 2. OAuth2 Settings Configureren

**In je Discord application**:

1. Ga naar **OAuth2** → **General**
2. Kopieer **Client ID** en **Client Secret** (bewaar veilig!)

**Add Redirects**:

Development:
```
http://localhost:5173/
https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback
```

Production:
```
https://teamnl-cloud9-racing-team-production.up.railway.app/
https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback
```

**⚠️ Belangrijk**: De Supabase callback URL moet ALTIJD toegevoegd worden!

### 3. Supabase Discord Provider Activeren

**Supabase Dashboard**: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc

1. Ga naar **Authentication** → **Providers**
2. Zoek **Discord** in de lijst
3. Klik **Enable**
4. Vul in:
   - **Discord Client ID**: `<jouw-discord-client-id>`
   - **Discord Secret**: `<jouw-discord-client-secret>`
5. **Save**

### 4. Site URL & Redirect URLs in Supabase

**Supabase** → **Authentication** → **URL Configuration**:

**Site URL**:
```
Development: http://localhost:5173
Production: https://teamnl-cloud9-racing-team-production.up.railway.app
```

**Redirect URLs** (voeg beide toe):
```
http://localhost:5173/*
https://teamnl-cloud9-racing-team-production.up.railway.app/*
```

**⚠️ Let op**: Gebruik `/*` wildcard voor alle routes!

---

## 🎨 UI Features

### Login Modal
```tsx
// 4 OAuth providers in 2x2 grid:
┌─────────────┬─────────────┐
│   Google    │   Discord   │  ← Discord met paarse branding
├─────────────┼─────────────┤
│   GitHub    │  Microsoft  │
└─────────────┴─────────────┘
```

**Discord Button Styling**:
- Achtergrond: `#5865F2` (Discord brand blue)
- Hover: `#4752C4`
- Icon: Discord logo SVG
- Text: "Discord" (wit)

### Auth Flow
1. User klikt **Discord** button
2. Redirect naar Discord OAuth consent
3. User authoriseert app
4. Redirect terug naar `${window.location.origin}/`
5. AuthContext detecteert nieuwe sessie
6. Dashboard laadt met authenticated state

---

## 🔐 Security & Privacy

### Scopes Gevraagd
```
identify
email
```

**Discord permissions**:
- ✅ **identify** - Username, avatar, discriminator
- ✅ **email** - Email adres (voor Supabase user matching)

**Niet gevraagd**:
- ❌ guilds (server lijst)
- ❌ messages (berichten lezen)
- ❌ connections (andere accounts)

### Data Opslag (Supabase)
```sql
-- users tabel
id: uuid (Supabase auth ID)
email: varchar (Discord email)
raw_user_meta_data: jsonb
  {
    "provider": "discord",
    "discord_id": "123456789",
    "discord_username": "username#1234",
    "avatar_url": "https://cdn.discordapp.com/...",
    ...
  }
```

---

## 📋 Testing Checklist

### Development (localhost:5173)
- [ ] Klik Discord button in login modal
- [ ] Redirect naar Discord consent scherm
- [ ] Authorize app
- [ ] Redirect terug naar dashboard
- [ ] User is ingelogd (zie logout button)
- [ ] Dashboard toont admin cards
- [ ] Refresh pagina - sessie blijft actief
- [ ] Logout werkt correct

### Production (Railway)
- [ ] Zelfde flow op production URL
- [ ] Check Supabase dashboard voor nieuwe user
- [ ] Verify `raw_user_meta_data` bevat Discord info
- [ ] Test cross-device (mobile/desktop)

---

## 🐛 Troubleshooting

### "Invalid redirect_uri"
**Probleem**: Discord redirect URL niet toegevoegd  
**Oplossing**:
1. Discord Developer Portal → OAuth2 → Redirects
2. Add: `https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback`
3. Save Changes

### "Provider disabled"
**Probleem**: Discord provider niet enabled in Supabase  
**Oplossing**:
1. Supabase Dashboard → Authentication → Providers
2. Find Discord → Enable toggle
3. Add Client ID + Secret
4. Save

### Redirect naar localhost in productie
**Probleem**: Site URL in Supabase nog op localhost  
**Oplossing**:
1. Supabase → Authentication → URL Configuration
2. Site URL: `https://teamnl-cloud9-racing-team-production.up.railway.app`
3. Redirect URLs: Add production URL met `/*`

### User kan niet inloggen
**Probleem**: Email niet geverifieerd of niet in whitelist  
**Oplossing**:
1. Check Supabase → Authentication → Users
2. Verify email confirmed
3. Check Supabase → Authentication → Policies voor RLS

### Browser console errors
**Probleem**: CORS of Supabase connection issues  
**Oplossing**:
```bash
# Check browser console voor specifieke error
# Verify VITE_SUPABASE_ANON_KEY in .env.local
# Check Supabase project status
```

---

## 🚀 Deployment

### Railway Environment Variables
**Geen extra variabelen nodig!**

Discord OAuth werkt via Supabase, dus alleen de bestaande keys:
```env
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Deployment Checklist
- [ ] Discord app redirect URLs → add production URL
- [ ] Supabase Site URL → update naar production
- [ ] Supabase Redirect URLs → add production met `/*`
- [ ] Git push → Railway auto-deploy
- [ ] Test Discord login op production
- [ ] Verify user in Supabase dashboard

---

## 📊 Multi-Provider Setup Status

| Provider | Frontend | AuthContext | Supabase Config | Status |
|----------|----------|-------------|-----------------|--------|
| **Email/Password** | ✅ | ✅ | ✅ | **Active** |
| **Google** | ✅ | ✅ | ⚠️ Configuratie vereist | Ready |
| **Discord** | ✅ | ✅ | ⚠️ Configuratie vereist | Ready |
| **GitHub** | ✅ | ✅ | ⚠️ Configuratie vereist | Ready |
| **Microsoft** | ✅ | ✅ | ⚠️ Configuratie vereist | Ready |

**Status Legend**:
- ✅ Geïmplementeerd en geconfigureerd
- ⚠️ Code klaar, Supabase configuratie vereist
- ❌ Niet geïmplementeerd

---

## 🎯 Volgende Stappen

### Nu doen:
1. **Discord App aanmaken** (5 min)
2. **Supabase Discord provider activeren** (2 min)
3. **Redirect URLs toevoegen** (2 min)
4. **Test login flow** (5 min)

### Later (optioneel):
- [ ] Google OAuth configureren
- [ ] GitHub OAuth configureren
- [ ] Microsoft Azure AD configureren
- [ ] Role mapping (Discord roles → app roles)
- [ ] Team member auto-detection (via Discord guild)

---

## 📚 Resources

- **Discord Developers**: https://discord.com/developers/docs/topics/oauth2
- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth/social-login/auth-discord
- **Discord Brand Assets**: https://discord.com/branding
- **OAuth 2.0 Spec**: https://oauth.net/2/

---

**🎉 Discord OAuth is code-ready! Configureer Supabase en test!** 🚀
