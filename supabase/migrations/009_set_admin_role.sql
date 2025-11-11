-- US3: Set jeroen.diepenbroek@gmail.com (rider 150437) as admin
-- Run this in Supabase SQL Editor

-- Step 1: Find the user_id for jeroen.diepenbroek@gmail.com
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'jeroen.diepenbroek@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Insert admin role (will skip if already exists due to UNIQUE constraint)
    INSERT INTO user_roles (user_id, role, granted_by, granted_at)
    VALUES (v_user_id, 'admin', v_user_id, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Admin role granted to user_id: %', v_user_id;
  ELSE
    RAISE NOTICE 'User jeroen.diepenbroek@gmail.com not found in auth.users';
    RAISE NOTICE 'User must login with Discord first to create account';
  END IF;
END $$;

-- Step 2: Verify admin role
SELECT 
  u.id,
  u.email,
  ur.role,
  ur.granted_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'jeroen.diepenbroek@gmail.com';

-- Expected output:
-- id                                  | email                        | role  | granted_at
-- ------------------------------------+------------------------------+-------+-------------------
-- <uuid>                              | jeroen.diepenbroek@gmail.com | admin | 2025-11-11 ...

-- Step 3: Also update RLS policies to use user_roles table instead of hardcoded email
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

-- Step 4: Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'access_requests'
ORDER BY policyname;
