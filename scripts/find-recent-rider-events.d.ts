#!/usr/bin/env tsx
/**
 * Find Recent Rider Events - Slimme event discovery voor specifieke rider
 *
 * Scant recente event IDs (afgelopen 90 dagen) om events te vinden waar een rider heeft gereden.
 * Gebruikt slimme heuristieken om het zoekbereik te beperken.
 *
 * Usage:
 *   npx tsx scripts/find-recent-rider-events.ts <zwiftId> [maxEvents]
 *
 * Example:
 *   npx tsx scripts/find-recent-rider-events.ts 150437 200
 *   # Scant maximaal 200 recente events voor rider 150437
 *
 * Strategie:
 * 1. Start bij hoogste bekende event ID
 * 2. Scan terug in tijd (dekrementeel)
 * 3. Stop na X events zonder match (assume rider niet meer actief in periode)
 * 4. Output: lijst van event IDs met rider participation
 */
export {};
//# sourceMappingURL=find-recent-rider-events.d.ts.map