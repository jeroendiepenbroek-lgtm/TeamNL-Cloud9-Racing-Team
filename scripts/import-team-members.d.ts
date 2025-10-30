#!/usr/bin/env node
/**
 * Team Members Bulk Import CLI
 *
 * Import riders from CSV, JSON, or command-line into a team
 * With progress tracking, rate limiting, and error recovery
 *
 * Usage:
 *   # From command line (space or comma separated)
 *   npm run import -- --team 1 --ids "150437 123456 789012"
 *
 *   # From CSV file
 *   npm run import -- --team 1 --csv riders.csv
 *
 *   # From JSON file
 *   npm run import -- --team 1 --json riders.json
 *
 * CSV Format:
 *   zwiftId,role,notes
 *   150437,captain,Team leader
 *   123456,member,Strong climber
 *
 * JSON Format:
 *   [
 *     { "zwiftId": 150437, "role": "captain", "notes": "Team leader" },
 *     { "zwiftId": 123456, "role": "member", "notes": "Strong climber" }
 *   ]
 */
export {};
//# sourceMappingURL=import-team-members.d.ts.map