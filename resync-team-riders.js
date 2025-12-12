#!/usr/bin/env node

const axios = require('axios');

const API_URL = 'https://teamnl-cloud9-racing-team-production.up.railway.app';

async function resyncAllRiders() {
  try {
    console.log('📊 Fetching current team roster...');
    const { data } = await axios.get(`${API_URL}/api/riders`);
    
    const riders = data.riders || [];
    console.log(`✅ Found ${riders.length} riders in team\n`);
    
    if (riders.length === 0) {
      console.log('No riders to sync');
      return;
    }
    
    // Extract rider IDs
    const riderIds = riders.map(r => r.rider_id);
    console.log('Rider IDs to sync:', riderIds.join(', '));
    console.log('');
    
    // Re-sync all riders (backend will call both APIs)
    console.log('🔄 Triggering re-sync for all riders...');
    const syncResponse = await axios.post(`${API_URL}/api/admin/riders`, {
      rider_ids: riderIds
    });
    
    console.log('\n✅ Re-sync completed!');
    console.log('Results:', syncResponse.data);
    
    // Wait a bit and fetch updated data
    console.log('\n⏳ Waiting 3 seconds for database to update...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('📊 Fetching updated data...');
    const updatedData = await axios.get(`${API_URL}/api/riders`);
    const updatedRiders = updatedData.data.riders || [];
    
    console.log('\n=== UPDATED DATA ===');
    updatedRiders.forEach(rider => {
      console.log(`\nRider ${rider.rider_id} - ${rider.full_name}`);
      console.log(`  ZRS: ${rider.zwift_official_racing_score || 'NULL'}`);
      console.log(`  Category (Zwift): ${rider.zwift_official_category || 'NULL'}`);
      console.log(`  Category (ZwiftRacing): ${rider.zwiftracing_category || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

resyncAllRiders();
