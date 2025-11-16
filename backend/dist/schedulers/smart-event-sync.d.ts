/**
 * Smart Event Sync Scheduler
 * US3: Events >1h syncen elk uur
 * US4: Events <=1h syncen elke 10 min
 * Configureerbaar via syncConfigService
 */
export declare class SmartEventSync {
    private intervalId;
    private lastSyncTimes;
    start(): void;
    stop(): void;
    restart(): void;
    private syncEvents;
    private syncEventSignups;
}
export declare const smartEventSync: SmartEventSync;
//# sourceMappingURL=smart-event-sync.d.ts.map