-- ========================================
-- SAFE SETUP: Only add missing parts
-- ========================================
-- Dit script voegt alleen toe wat nog niet bestaat:
-- 1. user_roles table (if not exists)
-- 2. access_requests table (if not exists)
-- 3. Admin role voor jeroen.diepenbroek@gmail.com
-- ========================================

-- ========================================
-- STEP 1: Ensure tables exist
-- ========================================

-- User roles tabel
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'rider', 'captain', 'viewer')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Indexes (safe - IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Access requests tabel
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id VARCHAR(255),
  discord_username VARCHAR(255),
  discord_discriminator VARCHAR(10),
  discord_avatar_url TEXT,
  discord_email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes (safe - IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_access_requests_user_id ON access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_discord_id ON access_requests(discord_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_requested_at ON access_requests(requested_at DESC);

-- ========================================
-- STEP 2: Grant admin role
-- ========================================

-- Grant admin role to jeroen.diepenbroek@gmail.com
DO $$
DECLARE
  v_user_id UUID;
  v_existing_role BOOLEAN;
BEGIN
  -- Get user_id from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'jeroen.diepenbroek@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Check if admin role already exists
    SELECT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = v_user_id AND role = 'admin'
    ) INTO v_existing_role;
    
    IF v_existing_role THEN
      RAISE NOTICE '✅ Admin role already exists for user_id: %', v_user_id;
    ELSE
      -- Insert admin role
      INSERT INTO user_roles (user_id, role, granted_by, granted_at)
      VALUES (v_user_id, 'admin', v_user_id, NOW());
      
      RAISE NOTICE '✅ Admin role GRANTED to user_id: %', v_user_id;
    END IF;
  ELSE
    RAISE WARNING '⚠️  User jeroen.diepenbroek@gmail.com not found in auth.users';
    RAISE NOTICE 'ℹ️  User must login with Discord first to create account';
    RAISE NOTICE 'ℹ️  After login, re-run this script to grant admin role';
  END IF;
END $$;

-- ========================================
-- VERIFICATION
-- ========================================

-- Show admin user
SELECT 
  u.email,
  ur.role,
  ur.granted_at,
  CASE 
    WHEN ur.role = 'admin' THEN '✅ ADMIN'
    ELSE '👤 ' || ur.role
  END AS status
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'jeroen.diepenbroek@gmail.com';

-- Show all users with roles
SELECT 
  u.email,
  COALESCE(string_agg(ur.role, ', '), 'no roles') AS roles
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.email
ORDER BY u.email;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SETUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Check verification results above ⬆️';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Test login at Railway';
  RAISE NOTICE 'https://teamnl-cloud9-racing-team-production.up.railway.app';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
