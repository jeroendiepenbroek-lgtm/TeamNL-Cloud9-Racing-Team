import * as dotenv from 'dotenv';
import { SupabaseService } from '../backend/src/services/supabase.service.js';

dotenv.config();

async function main() {
  const supabase = new SupabaseService();
  
  console.log('Testing getAllSignupsByCategory with event 5192172...');
  
  const result = await supabase.getAllSignupsByCategory(['5192172']);
  
  console.log(`\nMap size: ${result.size}`);
  console.log(`Keys:`, Array.from(result.keys()));
  
  const signups = result.get('5192172');
  console.log(`\nSignups for '5192172':`, signups?.length || 0);
  if (signups && signups.length > 0) {
    console.log('First 3:', signups.slice(0, 3));
  }
}

main();
