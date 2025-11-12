/**
 * Endpoint 3: Events - GET /api/events
 * Feature 1: Events Page (48h lookforward)
 */

import { Request, Response, Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
import { syncService } from '../../services/sync.service.js';

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
    
    let events;
    
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
    
    // Query with signup counts via LEFT JOIN
    const { data, error } = await supabase['client']
      .from('zwift_api_events')
      .select(`
        *,
        event_signups (
          rider_id,
          status,
          pen_name,
          category,
          riders (
            rider_id,
            name,
            zp_category,
            zp_ftp,
            weight
          )
        )
      `)
      .gte('time_unix', now)
      .lte('time_unix', future)
      .order('time_unix', { ascending: true });
    
    if (error) {
      console.error('[Events/Upcoming] Query error:', error);
      throw error;
    }
    
    console.log(`[Events/Upcoming] Found ${data?.length || 0} events`);
    
    // Process events and calculate signup counts
    let processedEvents = (data || []).map((event: any) => {
      const signups = event.event_signups || [];
      const teamRiders = signups.filter((s: any) => s.riders).map((s: any) => s.riders);
      
      return {
        ...event,
        confirmed_signups: signups.filter((s: any) => s.status === 'confirmed').length,
        tentative_signups: signups.filter((s: any) => s.status === 'tentative').length,
        total_signups: signups.length,
        team_rider_count: teamRiders.length,
        team_riders: teamRiders,
      };
    });
    
    // Filter for team events if requested
    if (hasTeamRiders) {
      processedEvents = processedEvents.filter((e: any) => e.team_rider_count > 0);
    }
    
    events = processedEvents;
    
    // Transform time_unix to event_date for frontend compatibility
    const transformedEvents = events.map((event: any) => ({
      ...event,
      event_id: parseInt(event.event_id) || event.event_id,  // Try parse to number for compatibility
      name: event.title || event.name,  // Use title as name
      event_date: new Date(event.time_unix * 1000).toISOString(),  // Convert Unix to ISO
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
