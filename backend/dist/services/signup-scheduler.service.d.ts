/**
 * Signup Scheduler Service
 *
 * US6: Events 1-48h: refresh signups elk uur
 * US7: Events <=1h: refresh signups elke 10 minuten
 *
 * Intelligent scheduling voor signup updates gebaseerd op event timing
 */
export declare class SignupSchedulerService {
    private hourlyJob;
    private tenMinuteJob;
    private isRunning;
    constructor();
    /**
     * Start de scheduler met twee jobs:
     * - Elk uur: sync signups voor events 1-48h
     * - Elke 10 min: sync signups voor events <=1h
     */
    start(): void;
    /**
     * Stop de scheduler
     */
    stop(): void;
    /**
     * US7: Sync signups voor events die binnen 1 uur starten
     */
    private syncUrgentSignups;
    /**
     * US6: Sync signups voor events tussen 1h en 48h
     */
    private syncNonUrgentSignups;
    /**
     * Run initial sync bij opstarten
     */
    private runInitialSync;
    /**
     * Manual trigger voor testing
     */
    manualSyncUrgent(): Promise<void>;
    manualSyncHourly(): Promise<void>;
}
export declare const signupScheduler: SignupSchedulerService;
//# sourceMappingURL=signup-scheduler.service.d.ts.map