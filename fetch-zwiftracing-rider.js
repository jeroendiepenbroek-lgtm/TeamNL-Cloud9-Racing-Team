const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// ZwiftRacing.app API config (use environment variable if available)
const ZWIFTRACING_API_KEY = process.env.ZWIFTRACING_API_KEY || '650c6d2fc4ef6858d74cbef1';
const ZWIFTRACING_BASE_URL = 'https://zwift-ranking.herokuapp.com';

// Supabase setup (use environment variables)
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU'
);

async function fetchZwiftRacingRider(riderId) {
  console.log(`🏁 Fetching ZwiftRacing rider ${riderId}...\n`);
  
  try {
    const response = await axios.get(
      `${ZWIFTRACING_BASE_URL}/public/riders/${riderId}`,
      {
        headers: {
          'Authorization': ZWIFTRACING_API_KEY
        }
      }
    );
    
    const data = response.data;
    
    console.log('✅ ZwiftRacing data fetched!');
    console.log(`   Name: ${data.name}`);
    console.log(`   🏁 vELO (Race Rating): ${data.race.current.rating}`);
    console.log(`   🏁 FTP: ${data.zpFTP}W`);
    console.log(`   Weight: ${data.weight}kg`);
    console.log(`   Phenotype: ${data.phenotype.value}`);
    console.log(`   Category: ${data.zpCategory}`);
    console.log(`   Race Finishes: ${data.race.finishes}\n`);
    
    // Map to NEW api_zwiftracing_riders schema
    const riderData = {
      rider_id: data.riderId,
      id: data.riderId,
      name: data.name,
      country: data.country,
      
      // Racing metrics
      velo_live: data.race.current.rating,
      velo_30day: data.race.max30?.rating || null,
      velo_90day: data.race.max90?.rating || null,
      category: data.zpCategory,
      
      // Power curve - absolute
      ftp: data.zpFTP,
      power_5s: data.power.w5,
      power_15s: data.power.w15,
      power_30s: data.power.w30,
      power_60s: data.power.w60,
      power_120s: data.power.w120,
      power_300s: data.power.w300,
      power_1200s: data.power.w1200,
      
      // Power curve - relative
      power_5s_wkg: data.power.wkg5,
      power_15s_wkg: data.power.wkg15,
      power_30s_wkg: data.power.wkg30,
      power_60s_wkg: data.power.wkg60,
      power_120s_wkg: data.power.wkg120,
      power_300s_wkg: data.power.wkg300,
      power_1200s_wkg: data.power.wkg1200,
      
      // Physical
      weight: data.weight,
      height: data.height,
      
      // Classification
      phenotype: data.phenotype.value,
      
      // Stats
      race_count: data.race.finishes,
      zwift_id: data.riderId,
      age: null,
      
      // Raw backup
      raw_response: data,
      fetched_at: new Date().toISOString()
    };
    
    console.log('📤 Uploading to api_zwiftracing_riders...');
      
    const { error: uploadError } = await supabase
      .from('api_zwiftracing_riders')
      .upsert(riderData, { onConflict: 'rider_id' });
    
    if (uploadError) {
      console.error('❌ Upload error:', uploadError.message);
      return;
    }
    
    console.log('✅ Uploaded to database!\n');
    
    // Verify in view
    console.log('🔍 Checking v_rider_complete view...');
    const { data: viewData, error: viewError } = await supabase
      .from('v_rider_complete')
      .select('rider_id, full_name, racing_name, velo_live, velo_30day, velo_90day, zwift_official_racing_score, weight_kg, racing_ftp, phenotype, data_completeness')
      .eq('rider_id', riderId)
      .maybeSingle();
    
    if (viewData) {
      console.log('\n📊 COMPLETE VIEW DATA (v_rider_complete):');
      console.log(`   Name: ${viewData.full_name || viewData.racing_name}`);
      console.log(`   🏁 vELO Live: ${viewData.velo_live || 'N/A'}`);
      console.log(`   🏁 vELO 30d: ${viewData.velo_30day || 'N/A'}`);
      console.log(`   🏁 vELO 90d: ${viewData.velo_90day || 'N/A'}`);
      console.log(`   🏁 Zwift Official Score: ${viewData.zwift_official_racing_score || 'N/A'}`);
      console.log(`   Weight: ${viewData.weight_kg}kg`);
      console.log(`   FTP: ${viewData.racing_ftp}W`);
      console.log(`   Phenotype: ${viewData.phenotype || 'N/A'}`);
      console.log(`   Data Completeness: ${viewData.data_completeness}`);
      console.log('\n✅ ALL DATA NOW SYNCED!');
    } else {
      console.log('⚠️  View not yet updated. May need to refresh views.');
      if (viewError) {
        console.log('   Error:', viewError.message);
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SYNC COMPLETE!');
    console.log('Next: Check in Supabase');
    console.log(`SELECT * FROM v_rider_complete WHERE rider_id = ${riderId};`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
    }
  }
}

// Run
const riderId = process.argv[2] || 150437;
fetchZwiftRacingRider(riderId);
