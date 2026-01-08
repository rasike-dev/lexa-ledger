// env.ts - Environment configuration

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  apiMode: import.meta.env.VITE_API_MODE || 'live',
  tenantId: import.meta.env.VITE_TENANT_ID,
  actor: import.meta.env.VITE_ACTOR || 'dev-user',
} as const;
