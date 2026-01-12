/**
 * useMeQuery - TanStack Query hook for /api/me endpoint (Week 2.5 - Step E1)
 * 
 * Purpose:
 * - Fetches server-validated identity from /api/me
 * - Used in Identity Panel for "proof of identity" demo
 * - Shows server-side view: userId, tenantId, roles, correlationId
 * 
 * Usage:
 * - Pass `enabled: true` to fetch immediately
 * - Pass `enabled: false` to defer until user interaction
 * - 30s stale time (safe to cache, identity rarely changes mid-session)
 */

import { useQuery } from '@tanstack/react-query';
import { httpClient } from '../app/api/httpClient';

export interface MeResponse {
  userId: string | null;
  tenantId: string | null;
  roles: string[];
  issuer: string | null;
  subject: string | null;
  correlationId: string | null;
  ip: string | null;
  userAgent: string | null;
}

export function useMeQuery(enabled: boolean) {
  return useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: async () => {
      const response = await httpClient.get('/api/me');
      return response.data;
    },
    enabled,
    staleTime: 30_000, // 30 seconds
    retry: 1, // Only retry once (if user is logged out, no point retrying)
  });
}
