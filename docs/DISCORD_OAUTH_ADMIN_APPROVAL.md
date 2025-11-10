# Discord OAuth met Admin Approval Flow

**Feature**: Discord authenticatie met admin goedkeuring voor riders  
**Status**: Geïmplementeerd, database migratie vereist  
**Datum**: 10 november 2025

---

## 🎯 Overzicht

Riders kunnen via Discord inloggen, maar krijgen pas toegang na goedkeuring door een admin. Dit zorgt voor:
- ✅ Controle over wie toegang krijgt
- ✅ Verificatie van riders voordat ze data kunnen zien
- ✅ Audit trail van alle access requests
- ✅ Role-based access control (admin/rider/captain/viewer)

---

## 🏗️ Architectuur

### Database Schema

**Nieuwe tabellen**:
```sql
access_requests
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── discord_id, discord_username, discord_discriminator
├── discord_avatar_url, discord_email
├── status ('pending' | 'approved' | 'rejected')
├── reason (TEXT)
├── requested_at, reviewed_by, reviewed_at
└── review_notes

user_roles
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── role ('admin' | 'rider' | 'captain' | 'viewer')
├── granted_by (UUID, FK → auth.users)
└── granted_at, expires_at
```

**Helper Functions**:
- `is_admin(user_uuid)` - Check admin role
- `has_access(user_uuid)` - Check approved request of admin role

### Flow Diagram

```
1. User klikt Discord login
   ↓
2. Discord OAuth consent
   ↓
3. Redirect terug met Discord user data
   ↓
4. Frontend: POST /api/user/request-access
   ├── Create access_request (status: pending)
   └── Show "Wacht op goedkeuring" message
   ↓
5. Admin: GET /api/admin/access-requests
   ├── Ziet nieuwe request met Discord avatar, username, email
   └── Kan approve/reject met notities
   ↓
6. Admin approves: POST /api/admin/access-requests/:id/approve
   ├── Update status → 'approved'
   ├── Create user_role (role: rider)
   └── (Optioneel: email notificatie)
   ↓
7. User refresh/login again
   └── GET /api/user/access-status → has_access: true
   └── Redirect naar dashboard
```

---

## 🔌 API Endpoints

### Admin Endpoints (Protected)

**GET /api/admin/access-requests**
```typescript
// Query params: ?status=pending|approved|rejected|all
Response: {
  count: number
  requests: AccessRequest[]
}
```

**GET /api/admin/access-requests/:id**
```typescript
Response: AccessRequest (met user info + reviewer)
```

**POST /api/admin/access-requests/:id/approve**
```typescript
Body: {
  admin_user_id: string  // UUID van admin
  review_notes?: string
}
Response: {
  message: string
  request: AccessRequest
}
```

**POST /api/admin/access-requests/:id/reject**
```typescript
Body: {
  admin_user_id: string
  review_notes: string  // REQUIRED bij reject!
}
Response: {
  message: string
  request: AccessRequest
}
```

**POST /api/admin/access-requests/bulk-approve**
```typescript
Body: {
  request_ids: string[]  // Array van UUIDs
  admin_user_id: string
}
Response: {
  message: string
  approved: AccessRequest[]
}
```

**GET /api/admin/access-requests/stats/overview**
```typescript
Response: {
  stats: {
    pending: number
    approved: number
    rejected: number
    total: number
  }
  recent_pending: AccessRequest[] (laatste 5)
}
```

### User Endpoints (Public)

**GET /api/user/access-status**
```typescript
// Query params: ?user_id=<uuid>
Response: {
  has_access: boolean
  status: 'no_request' | 'pending' | 'approved' | 'rejected' | 'admin'
  message: string
  roles: string[]  // ['admin'] of ['rider'] etc
  access_request: AccessRequest | null
}
```

**POST /api/user/request-access**
```typescript
Body: {
  user_id: string
  discord_id?: string
  discord_username?: string
  discord_discriminator?: string
  discord_avatar_url?: string
  discord_email?: string
  reason?: string
  ip_address?: string
  user_agent?: string
}
Response: {
  message: string
  request: AccessRequest
}
```

---

## 🎨 Frontend Components

### 1. AccessRequests.tsx (Admin Page)

**URL**: `/admin/access-requests`

**Features**:
- 📊 Stats cards (pending/approved/rejected/total)
- 🔍 Filter tabs (pending/approved/rejected/all)
- 👤 User cards met Discord avatar + username
- ✅ Approve button (met optionele notities)
- ❌ Reject button (notities vereist)
- 📝 Review notities tekstarea
- 🕐 Timestamps (aangevraagd, behandeld)
- 👨‍💼 Reviewer info (email van admin die behandelde)

**Screenshot concept**:
```
┌───────────────────────────────────────────────┐
│ Access Requests Beheer                        │
│ Beheer Discord OAuth aanvragen van riders    │
├───────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │  12 │ │  45 │ │   8 │ │  65 │            │
│ │Wacht│ │Goedg│ │Afgew│ │Tot. │            │
│ └─────┘ └─────┘ └─────┘ └─────┘            │
├───────────────────────────────────────────────┤
│ [Wachtend] [Goedgekeurd] [Afgewezen] [Alle] │
├───────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐  │
│ │ 👤 JRøne#1234          [pending]       │  │
│ │ 📧 jeroen@example.com                   │  │
│ │ 📅 Aangevraagd: 10-11-2025 21:30       │  │
│ │                                         │  │
│ │ [Notities tekstarea_________________]  │  │
│ │ [✓ Goedkeuren] [✗ Afwijzen]           │  │
│ └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

### 2. AuthContext Updates

**Nieuwe integratie** na Discord login:
```typescript
// Na succesvolle Discord signInWithOAuth
useEffect(() => {
  if (session?.user) {
    checkAccessStatus(session.user.id)
  }
}, [session])

const checkAccessStatus = async (userId: string) => {
  const response = await fetch(`/api/user/access-status?user_id=${userId}`)
  const data = await response.json()
  
  if (!data.has_access) {
    // Toon pending message
    if (data.status === 'no_request') {
      // Auto-create request
      await createAccessRequest(userId)
    }
    // Redirect naar pending page
  }
}
```

### 3. Pending Access Page

**URL**: `/auth/pending`

**UI**:
```
┌───────────────────────────────────────┐
│   ⏳ Wacht op Goedkeuring             │
│                                       │
│   Je Discord login is succesvol!     │
│                                       │
│   Een admin moet je toegang eerst    │
│   goedkeuren voordat je het          │
│   dashboard kunt gebruiken.          │
│                                       │
│   Je ontvangt een email wanneer je   │
│   toegang is goedgekeurd.            │
│                                       │
│   [← Terug naar home]                │
└───────────────────────────────────────┘
```

---

## 🚀 Deployment Checklist

### 1. Database Migratie
```bash
# Run migration in Supabase SQL editor
psql -h <host> -U postgres -d postgres -f supabase/migrations/008_access_requests.sql

# Of via Supabase dashboard:
# 1. Ga naar SQL Editor
# 2. Copy/paste volledige migration
# 3. Run
```

### 2. Verify Tables
```sql
-- Check tables
SELECT * FROM access_requests LIMIT 5;
SELECT * FROM user_roles WHERE role = 'admin';

-- Check functions
SELECT is_admin('<admin-user-id>'); -- Should return true
SELECT has_access('<random-user-id>'); -- Should return false
```

### 3. Environment Variabelen
Geen nieuwe variabelen nodig! Gebruikt bestaande:
```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 4. Backend Test
```bash
# Start backend
cd backend && npx tsx src/server.ts

# Test endpoints
curl http://localhost:3000/api/admin/access-requests
curl http://localhost:3000/api/admin/access-requests/stats/overview
curl "http://localhost:3000/api/user/access-status?user_id=<uuid>"
```

### 5. Frontend Build
```bash
cd backend/frontend
npm run build

# Check build output
ls -la ../public/dist/
```

### 6. Railway Deploy
```bash
git add .
git commit -m "feat: Discord OAuth admin approval flow

Implemented access request system:
- Database: access_requests + user_roles tables
- Backend: 8 nieuwe endpoints (admin + user)
- Frontend: AccessRequests admin page
- Flow: pending → approve/reject → rider role

Ready for testing!"

git push origin main
# Railway auto-deploys
```

---

## 🧪 Testing Guide

### Test Scenario 1: Nieuwe Rider Request

1. **User**: Klik Discord login
2. **User**: Authorize Discord app
3. **User**: Zie "Wacht op goedkeuring" message
4. **Admin**: Ga naar `/admin/access-requests`
5. **Admin**: Zie nieuwe request met Discord avatar
6. **Admin**: Vul notities in (optioneel)
7. **Admin**: Klik "Goedkeuren"
8. **User**: Refresh pagina → toegang tot dashboard

### Test Scenario 2: Request Afwijzen

1. **Admin**: Selecteer pending request
2. **Admin**: Vul reject reden in (vereist!)
3. **Admin**: Klik "Afwijzen"
4. **User**: Refresh → "Toegang geweigerd" message

### Test Scenario 3: Bulk Approve

1. **Admin**: Filter op "Wachtend"
2. **Admin**: Meerdere requests selecteren
3. **Admin**: Klik "Bulk goedkeuren"
4. **Verify**: Alle requests status → 'approved'
5. **Verify**: user_roles heeft nieuwe 'rider' entries

---

## 🎯 Volgende Stappen (Future Enhancements)

### Phase 2: Email Notificaties
- [ ] Supabase trigger bij nieuwe request → email naar admin
- [ ] Supabase trigger bij approve → email naar user
- [ ] Supabase trigger bij reject → email naar user met reden

### Phase 3: Auto-Approval Rules
- [ ] Whitelist Discord server members
- [ ] Auto-approve TeamNL Discord guild members
- [ ] Role sync: Discord roles → App roles

### Phase 4: Advanced Features
- [ ] Request expiry (auto-reject na X dagen)
- [ ] Re-request cooldown (1x per 7 dagen)
- [ ] Temporary access (expires_at datum)
- [ ] Audit log voor alle admin acties
- [ ] Slack/Discord webhook notificaties

---

## 📚 Resources

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
- **Discord OAuth**: https://discord.com/developers/docs/topics/oauth2
- **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security

---

**🎉 Discord OAuth Admin Approval is ready for deployment!** 🚀
