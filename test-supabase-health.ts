import supabase from './backend/src/database/client.js';

async function testSupabase() {
  console.log('Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase.client
      .from('my_team_members')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    console.log('✅ Supabase connection OK');
    console.log('   Team members count:', data);
  } catch (err: any) {
    console.error('❌ Exception:', err.message);
  }
}

testSupabase();
