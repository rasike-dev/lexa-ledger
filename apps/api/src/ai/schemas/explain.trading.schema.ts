/**
 * Trading Readiness Explanation Schema
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B2: Output Schemas (Zod) + Validator
 * 
 * Validates AI output for trading readiness explanations.
 */

import { z } from 'zod';
import { ExplainResultBaseSchema } from './explain.common';

/**
 * Schema for EXPLAIN_TRADING_READINESS output (v1)
 * 
 * Enforces:
 * - All base fields (summary, explanation, recommendations, confidence)
 * - Version must be exactly 1
 */
export const ExplainTradingReadinessOutputSchema = ExplainResultBaseSchema.extend({
  version: z.literal(1),
});

/**
 * TypeScript type for trading readiness explanation output
 */
export type ExplainTradingReadinessOutput = z.infer<
  typeof ExplainTradingReadinessOutputSchema
>;
