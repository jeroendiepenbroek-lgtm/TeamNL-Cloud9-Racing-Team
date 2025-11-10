-- Migration: Access Requests & Approval System
-- Description: Discord auth met admin approval flow voor nieuwe riders
-- Date: 2025-11-10

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
CREATE INDEX idx_access_requests_user_id ON access_requests(user_id);
CREATE INDEX idx_access_requests_discord_id ON access_requests(discord_id);
CREATE INDEX idx_access_requests_status ON access_requests(status);
CREATE INDEX idx_access_requests_requested_at ON access_requests(requested_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_access_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER access_requests_updated_at
  BEFORE UPDATE ON access_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_access_requests_updated_at();

-- RLS Policies
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Users kunnen hun eigen requests zien
CREATE POLICY "Users can view their own access requests"
  ON access_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Alleen admins kunnen alle requests zien
CREATE POLICY "Admins can view all access requests"
  ON access_requests FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'admin@cloudracer.nl'
    )
  );

-- Alleen admins kunnen requests approven/rejecten
CREATE POLICY "Admins can update access requests"
  ON access_requests FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'admin@cloudracer.nl'
    )
  );

-- Auto-insert bij nieuwe Discord OAuth users
-- (dit wordt getriggerd via backend na succesvolle Discord login)

-- User roles tabel (voor toekomstige role management)
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
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users kunnen hun eigen roles zien
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Admins kunnen alle roles zien en beheren
CREATE POLICY "Admins can manage all roles"
  ON user_roles FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'admin@cloudracer.nl'
    )
  );

-- Seed admin role voor bestaande admin user
INSERT INTO user_roles (user_id, role, granted_by)
SELECT 
  id,
  'admin',
  id
FROM auth.users 
WHERE email = 'admin@cloudracer.nl'
ON CONFLICT (user_id, role) DO NOTHING;

-- Helper function: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid 
    AND role = 'admin'
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if user has access (approved request)
CREATE OR REPLACE FUNCTION has_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM access_requests
    WHERE user_id = user_uuid 
    AND status = 'approved'
  ) OR is_admin(user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE access_requests IS 'Discord OAuth access requests die admin approval vereisen';
COMMENT ON TABLE user_roles IS 'User roles voor fine-grained access control';
COMMENT ON FUNCTION is_admin IS 'Check of user admin role heeft';
COMMENT ON FUNCTION has_access IS 'Check of user approved access heeft';
