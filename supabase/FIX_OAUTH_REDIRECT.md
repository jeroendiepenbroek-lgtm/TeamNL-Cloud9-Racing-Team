# Fix Discord OAuth Redirect URL

## Probleem
Discord OAuth redirect naar verkeerde URL (dev container in plaats van Railway production).

**Symptoom**: Na Discord login krijg je:
```
Deze pagina op orange-space-orbit-r4vq77x64v9jhpg4p-5173.app.github.dev kan niet worden gevonden
```

## Oplossing

### Stap 1: Supabase Auth Configuration

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/auth/url-configuration

2. **Site URL** (onder "General settings"):
   ```
   https://teamnl-cloud9-racing-team-production.up.railway.app
   ```

3. **Redirect URLs** (onder "Redirect URLs"):
   Voeg toe:
   ```
   https://teamnl-cloud9-racing-team-production.up.railway.app/**
   https://teamnl-cloud9-racing-team-production.up.railway.app/auth/callback
   ```

4. **Verwijder** oude URLs (als aanwezig):
   ```
   https://orange-space-orbit-r4vq77x64v9jhpg4p-5173.app.github.dev/**
   ```

5. Klik **"Save"**

### Stap 2: Discord Developer Portal

1. Open Discord Developer Portal: https://discord.com/developers/applications

2. Selecteer je applicatie (TeamNL Cloud9 of hoe je het genoemd hebt)

3. Ga naar **OAuth2** → **General**

4. **Redirects** moet bevatten:
   ```
   https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback
   ```
   (Dit is Supabase's callback URL, NIET je Railway URL)

5. Klik **"Save Changes"**

### Stap 3: Test Login

1. Open: https://teamnl-cloud9-racing-team-production.up.railway.app

2. Klik **"Inloggen"**

3. Klik **Discord button**

4. Autoriseer Discord

5. Je wordt nu correct teruggestuurd naar Railway! ✅

## Verificatie

Na fix moet je zien:
- ✅ Redirect naar Railway URL (niet Codespaces)
- ✅ Ingelogd als `jeroen.diepenbroek@gmail.com`
- ✅ Header toont Discord avatar + naam
- ✅ "Rider Management" en "Sync Status" links zichtbaar

## Environment Variables (Railway)

Zorg dat Railway de juiste environment variables heeft:

```env
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NTQ2MzEsImV4cCI6MjA3NzUzMDYzMX0.HHa7K3J-pmR73hm063w0JJhA4pFASYS65DFI-BZGAqw
```

Deze staan al in `backend/frontend/.env.local` en worden mee-ge-build tijdens Railway deployment.

## Troubleshooting

### Nog steeds redirect naar Codespaces?
- Clear browser cache + cookies
- Hard refresh: Ctrl+Shift+R (Windows/Linux) of Cmd+Shift+R (Mac)
- Probeer Incognito mode

### Login werkt maar geen admin access?
- Run eerst `supabase/SETUP_COMPLETE.sql` om admin role toe te kennen

### Logo nog steeds niet zichtbaar?
- Wacht 2-3 minuten voor Railway deployment compleet is
- Check build logs in Railway dashboard
