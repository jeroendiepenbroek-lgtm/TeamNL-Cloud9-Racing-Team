// Load .env FIRST before any other module (alleen lokaal, Railway heeft geen .env file)
import { config } from 'dotenv';

// Railway injecteert variables direct in process.env, geen .env file nodig
// Lokaal (development) laden we de .env file
if (process.env.NODE_ENV !== 'production') {
  config();
  console.log('🔧 Development mode: loaded .env file');
} else {
  console.log('🚀 Production mode: using Railway environment variables');
}

// Export a dummy to make this a module
export const ENV_LOADED = true;
