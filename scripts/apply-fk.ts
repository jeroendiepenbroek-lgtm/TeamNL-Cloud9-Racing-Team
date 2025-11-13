import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { db: { schema: 'public' } }
);

(async () => {
  console.log('Adding FK constraint...');
  
  const { error } = await supabase.rpc('query', {
    query: `
      ALTER TABLE event_signups
      ADD CONSTRAINT fk_event_signups_event 
      FOREIGN KEY (event_id) 
      REFERENCES zwift_api_events(event_id)
      ON DELETE CASCADE;
    `
  });
  
  if (error) {
    console.log('Trying alternative method...');
    // Direct table alteration via PostgREST doesn't work
    // We need to use the Supabase SQL editor or connect directly
    console.log('❌ Cannot run DDL via Supabase client');
    console.log('✅ Solution: Run in Supabase SQL Editor:');
    console.log(`
ALTER TABLE event_signups
ADD CONSTRAINT fk_event_signups_event 
FOREIGN KEY (event_id) 
REFERENCES zwift_api_events(event_id)
ON DELETE CASCADE;
    `);
  } else {
    console.log('✅ FK added');
  }
})();
