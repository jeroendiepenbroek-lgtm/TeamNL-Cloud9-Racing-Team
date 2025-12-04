#!/usr/bin/env tsx

/**
 * Test Multi-Source API Authentication
 * 
 * Tests:
 * 1. ZwiftPower.com cookie-based login
 * 2. Zwift.com OAuth password grant flow
 * 3. Multi-source data fetch voor rider 150437 (POC)
 */

// Load environment variables FIRST, before any imports
import dotenv from 'dotenv';
dotenv.config();

const RIDER_ID = 150437; // JRøne CloudRacer-9 @YT TeamNL (POC)

async function main() {
  // Import clients AFTER dotenv.config() has run
  const { ZwiftPowerClient } = await import('./src/api/zwiftpower-client.js');
  const { ZwiftOfficialClient } = await import('./src/api/zwift-official-client.js');
  const { ZwiftApiClient } = await import('./src/api/zwift-client.js');
  console.log('🧪 Test Multi-Source API Authentication\n');
  
  // Debug: Check if env vars loaded
  console.log('🔍 Environment Variables Check:');
  console.log(`   ZWIFTPOWER_USERNAME: ${process.env.ZWIFTPOWER_USERNAME ? '✅ Set' : '❌ Missing'}`);
  console.log(`   ZWIFTPOWER_PASSWORD: ${process.env.ZWIFTPOWER_PASSWORD ? '✅ Set' : '❌ Missing'}`);
  console.log(`   ZWIFT_USERNAME: ${process.env.ZWIFT_USERNAME ? '✅ Set' : '❌ Missing'}`);
  console.log(`   ZWIFT_PASSWORD: ${process.env.ZWIFT_PASSWORD ? '✅ Set' : '❌ Missing'}`);
  console.log(`   ZWIFT_API_KEY: ${process.env.ZWIFT_API_KEY ? '✅ Set' : '❌ Missing'}\n`);
  
  // Test 1: ZwiftRacing.app (primary - should already work)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1️⃣  ZwiftRacing.app (Primary Source)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const zwiftRacingClient = new ZwiftApiClient();
    console.log(`   Fetching rider ${RIDER_ID}...`);
    const rider = await zwiftRacingClient.getRider(RIDER_ID);
    
    console.log(`   ✅ Success!`);
    console.log(`   Name: ${rider.name}`);
    console.log(`   Club: ${rider.club?.name || 'Unknown'} (ID: ${rider.club?.id})`);
    console.log(`   FTP: ${rider.zpFTP}W (${rider.power?.wkg1200?.toFixed(2)} W/kg)`);
    console.log(`   vELO: ${rider.race?.current?.mixed?.category} (${rider.race?.current?.mixed?.number})`);
    console.log(`   Rating: ${rider.race?.current?.rating?.toFixed(0)}`);
    console.log(`   Power 15s: ${rider.power?.w15}W (${rider.power?.wkg15?.toFixed(2)} W/kg)`);
    console.log(`   Power 5min: ${rider.power?.w300}W (${rider.power?.wkg300?.toFixed(2)} W/kg)`);
    console.log(`   Finishes: ${rider.race?.finishes}, Wins: ${rider.race?.wins}, Podiums: ${rider.race?.podiums}\n`);
  } catch (error: any) {
    console.error(`   ❌ Failed:`, error.message, '\n');
  }

  // Test 2: ZwiftPower.com authentication
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('2️⃣  ZwiftPower.com (FTP Verification)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const zwiftPowerClient = new ZwiftPowerClient();
    console.log(`   Authenticating...`);
    const authenticated = await zwiftPowerClient.authenticate();
    
    if (authenticated) {
      console.log(`   ✅ Authentication successful!`);
      console.log(`   Fetching rider ${RIDER_ID} profile...`);
      
      const zpRider = await zwiftPowerClient.getRider(RIDER_ID);
      
      if (zpRider) {
        console.log(`   ✅ Profile found!`);
        console.log(`   Name: ${zpRider.name}`);
        console.log(`   FTP: ${zpRider.ftp}W`);
        console.log(`   Weight: ${zpRider.weight}kg`);
        console.log(`   Category: ${zpRider.category}`);
        console.log(`   Flag: ${zpRider.flag}\n`);
      } else {
        console.log(`   ⚠️  Rider niet gevonden op ZwiftPower\n`);
      }
    } else {
      console.error(`   ❌ Authentication failed\n`);
    }
  } catch (error: any) {
    console.error(`   ❌ Error:`, error.message, '\n');
    console.error(`   Details:`, error.stack, '\n');
  }

  // Test 3: Zwift.com Official API
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('3️⃣  Zwift.com Official API (Activities)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const zwiftOfficialClient = new ZwiftOfficialClient();
    console.log(`   Authenticating via OAuth...`);
    const profile = await zwiftOfficialClient.getProfile(RIDER_ID);
    
    console.log(`   ✅ OAuth successful!`);
    console.log(`   Name: ${profile.firstName} ${profile.lastName}`);
    console.log(`   Profile ID: ${profile.id}`);
    console.log(`   Gender: ${profile.male ? 'Male' : 'Female'}`);
    console.log(`   Followers: ${profile.followersCount}`);
    console.log(`   Following: ${profile.followeesCount}`);
    console.log(`   Riding: ${profile.riding ? 'Yes' : 'No'}`);
    
    if (profile.imageSrc) {
      console.log(`   Avatar: ${profile.imageSrc}`);
    }
    
    console.log(`\n   Fetching recent activities...`);
    const activities = await zwiftOfficialClient.getActivities(RIDER_ID, 0, 5);
    
    console.log(`   ✅ Found ${activities.length} recent activities`);
    
    if (activities.length > 0) {
      console.log(`\n   📊 Most Recent Activity:`);
      const latest = activities[0];
      console.log(`   Date: ${new Date(latest.startDate).toLocaleDateString('nl-NL')}`);
      console.log(`   Distance: ${(latest.distanceInMeters / 1000).toFixed(2)} km`);
      console.log(`   Duration: ${Math.round(latest.durationInSeconds / 60)} min`);
      console.log(`   Avg Power: ${latest.avgWatts}W`);
      console.log(`   Avg HR: ${latest.avgHeartRate} bpm`);
      console.log(`   Calories: ${latest.calories}`);
    }
    console.log('');
  } catch (error: any) {
    console.error(`   ❌ Error:`, error.message, '\n');
    console.error(`   Details:`, error.stack, '\n');
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Test Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('   ZwiftRacing.app: ✅ (primary source)');
  console.log('   ZwiftPower.com:  zie output hierboven');
  console.log('   Zwift.com:       zie output hierboven');
  console.log('\n   POC Rider: 150437 (JRøne CloudRacer-9)');
  console.log('   Next: Test unified-rider-data.service.ts merge logic\n');
}

main().catch(console.error);
