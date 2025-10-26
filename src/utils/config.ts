import dotenv from 'dotenv';

// Laad environment variabelen
dotenv.config();

interface Config {
  // API configuratie
  zwiftApiKey: string;
  zwiftApiBaseUrl: string;
  zwiftClubId: number;

  // Database configuratie
  databaseUrl: string;

  // Server configuratie
  port: number;
  nodeEnv: string;

  // Sync configuratie
  syncIntervalMinutes: number;
  enableAutoSync: boolean;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variabele ${key} is niet ingesteld`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value && defaultValue !== undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value || '', 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variabele ${key} moet een nummer zijn`);
  }
  return parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

export const config: Config = {
  // API configuratie
  zwiftApiKey: getEnvVar('ZWIFT_API_KEY'),
  zwiftApiBaseUrl: getEnvVar('ZWIFT_API_BASE_URL', 'https://zwift-ranking.herokuapp.com'),
  zwiftClubId: getEnvNumber('ZWIFT_CLUB_ID', 11818),

  // Database configuratie
  databaseUrl: getEnvVar('DATABASE_URL', 'file:./dev.db'),

  // Server configuratie
  port: getEnvNumber('PORT', 3000),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),

  // Sync configuratie
  syncIntervalMinutes: getEnvNumber('SYNC_INTERVAL_MINUTES', 60),
  enableAutoSync: getEnvBoolean('ENABLE_AUTO_SYNC', true),
};

export default config;
