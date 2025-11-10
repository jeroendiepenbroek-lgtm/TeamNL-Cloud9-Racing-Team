# Supabase Auth Setup Instructies

## Stap 1: Enable Authentication in Supabase Dashboard
1. Open https://supabase.com/dashboard
2. Ga naar je project: bktbeefdmrpxhsyyalvc
3. Klik op **Authentication** in het linker menu
4. Authentication is waarschijnlijk al enabled

## Stap 2: Haal je Anon Key op
1. Ga naar **Settings** (tandwiel icoon links onderaan)
2. Klik op **API**
3. Onder "Project API keys" vind je:
   - `anon` / `public` key - deze heb je nodig!
   - `service_role` key - NIET gebruiken in frontend

## Stap 3: Update .env.local met de Anon Key
Bestand: `backend/frontend/.env.local`

```bash
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=<plak hier je anon key>
```

## Stap 4: Maak een Admin User aan
1. In Supabase Dashboard, ga naar **Authentication** → **Users**
2. Klik op **Add user** (of **Invite user**)
3. Kies **Create new user**
4. Vul in:
   - Email: bijv. `admin@cloudracer.nl` of je eigen email
   - Password: kies een sterk wachtwoord (minimaal 6 tekens)
   - Auto Confirm User: **AAN** (vinkje zetten)
5. Klik **Create user**

## Stap 5: Herstart de dev server (als die draait)
```bash
cd /workspaces/TeamNL-Cloud9-Racing-Team/backend/frontend
# Stop de server met Ctrl+C
npm run dev
```

## Stap 6: Test de Login Flow
1. Open http://localhost:5173 in je browser
2. Klik op **Admin Login** knop (rechtsboven)
3. Log in met je nieuwe admin credentials
4. Je zou nu ingelogd moeten zijn (knop verandert in "Logout")
5. De "Manage Riders" en "Sync Data" kaarten zijn nu zichtbaar op dashboard
6. Je kan naar /riders en /sync navigeren
7. Als je uitlogt verdwijnen de admin features

## Stap 7: Test Protected Routes
- Zonder login: `/riders` redirect naar `/`
- Zonder login: `/sync` redirect naar `/`
- Met login: beide pagina's toegankelijk

## Verificatie Checklist
- ✅ Build slaagt zonder errors
- ✅ Dev server draait op http://localhost:5173
- ⏳ Anon key toegevoegd aan .env.local
- ⏳ Admin user aangemaakt in Supabase
- ⏳ Login werkt met modal
- ⏳ Protected routes werken
- ⏳ Dashboard toont alleen admin links met auth
- ⏳ Matrix legend toont vELO badges met rank nummers

## Deployment naar Railway
Na lokale test:
```bash
git add .
git commit -m "feat: Supabase auth + protected routes + Matrix legend badges"
git push origin main
```

Railway deployed automatisch. Voeg daar ook de VITE_SUPABASE_ANON_KEY toe:
1. Railway Dashboard → Je service
2. Variables tab
3. Add: `VITE_SUPABASE_ANON_KEY=<jouw anon key>`
4. Redeploy

## Troubleshooting

### "Property 'env' does not exist on ImportMeta"
✅ Fixed - vite-env.d.ts toegevoegd

### Login werkt niet / geen sessie
- Check of anon key correct is in .env.local
- Check browser console voor errors
- Verify Supabase URL klopt
- Check of user Auto Confirmed is in Supabase dashboard

### Protected routes redirecten niet
- Check of AuthProvider wrapper om hele app zit (in App.tsx)
- Check browser console voor errors in AuthContext

### "User not found" bij login
- Maak user aan in Supabase dashboard
- Zorg dat Auto Confirm aan staat
- Check email/password spelling
