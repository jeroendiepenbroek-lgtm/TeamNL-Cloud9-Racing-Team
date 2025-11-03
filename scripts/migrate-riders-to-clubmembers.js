/**
 * Data Migratie: Riders → ClubMembers
 *
 * Verplaatst alle bestaande riders (407 records) naar club_members tabel
 * en leegt de riders tabel voor favorieten.
 *
 * Run: npx tsx scripts/migrate-riders-to-clubmembers.ts
 */
import { prisma } from '../src/database/client.js';
import { logger } from '../src/utils/logger.js';
async function migrateRidersToClubMembers() {
    logger.info('🚀 Start migratie: Riders → ClubMembers');
    try {
        // Stap 1: Tel huidige riders
        const riderCount = await prisma.rider.count();
        logger.info(`📊 Gevonden: ${riderCount} riders om te migreren`);
        if (riderCount === 0) {
            logger.warn('⚠️  Geen riders gevonden om te migreren');
            return;
        }
        // Stap 2: Haal alle riders op
        const riders = await prisma.rider.findMany({
            select: {
                zwiftId: true,
                name: true,
                clubId: true,
                categoryRacing: true,
                ftp: true,
                ftpWkg: true,
                powerToWeight: true,
                power5s: true,
                power15s: true,
                power30s: true,
                power1min: true,
                power2min: true,
                power5min: true,
                power20min: true,
                powerWkg5s: true,
                powerWkg15s: true,
                powerWkg30s: true,
                powerWkg1min: true,
                powerWkg2min: true,
                powerWkg5min: true,
                powerWkg20min: true,
                criticalPower: true,
                anaerobicWork: true,
                ranking: true,
                rankingScore: true,
                age: true,
                gender: true,
                countryCode: true,
                weight: true,
                height: true,
                totalWins: true,
                totalPodiums: true,
                totalRaces: true,
                totalDnfs: true,
                handicapFlat: true,
                handicapRolling: true,
                handicapHilly: true,
                handicapMountainous: true,
                lastActive: true,
                isActive: true,
            },
        });
        logger.info(`📦 Opgehaald: ${riders.length} riders voor migratie`);
        // Stap 3: Batch insert naar club_members (50 per batch)
        const BATCH_SIZE = 50;
        let migrated = 0;
        let skipped = 0;
        for (let i = 0; i < riders.length; i += BATCH_SIZE) {
            const batch = riders.slice(i, i + BATCH_SIZE);
            for (const rider of batch) {
                try {
                    // Skip riders zonder clubId (geen club member)
                    if (!rider.clubId) {
                        logger.debug(`⏭️  Skip ${rider.name}: geen clubId`);
                        skipped++;
                        continue;
                    }
                    // Upsert naar club_members
                    await prisma.clubMember.upsert({
                        where: {
                            unique_club_member: {
                                zwiftId: rider.zwiftId,
                                clubId: rider.clubId,
                            },
                        },
                        update: {
                            name: rider.name,
                            categoryRacing: rider.categoryRacing,
                            ftp: rider.ftp,
                            ftpWkg: rider.ftpWkg,
                            powerToWeight: rider.powerToWeight,
                            power5s: rider.power5s,
                            power15s: rider.power15s,
                            power30s: rider.power30s,
                            power1min: rider.power1min,
                            power2min: rider.power2min,
                            power5min: rider.power5min,
                            power20min: rider.power20min,
                            powerWkg5s: rider.powerWkg5s,
                            powerWkg15s: rider.powerWkg15s,
                            powerWkg30s: rider.powerWkg30s,
                            powerWkg1min: rider.powerWkg1min,
                            powerWkg2min: rider.powerWkg2min,
                            powerWkg5min: rider.powerWkg5min,
                            powerWkg20min: rider.powerWkg20min,
                            criticalPower: rider.criticalPower,
                            anaerobicWork: rider.anaerobicWork,
                            ranking: rider.ranking,
                            rankingScore: rider.rankingScore,
                            age: rider.age,
                            gender: rider.gender,
                            countryCode: rider.countryCode,
                            weight: rider.weight,
                            height: rider.height,
                            totalWins: rider.totalWins,
                            totalPodiums: rider.totalPodiums,
                            totalRaces: rider.totalRaces,
                            totalDnfs: rider.totalDnfs,
                            handicapFlat: rider.handicapFlat,
                            handicapRolling: rider.handicapRolling,
                            handicapHilly: rider.handicapHilly,
                            handicapMountainous: rider.handicapMountainous,
                            isActive: rider.isActive,
                            lastSynced: new Date(),
                        },
                        create: {
                            zwiftId: rider.zwiftId,
                            name: rider.name,
                            clubId: rider.clubId,
                            categoryRacing: rider.categoryRacing,
                            ftp: rider.ftp,
                            ftpWkg: rider.ftpWkg,
                            powerToWeight: rider.powerToWeight,
                            power5s: rider.power5s,
                            power15s: rider.power15s,
                            power30s: rider.power30s,
                            power1min: rider.power1min,
                            power2min: rider.power2min,
                            power5min: rider.power5min,
                            power20min: rider.power20min,
                            powerWkg5s: rider.powerWkg5s,
                            powerWkg15s: rider.powerWkg15s,
                            powerWkg30s: rider.powerWkg30s,
                            powerWkg1min: rider.powerWkg1min,
                            powerWkg2min: rider.powerWkg2min,
                            powerWkg5min: rider.powerWkg5min,
                            powerWkg20min: rider.powerWkg20min,
                            criticalPower: rider.criticalPower,
                            anaerobicWork: rider.anaerobicWork,
                            ranking: rider.ranking,
                            rankingScore: rider.rankingScore,
                            age: rider.age,
                            gender: rider.gender,
                            countryCode: rider.countryCode,
                            weight: rider.weight,
                            height: rider.height,
                            totalWins: rider.totalWins,
                            totalPodiums: rider.totalPodiums,
                            totalRaces: rider.totalRaces,
                            totalDnfs: rider.totalDnfs,
                            handicapFlat: rider.handicapFlat,
                            handicapRolling: rider.handicapRolling,
                            handicapHilly: rider.handicapHilly,
                            handicapMountainous: rider.handicapMountainous,
                            isActive: rider.isActive,
                            lastSynced: new Date(),
                        },
                    });
                    migrated++;
                }
                catch (error) {
                    logger.error(`❌ Fout bij migratie ${rider.name}:`, error);
                }
            }
            logger.debug(`Progress: ${migrated + skipped}/${riders.length} processed`);
        }
        logger.info(`✅ Migratie voltooid: ${migrated} naar club_members, ${skipped} overgeslagen`);
        // Stap 4: Verwijder race ratings en phenotypes (blijven gekoppeld aan rider ID's die verdwijnen)
        const deletedRatings = await prisma.riderRaceRating.deleteMany({});
        const deletedPhenotypes = await prisma.riderPhenotype.deleteMany({});
        logger.info(`🗑️  Verwijderd: ${deletedRatings.count} race ratings, ${deletedPhenotypes.count} phenotypes`);
        // Stap 5: Leeg riders tabel (voor favorieten)
        const deleted = await prisma.rider.deleteMany({});
        logger.info(`🗑️  Riders tabel geleegd: ${deleted.count} records verwijderd`);
        // Stap 6: Update club settings
        await prisma.club.updateMany({
            data: {
                syncEnabled: true,
                isFavorite: true, // TeamNL Cloud9 is je favorite club
            },
        });
        logger.info(`⚙️  Club settings updated: syncEnabled=true, isFavorite=true`);
        // Stap 7: Verifieer resultaat
        const clubMemberCount = await prisma.clubMember.count();
        const riderCountAfter = await prisma.rider.count();
        logger.info('\n📊 Migratie Resultaat:');
        logger.info(`   - ClubMembers: ${clubMemberCount} records (roster)`);
        logger.info(`   - Riders: ${riderCountAfter} records (favorieten)`);
        logger.info(`   - Status: Riders tabel klaar voor favorieten! 🎯`);
    }
    catch (error) {
        logger.error('❌ Migratie gefaald:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run migratie
migrateRidersToClubMembers()
    .then(() => {
    logger.info('✅ Migratie succesvol afgerond!');
    process.exit(0);
})
    .catch((error) => {
    logger.error('❌ Migratie mislukt:', error);
    process.exit(1);
});
//# sourceMappingURL=migrate-riders-to-clubmembers.js.map