#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
dotenv.config();

const { zwiftClient } = await import('./src/api/zwift-client.js');

console.log('🔍 Inspecting event 5229579 structure...\n');

const results = await zwiftClient.getEventResults(5229579);

console.log(`Total results: ${results.length}`);

// Find rider 150437
const riderResult = results.find((r: any) => 
  r.riderId === 150437 || 
  r.rider_id === 150437 ||
  r.zwiftId === 150437
);

if (riderResult) {
  console.log('\n✅ Found rider result!');
  console.log('\nFull object keys:');
  console.log(Object.keys(riderResult).join(', '));
  console.log('\nFull object:');
  console.log(JSON.stringify(riderResult, null, 2));
} else {
  console.log('\n❌ Rider 150437 not found');
  console.log('\nSample result structure:');
  console.log(JSON.stringify(results[0], null, 2));
  
  console.log('\n\nSearching for rider with different fields...');
  const possibleRider = results.find((r: any) => {
    return JSON.stringify(r).includes('150437');
  });
  if (possibleRider) {
    console.log('Found by string search:');
    console.log(JSON.stringify(possibleRider, null, 2));
  }
}
