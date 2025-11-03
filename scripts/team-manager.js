#!/usr/bin/env node
/**
 * Interactive Team Management CLI
 *
 * Beheer je team: riders toevoegen, verwijderen, bekijken
 *
 * Usage:
 *   npm run team
 */
import readline from 'readline';
import { TeamService } from '../src/services/team.js';
const teamService = new TeamService();
// Readline interface voor interactieve input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}
function printHeader(text) {
    console.log('\n' + '='.repeat(60));
    console.log(`  ${text}`);
    console.log('='.repeat(60) + '\n');
}
function printMenu() {
    printHeader('TEAM MANAGEMENT');
    console.log('1. 📋 Bekijk alle teams');
    console.log('2. 👥 Bekijk team details');
    console.log('3. 📊 Bekijk team statistieken');
    console.log('4. ➕ Maak nieuw team');
    console.log('5. 👤 Voeg rider toe (single)');
    console.log('6. 📥 Bulk import riders (CSV/JSON)');
    console.log('7. ➖ Verwijder rider');
    console.log('8. 🔄 Trigger team sync');
    console.log('9. 🗑️  Verwijder team');
    console.log('0. 🚪 Exit');
    console.log('');
}
async function listTeams() {
    printHeader('ALLE TEAMS');
    const teams = await teamService.listTeams();
    if (teams.length === 0) {
        console.log('⚠️  Geen teams gevonden. Maak eerst een team aan (optie 4).\n');
        return;
    }
    teams.forEach((team, idx) => {
        console.log(`${idx + 1}. Team: ${team.name} (ID: ${team.id})`);
        console.log(`   Members: ${team.members.length}`);
        console.log(`   Auto-sync: ${team.autoSyncEnabled ? '✅' : '❌'}`);
        console.log('');
    });
}
async function viewTeamDetails() {
    const teamIdStr = await question('Team ID: ');
    const teamId = parseInt(teamIdStr);
    if (isNaN(teamId)) {
        console.log('❌ Ongeldige team ID\n');
        return;
    }
    printHeader(`TEAM ${teamId} DETAILS`);
    try {
        const team = await teamService.getTeam(teamId);
        console.log(`Naam: ${team.name}`);
        console.log(`Beschrijving: ${team.description || 'Geen'}`);
        console.log(`Actief: ${team.isActive ? 'Ja' : 'Nee'}`);
        console.log(`Auto-sync: ${team.autoSyncEnabled ? 'Ja' : 'Nee'}`);
        console.log(`Aangemaakt: ${team.createdAt}`);
        console.log('');
        if (team.members.length === 0) {
            console.log('⚠️  Geen members in dit team.\n');
        }
        else {
            console.log(`Members (${team.members.length}):\n`);
            team.members.forEach((member, idx) => {
                console.log(`${idx + 1}. ${member.rider.name} (${member.rider.zwiftId})`);
                console.log(`   Role: ${member.role}`);
                console.log(`   FTP: ${member.rider.ftp || 'N/A'}W | W/kg: ${member.rider.ftpWkg?.toFixed(2) || 'N/A'}`);
                console.log(`   Category: ${member.rider.categoryRacing || 'N/A'}`);
                console.log(`   Sync status: ${member.syncStatus}`);
                console.log(`   Toegevoegd: ${new Date(member.addedAt).toLocaleDateString('nl-NL')}`);
                console.log('');
            });
        }
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function viewTeamStats() {
    const teamIdStr = await question('Team ID: ');
    const teamId = parseInt(teamIdStr);
    if (isNaN(teamId)) {
        console.log('❌ Ongeldige team ID\n');
        return;
    }
    printHeader(`TEAM ${teamId} STATISTIEKEN`);
    try {
        const stats = await teamService.getTeamStatistics(teamId);
        console.log(`Team: ${stats.team.name}`);
        console.log('');
        console.log('📊 Statistieken:');
        console.log(`   Totaal members: ${stats.stats.totalMembers}`);
        console.log(`   Gemiddeld FTP: ${stats.stats.avgFtp ? stats.stats.avgFtp.toFixed(1) + 'W' : 'N/A'}`);
        console.log(`   Gemiddeld W/kg: ${stats.stats.avgWkg ? stats.stats.avgWkg.toFixed(2) : 'N/A'}`);
        console.log(`   Totaal races: ${stats.stats.totalRaces}`);
        console.log(`   Totaal wins: ${stats.stats.totalWins}`);
        console.log('');
        console.log('🔄 Sync status:');
        console.log(`   ✅ Synced: ${stats.syncStatus.synced}`);
        console.log(`   ⏳ Pending: ${stats.syncStatus.pending}`);
        console.log(`   ❌ Errors: ${stats.syncStatus.error}`);
        console.log('');
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function createTeam() {
    printHeader('NIEUW TEAM AANMAKEN');
    const name = await question('Team naam: ');
    if (!name.trim()) {
        console.log('❌ Naam is verplicht\n');
        return;
    }
    const description = await question('Beschrijving (optioneel): ');
    const autoSyncStr = await question('Auto-sync inschakelen? (j/n, default: j): ');
    const autoSync = autoSyncStr.toLowerCase() !== 'n';
    try {
        const team = await teamService.createTeam({
            name: name.trim(),
            description: description.trim() || undefined,
            autoSyncEnabled: autoSync,
        });
        console.log(`\n✅ Team aangemaakt!`);
        console.log(`   ID: ${team.id}`);
        console.log(`   Naam: ${team.name}`);
        console.log(`   Auto-sync: ${team.autoSyncEnabled ? 'Ja' : 'Nee'}\n`);
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function addRider() {
    printHeader('RIDER TOEVOEGEN');
    const teamIdStr = await question('Team ID: ');
    const teamId = parseInt(teamIdStr);
    if (isNaN(teamId)) {
        console.log('❌ Ongeldige team ID\n');
        return;
    }
    const zwiftIdStr = await question('Zwift ID: ');
    const zwiftId = parseInt(zwiftIdStr);
    if (isNaN(zwiftId)) {
        console.log('❌ Ongeldige Zwift ID\n');
        return;
    }
    const role = await question('Role (captain/member/reserve, default: member): ');
    const notes = await question('Notities (optioneel): ');
    console.log('\n⏳ Rider toevoegen en data ophalen...\n');
    try {
        await teamService.addMember(teamId, zwiftId, role.trim() || 'member', notes.trim() || undefined);
        console.log(`\n✅ Rider ${zwiftId} toegevoegd aan team ${teamId}!`);
        console.log(`   Background sync is gestart voor 90-dagen race history.\n`);
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function bulkImport() {
    printHeader('BULK IMPORT');
    const teamIdStr = await question('Team ID: ');
    const teamId = parseInt(teamIdStr);
    if (isNaN(teamId)) {
        console.log('❌ Ongeldige team ID\n');
        return;
    }
    const filePath = await question('Pad naar CSV/JSON bestand: ');
    if (!filePath.trim()) {
        console.log('❌ Bestand pad is verplicht\n');
        return;
    }
    console.log('\n💡 Tip: Gebruik het import script voor betere controle:');
    console.log(`   npm run import -- --team ${teamId} --csv ${filePath} --dry-run\n`);
    console.log(`   npm run import -- --team ${teamId} --csv ${filePath}\n`);
}
async function removeRider() {
    printHeader('RIDER VERWIJDEREN');
    const teamIdStr = await question('Team ID: ');
    const teamId = parseInt(teamIdStr);
    if (isNaN(teamId)) {
        console.log('❌ Ongeldige team ID\n');
        return;
    }
    const zwiftIdStr = await question('Zwift ID van rider om te verwijderen: ');
    const zwiftId = parseInt(zwiftIdStr);
    if (isNaN(zwiftId)) {
        console.log('❌ Ongeldige Zwift ID\n');
        return;
    }
    const confirm = await question(`⚠️  Weet je zeker dat je rider ${zwiftId} wilt verwijderen? (j/n): `);
    if (confirm.toLowerCase() !== 'j') {
        console.log('❌ Geannuleerd\n');
        return;
    }
    try {
        await teamService.removeMember(teamId, zwiftId);
        console.log(`\n✅ Rider ${zwiftId} verwijderd uit team ${teamId}\n`);
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function triggerSync() {
    printHeader('TEAM SYNC');
    const teamIdStr = await question('Team ID: ');
    const teamId = parseInt(teamIdStr);
    if (isNaN(teamId)) {
        console.log('❌ Ongeldige team ID\n');
        return;
    }
    console.log('\n⏳ Sync starten voor pending members...\n');
    try {
        const results = await teamService.syncTeamMembers(teamId);
        console.log(`\n✅ Sync voltooid!`);
        console.log(`   Synced: ${results.synced}`);
        console.log(`   Failed: ${results.failed}`);
        console.log(`   Total: ${results.total}\n`);
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function deleteTeam() {
    printHeader('TEAM VERWIJDEREN');
    const teamIdStr = await question('Team ID: ');
    const teamId = parseInt(teamIdStr);
    if (isNaN(teamId)) {
        console.log('❌ Ongeldige team ID\n');
        return;
    }
    const confirm = await question(`⚠️  Weet je zeker dat je team ${teamId} wilt verwijderen? (j/n): `);
    if (confirm.toLowerCase() !== 'j') {
        console.log('❌ Geannuleerd\n');
        return;
    }
    try {
        await teamService.deleteTeam(teamId);
        console.log(`\n✅ Team ${teamId} verwijderd\n`);
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function main() {
    console.log('\n🏁 TeamNL Cloud9 - Team Management Tool\n');
    let running = true;
    while (running) {
        printMenu();
        const choice = await question('Kies een optie: ');
        switch (choice) {
            case '1':
                await listTeams();
                break;
            case '2':
                await viewTeamDetails();
                break;
            case '3':
                await viewTeamStats();
                break;
            case '4':
                await createTeam();
                break;
            case '5':
                await addRider();
                break;
            case '6':
                await bulkImport();
                break;
            case '7':
                await removeRider();
                break;
            case '8':
                await triggerSync();
                break;
            case '9':
                await deleteTeam();
                break;
            case '0':
                running = false;
                console.log('\n👋 Tot ziens!\n');
                break;
            default:
                console.log('❌ Ongeldige keuze\n');
        }
    }
    rl.close();
}
// Run main
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=team-manager.js.map