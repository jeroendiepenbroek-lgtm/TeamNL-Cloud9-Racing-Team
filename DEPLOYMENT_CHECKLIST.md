# 🚀 DEPLOYMENT CHECKLIST - Stap voor Stap

## ✅ Stap 1: Cleanup VOLTOOID
- [x] Oude schema verwijderd
- [x] Alle tabellen zijn weg
- [x] Ready voor nieuwe schema

---

## 📋 Stap 2: Deploy MVP Schema - **JE BENT HIER**

### Exacte Instructies:

1. **Open Supabase SQL Editor in browser:**
   ```
   https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/sql
   ```

2. **Klik op "New query" knop** (links bovenin)

3. **Selecteer ALLES in mvp-schema.sql:**
   - In VS Code: Druk `Ctrl+A` in het mvp-schema.sql bestand
   - Of: Klik op regel 1, scroll naar beneden, Shift+Click op regel 399
   - Of: Gebruik de tab hieronder om te kopiëren

4. **Kopieer (Ctrl+C)**

5. **Plak in Supabase SQL Editor (Ctrl+V)**
   - Je moet nu 399 regels zien
   - Eerste regel: `-- ============================================================================`
   - Laatste regel: `-- ============================================================================`

6. **Klik op "RUN" knop** (groene knop rechts bovenin)

7. **Wacht 10-30 seconden**

8. **Verwacht één van deze resultaten:**
   - ✅ "Success. No rows returned."
   - ✅ Een tabel met "schemaname, tablename, size, column_count"
   - ❌ ERROR met rode tekst (rapporteer deze aan mij)

9. **Kom terug naar VS Code** en type in chat: "deployed" of "error: [foutmelding]"

---

## 🔍 Veelvoorkomende Problemen:

### Probleem 1: "Success" maar geen tabellen
**Oorzaak:** Niet alle regels gekopieerd
**Oplossing:** Scroll in SQL Editor naar beneden, check of regel 399 er is

### Probleem 2: "ERROR: syntax error"
**Oorzaak:** Speciale karakters verkeerd gekopieerd
**Oplossing:** Download het bestand en upload in SQL Editor (File → Upload)

### Probleem 3: "ERROR: permission denied"
**Oorzaak:** Verkeerde Supabase project
**Oplossing:** Check URL moet zijn: bktbeefdmrpxhsyyalvc.supabase.co

---

## 💡 Tips:

- **Kopieer in één keer:** Selecteer alles, kopieer alles, plak alles
- **Wacht tot het klaar is:** De groene balk moet volledig zijn
- **Check de output:** Moet iets laten zien (geen lege screen)

---

## 📞 Help Nodig?

Type in chat:
- "deployed" → als het gelukt is
- "error: [foutmelding]" → als er een error is
- "geen output" → als er niets gebeurt na RUN
- "niet duidelijk" → als je stuck bent

---

**Status:** ⏳ Wachtend op schema deployment...
