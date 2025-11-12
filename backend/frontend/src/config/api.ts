// API Configuration - determines backend URL based on environment
// In production (Railway), frontend is served from same origin as backend
// In development, Vite proxy handles /api -> localhost:3000

const getApiBaseUrl = (): string => {
  // In production build (served by Express), API is on same origin
  if (import.meta.env.PROD) {
    return ''; // Same origin, no prefix needed
  }
  
  // In development, Vite proxy handles /api routes
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
  CLUBS: (id: number) => `${API_BASE_URL}/api/clubs/${id}`,
  RIDERS: `${API_BASE_URL}/api/riders`,
  RIDERS_TEAM: `${API_BASE_URL}/api/riders/team`,
  EVENTS: `${API_BASE_URL}/api/events`,
  EVENTS_UPCOMING: `${API_BASE_URL}/api/events/upcoming`,
  EVENT_DETAILS: (id: string) => `${API_BASE_URL}/api/events/${id}`,
  RESULTS: (eventId: string) => `${API_BASE_URL}/api/results/${eventId}`,
  HISTORY: (riderId: number) => `${API_BASE_URL}/api/history/${riderId}`,
  SYNC_LOGS: `${API_BASE_URL}/api/sync-logs`,
  HEALTH: `${API_BASE_URL}/health`,
} as const;

console.log('[API Config]', import.meta.env.PROD ? 'Production' : 'Development', 'mode');
console.log('[API Config] Base URL:', API_BASE_URL || '(same origin)');
