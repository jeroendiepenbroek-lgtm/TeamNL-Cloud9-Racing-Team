/**
 * Check Rider 150437 - Compare DB vs API
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
  console.log('🔍 Checking Rider 150437 - Jeroen Diepenbroek\n');
  
  // 1. Check my_team_members
  console.log('📋 1. Checking my_team_members table...');
  const { data: teamMember } = await supabase
    .from('my_team_members')
    .select('*')
    .eq('rider_id', 150437)
    .maybeSingle();
  
  if (teamMember) {
    console.log('   ✅ Found in my_team_members');
    console.log(`   Added: ${teamMember.created_at}`);
  } else {
    console.log('   ❌ NOT in my_team_members table!');
    console.log('   → Sync V2 will NOT update this rider');
  }
  
  // 2. Check riders table
  console.log('\n📊 2. Checking riders table...');
  const { data: rider } = await supabase
    .from('riders')
    .select('*')
    .eq('rider_id', 150437)
    .maybeSingle();
  
  if (rider) {
    console.log('   ✅ Found in riders table:');
    console.log(`   Name: ${rider.name}`);
    console.log(`   vELO: ${rider.velo_rating || 'NULL'}`);
    console.log(`   FTP: ${rider.ftp || 'NULL'}`);
    console.log(`   Weight: ${rider.weight_kg || 'NULL'}kg`);
    console.log(`   Height: ${rider.height_cm || 'NULL'}cm`);
    console.log(`   Category: ${rider.race_category || 'NULL'}`);
    console.log(`   Last Updated: ${rider.updated_at}`);
  } else {
    console.log('   ❌ NOT in riders table!');
  }
  
  // 3. Check ZwiftRacing API
  console.log('\n🌐 3. Fetching from ZwiftRacing API...');
  try {
    const response = await axios.get(
      'https://zwift-ranking.herokuapp.com/api/riders/150437',
      { timeout: 10000 }
    );
    
    console.log('   ✅ ZwiftRacing API response:');
    const api = response.data;
    console.log(`   Name: ${api.name || 'NULL'}`);
    console.log(`   vELO: ${api.velo || api.veloRating || 'NULL'}`);
    console.log(`   FTP: ${api.ftp || 'NULL'}`);
    console.log(`   Weight: ${api.weight || (api.weightInGrams ? (api.weightInGrams / 1000).toFixed(1) : 'NULL')}kg`);
    console.log(`   Height: ${api.height || api.heightInCentimeters || 'NULL'}cm`);
    console.log(`   Category: ${api.category || api.raceCategory || 'NULL'}`);
    console.log(`   ZwiftId: ${api.zwiftId || api.riderId || 'NULL'}`);
    
    // 4. Comparison
    if (rider) {
      console.log('\n📊 4. Comparison (DB vs API):');
      console.log('   ' + '='.repeat(50));
      
      const veloMatch = rider.velo_rating === (api.velo || api.veloRating);
      const ftpMatch = rider.ftp === api.ftp;
      const weightMatch = rider.weight_kg === api.weight || 
                          rider.weight_kg === (api.weightInGrams ? (api.weightInGrams / 1000) : null);
      
      console.log(`   vELO:   DB=${rider.velo_rating || 'NULL'} | API=${api.velo || 'NULL'} ${veloMatch ? '✅' : '❌ MISMATCH'}`);
      console.log(`   FTP:    DB=${rider.ftp || 'NULL'} | API=${api.ftp || 'NULL'} ${ftpMatch ? '✅' : '❌ MISMATCH'}`);
      console.log(`   Weight: DB=${rider.weight_kg || 'NULL'}kg | API=${api.weight || (api.weightInGrams ? (api.weightInGrams / 1000).toFixed(1) : 'NULL')}kg ${weightMatch ? '✅' : '❌ MISMATCH'}`);
      
      if (!veloMatch || !ftpMatch || !weightMatch) {
        console.log('\n   ⚠️  Data is OUTDATED! Needs sync.');
      } else {
        console.log('\n   ✅ Data is up-to-date!');
      }
    }
    
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.log('   ⚠️  Rate limit - try again later');
    } else if (error.response?.status === 404) {
      console.log('   ❌ Rider not found in ZwiftRacing API');
    } else {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
  
  // 5. Summary & Solution
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✓ In my_team_members: ${teamMember ? '✅ YES' : '❌ NO'}`);
  console.log(`✓ In riders table:    ${rider ? '✅ YES' : '❌ NO'}`);
  
  if (!teamMember) {
    console.log('\n💡 SOLUTION: Add to my_team_members');
    console.log('   POST http://localhost:3000/api/riders/my-team');
    console.log('   Body: {"rider_ids": [150437]}');
    console.log('\n   Then rider sync will automatically update this rider!');
  } else if (rider) {
    console.log('\n💡 To manually trigger sync:');
    console.log('   POST http://localhost:3000/api/sync/riders');
  }
}

main().catch(console.error);
