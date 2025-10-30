#!/usr/bin/env tsx
/**
 * List Favorites CLI
 *
 * Toont alle favorite riders met hun metadata.
 *
 * Usage:
 *   npm run favorites:list
 */
import { RiderRepository } from '../src/database/repositories.js';
import { logger } from '../src/utils/logger.js';
async function main() {
    const riderRepo = new RiderRepository();
    try {
        const favorites = await riderRepo.getFavoriteRiders();
        if (favorites.length === 0) {
            logger.info('ℹ️  Geen favorite riders gevonden');
            return;
        }
        console.log('\n📋 Favorite Riders:\n');
        console.log('┌─────────────┬──────────────────────────────┬──────────┬──────────┬────────┐');
        console.log('│ Zwift ID    │ Naam                         │ Priority │ FTP      │ Ranking│');
        console.log('├─────────────┼──────────────────────────────┼──────────┼──────────┼────────┤');
        favorites.forEach(rider => {
            const zwiftId = rider.zwiftId.toString().padEnd(11);
            const name = (rider.name || 'Unknown').padEnd(28);
            const priority = (rider.syncPriority?.toString() || '-').padEnd(8);
            const ftp = (rider.ftp?.toString() || '-').padEnd(8);
            const ranking = (rider.ranking?.toString() || '-').padEnd(6);
            console.log(`│ ${zwiftId} │ ${name} │ ${priority} │ ${ftp} │ ${ranking}│`);
        });
        console.log('└─────────────┴──────────────────────────────┴──────────┴──────────┴────────┘');
        console.log(`\nTotaal: ${favorites.length} favorite riders\n`);
        // Toon statistieken
        const withRatings = favorites.filter(r => r.raceRating).length;
        const withPhenotypes = favorites.filter(r => r.phenotype).length;
        console.log('📊 Statistieken:');
        console.log(`   - Met race ratings: ${withRatings}/${favorites.length}`);
        console.log(`   - Met phenotypes: ${withPhenotypes}/${favorites.length}`);
        console.log(`   - Priority 1 (hoogste): ${favorites.filter(r => r.syncPriority === 1).length}`);
        console.log(`   - Priority 2: ${favorites.filter(r => r.syncPriority === 2).length}`);
        console.log(`   - Priority 3: ${favorites.filter(r => r.syncPriority === 3).length}`);
        console.log(`   - Priority 4 (laagste): ${favorites.filter(r => r.syncPriority === 4).length}\n`);
        process.exit(0);
    }
    catch (error) {
        logger.error('❌ Fout bij ophalen favorites', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=list-favorites.js.map