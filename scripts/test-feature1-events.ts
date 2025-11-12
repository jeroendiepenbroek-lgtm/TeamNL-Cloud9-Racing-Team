/**
 * Test script voor Feature 1: Event Discovery & Sync
 * 
 * Test nieuwe functionaliteit:
 * - ZwiftApiClient.getEvents48Hours()
 * - syncService.bulkImportUpcomingEvents()
 * - eventScheduler manual triggers
 */

import 'dotenv/config';
import { zwiftClient } from '../backend/src/api/zwift-client.js';
import { syncService } from '../backend/src/services/sync.service.js';
import { eventScheduler } from '../backend/src/services/event-scheduler.service.js';
import { supabase } from '../backend/src/services/supabase.service.js';

async function testEventDiscovery() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  TEST 1: Event Discovery via API                     ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    console.log('🔍 Testing zwiftClient.getEvents48Hours()...\n');
    
    const events = await zwiftClient.getEvents48Hours();
    
    console.log(`✅ API Response: ${events.length} events found`);
    
    if (events.length > 0) {
      const firstEvent = events[0];
      console.log('\n📋 Sample Event:');
      console.log(`  ID: ${firstEvent.eventId}`);
      console.log(`  Title: ${firstEvent.title}`);
      console.log(`  Type: ${firstEvent.type}`);
      console.log(`  Time: ${new Date(firstEvent.time * 1000).toISOString()}`);
      console.log(`  Route: ${firstEvent.route?.name || 'N/A'}`);
      console.log(`  Pens: ${firstEvent.pens?.length || 0} categories`);
    }
    
    return { success: true, count: events.length };
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
    return { success: false, error };
  }
}

async function testBulkImport() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  TEST 2: Bulk Import & Rider Matching                ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    console.log('🔄 Testing syncService.bulkImportUpcomingEvents()...\n');
    
    const result = await syncService.bulkImportUpcomingEvents();
    
    console.log('\n✅ Bulk Import Results:');
    console.log(`  Events imported: ${result.events_imported}`);
    console.log(`  Signups matched: ${result.signups_matched}`);
    console.log(`  Team events: ${result.team_events}`);
    console.log(`  Errors: ${result.errors}`);
    
    return { success: true, result };
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
    return { success: false, error };
  }
}

async function testScheduler() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  TEST 3: Event Scheduler Manual Triggers             ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    console.log('⏰ Testing scheduler status...\n');
    
    const status = eventScheduler.getStatus();
    console.log('Scheduler Status:');
    console.log(`  Running: ${status.running}`);
    console.log(`  Hourly job: ${status.hourlyActive}`);
    console.log(`  Urgent job: ${status.urgentActive}`);
    
    if (!status.running) {
      console.log('\n🚀 Starting scheduler...');
      eventScheduler.start();
    }
    
    console.log('\n⚡ Testing manual urgent sync...');
    await eventScheduler.triggerUrgentSync();
    
    console.log('\n✅ Scheduler test complete');
    
    // Stop scheduler na test
    console.log('\n🛑 Stopping scheduler...');
    eventScheduler.stop();
    
    return { success: true };
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
    return { success: false, error };
  }
}

async function testDatabaseQueries() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  TEST 4: Database Queries                             ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    console.log('📊 Testing database queries...\n');
    
    // Test 1: Get upcoming events
    console.log('1️⃣  Testing getUpcomingEvents()...');
    const upcomingEvents = await supabase.getUpcomingEvents(48, false);
    console.log(`   ✅ Found ${upcomingEvents.length} upcoming events`);
    
    // Test 2: Get team events only
    console.log('\n2️⃣  Testing getUpcomingEvents(hasTeamRiders=true)...');
    const teamEvents = await supabase.getUpcomingEvents(48, true);
    console.log(`   ✅ Found ${teamEvents.length} events with team riders`);
    
    // Test 3: Get event signups
    if (teamEvents.length > 0) {
      const eventId = teamEvents[0].event_id;
      console.log(`\n3️⃣  Testing getEventSignups(${eventId})...`);
      const signups = await supabase.getEventSignups(eventId);
      console.log(`   ✅ Found ${signups.length} signups`);
    }
    
    // Test 4: Get riders
    console.log('\n4️⃣  Testing getRiders()...');
    const riders = await supabase.getRiders();
    console.log(`   ✅ Found ${riders.length} team riders`);
    
    console.log('\n✅ Database tests complete');
    
    return { 
      success: true, 
      counts: {
        upcomingEvents: upcomingEvents.length,
        teamEvents: teamEvents.length,
        riders: riders.length,
      }
    };
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
    return { success: false, error };
  }
}

async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║                                                       ║');
  console.log('║  Feature 1: Event Discovery & Sync - Test Suite      ║');
  console.log('║                                                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  const results = {
    test1: await testEventDiscovery(),
    test2: await testBulkImport(),
    test3: await testScheduler(),
    test4: await testDatabaseQueries(),
  };

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  TEST SUMMARY                                         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const allSuccess = Object.values(results).every(r => r.success);

  console.log(`Test 1 (Event Discovery):  ${results.test1.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 2 (Bulk Import):      ${results.test2.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 3 (Scheduler):        ${results.test3.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 4 (Database):         ${results.test4.success ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n' + (allSuccess ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'));
  console.log('');

  process.exit(allSuccess ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Test suite error:', error);
  process.exit(1);
});

