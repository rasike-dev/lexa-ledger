/**
 * AI Cost Estimator
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B5: Audit-Safe AI Calls
 * 
 * Estimates AI call costs based on model and token usage.
 * 
 * Current implementation (B5):
 * - Simple, demo-safe estimates
 * - Stable for dashboarding and investor story
 * 
 * Future enhancements (B6+):
 * - Real provider pricing (OpenAI, Anthropic, Azure)
 * - Dynamic pricing updates
 * - Volume discounts
 * - Regional pricing variations
 */

import { LlmUsage } from './llm.gateway.types';

/**
 * Estimate cost of an AI call in USD
 * 
 * Based on model identifier and token usage.
 * 
 * Current rates (demo/example):
 * - Detailed models: $0.01 per 1K tokens
 * - Portfolio models: $0.008 per 1K tokens
 * - Standard models: $0.006 per 1K tokens
 * 
 * Real-world pricing (for reference):
 * - GPT-4-Turbo: $0.01 input + $0.03 output per 1K tokens
 * - GPT-3.5-Turbo: $0.0005 input + $0.0015 output per 1K tokens
 * - Claude-3-Opus: $0.015 input + $0.075 output per 1K tokens
 * 
 * @param model - Model identifier (e.g., "explain-trading-detailed-v1")
 * @param usage - Token counts from provider
 * @returns Estimated cost in USD, or undefined if usage not available
 * 
 * @example
 * ```typescript
 * const cost = estimateCostUsd('explain-trading-detailed-v1', {
 *   inputTokens: 500,
 *   outputTokens: 200,
 *   totalTokens: 700,
 * });
 * // cost = 0.007 (700 tokens * $0.01 / 1000)
 * ```
 */
export function estimateCostUsd(model: string, usage?: LlmUsage): number | undefined {
  if (!usage?.totalTokens) return undefined;

  // Simple mapping (example numbers; replace with real pricing later)
  // Rate per 1K tokens
  const ratePer1k = model.includes('detailed')
    ? 0.01 // Detailed models: Higher quality, higher cost
    : model.includes('portfolio')
      ? 0.008 // Portfolio models: Medium cost
      : 0.006; // Standard models: Lower cost

  // Calculate: (tokens * rate_per_1k) / 1000
  // Round to 6 decimal places for precision
  return Number(((usage.totalTokens * ratePer1k) / 1000).toFixed(6));
}
