/**
 * Supabase Client voor directe database toegang
 */
import { DbClub, DbRider, DbEvent, DbResult, DbRiderHistory, DbSyncLog } from '../types/index.js';
export declare class SupabaseService {
    private client;
    constructor();
    getClub(clubId: number): Promise<DbClub | null>;
    upsertClub(club: Partial<DbClub>): Promise<DbClub>;
    getRiders(clubId?: number): Promise<DbRider[]>;
    getRiderIdsByClub(clubId: number): Promise<number[]>;
    getAllTeamRiderIds(): Promise<number[]>;
    getRider(riderId: number): Promise<DbRider | null>;
    upsertRiders(riders: Partial<DbRider>[]): Promise<DbRider[]>;
    getEvents(clubId?: number): Promise<DbEvent[]>;
    getUpcomingEventsRaw(hours: number): Promise<Array<{
        event_id: string;
        title: string;
        time_unix: number;
    }>>;
    getUpcomingEvents(hours?: number, hasTeamRiders?: boolean): Promise<any[]>;
    getEvent(eventId: number): Promise<any | null>;
    getEventSignups(eventId: number): Promise<any[]>;
    upsertEventSignup(signup: {
        event_id: string;
        rider_id: number;
        pen_name?: string;
        pen_range_label?: string;
        category?: string;
        status?: string;
        team_name?: string;
        notes?: string;
    }): Promise<any>;
    upsertZwiftApiEvents(events: any[]): Promise<any[]>;
    upsertEvents(events: Partial<DbEvent>[]): Promise<DbEvent[]>;
    getEventResults(eventId: number): Promise<DbResult[]>;
    upsertResults(results: Partial<DbResult>[]): Promise<DbResult[]>;
    getRiderHistory(riderId: number): Promise<DbRiderHistory[]>;
    insertRiderHistory(history: Partial<DbRiderHistory>[]): Promise<DbRiderHistory[]>;
    getSyncLogs(limit?: number): Promise<DbSyncLog[]>;
    createSyncLog(log: Partial<DbSyncLog>): Promise<DbSyncLog>;
    updateSyncLog(id: number, updates: Partial<DbSyncLog>): Promise<DbSyncLog>;
    getMyTeamMembers(): Promise<any[]>;
    addMyTeamMember(riderId: number): Promise<any>;
    removeMyTeamMember(riderId: number): Promise<void>;
    bulkAddMyTeamMembers(riderIds: number[]): Promise<any[]>;
    toggleFavorite(riderId: number, isFavorite: boolean): Promise<void>;
    upsertEventSignups(signups: any[]): Promise<number>;
    getEventSignupsCount(eventId: string): Promise<number>;
    getTeamSignups(eventId: string, teamRiderIds: number[]): Promise<any[]>;
    getTeamSignupsByCategory(eventId: string, teamRiderIds: number[]): Promise<Record<string, any[]>>;
    getAllSignupsByCategory(eventIds: string[]): Promise<Map<string, any[]>>;
    getSignupCountsForEvents(eventIds: string[]): Promise<Map<string, number>>;
    getTeamSignupsForEvents(eventIds: string[], teamRiderIds: number[]): Promise<Map<string, any[]>>;
    getSignupsByEventId(eventId: string): Promise<any[]>;
}
export declare const supabase: SupabaseService;
//# sourceMappingURL=supabase.service.d.ts.map