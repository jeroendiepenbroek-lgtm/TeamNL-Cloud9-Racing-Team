/**
 * Endpoint 3: Events - GET /api/events
 * Feature 1: Events Page (48h lookforward)
 */

import { Request, Response, Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
import { syncService } from '../../services/sync.service.js';
import { zwiftClient } from '../zwift-client.js'; // US11

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

// GET /api/events/upcoming - Haal aankomende events op (binnen 48 uur)
// Feature 1: Events Page - Main endpoint
router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const hours = req.query.hours ? parseInt(req.query.hours as string) : 48;
    const hasTeamRiders = req.query.hasTeamRiders === 'true';
    
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
    
    // Get upcoming events from database
    const baseEvents = await supabase.getUpcomingEvents(hours, false);
    
    console.log(`[Events/Upcoming] Found ${baseEvents.length} events`);
    
    // Get ALL team rider IDs (all riders in our riders table, regardless of club_id)
    const teamRiderIds = await supabase.getAllTeamRiderIds();
    console.log(`[Events/Upcoming] Team has ${teamRiderIds.length} riders (from view_my_team)`);
    
    // Bulk fetch signup data for ALL events (optimized - 2 queries instead of N×2)
    const eventIds = baseEvents.map(e => String(e.event_id)); // Convert to string for consistent lookups
    const signupCounts = await supabase.getSignupCountsForEvents(eventIds);
    const teamSignupsByEvent = await supabase.getTeamSignupsForEvents(eventIds, teamRiderIds);
    
    console.log(`[Events/Upcoming] Fetched signup data for ${eventIds.length} events`);
    
    // Bulk fetch ALL signup data for category counts (US1)
    const allSignupsByEvent = await supabase.getAllSignupsByCategory(eventIds);
    
    // Enrich events with signup data
    const enrichedEvents = baseEvents.map((event: any) => {
      const eventIdStr = String(event.event_id); // Consistent string key
      const totalSignups = signupCounts.get(eventIdStr) || 0;
      const teamSignups = teamSignupsByEvent.get(eventIdStr) || [];
      const allSignups = allSignupsByEvent.get(eventIdStr) || [];
      
      // US1: Count signups per category from ALL signups
      const signupsByCategory: Record<string, number> = {};
      allSignups.forEach(signup => {
        const pen = signup.pen_name || 'Unknown';
        signupsByCategory[pen] = (signupsByCategory[pen] || 0) + 1;
      });
      
      // Group team signups by category
      const teamSignupsByCategory: Record<string, any[]> = {};
      teamSignups.forEach(signup => {
        const pen = signup.pen_name || 'Unknown';
        if (!teamSignupsByCategory[pen]) teamSignupsByCategory[pen] = [];
        teamSignupsByCategory[pen].push({
          rider_id: signup.rider_id,
          rider_name: signup.rider_name,
          power_wkg5: signup.power_wkg5,
          race_rating: signup.race_rating,
        });
      });
      
      return {
        ...event,
        total_signups: totalSignups,
        team_rider_count: teamSignups.length,
        team_riders: teamSignups.map(s => ({
          rider_id: s.rider_id,
          rider_name: s.rider_name,
          pen_name: s.pen_name,
        })),
        team_signups_by_category: teamSignupsByCategory,
        // US1: Signups per category
        signups_by_category: signupsByCategory,
        categories: Object.keys(signupsByCategory).sort(),
        // US3: Distance & elevation from database (distance_meters is already × 1000)
        distance_km: event.distance_meters ? (event.distance_meters / 1000000).toFixed(1) : null,
        elevation_m: event.elevation_meters || null,
      };
    });
    
    console.log(`[Events/Upcoming] Enriched ${enrichedEvents.length} events with signup data`);
    
    // Filter logic
    let events = enrichedEvents;
    if (hasTeamRiders) {
      events = enrichedEvents.filter((e: any) => e.team_rider_count > 0);
      console.log(`[Events/Upcoming] Filtered to ${events.length} events with team riders`);
    }
    
    // Transform time_unix to event_date for frontend compatibility
    // US11 & US4: Add route profile and route info lookup
    const transformedEvents = await Promise.all(events.map(async (event: any) => {
      // US4: Try to get full route info by distance
      let routeInfo: any = null;
      let routeProfile: string | null = null;
      
      if (event.distance_km) {
        const distanceKm = parseFloat(event.distance_km);
        if (!isNaN(distanceKm)) {
          routeInfo = await zwiftClient.getRouteByDistance(
            distanceKm,
            event.route_world || undefined
          );
          routeProfile = routeInfo?.profile || null;
        }
      }
      
      return {
        ...event,
        event_id: parseInt(event.event_id) || event.event_id,
        name: event.title || event.name,
        event_date: new Date(event.time_unix * 1000).toISOString(),
        // US4: Add route info if found
        route_name: routeInfo?.name || event.route_name || null,
        route_world: routeInfo?.world || event.route_world || null,
        laps: routeInfo?.laps || event.laps || null,
        route_profile: routeProfile, // US11: Flat, Rolling, Hilly, Mountainous
      };
    }));
    
    res.json({
      count: transformedEvents.length,
      lookforward_hours: hours,
      has_team_riders_only: hasTeamRiders,
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
    const result = await syncService.bulkImportUpcomingEvents();
    
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
    const result = await syncService.syncRiderUpcomingEvents(hours);
    
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
