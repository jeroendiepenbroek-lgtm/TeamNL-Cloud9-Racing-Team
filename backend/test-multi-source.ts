import { multiSourceRiderService } from './src/services/multi-source-rider.service.js';

async function testMultiSource() {
  console.log('=== MULTI-SOURCE DATA TEST ===\n');
  console.log('Testing rider 150437 with both ZwiftRacing.app and ZwiftPower...\n');
  
  try {
    const data = await multiSourceRiderService.getRiderWithAllSources(150437);
    
    console.log('\n=== FINAL MERGED DATA ===');
    console.log(`Name: ${data.name}`);
    console.log(`FTP: ${data.zpFTP}W`);
    console.log(`Category: ${data.zpCategory}`);
    console.log(`Weight: ${data.weight}kg`);
    console.log(`Primary source: ${data.dataSources.primary}`);
    
    if (data.dataSources.ftpSource) {
      console.log(`FTP source: ${data.dataSources.ftpSource}`);
    }
    if (data.dataSources.categorySource) {
      console.log(`Category source: ${data.dataSources.categorySource}`);
    }
    
    console.log('\n💡 Als er mismatches zijn, check de logs hierboven');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testMultiSource();
