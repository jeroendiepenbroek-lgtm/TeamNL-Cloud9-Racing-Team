/**
 * Firebase Firestore mapper
 * Converteert raw Zwift API responses naar Firestore-veilige objecten
 */

// Geen firebase-admin import hier: mapper returned plain JS objects

type AnyObj = Record<string, unknown>;

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return String(value);
}

function removeUndefined<T extends AnyObj>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    const v = obj[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export function mapRider(raw: any) {
  if (!raw) return null;

  const mapped = {
    zwiftId: toNumber(raw.riderId ?? raw.zwiftId),
    name: toString(raw.name ?? raw.displayName ?? raw.username),
    clubId: toNumber(raw.clubId ?? raw.parentClubId ?? raw.club?.id),
    clubName: toString(raw.club?.name ?? raw.clubName),
    categoryRacing: toString(raw.categoryRacing ?? raw.category),
    ftp: toNumber(raw.ftp ?? raw.functionalThresholdPower ?? raw.power),
    weight: toNumber(raw.weight),
    ranking: toNumber(raw.ranking ?? raw.rank),
    rankingScore: toNumber(raw.rankingScore ?? raw.rankScore),
    countryCode: toString(raw.countryCode ?? raw.country),
    gender: toString(raw.gender),
    age: toString(raw.age ?? raw.ageGroup),
    totalRaces: toNumber(raw.totalRaces ?? raw.racesCount),
    totalWins: toNumber(raw.totalWins ?? raw.wins),
    totalPodiums: toNumber(raw.totalPodiums ?? raw.podiums),
  } as AnyObj;

  return removeUndefined(mapped);
}

export function mapRiderHistory(riderId: number, snapshotDate: Date, raw: any) {
  const mapped = {
    riderId,
    snapshotDate: snapshotDate.toISOString(),
    ranking: toNumber(raw.ranking ?? raw.rank),
    rankingScore: toNumber(raw.rankingScore ?? raw.rankScore),
    ftp: toNumber(raw.ftp ?? raw.functionalThresholdPower),
    weight: toNumber(raw.weight),
    rawData: raw,
  } as AnyObj;

  return removeUndefined(mapped);
}

export function mapClub(raw: any) {
  if (!raw) return null;
  const mapped = {
    id: toNumber(raw.id ?? raw.clubId),
    name: toString(raw.name),
    memberCount: toNumber(raw.memberCount ?? raw.count ?? raw.size),
  } as AnyObj;
  return removeUndefined(mapped);
}

export function mapClubMember(clubId: number, raw: any) {
  const mapped = {
    clubId,
    riderId: toNumber(raw.riderId ?? raw.zwiftId ?? raw.id),
    name: toString(raw.name ?? raw.displayName),
    ranking: toNumber(raw.ranking ?? raw.rank),
    categoryRacing: toString(raw.categoryRacing ?? raw.category),
  } as AnyObj;
  return removeUndefined(mapped);
}

export function mapEvent(raw: any) {
  if (!raw) return null;
  const mapped = {
    id: toNumber(raw.id ?? raw.eventId),
    name: toString(raw.name ?? raw.title),
    eventDate: toString(raw.eventDate ?? raw.date ?? raw.start),
    route: toString(raw.route ?? raw.course ?? raw.map),
    laps: toNumber(raw.laps),
    distanceInMeters: toNumber(raw.distanceInMeters ?? raw.distance),
    totalElevation: toNumber(raw.totalElevation ?? raw.elevation),
    category: toString(raw.category),
  } as AnyObj;
  return removeUndefined(mapped);
}

export function mapResult(eventId: number, raw: any) {
  const mapped = {
    eventId,
    riderId: toNumber(raw.riderId ?? raw.zwiftId ?? raw.id),
    name: toString(raw.name ?? raw.displayName),
    position: toNumber(raw.position ?? raw.rank),
    finishTimeInMilliseconds: toNumber(raw.finishTimeInMilliseconds ?? raw.timeMs ?? raw.time),
    avgWatts: toNumber(raw.avgWatts ?? raw.watts),
    avgHeartRate: toNumber(raw.avgHeartRate ?? raw.hr),
    category: toString(raw.category),
    didFinish: raw.didFinish === undefined ? undefined : Boolean(raw.didFinish),
  } as AnyObj;
  return removeUndefined(mapped);
}

export default {
  mapRider,
  mapRiderHistory,
  mapClub,
  mapClubMember,
  mapEvent,
  mapResult,
  removeUndefined,
};
