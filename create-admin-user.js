const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createAdminUser() {
  console.log('🔐 Creating admin user...');

  // Generate password hash
  const password = 'admin123'; // CHANGE THIS!
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // Insert admin user
    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        email: 'admin@teamnl.cloud9',
        password_hash: passwordHash,
        full_name: 'TeamNL Admin'
      })
      .select();

    if (error) {
      console.error('❌ Failed to create admin user:', error);
      return;
    }

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@teamnl.cloud9');
    console.log('🔑 Password: admin123');
    console.log('⚠️  IMPORTANT: Change this password immediately after first login!');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

createAdminUser();
