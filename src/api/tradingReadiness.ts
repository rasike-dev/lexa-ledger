/**
 * Trading Readiness API Client
 * 
 * Fact snapshots + AI explanations for trading readiness.
 */

import { httpClient } from '@/shared/api/httpClient'; // Existing fetch client with JWT + 401 handling

export type ReadinessBand = "GREEN" | "AMBER" | "RED";
export type ExplainVerbosity = "SHORT" | "STANDARD" | "DETAILED";

export type TradingReadinessFactSnapshot = {
  id: string;
  tenantId: string;
  loanId: string;
  readinessScore: number;
  readinessBand: ReadinessBand;
  contributingFactors: Record<string, any>;
  blockingIssues: string[];
  computedAt: string;
  computedBy: string;
  factVersion: number;
  factHash: string;
  correlationId?: string | null;
};

export type ExplainResult = {
  summary: string;
  explanation: string[];
  recommendations: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  version: number;
};

/**
 * Get latest fact snapshot for a loan
 */
export async function getLatestTradingReadinessFacts(loanId: string) {
  return await httpClient.get<TradingReadinessFactSnapshot>(
    `/api/trading/readiness/${encodeURIComponent(loanId)}/facts/latest`,
  );
}

/**
 * Trigger fact recomputation (async job)
 */
export async function recomputeTradingReadinessFacts(loanId: string) {
  return await httpClient.post<TradingReadinessFactSnapshot>(
    `/api/trading/readiness/${encodeURIComponent(loanId)}/facts/recompute`,
    {},
  );
}

/**
 * Generate AI explanation for trading readiness
 * 
 * Cached server-side by: factHash + audience + verbosity
 */
export async function explainTradingReadiness(
  loanId: string,
  verbosity: ExplainVerbosity,
) {
  return await httpClient.post<ExplainResult>(
    `/api/trading/readiness/${encodeURIComponent(loanId)}/explain`,
    { verbosity },
  );
}
