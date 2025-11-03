#!/usr/bin/env node
/**
 * Simple Rider Management CLI
 *
 * Beheer riders: toevoegen, verwijderen, bekijken
 * ClubID wordt automatisch opgehaald uit ZwiftRacing API
 *
 * Usage:
 *   npm run riders
 */
import readline from 'readline';
import { prisma } from '../src/database/client.js';
import axios from 'axios';
// Direct Axios client voor rider profiles (zonder rate limiting voor nu)
const directClient = axios.create({
    baseURL: 'https://zwift-ranking.herokuapp.com/api',
    timeout: 10000,
});
// Readline interface
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
    printHeader('RIDER MANAGEMENT');
    console.log('1. 👥 Bekijk alle riders in database');
    console.log('2. 🔍 Zoek rider (Zwift ID)');
    console.log('3. ➕ Voeg rider toe (Zwift ID)');
    console.log('4. ➖ Verwijder rider');
    console.log('5. 🔄 Update rider data');
    console.log('6. 📊 Database statistieken');
    console.log('0. 🚪 Exit');
    console.log('');
}
async function listAllRiders() {
    printHeader('ALLE RIDERS IN DATABASE');
    try {
        const riders = await prisma.rider.findMany({
            orderBy: { name: 'asc' }
        });
        if (riders.length === 0) {
            console.log('⚠️  Geen riders in database. Voeg riders toe met optie 3.\n');
            return;
        }
        console.log(`Totaal: ${riders.length} riders\n`);
        // Groepeer per club
        const byClub = riders.reduce((acc, rider) => {
            const clubId = rider.clubId?.toString() || 'Geen club';
            if (!acc[clubId])
                acc[clubId] = [];
            acc[clubId].push(rider);
            return acc;
        }, {});
        Object.entries(byClub).forEach(([clubId, clubRiders]) => {
            console.log(`📁 Club ${clubId} (${clubRiders.length} riders):`);
            clubRiders.forEach((rider, idx) => {
                const stats = rider.statistics;
                console.log(`   ${idx + 1}. ${rider.name} (${rider.zwiftId})`);
                console.log(`      FTP: ${rider.ftp || 'N/A'}W | W/kg: ${rider.ftpWkg?.toFixed(2) || 'N/A'}`);
                console.log(`      Categorie: ${rider.categoryRacing || 'N/A'}`);
                console.log(`      Races: ${stats?.racesCount || 0} | Wins: ${stats?.winsCount || 0}`);
            });
            console.log('');
        });
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function searchRider() {
    const zwiftIdStr = await question('Zwift ID: ');
    const zwiftId = parseInt(zwiftIdStr);
    if (isNaN(zwiftId)) {
        console.log('❌ Ongeldige Zwift ID\n');
        return;
    }
    printHeader(`RIDER ${zwiftId}`);
    try {
        const rider = await prisma.rider.findUnique({
            where: { zwiftId },
            include: {
                club: true,
            }
        });
        if (!rider) {
            console.log('⚠️  Rider niet gevonden in database.\n');
            const add = await question('Wil je deze rider toevoegen? (j/n): ');
            if (add.toLowerCase() === 'j') {
                await addRider(zwiftId);
            }
            return;
        }
        const stats = rider.statistics;
        console.log(`Naam: ${rider.name}`);
        console.log(`Zwift ID: ${rider.zwiftId}`);
        console.log(`Club: ${rider.club?.name || rider.clubId || 'N/A'}`);
        console.log('');
        console.log('📊 Stats:');
        console.log(`   FTP: ${rider.ftp || 'N/A'}W`);
        console.log(`   W/kg: ${rider.ftpWkg?.toFixed(2) || 'N/A'}`);
        console.log(`   Categorie: ${rider.categoryRacing || 'N/A'}`);
        console.log(`   Ranking: ${rider.ranking || 'N/A'}`);
        console.log('');
        console.log('🏁 Race Stats:');
        console.log(`   Totaal races: ${stats?.racesCount || 0}`);
        console.log(`   Totaal wins: ${stats?.winsCount || 0}`);
        console.log(`   Beste positie: ${stats?.bestPosition || 'N/A'}`);
        console.log('');
        console.log(`Toegevoegd: ${new Date(rider.createdAt).toLocaleString('nl-NL')}\n`);
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function addRider(providedZwiftId) {
    let zwiftId = providedZwiftId;
    if (!zwiftId) {
        printHeader('RIDER TOEVOEGEN');
        const zwiftIdStr = await question('Zwift ID: ');
        zwiftId = parseInt(zwiftIdStr);
        if (isNaN(zwiftId)) {
            console.log('❌ Ongeldige Zwift ID\n');
            return;
        }
    }
    console.log('\n⏳ Rider data ophalen van ZwiftRacing API...\n');
    try {
        // Check of rider al bestaat
        const existing = await prisma.rider.findUnique({
            where: { zwiftId }
        });
        if (existing) {
            console.log(`⚠️  Rider ${zwiftId} bestaat al in database.\n`);
            const update = await question('Wil je de data updaten? (j/n): ');
            if (update.toLowerCase() === 'j') {
                await updateRider(zwiftId);
            }
            return;
        }
        // Haal data op van API
        const response = await directClient.get(`/public/riders/${zwiftId}`);
        const data = response.data;
        // Sla op in database met clubId uit API
        const rider = await prisma.rider.create({
            data: {
                zwiftId: data.riderId,
                name: data.name,
                clubId: data.clubId || null, // ClubID uit API
                ftp: data.ftp || null,
                ftpWkg: data.ftpWkg || null,
                ranking: data.ranking || null,
                categoryRacing: data.categoryRacing || null,
                categoryWorkout: data.categoryWorkout || null,
                nationality: data.nationality || null,
                age: data.age || null,
                gender: data.gender || null,
                isActive: true,
                statistics: {
                    racesCount: data.racesCount || 0,
                    winsCount: data.winsCount || 0,
                    bestPosition: data.bestPosition || null,
                },
            }
        });
        console.log(`✅ Rider toegevoegd!`);
        console.log(`   Naam: ${rider.name}`);
        console.log(`   Club ID: ${rider.clubId || 'Geen'}`);
        console.log(`   FTP: ${rider.ftp || 'N/A'}W | W/kg: ${rider.ftpWkg?.toFixed(2) || 'N/A'}`);
        console.log(`   Categorie: ${rider.categoryRacing || 'N/A'}\n`);
    }
    catch (error) {
        if (error.response?.status === 404) {
            console.log(`❌ Rider ${zwiftId} niet gevonden op ZwiftRacing API\n`);
        }
        else {
            console.log(`❌ Error: ${error.message}\n`);
        }
    }
}
async function removeRider() {
    printHeader('RIDER VERWIJDEREN');
    const zwiftIdStr = await question('Zwift ID: ');
    const zwiftId = parseInt(zwiftIdStr);
    if (isNaN(zwiftId)) {
        console.log('❌ Ongeldige Zwift ID\n');
        return;
    }
    try {
        // Check of rider bestaat
        const rider = await prisma.rider.findUnique({
            where: { zwiftId }
        });
        if (!rider) {
            console.log(`⚠️  Rider ${zwiftId} niet gevonden in database.\n`);
            return;
        }
        console.log(`\nRider: ${rider.name} (${rider.zwiftId})`);
        const confirm = await question(`⚠️  Weet je zeker dat je deze rider wilt verwijderen? (j/n): `);
        if (confirm.toLowerCase() !== 'j') {
            console.log('❌ Geannuleerd\n');
            return;
        }
        await prisma.rider.delete({
            where: { zwiftId }
        });
        console.log(`\n✅ Rider ${rider.name} verwijderd uit database\n`);
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function updateRider(providedZwiftId) {
    let zwiftId = providedZwiftId;
    if (!zwiftId) {
        printHeader('RIDER DATA UPDATEN');
        const zwiftIdStr = await question('Zwift ID: ');
        zwiftId = parseInt(zwiftIdStr);
        if (isNaN(zwiftId)) {
            console.log('❌ Ongeldige Zwift ID\n');
            return;
        }
    }
    console.log('\n⏳ Rider data ophalen van ZwiftRacing API...\n');
    try {
        // Check of rider bestaat
        const existing = await prisma.rider.findUnique({
            where: { zwiftId }
        });
        if (!existing) {
            console.log(`⚠️  Rider ${zwiftId} niet gevonden in database.\n`);
            const add = await question('Wil je deze rider toevoegen? (j/n): ');
            if (add.toLowerCase() === 'j') {
                await addRider(zwiftId);
            }
            return;
        }
        // Haal nieuwe data op
        const response = await directClient.get(`/public/riders/${zwiftId}`);
        const data = response.data;
        // Update in database
        const updated = await prisma.rider.update({
            where: { zwiftId },
            data: {
                name: data.name,
                clubId: data.clubId || null,
                ftp: data.ftp || null,
                ftpWkg: data.ftpWkg || null,
                ranking: data.ranking || null,
                categoryRacing: data.categoryRacing || null,
                categoryWorkout: data.categoryWorkout || null,
                statistics: {
                    racesCount: data.racesCount || 0,
                    winsCount: data.winsCount || 0,
                    bestPosition: data.bestPosition || null,
                },
            }
        });
        console.log(`✅ Rider data geüpdatet!`);
        console.log(`   Naam: ${updated.name}`);
        console.log(`   Club ID: ${updated.clubId || 'Geen'}`);
        console.log(`   FTP: ${updated.ftp || 'N/A'}W | W/kg: ${updated.ftpWkg?.toFixed(2) || 'N/A'}`);
        console.log(`   Categorie: ${updated.categoryRacing || 'N/A'}\n`);
    }
    catch (error) {
        if (error.response?.status === 404) {
            console.log(`❌ Rider ${zwiftId} niet gevonden op ZwiftRacing API\n`);
        }
        else {
            console.log(`❌ Error: ${error.message}\n`);
        }
    }
}
async function showDatabaseStats() {
    printHeader('DATABASE STATISTIEKEN');
    try {
        const riders = await prisma.rider.findMany();
        if (riders.length === 0) {
            console.log('⚠️  Geen riders in database.\n');
            return;
        }
        // Bereken statistieken
        const totalRiders = riders.length;
        const ridersWithFtp = riders.filter(r => r.ftp).length;
        const avgFtp = ridersWithFtp > 0
            ? riders.reduce((sum, r) => sum + (r.ftp || 0), 0) / ridersWithFtp
            : 0;
        const avgWkg = ridersWithFtp > 0
            ? riders.reduce((sum, r) => sum + (r.ftpWkg || 0), 0) / ridersWithFtp
            : 0;
        const totalRaces = riders.reduce((sum, r) => {
            const stats = r.statistics;
            return sum + (stats?.racesCount || 0);
        }, 0);
        const totalWins = riders.reduce((sum, r) => {
            const stats = r.statistics;
            return sum + (stats?.winsCount || 0);
        }, 0);
        // Groepeer per club
        const byClub = {};
        riders.forEach(r => {
            const clubId = r.clubId?.toString() || 'Geen club';
            byClub[clubId] = (byClub[clubId] || 0) + 1;
        });
        // Categorieën
        const categories = {};
        riders.forEach(r => {
            const cat = r.categoryRacing || 'Onbekend';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        console.log('👥 Riders:');
        console.log(`   Totaal: ${totalRiders}`);
        console.log(`   Met FTP data: ${ridersWithFtp}`);
        console.log('');
        console.log('📁 Per Club:');
        Object.entries(byClub)
            .sort(([, a], [, b]) => b - a)
            .forEach(([clubId, count]) => {
            console.log(`   Club ${clubId}: ${count} riders`);
        });
        console.log('');
        console.log('💪 Gemiddelden:');
        console.log(`   FTP: ${avgFtp.toFixed(1)}W`);
        console.log(`   W/kg: ${avgWkg.toFixed(2)}`);
        console.log('');
        console.log('🏁 Races:');
        console.log(`   Totaal races: ${totalRaces}`);
        console.log(`   Totaal wins: ${totalWins}`);
        console.log(`   Win rate: ${totalRaces > 0 ? ((totalWins / totalRaces) * 100).toFixed(1) : 0}%`);
        console.log('');
        console.log('🏆 Categorieën:');
        Object.entries(categories)
            .sort(([, a], [, b]) => b - a)
            .forEach(([cat, count]) => {
            console.log(`   ${cat}: ${count} riders`);
        });
        console.log('');
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function main() {
    console.log('\n🏁 Rider Management - Database CRUD');
    console.log('   ClubID wordt automatisch opgehaald uit ZwiftRacing API\n');
    let running = true;
    while (running) {
        printMenu();
        const choice = await question('Kies een optie: ');
        switch (choice) {
            case '1':
                await listAllRiders();
                break;
            case '2':
                await searchRider();
                break;
            case '3':
                await addRider();
                break;
            case '4':
                await removeRider();
                break;
            case '5':
                await updateRider();
                break;
            case '6':
                await showDatabaseStats();
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
    await prisma.$disconnect();
}
// Run
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
// Readline interface
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
    printHeader('RIDER MANAGEMENT');
    console.log('1. 👥 Bekijk alle riders in database');
    console.log('2. 🔍 Zoek rider (Zwift ID)');
    console.log('3. ➕ Voeg rider toe (Zwift ID)');
    console.log('4. ➖ Verwijder rider');
    console.log('5. 🔄 Sync rider data (update bestaande rider)');
    console.log('6. 📊 Database statistieken');
    console.log('0. 🚪 Exit');
    console.log('');
}
async function listAllRiders() {
    printHeader('ALLE RIDERS IN DATABASE');
    try {
        const riders = await riderRepo.getAllRiders();
        if (riders.length === 0) {
            console.log('⚠️  Geen riders in database. Voeg riders toe met optie 3.\n');
            return;
        }
        console.log(`Totaal: ${riders.length} riders\n`);
        // Groepeer per club
        const byClub = riders.reduce((acc, rider) => {
            const clubId = rider.clubId || 'Geen club';
            if (!acc[clubId])
                acc[clubId] = [];
            acc[clubId].push(rider);
            return acc;
        }, {});
        Object.entries(byClub).forEach(([clubId, clubRiders]) => {
            console.log(`📁 Club ${clubId} (${clubRiders.length} riders):`);
            clubRiders.forEach((rider, idx) => {
                console.log(`   ${idx + 1}. ${rider.name} (${rider.zwiftId})`);
                console.log(`      FTP: ${rider.ftp || 'N/A'}W | W/kg: ${rider.ftpWkg?.toFixed(2) || 'N/A'}`);
                console.log(`      Categorie: ${rider.categoryRacing || 'N/A'}`);
                console.log(`      Races: ${rider.racesCount || 0} | Wins: ${rider.winsCount || 0}`);
            });
            console.log('');
        });
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function searchRider() {
    const zwiftIdStr = await question('Zwift ID: ');
    const zwiftId = parseInt(zwiftIdStr);
    if (isNaN(zwiftId)) {
        console.log('❌ Ongeldige Zwift ID\n');
        return;
    }
    printHeader(`RIDER ${zwiftId}`);
    try {
        const rider = await riderRepo.getRider(zwiftId);
        if (!rider) {
            console.log('⚠️  Rider niet gevonden in database.\n');
            const add = await question('Wil je deze rider toevoegen? (j/n): ');
            if (add.toLowerCase() === 'j') {
                await addRider(zwiftId);
            }
            return;
        }
        console.log(`Naam: ${rider.name}`);
        console.log(`Zwift ID: ${rider.zwiftId}`);
        console.log(`Club ID: ${rider.clubId || 'N/A'}`);
        console.log('');
        console.log('📊 Stats:');
        console.log(`   FTP: ${rider.ftp || 'N/A'}W`);
        console.log(`   W/kg: ${rider.ftpWkg?.toFixed(2) || 'N/A'}`);
        console.log(`   Categorie: ${rider.categoryRacing || 'N/A'}`);
        console.log(`   Ranking: ${rider.ranking || 'N/A'}`);
        console.log('');
        console.log('🏁 Race History:');
        console.log(`   Totaal races: ${rider.racesCount || 0}`);
        console.log(`   Totaal wins: ${rider.winsCount || 0}`);
        console.log(`   Beste positie: ${rider.bestPosition || 'N/A'}`);
        console.log('');
        console.log(`Laatst gesync: ${rider.lastSyncedAt ? new Date(rider.lastSyncedAt).toLocaleString('nl-NL') : 'Nooit'}`);
        console.log(`Toegevoegd: ${new Date(rider.createdAt).toLocaleString('nl-NL')}\n`);
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function addRider(providedZwiftId) {
    let zwiftId = providedZwiftId;
    if (!zwiftId) {
        printHeader('RIDER TOEVOEGEN');
        const zwiftIdStr = await question('Zwift ID: ');
        zwiftId = parseInt(zwiftIdStr);
        if (isNaN(zwiftId)) {
            console.log('❌ Ongeldige Zwift ID\n');
            return;
        }
    }
    console.log('\n⏳ Rider data ophalen van ZwiftRacing API...\n');
    try {
        // Check of rider al bestaat
        const existing = await riderRepo.getRider(zwiftId);
        if (existing) {
            console.log(`⚠️  Rider ${zwiftId} bestaat al in database.\n`);
            const update = await question('Wil je de data updaten? (j/n): ');
            if (update.toLowerCase() === 'j') {
                await syncRider(zwiftId);
            }
            return;
        }
        // Haal data op van API (inclusief clubId)
        const riderData = await apiClient.getRiderProfile(zwiftId);
        // Sla op in database met clubId uit API
        const rider = await riderRepo.createRider({
            zwiftId: riderData.riderId,
            name: riderData.name,
            clubId: riderData.clubId, // ClubID komt uit de API data
            ftp: riderData.ftp,
            ftpWkg: riderData.ftpWkg,
            ranking: riderData.ranking,
            categoryRacing: riderData.categoryRacing,
            categoryWorkout: riderData.categoryWorkout,
            nationality: riderData.nationality,
            age: riderData.age,
            gender: riderData.gender,
            racesCount: riderData.racesCount,
            winsCount: riderData.winsCount,
            bestPosition: riderData.bestPosition,
            lastSyncedAt: new Date(),
        });
        console.log(`✅ Rider toegevoegd!`);
        console.log(`   Naam: ${rider.name}`);
        console.log(`   Club ID: ${rider.clubId || 'Geen'}`);
        console.log(`   FTP: ${rider.ftp}W | W/kg: ${rider.ftpWkg?.toFixed(2)}`);
        console.log(`   Categorie: ${rider.categoryRacing}`);
        console.log(`   Races: ${rider.racesCount} | Wins: ${rider.winsCount}\n`);
        console.log(`💡 Tip: Gebruik optie 5 om later rider data te synchroniseren.\n`);
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function removeRider() {
    printHeader('RIDER VERWIJDEREN');
    const zwiftIdStr = await question('Zwift ID: ');
    const zwiftId = parseInt(zwiftIdStr);
    if (isNaN(zwiftId)) {
        console.log('❌ Ongeldige Zwift ID\n');
        return;
    }
    try {
        // Check of rider bestaat
        const rider = await riderRepo.getRider(zwiftId);
        if (!rider) {
            console.log(`⚠️  Rider ${zwiftId} niet gevonden in database.\n`);
            return;
        }
        console.log(`\nRider: ${rider.name} (${rider.zwiftId})`);
        const confirm = await question(`⚠️  Weet je zeker dat je deze rider wilt verwijderen? (j/n): `);
        if (confirm.toLowerCase() !== 'j') {
            console.log('❌ Geannuleerd\n');
            return;
        }
        await riderRepo.deleteRider(zwiftId);
        console.log(`\n✅ Rider ${rider.name} verwijderd uit database\n`);
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function syncRider(providedZwiftId) {
    let zwiftId = providedZwiftId;
    if (!zwiftId) {
        printHeader('RIDER DATA SYNCHRONISEREN');
        const zwiftIdStr = await question('Zwift ID: ');
        zwiftId = parseInt(zwiftIdStr);
        if (isNaN(zwiftId)) {
            console.log('❌ Ongeldige Zwift ID\n');
            return;
        }
    }
    console.log('\n⏳ Rider data updaten van ZwiftRacing API...\n');
    try {
        // Check of rider bestaat
        const existing = await riderRepo.getRider(zwiftId);
        if (!existing) {
            console.log(`⚠️  Rider ${zwiftId} niet gevonden in database.\n`);
            const add = await question('Wil je deze rider toevoegen? (j/n): ');
            if (add.toLowerCase() === 'j') {
                await addRider(zwiftId);
            }
            return;
        }
        // Haal nieuwe data op
        const riderData = await apiClient.getRiderProfile(zwiftId);
        // Update in database
        const updated = await riderRepo.updateRider(zwiftId, {
            name: riderData.name,
            ftp: riderData.ftp,
            ftpWkg: riderData.ftpWkg,
            ranking: riderData.ranking,
            categoryRacing: riderData.categoryRacing,
            categoryWorkout: riderData.categoryWorkout,
            racesCount: riderData.racesCount,
            winsCount: riderData.winsCount,
            bestPosition: riderData.bestPosition,
            lastSyncedAt: new Date(),
        });
        console.log(`✅ Rider data geüpdatet!`);
        console.log(`   Naam: ${updated.name}`);
        console.log(`   FTP: ${updated.ftp}W | W/kg: ${updated.ftpWkg?.toFixed(2)}`);
        console.log(`   Categorie: ${updated.categoryRacing}`);
        console.log(`   Races: ${updated.racesCount} | Wins: ${updated.winsCount}`);
        console.log(`   Laatst gesync: ${new Date(updated.lastSyncedAt).toLocaleString('nl-NL')}\n`);
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function showDatabaseStats() {
    printHeader('DATABASE STATISTIEKEN');
    try {
        const riders = await riderRepo.getAllRiders();
        if (riders.length === 0) {
            console.log('⚠️  Geen riders in database.\n');
            return;
        }
        // Bereken statistieken
        const totalRiders = riders.length;
        const ridersWithFtp = riders.filter(r => r.ftp).length;
        const avgFtp = ridersWithFtp > 0
            ? riders.reduce((sum, r) => sum + (r.ftp || 0), 0) / ridersWithFtp
            : 0;
        const avgWkg = ridersWithFtp > 0
            ? riders.reduce((sum, r) => sum + (r.ftpWkg || 0), 0) / ridersWithFtp
            : 0;
        const totalRaces = riders.reduce((sum, r) => sum + (r.racesCount || 0), 0);
        const totalWins = riders.reduce((sum, r) => sum + (r.winsCount || 0), 0);
        // Groepeer per club
        const byClub = {};
        riders.forEach(r => {
            const clubId = r.clubId?.toString() || 'Geen club';
            byClub[clubId] = (byClub[clubId] || 0) + 1;
        });
        // Categorieën
        const categories = {};
        riders.forEach(r => {
            const cat = r.categoryRacing || 'Onbekend';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        console.log('👥 Riders:');
        console.log(`   Totaal: ${totalRiders}`);
        console.log(`   Met FTP data: ${ridersWithFtp}`);
        console.log('');
        console.log('📁 Per Club:');
        Object.entries(byClub)
            .sort(([, a], [, b]) => b - a)
            .forEach(([clubId, count]) => {
            console.log(`   Club ${clubId}: ${count} riders`);
        });
        console.log('');
        console.log('💪 Gemiddelden:');
        console.log(`   FTP: ${avgFtp.toFixed(1)}W`);
        console.log(`   W/kg: ${avgWkg.toFixed(2)}`);
        console.log('');
        console.log('🏁 Races:');
        console.log(`   Totaal races: ${totalRaces}`);
        console.log(`   Totaal wins: ${totalWins}`);
        console.log(`   Win rate: ${totalRaces > 0 ? ((totalWins / totalRaces) * 100).toFixed(1) : 0}%`);
        console.log('');
        console.log('🏆 Categorieën:');
        Object.entries(categories)
            .sort(([, a], [, b]) => b - a)
            .forEach(([cat, count]) => {
            console.log(`   ${cat}: ${count} riders`);
        });
        console.log('');
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}
async function main() {
    console.log('\n🏁 Rider Management - Database CRUD');
    console.log('   ClubID wordt automatisch opgehaald uit ZwiftRacing API\n');
    let running = true;
    while (running) {
        printMenu();
        const choice = await question('Kies een optie: ');
        switch (choice) {
            case '1':
                await listAllRiders();
                break;
            case '2':
                await searchRider();
                break;
            case '3':
                await addRider();
                break;
            case '4':
                await removeRider();
                break;
            case '5':
                await syncRider();
                break;
            case '6':
                await showDatabaseStats();
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
// Run
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=rider-manager.js.map