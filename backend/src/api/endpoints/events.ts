/**
 * Endpoint 3: Events - GET /api/events
 * Feature 1: Events Page (36h lookforward)
 */

import { Request, Response, Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
import { syncServiceV2 as syncService } from '../../services/sync-v2.service.js';
import { zwiftClient } from '../zwift-client.js'; // US11
import { syncConfigService } from '../../services/sync-config.service.js'; // US: Dynamic lookforward

const router = Router();

// GET /api/events - Haal alle events op (optioneel gefilterd op club)
router.get('/', async (req: Request, res: Response) => {
  try {
    const clubId = req.query.clubId ? parseInt(req.query.clubId as string) : undefined;
    const events = await supabase.getEvents(clubId);
    
    res.json({
      count: events.length,
      events,
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Fout bij ophalen events' });
  }
});

// GET /api/events/upcoming - Haal aankomende events op (dynamisch via config)
// Feature 1: Events Page - Main endpoint
router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    // US: Gebruik lookforwardHours uit config (standaard 36, maar kan aangepast worden naar 24)
    const config = syncConfigService.getConfig();
    const hours = req.query.hours ? parseInt(req.query.hours as string) : config.lookforwardHours;
    const hasTeamRiders = req.query.hasTeamRiders === 'true';
    
    // US1: Pagination restrictie verwijderd - toon alle events in lookforward periode
    // Frontend gebruikt nu volledige dataset zonder limit
    
    // Calculate time window
    const now = Math.floor(Date.now() / 1000);
    const future = now + (hours * 60 * 60);
    
    console.log(`[Events/Upcoming] Query params:`, {
      now,
      future,
      now_date: new Date(now * 1000).toISOString(),
      future_date: new Date(future * 1000).toISOString(),
      hours,
      hasTeamRiders
    });
    
    // Get upcoming events from database (ALL events in lookforward period)
    const baseEvents = await supabase.getUpcomingEvents(hours, false);
    const totalEvents = baseEvents.length;
    
    console.log(`[Events/Upcoming] Found ${totalEvents} total events - processing ALL`);
    
    
    // Get ALL team rider IDs (all riders in our riders table, regardless of club_id)
    const teamRiderIds = await supabase.getAllTeamRiderIds();
    console.log(`[Events/Upcoming] Team has ${teamRiderIds.length} riders (from view_my_team)`);
    
    // US2: Bulk fetch signup data for ALL events (optimized - 2 queries instead of N×2)
    // CRITICAL: event_id consistency - zwift_api_events en zwift_api_event_signups beide gebruiken TEXT
    const eventIds = baseEvents.map((e: any) => String(e.event_id));
    
    console.log(`[Events/Upcoming] Processing ${eventIds.length} event IDs (sample):`, eventIds.slice(0, 3));
    
    const signupCounts = await supabase.getSignupCountsForEvents(eventIds);
    const teamSignupsByEvent = await supabase.getTeamSignupsForEvents(eventIds, teamRiderIds);
    
    console.log(`[Events/Upcoming] Fetched signup data for ${eventIds.length} events`);
    
    // US4 & US11: Bulk fetch ALL signup data for category counts
    const allSignupsByEvent = await supabase.getAllSignupsByCategory(eventIds);
    console.log(`[Events/Upcoming] allSignupsByEvent size: ${allSignupsByEvent.size}, sample keys:`, Array.from(allSignupsByEvent.keys()).slice(0, 3));
    
    // Enrich events with signup data
    const enrichedEvents = baseEvents.map((event: any) => {
      const eventIdStr = String(event.event_id); // Consistent string key
      const teamSignups = teamSignupsByEvent.get(eventIdStr) || [];
      const allSignups = allSignupsByEvent.get(eventIdStr) || [];
      
      if (allSignups.length > 0) {
        console.log(`[Events/Upcoming] Event ${eventIdStr} has ${allSignups.length} signups`);
      }
      
      // US11: Count signups per category from ALL signups
      // Merge A+ into A category
      const signupsByCategory: Record<string, number> = {};
      allSignups.forEach(signup => {
        let pen = signup.pen_name || 'Unknown';
        // Merge A+ into A
        if (pen === 'A+') pen = 'A';
        signupsByCategory[pen] = (signupsByCategory[pen] || 0) + 1;
      });
      
      // US4: Total signups = actual count from allSignups (inclusief team riders)
      const totalSignups = allSignups.length;
      
      // US12: Group team signups by category (alleen namen, geen stats)
      const teamSignupsByCategory: Record<string, any[]> = {};
      teamSignups.forEach(signup => {
        let pen = signup.pen_name || 'Unknown';
        // Merge A+ into A
        if (pen === 'A+') pen = 'A';
        if (!teamSignupsByCategory[pen]) teamSignupsByCategory[pen] = [];
        teamSignupsByCategory[pen].push({
          rider_id: signup.rider_id,
          rider_name: signup.rider_name,
        });
      });
      
      return {
        ...event,
        // US4: Signups (totaal inclusief team)
        total_signups: totalSignups,
        team_rider_count: teamSignups.length,
        team_riders: teamSignups.map(s => ({
          rider_id: s.rider_id,
          rider_name: s.rider_name,
          pen_name: s.pen_name,
        })),
        // US12: Team signups gegroepeerd per categorie
        team_signups_by_category: teamSignupsByCategory,
        // US11: Signups per category (A, B, C, D, E)
        signups_by_category: signupsByCategory,
        categories: Object.keys(signupsByCategory).sort(),
        // US1: Distance correct berekenen (meters → km)
        distance_km: event.distance_meters ? (event.distance_meters / 1000).toFixed(1) : null,
        // US2: Elevation uit database (elevation_m kolom)
        elevation_m: event.elevation_m || null,
        // US3: Event type
        event_type: event.event_type || null,
        sub_type: event.sub_type || null,
        // US4: Route info uit database
        route_name: event.route_name || null,
        // US5: Wereld
        route_world: event.route_world || null,
        // US6: Route profiel uit database
        route_profile: event.route_profile || null,
      };
    });
    
    console.log(`[Events/Upcoming] Enriched ${enrichedEvents.length} events with signup data`);
    
    // Filter logic
    let events = enrichedEvents;
    if (hasTeamRiders) {
      events = enrichedEvents.filter((e: any) => e.team_rider_count > 0);
      console.log(`[Events/Upcoming] Filtered to ${events.length} events with team riders`);
    }
    
    // PERFORMANCE FIX: Route info uit DATABASE, geen externe API calls per event
    // Route profiles zijn al gecached in memory via zwiftClient.getAllRoutes()
    const transformedEvents = events.map((event: any) => {
      // US10: Route profile lookup uit cache (geen async calls!)
      let routeProfile: string | null = null;
      
      // Gebruik gecachede route data (geladen bij server startup)
      if (event.route_id) {
        const cachedRoute = zwiftClient.getCachedRouteById(event.route_id);
        routeProfile = cachedRoute?.profile || null;
      }
      // Fallback: bereken profile op basis van elevation/distance ratio
      if (!routeProfile && event.elevation_m && event.distance_km) {
        const elevationPerKm = event.elevation_m / parseFloat(event.distance_km);
        if (elevationPerKm < 5) routeProfile = 'flat';
        else if (elevationPerKm < 10) routeProfile = 'rolling';
        else if (elevationPerKm < 15) routeProfile = 'hilly';
        else routeProfile = 'mountainous';
      }
      
      return {
        ...event,
        // US2: Event ID consistency
        event_id: event.event_id,
        name: event.title || event.name,
        // US5: Event date for 48h window calculation
        event_date: new Date(event.time_unix * 1000).toISOString(),
        // US2: Route info - Database first (geen API fallback meer)
        route_id: event.route_id || null,
        route_name: event.route_name || null,
        route_world: event.route_world || null,
        // US10: Route profile badge (uit cache of berekend)
        route_profile: routeProfile || null,
        // Data fields
        distance_km: event.distance_km,
        elevation_m: event.elevation_m,
        total_signups: event.total_signups,
        team_rider_count: event.team_rider_count,
        team_riders: event.team_riders,
        team_signups_by_category: event.team_signups_by_category,
        signups_by_category: event.signups_by_category,
        categories: event.categories,
      };
    });
    
    // US1: Response zonder pagination - alle events
    res.json({
      count: transformedEvents.length,
      total: totalEvents,
      hours,
      events: transformedEvents,
    });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Fout bij ophalen aankomende events' });
  }
});

// DEBUG: GET /api/events/debug - Toon ALL events in database
router.get('/debug', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase['client']
      .from('zwift_api_events')
      .select('event_id, title, time_unix')
      .order('time_unix', { ascending: true })
      .limit(50);
    
    if (error) throw error;
    
    const now = Math.floor(Date.now() / 1000);
    
    const eventsWithTime = (data || []).map((e: any) => ({
      ...e,
      time_date: new Date(e.time_unix * 1000).toISOString(),
      hours_until: ((e.time_unix - now) / 3600).toFixed(1),
      in_past: e.time_unix < now
    }));
    
    res.json({
      current_time_unix: now,
      current_time: new Date(now * 1000).toISOString(),
      total_in_db: eventsWithTime.length,
      events: eventsWithTime
    });
  } catch (error) {
    console.error('Error fetching debug events:', error);
    res.status(500).json({ error: 'Fout bij ophalen debug events' });
  }
});

// GET /api/events/:eventId - Haal details van specifiek event op
// Feature 1: Event details page
router.get('/:eventId', async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId);
    
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Ongeldige event ID' });
    }
    
    const event = await supabase.getEvent(eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event niet gevonden' });
    }
    
    // Include signups
    const signups = await supabase.getEventSignups(eventId);
    
    res.json({
      ...event,
      signups: {
        count: signups.length,
        riders: signups,
      },
    });
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({ error: 'Fout bij ophalen event details' });
  }
});

// GET /api/events/:eventId/signups - Haal inschrijvingen voor event op
router.get('/:eventId/signups', async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId);
    
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Ongeldige event ID' });
    }
    
    const signups = await supabase.getEventSignups(eventId);
    
    res.json({
      event_id: eventId,
      count: signups.length,
      signups,
    });
  } catch (error) {
    console.error('Error fetching event signups:', error);
    res.status(500).json({ error: 'Fout bij ophalen event inschrijvingen' });
  }
});

// POST /api/events/sync - Sync events vanaf ZwiftRacing API
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const result = await syncService.syncEventsCombined({ 
      intervalMinutes: 60,
      thresholdMinutes: 30,
      lookforwardHours: 168,
      mode: 'full_scan'
    });
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error syncing events:', error);
    res.status(500).json({ error: 'Fout bij synchroniseren events' });
  }
});

// POST /api/events/sync/rider-events - Sync events voor alle riders (Feature 1)
// Scans all riders for their upcoming events
router.post('/sync/rider-events', async (req: Request, res: Response) => {
  try {
    const hours = req.body.hours || 48;
    const result = await syncService.syncEventsCombined({ 
      intervalMinutes: 60,
      thresholdMinutes: 30,
      lookforwardHours: hours,
      mode: 'near_only'
    });
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error syncing rider events:', error);
    res.status(500).json({ error: 'Fout bij synchroniseren rider events' });
  }
});

export default router;
