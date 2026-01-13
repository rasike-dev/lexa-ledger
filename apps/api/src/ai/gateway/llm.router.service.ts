/**
 * LLM Router Service
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B4: Provider Routing + Fallback
 * 
 * Routes AI calls to appropriate providers and models based on policy.
 * 
 * Routing logic:
 * - Select model based on module + verbosity
 * - Provide primary + fallback providers
 * - Support future enhancements (A/B testing, cost optimization, etc.)
 */

import { Injectable } from '@nestjs/common';
import { LlmProvider } from './llm.provider';
import { LlmPolicy } from './llm.gateway.types';

/**
 * Routed Provider
 * 
 * Combines a provider with the model to use.
 * Gateway receives both primary and fallback.
 */
export type RoutedProvider = {
  provider: LlmProvider;
  model: string;
};

/**
 * LLM Router Service
 * 
 * Selects appropriate provider and model based on request policy.
 * 
 * Current routing rules (B4):
 * - Model selection based on module + verbosity
 * - Primary/fallback both use same model
 * - Deterministic routing (no external config)
 * 
 * Future enhancements (B5+):
 * - Cost-based routing (cheaper models for SHORT verbosity)
 * - Performance-based routing (faster models for real-time)
 * - Tenant-specific routing (premium tenants → GPT-4)
 * - A/B testing (split traffic between models)
 */
@Injectable()
export class LlmRouterService {
  constructor(
    private readonly primary: LlmProvider,
    private readonly fallback: LlmProvider,
  ) {}

  /**
   * Route a request to primary and fallback providers
   * 
   * Returns both so gateway can try primary first,
   * then fallback if primary fails transiently.
   * 
   * @param policy - Request policy (module, audience, verbosity)
   * @returns Primary and fallback routed providers
   */
  route(policy: LlmPolicy): { primary: RoutedProvider; fallback: RoutedProvider } {
    const model = this.pickModel(policy);

    return {
      primary: { provider: this.primary, model },
      fallback: { provider: this.fallback, model },
    };
  }

  /**
   * Pick model based on policy
   * 
   * Routing rules:
   * - TRADING module: Different models for standard vs detailed
   * - ESG module: Specialized ESG model
   * - SERVICING module: Covenant explanation model
   * - PORTFOLIO module: Portfolio aggregation model
   * 
   * Model naming convention:
   * - "explain-{module}-{variant}-v{version}"
   * - Examples: "explain-trading-v1", "explain-trading-detailed-v1"
   * 
   * Future: These will map to real model IDs:
   * - "explain-trading-v1" → "gpt-4-turbo"
   * - "explain-trading-detailed-v1" → "gpt-4"
   * - "explain-esg-v1" → "claude-3-opus"
   */
  private pickModel(policy: LlmPolicy): string {
    // Keep stable model strings for audit + deterministic demos
    switch (policy.module) {
      case 'TRADING':
        // Detailed explanations use more sophisticated model
        return policy.verbosity === 'DETAILED' 
          ? 'explain-trading-detailed-v1' 
          : 'explain-trading-v1';
      
      case 'ESG':
        return 'explain-esg-v1';
      
      case 'SERVICING':
        return 'explain-covenant-v1';
      
      case 'PORTFOLIO':
        return 'explain-portfolio-v1';
      
      default:
        return 'explain-default-v1';
    }
  }
}
