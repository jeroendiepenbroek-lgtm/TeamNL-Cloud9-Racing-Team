#!/usr/bin/env tsx
/**
 * Test Dashboard User Stories
 * Tests de 3 hoofdfuncties voor het dashboard
 */
import { DashboardService } from '../src/services/dashboard.js';
import { logger } from '../src/utils/logger.js';
import { prisma } from '../src/database/client.js';
const TARGET_RIDER_ID = 150437;
const TEST_FAVORITE_IDS = [1495, 1813927]; // Onno en Dylan
async function testDashboard() {
    const dashboard = new DashboardService();
    logger.info('╔════════════════════════════════════════════════════════════════╗');
    logger.info('║           DASHBOARD USER STORIES TEST                         ║');
    logger.info('╚════════════════════════════════════════════════════════════════╝\n');
    try {
        // ========================================================================
        // USER STORY 1: Club Recent Results
        // ========================================================================
        logger.info('📊 [1/3] USER STORY 1: Recent Club Results');
        logger.info('─'.repeat(64));
        logger.info(`Als rider ${TARGET_RIDER_ID} wil ik recente resultaten van mijn teamgenoten zien\n`);
        try {
            const clubResults = await dashboard.getClubRecentResults(TARGET_RIDER_ID, 20);
            logger.info(`✓ Club: ${clubResults.rider.clubId}`);
            logger.info(`✓ Rider: ${clubResults.rider.name}`);
            logger.info(`✓ Resultaten gevonden: ${clubResults.totalResults}\n`);
            if (clubResults.results.length > 0) {
                logger.info(`Laatste 5 resultaten:`);
                clubResults.results.slice(0, 5).forEach((r, i) => {
                    logger.info(`  ${i + 1}. ${r.riderName} - Pos ${r.position} @ ${r.eventName || `Event ${r.eventId}`}`);
                    logger.info(`     Time: ${r.time ? Math.floor(r.time / 60) + ':' + (r.time % 60).toString().padStart(2, '0') : 'N/A'}`);
                });
            }
            else {
                logger.warn('  ⚠️  Geen resultaten gevonden - sync meer events!');
            }
            logger.info('\n💡 API Endpoint: GET /api/dashboard/club-results/150437\n');
        }
        catch (error) {
            logger.error(`❌ Story 1 gefaald: ${error.message}`);
        }
        // ========================================================================
        // USER STORY 2: Favorite Riders
        // ========================================================================
        logger.info('⭐ [2/3] USER STORY 2: Favorite Riders Details');
        logger.info('─'.repeat(64));
        logger.info(`Als gebruiker ${TARGET_RIDER_ID} wil ik details van mijn favoriete riders zien\n`);
        // First add some favorites
        logger.info('Toevoegen test favorites...');
        for (const favId of TEST_FAVORITE_IDS) {
            try {
                await dashboard.addFavorite(TARGET_RIDER_ID, favId, `Test favorite for rider ${favId}`);
                logger.info(`  ✓ Added favorite: ${favId}`);
            }
            catch (error) {
                if (error.message.includes('not found')) {
                    logger.warn(`  ⚠️  Rider ${favId} not in database`);
                }
                else {
                    logger.debug(`  ℹ️  Favorite ${favId} already exists`);
                }
            }
        }
        logger.info('');
        // Get favorites
        try {
            const favorites = await dashboard.getFavoriteRiders(TARGET_RIDER_ID);
            logger.info(`✓ Totaal favorites: ${favorites.totalFavorites}\n`);
            if (favorites.favorites.length > 0) {
                logger.info(`Favorite riders:`);
                favorites.favorites.forEach((fav, i) => {
                    logger.info(`  ${i + 1}. ${fav.name} (${fav.zwiftId})`);
                    logger.info(`     Category: ${fav.category || 'N/A'} | FTP: ${fav.ftp || 'N/A'}W (${fav.ftpWkg?.toFixed(2) || 'N/A'} W/kg)`);
                    logger.info(`     Club: ${fav.club?.name || 'No club'}`);
                    if (fav.statistics) {
                        logger.info(`     Stats: ${fav.statistics.totalRaces} races, ${fav.statistics.totalWins} wins, ${fav.statistics.totalPodiums} podiums`);
                    }
                    else {
                        logger.info(`     Stats: Not calculated yet`);
                    }
                    logger.info(`     Recent results: ${fav.recentResults.length}`);
                    logger.info(`     Notes: ${fav.notes || 'None'}`);
                });
            }
            else {
                logger.warn('  ⚠️  Geen favorites - voeg riders toe met POST /api/dashboard/favorites/{userId}/{favoriteId}');
            }
            logger.info('\n💡 API Endpoints:');
            logger.info('   GET    /api/dashboard/favorites/150437');
            logger.info('   POST   /api/dashboard/favorites/150437/1495');
            logger.info('   DELETE /api/dashboard/favorites/150437/1495\n');
        }
        catch (error) {
            logger.error(`❌ Story 2 gefaald: ${error.message}`);
        }
        // ========================================================================
        // USER STORY 3: Rider Recent Events
        // ========================================================================
        logger.info('📅 [3/3] USER STORY 3: Rider Recent Events (90 days)');
        logger.info('─'.repeat(64));
        logger.info(`Als rider ${TARGET_RIDER_ID} wil ik mijn events van de laatste 90 dagen zien\n`);
        try {
            const recentEvents = await dashboard.getRiderRecentEvents(TARGET_RIDER_ID, 90);
            logger.info(`✓ Rider: ${recentEvents.rider.name}`);
            logger.info(`✓ Period: ${recentEvents.period.days} days`);
            logger.info(`✓ Events gevonden: ${recentEvents.summary.totalEvents}\n`);
            logger.info(`Samenvatting:`);
            logger.info(`  Total events: ${recentEvents.summary.totalEvents}`);
            logger.info(`  Finished: ${recentEvents.summary.finishedEvents}`);
            logger.info(`  DNFs: ${recentEvents.summary.dnfs}`);
            logger.info(`  Avg position: ${recentEvents.summary.avgPosition || 'N/A'}\n`);
            if (recentEvents.events.length > 0) {
                logger.info(`Laatste ${Math.min(5, recentEvents.events.length)} events:`);
                recentEvents.events.slice(0, 5).forEach((evt, i) => {
                    const date = evt.eventDate ? new Date(evt.eventDate).toISOString().split('T')[0] : 'Unknown date';
                    logger.info(`  ${i + 1}. ${evt.eventName} (${date})`);
                    logger.info(`     Event ID: ${evt.eventId}`);
                    logger.info(`     Position: ${evt.position || 'N/A'} (Cat: ${evt.positionCategory || 'N/A'})`);
                    logger.info(`     Route: ${evt.routeName || 'N/A'} - ${evt.distance || 'N/A'}km`);
                    if (evt.averagePower) {
                        logger.info(`     Power: ${evt.averagePower}W (${evt.averageWkg?.toFixed(2) || 'N/A'} W/kg)`);
                    }
                    if (evt.time) {
                        const min = Math.floor(evt.time / 60);
                        const sec = evt.time % 60;
                        logger.info(`     Time: ${min}:${sec.toString().padStart(2, '0')}`);
                    }
                });
            }
            else {
                logger.warn('  ⚠️  Geen events gevonden - sync meer race results!');
            }
            logger.info('\n💡 API Endpoint: GET /api/dashboard/rider-events/150437?days=90\n');
        }
        catch (error) {
            logger.error(`❌ Story 3 gefaald: ${error.message}`);
        }
        // ========================================================================
        // SUMMARY
        // ========================================================================
        logger.info('╔════════════════════════════════════════════════════════════════╗');
        logger.info('║                      TEST SAMENVATTING                         ║');
        logger.info('╚════════════════════════════════════════════════════════════════╝\n');
        // Check database status
        const totalRiders = await prisma.rider.count();
        const totalEvents = await prisma.event.count();
        const totalResults = await prisma.raceResult.count();
        const totalFavorites = await prisma.userFavorite.count();
        logger.info('📊 Database Status:');
        logger.info(`  Riders: ${totalRiders}`);
        logger.info(`  Events: ${totalEvents}`);
        logger.info(`  Race Results: ${totalResults}`);
        logger.info(`  Favorites: ${totalFavorites}\n`);
        logger.info('✅ Dashboard functies getest!');
        logger.info('\n📝 VOLGENDE STAPPEN:');
        logger.info('  1. Sync meer events voor betere data:');
        logger.info('     POST /api/sync/event/:eventId');
        logger.info('  2. Bereken statistics:');
        logger.info('     Implementeer statistics calculation service');
        logger.info('  3. Frontend dashboard bouwen met deze endpoints\n');
    }
    catch (error) {
        logger.error('❌ Test gefaald', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
testDashboard();
//# sourceMappingURL=test-dashboard.js.map