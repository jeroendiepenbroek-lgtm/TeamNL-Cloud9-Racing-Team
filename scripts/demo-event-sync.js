#!/usr/bin/env tsx
/**
 * DEMO: Event Results Sync Flow
 *
 * Dit script toont hoe je event results synchroniseert
 * Voor echte event IDs: bezoek https://zwiftracing.app en zoek events
 */
import { logger } from '../src/utils/logger.js';
logger.info('╔════════════════════════════════════════════════════════════════╗');
logger.info('║           EVENT RESULTS SYNC - INSTRUCTIES                     ║');
logger.info('╚════════════════════════════════════════════════════════════════╝\n');
logger.info('📋 STAPPEN OM EVENT RESULTS TE SYNCEN:\n');
logger.info('1️⃣  START DE SERVER (in aparte terminal):');
logger.info('   npm run dev\n');
logger.info('2️⃣  VIND EVENT IDs op ZwiftRacing.app:');
logger.info('   Bezoek: https://zwiftracing.app');
logger.info('   - Zoek naar je rider (150437 / JRøne)');
logger.info('   - Bekijk race history');
logger.info('   - Noteer event IDs uit de URL\n');
logger.info('3️⃣  SYNC EVENT via API:');
logger.info('   curl -X POST http://localhost:3000/api/sync/event/YOUR_EVENT_ID\n');
logger.info('4️⃣  OF via script:');
logger.info('   npx tsx scripts/sync-event-manual.ts YOUR_EVENT_ID\n');
logger.info('5️⃣  CHECK RESULTATEN:');
logger.info('   npx tsx scripts/test-rider-relations.ts\n');
logger.info('─'.repeat(64));
logger.info('💡 ALTERNATIEF: Direct via API client testen\n');
logger.info('   Start Node REPL:');
logger.info('   node --loader tsx\n');
logger.info('   In REPL:');
logger.info(`   import { ZwiftApiClient } from './src/api/zwift-client.js';`);
logger.info(`   const client = new ZwiftApiClient({`);
logger.info(`     apiKey: '650c6d2fc4ef6858d74cbef1',`);
logger.info(`     baseUrl: 'https://zwift-ranking.herokuapp.com'`);
logger.info(`   });`);
logger.info(`   const results = await client.getResults(YOUR_EVENT_ID);`);
logger.info(`   console.log(results.length, 'results');`);
logger.info('\n─'.repeat(64));
logger.info('🎯 VOORBEELD EVENT IDs (mogelijk niet geldig):\n');
const exampleEventIds = [
    { id: 4001234, type: 'WTRL TTT', note: 'Team Time Trial events' },
    { id: 3901234, type: 'ZRL', note: 'Zwift Racing League' },
    { id: 4100000, type: 'Recent', note: 'Recent event range' },
];
exampleEventIds.forEach(evt => {
    logger.info(`   ${evt.id} - ${evt.type.padEnd(12)} (${evt.note})`);
});
logger.info('\n⚠️  BELANGRIJK:');
logger.info('   - Event IDs zijn specifiek per race instance');
logger.info('   - Oude event IDs werken mogelijk niet meer');
logger.info('   - Rate limit: 1 event sync per minuut\n');
logger.info('📚 API ENDPOINTS:\n');
logger.info('   POST /api/sync/event/:eventId        - Sync event results');
logger.info('   GET  /api/results/:eventId           - Haal results op uit DB');
logger.info('   GET  /api/riders/150437/results      - Rider results uit DB');
logger.info('   GET  /api/sync/logs                  - Sync logs\n');
logger.info('✅ Voor meer info: zie docs/ENDPOINTS_OVERVIEW.md\n');
//# sourceMappingURL=demo-event-sync.js.map