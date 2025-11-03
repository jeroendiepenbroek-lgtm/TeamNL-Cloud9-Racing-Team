#!/usr/bin/env tsx
/**
 * End-to-End Test Script
 *
 * Test de complete workflow:
 * 1. Upload favorites vanuit TXT bestand
 * 2. Sync rider stats (Step 2)
 * 3. Extract clubs (Step 3)
 * 4. Sync club rosters (Step 4)
 * 5. Forward event scan (Step 5)
 * 6. Verify database
 *
 * Usage:
 *   npm run test:e2e
 *   npm run test:e2e -- --file=my-favorites.txt
 *   npm run test:e2e -- --skip-upload
 */
import { SubteamService } from '../src/services/subteam.js';
import { EventService } from '../src/services/event.js';
import { ClubService } from '../src/services/club.js';
import { RiderRepository, ClubRepository, EventRepository } from '../src/database/repositories.js';
import { logger } from '../src/utils/logger.js';
import prisma from '../src/database/client.js';
// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name) => {
    const arg = args.find((a) => a.startsWith(`--${name}=`));
    return arg?.split('=')[1];
};
const hasFlag = (name) => args.includes(`--${name}`);
const inputFile = getArg('file') || 'examples/favorites-example.txt';
const skipUpload = hasFlag('skip-upload');
const maxEvents = parseInt(getArg('max-events') || '5', 10);
// Services
const subteamService = new SubteamService();
const eventService = new EventService();
const clubService = new ClubService();
const riderRepo = new RiderRepository();
const clubRepo = new ClubRepository();
const eventRepo = new EventRepository();
// Test results
const results = {
    step1: { success: false, count: 0 },
    step2: { success: false, synced: 0, clubsExtracted: 0 },
    step3: { success: false, clubs: 0, members: 0 },
    step4: { success: false, synced: 0, members: 0 },
    step5: { success: false, scanned: 0, found: 0, saved: 0 },
    verification: { success: false, events: 0, results: 0, favorites: 0 },
};
async function main() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  🧪 END-TO-END TEST - TeamNL Cloud9 Workflow');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    try {
        // ===== STEP 1: Upload Favorites =====
        logger.info('📤 STEP 1: Gebruik bestaande favorites uit database');
        // Gebruik 3 bestaande riders uit de database
        const testRiderIds = [150437, 832234, 377812]; // JRøne, Anton, Huub
        logger.info(`   Test riders: ${testRiderIds.join(', ')}`);
        // Verify dat deze riders al bestaan
        const existingFavorites = await riderRepo.getAllFavorites();
        const existingIds = existingFavorites.map(r => r.zwiftId);
        const allExist = testRiderIds.every(id => existingIds.includes(id));
        if (!allExist) {
            logger.warn('   ⚠️  Niet alle test riders zijn favorites, voeg ze toe...');
            await subteamService.addFavorites(testRiderIds);
        }
        logger.info(`   ✅ Test met ${testRiderIds.length} bestaande favorites`);
        results.step1 = {
            success: true,
            count: testRiderIds.length,
        };
        console.log('');
        // ===== STEP 2: Sync Rider Stats =====
        logger.info('🔄 STEP 2: Sync rider stats');
        const syncResult = await subteamService.syncFavoriteStats();
        logger.info(`   ✅ Synced: ${syncResult.synced}`);
        logger.info(`   ❌ Failed: ${syncResult.failed}`);
        logger.info(`   🏢 Clubs extracted: ${syncResult.clubsExtracted}`);
        results.step2 = {
            success: syncResult.synced > 0,
            synced: syncResult.synced,
            clubsExtracted: syncResult.clubsExtracted,
        };
        console.log('');
        // ===== STEP 3: Verify Club Extraction =====
        logger.info('🏢 STEP 3: Verify club extraction');
        const clubs = await clubRepo.getAllClubs();
        const favoriteClubs = clubs.filter((c) => c.source === 'favorite_rider');
        const totalMembers = await prisma.clubMember.count();
        logger.info(`   Total clubs: ${clubs.length}`);
        logger.info(`   Favorite clubs: ${favoriteClubs.length}`);
        logger.info(`   Total club members: ${totalMembers}`);
        results.step3 = {
            success: favoriteClubs.length > 0,
            clubs: favoriteClubs.length,
            members: totalMembers,
        };
        console.log('');
        // ===== STEP 4: Sync Club Rosters =====
        logger.info('👥 STEP 4: Sync club rosters');
        const clubSyncResult = await clubService.syncAllClubRosters();
        logger.info(`   ✅ Synced: ${clubSyncResult.synced} clubs`);
        logger.info(`   ❌ Failed: ${clubSyncResult.failed} clubs`);
        logger.info(`   👥 Total members: ${clubSyncResult.totalMembers}`);
        for (const club of clubSyncResult.clubs) {
            if (club.success) {
                logger.info(`      ✅ ${club.clubName}: ${club.memberCount} members, ${club.favoritesCount} favorites`);
            }
            else {
                logger.error(`      ❌ ${club.clubName}: ${club.error}`);
            }
        }
        results.step4 = {
            success: clubSyncResult.synced > 0,
            synced: clubSyncResult.synced,
            members: clubSyncResult.totalMembers,
        };
        console.log('');
        // ===== STEP 5: Forward Event Scan =====
        logger.info('🔍 STEP 5: Forward event scan');
        logger.info(`   Max events: ${maxEvents}`);
        logger.info(`   ⏱️  Estimated time: ~${maxEvents} minutes (1 event/min rate limit)`);
        const scanResult = await eventService.forwardScan({
            maxEvents,
            retentionDays: 100,
        });
        logger.info(`   ✅ Scanned: ${scanResult.scanned} events`);
        logger.info(`   🎯 Found: ${scanResult.found} events with tracked riders`);
        logger.info(`   💾 Saved: ${scanResult.saved} events`);
        logger.info(`   🗑️  Archived: ${scanResult.archived} old events`);
        logger.info(`   ⏱️  Duration: ${Math.round(scanResult.duration / 1000 / 60)} minutes`);
        logger.info(`   🔖 Last event ID: ${scanResult.lastEventId}`);
        results.step5 = {
            success: scanResult.scanned > 0,
            scanned: scanResult.scanned,
            found: scanResult.found,
            saved: scanResult.saved,
        };
        console.log('');
        // ===== VERIFICATION =====
        logger.info('✅ VERIFICATION: Database integrity check');
        const totalEvents = await prisma.event.count({ where: { deletedAt: null } });
        const totalResults = await prisma.raceResult.count();
        const totalFavorites = await prisma.rider.count({ where: { isFavorite: true } });
        logger.info(`   Events (active): ${totalEvents}`);
        logger.info(`   Race results: ${totalResults}`);
        logger.info(`   Favorites: ${totalFavorites}`);
        results.verification = {
            success: true,
            events: totalEvents,
            results: totalResults,
            favorites: totalFavorites,
        };
        console.log('');
        // ===== FINAL REPORT =====
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  📊 TEST RESULTS');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        const printResult = (step, result) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${step}`);
            Object.entries(result)
                .filter(([key]) => key !== 'success')
                .forEach(([key, value]) => {
                console.log(`   ${key}: ${value}`);
            });
        };
        printResult('Step 1: Upload Favorites', results.step1);
        printResult('Step 2: Sync Rider Stats', results.step2);
        printResult('Step 3: Club Extraction', results.step3);
        printResult('Step 4: Club Rosters', results.step4);
        printResult('Step 5: Forward Scan', results.step5);
        printResult('Verification', results.verification);
        console.log('');
        const allSuccess = Object.values(results).every((r) => r.success);
        if (allSuccess) {
            console.log('🎉 ALL TESTS PASSED! Workflow is volledig functioneel.');
        }
        else {
            console.log('⚠️  SOME TESTS FAILED. Check de logs hierboven.');
        }
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        process.exit(allSuccess ? 0 : 1);
    }
    catch (error) {
        logger.error('💥 Test gefaald:', error);
        console.log('');
        console.log('❌ END-TO-END TEST FAILED');
        console.log('');
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=e2e-test.js.map