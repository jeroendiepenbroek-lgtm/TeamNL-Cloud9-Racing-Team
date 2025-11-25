/**
 * API Endpoint: Sync Real Results
 * POST /api/sync/real-results - Vervangt seed data met echte results
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../../services/supabase.service.js';
import { zwiftClient } from '../../api/zwift-client.js';

const router = Router();

/**
 * POST /api/sync/real-results
 * Haal echte race results op voor team members en vervang seed data
 */
router.post('/real-results', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Start real-time results sync');
    
    // Step 1: Get team riders
    const riders = await supabase.getRiders();
    console.log(`📊 Found ${riders.length} riders`);
    
    if (riders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No riders found. Run club sync first.'
      });
    }
    
    // Step 2: Delete seed data
    console.log('🗑️  Deleting seed data...');
    await supabase.deleteResultsByEventIdPattern('5000%');
    
    // Step 3: Fetch recent events (laatste 30 dagen)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    const allResults: any[] = [];
    const teamRiderIds = riders.map(r => r.rider_id);
    
    // Strategy: Haal events op waar team members in zitten
    // We gebruiken de bestaande zwift_api_events tabel als bron
    const events = await supabase.getRecentEvents(30); // laatste 30 dagen
    
    console.log(`📅 Found ${events.length} recent events`);
    
    // Voor elk event: haal results op en filter team members
    let processedEvents = 0;
    let totalResults = 0;
    
    for (const event of events.slice(0, 10)) { // Max 10 events voor snelheid
      try {
        console.log(`🔍 Fetching results for event ${event.event_id}...`);
        
        const eventResults = await zwiftClient.getEventResults(event.event_id);
        
        // Filter alleen team members (cast naar any voor flexible API response)
        const apiResults: any[] = eventResults as any[];
        const totalParticipants = apiResults.length; // 🎯 Totaal aantal deelnemers VOOR filtering
        const teamResults = apiResults.filter((result: any) => 
          teamRiderIds.includes(result.riderId || result.rider_id)
        );
        
        if (teamResults.length > 0) {
          console.log(`   Found ${teamResults.length} team results uit ${totalParticipants} deelnemers`);
          
          // Converteer naar database format
          for (const result of teamResults) {
            const riderZwiftId = result.riderId || result.rider_id;
            const rider = riders.find(r => r.rider_id === riderZwiftId);
            
            allResults.push({
              event_id: event.event_id.toString(),
              event_name: event.name || 'Unknown Event',
              event_date: event.event_start,
              rider_id: riderZwiftId,
              rider_name: rider?.name || result.riderName || result.name || 'Unknown',
              rank: result.rank || result.position || 0,
              time_seconds: result.timeInSeconds || result.time_seconds || 0,
              avg_wkg: result.avgWkg || result.avg_wkg || 0,
              pen: result.category || result.pen || 'A',
              total_riders: totalParticipants, // 🎯 FIX: Gebruik totaal aantal, niet gefilterd
              velo_rating: result.velo || result.veloRating || result.velo_rating || null,
              velo_previous: result.veloPrevious || result.velo_previous || null,
              velo_change: result.veloChange || result.velo_change || 0,
              heartrate_avg: result.heartrateAvg || result.heartrate_avg || result.hrAvg || null, // 🎯 NEW: Heartrate
              heartrate_max: result.heartrateMax || result.heartrate_max || result.hrMax || null, // 🎯 NEW: Heartrate
              position: result.position || result.rank || null, // 🎯 NEW: Overall position
              position_in_category: result.positionInCategory || result.position_in_category || result.categoryRank || null, // 🎯 NEW: Category position
              power_5s: result.power5s || result.power_5s || null,
              power_15s: result.power15s || result.power_15s || null,
              power_30s: result.power30s || result.power_30s || null,
              power_1m: result.power1m || result.power_1m || null,
              power_2m: result.power2m || result.power_2m || null,
              power_5m: result.power5m || result.power_5m || null,
              power_20m: result.power20m || result.power_20m || null,
              effort_score: result.effortScore || result.effort_score || null,
              race_points: result.racePoints || result.race_points || null,
              delta_winner_seconds: result.deltaToWinner || result.delta_winner_seconds || null,
            });
          }
          
          totalResults += teamResults.length;
        }
        
        processedEvents++;
        
        // Rate limiting: 1 request per minute voor results
        if (processedEvents < events.length) {
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
        
      } catch (error) {
        console.error(`Error fetching event ${event.event_id}:`, error);
      }
    }
    
    console.log(`\n📦 Total results collected: ${allResults.length}`);
    
    if (allResults.length === 0) {
      return res.json({
        success: true,
        message: 'No team results found in recent events',
        results_synced: 0
      });
    }
    
    // Step 4: Insert results
    console.log('💾 Inserting results...');
    const inserted = await supabase.upsertResults(allResults);
    
    console.log(`✅ Synced ${inserted.length} results`);
    
    res.json({
      success: true,
      events_processed: processedEvents,
      results_synced: inserted.length,
      riders_involved: new Set(allResults.map(r => r.rider_id)).size
    });
    
  } catch (error: any) {
    console.error('❌ Real results sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Sync failed'
    });
  }
});

export default router;
