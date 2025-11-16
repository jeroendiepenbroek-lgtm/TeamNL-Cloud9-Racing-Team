/**
 * Sync Service - Synchroniseert data van ZwiftRacing API naar Supabase
 */
import { DbClub, DbRider, DbEvent, DbResult } from '../types/index.js';
export declare class SyncService {
    /**
     * Sync signups voor een specifiek event
     * Haalt alle signups (per pen) op en slaat ze op in zwift_api_event_signups
     */
    syncEventSignups(eventId: string): Promise<{
        total: number;
        byPen: Record<string, number>;
    }>;
    /**
     * 1. Sync club informatie
     */
    syncClub(clubId?: number): Promise<DbClub>;
    /**
     * 2. Sync club riders (using bulk POST to avoid rate limits)
     * Step 1: GET club members (returns rider IDs) - 1/60min limit
     * Step 2: POST bulk rider data (max 1000 riders) - 1/15min limit
     */
    syncRiders(clubId?: number): Promise<DbRider[]>;
    /**
     * 3. Sync club events
     * @deprecated Club events endpoint doesn't exist. Use bulkImportUpcomingEvents() instead.
     */
    syncEvents(clubId?: number): Promise<DbEvent[]>;
    /**
     * 4. Sync event results
     */
    syncEventResults(eventId: number): Promise<DbResult[]>;
    /**
     * 5. Sync rider history
     */
    syncRiderHistory(riderId: number): Promise<void>;
    /**
     * Full sync: club + riders + events
     */
    syncAll(clubId?: number): Promise<void>;
    /**
     * Feature 1: Sync upcoming events for all riders in database
     * Scans each rider for their upcoming events and stores signups
     */
    syncRiderUpcomingEvents(hours?: number): Promise<{
        riders_scanned: number;
        events_found: number;
        signups_created: number;
        errors: number;
    }>;
    /**
     * FEATURE 1: Bulk import upcoming events (48h window)
     * US1: Upcoming events in de komende 48 uur ophalen
     * US2: Event highlighten waar één van onze rijders aan deelneemt
     * US3: Aantal van onze deelnemende riders toevoegen
     *
     * 1:1 API Mapping: Stores RAW API response in zwift_api_events table
     * Source: /api/events/upcoming (filtered for 48h window)
     */
    bulkImportUpcomingEvents(): Promise<{
        events_imported: number;
        signups_matched: number;
        team_events: number;
        errors: number;
    }>;
}
export declare const syncService: SyncService;
//# sourceMappingURL=sync.service.d.ts.map