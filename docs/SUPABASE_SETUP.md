# Supabase Setup Guide - TeamNL Cloud9

## 1. Project Aanmaken

1. Ga naar https://supabase.com/dashboard
2. Klik **"New Project"**
3. Vul in:
   - **Name**: `teamnl-cloud9-racing`
   - **Database Password**: Genereer strong password (sla op!)
   - **Region**: `West Europe (Frankfurt)` (dichtstbij Nederland)
   - **Pricing Plan**: Free tier

## 2. Database Schema Deployen

1. Wacht tot project provisioned is (~2 min)
2. Ga naar **SQL Editor** in sidebar
3. Open `/workspaces/TeamNL-Cloud9-Racing-Team/supabase/schema.sql`
4. Kopieer VOLLEDIGE inhoud
5. Plak in SQL Editor
6. Klik **"Run"** (Ctrl+Enter)
7. Verify output: "Success. No rows returned"

## 3. API Credentials Ophalen

### A. Anon Key (Public - voor frontend)
1. Ga naar **Settings** → **API**
2. Kopieer **Project URL**: `https://xxxxx.supabase.co`
3. Kopieer **anon public** key (begint met `eyJhb...`)

### B. Service Role Key (Secret - voor backend)
1. Blijf in **Settings** → **API**
2. Scroll naar **service_role**
3. Kopieer **service_role** key (begint met `eyJhb...`)
4. ⚠️ **WAARSCHUWING**: Dit is een SECRET key! Deel nooit publiekelijk

## 4. Environment Variables Instellen

### Backend `.env`:
```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Frontend `.env`:
```bash
# Supabase (Public keys - veilig voor browser)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 5. Verify Database Schema

1. Ga naar **Table Editor** in sidebar
2. Check dat deze tables bestaan:
   - ✅ `riders` (7 columns)
   - ✅ `clubs` (5 columns)
   - ✅ `club_roster` (4 columns)
   - ✅ `events` (5 columns)
   - ✅ `race_results` (13 columns)
   - ✅ `rider_history` (10 columns)
   - ✅ `sync_logs` (8 columns)

3. Klik op **riders** table
4. Check **Indexes** tab: Zie je `idx_riders_zwift_id`? ✅
5. Check **Policies** tab: Zie je "Public read access"? ✅

## 6. Enable Real-time (Verify)

1. Ga naar **Database** → **Replication**
2. Check dat **Realtime** enabled is voor alle tables
3. Als niet: Klik **"Add table"** voor elke missing table

## 7. Test Database Connection

Via SQL Editor:
```sql
-- Insert test rider
INSERT INTO riders (zwift_id, name, ftp, weight, w_per_kg)
VALUES (999999, 'Test Rider', 300, 75, 4.0);

-- Verify insert
SELECT * FROM riders WHERE zwift_id = 999999;

-- Delete test rider
DELETE FROM riders WHERE zwift_id = 999999;
```

## ✅ Setup Complete!

Nu kun je:
1. Backend implementeren met `@supabase/supabase-js`
2. Frontend connecten met real-time subscriptions
3. Data syncen vanaf Zwift API → Supabase

---

## Troubleshooting

### Error: "relation does not exist"
→ Schema niet correct uitgevoerd. Run `supabase/schema.sql` opnieuw.

### Error: "JWT expired"
→ Check dat je de juiste keys gebruikt (niet oud project).

### Error: "permission denied for table"
→ RLS policies niet correct. Run schema opnieuw of disable RLS tijdelijk:
```sql
ALTER TABLE riders DISABLE ROW LEVEL SECURITY;
```

### Rate Limits (Free Tier)
- Database: 500MB storage
- Bandwidth: 2GB/maand (egress)
- API Requests: Unlimited!
- Real-time connections: 200 concurrent
