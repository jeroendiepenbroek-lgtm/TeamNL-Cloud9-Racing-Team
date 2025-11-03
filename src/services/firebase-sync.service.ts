/**
 * Firebase Sync Service
 * Real-time synchronization van TeamNL data naar Firebase Firestore
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { logger } from '../utils/logger.js';
import mapper from './firebase-firestore.mapper.js';

// Use CommonJS require for firebase-admin (ESM compatibility fix)
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

// ============================================================================
// FIREBASE INITIALIZATION
// ============================================================================

let firebaseApp: admin.app.App | null = null;
let firestore: admin.firestore.Firestore | null = null;

/**
 * Initialize Firebase Admin SDK
 */
export async function initializeFirebase(): Promise<boolean> {
  try {
    // Check if already initialized
    if (firebaseApp) {
      logger.info('🔥 Firebase already initialized');
      return true;
    }

    // Check for service account key
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || './serviceAccountKey.json';
    const resolvedPath = resolve(serviceAccountPath);
    
    // Try to load service account
    try {
      // Read JSON file synchronously
      const serviceAccountJson = readFileSync(resolvedPath, 'utf-8');
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      // Verify required fields
      if (!serviceAccount.project_id || !serviceAccount.private_key) {
        throw new Error('Invalid service account key - missing required fields');
      }
      
      logger.debug(`Admin object type: ${typeof admin}`);
      logger.debug(`Admin.credential exists: ${!!admin.credential}`);
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });

      firestore = firebaseApp.firestore();
      
      logger.info('🔥 Firebase initialized successfully');
      logger.info(`   Project: ${serviceAccount.project_id}`);
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.warn('⚠️  Firebase service account key niet gevonden');
        logger.warn(`   Verwachte locatie: ${resolvedPath}`);
        logger.warn('   Create serviceAccountKey.json in project root');
        logger.warn('   Firebase sync disabled - using local DB only');
        return false;
      }
      throw error;
    }
  } catch (error) {
    logger.error('❌ Firebase initialization failed:', error);
    return false;
  }
}

/**
 * Get Firestore instance (lazy init)
 */
async function getFirestore(): Promise<admin.firestore.Firestore | null> {
  if (!firestore && !firebaseApp) {
    await initializeFirebase();
  }
  return firestore;
}

// ============================================================================
// FIRESTORE COLLECTIONS
// ============================================================================

export const COLLECTIONS = {
  RIDERS: 'riders',
  CLUBS: 'clubs',
  EVENTS: 'events',
  RACE_RESULTS: 'raceResults',
  RIDER_HISTORY: 'riderHistory',
  CLUB_ROSTER: 'clubRoster',
  SYNC_LOGS: 'syncLogs',
} as const;

// ============================================================================
// RIDER SYNC
// ============================================================================

export interface FirebaseRider {
  zwiftId: number;
  name: string;
  clubId?: number;
  clubName?: string;
  categoryRacing?: string;
  ftp?: number;
  weight?: number;
  ranking?: number;
  rankingScore?: number;
  countryCode?: string;
  gender?: string;
  age?: string;
  totalRaces?: number;
  totalWins?: number;
  totalPodiums?: number;
  lastSynced: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
}

/**
 * Sync rider naar Firestore
 */
export async function syncRiderToFirebase(riderData: any): Promise<boolean> {
  const db = await getFirestore();
  if (!db) return false;

  try {
    const docRef = db.collection(COLLECTIONS.RIDERS).doc(String(riderData.zwiftId));
    // Map & sanitize input
    const mapped = mapper.mapRider(riderData) || {};
    const firebaseRider: Partial<FirebaseRider> = {
      ...mapped,
      lastSynced: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
    };

    await docRef.set(firebaseRider, { merge: true });
    
    logger.debug(`🔥 Rider ${riderData.zwiftId} synced to Firebase`);
    return true;
  } catch (error) {
    logger.error(`❌ Firebase sync failed for rider ${riderData.zwiftId}:`, error);
    return false;
  }
}

/**
 * Sync rider history naar Firestore
 */
export async function syncRiderHistoryToFirebase(
  riderId: number,
  snapshotDate: Date,
  historyData: any
): Promise<boolean> {
  const db = await getFirestore();
  if (!db) return false;

  try {
    const docRef = db
      .collection(COLLECTIONS.RIDER_HISTORY)
      .doc(`${riderId}_${snapshotDate.getTime()}`);

    const mapped = mapper.mapRiderHistory(riderId, snapshotDate, historyData) || {};
    await docRef.set({
      ...mapped,
      snapshotDate: admin.firestore.Timestamp.fromDate(snapshotDate),
      rawData: JSON.stringify(historyData),
      syncedAt: admin.firestore.Timestamp.now(),
    });

    logger.debug(`🔥 Rider history ${riderId} synced to Firebase`);
    return true;
  } catch (error) {
    logger.error(`❌ Firebase history sync failed for rider ${riderId}:`, error);
    return false;
  }
}

// ============================================================================
// CLUB SYNC
// ============================================================================

export interface FirebaseClub {
  id: number;
  name: string;
  memberCount: number;
  lastSynced: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
}

/**
 * Sync club naar Firestore
 */
export async function syncClubToFirebase(clubData: any): Promise<boolean> {
  const db = await getFirestore();
  if (!db) return false;

  try {
    const docRef = db.collection(COLLECTIONS.CLUBS).doc(String(clubData.id));

    const mapped = mapper.mapClub(clubData) || {};
    const firebaseClub: FirebaseClub = {
      id: mapped.id as number,
      name: mapped.name as string,
      memberCount: (mapped.memberCount as number) || 0,
      lastSynced: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
    };

    await docRef.set(firebaseClub, { merge: true });
    
    logger.debug(`🔥 Club ${clubData.id} synced to Firebase`);
    return true;
  } catch (error) {
    logger.error(`❌ Firebase sync failed for club ${clubData.id}:`, error);
    return false;
  }
}

/**
 * Sync club roster naar Firestore
 */
export async function syncClubRosterToFirebase(
  clubId: number,
  members: any[]
): Promise<boolean> {
  const db = await getFirestore();
  if (!db) return false;

  try {
    const batch = db.batch();
    const timestamp = admin.firestore.Timestamp.now();

    // Batch write all members (max 500 per batch)
    for (let i = 0; i < members.length; i += 500) {
      const chunk = members.slice(i, i + 500);
      
      for (const member of chunk) {
        const mapped = mapper.mapClubMember(clubId, member) || {};
        const docRef = db
          .collection(COLLECTIONS.CLUB_ROSTER)
          .doc(`${clubId}_${mapped.riderId}`);

        batch.set(docRef, {
          clubId,
          riderId: mapped.riderId,
          riderName: mapped.name,
          ranking: mapped.ranking,
          categoryRacing: mapped.categoryRacing,
          syncedAt: timestamp,
        }, { merge: true });
      }

      await batch.commit();
    }

    logger.debug(`🔥 Club roster ${clubId} synced to Firebase (${members.length} members)`);
    return true;
  } catch (error) {
    logger.error(`❌ Firebase roster sync failed for club ${clubId}:`, error);
    return false;
  }
}

// ============================================================================
// EVENT SYNC
// ============================================================================

export interface FirebaseEvent {
  id: number;
  name: string;
  eventDate: admin.firestore.Timestamp;
  route?: string;
  laps?: number;
  distanceInMeters?: number;
  totalElevation?: number;
  category?: string;
  lastSynced: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
}

/**
 * Sync event naar Firestore
 */
export async function syncEventToFirebase(eventData: any): Promise<boolean> {
  const db = await getFirestore();
  if (!db) return false;

  try {
    const docRef = db.collection(COLLECTIONS.EVENTS).doc(String(eventData.id));

    const mapped = mapper.mapEvent(eventData) || {};
    const firebaseEvent: FirebaseEvent = {
      id: mapped.id as number,
      name: mapped.name as string,
      eventDate: admin.firestore.Timestamp.fromDate(new Date(mapped.eventDate as string)),
      route: mapped.route as string,
      laps: mapped.laps as number,
      distanceInMeters: mapped.distanceInMeters as number,
      totalElevation: mapped.totalElevation as number,
      category: mapped.category as string,
      lastSynced: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
    };

    await docRef.set(firebaseEvent, { merge: true });
    
    logger.debug(`🔥 Event ${eventData.id} synced to Firebase`);
    return true;
  } catch (error) {
    logger.error(`❌ Firebase sync failed for event ${eventData.id}:`, error);
    return false;
  }
}

/**
 * Sync race results naar Firestore
 */
export async function syncRaceResultsToFirebase(
  eventId: number,
  results: any[]
): Promise<boolean> {
  const db = await getFirestore();
  if (!db) return false;

  try {
    const batch = db.batch();
    const timestamp = admin.firestore.Timestamp.now();

    // Batch write results (max 500 per batch)
    for (let i = 0; i < results.length; i += 500) {
      const chunk = results.slice(i, i + 500);
      
      for (const result of chunk) {
        const mapped = mapper.mapResult(eventId, result) || {};
        const docRef = db
          .collection(COLLECTIONS.RACE_RESULTS)
          .doc(`${eventId}_${mapped.riderId}`);

        batch.set(docRef, {
          eventId,
          riderId: mapped.riderId,
          riderName: mapped.name,
          position: mapped.position,
          finishTimeInMilliseconds: mapped.finishTimeInMilliseconds,
          avgWatts: mapped.avgWatts,
          avgHeartRate: mapped.avgHeartRate,
          category: mapped.category,
          didFinish: mapped.didFinish !== undefined ? mapped.didFinish : true,
          syncedAt: timestamp,
        }, { merge: true });
      }

      await batch.commit();
    }

    logger.debug(`🔥 Race results for event ${eventId} synced to Firebase (${results.length} results)`);
    return true;
  } catch (error) {
    logger.error(`❌ Firebase results sync failed for event ${eventId}:`, error);
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if Firebase is available
 */
export function isFirebaseAvailable(): boolean {
  return firebaseApp !== null && firestore !== null;
}

/**
 * Get Firebase stats
 */
export async function getFirebaseStats(): Promise<any> {
  const db = await getFirestore();
  if (!db) {
    return {
      available: false,
      message: 'Firebase not initialized',
    };
  }

  try {
    const stats: any = {
      available: true,
      collections: {},
    };

    // Count documents in each collection
    for (const [key, collectionName] of Object.entries(COLLECTIONS)) {
      try {
        const snapshot = await db.collection(collectionName).count().get();
        stats.collections[key.toLowerCase()] = snapshot.data().count;
      } catch (error) {
        stats.collections[key.toLowerCase()] = 0;
      }
    }

    return stats;
  } catch (error) {
    logger.error('❌ Failed to get Firebase stats:', error);
    return {
      available: true,
      error: 'Failed to get stats',
    };
  }
}

/**
 * Delete all documents in a collection in batches (safe)
 * Returns true if succeeded for this collection
 */
export async function deleteCollection(collectionName: string): Promise<boolean> {
  const db = await getFirestore();
  if (!db) return false;

  try {
    const batchSize = 500;
    while (true) {
      const snapshot = await db.collection(collectionName).limit(batchSize).get();
      if (snapshot.size === 0) break;

      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      // Continue until fewer than batchSize were returned
      if (snapshot.size < batchSize) break;
    }

    logger.info(`🧹 Firebase collection cleaned: ${collectionName}`);
    return true;
  } catch (error) {
    logger.error(`❌ Failed to delete collection ${collectionName}:`, error);
    return false;
  }
}

/**
 * Cleanup multiple collections. Returns object with results per collection
 */
export async function cleanupCollections(collectionNames: string[]): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  for (const name of collectionNames) {
    results[name] = await deleteCollection(name);
  }
  return results;
}

/**
 * Cleanup Firebase connection
 */
export async function closeFirebase(): Promise<void> {
  if (firebaseApp) {
    await firebaseApp.delete();
    firebaseApp = null;
    firestore = null;
    logger.info('🔥 Firebase connection closed');
  }
}

// Export singleton instance
export const firebaseSyncService = {
  initialize: initializeFirebase,
  isAvailable: isFirebaseAvailable,
  getStats: getFirebaseStats,
  close: closeFirebase,
  
  // Sync functions
  syncRider: syncRiderToFirebase,
  syncRiderHistory: syncRiderHistoryToFirebase,
  syncClub: syncClubToFirebase,
  syncClubRoster: syncClubRosterToFirebase,
  syncEvent: syncEventToFirebase,
  syncRaceResults: syncRaceResultsToFirebase,
  cleanup: cleanupCollections,
};
