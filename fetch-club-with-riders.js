const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  'https://tfsepzumkireferencer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmc2VwenVta2lyZWZlcmVuY2VyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzY1Mjg3NCwiZXhwIjoyMDQ5MjI4ODc0fQ.w_OaLXZ-VvGJV0_6n1zP9rH7YXElxyoTqDcg0p_7W7s'
);

async function fetchClub(clubId) {
  console.log(`🏁 Fetching ZwiftRacing Club ${clubId}...\n`);
  
  try {
    const response = await axios.get(`https://zwiftracing.app/api/public/clubs/${clubId}`);
    const clubData = response.data;
    
    console.log(`✅ Club: ${clubData.name}`);
    console.log(`   Members: ${clubData.riders?.length || 0}\n`);
    
    // Upload club
    const { error: clubError } = await supabase
      .from('api_zwiftracing_public_clubs')
      .upsert({
        club_id: clubData.id,
        id: clubData.id,
        name: clubData.name,
        description: clubData.description,
        member_count: clubData.riders?.length || 0,
        raw_response: clubData,
        fetched_at: new Date().toISOString()
      });
    
    if (clubError) {
      console.error('❌ Club upload error:', clubError);
      return;
    }
    
    console.log('✅ Club uploaded\n');
    
    // Upload riders (take first 10 for demo)
    const ridersToUpload = (clubData.riders || []).slice(0, 10);
    console.log(`📤 Uploading ${ridersToUpload.length} riders...\n`);
    
    for (const rider of ridersToUpload) {
      const { error: riderError } = await supabase
        .from('api_zwiftracing_public_clubs_riders')
        .upsert({
          rider_id: rider.id,
          club_id: clubData.id,
          id: rider.id,
          name: rider.name,
          velo: rider.velo,
          racing_score: rider.racing_score,
          ftp: rider.ftp,
          power_5s: rider.power_5s,
          power_15s: rider.power_15s,
          power_30s: rider.power_30s,
          power_60s: rider.power_60s,
          power_120s: rider.power_120s,
          power_300s: rider.power_300s,
          power_1200s: rider.power_1200s,
          power_5s_wkg: rider.power_5s_wkg,
          power_15s_wkg: rider.power_15s_wkg,
          power_30s_wkg: rider.power_30s_wkg,
          power_60s_wkg: rider.power_60s_wkg,
          power_120s_wkg: rider.power_120s_wkg,
          power_300s_wkg: rider.power_300s_wkg,
          power_1200s_wkg: rider.power_1200s_wkg,
          weight: rider.weight,
          height: rider.height,
          phenotype: rider.phenotype,
          category: rider.category,
          race_count: rider.race_count,
          zwift_id: rider.zwift_id,
          country: rider.country,
          age: rider.age,
          raw_response: rider,
          fetched_at: new Date().toISOString()
        });
      
      if (riderError) {
        console.error(`❌ Rider ${rider.id} error:`, riderError.message);
      } else {
        console.log(`   ✅ ${rider.name} (vELO: ${rider.velo}, Racing Score: ${rider.racing_score})`);
      }
    }
    
    console.log(`\n✅ Uploaded ${ridersToUpload.length} riders to database`);
    
    // Test view
    console.log('\n📊 Testing v_rider_complete view with first rider...');
    const firstRider = ridersToUpload[0];
    if (firstRider) {
      const { data: viewData } = await supabase
        .from('v_rider_complete')
        .select('rider_id, full_name, velo, zwiftracing_score, zwift_official_racing_score, weight_kg, ftp_watts, data_completeness')
        .eq('rider_id', firstRider.id)
        .maybeSingle();
      
      if (viewData) {
        console.log(`\n   Rider: ${viewData.full_name}`);
        console.log(`   vELO: ${viewData.velo}`);
        console.log(`   ZwiftRacing Score: ${viewData.zwiftracing_score}`);
        console.log(`   Zwift Official Score: ${viewData.zwift_official_racing_score || 'N/A (fetch profile separately)'}`);
        console.log(`   Weight: ${viewData.weight_kg}kg`);
        console.log(`   FTP: ${viewData.ftp_watts}W`);
        console.log(`   Data Completeness: ${viewData.data_completeness}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example: Fetch TeamNL (club_id 2281)
const clubId = process.argv[2] || 2281;
fetchClub(clubId);
