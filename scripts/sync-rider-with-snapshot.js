#!/usr/bin/env tsx
/**
 * Sync Rider Data + Create Historical Snapshot
 *
 * Complete workflow voor rider sync:
 * 1. Haal rider data op van API
 * 2. Sla op in database (rider + phenotype + race rating)
 * 3. Maak historical snapshot voor trend analyse
 *
 * Usage: npx tsx scripts/sync-rider-with-snapshot.ts <zwiftId>
 * Example: npx tsx scripts/sync-rider-with-snapshot.ts 150437
 */
import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { RiderRepository } from '../src/database/repositories.js';
import { logger } from '../src/utils/logger.js';
import { config } from '../src/utils/config.js';
async function syncRiderWithSnapshot(zwiftId) {
    logger.info('='.repeat(70));
    logger.info(`🔄 START RIDER SYNC + SNAPSHOT | Zwift ID: ${zwiftId}`);
    logger.info('='.repeat(70));
    const apiClient = new ZwiftApiClient({
        apiKey: config.zwiftApiKey,
        baseUrl: config.zwiftApiBaseUrl,
    });
    const riderRepo = new RiderRepository();
    try {
        // ============================================
        // STEP 1: Fetch Rider Data
        // ============================================
        logger.info('\n📥 [1/3] Rider data ophalen van API...');
        const riderData = await apiClient.getRider(zwiftId);
        logger.info(`✅ Rider: ${riderData.name}`);
        logger.info(`   Categorie: ${riderData.zpCategory}, FTP: ${riderData.zpFTP}w`);
        logger.info(`   Land: ${riderData.country}, Gewicht: ${riderData.weight}kg`);
        // ============================================
        // STEP 2: Save to Database
        // ============================================
        logger.info('\n💾 [2/3] Opslaan in database...');
        const savedRider = await riderRepo.upsertRider(riderData, undefined, {
            isFavorite: true,
            addedBy: 'sync-script',
            syncPriority: 1,
        });
        logger.info(`✅ Rider opgeslagen (DB ID: ${savedRider.id})`);
        logger.info(`   Power curve: ${savedRider.power5s}w @ 5s → ${savedRider.power20min}w @ 20min`);
        // Verify phenotype & race rating
        const fullRider = await riderRepo.getRider(zwiftId);
        if (fullRider?.phenotype) {
            logger.info(`   Phenotype: ${fullRider.phenotype.primaryType} (${fullRider.phenotype.sprinter}/100 sprinter)`);
        }
        if (fullRider?.raceRating) {
            logger.info(`   Race Rating: ${fullRider.raceRating.currentRating?.toFixed(1)} (max90: ${fullRider.raceRating.max90Rating?.toFixed(1)})`);
        }
        // ============================================
        // STEP 3: Create Historical Snapshot
        // ============================================
        logger.info('\n📸 [3/3] Historical snapshot aanmaken...');
        const snapshot = await riderRepo.saveRiderHistory(savedRider.id, {
            snapshotType: 'daily',
            triggeredBy: 'sync-script',
        });
        if (snapshot) {
            logger.info(`✅ Snapshot aangemaakt (ID: ${snapshot.id})`);
            logger.info(`   Timestamp: ${snapshot.recordedAt.toLocaleString('nl-NL')}`);
            logger.info(`   Data: FTP ${snapshot.ftp}w, Weight ${snapshot.weight}kg, Ranking ${snapshot.ranking || 'N/A'}`);
        }
        else {
            logger.warn('⚠️  Snapshot bestaat al voor vandaag of kon niet worden aangemaakt');
        }
        // ============================================
        // STEP 4: Verify & Summary
        // ============================================
        const historyRecords = await riderRepo.getRiderHistory(savedRider.id, 365);
        logger.info('\n' + '='.repeat(70));
        logger.info('✅ SYNC COMPLEET');
        logger.info('='.repeat(70));
        logger.info(`Rider: ${fullRider?.name} (Zwift ID: ${zwiftId})`);
        logger.info(`Database ID: ${savedRider.id}`);
        logger.info(`Club: ${fullRider?.club?.name || 'Geen club'}`);
        logger.info(`Historical Snapshots: ${historyRecords.length} records`);
        logger.info(`Last Updated: ${savedRider.lastUpdated.toLocaleString('nl-NL')}`);
        logger.info('='.repeat(70));
        // Show snapshot trend if multiple exist
        if (historyRecords.length > 1) {
            logger.info('\n📈 Trend Analysis (laatste snapshots):');
            historyRecords.slice(0, 5).forEach((snap) => {
                const date = snap.recordedAt.toLocaleDateString('nl-NL');
                logger.info(`   ${date}: FTP ${snap.ftp || 'N/A'}w | Weight ${snap.weight || 'N/A'}kg | Ranking ${snap.ranking || 'N/A'}`);
            });
        }
        return {
            rider: savedRider,
            snapshot,
            historyCount: historyRecords.length,
        };
    }
    catch (error) {
        logger.error('❌ SYNC GEFAALD', error);
        throw error;
    }
}
// ============================================
// CLI Execution
// ============================================
const zwiftId = process.argv[2] ? parseInt(process.argv[2]) : null;
if (!zwiftId || isNaN(zwiftId)) {
    logger.error('❌ Ongeldig of geen Zwift ID opgegeven!');
    logger.info('');
    logger.info('Usage: npx tsx scripts/sync-rider-with-snapshot.ts <zwiftId>');
    logger.info('Example: npx tsx scripts/sync-rider-with-snapshot.ts 150437');
    logger.info('');
    process.exit(1);
}
syncRiderWithSnapshot(zwiftId)
    .then(() => {
    logger.info('\n✅ Script succesvol afgerond');
    process.exit(0);
})
    .catch((error) => {
    logger.error('\n❌ Script gefaald', error);
    process.exit(1);
});
//# sourceMappingURL=sync-rider-with-snapshot.js.map