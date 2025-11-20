/**
 * Sync Real-Time Results voor Team Members
 * Vervangt seed data met echte race results van ZwiftRacing API
 * 
 * Strategy: Haal recent events op en filter results voor team members
 */

import { supabase } from '../backend/src/services/supabase.service.js';
import { zwiftClient } from '../backend/src/api/zwift-client.js';

interface RaceResult {
  eventId: string;
  eventName: string;
  eventDate: Date;
  riderId: number;
  riderName: string;
  rank: number;
  timeSeconds: number;
  avgWkg: number;
  pen: string;
  totalRiders: number;
  veloRating: number | null;
  veloPrevious: number | null;
  veloChange: number | null;
  power5s: number | null;
  power15s: number | null;
  power30s: number | null;
  power1m: number | null;
  power2m: number | null;
  power5m: number | null;
  power20m: number | null;
  effortScore: number | null;
  racePoints: number | null;
  deltaWinnerSeconds: number | null;
}

async function syncTeamResults() {
  try {
    logger.info('🚀 Start sync van real-time results voor team members');
    
    // Step 1: Haal alle team riders op
    const riders = await supabase.getRiders();
    logger.info(`📊 Gevonden riders: ${riders.length}`);
    
    if (riders.length === 0) {
      logger.warn('⚠️  Geen riders gevonden. Run eerst club sync.');
      return;
    }
    
    // Step 2: Verwijder seed data
    logger.info('🗑️  Verwijder seed data (event IDs 5000%)...');
    const { error: deleteError } = await supabase.client
      .from('zwift_api_race_results')
      .delete()
      .ilike('event_id', '5000%');
    
    if (deleteError) {
      logger.error('Error deleting seed data:', deleteError);
    } else {
      logger.info('✅ Seed data verwijderd');
    }
    
    // Step 3: Fetch results voor elke rider (laatste 30 dagen)
    const results: RaceResult[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    for (const rider of riders.slice(0, 5)) { // Start met eerste 5 riders
      try {
        logger.info(`🔍 Fetch results voor ${rider.name} (${rider.zwift_id})...`);
        
        // Haal rider results op via ZwiftRacing API
        const apiResults = await zwiftApiClient.getRiderResults(rider.zwift_id);
        
        if (!apiResults || apiResults.length === 0) {
          logger.warn(`   Geen results gevonden voor ${rider.name}`);
          continue;
        }
        
        // Filter laatste 30 dagen
        const recentResults = apiResults.filter((result: any) => {
          const resultDate = new Date(result.eventDate);
          return resultDate >= cutoffDate;
        });
        
        logger.info(`   Gevonden: ${recentResults.length} results (laatste 30 dagen)`);
        
        // Converteer naar database format
        for (const result of recentResults.slice(0, 10)) { // Max 10 per rider
          results.push({
            eventId: result.eventId.toString(),
            eventName: result.eventName || 'Unknown Event',
            eventDate: new Date(result.eventDate),
            riderId: rider.zwift_id,
            riderName: rider.name,
            rank: result.rank || 0,
            timeSeconds: result.timeInSeconds || 0,
            avgWkg: result.avgWkg || 0,
            pen: result.category || result.pen || 'A',
            totalRiders: result.totalRiders || 0,
            veloRating: result.velo || result.veloRating || null,
            veloPrevious: null, // TODO: Calculate from history
            veloChange: result.veloChange || 0,
            power5s: result.power5s || null,
            power15s: result.power15s || null,
            power30s: result.power30s || null,
            power1m: result.power1m || null,
            power2m: result.power2m || null,
            power5m: result.power5m || null,
            power20m: result.power20m || null,
            effortScore: result.effortScore || null,
            racePoints: result.racePoints || null,
            deltaWinnerSeconds: result.deltaToWinner || null,
          });
        }
        
        // Rate limiting: wacht 1 seconde tussen riders
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        logger.error(`Error fetching results voor ${rider.name}:`, error);
      }
    }
    
    logger.info(`\n📦 Totaal results verzameld: ${results.length}`);
    
    if (results.length === 0) {
      logger.warn('⚠️  Geen results om te inserten');
      return;
    }
    
    // Step 4: Insert results in database
    logger.info('💾 Insert results in database...');
    
    const { data, error } = await supabase.client
      .from('zwift_api_race_results')
      .insert(
        results.map(r => ({
          event_id: r.eventId,
          event_name: r.eventName,
          event_date: r.eventDate.toISOString(),
          rider_id: r.riderId,
          rider_name: r.riderName,
          rank: r.rank,
          time_seconds: r.timeSeconds,
          avg_wkg: r.avgWkg,
          pen: r.pen,
          total_riders: r.totalRiders,
          velo_rating: r.veloRating,
          velo_previous: r.veloPrevious,
          velo_change: r.veloChange,
          power_5s: r.power5s,
          power_15s: r.power15s,
          power_30s: r.power30s,
          power_1m: r.power1m,
          power_2m: r.power2m,
          power_5m: r.power5m,
          power_20m: r.power20m,
          effort_score: r.effortScore,
          race_points: r.racePoints,
          delta_winner_seconds: r.deltaWinnerSeconds,
        }))
      )
      .select();
    
    if (error) {
      logger.error('❌ Error inserting results:', error);
      throw error;
    }
    
    logger.info(`✅ Success! ${data?.length || 0} results geïnsert`);
    
    // Step 5: Toon samenvatting
    const { data: summary } = await supabase.client
      .from('zwift_api_race_results')
      .select('event_id, event_name, rider_name, rank, velo_rating')
      .order('event_date', { ascending: false })
      .limit(10);
    
    logger.info('\n📊 Laatste 10 results:');
    summary?.forEach(r => {
      logger.info(`   ${r.event_name} - ${r.rider_name} (Rank ${r.rank}, vELO ${r.velo_rating || 'N/A'})`);
    });
    
    logger.info('\n🎉 Real-time results sync voltooid!');
    
  } catch (error) {
    logger.error('❌ Fatal error tijdens sync:', error);
    throw error;
  }
}

// Run script
syncTeamResults()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Script failed:', error);
    process.exit(1);
  });
