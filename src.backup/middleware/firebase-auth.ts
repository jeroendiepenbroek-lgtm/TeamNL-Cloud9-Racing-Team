import admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

export function initializeFirebase() {
  if (firebaseInitialized || admin.apps.length > 0) {
    return;
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      logger.warn('⚠️  Firebase credentials niet gevonden - Firebase Auth uitgeschakeld');
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });

    firebaseInitialized = true;
    logger.info('🔥 Firebase Admin SDK geïnitialiseerd', { projectId });
  } catch (error) {
    logger.error('❌ Firebase Admin SDK initialisatie gefaald', error);
  }
}

/**
 * Firebase Authentication Middleware
 * Verifies Firebase ID tokens from frontend
 */
export const firebaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Skip auth for public endpoints
  const publicEndpoints = ['/api/health', '/api/system'];
  if (publicEndpoints.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Firebase ID token vereist in Authorization header (Bearer <token>)',
    });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Attach user info to request
    (req as any).user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      isAdmin: decodedToken.admin === true, // Custom claim
      emailVerified: decodedToken.email_verified,
    };

    logger.debug('✅ User authenticated', {
      uid: decodedToken.uid,
      email: decodedToken.email,
    });

    next();
  } catch (error: any) {
    logger.warn('❌ Invalid Firebase token', {
      error: error.message,
      code: error.code,
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid of verlopen Firebase token',
      code: error.code,
    });
  }
};

/**
 * Admin-only middleware
 * Requires custom claim 'admin: true' in Firebase Auth
 * 
 * Usage:
 *   router.post('/api/sync/club', requireAdmin, asyncHandler(async (req, res) => {...}));
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;

  if (!user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authenticatie vereist',
    });
    return;
  }

  if (!user.isAdmin) {
    logger.warn('🚫 Unauthorized admin access attempt', {
      uid: user.uid,
      email: user.email,
      path: req.path,
    });

    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin rechten vereist voor deze actie',
    });
    return;
  }

  logger.debug('✅ Admin access granted', { uid: user.uid, path: req.path });
  next();
};

/**
 * Optional middleware: Require verified email
 */
export const requireVerifiedEmail = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;

  if (!user || !user.emailVerified) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Email verificatie vereist',
    });
    return;
  }

  next();
};

/**
 * Get current user from request
 * Helper function for route handlers
 */
export function getCurrentUser(req: Request): {
  uid: string;
  email?: string;
  name?: string;
  isAdmin: boolean;
} | null {
  return (req as any).user || null;
}
