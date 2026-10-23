const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/** Socket.IO shares the API host without the `/api/v1` prefix. */
export function getRealtimeUrl(): string {
  return API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
}
