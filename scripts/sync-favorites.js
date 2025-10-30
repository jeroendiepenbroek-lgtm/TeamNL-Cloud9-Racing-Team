#!/usr/bin/env tsx
/**
 * Sync Favorites CLI
 *
 * Synchroniseert alle favorite riders met volledige data van de API.
 * Inclusief race ratings, phenotypes, power curves, en handicaps.
 *
 * Usage:
 *   npm run sync:favorites
 *
 * Rate Limiting:
 *   - 5 calls/min voor individual riders (12s delay tussen calls)
 *   - Automatische error handling en progress logging
 */
import { SyncService } from '../src/services/sync.js';
import { logger } from '../src/utils/logger.js';
async function main() {
    logger.info('🚀 Start favorites sync...');
    const syncService = new SyncService();
    try {
        await syncService.syncFavoriteRiders();
        logger.info('✅ Favorites sync voltooid');
        process.exit(0);
    }
    catch (error) {
        logger.error('❌ Favorites sync gefaald', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=sync-favorites.js.map