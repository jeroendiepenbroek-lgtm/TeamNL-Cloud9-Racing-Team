import { Request, Response, NextFunction } from 'express';

/**
 * Basic Authentication Middleware
 * Beschermt API endpoints met username/password
 */
export const basicAuth = (req: Request, res: Response, next: NextFunction): void => {
  // Skip auth voor health check
  if (req.path === '/api/health') {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="TeamNL Cloud9 Dashboard"');
    res.status(401).json({ 
      error: 'Authentication required',
      message: 'Provide credentials via Basic Auth header'
    });
    return;
  }

  try {
    // Decode Base64 credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    // Check against environment variables
    const validUsername = process.env.API_USERNAME || 'admin';
    const validPassword = process.env.API_PASSWORD || 'changeme';

    if (username === validUsername && password === validPassword) {
      next();
      return;
    }

    res.status(401).json({ 
      error: 'Invalid credentials',
      message: 'Username or password incorrect'
    });
  } catch (error) {
    res.status(401).json({ 
      error: 'Authentication failed',
      message: 'Invalid authorization header format'
    });
  }
};

/**
 * API Key Authentication Middleware (alternatief)
 * Beschermt API endpoints met X-API-Key header
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  // Skip auth voor health check
  if (req.path === '/api/health') {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    // Als geen API key is geconfigureerd, skip auth
    next();
    return;
  }

  if (!apiKey) {
    res.status(401).json({ 
      error: 'API key required',
      message: 'Provide API key via X-API-Key header'
    });
    return;
  }

  if (apiKey !== validApiKey) {
    res.status(401).json({ 
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
    return;
  }

  next();
};

/**
 * CORS Middleware voor externe toegang
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
};
