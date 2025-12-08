# Discord OAuth Configuratie Backup
**Datum**: 8 december 2025

## Supabase Project
- **Project ID**: bktbeefdmrpxhsyyalvc
- **Project URL**: https://bktbeefdmrpxhsyyalvc.supabase.co
- **Region**: Netherlands (eu-west-1)

## Supabase Auth Settings
**URL**: https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/auth/providers

### Discord Provider
- Status: ✅ Enabled
- Callback URL: `https://bktbeefdmrpxhsyyalvc.supabase.co/auth/v1/callback`

### Environment Variables (Frontend)
```bash
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3MjQ1ODksImV4cCI6MjA0NjMwMDU4OX0.6hHXDxq_OOMM89GrSfN1CRd0XgGMqU72gBHG9CYmUE4
```

## Frontend Bestanden (beveiligd)
```
backend/frontend/src/
├── contexts/
│   └── AuthContext.tsx       # Discord OAuth via Supabase
├── components/
│   ├── LoginModal.tsx        # Login popup
│   └── ProtectedRoute.tsx    # Auth guard
├── lib/
│   └── supabase.ts           # Supabase client init
└── pages/
    ├── RacingMatrix.tsx      # Dashboard 1
    ├── EventsDashboard.tsx   # Dashboard 2
    └── ResultsDashboard.tsx  # Dashboard 3
```

## Backup Locatie
- Volledige frontend: `.backups/frontend-clean-20251208/`
- Includes: src/, public/, package.json, vite.config.ts, etc.

## Herstel Procedure
Als er iets misgaat:
```bash
# Restore frontend
cp -r .backups/frontend-clean-20251208/* backend/frontend/

# Verify
cd backend/frontend && npm install && npm run build
```
