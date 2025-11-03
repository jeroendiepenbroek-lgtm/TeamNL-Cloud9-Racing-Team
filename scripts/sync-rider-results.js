#!/usr/bin/env tsx
/**
 * Sync race results voor rider 150437
 * Gebruikt direct de API om recent events te vinden en results te syncen
 */
import axios from 'axios';
import { config } from '../src/utils/config.js';
import { logger } from '../src/utils/logger.js';
const TARGET_RIDER_ZWIFT_ID = 150437;
const BASE_URL = 'https://zwift-ranking.herokuapp.com';
const API_KEY = '650c6d2fc4ef6858d74cbef1';
/**
 * Test: Haal rider profile op en zoek naar race history
 */
async function findRiderEvents() {
    try {
        logger.info(`🔍 Zoek recent race events voor rider ${TARGET_RIDER_ZWIFT_ID}...`);
        // Probeer direct via ZwiftRacing API rider profile
        const response = await axios.get(`${BASE_URL}/public/riders/${TARGET_RIDER_ZWIFT_ID}`, {
            headers: { 'Authorization': API_KEY },
        });
        logger.info('✓ Rider data opgehaald van API');
        logger.debug('Response keys:', Object.keys(response.data));
        // Check of er event history beschikbaar is
        if (response.data.recentEvents && Array.isArray(response.data.recentEvents)) {
            logger.info(`✓ ${response.data.recentEvents.length} recente events gevonden`);
            return response.data.recentEvents.map((evt) => ({
                eventId: evt.id || evt.eventId,
                name: evt.name || 'Unknown Event',
                date: evt.date || evt.eventDate || new Date().toISOString(),
                seriesId: evt.seriesId,
            }));
        }
        // Als geen recent events, probeer andere velden
        logger.warn('⚠️  Geen recentEvents veld gevonden in rider response');
        logger.debug('Available fields:', Object.keys(response.data));
        // Fallback: gebruik test event IDs (vaak voorkomende race series)
        logger.info('📝 Gebruik fallback: bekende test event IDs');
        return [];
    }
    catch (error) {
        logger.error('❌ Fout bij ophalen rider events', error);
        return [];
    }
}
/**
 * Sync results voor een specifiek event
 */
async function syncEvent(eventId, eventName) {
    try {
        logger.info(`\n🏁 Sync event ${eventId}: ${eventName}`);
        // Gebruik de API endpoint van onze server
        const response = await axios.post(`http://localhost:${config.port}/api/sync/event/${eventId}`, {}, { timeout: 120000 } // 2 minuten timeout voor grote events
        );
        logger.info(`✅ Event ${eventId} gesynchroniseerd:`, response.data);
        return true;
    }
    catch (error) {
        if (error.response) {
            logger.error(`❌ Event ${eventId} sync gefaald:`, error.response.data);
        }
        else {
            logger.error(`❌ Event ${eventId} sync gefaald:`, error.message);
        }
        return false;
    }
}
/**
 * Hoofdfunctie
 */
async function main() {
    logger.info('╔════════════════════════════════════════════════════════════════╗');
    logger.info('║         SYNC RACE RESULTS - RIDER 150437 (JRøne)              ║');
    logger.info('╚════════════════════════════════════════════════════════════════╝\n');
    // Stap 1: Probeer events te vinden
    const events = await findRiderEvents();
    if (events.length === 0) {
        logger.warn('\n⚠️  Geen automatische events gevonden.');
        logger.info('\n💡 ALTERNATIEVEN:');
        logger.info('   1. Zoek event IDs handmatig op zwiftracing.app');
        logger.info('   2. Gebruik: POST /api/sync/event/:eventId');
        logger.info('   3. Test met een bekend event ID');
        logger.info('\n📚 Voorbeeld event IDs (vaak gebruikte series):');
        logger.info('   - 4001234 (WTRL TTT)');
        logger.info('   - 3901234 (ZRL)');
        logger.info('   - 3801234 (Community Events)');
        logger.info('\n🔧 Test handmatig met:');
        logger.info('   curl -X POST http://localhost:3000/api/sync/event/YOUR_EVENT_ID\n');
        process.exit(0);
    }
    // Stap 2: Sync elk gevonden event
    logger.info(`\n📊 Sync ${events.length} events...\n`);
    let successCount = 0;
    let errorCount = 0;
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const success = await syncEvent(event.eventId, event.name);
        if (success) {
            successCount++;
        }
        else {
            errorCount++;
        }
        // Rate limit: wacht 65 seconden tussen event syncs (1/min)
        if (i < events.length - 1) {
            logger.info('⏳ Wacht 65 seconden voor rate limit...\n');
            await new Promise(resolve => setTimeout(resolve, 65000));
        }
    }
    // Samenvatting
    logger.info('\n╔════════════════════════════════════════════════════════════════╗');
    logger.info('║                      SYNC SAMENVATTING                         ║');
    logger.info('╚════════════════════════════════════════════════════════════════╝\n');
    logger.info(`✅ Succesvol: ${successCount} events`);
    logger.info(`❌ Gefaald: ${errorCount} events`);
    logger.info(`📊 Totaal: ${events.length} events\n`);
    // Check resultaten in database
    logger.info('🔍 Check resultaten met:');
    logger.info('   npx tsx scripts/test-rider-relations.ts\n');
}
// Ensure server is running
logger.info('⚠️  LET OP: Zorg dat de server draait met: npm run dev\n');
main().catch(error => {
    logger.error('❌ Script gefaald', error);
    process.exit(1);
});
//# sourceMappingURL=sync-rider-results.js.map