/**
 * Demo LLM Provider
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B4: Provider Routing + Fallback
 * 
 * Deterministic provider for testing the gateway pipeline.
 * Now supports:
 * - Named instances (PRIMARY, FALLBACK)
 * - Model selection
 * - Simulated transient failures
 */

import { LlmProvider, LlmProviderResponse } from '../llm.provider';
import { LlmTransientError } from '../errors';

/**
 * Demo Provider
 * 
 * Returns a deterministic, schema-valid JSON response.
 * 
 * New features (B4):
 * - Named provider instances (for primary/fallback testing)
 * - Model parameter support
 * - Optional transient failure simulation
 * 
 * Usage:
 * ```typescript
 * const primary = new DemoProvider('DEMO_PRIMARY', 0.0);    // Never fails
 * const fallback = new DemoProvider('DEMO_FALLBACK', 0.0); // Never fails
 * 
 * // Or test fallback logic:
 * const primary = new DemoProvider('DEMO_PRIMARY', 0.3);    // Fails 30% of time
 * ```
 */
export class DemoProvider implements LlmProvider {
  constructor(
    private readonly providerName: string,
    private readonly failTransientRate: number = 0, // 0..1 (0 = never fail, 1 = always fail)
  ) {}

  name() {
    return this.providerName;
  }

  async generateJson(params: { prompt: string; model: string }): Promise<LlmProviderResponse> {
    // Optional: simulate transient failure for proving fallback logic
    if (this.failTransientRate > 0 && Math.random() < this.failTransientRate) {
      throw new LlmTransientError(
        `Simulated transient failure in ${this.providerName} (rate: ${this.failTransientRate})`,
      );
    }

    // In a real provider (OpenAI, Anthropic), you'd:
    // 1. Call external API with the model parameter
    // 2. Parse response
    // 3. Extract token counts
    // 4. Return standardized format
    
    return {
      model: params.model,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
      json: {
        summary: `Demo explanation via ${this.providerName} using model ${params.model}.`,
        explanation: [
          `This output is produced by ${this.providerName}.`,
          'It passed schema validation.',
          'Fallback will be used if primary fails transiently.',
        ],
        recommendations: [
          'Replace demo providers with real providers (OpenAI, Anthropic) in production.',
          'Configure API keys and rate limits.',
        ],
        confidence: 'HIGH',
        version: 1,
      },
    };
  }
}
