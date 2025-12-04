#!/usr/bin/env npx tsx

/**
 * Simulate Production Endpoint Locally
 */

import dotenv from 'dotenv';
dotenv.config();

const { supabase } = await import('./src/services/supabase.service.js');

console.log('🎯 Simulating: GET /api/results/rider/150437?days=30\n');

try {
  const riderId = 150437;
  const days = 30;
  const limit = 50;
  
  console.log(`📊 Parameters: riderId=${riderId}, days=${days}, limit=${limit}`);
  console.log('🔄 Calling supabase.getRiderResults...\n');
  
  const results = await (supabase as any).getRiderResults(riderId, days, limit);
  
  console.log(`✅ Got ${results.length} results\n`);
  
  // Build response object like endpoint does
  const response = {
    success: true,
    rider_id: riderId,
    count: results.length,
    days,
    results
  };
  
  console.log('📦 Response size:', JSON.stringify(response).length, 'bytes');
  console.log('📋 Response structure:', {
    success: response.success,
    rider_id: response.rider_id,
    count: response.count,
    days: response.days,
    results_length: response.results.length
  });
  
  console.log('\n✅ Endpoint would return this successfully!\n');
  
} catch (error: any) {
  console.error('❌ Error:', error.message);
  console.log('\n⚠️  This is the 500 error cause!\n');
  process.exit(1);
}
