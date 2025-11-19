/**
 * Event Cleanup Service
 *
 * Regels:
 * 1. Bewaar ALLEEN events uit het verleden waar teamleden aan meededen
 * 2. Bewaar voor max 100 dagen
 * 3. Delete de rest (performance + storage optimalisatie)
 */
export declare class EventCleanupService {
    /**
     * Clean oude events volgens regels:
     * - DELETE events ouder dan 100 dagen
     * - DELETE toekomstige events ouder dan 48h die geen team signups hebben
     * - KEEP events waar teamleden aan meededen (max 100 dagen)
     */
    cleanupOldEvents(): Promise<{
        deleted_old: number;
        deleted_no_team: number;
        kept_with_team: number;
    }>;
    /**
     * Clean future events zonder team signups (ouder dan 48h)
     * Deze zijn niet meer relevant en nemen ruimte in
     */
    cleanupStaleUpcomingEvents(): Promise<number>;
    /**
     * Full cleanup: past events + stale future events
     */
    runFullCleanup(): Promise<{
        deleted_past: number;
        deleted_future_stale: number;
        kept_with_team: number;
    }>;
}
export declare const eventCleanupService: EventCleanupService;
//# sourceMappingURL=event-cleanup.service.d.ts.map