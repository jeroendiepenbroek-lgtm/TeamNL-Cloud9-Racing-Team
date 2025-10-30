#!/usr/bin/env tsx
/**
 * Remove Favorites CLI
 *
 * Verwijdert riders uit de favorites lijst.
 * Let op: Dit verwijdert de rider VOLLEDIG uit de database.
 * Voor het behouden van data maar niet syncen, gebruik: isFavorite = false
 *
 * Usage:
 *   npm run favorites:remove <zwift-id-1> [zwift-id-2] [...]
 *   npm run favorites:remove --soft <zwift-id> (set isFavorite=false)
 *
 * Examples:
 *   npm run favorites:remove 123456
 *   npm run favorites:remove 123456 789012 345678
 *   npm run favorites:remove --soft 123456
 */
import prisma from '../src/database/client.js';
import { logger } from '../src/utils/logger.js';
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('\n❌ Geen Zwift ID opgegeven');
        console.log('\nUsage:');
        console.log('  npm run favorites:remove <zwift-id-1> [zwift-id-2] [...]');
        console.log('  npm run favorites:remove --soft <zwift-id> (behoud data, stop met syncen)');
        console.log('\nExamples:');
        console.log('  npm run favorites:remove 123456');
        console.log('  npm run favorites:remove 123456 789012');
        console.log('  npm run favorites:remove --soft 123456\n');
        process.exit(1);
    }
    const softDelete = args[0] === '--soft';
    const zwiftIds = softDelete ? args.slice(1) : args;
    if (zwiftIds.length === 0) {
        console.error('❌ Geen Zwift ID opgegeven na --soft flag\n');
        process.exit(1);
    }
    const ids = zwiftIds.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (ids.length === 0) {
        console.error('❌ Ongeldige Zwift IDs opgegeven\n');
        process.exit(1);
    }
    try {
        logger.info(`🗑️  ${softDelete ? 'Soft delete' : 'Verwijderen'} van ${ids.length} favorite rider(s)...`);
        if (softDelete) {
            // Soft delete: set isFavorite = false (behoud data)
            const result = await prisma.rider.updateMany({
                where: { zwiftId: { in: ids } },
                data: { isFavorite: false },
            });
            console.log(`✅ ${result.count} rider(s) gemarkeerd als niet-favorite (data behouden)`);
        }
        else {
            // Hard delete: verwijder rider en gerelateerde data
            const result = await prisma.rider.deleteMany({
                where: { zwiftId: { in: ids } },
            });
            console.log(`✅ ${result.count} rider(s) verwijderd uit database`);
        }
        process.exit(0);
    }
    catch (error) {
        logger.error('❌ Fout bij verwijderen favorites', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=remove-favorites.js.map