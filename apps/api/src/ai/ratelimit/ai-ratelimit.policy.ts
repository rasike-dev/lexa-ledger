/**
 * AI Rate Limit Policy
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B10.2: AI Rate Limits
 * 
 * Defines rate limit policies per module.
 * Conservative defaults to prevent abuse while allowing normal usage.
 */

import { LlmPolicy } from '../gateway/llm.gateway.types';

/**
 * AI Rate Limit Configuration
 * 
 * Applied per: tenantId + actorUserId + module + templateId
 * 
 * Example:
 * - windowSeconds: 60
 * - maxCalls: 30
 * → 30 AI calls per minute per tenant/actor/module/template
 */
export type AiRateLimit = {
  windowSeconds: number; // Time window for rate limit
  maxCalls: number;      // Max calls within window
};

/**
 * Get rate limit for a policy
 * 
 * Conservative defaults by module:
 * - TRADING: 30 calls/min (high usage, interactive)
 * - ESG: 20 calls/min (moderate usage)
 * - SERVICING: 20 calls/min (moderate usage)
 * - PORTFOLIO: 10 calls/min (lower usage, expensive aggregates)
 * 
 * These limits are per tenant + actor + template combo.
 * Multiple users can hit their own limits independently.
 * 
 * Tune based on:
 * - Observed usage patterns
 * - LLM provider rate limits
 * - Cost budget per tenant
 * - Business SLAs
 */
export function getAiRateLimit(policy: LlmPolicy): AiRateLimit {
  switch (policy.module) {
    case 'TRADING':
      // High usage: analysts frequently explain readiness
      return { windowSeconds: 60, maxCalls: 30 };
    
    case 'ESG':
      // Moderate usage: analysts explain KPI evaluations
      return { windowSeconds: 60, maxCalls: 20 };
    
    case 'SERVICING':
      // Moderate usage: managers explain covenant breaches
      return { windowSeconds: 60, maxCalls: 20 };
    
    case 'PORTFOLIO':
      // Lower usage: expensive aggregates, less frequent
      return { windowSeconds: 60, maxCalls: 10 };
    
    default:
      // Default for unknown modules
      return { windowSeconds: 60, maxCalls: 15 };
  }
}
