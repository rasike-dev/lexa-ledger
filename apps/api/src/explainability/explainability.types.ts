/**
 * Explainability Service Types
 * 
 * Type-safe contracts for AI-powered explanations.
 */

/**
 * Target audience for explanation (affects tone and verbosity)
 */
export type ExplainAudience = 'TRADING_ANALYST' | 'TRADING_VIEWER' | 'INVESTOR' | 'COMPLIANCE';

/**
 * Explanation verbosity level
 */
export type ExplainVerbosity = 'SHORT' | 'STANDARD' | 'DETAILED';

/**
 * Input for trading readiness explanation
 */
export type ExplainTradingReadinessInput = {
  facts: any; // TradingReadinessFactSnapshot (typed as any for flexibility)
  audience: ExplainAudience;
  verbosity: ExplainVerbosity;
};

/**
 * Output from AI explanation generation
 */
export type ExplainResult = {
  summary: string;
  explanation: string[];
  recommendations: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  version: number;
};
