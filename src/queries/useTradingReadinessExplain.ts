/**
 * Trading Readiness Query Hooks
 * 
 * TanStack Query hooks for fact snapshots + explanations.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExplainVerbosity } from "../api/tradingReadiness";
import {
  explainTradingReadiness,
  getLatestTradingReadinessFacts,
  recomputeTradingReadinessFacts,
} from "../api/tradingReadiness";

/**
 * Query key for latest facts
 */
export function tradingReadinessFactsKey(loanId: string) {
  return ["trading", "readiness", loanId, "facts", "latest"] as const;
}

/**
 * Query key for explanation (includes verbosity for cache)
 */
export function tradingReadinessExplainKey(loanId: string, verbosity: ExplainVerbosity) {
  return ["trading", "readiness", loanId, "explain", verbosity] as const;
}

/**
 * Fetch latest fact snapshot for a loan
 */
export function useLatestTradingReadinessFacts(loanId: string) {
  return useQuery({
    queryKey: tradingReadinessFactsKey(loanId),
    queryFn: () => getLatestTradingReadinessFacts(loanId),
    enabled: !!loanId,
    staleTime: 60_000, // Cache for 1 minute
  });
}

/**
 * Recompute fact snapshot (mutation)
 * 
 * Invalidates facts + all explanations on success.
 */
export function useRecomputeTradingReadinessFacts(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => recomputeTradingReadinessFacts(loanId),
    onSuccess: () => {
      // Invalidate facts
      qc.invalidateQueries({ queryKey: tradingReadinessFactsKey(loanId) });
      // Invalidate all explanations (new facts = new factHash)
      qc.invalidateQueries({ queryKey: ["trading", "readiness", loanId, "explain"] });
    },
  });
}

/**
 * Generate explanation (mutation)
 * 
 * Server-side cached by factHash + audience + verbosity.
 */
export function useExplainTradingReadiness(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (verbosity: ExplainVerbosity) => explainTradingReadiness(loanId, verbosity),
    onSuccess: (_data, verbosity) => {
      // Invalidate explanation cache (optional, server already caches)
      qc.invalidateQueries({ queryKey: tradingReadinessExplainKey(loanId, verbosity) });
    },
  });
}
