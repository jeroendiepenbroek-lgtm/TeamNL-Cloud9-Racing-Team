import { createClient } from '@supabase/supabase-js';
import { zwiftClient } from './src/api/zwift-client.js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function simpleSync() {
  console.log('🚀 Simple Sync - Bewezen methode\n');
  
  const { data: teamMembers } = await supabase
    .from('my_team_members')
    .select('rider_id')
    .order('rider_id');
  
  const riderIds = teamMembers?.map(m => m.rider_id) || [];
  console.log(`📋 ${riderIds.length} riders\n`);
  
  let synced = 0;
  
  for (const riderId of riderIds) {
    try {
      const riderData = await zwiftClient.getRider(riderId);
      
      const { error } = await supabase.from('riders_unified').upsert({
        rider_id: riderData.riderId,
        name: riderData.name,
        club_id: riderData.club?.id,
        club_name: riderData.club?.name,
        velo_rating: riderData.race?.current?.rating,
        category: riderData.race?.current?.mixed?.category,
        ftp: riderData.zpFTP,
        weight_kg: riderData.weight,
        power_5s_w: Array.isArray(riderData.power?.w5) ? riderData.power.w5[0] : riderData.power?.w5,
        power_1m_w: Array.isArray(riderData.power?.w60) ? riderData.power.w60[0] : riderData.power?.w60,
        power_5m_w: Array.isArray(riderData.power?.w300) ? riderData.power.w300[0] : riderData.power?.w300,
        power_20m_w: Array.isArray(riderData.power?.w1200) ? riderData.power.w1200[0] : riderData.power?.w1200,
        last_synced_zwift_racing: new Date().toISOString(),
      }, { onConflict: 'rider_id' });
      
      if (error) throw error;
      
      synced++;
      console.log(`✅ ${synced}/${riderIds.length}: ${riderData.name}`);
      
      if (synced < riderIds.length) await new Promise(r => setTimeout(r, 12000));
      
    } catch (err: any) {
      console.error(`❌ ${riderId}: ${err.message}`);
    }
  }
  
  console.log(`\n🎉 ${synced}/${riderIds.length} synced!`);
}

simpleSync();
