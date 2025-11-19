/**
 * Event Cleanup Service
 *
 * Regels:
 * 1. Bewaar ALLEEN events uit het verleden waar teamleden aan meededen
 * 2. Bewaar voor max 100 dagen
 * 3. Delete de rest (performance + storage optimalisatie)
 */
import { supabase } from './supabase.service.js';
export class EventCleanupService {
    /**
     * Clean oude events volgens regels:
     * - DELETE events ouder dan 100 dagen
     * - DELETE toekomstige events ouder dan 48h die geen team signups hebben
     * - KEEP events waar teamleden aan meededen (max 100 dagen)
     */
    async cleanupOldEvents() {
        const now = Math.floor(Date.now() / 1000);
        const hundredDaysAgo = now - (100 * 24 * 60 * 60);
        const twoDaysAgo = now - (2 * 24 * 60 * 60);
        console.log(`[Cleanup] Starting event cleanup...`);
        console.log(`[Cleanup] Now: ${new Date(now * 1000).toISOString()}`);
        console.log(`[Cleanup] 100 days ago: ${new Date(hundredDaysAgo * 1000).toISOString()}`);
        // Stap 1: Get team member Zwift IDs
        const teamMembers = await supabase.getRiders();
        const teamZwiftIds = new Set(teamMembers.map(r => r.rider_id.toString()));
        console.log(`[Cleanup] Team heeft ${teamZwiftIds.size} actieve leden`);
        // Stap 2: Get all events in verleden (ouder dan 2 dagen geleden)
        const { data: pastEvents, error: fetchError } = await supabase.client
            .from('zwift_api_events')
            .select('id, event_id, title, time_unix')
            .lt('time_unix', twoDaysAgo)
            .order('time_unix', { ascending: false });
        if (fetchError) {
            console.error('[Cleanup] Error fetching past events:', fetchError);
            throw fetchError;
        }
        console.log(`[Cleanup] Found ${pastEvents?.length || 0} events in past (>2 days ago)`);
        if (!pastEvents || pastEvents.length === 0) {
            return { deleted_old: 0, deleted_no_team: 0, kept_with_team: 0 };
        }
        // Stap 3: Check voor elk event of teamleden meededen
        const eventsToDelete = [];
        const eventsToKeep = [];
        for (const event of pastEvents) {
            const isTooOld = event.time_unix < hundredDaysAgo;
            // Check signups voor dit event
            const { data: signups, error: signupsError } = await supabase.client
                .from('zwift_api_event_signups')
                .select('rider_id')
                .eq('event_id', event.event_id);
            if (signupsError) {
                console.warn(`[Cleanup] Error checking signups for event ${event.event_id}:`, signupsError);
                continue;
            }
            const hasTeamParticipants = signups?.some(s => teamZwiftIds.has(s.rider_id.toString())) || false;
            if (isTooOld) {
                // Ouder dan 100 dagen: ALTIJD deleten
                eventsToDelete.push(event.id);
                console.log(`[Cleanup] DELETE (>100d): ${event.title} (${new Date(event.time_unix * 1000).toISOString()})`);
            }
            else if (!hasTeamParticipants) {
                // Jonger dan 100d maar geen team: delete
                eventsToDelete.push(event.id);
                console.log(`[Cleanup] DELETE (no team): ${event.title}`);
            }
            else {
                // Heeft team participants en <100d: bewaren!
                eventsToKeep.push({
                    id: event.id,
                    event_id: event.event_id,
                    reason: 'team_participated'
                });
                console.log(`[Cleanup] KEEP: ${event.title} (team participated)`);
            }
        }
        // Stap 4: Execute deletes in batches van 100
        let totalDeleted = 0;
        const batchSize = 100;
        for (let i = 0; i < eventsToDelete.length; i += batchSize) {
            const batch = eventsToDelete.slice(i, i + batchSize);
            const { error: deleteError } = await supabase.client
                .from('zwift_api_events')
                .delete()
                .in('id', batch);
            if (deleteError) {
                console.error(`[Cleanup] Error deleting batch:`, deleteError);
            }
            else {
                totalDeleted += batch.length;
                console.log(`[Cleanup] Deleted batch: ${batch.length} events (total: ${totalDeleted}/${eventsToDelete.length})`);
            }
        }
        // Stap 5: Cleanup orphaned signups (events die niet meer bestaan)
        const { error: orphanError } = await supabase.client
            .rpc('delete_orphaned_signups');
        if (orphanError && !orphanError.message.includes('does not exist')) {
            console.warn('[Cleanup] Could not delete orphaned signups:', orphanError);
        }
        const result = {
            deleted_old: totalDeleted,
            deleted_no_team: eventsToDelete.length - totalDeleted,
            kept_with_team: eventsToKeep.length
        };
        console.log(`[Cleanup] ✅ Cleanup completed:`, result);
        return result;
    }
    /**
     * Clean future events zonder team signups (ouder dan 48h)
     * Deze zijn niet meer relevant en nemen ruimte in
     */
    async cleanupStaleUpcomingEvents() {
        const now = Math.floor(Date.now() / 1000);
        const twoDaysFromNow = now + (2 * 24 * 60 * 60);
        console.log(`[Cleanup] Cleaning stale upcoming events (>48h in future, no team)...`);
        // Get team member IDs
        const teamMembers = await supabase.getRiders();
        const teamZwiftIds = new Set(teamMembers.map(r => r.rider_id.toString()));
        // Get upcoming events >48h in future
        const { data: futureEvents, error: fetchError } = await supabase.client
            .from('zwift_api_events')
            .select('id, event_id, title, time_unix')
            .gte('time_unix', now)
            .gt('time_unix', twoDaysFromNow);
        if (fetchError || !futureEvents) {
            console.error('[Cleanup] Error fetching future events:', fetchError);
            return 0;
        }
        console.log(`[Cleanup] Checking ${futureEvents.length} future events >48h out`);
        const eventsToDelete = [];
        for (const event of futureEvents) {
            const { data: signups } = await supabase.client
                .from('zwift_api_event_signups')
                .select('rider_id')
                .eq('event_id', event.event_id);
            const hasTeamSignups = signups?.some(s => teamZwiftIds.has(s.rider_id.toString())) || false;
            if (!hasTeamSignups) {
                eventsToDelete.push(event.id);
            }
        }
        if (eventsToDelete.length === 0) {
            console.log('[Cleanup] No stale upcoming events to delete');
            return 0;
        }
        // Delete in batches
        let deleted = 0;
        const batchSize = 100;
        for (let i = 0; i < eventsToDelete.length; i += batchSize) {
            const batch = eventsToDelete.slice(i, i + batchSize);
            const { error } = await supabase.client
                .from('zwift_api_events')
                .delete()
                .in('id', batch);
            if (!error) {
                deleted += batch.length;
            }
        }
        console.log(`[Cleanup] ✅ Deleted ${deleted} stale upcoming events`);
        return deleted;
    }
    /**
     * Full cleanup: past events + stale future events
     */
    async runFullCleanup() {
        console.log('\n🧹 [CLEANUP] Starting full event cleanup...\n');
        const pastCleanup = await this.cleanupOldEvents();
        const futureDeleted = await this.cleanupStaleUpcomingEvents();
        const result = {
            deleted_past: pastCleanup.deleted_old + pastCleanup.deleted_no_team,
            deleted_future_stale: futureDeleted,
            kept_with_team: pastCleanup.kept_with_team
        };
        console.log('\n🧹 [CLEANUP] Full cleanup completed:');
        console.log(`   📊 Past events deleted: ${result.deleted_past}`);
        console.log(`   📊 Future stale deleted: ${result.deleted_future_stale}`);
        console.log(`   ✅ Events kept (team participated): ${result.kept_with_team}\n`);
        return result;
    }
}
export const eventCleanupService = new EventCleanupService();
//# sourceMappingURL=event-cleanup.service.js.map