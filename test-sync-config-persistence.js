require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testConfigPersistence() {
  console.log('🧪 Testing Sync Config Persistence\n');
  console.log('='.repeat(60));
  
  // 1. Check if sync_config table exists and has data
  console.log('\n1️⃣ Checking sync_config table...\n');
  
  const { data: config, error } = await supabase
    .from('sync_config')
    .select('*')
    .single();
  
  if (error) {
    console.log('❌ Error:', error.message);
    if (error.code === 'PGRST116') {
      console.log('\n⚠️  sync_config table is empty! Creating default config...\n');
      
      const { data: newConfig, error: insertError } = await supabase
        .from('sync_config')
        .insert({
          enabled: false,
          interval_minutes: 60,
          last_run: null,
          next_run: null
        })
        .select()
        .single();
      
      if (insertError) {
        console.log('❌ Failed to create default config:', insertError);
        return;
      }
      
      console.log('✅ Default config created:');
      console.log(JSON.stringify(newConfig, null, 2));
    }
  } else {
    console.log('✅ sync_config found:');
    console.log(JSON.stringify(config, null, 2));
  }
  
  // 2. Test updating interval
  console.log('\n\n2️⃣ Testing interval update to 45 minutes...\n');
  
  const { data: updated, error: updateError } = await supabase
    .from('sync_config')
    .update({ interval_minutes: 45 })
    .eq('id', 1)
    .select()
    .single();
  
  if (updateError) {
    console.log('❌ Update failed:', updateError);
    return;
  }
  
  console.log('✅ Updated successfully:');
  console.log(`   interval_minutes: ${updated.interval_minutes}`);
  
  // 3. Verify persistence by reading again
  console.log('\n\n3️⃣ Verifying persistence (reading again)...\n');
  
  const { data: verified, error: verifyError } = await supabase
    .from('sync_config')
    .select('*')
    .single();
  
  if (verifyError) {
    console.log('❌ Verification failed:', verifyError);
    return;
  }
  
  console.log('✅ Config persisted:');
  console.log(JSON.stringify(verified, null, 2));
  
  if (verified.interval_minutes === 45) {
    console.log('\n🎉 SUCCESS: Config persistence is working!');
  } else {
    console.log('\n❌ FAILED: Config was not persisted correctly');
  }
  
  // 4. Reset to 60 minutes
  console.log('\n\n4️⃣ Resetting to 60 minutes...\n');
  
  await supabase
    .from('sync_config')
    .update({ interval_minutes: 60 })
    .eq('id', 1);
  
  console.log('✅ Reset complete');
  
  // 5. Test sync logs
  console.log('\n\n5️⃣ Checking sync_logs table...\n');
  
  const { data: logs, error: logsError } = await supabase
    .from('sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);
  
  if (logsError) {
    console.log('❌ Error:', logsError);
  } else {
    console.log(`✅ Found ${logs.length} recent sync logs`);
    logs.forEach((log, i) => {
      console.log(`\n   ${i + 1}. ${log.sync_type} (${log.trigger_type})`);
      console.log(`      Status: ${log.status}`);
      console.log(`      Total: ${log.total_items}, Success: ${log.success_count}, Failed: ${log.failed_count}`);
      console.log(`      Started: ${new Date(log.started_at).toLocaleString('nl-NL')}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Test Complete!\n');
}

testConfigPersistence().catch(console.error);
