import dotenv from 'dotenv';
dotenv.config();

const { supabase } = await import('./src/services/supabase.service.js');

(async () => {
  // Get column info
  const { data, error } = await (supabase as any).client
    .from('my_team_members')
    .select('*')
    .limit(1);
  
  if (data && data.length > 0) {
    console.log('Columns in my_team_members:', Object.keys(data[0]));
    console.log('Sample row:', data[0]);
  } else {
    console.log('Error or no data:', error);
  }
})();
