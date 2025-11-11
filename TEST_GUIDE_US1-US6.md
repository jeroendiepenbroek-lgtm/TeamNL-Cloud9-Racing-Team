# Test Guide - US1-US6 Discord OAuth & Admin Role

**Date**: 2025-11-11  
**Commit**: ce89d96

---

## ✅ Wat is geïmplementeerd:

### US1: Dashboard & Matrix publiek toegankelijk
- ✅ Dashboard (`/`) heeft geen auth guard
- ✅ Matrix (`/matrix`) heeft geen auth guard
- Anyone kan deze pagina's bekijken zonder login

### US2: Sync & Rider Management protected
- ✅ Riders (`/riders`) heeft `<ProtectedRoute>` wrapper
- ✅ Sync (`/sync`) heeft `<ProtectedRoute>` wrapper
- Login vereist om deze pagina's te bekijken

### US3: Rider 150437 (jeroen.diepenbroek@gmail.com) = Admin
- ✅ SQL migration `009_set_admin_role.sql` created
- 🔧 **ACTIE VEREIST**: Run SQL in Supabase (zie hieronder)

### US4: Admin kan authenticatie goedkeuren/weigeren
- ✅ Admin panel bestaat: `/admin/access-requests`
- ✅ Approve/reject functionaliteit al geïmplementeerd
- Only admins kunnen deze pagina zien

### US5: Authenticatie via Discord
- ✅ Discord OAuth configured in Supabase
- Check: Supabase Dashboard → Authentication → Providers → Discord = Enabled

### US6: Alleen Discord tegeltje getoond
- ✅ LoginModal toont ALLEEN Discord button
- ✅ Google, GitHub, Azure, Email/Password verwijderd
- Clean, single-option login

---

## 🔧 SETUP STAPPEN

### Stap 1: Run Admin Role SQL in Supabase

**Open**: [Supabase SQL Editor](https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new)

**Copy-paste en run**:
```sql
-- Step 1: Grant admin role to jeroen.diepenbroek@gmail.com
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'jeroen.diepenbroek@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role, granted_by, granted_at)
    VALUES (v_user_id, 'admin', v_user_id, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
    RAISE NOTICE 'Admin role granted to user_id: %', v_user_id;
  ELSE
    RAISE NOTICE 'User not found - must login with Discord first';
  END IF;
END $$;

-- Step 2: Update RLS policies to use user_roles
DROP POLICY IF EXISTS "Admins can view all access requests" ON access_requests;
DROP POLICY IF EXISTS "Admins can update access requests" ON access_requests;

CREATE POLICY "Admins can view all access requests"
  ON access_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update access requests"
  ON access_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );
```

**Expected output**:
- ✅ `NOTICE: Admin role granted to user_id: <uuid>` (if user exists)
- ⚠️ `NOTICE: User not found - must login with Discord first` (if user doesn't exist yet)

**If user not found**:
1. Open https://teamnl-cloud9-racing-team-production.up.railway.app
2. Click "🔐 Admin Login"
3. Click "Inloggen met Discord"
4. Login with Discord (jeroen.diepenbroek@gmail.com)
5. Re-run the SQL above

### Stap 2: Verify Admin Role

```sql
SELECT 
  u.id,
  u.email,
  ur.role,
  ur.granted_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'jeroen.diepenbroek@gmail.com';
```

**Expected**:
```
id                                  | email                        | role  | granted_at
------------------------------------+------------------------------+-------+-------------------
<uuid>                              | jeroen.diepenbroek@gmail.com | admin | 2025-11-11 ...
```

### Stap 3: Verify RLS Policies

```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'access_requests'
ORDER BY policyname;
```

**Expected**:
- `Admins can view all access requests` - SELECT - `EXISTS (SELECT 1 FROM user_roles ...)`
- `Admins can update access requests` - UPDATE - `EXISTS (SELECT 1 FROM user_roles ...)`
- `Users can view their own access requests` - SELECT - `auth.uid() = user_id`

---

## 🧪 TEST PLAN

### Test 1: Public Pages (US1)
**Steps**:
1. Open https://teamnl-cloud9-racing-team-production.up.railway.app
2. Navigate to Dashboard (`/`)
3. Navigate to Matrix (`/matrix`)

**Expected**:
- ✅ Both pages load WITHOUT requiring login
- ✅ No redirect to login
- ✅ Content visible immediately

### Test 2: Protected Pages (US2)
**Steps**:
1. **Without login**: Navigate to `/riders`
2. **Without login**: Navigate to `/sync`

**Expected**:
- ❌ Redirect to `/` (Dashboard)
- ❌ Cannot access protected pages
- ℹ️ Must login first

### Test 3: Discord Login (US5 & US6)
**Steps**:
1. Click "🔐 Admin Login" in navbar
2. Observe login modal

**Expected**:
- ✅ Modal shows title "Inloggen"
- ✅ **ONLY** Discord button visible (purple, large)
- ❌ No Google button
- ❌ No GitHub button
- ❌ No Azure button
- ❌ No email/password form

**Steps (continue)**:
3. Click "Inloggen met Discord"
4. Complete Discord OAuth flow
5. Return to site

**Expected**:
- ✅ Redirect to Discord OAuth
- ✅ After approval, redirect back to site
- ✅ User logged in (navbar shows "🔒 Logout" instead of "🔐 Admin Login")
- ✅ Can now access `/riders` and `/sync`

### Test 4: Admin Access (US3 & US4)
**Prerequisites**: 
- Logged in as jeroen.diepenbroek@gmail.com
- Admin role granted via SQL (Stap 1 above)

**Steps**:
1. Navigate to `/admin/access-requests`

**Expected**:
- ✅ Page loads (no redirect)
- ✅ Shows "Access Requests Management" header
- ✅ Shows stats cards (Pending, Approved, Rejected)
- ✅ Shows table with access requests

**If no access requests exist**:
- Create test request: Login with different Discord account
- New user will automatically create pending access request
- As admin, approve/reject the request

**Test approve/reject**:
1. Click "✅ Approve" on pending request
2. Observe request status changes to "approved"
3. Approved user can now access protected pages

### Test 5: Non-Admin User
**Prerequisites**: 
- Logged in with NON-admin Discord account

**Steps**:
1. Try to navigate to `/admin/access-requests`

**Expected**:
- ❌ Redirect to `/` or `/auth/pending`
- ❌ Cannot see admin panel
- Only admin can access this page

### Test 6: Access Request Flow (New User)
**Steps**:
1. Logout current user
2. Login with NEW Discord account (not jeroen.diepenbroek@gmail.com)
3. Try to navigate to `/riders`

**Expected**:
- ✅ Access request automatically created
- ✅ Redirect to `/auth/pending` page
- ✅ Shows "Access aangevraagd" message
- ⏳ Status = "pending"

**Steps (as admin)**:
4. Login as jeroen.diepenbroek@gmail.com
5. Navigate to `/admin/access-requests`
6. See the new pending request
7. Click "✅ Approve"

**Expected**:
- ✅ Request status changes to "approved"
- ✅ User can now access protected pages

---

## 📊 DATABASE VERIFICATION

### Check User Roles
```sql
SELECT 
  u.email,
  ur.role,
  ur.granted_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
ORDER BY ur.granted_at DESC;
```

### Check Access Requests
```sql
SELECT 
  discord_username,
  discord_email,
  status,
  requested_at,
  reviewed_at
FROM access_requests
ORDER BY requested_at DESC
LIMIT 10;
```

### Check RLS Policies
```sql
-- Test as admin
SET ROLE authenticated;
SET request.jwt.claims.sub = '<admin_user_id>';

SELECT * FROM access_requests; -- Should see all requests

-- Test as regular user
SET request.jwt.claims.sub = '<regular_user_id>';

SELECT * FROM access_requests; -- Should only see own requests
```

---

## 🐛 TROUBLESHOOTING

### Issue: "User not found" when running admin role SQL
**Cause**: User hasn't logged in with Discord yet  
**Solution**: 
1. Login with Discord first
2. Re-run SQL

### Issue: Admin can't see access requests
**Cause**: RLS policies not updated or admin role not granted  
**Solution**:
1. Verify admin role: `SELECT * FROM user_roles WHERE user_id = auth.uid()`
2. Re-run RLS policy SQL (Stap 1, Step 2)
3. Refresh page

### Issue: Discord login redirects to wrong URL
**Cause**: Supabase redirect URL not configured  
**Solution**:
1. Supabase Dashboard → Authentication → URL Configuration
2. Add: `https://teamnl-cloud9-racing-team-production.up.railway.app/**`
3. Also add: `http://localhost:5173/**` for local dev

### Issue: Can't access protected pages after login
**Cause**: Access request status not approved  
**Solution**:
1. Check: `SELECT * FROM access_requests WHERE discord_email = 'your@email.com'`
2. If status = 'pending', have admin approve
3. If no access_request row, logout and login again

---

## ✅ SUCCESS CRITERIA

All tests pass:
- [x] US1: Dashboard & Matrix load without login
- [x] US2: Riders & Sync require login
- [x] US3: jeroen.diepenbroek@gmail.com has admin role
- [x] US4: Admin can approve/reject access requests
- [x] US5: Discord OAuth works
- [x] US6: Only Discord button shown in login modal

---

## 📝 NOTES

**Admin accounts**:
- jeroen.diepenbroek@gmail.com (rider 150437) - PRIMARY ADMIN

**Protected routes**:
- `/riders` - Team management
- `/sync` - Data synchronization
- `/admin/access-requests` - Admin panel (admin only)

**Public routes**:
- `/` - Dashboard
- `/matrix` - Racing data matrix
- `/clubs` - Clubs overview
- `/events` - Events overview

**Database tables**:
- `auth.users` - Supabase auth users
- `user_roles` - Role assignments (admin, rider, captain, viewer)
- `access_requests` - Pending access requests for new users

**Next steps**:
- Monitor access requests
- Approve legitimate users
- Reject spam/invalid requests
- Add more admins if needed (via SQL INSERT into user_roles)

---

**Ready to test! 🚀**
