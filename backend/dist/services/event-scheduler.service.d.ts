/**
 * Smart Event Scheduler Service
 *
 * US4: Events >1 uur van nu: update elk uur
 * US5: Events <=1 uur van nu: update elke 10 minuten
 *
 * Intelligent scheduling voor event updates gebaseerd op afstand tot evenement
 */
export declare class EventSchedulerService {
    private hourlyJob;
    private tenMinuteJob;
    private isRunning;
    constructor();
    /**
     * Start de scheduler met twee jobs:
     * - Elk uur: volledige event sync (48h window)
     * - Elke 10 min: update events die binnen 1 uur starten
     */
    start(): void;
    /**
     * Stop de scheduler
     */
    stop(): void;
    /**
     * Update alleen events die binnen 1 uur starten
     * US5: Hogere frequency voor imminent events
     */
    private updateUrgentEvents;
    /**
     * Run initial sync bij opstarten
     */
    private runInitialSync;
    /**
     * Status check
     */
    getStatus(): {
        running: boolean;
        hourlyActive: boolean;
        urgentActive: boolean;
    };
    /**
     * Handmatige trigger voor testing
     */
    triggerHourlySync(): Promise<void>;
    triggerUrgentSync(): Promise<void>;
}
export declare const eventScheduler: EventSchedulerService;
//# sourceMappingURL=event-scheduler.service.d.ts.map