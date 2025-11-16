/**
 * Type definities voor TeamNL Cloud9 Racing Team Backend
 */
export interface ZwiftClub {
    id: number;
    name: string;
    description?: string;
    tag?: string;
    memberCount?: number;
}
/**
 * ZwiftRider: Complete API response type
 * Endpoint: GET /public/riders/:riderId
 */
export interface ZwiftRider {
    riderId: number;
    name: string;
    gender?: string;
    country?: string;
    age?: string;
    height?: number;
    weight?: number;
    zpCategory?: string;
    zpFTP?: number;
    power?: {
        wkg5?: number;
        wkg15?: number;
        wkg30?: number;
        wkg60?: number;
        wkg120?: number;
        wkg300?: number;
        wkg1200?: number;
        w5?: number;
        w15?: number;
        w30?: number;
        w60?: number;
        w120?: number;
        w300?: number;
        w1200?: number;
        CP?: number;
        AWC?: number;
        compoundScore?: number;
        powerRating?: number;
    };
    race?: {
        last?: {
            rating?: number;
            date?: number;
            mixed?: {
                category?: string;
                number?: number;
            };
        };
        current?: {
            rating?: number;
            date?: number;
            mixed?: {
                category?: string;
                number?: number;
            };
        };
        max30?: {
            rating?: number;
            date?: number;
            expires?: number;
            mixed?: {
                category?: string;
                number?: number;
            };
        };
        max90?: {
            rating?: number;
            date?: number;
            expires?: number;
            mixed?: {
                category?: string;
                number?: number;
            };
        };
        finishes?: number;
        dnfs?: number;
        wins?: number;
        podiums?: number;
    };
    handicaps?: {
        profile?: {
            flat?: number;
            rolling?: number;
            hilly?: number;
            mountainous?: number;
        };
    };
    phenotype?: {
        scores?: {
            sprinter?: number;
            puncheur?: number;
            pursuiter?: number;
            climber?: number;
            tt?: number;
        };
        value?: string;
        bias?: number;
    };
    club?: {
        id: number;
        name: string;
    };
    category?: {
        racing: string;
        zFTP: string;
    };
    ranking?: number | null;
    rankingScore?: number;
    ftp?: number;
    wattsPerKg?: number;
    countryAlpha3?: string;
    points?: number;
}
export interface ZwiftEvent {
    _id?: string;
    eventId: string;
    time: number;
    title: string;
    type: string;
    subType?: string;
    distance?: number;
    elevation?: number;
    numLaps?: number;
    route?: {
        _id?: string;
        routeId?: string;
        name: string;
        world?: string;
        distance?: number;
        elevation?: number;
        profile?: string;
    };
    pens?: Array<{
        id: string;
        order: number;
        name: string;
        rangeLabel?: string;
        startTime?: number;
        results?: {
            count?: number;
            averageRating?: number;
            signups?: Array<{
                riderId?: number;
                rider_id?: number;
                name?: string;
                category?: string;
                team?: string;
            }>;
        };
    }>;
    categoryEnforcement?: string;
    organizer?: string;
    staggeredStart?: boolean;
    categories?: string;
    source?: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface ZwiftEventSimple {
    id: number;
    name: string;
    eventDate: string;
    type?: string;
    clubId?: number;
}
export interface ZwiftResult {
    eventId: number;
    riderId: number;
    position: number;
    time?: number;
    points?: number;
}
export interface RiderHistory {
    riderId: number;
    date: string;
    ranking: number;
    points: number;
    category: string;
}
export interface SyncLog {
    id: string;
    endpoint: string;
    status: 'success' | 'error';
    recordsProcessed: number;
    message?: string;
    timestamp: string;
}
export interface DbClub {
    id: number;
    name: string;
    description?: string;
    tag?: string;
    member_count?: number;
    last_synced?: string;
    created_at?: string;
    updated_at?: string;
}
/**
 * DbRider: Pure 1:1 mapping van ZwiftRacing API riders endpoint
 * Total: 61 velden (was: 21)
 * Migration: 007_pure_api_mapping.sql
 */
export interface DbRider {
    id: number;
    rider_id: number;
    name?: string;
    gender?: string;
    country?: string;
    age?: string;
    height?: number;
    weight?: number;
    zp_category?: string;
    zp_ftp?: number;
    power_wkg5?: number;
    power_wkg15?: number;
    power_wkg30?: number;
    power_wkg60?: number;
    power_wkg120?: number;
    power_wkg300?: number;
    power_wkg1200?: number;
    power_w5?: number;
    power_w15?: number;
    power_w30?: number;
    power_w60?: number;
    power_w120?: number;
    power_w300?: number;
    power_w1200?: number;
    power_cp?: number;
    power_awc?: number;
    power_compound_score?: number;
    power_rating?: number;
    race_last_rating?: number;
    race_last_date?: number;
    race_last_category?: string;
    race_last_number?: number;
    race_current_rating?: number;
    race_current_date?: number;
    race_max30_rating?: number;
    race_max30_expires?: number;
    race_max90_rating?: number;
    race_max90_expires?: number;
    race_finishes?: number;
    race_dnfs?: number;
    race_wins?: number;
    race_podiums?: number;
    handicap_flat?: number;
    handicap_rolling?: number;
    handicap_hilly?: number;
    handicap_mountainous?: number;
    phenotype_sprinter?: number;
    phenotype_puncheur?: number;
    phenotype_pursuiter?: number;
    phenotype_climber?: number;
    phenotype_tt?: number;
    phenotype_value?: string;
    phenotype_bias?: number;
    club_id?: number;
    club_name?: string;
    is_active?: boolean;
    total_races?: number;
    total_wins?: number;
    total_podiums?: number;
    last_synced?: string;
    created_at?: string;
}
export interface DbEvent {
    id: number;
    zwift_event_id: number;
    name: string;
    event_date: string;
    event_type?: string;
    club_id?: number;
    last_synced?: string;
    created_at?: string;
    updated_at?: string;
}
export interface DbResult {
    id: number;
    event_id: number;
    rider_id: number;
    position: number;
    time_seconds?: number;
    points?: number;
    created_at?: string;
    updated_at?: string;
}
export interface DbRiderHistory {
    id: number;
    rider_id: number;
    snapshot_date: string;
    ranking: number;
    points: number;
    category: string;
    created_at?: string;
}
export interface DbSyncLog {
    id: number;
    endpoint: string;
    status: string;
    records_processed: number;
    error_message?: string;
    created_at: string;
}
//# sourceMappingURL=index.d.ts.map