/**
 * Script: Fix total_riders voor bestaande events
 * Haalt voor elk event de volledige results op van Zwift API om total_riders te bepalen
 */

import 'dotenv/config';
import { ZwiftApiClient } from '../api/zwift-client.js';
import { SupabaseService } from '../services/supabase.service.js';

const zwiftApi = new ZwiftApiClient();
const supabase = new SupabaseService();

async function fixTotalRiders() {
  console.log('🔧 Starting total_riders fix...\n');

  try {
    // 0. Reset alle total_riders naar null (want huidige waarden zijn incorrect)
    console.log('🔄 Resetting all total_riders to null...');
    const { error: resetError } = await supabase['client']
      .from('zwift_api_race_results')
      .update({ total_riders: null })
      .not('total_riders', 'is', null);
    
    if (resetError) throw resetError;
    console.log('✅ Reset complete\n');

    // 1. Haal alle unieke events op die results hebben
    const { data: events, error } = await supabase['client']
      .from('zwift_api_race_results')
      .select('event_id')
      .is('total_riders', null)
      .order('event_date', { ascending: false });

    if (error) throw error;

    const uniqueEventIds = [...new Set(events?.map(e => e.event_id) || [])];
    console.log(`📊 Found ${uniqueEventIds.length} events without total_riders\n`);

    let updated = 0;
    let failed = 0;

    // 2. Voor elk event: haal alle results op en update total_riders
    for (const eventId of uniqueEventIds) {
      try {
        console.log(`🔍 Processing event ${eventId}...`);

        // Haal alle event results op van Zwift API
        const eventResults = await zwiftApi.getEventResults(eventId);
        const totalRiders = eventResults.length;

        console.log(`   ✅ Found ${totalRiders} total riders`);

        // Update alle results van dit event met total_riders
        const { error: updateError } = await supabase['client']
          .from('zwift_api_race_results')
          .update({ total_riders: totalRiders })
          .eq('event_id', eventId);

        if (updateError) {
          console.error(`   ❌ Update failed:`, updateError);
          failed++;
        } else {
          console.log(`   💾 Updated total_riders = ${totalRiders}`);
          updated++;
        }

        // Rate limiting: wacht 1 seconde tussen calls
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        console.error(`   ❌ Error processing event ${eventId}:`, error.message);
        failed++;
        
        // Als rate limit error, wacht langer
        if (error.message?.includes('rate limit')) {
          console.log('   ⏳ Rate limit hit, waiting 60 seconds...');
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
    }

    console.log('\n✅ Fix completed!');
    console.log(`   Updated: ${updated} events`);
    console.log(`   Failed: ${failed} events`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run script
fixTotalRiders()
  .then(() => {
    console.log('\n🎉 Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
