import { riderEnrichmentService } from './src/services/rider-enrichment.service.js';

async function testEnrichment() {
  console.log('=== RIDER DATA ENRICHMENT TEST ===\n');
  console.log('Testing rider 150437 with recent race data...\n');
  
  try {
    const enriched = await riderEnrichmentService.enrichRiderData(150437);
    
    console.log('\n=== ENRICHED DATA ===');
    console.log(`Name: ${enriched.name}`);
    console.log(`FTP: ${enriched.zpFTP}W (source: ${enriched.enrichmentSource.ftpSource})`);
    console.log(`Category: ${enriched.zpCategory} (source: ${enriched.enrichmentSource.categorySource})`);
    console.log(`Weight: ${enriched.weight}kg`);
    console.log(`Confidence: ${enriched.enrichmentSource.confidence}`);
    
    if (enriched.enrichmentSource.lastResultDate) {
      console.log(`Last result date: ${enriched.enrichmentSource.lastResultDate}`);
    }
    
    console.log('\n💡 Als recent_result wordt getoond, is data van actuele race gebruikt!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testEnrichment();
