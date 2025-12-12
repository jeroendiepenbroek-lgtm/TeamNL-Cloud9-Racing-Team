// Load .env FIRST before any other module
import { config } from 'dotenv';
config();

// Export a dummy to make this a module
export const ENV_LOADED = true;
