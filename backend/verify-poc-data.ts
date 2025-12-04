import dotenv from 'dotenv';
dotenv.config();

const { supabase } = await import('./src/services/supabase.service.js');

(async () => {
  console.log('🔍 Verifying POC data...\n');
  
  // Check riders_unified
  const { data: rider, error: riderError } = await (supabase as any).client
    .from('riders_unified')
    .select('rider_id, name, zp_ftp')
    .eq('rider_id', 150437)
    .single();
  
  if (rider) {
    console.log('✅ riders_unified:', rider);
  } else {
    console.log('❌ riders_unified:', riderError?.message);
  }
  
  // Check my_team_members (correct column: rider_id)
  const { data: team, error: teamError } = await (supabase as any).client
    .from('my_team_members')
    .select('*')
    .eq('rider_id', 150437)
    .single();
  
  if (team) {
    console.log('✅ my_team_members:', team);
  } else {
    console.log('❌ my_team_members:', teamError?.message);
  }
  
  // Check view_my_team
  const { data: viewData, error: viewError } = await (supabase as any).client
    .from('view_my_team')
    .select('rider_id, name, zp_ftp')
    .eq('rider_id', 150437)
    .single();
  
  if (viewData) {
    console.log('✅ view_my_team:', viewData);
  } else {
    console.log('❌ view_my_team:', viewError?.message);
  }
})();
