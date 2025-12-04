import dotenv from 'dotenv';
dotenv.config();

const zwiftClient = (await import('./src/api/zwift-client.js')).zwiftClient;
const { supabase } = await import('./src/services/supabase.service.js');

(async () => {
  try {
    console.log('🔄 Syncing event 5229579...');
    
    // Fetch event results (includes event details + rider results)
    const results = await zwiftClient.getEventResults(5229579);
    
    if (!results || results.length === 0) {
      console.log('❌ No results found for event 5229579');
      return;
    }
    
    console.log(`✅ Found ${results.length} results`);
    console.log('First result:', JSON.stringify(results[0], null, 2));
    
    // Event wordt via results endpoint ook meegegeven
    // We kunnen de event details extraheren uit de eerste result
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
})();
