-- Insert admin user
INSERT INTO admin_users (email, password_hash, full_name)
VALUES (
  'admin@teamnl.cloud9',
  '$2b$10$dO1PmVUlt9bQacEmidcw7OiZmlwWM9G3fGd6l4w9zJ84PvhxOqtwO',
  'TeamNL Admin'
)
ON CONFLICT (email) DO NOTHING;

-- Verify
SELECT id, email, full_name, created_at FROM admin_users WHERE email = 'admin@teamnl.cloud9';
