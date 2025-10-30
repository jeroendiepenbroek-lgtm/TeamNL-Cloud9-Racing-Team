/**
 * Event Range Scanner voor Rider 150437
 *
 * Scant event range 5067681 - 5129365 (61684 events) om alle races
 * van rider 150437 te vinden en op te slaan in database.
 *
 * Strategie:
 * - Start bij laatste event en werk terug
 * - Rate limit: 1 req/min = ~43 dagen voor volledige scan
 * - Resume support: start waar vorige scan stopte
 * - Save progress elke 100 events
 *
 * Run: npm run scan-rider-events -- --rider 150437 --start 5129365 --end 5067681
 */
declare function scanEventRange(): Promise<void>;
export { scanEventRange };
//# sourceMappingURL=scan-rider-events.d.ts.map