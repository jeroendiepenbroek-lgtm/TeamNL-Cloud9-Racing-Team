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
import { readFileSync, existsSync } from 'fs';
import { TeamService } from '../src/services/team.js';
import { logger } from '../src/utils/logger.js';
/**
 * Parse CSV file with riders
 */
function parseCSV(filePath) {
    logger.info(`📄 Reading CSV file: ${filePath}`);
    if (!existsSync(filePath)) {
        throw new Error(`CSV bestand niet gevonden: ${filePath}`);
    }
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
        throw new Error('CSV bestand is leeg');
    }
    // Parse header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const zwiftIdIndex = header.indexOf('zwiftid');
    const roleIndex = header.indexOf('role');
    const notesIndex = header.indexOf('notes');
    if (zwiftIdIndex === -1) {
        throw new Error('CSV moet een "zwiftId" kolom bevatten');
    }
    // Parse rows
    const riders = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const zwiftId = parseInt(cols[zwiftIdIndex]);
        if (isNaN(zwiftId)) {
            logger.warn(`⚠️  Overgeslagen regel ${i + 1}: ongeldige zwiftId`);
            continue;
        }
        riders.push({
            zwiftId,
            role: roleIndex !== -1 ? cols[roleIndex] : undefined,
            notes: notesIndex !== -1 ? cols[notesIndex] : undefined,
        });
    }
    logger.info(`✓ ${riders.length} riders gevonden in CSV`);
    return riders;
}
/**
 * Parse JSON file with riders
 */
function parseJSON(filePath) {
    logger.info(`📄 Reading JSON file: ${filePath}`);
    if (!existsSync(filePath)) {
        throw new Error(`JSON bestand niet gevonden: ${filePath}`);
    }
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
        throw new Error('JSON moet een array zijn');
    }
    const riders = [];
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (typeof item.zwiftId !== 'number') {
            logger.warn(`⚠️  Overgeslagen item ${i + 1}: ongeldige zwiftId`);
            continue;
        }
        riders.push({
            zwiftId: item.zwiftId,
            role: item.role,
            notes: item.notes,
        });
    }
    logger.info(`✓ ${riders.length} riders gevonden in JSON`);
    return riders;
}
/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const next = args[i + 1];
        switch (arg) {
            case '--team':
            case '-t':
                options.teamId = parseInt(next);
                i++;
                break;
            case '--ids':
            case '-i':
                // Parse space or comma separated IDs
                const idsStr = next.replace(/,/g, ' ');
                options.zwiftIds = idsStr.split(/\s+/)
                    .filter(s => s)
                    .map(s => parseInt(s))
                    .filter(n => !isNaN(n));
                i++;
                break;
            case '--csv':
                options.csvFile = next;
                i++;
                break;
            case '--json':
                options.jsonFile = next;
                i++;
                break;
            case '--role':
            case '-r':
                options.role = next;
                i++;
                break;
            case '--batch-size':
            case '-b':
                options.batchSize = parseInt(next);
                i++;
                break;
            case '--dry-run':
            case '-d':
                options.dryRun = true;
                break;
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
        }
    }
    // Validate
    if (!options.teamId || isNaN(options.teamId)) {
        throw new Error('Team ID is verplicht (gebruik --team <id>)');
    }
    if (!options.zwiftIds && !options.csvFile && !options.jsonFile) {
        throw new Error('Geen riders opgegeven (gebruik --ids, --csv of --json)');
    }
    return options;
}
/**
 * Print help message
 */
function printHelp() {
    console.log(`
Team Members Bulk Import CLI

Usage:
  npm run import -- [options]

Options:
  --team, -t <id>           Team ID (verplicht)
  --ids, -i <ids>           Zwift IDs (spatie of komma gescheiden)
  --csv <file>              CSV bestand met riders
  --json <file>             JSON bestand met riders
  --role, -r <role>         Standaard role voor alle riders
  --batch-size, -b <size>   Batch grootte (default: 5)
  --dry-run, -d             Simuleer import zonder database wijzigingen
  --help, -h                Toon deze help

Voorbeelden:
  # Import enkele riders via command line
  npm run import -- --team 1 --ids "150437 123456 789012"

  # Import van CSV bestand
  npm run import -- --team 1 --csv riders.csv

  # Import van JSON bestand met captain role
  npm run import -- --team 1 --json riders.json --role captain

  # Dry-run om te testen
  npm run import -- --team 1 --csv riders.csv --dry-run

CSV Formaat:
  zwiftId,role,notes
  150437,captain,Team leader
  123456,member,Strong climber

JSON Formaat:
  [
    { "zwiftId": 150437, "role": "captain", "notes": "Team leader" },
    { "zwiftId": 123456, "role": "member", "notes": "Strong climber" }
  ]
`);
}
/**
 * Main import function
 */
async function main() {
    logger.info('🚀 Team Members Bulk Import\n');
    try {
        // Parse arguments
        const options = parseArgs();
        logger.info('📋 Import configuratie:');
        logger.info(`   Team ID: ${options.teamId}`);
        logger.info(`   Batch size: ${options.batchSize || 5}`);
        logger.info(`   Dry-run: ${options.dryRun ? 'Ja' : 'Nee'}`);
        if (options.role) {
            logger.info(`   Standaard role: ${options.role}`);
        }
        // Load riders
        let riders = [];
        if (options.csvFile) {
            riders = parseCSV(options.csvFile);
        }
        else if (options.jsonFile) {
            riders = parseJSON(options.jsonFile);
        }
        else if (options.zwiftIds) {
            riders = options.zwiftIds.map(id => ({
                zwiftId: id,
                role: options.role,
            }));
            logger.info(`✓ ${riders.length} riders van command line`);
        }
        if (riders.length === 0) {
            logger.warn('⚠️  Geen riders om te importeren');
            process.exit(0);
        }
        logger.info(`\n📊 Import overzicht:`);
        logger.info(`   Totaal riders: ${riders.length}`);
        // Count by role
        const roleCount = {};
        riders.forEach(r => {
            const role = r.role || 'member';
            roleCount[role] = (roleCount[role] || 0) + 1;
        });
        Object.entries(roleCount).forEach(([role, count]) => {
            logger.info(`   - ${role}: ${count}`);
        });
        // Dry-run mode
        if (options.dryRun) {
            logger.info('\n🧪 DRY-RUN MODE - Geen database wijzigingen\n');
            logger.info('Riders die zouden worden toegevoegd:');
            riders.forEach((r, idx) => {
                logger.info(`   ${idx + 1}. ${r.zwiftId} (${r.role || 'member'})${r.notes ? ` - ${r.notes}` : ''}`);
            });
            logger.info('\n✓ Dry-run voltooid');
            process.exit(0);
        }
        // Confirm import
        logger.info('\n⚠️  Start import in 3 seconden... (Ctrl+C om te annuleren)');
        await sleep(3000);
        // Initialize service
        const teamService = new TeamService();
        // Verify team exists
        logger.info(`\n🔍 Verificatie team ${options.teamId}...`);
        const team = await teamService.getTeam(options.teamId);
        logger.info(`✓ Team gevonden: ${team.name}`);
        logger.info(`   Huidige members: ${team.members.length}`);
        // Import riders
        logger.info(`\n📥 Start import...`);
        const results = {
            added: [],
            skipped: [],
            failed: [],
        };
        const batchSize = options.batchSize || 5;
        let processed = 0;
        for (let i = 0; i < riders.length; i += batchSize) {
            const batch = riders.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(riders.length / batchSize);
            logger.info(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} riders)`);
            for (const rider of batch) {
                processed++;
                const progress = Math.round((processed / riders.length) * 100);
                try {
                    logger.info(`[${progress}%] Adding rider ${rider.zwiftId}...`);
                    await teamService.addMember(options.teamId, rider.zwiftId, rider.role || options.role || 'member', rider.notes);
                    results.added.push(rider.zwiftId);
                    logger.info(`✓ Toegevoegd: ${rider.zwiftId}`);
                    // Small delay between riders
                    await sleep(2000);
                }
                catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    if (errorMsg.includes('already a member')) {
                        results.skipped.push(rider.zwiftId);
                        logger.info(`⏭️  Overgeslagen: ${rider.zwiftId} (al lid)`);
                    }
                    else {
                        results.failed.push({ zwiftId: rider.zwiftId, error: errorMsg });
                        logger.error(`❌ Gefaald: ${rider.zwiftId} - ${errorMsg}`);
                    }
                }
            }
            // Delay between batches
            if (i + batchSize < riders.length) {
                logger.info(`⏸️  Wachten 15s voor volgende batch...`);
                await sleep(15000);
            }
        }
        // Summary
        logger.info(`\n${'='.repeat(60)}`);
        logger.info('📊 IMPORT SAMENVATTING');
        logger.info('='.repeat(60));
        logger.info(`Totaal verwerkt:  ${processed}`);
        logger.info(`✅ Toegevoegd:     ${results.added.length}`);
        logger.info(`⏭️  Overgeslagen:   ${results.skipped.length}`);
        logger.info(`❌ Gefaald:        ${results.failed.length}`);
        logger.info('='.repeat(60));
        if (results.failed.length > 0) {
            logger.info('\n⚠️  Gefaalde imports:');
            results.failed.forEach(f => {
                logger.info(`   - ${f.zwiftId}: ${f.error}`);
            });
        }
        if (results.added.length > 0) {
            logger.info(`\n✅ ${results.added.length} riders succesvol toegevoegd aan team!`);
            logger.info('\n💡 Volgende stappen:');
            logger.info(`   - Check team status: curl http://localhost:3000/api/team/${options.teamId}/stats`);
            logger.info(`   - Trigger sync: curl -X POST http://localhost:3000/api/team/${options.teamId}/sync`);
        }
        process.exit(results.failed.length > 0 ? 1 : 0);
    }
    catch (error) {
        logger.error('\n❌ Import gefaald:', error);
        if (error instanceof Error && error.message.includes('verplicht')) {
            logger.info('\n💡 Gebruik --help voor meer informatie');
        }
        process.exit(1);
    }
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
//# sourceMappingURL=import-team-members.js.map