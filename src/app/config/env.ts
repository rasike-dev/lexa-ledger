// env.ts - Environment configuration

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  apiMode: import.meta.env.VITE_API_MODE || 'live',
  // Week 2: tenantId and actor now derived from JWT token (not env vars)
} as const;
