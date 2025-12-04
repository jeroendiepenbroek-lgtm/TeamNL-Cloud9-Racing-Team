import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function syncRider() {
  console.log('\n🔄 SYNCING RIDER 150437\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Via lokale backend API (moet server draaien)
  console.log('Attempting via backend API endpoint...\n');
  
  try {
    // Eerst checken via /api/riders/search
    const searchRes = await fetch('http://localhost:3000/api/riders/search/150437');
    
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      console.log('✅ Search endpoint werkt:');
      console.log(`   Rider: ${searchData.rider?.name}`);
      console.log('');
      
      // Nu toevoegen via POST
      const addRes = await fetch('http://localhost:3000/api/riders/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zwiftId: 150437 })
      });
      
      if (addRes.ok) {
        console.log('✅ Rider 150437 toegevoegd aan team!');
      } else {
        const error = await addRes.text();
        console.log(`❌ Add failed: ${error}`);
      }
    } else {
      console.log('❌ Backend niet bereikbaar op localhost:3000');
      console.log('   Run eerst: npm run dev');
    }
  } catch (error: any) {
    console.log('❌ Connection error:', error.message);
    console.log('   Backend is niet gestart, gebruik direct API sync...\n');
    
    // Fallback: direct via ZwiftRacing API + Supabase
    const { zwiftClient } = await import('./src/api/zwift-client.js');
    
    console.log('Fetching rider from ZwiftRacing.app...');
    const rider = await zwiftClient.getRider(150437);
    
    console.log(`✅ Rider data opgehaald: ${rider.name}`);
    console.log(`   zpFTP: ${rider.zpFTP}W`);
    console.log(`   power_w1200: ${rider.power.w1200}W`);
    console.log(`   race_rating: ${rider.race.current.rating}`);
    console.log('');
    
    // Map naar database format
    const dbRider = {
      rider_id: rider.riderId,
      name: rider.name,
      gender: rider.gender,
      country: rider.country,
      age: rider.age,
      height: rider.height,
      weight: rider.weight,
      zp_category: rider.zpCategory,
      zp_ftp: rider.zpFTP,
      power_wkg5: rider.power.wkg5,
      power_wkg15: rider.power.wkg15,
      power_wkg30: rider.power.wkg30,
      power_wkg60: rider.power.wkg60,
      power_wkg120: rider.power.wkg120,
      power_wkg300: rider.power.wkg300,
      power_wkg1200: rider.power.wkg1200,
      power_w5: rider.power.w5,
      power_w15: rider.power.w15,
      power_w30: rider.power.w30,
      power_w60: rider.power.w60,
      power_w120: rider.power.w120,
      power_w300: rider.power.w300,
      power_w1200: rider.power.w1200,
      power_cp: rider.power.CP,
      power_awc: rider.power.AWC,
      power_compound_score: rider.power.compoundScore,
      power_rating: rider.power.powerRating,
      race_last_rating: rider.race.last.rating,
      race_last_date: rider.race.last.date,
      race_current_rating: rider.race.current.rating,
      race_current_date: rider.race.current.date,
      race_current_mixed_category: rider.race.current.mixed.category,
      race_current_mixed_number: rider.race.current.mixed.number,
      race_max30_rating: rider.race.max30.rating,
      race_max30_expires: rider.race.max30.expires,
      race_max90_rating: rider.race.max90.rating,
      race_max90_expires: rider.race.max90.expires,
      race_finishes: rider.race.finishes,
      race_dnfs: rider.race.dnfs,
      race_wins: rider.race.wins,
      race_podiums: rider.race.podiums,
      phenotype_value: rider.phenotype.value,
      phenotype_bias: rider.phenotype.bias,
      phenotype_sprinter: rider.phenotype.scores.sprinter,
      phenotype_puncheur: rider.phenotype.scores.puncheur,
      phenotype_pursuiter: rider.phenotype.scores.pursuiter,
      phenotype_climber: rider.phenotype.scores.climber,
      phenotype_tt: rider.phenotype.scores.tt,
      handicap_flat: rider.handicaps.flat,
      handicap_rolling: rider.handicaps.rolling,
      handicap_hilly: rider.handicaps.hilly,
      handicap_mountainous: rider.handicaps.mountainous,
      club_id: rider.club?.id || null,
      club_name: rider.club?.name || null
    };
    
    console.log('Inserting into riders table...');
    const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/riders`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY!,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(dbRider)
    });
    
    if (upsertRes.ok) {
      console.log('✅ Rider inserted into riders table');
    } else {
      console.log('❌ Insert failed:', await upsertRes.text());
    }
    
    // Add to my_team_members
    console.log('Adding to my_team_members...');
    const teamRes = await fetch(`${SUPABASE_URL}/rest/v1/my_team_members`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY!,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates'
      },
      body: JSON.stringify({ zwift_id: 150437 })
    });
    
    if (teamRes.ok || teamRes.status === 409) {
      console.log('✅ Rider added to my_team_members');
    } else {
      console.log('❌ Team add failed:', await teamRes.text());
    }
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

syncRider();
