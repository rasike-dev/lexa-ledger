/**
 * LLM Provider Interface
 * 
 * Abstract interface for AI providers (OpenAI, Anthropic, etc.).
 * This allows swapping providers without changing business logic.
 */

import { ExplainResult, ExplainTradingReadinessInput } from './explainability.types';

/**
 * LLM Provider Interface
 * 
 * Implementations: DemoLlmProvider, OpenAIProvider, AnthropicProvider, etc.
 */
export interface LlmProvider {
  /**
   * Get provider name (for audit trail)
   */
  name(): string;

  /**
   * Generate trading readiness explanation
   * 
   * @param input - Facts, audience, and verbosity
   * @returns AI-generated explanation
   */
  explainTradingReadiness(input: ExplainTradingReadinessInput): Promise<ExplainResult>;

  /**
   * Generate ESG KPI explanation (Week 3 - Track A)
   * 
   * @param input - KPI facts, audience, and verbosity
   * @returns AI-generated explanation
   */
  explainEsgKpi(input: unknown): Promise<unknown>;

  /**
   * Generate Covenant breach explanation (Week 3 - Track A)
   * 
   * SAFETY: Explains evaluated logic only, NOT legal interpretation
   * 
   * @param input - Covenant facts, audience, and verbosity
   * @returns AI-generated explanation
   */
  explainCovenant(input: unknown): Promise<unknown>;

  /**
   * Generate Portfolio risk distribution explanation (Week 3 - Track A)
   * 
   * @param input - Portfolio aggregates, audience, and verbosity
   * @returns AI-generated explanation
   */
  explainPortfolioRisk(input: unknown): Promise<unknown>;
}
