/**
 * LLM Gateway Types
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B3: LLM Gateway Skeleton
 * 
 * Request/response types for the gateway orchestration layer.
 */

import { z } from 'zod';
import { PromptTemplateId } from '../prompts';

/**
 * LLM Policy
 * 
 * Defines the purpose, module, audience, and verbosity for an AI call.
 * Used for:
 * - Provider selection (future)
 * - Rate limiting (per module/audience)
 * - Audit context
 */
export type LlmPolicy = {
  purpose: 'EXPLAINABILITY';
  module: 'TRADING' | 'ESG' | 'SERVICING' | 'PORTFOLIO';
  audience: string; // role-derived (e.g., TRADING_ANALYST)
  verbosity: 'SHORT' | 'STANDARD' | 'DETAILED';
};

/**
 * LLM Context
 * 
 * Business context for audit trails and tracing.
 * Links AI calls to tenants, entities, and fact snapshots.
 */
export type LlmContext = {
  tenantId: string;
  actorUserId?: string;
  correlationId?: string;
  entityType: 'LOAN' | 'PORTFOLIO';
  entityId: string;
  factHash?: string;
};

/**
 * Generate JSON Request
 * 
 * Complete request to the gateway for AI-generated JSON.
 * Includes template, output schema, policy, and context.
 */
export type GenerateJsonRequest<TOut> = {
  templateId: PromptTemplateId;
  templateVersion: number;
  vars: Record<string, any>;
  outputSchema: z.ZodSchema<TOut>;
  policy: LlmPolicy;
  context: LlmContext;
};

/**
 * LLM Usage Metrics
 * 
 * Token counts and cost data from the provider.
 * Used for billing, rate limiting, and audit trails.
 */
export type LlmUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

/**
 * Generate JSON Result
 * 
 * Complete result from the gateway including:
 * - Validated JSON output
 * - Provider metadata (name, model)
 * - Prompt checksum (for audit)
 * - Performance metrics (duration, tokens)
 */
export type GenerateJsonResult<TOut> = {
  json: TOut;
  provider: string;
  model: string;
  promptChecksum: string;
  durationMs: number;
  usage?: LlmUsage;
};
