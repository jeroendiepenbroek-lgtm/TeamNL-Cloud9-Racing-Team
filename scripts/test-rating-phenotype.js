/**
 * Test script om race rating en phenotype extraction te verifiëren
 * Simuleert API response en test repository methods
 */
import { RiderRepository } from '../src/database/repositories.js';
// Sample API response met race en phenotype data
const sampleRiderData = {
    riderId: 999999, // Test ID
    name: "Test Rider",
    ftp: 300,
    weight: 75,
    gender: "male",
    race: {
        current: {
            rating: 750,
            date: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
            expires: Math.floor(Date.now() / 1000) + 2592000, // 30 days from now
        },
        last: {
            rating: 745,
            date: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
            expires: Math.floor(Date.now() / 1000) + 2505600,
            mixed: {
                category: "B",
                number: 12,
            },
        },
        max30: {
            rating: 765,
            date: Math.floor(Date.now() / 1000) - 604800, // 7 days ago
            expires: Math.floor(Date.now() / 1000) + 2419200,
        },
        max90: {
            rating: 780,
            date: Math.floor(Date.now() / 1000) - 2592000, // 30 days ago
            expires: Math.floor(Date.now() / 1000) + 5184000,
        },
        dnfs: 3,
    },
    phenotype: {
        scores: {
            sprinter: 75.5,
            puncheur: 60.2,
            pursuiter: 55.8,
            climber: 45.3,
            tt: 68.9,
        },
        value: "Sprinter",
        bias: 0.78,
    },
    handicaps: {
        profile: {
            flat: 50.5,
            rolling: 35.2,
            hilly: -10.8,
            mountainous: -45.6,
        },
    },
};
async function testRaceRatingAndPhenotype() {
    console.log('🧪 Test: Race Rating en Phenotype Extraction\n');
    const riderRepo = new RiderRepository();
    try {
        // 1. Upsert rider met race + phenotype data
        console.log('📝 Stap 1: Upsert test rider...');
        const rider = await riderRepo.upsertRider(sampleRiderData);
        console.log(`✅ Rider aangemaakt: ${rider.name} (ID: ${rider.id})`);
        console.log(`   - totalDnfs: ${rider.totalDnfs}`);
        console.log(`   - handicapFlat: ${rider.handicapFlat}`);
        // 2. Check race rating
        console.log('\n📊 Stap 2: Check race rating...');
        const riderWithRating = await riderRepo.getRider(sampleRiderData.riderId);
        if (riderWithRating?.raceRating) {
            console.log('✅ Race rating gevonden:');
            console.log(`   - Current: ${riderWithRating.raceRating.currentRating}`);
            console.log(`   - Max 30d: ${riderWithRating.raceRating.max30Rating}`);
            console.log(`   - Max 90d: ${riderWithRating.raceRating.max90Rating}`);
            console.log(`   - Form vs peak: ${(riderWithRating.raceRating.currentRating || 0) - (riderWithRating.raceRating.max30Rating || 0)}`);
        }
        else {
            console.log('❌ Geen race rating gevonden');
        }
        // 3. Check phenotype
        console.log('\n🧬 Stap 3: Check phenotype...');
        if (riderWithRating?.phenotype) {
            console.log('✅ Phenotype gevonden:');
            console.log(`   - Type: ${riderWithRating.phenotype.primaryType} (confidence: ${riderWithRating.phenotype.bias})`);
            console.log(`   - Sprinter: ${riderWithRating.phenotype.sprinter}`);
            console.log(`   - Climber: ${riderWithRating.phenotype.climber}`);
            console.log(`   - Puncheur: ${riderWithRating.phenotype.puncheur}`);
        }
        else {
            console.log('❌ Geen phenotype gevonden');
        }
        // 4. Cleanup
        console.log('\n🧹 Cleanup: Verwijder test rider...');
        await prisma.rider.delete({ where: { zwiftId: sampleRiderData.riderId } });
        console.log('✅ Test voltooid!\n');
    }
    catch (error) {
        console.error('❌ Test gefaald:', error);
        throw error;
    }
}
// Run test
testRaceRatingAndPhenotype()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
//# sourceMappingURL=test-rating-phenotype.js.map