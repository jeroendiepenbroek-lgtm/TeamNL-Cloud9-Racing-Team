/**
 * Test script: Check Zwift Official API voor ZRS field
 */
import { UnifiedSyncService } from './backend/src/services/unified-sync.service.js';
import 'dotenv/config';

async function testZwiftZRS() {
  const riderId = 3137561; // Robert van Dam
  
  console.log('🔍 Testing Zwift Official API for ZRS...\n');
  
  const service = new UnifiedSyncService();
  
  // Use private method via type assertion
  const fetchMethod = (service as any).fetchZwiftOfficialData.bind(service);
  const ensureToken = (service as any).ensureZwiftOAuthToken.bind(service);
  
  await ensureToken();
  
  console.log(`Fetching profile for rider ${riderId}...\n`);
  const profile = await fetchMethod(riderId);
  
  if (!profile) {
    console.error('❌ No profile data returned');
    return;
  }
  
  console.log('📊 Full Profile data:');
  console.log(JSON.stringify(profile, null, 2));
  
  console.log('\n🔍 Checking for ZRS field...');
  const zrsFields = ['zrs', 'racingScore', 'zwiftRacingScore', 'racing_score', 'ZRS'];
  
  let found = false;
  for (const field of zrsFields) {
    if (field in profile) {
      console.log(`✅ ${field} FOUND: ${(profile as any)[field]}`);
      found = true;
    }
  }
  
  if (!found) {
    console.log('❌ No ZRS field found');
    console.log('\n📋 Available fields:');
    console.log(Object.keys(profile).sort().join(', '));
  }
}

testZwiftZRS().catch(console.error);
