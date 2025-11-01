/**
 * Forward Event Tracking Script (Workflow Step 5)
 *
 * Scant incrementeel nieuwe events en bewaart alleen relevante resultaten
 * (van tracked riders: favorites + club members)
 *
 * Usage:
 *   npm run sync:forward
 *   npm run sync:forward -- --maxEvents=10
 *   npm run sync:forward -- --startEventId=5129365 --maxEvents=100
 */
import { EventService } from '../src/services/event.js';
import { logger } from '../src/utils/logger.js';
// Parse command line arguments
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--maxEvents' && args[i + 1]) {
        options.maxEvents = parseInt(args[i + 1]);
        i++;
    }
    else if (args[i] === '--startEventId' && args[i + 1]) {
        options.startEventId = parseInt(args[i + 1]);
        i++;
    }
    else if (args[i] === '--retentionDays' && args[i + 1]) {
        options.retentionDays = parseInt(args[i + 1]);
        i++;
    }
}
// Defaults
if (!options.maxEvents)
    options.maxEvents = 1000;
if (!options.retentionDays)
    options.retentionDays = 100;
logger.info('Starting forward tracking...', options);
const eventService = new EventService();
try {
    const result = await eventService.forwardScan(options);
    logger.info('Forward tracking completed successfully', result);
    console.log('\n=== Forward Scan Results ===');
    console.log(`Scanned:    ${result.scanned} events`);
    console.log(`Found:      ${result.found} events with tracked riders`);
    console.log(`Saved:      ${result.saved} events`);
    console.log(`Archived:   ${result.archived} old events`);
    console.log(`Duration:   ${(result.duration / 1000 / 60).toFixed(1)} minutes`);
    console.log(`Last ID:    ${result.lastEventId}`);
    console.log('===========================\n');
    process.exit(0);
}
catch (error) {
    logger.error('Forward tracking failed', error);
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
}
//# sourceMappingURL=forward-tracking.js.map