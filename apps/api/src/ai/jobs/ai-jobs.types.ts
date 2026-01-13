/**
 * AI Jobs Types
 * 
 * Queue and job type definitions for async AI explanation recomputation.
 * 
 * Week 3 - Track B: AI-Ready Architecture (Step B7)
 */

export const AI_EXPLAIN_QUEUE = 'ai-explain' as const;

export type AiExplainJobName =
  | 'TRADING_EXPLAIN_RECOMPUTE'
  | 'ESG_KPI_EXPLAIN_RECOMPUTE'
  | 'COVENANT_EXPLAIN_RECOMPUTE'
  | 'PORTFOLIO_RISK_EXPLAIN_RECOMPUTE';

export type TradingExplainRecomputePayload = {
  tenantId: string;
  loanId: string;
  factHash: string;
  audience: string;
  verbosity: 'SHORT' | 'STANDARD' | 'DETAILED';
  actorUserId?: string;
  correlationId?: string;
};

export type EsgKpiExplainRecomputePayload = {
  tenantId: string;
  loanId: string;
  kpiId: string;
  factHash: string;
  audience: string;
  verbosity: 'SHORT' | 'STANDARD' | 'DETAILED';
  actorUserId?: string;
  correlationId?: string;
};

export type CovenantExplainRecomputePayload = {
  tenantId: string;
  loanId: string;
  covenantId: string;
  factHash: string;
  audience: string;
  verbosity: 'SHORT' | 'STANDARD' | 'DETAILED';
  actorUserId?: string;
  correlationId?: string;
};

export type PortfolioRiskExplainRecomputePayload = {
  tenantId: string;
  portfolioId: string | null;
  factHash: string;
  audience: string;
  verbosity: 'SHORT' | 'STANDARD' | 'DETAILED';
  actorUserId?: string;
  correlationId?: string;
};

export type AiExplainJobPayload =
  | { name: 'TRADING_EXPLAIN_RECOMPUTE'; data: TradingExplainRecomputePayload }
  | { name: 'ESG_KPI_EXPLAIN_RECOMPUTE'; data: EsgKpiExplainRecomputePayload }
  | { name: 'COVENANT_EXPLAIN_RECOMPUTE'; data: CovenantExplainRecomputePayload }
  | { name: 'PORTFOLIO_RISK_EXPLAIN_RECOMPUTE'; data: PortfolioRiskExplainRecomputePayload };
