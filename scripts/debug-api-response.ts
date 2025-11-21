/**
 * Debug ZwiftRacing API Response
 * Check exact structure of power data
 */
import 'dotenv/config';
import axios from 'axios';

const zwiftApi = axios.create({
  baseURL: 'https://zwift-ranking.herokuapp.com',
  headers: {
    'Authorization': process.env.ZWIFT_RACING_API_KEY || ''
  }
});

async function main() {
  console.log('🔍 Debug ZwiftRacing API Response Structure\n');
  
  // Test with rider 150437
  const riderId = 150437;
  
  try {
    const response = await zwiftApi.get(`/api/riders/${riderId}`);
    const data = response.data;
    
    console.log('📊 FULL API RESPONSE:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 POWER OBJECT STRUCTURE:');
    console.log('='.repeat(70));
    
    if (data.power) {
      console.log('\nPower object exists:');
      console.log(JSON.stringify(data.power, null, 2));
      
      console.log('\n📊 Type Analysis:');
      Object.entries(data.power).forEach(([key, value]) => {
        console.log(`   ${key}: ${typeof value} = ${value}`);
      });
    } else {
      console.log('❌ No power object in response');
    }
    
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.log('⚠️  Rate limit - try again later');
    } else {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

main().catch(console.error);
