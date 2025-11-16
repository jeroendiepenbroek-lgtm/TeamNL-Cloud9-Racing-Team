/**
 * US7: Automatische Sync Service
 * US8: Configureerbare intervals
 *
 * Synct periodiek alle team members van ZwiftRacing API
 */
export declare class AutoSyncService {
    private isRunning;
    private lastSyncTime;
    /**
     * Sync alle team members met ZwiftRacing API (bulk POST)
     */
    syncTeamMembers(): Promise<{
        success: number;
        errors: number;
        skipped: number;
        errorMessages?: string[];
    }>;
    /**
     * Start periodieke sync volgens configuratie
     */
    start(): void;
    /**
     * Get sync status
     */
    getStatus(): {
        enabled: boolean;
        intervalHours: number;
        lastSync: Date | null;
        isRunning: boolean;
    };
}
export declare const autoSyncService: AutoSyncService;
//# sourceMappingURL=auto-sync.service.d.ts.map