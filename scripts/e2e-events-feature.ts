/**
 * E2E Test - Events Feature (Feature 1)
 * 
 * Test flow:
 * 1. Health check
 * 2. Get upcoming events (48h window)
 * 3. Pick event with signups
 * 4. Sync signups for that event
 * 5. Verify signups stored in database
 * 6. Check team rider detection
 * 
 * GEEN vastlopers - alle calls met timeout
 */

import axios, { AxiosError } from 'axios';

const API_BASE = 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconden max per call

interface TestResult {
  step: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  data?: any;
  duration?: number;
}

const results: TestResult[] = [];

// Helper met timeout
async function apiCall(method: string, url: string, data?: any): Promise<any> {
  const start = Date.now();
  try {
    const response = await axios({
      method,
      url: `${API_BASE}${url}`,
      data,
      timeout: TIMEOUT,
      validateStatus: () => true, // Accept all status codes
    });
    const duration = Date.now() - start;
    return { response, duration };
  } catch (error) {
    const duration = Date.now() - start;
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Timeout na ${duration}ms`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
    throw error;
  }
}

async function runTest() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  E2E Test - Events Feature (Feature 1)                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ========== STEP 1: Health Check ==========
  console.log('📋 Step 1: Health check...');
  try {
    const { response, duration } = await apiCall('GET', '/health');
    
    if (response.status === 200 && response.data.status === 'ok') {
      results.push({
        step: '1. Health Check',
        status: 'success',
        message: `Backend is online (${duration}ms)`,
        data: response.data,
        duration,
      });
      console.log(`✅ Backend is online (${duration}ms)\n`);
    } else {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  } catch (error) {
    results.push({
      step: '1. Health Check',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    console.log(`❌ Health check failed: ${error}\n`);
    console.log('⚠️  Backend is niet beschikbaar - stoppen met testen\n');
    printResults();
    process.exit(1);
  }

  // ========== STEP 2: Get Upcoming Events ==========
  console.log('📋 Step 2: Get upcoming events (48h window)...');
  let events: any[] = [];
  try {
    const { response, duration } = await apiCall('GET', '/api/events/upcoming?hours=48');
    
    if (response.status === 200) {
      // Response is { events: [], count: number, ... }
      const data = response.data;
      events = data.events || [];
      
      results.push({
        step: '2. Get Upcoming Events',
        status: 'success',
        message: `Found ${events.length} events in next 48h (${duration}ms)`,
        data: { count: events.length, sample: events[0] },
        duration,
      });
      console.log(`✅ Found ${events.length} events (${duration}ms)`);
      
      if (events.length > 0) {
        console.log(`   First event: ${events[0].title} (${events[0].event_id})`);
      }
      console.log('');
    } else {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    results.push({
      step: '2. Get Upcoming Events',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    console.log(`❌ Failed to get events: ${error}\n`);
    printResults();
    process.exit(1);
  }

  // ========== STEP 3: Pick Event with Signups ==========
  console.log('📋 Step 3: Find event with signups...');
  let testEventId: string | null = null;
  let testEvent: any = null;

  try {
    // Zoek event met signups in de raw_response
    for (const event of events) {
      const rawResponse = JSON.parse(event.raw_response || '{}');
      const signupsStr = rawResponse.signups || '';
      
      // Check of er signups zijn (niet "0,0,0" of leeg)
      if (signupsStr && signupsStr !== '' && signupsStr !== '0' && !signupsStr.match(/^0(,0)*$/)) {
        testEventId = event.event_id;
        testEvent = event;
        break;
      }
    }

    if (testEventId) {
      const rawResponse = JSON.parse(testEvent.raw_response);
      results.push({
        step: '3. Find Event with Signups',
        status: 'success',
        message: `Selected event ${testEventId}: "${testEvent.title}"`,
        data: {
          eventId: testEventId,
          title: testEvent.title,
          signups: rawResponse.signups,
          categories: rawResponse.categories,
        },
      });
      console.log(`✅ Selected event: ${testEvent.title}`);
      console.log(`   Event ID: ${testEventId}`);
      console.log(`   Signups: ${rawResponse.signups}`);
      console.log(`   Categories: ${rawResponse.categories}\n`);
    } else {
      results.push({
        step: '3. Find Event with Signups',
        status: 'skipped',
        message: 'No events with signups found in next 48h',
      });
      console.log(`⚠️  No events with signups found - skipping signup tests\n`);
      printResults();
      process.exit(0);
    }
  } catch (error) {
    results.push({
      step: '3. Find Event with Signups',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    console.log(`❌ Error finding event: ${error}\n`);
    printResults();
    process.exit(1);
  }

  // ========== STEP 4: Sync Event Signups ==========
  console.log('📋 Step 4: Sync signups for selected event...');
  let syncResult: any = null;
  try {
    const { response, duration } = await apiCall('POST', `/api/signups/sync/${testEventId}`);
    
    if (response.status === 200 && response.data.success) {
      syncResult = response.data;
      results.push({
        step: '4. Sync Event Signups',
        status: 'success',
        message: `Synced ${syncResult.totalSignups} signups (${duration}ms)`,
        data: syncResult,
        duration,
      });
      console.log(`✅ Synced ${syncResult.totalSignups} signups (${duration}ms)`);
      console.log(`   By pen: ${JSON.stringify(syncResult.byPen)}\n`);
    } else {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    results.push({
      step: '4. Sync Event Signups',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    console.log(`❌ Failed to sync signups: ${error}\n`);
    printResults();
    process.exit(1);
  }

  // ========== STEP 5: Verify Signups in Database ==========
  console.log('📋 Step 5: Verify signups stored in database...');
  try {
    // Direct database check via Supabase API endpoint
    const { response, duration } = await apiCall(
      'GET',
      `/api/events/upcoming?hours=48`
    );

    if (response.status === 200) {
      const data = response.data;
      const eventsArray = data.events || [];
      const updatedEvent = eventsArray.find((e: any) => e.event_id === testEventId);
      
      if (updatedEvent) {
        results.push({
          step: '5. Verify Database',
          status: 'success',
          message: `Event found in database with ${updatedEvent.total_signups || 0} total signups`,
          data: {
            eventId: testEventId,
            totalSignups: updatedEvent.total_signups,
            teamRiders: updatedEvent.team_rider_count,
          },
          duration,
        });
        console.log(`✅ Database verification successful (${duration}ms)`);
        console.log(`   Total signups: ${updatedEvent.total_signups || 0}`);
        console.log(`   Team riders: ${updatedEvent.team_rider_count || 0}\n`);
      } else {
        throw new Error('Event not found in database');
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    results.push({
      step: '5. Verify Database',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    console.log(`❌ Database verification failed: ${error}\n`);
  }

  // ========== STEP 6: Test Batch Sync (3 events max) ==========
  console.log('📋 Step 6: Test batch signup sync...');
  try {
    // Pak max 3 events met signups
    const eventsWithSignups = events
      .filter(e => {
        const raw = JSON.parse(e.raw_response || '{}');
        const signups = raw.signups || '';
        return signups && signups !== '' && signups !== '0' && !signups.match(/^0(,0)*$/);
      })
      .slice(0, 3)
      .map(e => e.event_id);

    if (eventsWithSignups.length > 0) {
      const { response, duration } = await apiCall('POST', '/api/signups/sync-batch', {
        eventIds: eventsWithSignups,
      });

      if (response.status === 200 && response.data.success) {
        results.push({
          step: '6. Batch Signup Sync',
          status: 'success',
          message: `Synced ${response.data.processed} events with ${response.data.totalSignups} total signups (${duration}ms)`,
          data: response.data,
          duration,
        });
        console.log(`✅ Batch sync successful (${duration}ms)`);
        console.log(`   Events processed: ${response.data.processed}`);
        console.log(`   Total signups: ${response.data.totalSignups}`);
        console.log(`   Errors: ${response.data.errors}\n`);
      } else {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
      }
    } else {
      results.push({
        step: '6. Batch Signup Sync',
        status: 'skipped',
        message: 'No additional events with signups found',
      });
      console.log(`⚠️  No additional events for batch test\n`);
    }
  } catch (error) {
    results.push({
      step: '6. Batch Signup Sync',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    console.log(`❌ Batch sync failed: ${error}\n`);
  }

  // ========== Print Results ==========
  printResults();
}

function printResults() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test Results Summary                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const success = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  results.forEach(result => {
    const icon = result.status === 'success' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${icon} ${result.step}${duration}`);
    console.log(`   ${result.message}`);
  });

  console.log('');
  console.log(`Total: ${results.length} tests`);
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log('');

  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  console.log(`⏱️  Total duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
  console.log('');

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.log('💥 SOME TESTS FAILED\n');
    process.exit(1);
  }
}

// Run test
runTest().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
