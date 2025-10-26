import { z } from 'zod';

/**
 * Power curve data schema
 */
export const PowerSchema = z.object({
  wkg5: z.number().optional(),
  wkg15: z.number().optional(),
  wkg30: z.number().optional(),
  wkg60: z.number().optional(),
  wkg120: z.number().optional(),
  wkg300: z.number().optional(),
  wkg1200: z.number().optional(),
  w5: z.number().optional(),
  w15: z.number().optional(),
  w30: z.number().optional(),
  w60: z.number().optional(),
  w120: z.number().optional(),
  w300: z.number().optional(),
  w1200: z.number().optional(),
  CP: z.number().optional(),
  AWC: z.number().optional(),
  compoundScore: z.number().optional(),
  powerRating: z.number().optional(),
});

/**
 * Race rating data schema
 */
export const RaceRatingSchema = z.object({
  rating: z.number().optional(),
  date: z.number().optional(), // epoch timestamp
  mixed: z.object({
    category: z.string().optional(),
    number: z.number().optional(),
  }).optional(),
  expires: z.number().optional(), // epoch timestamp
});

/**
 * Race statistics schema
 */
export const RaceStatsSchema = z.object({
  last: RaceRatingSchema.optional(),
  current: RaceRatingSchema.optional(),
  max30: RaceRatingSchema.optional(),
  max90: RaceRatingSchema.optional(),
  finishes: z.number().optional(),
  dnfs: z.number().optional(),
  wins: z.number().optional(),
  podiums: z.number().optional(),
});

/**
 * Phenotype scores schema
 */
export const PhenotypeSchema = z.object({
  scores: z.object({
    sprinter: z.number().optional(),
    puncheur: z.number().optional(),
    pursuiter: z.number().optional(),
    climber: z.number().optional(),
    tt: z.number().optional(),
  }).optional(),
  value: z.string().optional(),
  bias: z.number().optional(),
});

/**
 * Handicaps schema
 */
export const HandicapsSchema = z.object({
  profile: z.object({
    flat: z.number().optional(),
    rolling: z.number().optional(),
    hilly: z.number().optional(),
    mountainous: z.number().optional(),
  }).optional(),
});

/**
 * Rider schema (zoals teruggegeven door /public/clubs/{id} API)
 * Dit is de RIJKE data versie met alle power curves, race stats, etc.
 */
export const RiderSchema = z.object({
  riderId: z.number(),
  name: z.string(),
  gender: z.string().optional(),
  country: z.string().optional(),
  age: z.string().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  zpCategory: z.string().optional(),
  zpFTP: z.number().optional(),
  
  // Power data
  power: PowerSchema.optional(),
  
  // Race statistics
  race: RaceStatsSchema.optional(),
  
  // Rider type/phenotype
  phenotype: PhenotypeSchema.optional(),
  
  // Handicaps per profile
  handicaps: HandicapsSchema.optional(),
  
  // Legacy velden (voor backward compatibility)
  categoryRacing: z.string().optional(),
  ftp: z.number().optional(),
  powerToWeight: z.number().optional(),
  ranking: z.number().optional(),
  rankingScore: z.number().optional(),
  countryCode: z.string().optional(),
});

export type RiderData = z.infer<typeof RiderSchema>;
export type PowerData = z.infer<typeof PowerSchema>;
export type RaceStatsData = z.infer<typeof RaceStatsSchema>;
export type PhenotypeData = z.infer<typeof PhenotypeSchema>;
export type HandicapsData = z.infer<typeof HandicapsSchema>;

// Club member schema
export const ClubMemberSchema = RiderSchema;
export type ClubMemberData = z.infer<typeof ClubMemberSchema>;

// Race result schema
export const RaceResultSchema = z.object({
  riderId: z.number(),
  eventId: z.number(),
  eventName: z.string().optional(),
  eventDate: z.string().optional(),
  position: z.number().optional(),
  category: z.string().optional(),
  averagePower: z.number().optional(),
  averageWkg: z.number().optional(),
  time: z.number().optional(),
  distance: z.number().optional(),
});

export type RaceResultData = z.infer<typeof RaceResultSchema>;

// API Response types
export interface ClubResponse {
  members: ClubMemberData[];
  clubId: number;
}

export interface RiderResponse {
  rider: RiderData;
}

export interface ResultsResponse {
  results: RaceResultData[];
  eventId: number;
}

// Rate limit configuratie
export interface RateLimitConfig {
  maxRequests: number;
  perMilliseconds: number;
}

export const RATE_LIMITS = {
  club: { maxRequests: 1, perMilliseconds: 60 * 60 * 1000 }, // 1/hour standard
  rider: { maxRequests: 5, perMilliseconds: 60 * 1000 },      // 5/minute standard
  ridersBulk: { maxRequests: 1, perMilliseconds: 15 * 60 * 1000 }, // 1/15min standard
  results: { maxRequests: 1, perMilliseconds: 60 * 1000 },    // 1/minute
} as const;
