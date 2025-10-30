/**
 * Test script voor Workflow v2
 *
 * Test volledige flow:
 * 1. Add favorites (Step 1)
 * 2. Stats sync (Step 2)
 * 3. Club extraction (Step 3)
 * 4. Club roster sync (Step 4)
 * 5. Verify data
 */
import { SubteamService } from '../src/services/subteam.js';
import { ClubService } from '../src/services/club.js';
import { RiderRepository, ClubRepository, ClubMemberRepository } from '../src/database/repositories.js';
import { logger } from '../src/utils/logger.js';
const TEST_RIDERS = [
    150437, // Test rider 1
    // Voeg meer toe als je wilt testen
];
async function testWorkflow() {
    logger.info('🧪 Start Workflow v2 Test');
    logger.info('='.repeat(60));
    const subteamService = new SubteamService();
    const clubService = new ClubService();
    const riderRepo = new RiderRepository();
    const clubRepo = new ClubRepository();
    const clubMemberRepo = new ClubMemberRepository();
    try {
        // ===== STEP 1: Add Favorites =====
        logger.info('\n📍 STEP 1: Add Favorites');
        logger.info('-'.repeat(60));
        const addResult = await subteamService.addFavorites(TEST_RIDERS);
        logger.info(`✅ Step 1 Results:`, {
            added: addResult.added,
            updated: addResult.updated,
            failed: addResult.failed,
        });
        if (addResult.added === 0 && addResult.updated === 0) {
            logger.error('❌ Geen riders toegevoegd!');
            process.exit(1);
        }
        // ===== STEP 2: Stats Sync (gebeurt automatisch in addFavorites) =====
        logger.info('\n📍 STEP 2: Stats Sync (uitgevoerd in Step 1)');
        logger.info('-'.repeat(60));
        // Verify rider data
        for (const zwiftId of TEST_RIDERS) {
            const rider = await riderRepo.getRider(zwiftId);
            if (!rider) {
                logger.error(`❌ Rider ${zwiftId} niet gevonden in database!`);
                continue;
            }
            logger.info(`✅ Rider ${zwiftId}: ${rider.name}`, {
                ftp: rider.ftp,
                ftpWkg: rider.ftpWkg,
                clubId: rider.clubId,
                isFavorite: rider.isFavorite,
                syncPriority: rider.syncPriority,
            });
        }
        // ===== STEP 3: Club Extraction (gebeurt automatisch) =====
        logger.info('\n📍 STEP 3: Club Extraction (uitgevoerd in Step 1)');
        logger.info('-'.repeat(60));
        // Get extracted clubs
        const allClubs = await clubRepo.getAllClubs();
        const favoriteClubs = allClubs.filter(c => c.source === 'favorite_rider');
        logger.info(`✅ Extracted ${favoriteClubs.length} club(s):`, favoriteClubs.map(c => ({ id: c.id, name: c.name, source: c.source })));
        if (favoriteClubs.length === 0) {
            logger.warn('⚠️  Geen clubs geëxtraheerd (riders hebben geen club?)');
        }
        // ===== STEP 4: Club Roster Sync =====
        logger.info('\n📍 STEP 4: Club Roster Sync');
        logger.info('-'.repeat(60));
        if (favoriteClubs.length > 0) {
            logger.info('⏳ Start club roster sync...');
            logger.info('⚠️  Dit kan 61 sec+ duren per club (rate limit)');
            const syncResult = await clubService.syncAllClubRosters();
            logger.info(`✅ Step 4 Results:`, {
                synced: syncResult.synced,
                failed: syncResult.failed,
                totalMembers: syncResult.totalMembers,
            });
            // Verify isFavorite linking
            for (const club of favoriteClubs) {
                const favoriteMembers = await clubMemberRepo.getFavoriteClubMembers(club.id);
                logger.info(`   Club ${club.name}: ${favoriteMembers.length} favorite member(s)`);
            }
        }
        else {
            logger.info('⏭️  Skip club roster sync (geen clubs)');
        }
        // ===== FINAL VERIFICATION =====
        logger.info('\n📍 FINAL VERIFICATION');
        logger.info('-'.repeat(60));
        // Count all data
        const favoritesCount = await riderRepo.getFavoriteZwiftIds();
        const clubMembersCount = await clubMemberRepo.getAllTrackedRiders();
        logger.info('✅ Database Status:', {
            favorites: favoritesCount.length,
            favoriteClubs: favoriteClubs.length,
            trackedClubMembers: clubMembersCount.length,
        });
        // Verify workflow completeness
        const allComplete = favoritesCount.length > 0 &&
            (favoriteClubs.length > 0 || logger.warn('Geen clubs (OK als riders geen club hebben)'));
        if (allComplete) {
            logger.info('\n🎉 WORKFLOW TEST GESLAAGD!');
            logger.info('='.repeat(60));
            logger.info('Volgende stappen:');
            logger.info('1. Start server: npm run dev');
            logger.info('2. Test API: curl http://localhost:3000/api/subteam/riders');
            logger.info('3. Enable cron jobs in .env: FAVORITES_SYNC_ENABLED=true, etc.');
            logger.info('4. Test forward scan: POST /api/sync/forward (kost 17+ uur!)');
        }
        else {
            logger.error('\n❌ WORKFLOW TEST GEFAALD');
            logger.error('Check de logs voor details');
            process.exit(1);
        }
    }
    catch (error) {
        logger.error('\n💥 TEST GEFAALD:', error);
        process.exit(1);
    }
    process.exit(0);
}
// Run test
testWorkflow();
//# sourceMappingURL=test-workflow.js.map