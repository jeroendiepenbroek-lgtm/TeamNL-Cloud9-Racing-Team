-- ========================================
-- COMPLETE SETUP: Migrations 008 + 009
-- ========================================
-- Run this in Supabase SQL Editor to set up:
-- 1. access_requests table
-- 2. user_roles table  
-- 3. Admin role for jeroen.diepenbroek@gmail.com
-- 4. Updated RLS policies
-- ========================================

-- ========================================
-- MIGRATION 008: Access Requests System
-- ========================================

-- Access requests tabel
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Discord info
  discord_id VARCHAR(255),
  discord_username VARCHAR(255),
  discord_discriminator VARCHAR(10),
  discord_avatar_url TEXT,
  discord_email VARCHAR(255),
  
  -- Request details
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Review info
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_access_requests_user_id ON access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_discord_id ON access_requests(discord_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_requested_at ON access_requests(requested_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_access_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS access_requests_updated_at ON access_requests;
CREATE TRIGGER access_requests_updated_at
  BEFORE UPDATE ON access_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_access_requests_updated_at();

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- RLS Policies
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their own access requests" ON access_requests;
DROP POLICY IF EXISTS "Admins can view all access requests" ON access_requests;
DROP POLICY IF EXISTS "Admins can update access requests" ON access_requests;

-- Users kunnen hun eigen requests zien
CREATE POLICY "Users can view their own access requests"
  ON access_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Admins kunnen alle requests zien (uses user_roles table)
CREATE POLICY "Admins can view all access requests"
  ON access_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins kunnen requests approven/rejecten
CREATE POLICY "Admins can update access requests"
  ON access_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Users kunnen hun eigen roles zien
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Admins kunnen alle roles zien
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ========================================
-- MIGRATION 009: Set Admin Role
-- ========================================

-- Grant admin role to jeroen.diepenbroek@gmail.com (rider 150437)
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
    -- Insert admin role (will skip if already exists)
    INSERT INTO user_roles (user_id, role, granted_by, granted_at)
    VALUES (v_user_id, 'admin', v_user_id, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE '✅ Admin role granted to user_id: %', v_user_id;
  ELSE
    RAISE WARNING '⚠️  User jeroen.diepenbroek@gmail.com not found in auth.users';
    RAISE NOTICE 'ℹ️  User must login with Discord first to create account';
    RAISE NOTICE 'ℹ️  After login, re-run this script to grant admin role';
  END IF;
END $$;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify tables exist
SELECT 
  'access_requests' AS table_name, 
  COUNT(*) AS row_count 
FROM access_requests
UNION ALL
SELECT 
  'user_roles' AS table_name, 
  COUNT(*) AS row_count 
FROM user_roles;

-- Verify admin role
SELECT 
  u.id,
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

-- Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename IN ('access_requests', 'user_roles')
ORDER BY tablename, policyname;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SETUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  • access_requests';
  RAISE NOTICE '  • user_roles';
  RAISE NOTICE '';
  RAISE NOTICE 'Check verification results above ⬆️';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. If admin role not granted (user not found):';
  RAISE NOTICE '     → Login with Discord as jeroen.diepenbroek@gmail.com';
  RAISE NOTICE '     → Re-run this script';
  RAISE NOTICE '  2. Test at: https://teamnl-cloud9-racing-team-production.up.railway.app';
  RAISE NOTICE '  3. Navigate to /admin/access-requests as admin';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
