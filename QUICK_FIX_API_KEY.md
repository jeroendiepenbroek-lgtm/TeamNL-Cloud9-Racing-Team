# 🚀 QUICK START: Fix Invalid API Key

## Het Probleem
Frontend toont **"Invalid API key"** bij laden van Racing Matrix.

## De Oplossing (5 minuten)

### Optie 1: Interactieve Fix (Aanbevolen) ⚡

Run dit script en volg de stappen:

```bash
./fix-api-key.sh
```

Dit script:
1. ✅ Vraagt je om API key op te halen
2. ✅ Test of de key werkt
3. ✅ Update automatisch alle .env files
4. ✅ Verifieert data connectie
5. ✅ Geeft rebuild instructies

---

### Optie 2: Handmatig (Als je weet wat je doet)

1. **Haal API Key op**:
   ```
   https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/settings/api
   ```
   Kopieer de **"anon public"** key

2. **Test de key**:
   ```bash
   ./test-supabase-keys.sh <YOUR_KEY>
   ```

3. **Update `frontend/.env`**:
   ```bash
   VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
   VITE_SUPABASE_ANON_KEY=<YOUR_KEY>
   ```

4. **Rebuild frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

---

## Verify Het Werkt

Open http://localhost:5173 en check:
- ✅ Racing Matrix laadt zonder errors
- ✅ Je ziet riders met vELO scores
- ✅ Browser console heeft geen "Invalid API key" errors

---

## Troubleshooting

**Q: "View does not exist" error?**  
A: Draai eerst migrations in Supabase:
   https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new
   Plak inhoud van `SETUP_SUPABASE_COMPLETE.sql` en run.

**Q: Key blijft invalid?**  
A: Check of het juiste Supabase project is (moet zijn: bktbeefdmrpxhsyyalvc)

**Q: Frontend toont nog steeds oude key?**  
A: Stop frontend (Ctrl+C), clear cache, herstart:
   ```bash
   cd frontend
   rm -rf node_modules/.vite
   npm run dev
   ```

---

## 📚 Meer Info

Zie [FIX_INVALID_API_KEY.md](./FIX_INVALID_API_KEY.md) voor complete documentatie.
