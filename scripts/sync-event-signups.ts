/**
 * Feature 1: Event Signups Sync Script
 * 
 * Haalt upcoming events op uit ZwiftRacing.app en matcht deelnemers met riders in database
 * 
 * Usage:
 *   npm run sync:event-signups
 *   npm run sync:event-signups -- --hours=72
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ZWIFT_RACING_API = 'https://zwift-ranking.herokuapp.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface ZwiftEvent {
  id: number;
  name: string;
  eventDate: string;
  description?: string;
  sport?: string;
  type?: string;
  route?: string;
  distanceInMeters?: number;
  organizer?: string;
  registrationStart?: string;
  registrationEnd?: string;
}

interface EventSignup {
  riderId: number;
  name: string;
  category?: string;
  team?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function fetchWithRetry(url: string, maxRetries = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`  📡 Fetching: ${url}`);
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'TeamNL-Cloud9-Dashboard/1.0',
        },
      });
      return response.data;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(`  ⚠️  Retry ${i + 1}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
}

async function getOurRiders(): Promise<Map<number, any>> {
  console.log('📋 Fetching our riders from database...');
  
  const { data, error } = await supabase
    .from('riders')
    .select('*');
  
  if (error) throw error;
  
  const riderMap = new Map();
  data?.forEach(rider => {
    riderMap.set(rider.rider_id, rider);
  });
  
  console.log(`✅ Found ${riderMap.size} riders in database\n`);
  return riderMap;
}

// ============================================================================
// ZwiftRacing.app API Methods
// ============================================================================

/**
 * Search for upcoming events
 * Note: We'll use recent events endpoint and filter for future dates
 */
async function searchUpcomingEvents(hours: number = 48): Promise<ZwiftEvent[]> {
  console.log(`🔍 Searching for events in next ${hours} hours...\n`);
  
  // Strategy: Get recent/popular events and filter
  // ZwiftRacing doesn't have a direct "upcoming" endpoint
  // We'll need to check multiple sources:
  
  const events: ZwiftEvent[] = [];
  
  // Method 1: Try to get events from known event series
  // This is a workaround since the API is limited
  
  console.log('  ℹ️  Note: ZwiftRacing.app API has limited event discovery');
  console.log('  ℹ️  For full event coverage, consider:');
  console.log('     - Scraping ZwiftRacing.app/events page');
  console.log('     - Using ZwiftPower API (if available)');
  console.log('     - Manual event entry via dashboard\n');
  
  return events;
}

/**
 * Get event details including registered riders
 */
async function getEventDetails(eventId: number): Promise<{
  event: ZwiftEvent | null;
  signups: EventSignup[];
}> {
  try {
    // Try to get event details
    const eventData = await fetchWithRetry(
      `${ZWIFT_RACING_API}/api/events/${eventId}`
    );
    
    // Try to get signups/results (some events have pre-registration data)
    let signups: EventSignup[] = [];
    
    try {
      const resultsData = await fetchWithRetry(
        `${ZWIFT_RACING_API}/api/events/${eventId}/results`
      );
      
      if (Array.isArray(resultsData)) {
        signups = resultsData.map((entry: any) => ({
          riderId: entry.riderId || entry.rider_id,
          name: entry.name || entry.riderName,
          category: entry.category,
          team: entry.team,
        }));
      }
    } catch (error) {
      console.log('    (No pre-registration data available)');
    }
    
    return {
      event: eventData,
      signups,
    };
  } catch (error) {
    console.error(`  ❌ Error fetching event ${eventId}:`, error);
    return { event: null, signups: [] };
  }
}

/**
 * Get rider's upcoming events from their profile
 */
async function getRiderUpcomingEvents(riderId: number): Promise<number[]> {
  try {
    // Check rider's recent results for upcoming events
    const resultsData = await fetchWithRetry(
      `${ZWIFT_RACING_API}/api/riders/${riderId}/results?limit=20`
    );
    
    if (!Array.isArray(resultsData)) return [];
    
    const now = new Date();
    const futureEventIds = resultsData
      .filter((result: any) => {
        const eventDate = new Date(result.eventDate);
        return eventDate > now;
      })
      .map((result: any) => result.eventId)
      .filter((id: number) => id && !isNaN(id));
    
    return [...new Set(futureEventIds)]; // Deduplicate
  } catch (error) {
    return [];
  }
}

// ============================================================================
// Database Operations
// ============================================================================

async function upsertEvent(event: ZwiftEvent): Promise<void> {
  const { error } = await supabase
    .from('events')
    .upsert({
      event_id: event.id,
      name: event.name,
      event_date: event.eventDate,
      event_type: event.type || 'race',
      description: event.description,
      route: event.route,
      distance_meters: event.distanceInMeters,
      organizer: event.organizer,
      event_url: `https://www.zwiftracing.app/events/${event.id}`,
      zwift_event_id: event.id,
      last_synced: new Date().toISOString(),
    }, {
      onConflict: 'event_id',
    });
  
  if (error) {
    console.error('  ❌ Error upserting event:', error);
    throw error;
  }
}

async function upsertEventSignup(
  eventId: number,
  riderId: number,
  category?: string,
  teamName?: string
): Promise<void> {
  const { error } = await supabase
    .from('event_signups')
    .upsert({
      event_id: eventId,
      rider_id: riderId,
      category: category,
      status: 'confirmed',
      team_name: teamName,
    }, {
      onConflict: 'event_id,rider_id',
    });
  
  if (error && error.code !== '23503') { // Ignore FK violations
    console.error(`  ⚠️  Error upserting signup for rider ${riderId}:`, error.message);
  }
}

// ============================================================================
// Main Sync Logic
// ============================================================================

async function syncEventSignups(hours: number = 48): Promise<void> {
  console.log('🚀 Starting Event Signups Sync\n');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Step 1: Get all our riders
    const ourRiders = await getOurRiders();
    
    // Step 2: Collect all potential event IDs
    console.log('🔍 Scanning riders for upcoming events...\n');
    
    const allEventIds = new Set<number>();
    let ridersScanned = 0;
    let ridersWithEvents = 0;
    
    for (const [riderId, rider] of ourRiders) {
      ridersScanned++;
      process.stdout.write(`\r  Progress: ${ridersScanned}/${ourRiders.size} riders scanned...`);
      
      const eventIds = await getRiderUpcomingEvents(riderId);
      
      if (eventIds.length > 0) {
        ridersWithEvents++;
        eventIds.forEach(id => allEventIds.add(id));
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`\n\n✅ Found ${allEventIds.size} unique events from ${ridersWithEvents} riders\n`);
    
    if (allEventIds.size === 0) {
      console.log('ℹ️  No upcoming events found.');
      console.log('ℹ️  This could mean:');
      console.log('   - No riders have upcoming races registered');
      console.log('   - API limitations prevent discovery');
      console.log('   - Manual event entry may be needed\n');
      return;
    }
    
    // Step 3: Process each event
    console.log('📥 Processing events...\n');
    
    let eventsProcessed = 0;
    let signupsCreated = 0;
    let signupsMatched = 0;
    
    for (const eventId of allEventIds) {
      eventsProcessed++;
      console.log(`\n[${eventsProcessed}/${allEventIds.size}] Event ${eventId}:`);
      
      const { event, signups } = await getEventDetails(eventId);
      
      if (!event) {
        console.log('  ⚠️  Could not fetch event details, skipping');
        continue;
      }
      
      // Check if event is in timeframe
      const eventDate = new Date(event.eventDate);
      const now = new Date();
      const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntil < 0 || hoursUntil > hours) {
        console.log(`  ⏭️  Event outside ${hours}h window (${hoursUntil.toFixed(1)}h), skipping`);
        continue;
      }
      
      console.log(`  📅 ${event.name}`);
      console.log(`  🕐 ${event.eventDate} (in ${hoursUntil.toFixed(1)}h)`);
      
      // Upsert event
      await upsertEvent(event);
      console.log('  ✓ Event saved');
      
      // Process signups
      console.log(`  👥 Processing ${signups.length} signups...`);
      
      for (const signup of signups) {
        signupsCreated++;
        
        if (ourRiders.has(signup.riderId)) {
          signupsMatched++;
          const rider = ourRiders.get(signup.riderId);
          
          await upsertEventSignup(
            eventId,
            signup.riderId,
            signup.category,
            signup.team
          );
          
          console.log(`    ✓ ${rider.name} (${signup.category || '-'})`);
        }
      }
      
      // Rate limiting between events
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SYNC COMPLETE\n');
    console.log(`📊 Summary:`);
    console.log(`   - Riders scanned: ${ridersScanned}`);
    console.log(`   - Events found: ${allEventIds.size}`);
    console.log(`   - Events processed: ${eventsProcessed}`);
    console.log(`   - Total signups: ${signupsCreated}`);
    console.log(`   - Team signups matched: ${signupsMatched}`);
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    throw error;
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

const args = process.argv.slice(2);
const hoursArg = args.find(arg => arg.startsWith('--hours='));
const hours = hoursArg ? parseInt(hoursArg.split('=')[1]) : 48;

console.log('🏁 TeamNL Cloud9 - Event Signups Sync');
console.log(`⏰ Lookforward: ${hours} hours\n`);

syncEventSignups(hours)
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
