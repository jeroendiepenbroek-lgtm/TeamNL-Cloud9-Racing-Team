/**
 * Supabase Client voor directe database toegang
 */
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export class SupabaseService {
    client;
    constructor() {
        this.client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    }
    // ========== CLUBS ==========
    async getClub(clubId) {
        const { data, error } = await this.client
            .from('clubs')
            .select('*')
            .eq('id', clubId)
            .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no rows
        if (error)
            throw error;
        return data;
    }
    async upsertClub(club) {
        const { data, error } = await this.client
            .from('clubs')
            .upsert(club, { onConflict: 'id' })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    // ========== RIDERS ==========
    async getRiders(clubId) {
        let query = this.client.from('riders').select('*');
        if (clubId) {
            query = query.eq('club_id', clubId);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data || [];
    }
    async getRiderIdsByClub(clubId) {
        const { data, error } = await this.client
            .from('riders')
            .select('rider_id')
            .eq('club_id', clubId);
        if (error)
            throw error;
        return (data || []).map(r => r.rider_id);
    }
    // Get ALL rider IDs from riders table (our team members)
    // UNIFIED: Use same fallback logic as getMyTeamMembers() for consistency
    async getAllTeamRiderIds() {
        // Try view_my_team first (correct source via my_team_members)
        try {
            const { data, error } = await this.client
                .from('view_my_team')
                .select('rider_id');
            if (error)
                throw error;
            if (data && data.length > 0) {
                return data.map((r) => r.rider_id);
            }
        }
        catch (viewError) {
            console.warn('view_my_team not available, falling back to riders table:', viewError);
        }
        // Fallback: All riders in riders table (same as Matrix fallback)
        const { data, error } = await this.client
            .from('riders')
            .select('rider_id');
        if (error)
            throw error;
        return (data || []).map((r) => r.rider_id);
    }
    async getRider(riderId) {
        const { data, error } = await this.client
            .from('riders')
            .select('*')
            .eq('rider_id', riderId)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        return data;
    }
    async upsertRiders(riders) {
        // Strip generated or read-only columns before upsert
        // Be defensief: verwijder expliciet bekende generated kolommen en gooi
        // properties weg die expliciet undefined zijn om per ongeluk setten te voorkomen.
        const GENERATED_COLUMNS = ['watts_per_kg', 'rider_created_at', 'rider_updated_at', 'created_at', 'updated_at'];
        const cleaned = riders.map(r => {
            const copy = { ...r };
            // Remove known generated/read-only columns if present
            for (const col of GENERATED_COLUMNS) {
                if (col in copy)
                    delete copy[col];
            }
            // Remove any keys that are explicitly undefined (avoid sending e.g. {foo: undefined})
            for (const k of Object.keys(copy)) {
                if (copy[k] === undefined)
                    delete copy[k];
            }
            return copy;
        });
        const { data, error } = await this.client
            .from('riders')
            .upsert(cleaned, { onConflict: 'rider_id' })
            .select();
        if (error)
            throw error;
        return data;
    }
    // ========== EVENTS ==========
    async getEvents(clubId) {
        let query = this.client.from('zwift_api_events').select('*');
        if (clubId) {
            query = query.eq('club_id', clubId);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data || [];
    }
    // Get raw upcoming events (for schedulers) - alleen event_id, title, time_unix
    async getUpcomingEventsRaw(hours) {
        const now = Math.floor(Date.now() / 1000);
        const future = now + (hours * 60 * 60);
        const { data, error } = await this.client
            .from('zwift_api_events')
            .select('event_id, title, time_unix')
            .gte('time_unix', now)
            .lte('time_unix', future)
            .order('time_unix', { ascending: true });
        if (error) {
            console.error('[SupabaseService] Failed to fetch raw events:', error);
            return [];
        }
        return data || [];
    }
    // Feature 1: Get upcoming events (within X hours)
    async getUpcomingEvents(hours = 36, hasTeamRiders = false) {
        try {
            // Use views die nu ALLE kolommen bevatten (na migratie 015)
            const viewName = hasTeamRiders ? 'view_team_events' : 'view_upcoming_events';
            const { data, error } = await this.client
                .from(viewName)
                .select('*')
                .order('time_unix', { ascending: true });
            if (error) {
                console.warn(`[SupabaseService] View ${viewName} failed, using fallback:`, error);
                throw error;
            }
            return data || [];
        }
        catch (viewError) {
            // Fallback naar directe table query als views niet bestaan
            console.log('[SupabaseService] Using fallback query on zwift_api_events');
            const now = Math.floor(Date.now() / 1000);
            const future = now + (hours * 60 * 60);
            const { data, error } = await this.client
                .from('zwift_api_events')
                .select('*')
                .gte('time_unix', now)
                .lte('time_unix', future)
                .order('time_unix', { ascending: true });
            if (error) {
                console.error('[SupabaseService] Fallback query failed:', error);
                throw error;
            }
            return data || [];
        }
    }
    // Feature 1: Get single event by ID
    async getEvent(eventId) {
        const { data, error } = await this.client
            .from('events')
            .select('*')
            .eq('event_id', eventId)
            .single();
        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            throw error;
        }
        return data;
    }
    // Feature 1: Get event signups
    async getEventSignups(eventId) {
        const { data, error } = await this.client
            .from('event_signups')
            .select(`
        *,
        rider:riders(
          rider_id,
          name,
          zp_category,
          zp_ftp,
          weight,
          race_last_rating
        )
      `)
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data || [];
    }
    // Feature 1: Upsert event signup (TEXT event_id!)
    async upsertEventSignup(signup) {
        const { data, error } = await this.client
            .from('event_signups')
            .upsert(signup, { onConflict: 'event_id,rider_id' })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    // Feature 1: Upsert RAW API events into sourcing table
    async upsertZwiftApiEvents(events) {
        const { data, error } = await this.client
            .from('zwift_api_events')
            .upsert(events, { onConflict: 'event_id' })
            .select();
        if (error)
            throw error;
        return data;
    }
    // Legacy: Keep for backwards compatibility (will use view)
    async upsertEvents(events) {
        // This now points to zwift_api_events via the 'events' view
        console.warn('[Supabase] upsertEvents() is deprecated, use upsertZwiftApiEvents()');
        const { data, error } = await this.client
            .from('zwift_api_events')
            .upsert(events, { onConflict: 'event_id' })
            .select();
        if (error)
            throw error;
        return data;
    }
    // ========== RESULTS ==========
    async getEventResults(eventId) {
        const { data, error } = await this.client
            .from('results')
            .select('*')
            .eq('event_id', eventId);
        if (error)
            throw error;
        return data || [];
    }
    async upsertResults(results) {
        const { data, error } = await this.client
            .from('results')
            .upsert(results)
            .select();
        if (error)
            throw error;
        return data;
    }
    // ========== RIDER HISTORY ==========
    async getRiderHistory(riderId) {
        const { data, error } = await this.client
            .from('rider_history')
            .select('*')
            .eq('rider_id', riderId)
            .order('snapshot_date', { ascending: false });
        if (error)
            throw error;
        return data || [];
    }
    async insertRiderHistory(history) {
        const { data, error } = await this.client
            .from('rider_history')
            .insert(history)
            .select();
        if (error)
            throw error;
        return data;
    }
    // ========== SYNC LOGS ==========
    async getSyncLogs(limit = 50) {
        const { data, error } = await this.client
            .from('sync_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error)
            throw error;
        return data || [];
    }
    async createSyncLog(log) {
        const { data, error } = await this.client
            .from('sync_logs')
            .insert(log)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async updateSyncLog(id, updates) {
        const { data, error } = await this.client
            .from('sync_logs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    // ========== MY TEAM MEMBERS ==========
    // Query via VIEW (niet direct riders tabel!)
    async getMyTeamMembers() {
        // Try view_racing_data_matrix first (has all the racing stats)
        try {
            const { data, error } = await this.client
                .from('view_racing_data_matrix')
                .select('*')
                .order('race_last_rating', { ascending: false, nullsFirst: false }); // DESC = hoogste rating eerst
            if (error)
                throw error;
            if (data && data.length > 0)
                return data;
        }
        catch (matrixError) {
            console.warn('view_racing_data_matrix not available, trying view_my_team:', matrixError);
        }
        // Fallback to view_my_team (without problematic sort)
        try {
            const { data, error } = await this.client
                .from('view_my_team')
                .select('*');
            if (error)
                throw error;
            if (data && data.length > 0)
                return data;
        }
        catch (viewError) {
            console.warn('Views not available:', viewError);
        }
        // Final fallback: direct riders table
        console.log('Falling back to riders table');
        const { data, error } = await this.client
            .from('riders')
            .select('*')
            .order('zwift_id', { ascending: true });
        if (error)
            throw error;
        return data || [];
    }
    async addMyTeamMember(riderId) {
        const { data, error } = await this.client
            .from('my_team_members')
            .insert({ rider_id: riderId })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async removeMyTeamMember(riderId) {
        const { error } = await this.client
            .from('my_team_members')
            .delete()
            .eq('rider_id', riderId);
        if (error)
            throw error;
    }
    async bulkAddMyTeamMembers(riderIds) {
        const records = riderIds.map(id => ({ rider_id: id }));
        const { data, error } = await this.client
            .from('my_team_members')
            .upsert(records, { onConflict: 'rider_id' })
            .select();
        if (error)
            throw error;
        return data || [];
    }
    async toggleFavorite(riderId, isFavorite) {
        const { error } = await this.client
            .from('my_team_members')
            .update({ is_favorite: isFavorite })
            .eq('rider_id', riderId);
        if (error)
            throw error;
    }
    // ========== EVENT SIGNUPS ==========
    async upsertEventSignups(signups) {
        if (signups.length === 0)
            return 0;
        const { data, error } = await this.client
            .from('zwift_api_event_signups')
            .upsert(signups, { onConflict: 'event_id,pen_name,rider_id' })
            .select();
        if (error)
            throw error;
        return data?.length || 0;
    }
    async getEventSignupsCount(eventId) {
        const { count, error } = await this.client
            .from('zwift_api_event_signups')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId);
        if (error)
            throw error;
        return count || 0;
    }
    async getTeamSignups(eventId, teamRiderIds) {
        if (teamRiderIds.length === 0)
            return [];
        const { data, error } = await this.client
            .from('zwift_api_event_signups')
            .select('*')
            .eq('event_id', eventId)
            .in('rider_id', teamRiderIds);
        if (error)
            throw error;
        return data || [];
    }
    // US2: Get team signups grouped by category (pen)
    async getTeamSignupsByCategory(eventId, teamRiderIds) {
        if (teamRiderIds.length === 0)
            return {};
        const signups = await this.getTeamSignups(eventId, teamRiderIds);
        // Group by pen_name
        const byCategory = {};
        signups.forEach(signup => {
            const pen = signup.pen_name || 'Unknown';
            if (!byCategory[pen])
                byCategory[pen] = [];
            byCategory[pen].push({
                rider_id: signup.rider_id,
                rider_name: signup.rider_name,
                pen_name: signup.pen_name,
                power_wkg5: signup.power_wkg5,
                race_rating: signup.race_rating,
            });
        });
        return byCategory;
    }
    // Bulk get ALL signups by category for multiple events (US1)
    async getAllSignupsByCategory(eventIds) {
        console.log(`[SupabaseService] getAllSignupsByCategory: ${eventIds.length} events`);
        if (eventIds.length === 0)
            return new Map();
        // STRATEGY: Query .eq() per event (werkt!) ipv .in() bulk query (werkt niet)
        const signupsByEvent = new Map();
        // Process in batches van 20 voor snelheid
        const batchSize = 20;
        for (let i = 0; i < eventIds.length; i += batchSize) {
            const batch = eventIds.slice(i, i + batchSize);
            const promises = batch.map(async (eventId) => {
                const { data, error } = await this.client
                    .from('zwift_api_event_signups')
                    .select('event_id, pen_name')
                    .eq('event_id', eventId);
                if (error) {
                    console.error(`Error for event ${eventId}:`, error);
                    return [];
                }
                return data || [];
            });
            const results = await Promise.all(promises);
            // Group results by event_id
            results.forEach((signups, idx) => {
                if (signups.length > 0) {
                    const eventId = batch[idx];
                    signupsByEvent.set(String(eventId), signups);
                }
            });
        }
        console.log(`[SupabaseService] Found signups for ${signupsByEvent.size}/${eventIds.length} events`);
        return signupsByEvent;
    }
    // Bulk get signup counts for multiple events (optimized)
    async getSignupCountsForEvents(eventIds) {
        if (eventIds.length === 0)
            return new Map();
        const { data, error } = await this.client
            .from('zwift_api_event_signups')
            .select('event_id')
            .in('event_id', eventIds);
        if (error)
            throw error;
        // Count per event_id
        const counts = new Map();
        (data || []).forEach((row) => {
            const count = counts.get(row.event_id) || 0;
            counts.set(row.event_id, count + 1);
        });
        return counts;
    }
    // Bulk get team signups for multiple events (optimized)
    async getTeamSignupsForEvents(eventIds, teamRiderIds) {
        if (eventIds.length === 0 || teamRiderIds.length === 0)
            return new Map();
        // Query .eq() per event, filter team riders in memory
        const teamSignupsByEvent = new Map();
        const teamRiderIdSet = new Set(teamRiderIds);
        // Process in batches
        const batchSize = 20;
        for (let i = 0; i < eventIds.length; i += batchSize) {
            const batch = eventIds.slice(i, i + batchSize);
            const promises = batch.map(async (eventId) => {
                const { data, error } = await this.client
                    .from('zwift_api_event_signups')
                    .select('event_id, rider_id, rider_name, pen_name, power_wkg5, race_rating')
                    .eq('event_id', eventId);
                if (error) {
                    console.error(`Error fetching team signups for event ${eventId}:`, error);
                    return [];
                }
                // Filter voor team riders
                const teamSignups = (data || []).filter((signup) => teamRiderIdSet.has(parseInt(signup.rider_id)));
                return teamSignups;
            });
            const results = await Promise.all(promises);
            // Group by event_id
            results.forEach((signups, idx) => {
                if (signups.length > 0) {
                    const eventId = batch[idx];
                    teamSignupsByEvent.set(String(eventId), signups);
                }
            });
        }
        console.log(`[SupabaseService] Found team signups for ${teamSignupsByEvent.size}/${eventIds.length} events`);
        return teamSignupsByEvent;
    }
    async getSignupsByEventId(eventId) {
        const { data, error } = await this.client
            .from('zwift_api_event_signups')
            .select('rider_id, rider_name, pen_name')
            .eq('event_id', eventId);
        if (error)
            throw error;
        return data || [];
    }
}
export const supabase = new SupabaseService();
//# sourceMappingURL=supabase.service.js.map