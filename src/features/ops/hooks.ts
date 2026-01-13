/**
 * Operational Intelligence Hooks
 * 
 * Week 3 - Track C: Operational Intelligence
 * Step C3: Operational Dashboard Panel
 */

import { useQuery } from '@tanstack/react-query';
import { getOpsSummary } from './api';

/**
 * Use operational summary
 * 
 * Fetches system health metrics for operational dashboard.
 * 
 * Refetch strategy:
 * - Auto-refetch every 60 seconds (keep dashboard fresh)
 * - Refetch on window focus
 * - Cache for 30 seconds (reduce API calls)
 * 
 * Usage:
 * ```tsx
 * function OperationalDashboard() {
 *   const { data, isLoading, error } = useOpsSummary();
 *   
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error message={error.message} />;
 *   
 *   return (
 *     <div>
 *       <Card title="Last Refresh">
 *         {data.lastRefresh?.completedAt}
 *       </Card>
 *       <Card title="Drift (24h)">
 *         {data.drift24h} events
 *       </Card>
 *     </div>
 *   );
 * }
 * ```
 */
export function useOpsSummary() {
  return useQuery({
    queryKey: ['ops', 'summary'],
    queryFn: getOpsSummary,
    refetchInterval: 60_000, // Refetch every 60s
    staleTime: 30_000,        // Cache for 30s
    refetchOnWindowFocus: true,
  });
}
